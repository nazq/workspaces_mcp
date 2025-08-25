import type {
  ListResourcesResult,
  ReadResourceResult,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { MCP_RESOURCE_SCHEMES } from '../../config/constants.js';
import { getDefaultWorkspacesRoot } from '../../config/paths.js';
import { AsyncEventBus } from '../../events/event-bus.js';
import type { EventBus, FileSystemService, Logger } from '../../interfaces/services.js';
import { FileSystemService as NodeFileSystemService } from '../../services/filesystem.js';
import { InstructionsService } from '../../services/instructions.js';
import { WorkspaceService } from '../../services/workspace.js';
import { createChildLogger } from '../../utils/logger.js';
import { isErr, isOk } from '../../utils/result.js';

export class ResourceHandler {
  private instructionsService: InstructionsService;
  private workspaceService: WorkspaceService;
  private fs: FileSystemService;

  constructor(workspacesRoot?: string) {
    const root = workspacesRoot ?? getDefaultWorkspacesRoot();
    
    // Create required dependencies
    this.fs = new NodeFileSystemService();
    const eventBus: EventBus = new AsyncEventBus();
    const logger: Logger = createChildLogger('ResourceHandler');
    
    this.instructionsService = new InstructionsService(root);
    this.workspaceService = new WorkspaceService(root, this.fs, eventBus, logger);
  }

  async listResources(): Promise<ListResourcesResult> {
    const resources: Resource[] = [];

    resources.push({
      uri: `${MCP_RESOURCE_SCHEMES.SHARED}/GLOBAL.md`,
      name: '🌍 Global Instructions',
      description:
        '⭐ Essential global instructions - loads automatically for all sessions',
      mimeType: 'text/markdown',
    });

    await this.addSharedInstructionResources(resources);
    await this.addWorkspaceResources(resources);

    return { resources };
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    const url = new URL(uri);

    if (url.protocol === 'file:' && url.hostname === 'shared') {
      return await this.readSharedResource(url.pathname);
    }

    if (url.protocol === 'file:' && url.hostname === 'workspace') {
      return await this.readWorkspaceResource(url.pathname);
    }

    throw new Error(`Unsupported resource URI: ${uri}`);
  }

  private async addSharedInstructionResources(
    resources: Resource[]
  ): Promise<void> {
    try {
      const sharedInstructions =
        await this.instructionsService.listSharedInstructions();

      for (const instruction of sharedInstructions) {
        resources.push({
          uri: `${MCP_RESOURCE_SCHEMES.SHARED}/${instruction.name}.md`,
          name: `📋 ${instruction.name}`,
          description: `Shared instructions for ${instruction.name} projects`,
          mimeType: 'text/markdown',
        });
      }
    } catch {
      // Ignore errors when listing shared instructions
    }
  }

  private async addWorkspaceResources(resources: Resource[]): Promise<void> {
    try {
      const workspacesResult = await this.workspaceService.listWorkspaces();

      if (isErr(workspacesResult)) {
        // Ignore errors when listing workspaces
        return;
      }

      for (const workspace of workspacesResult.data) {
        resources.push({
          uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspace.name}`,
          name: `📁 ${workspace.name}`,
          description: `Workspace: ${workspace.description ?? workspace.name}`,
          mimeType: 'application/json',
        });

        // Note: Individual file resources are available through workspace metadata
        // Files can be accessed via workspace/{name}/{filename} URIs when reading resources
      }
    } catch {
      // Ignore errors when listing workspaces
    }
  }

  private async readSharedResource(
    pathname: string
  ): Promise<ReadResourceResult> {
    const filename = pathname.replace(/^\//, '');

    if (filename === 'GLOBAL.md') {
      const globalInstructions =
        await this.instructionsService.getGlobalInstructions();
      return {
        contents: [
          {
            uri: `${MCP_RESOURCE_SCHEMES.SHARED}/GLOBAL.md`,
            mimeType: 'text/markdown',
            text: globalInstructions.content,
          },
        ],
      };
    }

    const instructionName = filename.replace('.md', '');
    const instruction =
      await this.instructionsService.getSharedInstruction(instructionName);

    return {
      contents: [
        {
          uri: `${MCP_RESOURCE_SCHEMES.SHARED}/${instructionName}.md`,
          mimeType: 'text/markdown',
          text: instruction.content,
        },
      ],
    };
  }

  private async readWorkspaceResource(
    pathname: string
  ): Promise<ReadResourceResult> {
    const parts = pathname.replace(/^\//, '').split('/');
    const workspaceName = parts[0];

    if (workspaceName === undefined || workspaceName === '') {
      throw new Error('Invalid workspace resource path');
    }

    if (parts.length === 1) {
      // Return workspace metadata with file list
      const workspaceResult =
        await this.workspaceService.getWorkspaceInfo(workspaceName);
      
      if (isErr(workspaceResult)) {
        const message = workspaceResult.error?.message ?? 'Unknown error';
        throw new Error(`Failed to get workspace info: ${message}`);
      }

      // Get file list from workspace directory
      let files: string[] = [];
      try {
        const workspacePathResult = await this.workspaceService.getWorkspacePath(workspaceName);
        if (isOk(workspacePathResult)) {
          const filesResult = await this.fs.listFiles(workspacePathResult.data, false);
          if (isOk(filesResult)) {
            files = filesResult.data;
          }
        }
      } catch {
        // Ignore errors when listing files
      }

      // Add files to workspace metadata for resource response
      const workspaceMetadata = {
        ...workspaceResult.data,
        files: files
      };
      
      return {
        contents: [
          {
            uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspaceName}`,
            mimeType: 'application/json',
            text: JSON.stringify(workspaceMetadata, null, 2),
          },
        ],
      };
    }

    // Return file content
    const relativePath = parts.slice(1).join('/');
    const workspacePathResult =
      await this.workspaceService.getWorkspacePath(workspaceName);
    
    if (isErr(workspacePathResult)) {
      const message = workspacePathResult.error?.message ?? 'Unknown error';
      throw new Error(`Failed to get workspace path: ${message}`);
    }
    
    const filePath = `${workspacePathResult.data}/${relativePath}`;

    // Basic security check
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      throw new Error('Invalid file path');
    }

    const fs = await import('node:fs/promises');
    const content = await fs.readFile(filePath, 'utf8');

    return {
      contents: [
        {
          uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspaceName}/${relativePath}`,
          mimeType: relativePath.endsWith('.md')
            ? 'text/markdown'
            : 'text/plain',
          text: content,
        },
      ],
    };
  }
}
