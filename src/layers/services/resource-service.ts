// Resource Service - Clean Architecture with Result Pattern
// Implements bulletproof resource management with comprehensive error handling

import type {
  ListResourcesResult,
  ReadResourceResult,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../container/tokens.js';
import { EVENTS } from '../../events/events.js';
import type {
  EventBus,
  ResourceService as IResourceService,
  Logger,
} from '../../interfaces/services.js';
import type {
  InstructionsRepository,
  WorkspaceRepository,
} from '../data/interfaces.js';

/**
 * Resource service implementing clean architecture patterns
 *
 * Provides comprehensive resource discovery and content retrieval for MCP clients.
 * Resources include workspaces, shared instructions, and global instructions.
 * All operations use Result pattern for bulletproof error handling.
 *
 * @example
 * ```typescript
 * const listResult = await resourceService.listResources();
 *
 * if (listResult.isOk()) {
 *   console.log(`Found ${listResult.value.resources.length} resources`);
 * } else {
 *   console.error(`Failed to list resources: ${listResult.error.message}`);
 * }
 * ```
 */
@injectable()
export class ResourceService implements IResourceService {
  /**
   * Create resource service with clean dependency injection
   *
   * @param workspaceRepository - Repository for workspace operations
   * @param instructionsRepository - Repository for instruction operations
   * @param eventBus - Event bus for publishing resource events
   * @param logger - Logger for comprehensive monitoring
   */
  constructor(
    @inject(TOKENS.WorkspaceRepository)
    private readonly workspaceRepository: WorkspaceRepository,
    @inject(TOKENS.InstructionsRepository)
    private readonly instructionsRepository: InstructionsRepository,
    @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {}

  /**
   * List all available resources with comprehensive metadata
   *
   * Discovers and catalogs all available resources including workspaces,
   * shared instructions, and global instructions. Provides rich metadata
   * for each resource to enable intelligent context loading.
   *
   * @returns Result containing list of all discoverable resources
   */
  async listResources(): Promise<Result<ListResourcesResult, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug('Listing all available resources');

      const resources: Resource[] = [];
      let workspaceCount = 0;
      let instructionCount = 0;

      // Add workspace resources with error handling
      try {
        const workspaces = await this.workspaceRepository.list();
        for (const workspace of workspaces) {
          resources.push({
            uri: `workspace://${workspace.name}`,
            name: `📁 ${workspace.name}`,
            description:
              workspace.description ?? `Workspace: ${workspace.name}`,
            mimeType: 'application/json',
          });
          workspaceCount++;
        }
      } catch (error) {
        this.logger.warn(
          'Failed to list workspaces for resources',
          error instanceof Error ? error.message : String(error)
        );
        // Continue with other resources rather than failing completely
      }

      // Add shared instruction resources with error handling
      try {
        const sharedInstructions =
          await this.instructionsRepository.listShared();
        for (const instruction of sharedInstructions) {
          resources.push({
            uri: `instruction://shared/${instruction.name}`,
            name: `📝 ${instruction.name}`,
            description:
              instruction.description ??
              `Shared instruction: ${instruction.name}`,
            mimeType: 'text/markdown',
          });
          instructionCount++;
        }
      } catch (error) {
        this.logger.warn(
          'Failed to list shared instructions for resources',
          error instanceof Error ? error.message : String(error)
        );
      }

      // Add global instructions resource (always available)
      resources.push({
        uri: 'instruction://global',
        name: '🌍 Global Instructions',
        description:
          '⭐ Essential global instructions - loads automatically for all sessions',
        mimeType: 'text/markdown',
      });
      instructionCount++;

      const responseTimeMs = Date.now() - startTime;

      // Emit resource discovery event
      try {
        await this.eventBus.emit(EVENTS.RESOURCE_SERVED, {
          uri: 'resources://list',
          contentType: 'application/json',
          contentLength: JSON.stringify(resources).length,
          responseTimeMs,
          timestamp: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit resource listed event', eventError);
      }

      this.logger.debug(
        `Resource discovery complete: ${resources.length} total (${workspaceCount} workspaces, ${instructionCount} instructions)`,
        { responseTimeMs }
      );

      return ok({ resources });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const responseTimeMs = Date.now() - startTime;

      this.logger.error('Unexpected error listing resources', {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
        errorString: String(error),
        responseTimeMs,
      });

      // Emit error event
      try {
        await this.eventBus.emit(EVENTS.RESOURCE_ERROR, {
          uri: 'resources://list',
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit resource error event', eventError);
      }

      return err(new Error(`Resource discovery failed: ${message}`));
    }
  }

  /**
   * Read specific resource content with comprehensive error handling
   *
   * Retrieves content for workspace metadata, shared instructions,
   * or global instructions. Supports multiple URI schemes with
   * proper validation and security checks.
   *
   * @param uri - Resource URI to read (workspace://, instruction://)
   * @returns Result containing resource content or detailed error
   */
  async readResource(uri: string): Promise<Result<ReadResourceResult, Error>> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Reading resource: ${uri}`);

      // Emit resource requested event
      try {
        await this.eventBus.emit(EVENTS.RESOURCE_REQUESTED, {
          uri,
          timestamp: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit resource requested event', eventError);
      }

      // Parse and validate URI
      const parseResult = this.parseUri(uri);
      if (parseResult.isErr()) {
        return err(parseResult.error);
      }

      const { scheme, path } = parseResult.value;
      let result: Result<ReadResourceResult, Error>;

      // Route to appropriate handler based on scheme
      switch (scheme) {
        case 'workspace': {
          result = await this.readWorkspaceResource(path);
          break;
        }

        case 'instruction': {
          result = await this.readInstructionResource(path);
          break;
        }

        default: {
          const error = new Error(
            `Unsupported resource scheme: ${scheme}. ` +
              `Supported schemes: workspace://, instruction://`
          );
          this.logger.warn('Unsupported resource scheme requested', {
            uri,
            scheme,
            supportedSchemes: ['workspace', 'instruction'],
          });
          return err(error);
        }
      }

      const responseTimeMs = Date.now() - startTime;

      if (result.isErr()) {
        // Emit error event
        try {
          await this.eventBus.emit(EVENTS.RESOURCE_ERROR, {
            uri,
            error: result.error,
            timestamp: new Date(),
          });
        } catch (eventError) {
          this.logger.warn('Failed to emit resource error event', eventError);
        }
        return result;
      }

      // Emit success event
      const contentLength = result.value.contents.reduce((total, content) => {
        if (content.text && typeof content.text === 'string') {
          return total + content.text.length;
        }
        if (content.blob) {
          // Blob content type {} doesn't have length - just count as present
          return total;
        }
        return total;
      }, 0);

      try {
        await this.eventBus.emit(EVENTS.RESOURCE_SERVED, {
          uri,
          contentType: result.value.contents[0]?.mimeType,
          contentLength,
          responseTimeMs,
          timestamp: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit resource served event', eventError);
      }

      this.logger.debug(`Resource read successfully: ${uri}`, {
        responseTimeMs,
        contentLength,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const responseTimeMs = Date.now() - startTime;

      this.logger.error(`Unexpected error reading resource: ${uri}`, {
        error,
        responseTimeMs,
      });

      return err(new Error(`Resource read failed: ${message}`));
    }
  }

  /**
   * Read workspace resource content with comprehensive metadata
   *
   * @param workspaceName - Name of workspace to read
   * @returns Result containing workspace metadata as JSON
   */
  private async readWorkspaceResource(
    workspaceName: string
  ): Promise<Result<ReadResourceResult, Error>> {
    try {
      this.logger.debug(`Reading workspace resource: ${workspaceName}`);

      // Check if workspace exists
      const exists = await this.workspaceRepository.exists(workspaceName);
      if (!exists) {
        return err(new Error(`Workspace '${workspaceName}' not found`));
      }

      // Get workspace metadata
      const metadata =
        await this.workspaceRepository.getMetadata(workspaceName);

      // Create rich workspace content
      const workspaceInfo = {
        name: metadata.name,
        description: metadata.description,
        path: metadata.path,
        createdAt: metadata.createdAt.toISOString(),
        modifiedAt: metadata.modifiedAt.toISOString(),
        hasInstructions: metadata.hasInstructions,
        stats: {
          ageInDays: Math.floor(
            (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          ),
        },
      };

      const content = JSON.stringify(workspaceInfo, null, 2);

      return ok({
        contents: [
          {
            uri: `workspace://${workspaceName}`,
            mimeType: 'application/json',
            text: content,
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error reading workspace resource: ${workspaceName}`,
        error
      );
      return err(new Error(`Failed to read workspace resource: ${message}`));
    }
  }

  /**
   * Read instruction resource content (global or shared)
   *
   * @param path - Instruction path (global, shared/name)
   * @returns Result containing instruction content as markdown
   */
  private async readInstructionResource(
    path: string
  ): Promise<Result<ReadResourceResult, Error>> {
    try {
      this.logger.debug(`Reading instruction resource: ${path}`);

      if (path === 'global') {
        // Read global instructions
        try {
          const globalInstructions =
            await this.instructionsRepository.getGlobal();
          return ok({
            contents: [
              {
                uri: 'instruction://global',
                mimeType: 'text/markdown',
                text: globalInstructions.content,
              },
            ],
          });
        } catch (error) {
          return err(
            new Error(
              `Failed to get global instructions: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      }

      if (path.startsWith('shared/')) {
        // Read shared instruction
        const instructionName = path.substring('shared/'.length);

        if (!instructionName || instructionName.trim() === '') {
          return err(new Error('Invalid shared instruction name: empty'));
        }

        try {
          const sharedInstruction =
            await this.instructionsRepository.getShared(instructionName);
          return ok({
            contents: [
              {
                uri: `instruction://shared/${instructionName}`,
                mimeType: 'text/markdown',
                text: sharedInstruction.content,
              },
            ],
          });
        } catch (error) {
          return err(
            new Error(
              `Failed to get shared instruction '${instructionName}': ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      }

      return err(
        new Error(
          `Invalid instruction path: ${path}. ` +
            `Valid paths: 'global' or 'shared/{name}'`
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error reading instruction resource: ${path}`,
        error
      );
      return err(new Error(`Failed to read instruction resource: ${message}`));
    }
  }

  /**
   * Parse and validate resource URI
   *
   * @param uri - URI to parse
   * @returns Result containing parsed scheme and path
   */
  private parseUri(
    uri: string
  ): Result<{ scheme: string; path: string }, Error> {
    try {
      if (typeof uri !== 'string' || uri.trim() === '') {
        return err(new Error('URI cannot be empty'));
      }

      const match = uri.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.+)$/);
      if (!match) {
        return err(
          new Error(
            `Invalid URI format: '${uri}'. ` +
              `Expected format: scheme://path (e.g., workspace://my-project)`
          )
        );
      }

      const scheme = match[1].toLowerCase();
      const path = match[2];

      // Validate scheme
      const supportedSchemes = ['workspace', 'instruction'];
      if (!supportedSchemes.includes(scheme)) {
        return err(
          new Error(
            `Unsupported URI scheme: '${scheme}'. ` +
              `Supported schemes: ${supportedSchemes.join(', ')}`
          )
        );
      }

      // Validate path is not empty
      if (!path || path.trim() === '') {
        return err(new Error(`URI path cannot be empty: '${uri}'`));
      }

      return ok({ scheme, path });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`URI parsing failed: ${message}`));
    }
  }
}
