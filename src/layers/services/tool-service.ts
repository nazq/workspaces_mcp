// Professional Tool Service with Dependency Injection
import type {
  CallToolResult,
  ListToolsResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { createChildLogger } from '../../utils/logger.js';
import type {
  InstructionsRepository,
  WorkspaceRepository,
} from '../data/index.js';

const logger = createChildLogger('service:tool');

export interface ToolServiceDependencies {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
}

// Tool argument schemas
const CreateWorkspaceArgsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  template: z.string().optional(),
});

const CreateSharedInstructionArgsSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  description: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

const UpdateGlobalInstructionsArgsSchema = z.object({
  content: z.string().min(1),
  variables: z.record(z.string()).optional(),
});

const GetWorkspaceInfoArgsSchema = z.object({
  name: z.string().min(1),
});

const ListSharedInstructionsArgsSchema = z.object({});

const ListWorkspacesArgsSchema = z.object({});

export class ToolService {
  constructor(private deps: ToolServiceDependencies) {}

  async listTools(): Promise<ListToolsResult> {
    logger.debug('Listing all available tools');

    const tools: Tool[] = [
      {
        name: 'create_workspace',
        description:
          'Create a new workspace with optional description and template',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the workspace to create',
            },
            description: {
              type: 'string',
              description: 'Optional description for the workspace',
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
              description: 'The name of the workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_shared_instruction',
        description: 'Create a new shared instruction template',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the shared instruction',
            },
            content: {
              type: 'string',
              description: 'The content of the instruction',
            },
            description: {
              type: 'string',
              description: 'Optional description for the instruction',
            },
            variables: {
              type: 'object',
              description: 'Optional variables for the instruction',
            },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'list_shared_instructions',
        description: 'List all available shared instruction templates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_global_instructions',
        description: 'Update global instructions that apply to all workspaces',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The global instructions content',
            },
            variables: {
              type: 'object',
              description: 'Optional variables for the instructions',
            },
          },
          required: ['content'],
        },
      },
    ];

    logger.debug(`Returning ${tools.length} tools`);
    return { tools };
  }

  async callTool(name: string, arguments_: unknown): Promise<CallToolResult> {
    logger.info(`Executing tool: ${name}`);

    try {
      switch (name) {
        case 'create_workspace': {
          return await this.createWorkspace(arguments_);
        }

        case 'list_workspaces': {
          return await this.listWorkspaces(arguments_);
        }

        case 'get_workspace_info': {
          return await this.getWorkspaceInfo(arguments_);
        }

        case 'create_shared_instruction': {
          return await this.createSharedInstruction(arguments_);
        }

        case 'list_shared_instructions': {
          return await this.listSharedInstructions(arguments_);
        }

        case 'update_global_instructions': {
          return await this.updateGlobalInstructions(arguments_);
        }

        default: {
          throw new Error(`Unknown tool: ${name}`);
        }
      }
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async createWorkspace(arguments_: unknown): Promise<CallToolResult> {
    const args = CreateWorkspaceArgsSchema.parse(arguments_);

    await this.deps.workspaceRepository.create(args.name, {
      description: args.description,
      template: args.template,
    });

    const message = `Workspace '${args.name}' created successfully`;
    logger.info(message);

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }

  private async listWorkspaces(arguments_: unknown): Promise<CallToolResult> {
    ListWorkspacesArgsSchema.parse(arguments_);

    const workspaces = await this.deps.workspaceRepository.list();

    if (workspaces.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No workspaces found',
          },
        ],
      };
    }

    const workspaceList = workspaces
      .map((ws) => `- ${ws.name}${ws.description ? `: ${ws.description}` : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available workspaces (${workspaces.length}):\n${workspaceList}`,
        },
      ],
    };
  }

  private async getWorkspaceInfo(arguments_: unknown): Promise<CallToolResult> {
    const args = GetWorkspaceInfoArgsSchema.parse(arguments_);

    const metadata = await this.deps.workspaceRepository.getMetadata(args.name);

    const info = [
      `Name: ${metadata.name}`,
      `Path: ${metadata.path}`,
      `Created: ${metadata.createdAt.toISOString()}`,
      `Modified: ${metadata.modifiedAt.toISOString()}`,
    ];

    if (metadata.description) {
      info.splice(1, 0, `Description: ${metadata.description}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: info.join('\n'),
        },
      ],
    };
  }

  private async createSharedInstruction(
    arguments_: unknown
  ): Promise<CallToolResult> {
    const args = CreateSharedInstructionArgsSchema.parse(arguments_);

    await this.deps.instructionsRepository.createShared(args.name, {
      name: args.name,
      content: args.content,
      description: args.description,
      variables: args.variables || {},
    });

    const message = `Shared instruction '${args.name}' created successfully`;
    logger.info(message);

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }

  private async listSharedInstructions(
    arguments_: unknown
  ): Promise<CallToolResult> {
    ListSharedInstructionsArgsSchema.parse(arguments_);

    const instructions = await this.deps.instructionsRepository.listShared();

    if (instructions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No shared instructions found',
          },
        ],
      };
    }

    const instructionList = instructions
      .map(
        (inst) =>
          `- ${inst.name}${inst.description ? `: ${inst.description}` : ''}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available shared instructions (${instructions.length}):\n${instructionList}`,
        },
      ],
    };
  }

  private async updateGlobalInstructions(
    arguments_: unknown
  ): Promise<CallToolResult> {
    const args = UpdateGlobalInstructionsArgsSchema.parse(arguments_);

    await this.deps.instructionsRepository.updateGlobal({
      content: args.content,
      variables: args.variables || {},
    });

    const message = 'Global instructions updated successfully';
    logger.info(message);

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }
}
