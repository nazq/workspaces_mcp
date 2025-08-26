// Import reflect-metadata for TSyringe decorators
import 'reflect-metadata';

// Export new server architecture
export {
  WorkspacesMcpServer,
  createWorkspacesMcpServer,
} from './layers/server.js';

// Export basic server for backward compatibility
export { createWorkspacesServer } from './server/index.js';

// Export DI container utilities
export {
  TOKENS,
  configureContainer,
  createToolContext,
  getContainer,
  resetContainer,
} from './container/container.js';

// Export services
export { InstructionsService } from './layers/services/instructions-service.js';
export { ResourceService } from './layers/services/resource-service.js';
export { ToolService } from './layers/services/tool-service.js';
export { WorkspaceService } from './layers/services/workspace-service.js';

// Export data layer
export { NodeFileSystemProvider } from './layers/data/filesystem/node-provider.js';
export { FileSystemInstructionsRepository } from './layers/data/repositories/instructions-repository.js';
export { FileSystemWorkspaceRepository } from './layers/data/repositories/workspace-repository.js';
export { FileSystemService } from './services/filesystem.js';

// Export types
export type {
  AppConfig,
  GlobalInstructions,
  SharedInstruction,
  ToolContext,
  WorkspaceMetadata,
} from './interfaces/services.js';

// Export legacy types for backward compatibility
export type { Workspace, WorkspaceConfig } from './types/workspace.js';
