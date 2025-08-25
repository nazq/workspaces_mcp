import type {
  CallToolResult,
  ListToolsResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getDefaultWorkspacesRoot } from '../../config/paths.js';
import { AsyncEventBus } from '../../events/event-bus.js';
import type { EventBus, FileSystemService, Logger } from '../../interfaces/services.js';
import { FileSystemService as NodeFileSystemService } from '../../services/filesystem.js';
import { InstructionsService } from '../../services/instructions.js';
import { WorkspaceService } from '../../services/workspace.js';
import type {
  InstructionCreateOptions,
  WorkspaceCreateOptions,
} from '../../types/index.js';
import { createChildLogger } from '../../utils/logger.js';
import { isErr, isOk } from '../../utils/result.js';

export class ToolHandler {
  private instructionsService: InstructionsService;
  private workspaceService: WorkspaceService;

  constructor(workspacesRoot?: string) {
    const root = workspacesRoot ?? getDefaultWorkspacesRoot();
    
    // Create required dependencies
    const fs: FileSystemService = new NodeFileSystemService();
    const eventBus: EventBus = new AsyncEventBus();
    const logger: Logger = createChildLogger('ToolHandler');
    
    this.instructionsService = new InstructionsService(root);
    this.workspaceService = new WorkspaceService(root, fs, eventBus, logger);
  }

  async listTools(): Promise<ListToolsResult> {
    const tools: Tool[] = [
      {
        name: 'create_workspace',
        description: 'Create a new workspace for organizing project files',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Name of the workspace (alphanumeric, hyphens, underscores only)',
            },
            description: {
              type: 'string',
              description: 'Optional description of the workspace',
            },
            template: {
              type: 'string',
              description: 'Optional template to use for the workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List all available workspaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_workspace_info',
        description: 'Get detailed information about a specific workspace',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_shared_instruction',
        description:
          'Create a new shared instruction file for reuse across projects',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Name of the shared instruction (alphanumeric, hyphens, underscores only)',
            },
            content: {
              type: 'string',
              description: 'Content of the instruction file in Markdown format',
            },
            description: {
              type: 'string',
              description: 'Optional description of the instruction',
            },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'update_global_instructions',
        description:
          'Update the global instructions that load automatically in every session',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description:
                'New content for global instructions in Markdown format',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_shared_instructions',
        description: 'List all shared instruction files',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    return { tools };
  }

  async callTool(name: string, args: unknown): Promise<CallToolResult> {
    switch (name) {
      case 'create_workspace':
        return await this.createWorkspace(args);
      case 'list_workspaces':
        return await this.listWorkspaces();
      case 'get_workspace_info':
        return await this.getWorkspaceInfo(args);
      case 'create_shared_instruction':
        return await this.createSharedInstruction(args);
      case 'update_global_instructions':
        return await this.updateGlobalInstructions(args);
      case 'list_shared_instructions':
        return await this.listSharedInstructions();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async createWorkspace(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      name: z.string(),
      description: z.string().optional(),
      template: z.string().optional(),
    });

    const parsed = schema.parse(args);
    const options: Omit<WorkspaceCreateOptions, 'name'> = {};
    if (parsed.description !== undefined)
      options.description = parsed.description;
    if (parsed.template !== undefined) options.template = parsed.template;

    const workspaceResult = await this.workspaceService.createWorkspace(
      parsed.name,
      options
    );

    if (isErr(workspaceResult)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to create workspace "${parsed.name}": ${workspaceResult.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created workspace "${parsed.name}" successfully!\n\nWorkspace details:\n${JSON.stringify(workspaceResult.data, null, 2)}`,
        },
      ],
    };
  }

  private async listWorkspaces(): Promise<CallToolResult> {
    const workspacesResult = await this.workspaceService.listWorkspaces();

    if (isErr(workspacesResult)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list workspaces: ${workspacesResult.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const workspaces = workspacesResult.data;
    if (workspaces.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '📁 No workspaces found. Create your first workspace with the `create_workspace` tool!',
          },
        ],
      };
    }

    const workspaceList = workspaces
      .map(
        (ws) =>
          `📁 **${ws.name}** - ${ws.fileCount ?? 0} files${ws.description !== undefined ? ` - ${ws.description}` : ''}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `🏠 **Available Workspaces (${workspaces.length}):**\n\n${workspaceList}`,
        },
      ],
    };
  }

  private async getWorkspaceInfo(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      name: z.string(),
    });

    const { name } = schema.parse(args);
    const workspaceResult = await this.workspaceService.getWorkspaceInfo(name);

    if (isErr(workspaceResult)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get workspace info: ${workspaceResult.error?.message ?? 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const workspace = workspaceResult.data;
    return {
      content: [
        {
          type: 'text',
          text: `📁 **Workspace: ${workspace.name}**\n\n${JSON.stringify(workspace, null, 2)}`,
        },
      ],
    };
  }

  private async createSharedInstruction(
    args: unknown
  ): Promise<CallToolResult> {
    const schema = z.object({
      name: z.string(),
      content: z.string(),
      description: z.string().optional(),
    });

    const parsed = schema.parse(args);
    const options: Omit<InstructionCreateOptions, 'name'> = {
      content: parsed.content,
    };
    if (parsed.description !== undefined)
      options.description = parsed.description;

    await this.instructionsService.createSharedInstruction(
      parsed.name,
      options
    );

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created shared instruction "${parsed.name}" successfully!\n\nThe instruction will now be available as a resource for loading into future sessions.`,
        },
      ],
    };
  }

  private async updateGlobalInstructions(
    args: unknown
  ): Promise<CallToolResult> {
    const schema = z.object({
      content: z.string(),
    });

    const { content } = schema.parse(args);
    await this.instructionsService.updateGlobalInstructions(content);

    return {
      content: [
        {
          type: 'text',
          text: '✅ Updated global instructions successfully!\n\nThe new instructions will be available in the "🌍 Global Instructions" resource for automatic loading.',
        },
      ],
    };
  }

  private async listSharedInstructions(): Promise<CallToolResult> {
    const instructions =
      await this.instructionsService.listSharedInstructions();

    if (instructions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '📋 No shared instructions found. Create your first shared instruction with the `create_shared_instruction` tool!',
          },
        ],
      };
    }

    const instructionList = instructions
      .map(
        (inst) =>
          `📋 **${inst.name}** - Updated ${inst.updatedAt.toLocaleDateString()}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `📚 **Shared Instructions (${instructions.length}):**\n\n${instructionList}`,
        },
      ],
    };
  }
}
