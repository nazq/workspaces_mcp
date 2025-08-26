// MCP Server with 5-Layer Architecture
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from '../config/constants.js';
import {
  getDefaultWorkspacesRoot,
  getGlobalInstructionsPath,
  getSharedInstructionsPath,
} from '../config/paths.js';
import {
  configureContainer,
  getContainer,
  TOKENS,
} from '../container/container.js';
import type { ResourceService, ToolService } from '../interfaces/services.js';
import { createChildLogger } from '../utils/logger.js';
import { getError, getValue, isErr } from '../utils/result.js';

import { ControllerFactory } from './controllers/index.js';
import { ProtocolProcessor } from './protocol/index.js';
import {
  TransportFactory,
  type InternalTransportProvider,
  type TransportFactoryConfig,
} from './transport/index.js';

const logger = createChildLogger('server:orchestrator');

export interface ServerConfig {
  workspacesRoot?: string;
  transport?: TransportFactoryConfig;
  protocol?: {
    validateRequests?: boolean;
    logRequests?: boolean;
    rateLimiting?: {
      enabled: boolean;
      maxRequestsPerMinute: number;
    };
  };
}

export class WorkspacesMcpServer {
  private server: Server;
  private processor: ProtocolProcessor;
  private isRunning = false;
  private config: ServerConfig;
  private isInitialized = false;

  constructor(config: ServerConfig = {}) {
    this.config = config;

    // MCP SDK Server - initialize immediately for basic structure
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Protocol processor - initialize with config
    this.processor = new ProtocolProcessor(config.protocol);

    logger.info('MCP Server constructor completed');
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Server already initialized, skipping');
      return;
    }

    try {
      // Initialize configuration
      const workspacesRoot =
        this.config.workspacesRoot ?? getDefaultWorkspacesRoot();

      logger.info('Initializing MCP Server with TSyringe DI');
      logger.info(`Workspaces root: ${workspacesRoot}`);
      logger.debug('Starting container configuration...');

      // Configure dependency injection container
      configureContainer({
        workspacesRoot,
        sharedInstructionsPath: getSharedInstructionsPath(workspacesRoot),
        globalInstructionsPath: getGlobalInstructionsPath(workspacesRoot),
      });
      logger.debug('Container configuration completed');

      // Get container reference
      const container = getContainer();
      logger.debug('Retrieved container reference');

      // Debug container state
      logger.debug('Container state:', {
        hasResourceService: container.isRegistered(TOKENS.ResourceService),
        hasToolService: container.isRegistered(TOKENS.ToolService),
        hasWorkspaceRepository: container.isRegistered(
          TOKENS.WorkspaceRepository
        ),
        hasInstructionsRepository: container.isRegistered(
          TOKENS.InstructionsRepository
        ),
        hasEventBus: container.isRegistered(TOKENS.EventBus),
        hasLogger: container.isRegistered(TOKENS.Logger),
      });

      // Resolve services from container with proper typing
      logger.debug('Resolving ResourceService from container...');
      let resourceService: ResourceService;
      let toolService: ToolService;

      try {
        resourceService = container.resolve<ResourceService>(
          TOKENS.ResourceService
        );
        logger.debug('ResourceService resolved successfully');
      } catch (error) {
        // Use console.error for raw debugging
        console.error('RAW TSyringe Error:', error);
        logger.error('Failed to resolve ResourceService:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          token: 'TOKENS.ResourceService',
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
        });
        throw error;
      }

      try {
        logger.debug('Resolving ToolService from container...');
        toolService = container.resolve<ToolService>(TOKENS.ToolService);
        logger.debug('ToolService resolved successfully');
      } catch (error) {
        logger.error('Failed to resolve ToolService:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          token: 'TOKENS.ToolService',
        });
        throw error;
      }

      logger.debug('All services resolved successfully');

      // Layer 3: Controllers Layer (for future protocol processor integration)
      logger.debug('Creating controllers...');
      const controllers = ControllerFactory.createAll({
        resourceService: resourceService as any,
        toolService: toolService as any,
      });
      logger.debug(`Created ${controllers.length} controllers`);

      // Register all controllers with the protocol processor (for future use)
      logger.debug('Registering controllers with protocol processor...');
      const registry = this.processor.getRegistry();
      for (const controller of controllers) {
        registry.register(controller);
      }
      logger.debug('Controllers registered successfully');

      logger.debug('Setting up server handlers...');
      this.setupServerHandlers(resourceService, toolService);
      logger.debug('Server handlers configured');

      this.isInitialized = true;
      logger.info('MCP Server initialized successfully with DI');
    } catch (error) {
      logger.error('Failed during server initialization:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        stage: 'initialization',
      });
      throw error;
    }
  }

  private setupServerHandlers(
    resourceService: ResourceService,
    toolService: ToolService
  ): void {
    logger.debug(
      'Setting up MCP server handlers with direct service integration'
    );

    // Direct service integration for now - proper protocol layer integration later

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Server handler: Starting listResources call');

      try {
        const result = await resourceService.listResources();
        logger.debug(
          'Server handler: resourceService.listResources completed',
          {
            resultType: typeof result,
            resultConstructor: result?.constructor?.name,
            hasIsErr: typeof result?.isErr,
            result,
          }
        );

        if (isErr(result)) {
          logger.debug('Server handler: Result is error');
          const error = getError(result);
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(message);
        }

        logger.debug('Server handler: Result is success, getting value');
        const value = getValue(result);
        logger.debug('Server handler: Returning value', {
          valueType: typeof value,
          resourcesCount: value?.resources?.length,
        });
        return value;
      } catch (error) {
        logger.error('Server handler: Unexpected error in listResources', {
          error: error instanceof Error ? error.message : String(error),
          errorType: typeof error,
          errorConstructor: error?.constructor?.name,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          const result = await resourceService.readResource(request.params.uri);
          if (isErr(result)) {
            const error = getError(result);
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(`Resource read failed: ${request.params.uri}`, {
              error,
            });
            throw new Error(message);
          }
          return getValue(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error(
            `Unexpected error reading instruction resource: ${request.params.uri.replace('instruction://', '')}`,
            { error }
          );
          throw new Error(`Resource read error: ${message}`);
        }
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const result = await toolService.listTools();
      if (isErr(result)) {
        const error = getError(result);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(message);
      }
      return getValue(result);
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const result = await toolService.callTool(
          request.params.name,
          request.params.arguments
        );
        if (isErr(result)) {
          const error = getError(result);
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error(`Tool execution failed: ${request.params.name}`, {
            error,
            args: request.params.arguments,
          });

          // Return error as successful MCP response with isError flag for compatibility
          return {
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
            isError: true,
          };
        }
        return getValue(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `Unexpected error executing tool: ${request.params.name}`,
          { error, args: request.params.arguments }
        );

        // Return unexpected errors as successful MCP responses with isError flag
        return {
          content: [
            {
              type: 'text',
              text: `Unexpected error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    });

    logger.debug(
      'MCP server handlers configured with direct service integration'
    );
  }

  async start(transportConfig?: TransportFactoryConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      logger.debug('Starting server startup sequence...');

      // Initialize server if not already done
      logger.debug('Initializing server...');
      await this.initialize();
      logger.debug('Server initialization completed');

      logger.info('Starting MCP Server');

      // Layer 1: Transport Layer
      logger.debug('Creating transport factory...');
      const transport = TransportFactory.create(transportConfig);
      logger.debug(`Created transport: ${transport.name}`);

      logger.debug('Connecting transport...');
      await transport.connect();
      logger.debug('Transport connected successfully');

      // Connect MCP SDK server to transport
      if (transport.name === 'stdio') {
        logger.debug('Configuring STDIO transport connection...');
        // Check if transport provides internal transport access
        if ('getInternalTransport' in transport) {
          const stdioTransport = (
            transport as InternalTransportProvider
          ).getInternalTransport();
          if (stdioTransport) {
            logger.debug('Connecting MCP server to STDIO transport...');
            await this.server.connect(stdioTransport as Transport);
            logger.debug('MCP server connected to transport');
          } else {
            throw new Error('Failed to get STDIO transport');
          }
        } else {
          throw new Error('STDIO transport does not provide internal access');
        }
      } else {
        logger.warn('HTTP transport not fully implemented yet');
        // HTTP transport would be handled here
      }

      this.isRunning = true;
      logger.info(`✅ MCP Server is running (${transport.name} transport)`);

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        stage: 'startup',
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping MCP Server');

      // The MCP SDK doesn't provide explicit server shutdown
      // This would be where we'd clean up resources

      this.isRunning = false;
      logger.info('✅ MCP Server stopped');
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      throw error;
    }
  }

  get running(): boolean {
    return this.isRunning;
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Factory function for easier creation
/**
 * Factory function for creating MCP server instances
 *
 * Provides a clean, functional API for server creation with
 * sensible defaults and comprehensive error handling.
 *
 * @param config - Optional server configuration
 * @returns Configured MCP server instance
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const server = createWorkspacesMcpServer();
 *
 * // Create with custom config
 * const server = createWorkspacesMcpServer({
 *   workspacesRoot: '/custom/path',
 *   config: {
 *     logging: { level: 'debug' },
 *     features: { enableTemplates: true }
 *   }
 * });
 *
 * await server.start();
 * ```
 */
export function createWorkspacesMcpServer(
  config: ServerConfig = {}
): WorkspacesMcpServer {
  try {
    return new WorkspacesMcpServer(config);
  } catch (error) {
    logger.error('Failed to create MCP server', error);
    throw new Error(
      `Server creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
