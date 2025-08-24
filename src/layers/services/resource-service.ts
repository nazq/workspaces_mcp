// Professional Resource Service with Dependency Injection
import type {
  ListResourcesResult,
  ReadResourceResult,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { createChildLogger } from '../../utils/logger.js';
import type {
  InstructionsRepository,
  WorkspaceRepository,
} from '../data/index.js';

const logger = createChildLogger('service:resource');

export interface ResourceServiceDependencies {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
}

export class ResourceService {
  constructor(private deps: ResourceServiceDependencies) {}

  async listResources(): Promise<ListResourcesResult> {
    logger.debug('Listing all available resources');

    try {
      const resources: Resource[] = [];

      // Add workspace resources
      const workspaces = await this.deps.workspaceRepository.list();
      for (const workspace of workspaces) {
        resources.push({
          uri: `workspace://${workspace.name}`,
          name: workspace.name,
          description: workspace.description ?? `Workspace: ${workspace.name}`,
          mimeType: 'application/json',
        });
      }

      // Add shared instruction resources
      const sharedInstructions =
        await this.deps.instructionsRepository.listShared();
      for (const instruction of sharedInstructions) {
        resources.push({
          uri: `instruction://shared/${instruction.name}`,
          name: `Shared Instruction: ${instruction.name}`,
          description:
            instruction.description ??
            `Shared instruction: ${instruction.name}`,
          mimeType: 'text/plain',
        });
      }

      // Add global instructions resource
      resources.push({
        uri: 'instruction://global',
        name: 'Global Instructions',
        description: 'Global instructions that apply to all workspaces',
        mimeType: 'text/plain',
      });

      logger.debug(`Found ${resources.length} resources total`);
      return { resources };
    } catch (error) {
      logger.error('Failed to list resources', error);
      throw new Error('Unable to list resources');
    }
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    logger.debug(`Reading resource: ${uri}`);

    try {
      const parsedUri = this.parseUri(uri);

      switch (parsedUri.scheme) {
        case 'workspace': {
          return await this.readWorkspaceResource(parsedUri.path);
        }

        case 'instruction': {
          return await this.readInstructionResource(parsedUri.path);
        }

        default: {
          throw new Error(`Unsupported resource scheme: ${parsedUri.scheme}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to read resource: ${uri}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to read resource: ${uri}`);
    }
  }

  private async readWorkspaceResource(
    workspaceName: string
  ): Promise<ReadResourceResult> {
    if (!(await this.deps.workspaceRepository.exists(workspaceName))) {
      throw new Error(`Workspace '${workspaceName}' not found`);
    }

    const metadata =
      await this.deps.workspaceRepository.getMetadata(workspaceName);

    const content = JSON.stringify(
      {
        name: metadata.name,
        description: metadata.description,
        path: metadata.path,
        createdAt: metadata.createdAt,
        modifiedAt: metadata.modifiedAt,
      },
      null,
      2
    );

    return {
      contents: [
        {
          uri: `workspace://${workspaceName}`,
          mimeType: 'application/json',
          text: content,
        },
      ],
    };
  }

  private async readInstructionResource(
    path: string
  ): Promise<ReadResourceResult> {
    if (path === 'global') {
      const globalInstructions =
        await this.deps.instructionsRepository.getGlobal();

      return {
        contents: [
          {
            uri: 'instruction://global',
            mimeType: 'text/plain',
            text: globalInstructions.content,
          },
        ],
      };
    }

    if (path.startsWith('shared/')) {
      const instructionName = path.substring('shared/'.length);
      const instruction =
        await this.deps.instructionsRepository.getShared(instructionName);

      return {
        contents: [
          {
            uri: `instruction://shared/${instructionName}`,
            mimeType: 'text/plain',
            text: instruction.content,
          },
        ],
      };
    }

    throw new Error(`Invalid instruction path: ${path}`);
  }

  private parseUri(uri: string): { scheme: string; path: string } {
    const match = uri.match(/^([^:]+):\/\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid URI format: ${uri}`);
    }

    return {
      scheme: match[1],
      path: match[2],
    };
  }
}
