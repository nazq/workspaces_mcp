// Services Layer Interface Definitions
import type {
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

import type {
  InstructionsRepository,
  WorkspaceCreateOptions,
  WorkspaceRepository,
} from '../data/interfaces.js';

export interface ResourceService {
  listResources(): Promise<{
    resources: Array<{
      uri: string;
      name: string;
      description?: string;
      mimeType?: string;
    }>;
  }>;

  readResource(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
      blob?: string;
    }>;
  }>;
}

export interface ToolService {
  listTools(): Promise<ListToolsResult>;
  callTool(name: string, arguments_: unknown): Promise<CallToolResult>;
}

export interface ResourceServiceDependencies {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
}

export interface ToolServiceDependencies {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
}

// Re-export for convenience
export type { WorkspaceCreateOptions };
