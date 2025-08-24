// Service Tokens - Type-safe dependency identification
// Central registry for all injectable services

// Domain Services
export const TOKENS = {
  // Core Services
  WorkspaceService: Symbol('WorkspaceService'),
  ResourceService: Symbol('ResourceService'),
  ToolService: Symbol('ToolService'),
  InstructionsService: Symbol('InstructionsService'),

  // Repositories
  WorkspaceRepository: Symbol('WorkspaceRepository'),
  InstructionsRepository: Symbol('InstructionsRepository'),

  // Infrastructure Services
  FileSystemService: Symbol('FileSystemService'),
  ConfigurationService: Symbol('ConfigurationService'),
  Logger: Symbol('Logger'),
  EventBus: Symbol('EventBus'),

  // Tool System
  ToolRegistry: Symbol('ToolRegistry'),

  // Transport & Protocol
  TransportFactory: Symbol('TransportFactory'),
  ProtocolProcessor: Symbol('ProtocolProcessor'),

  // Controllers
  ControllerFactory: Symbol('ControllerFactory'),
  ListResourcesController: Symbol('ListResourcesController'),
  ReadResourceController: Symbol('ReadResourceController'),
  ListToolsController: Symbol('ListToolsController'),
  CallToolController: Symbol('CallToolController'),

  // Server Components
  ServerOrchestrator: Symbol('ServerOrchestrator'),

  // Configuration
  AppConfig: Symbol('AppConfig'),
} as const;

// Type helpers for stronger typing
export type ServiceTokenType<K extends keyof typeof TOKENS> =
  (typeof TOKENS)[K];

// Token groups for batch operations
export const TOKEN_GROUPS = {
  REPOSITORIES: [TOKENS.WorkspaceRepository, TOKENS.InstructionsRepository],
  SERVICES: [
    TOKENS.WorkspaceService,
    TOKENS.ResourceService,
    TOKENS.ToolService,
    TOKENS.InstructionsService,
  ],
  INFRASTRUCTURE: [
    TOKENS.FileSystemService,
    TOKENS.ConfigurationService,
    TOKENS.Logger,
    TOKENS.EventBus,
  ],
  CONTROLLERS: [
    TOKENS.ControllerFactory,
    TOKENS.ListResourcesController,
    TOKENS.ReadResourceController,
    TOKENS.ListToolsController,
    TOKENS.CallToolController,
  ],
} as const;
