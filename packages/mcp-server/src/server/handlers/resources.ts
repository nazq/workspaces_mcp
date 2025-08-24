import type {
  ListResourcesResult,
  ReadResourceResult,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { MCP_RESOURCE_SCHEMES } from '../../config/constants.js';
import { getDefaultWorkspacesRoot } from '../../config/paths.js';
import { InstructionsService } from '../../services/instructions.js';
import { WorkspaceService } from '../../services/workspace.js';

export class ResourceHandler {
  private instructionsService: InstructionsService;
  private workspaceService: WorkspaceService;

  constructor(workspacesRoot?: string) {
    const root = workspacesRoot ?? getDefaultWorkspacesRoot();
    this.instructionsService = new InstructionsService(root);
    this.workspaceService = new WorkspaceService(root);
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
      const workspaces = await this.workspaceService.listWorkspaces();

      for (const workspace of workspaces) {
        resources.push({
          uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspace.name}`,
          name: `📁 ${workspace.name}`,
          description: `Workspace: ${workspace.description ?? workspace.name}`,
          mimeType: 'application/json',
        });

        // Add individual files from the workspace
        for (const file of workspace.files.slice(0, 10)) {
          // Limit to 10 files
          if (file.endsWith('.md') || file.endsWith('.txt')) {
            resources.push({
              uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspace.name}/${file}`,
              name: `📄 ${workspace.name}/${file}`,
              description: `File from ${workspace.name} workspace`,
              mimeType: file.endsWith('.md') ? 'text/markdown' : 'text/plain',
            });
          }
        }
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
      // Return workspace metadata
      const workspace =
        await this.workspaceService.getWorkspaceInfo(workspaceName);
      return {
        contents: [
          {
            uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/${workspaceName}`,
            mimeType: 'application/json',
            text: JSON.stringify(workspace, null, 2),
          },
        ],
      };
    }

    // Return file content
    const relativePath = parts.slice(1).join('/');
    const workspacePath =
      await this.workspaceService.getWorkspacePath(workspaceName);
    const filePath = `${workspacePath}/${relativePath}`;

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
