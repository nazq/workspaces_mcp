// Event Definitions - Strongly Typed Events for the Entire System
// Central registry for all domain events with payload types

export const EVENTS = {
  // Workspace Lifecycle Events
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',
  WORKSPACE_ACCESSED: 'workspace.accessed',

  // Instruction Events
  INSTRUCTION_CREATED: 'instruction.created',
  INSTRUCTION_UPDATED: 'instruction.updated',
  INSTRUCTION_DELETED: 'instruction.deleted',
  GLOBAL_INSTRUCTIONS_UPDATED: 'instruction.global.updated',

  // Server Lifecycle Events
  SERVER_STARTING: 'server.starting',
  SERVER_STARTED: 'server.started',
  SERVER_STOPPING: 'server.stopping',
  SERVER_STOPPED: 'server.stopped',
  SERVER_ERROR: 'server.error',

  // Transport Events
  TRANSPORT_CONNECTED: 'transport.connected',
  TRANSPORT_DISCONNECTED: 'transport.disconnected',
  TRANSPORT_ERROR: 'transport.error',
  TRANSPORT_MESSAGE_SENT: 'transport.message.sent',
  TRANSPORT_MESSAGE_RECEIVED: 'transport.message.received',

  // Tool Events
  TOOL_EXECUTED: 'tool.executed',
  TOOL_FAILED: 'tool.failed',
  TOOL_REGISTERED: 'tool.registered',
  TOOL_UNREGISTERED: 'tool.unregistered',

  // Resource Events
  RESOURCE_REQUESTED: 'resource.requested',
  RESOURCE_SERVED: 'resource.served',
  RESOURCE_ERROR: 'resource.error',

  // Configuration Events
  CONFIG_LOADED: 'config.loaded',
  CONFIG_UPDATED: 'config.updated',
  CONFIG_VALIDATION_FAILED: 'config.validation.failed',

  // File System Events
  FILE_CREATED: 'filesystem.file.created',
  FILE_UPDATED: 'filesystem.file.updated',
  FILE_DELETED: 'filesystem.file.deleted',
  DIRECTORY_CREATED: 'filesystem.directory.created',
  DIRECTORY_DELETED: 'filesystem.directory.deleted',

  // Error Events
  VALIDATION_ERROR: 'error.validation',
  PERMISSION_ERROR: 'error.permission',
  NOT_FOUND_ERROR: 'error.not_found',
  INTERNAL_ERROR: 'error.internal',
} as const;

// Event Payload Type Definitions
export interface WorkspaceCreatedEvent {
  name: string;
  path: string;
  description?: string;
  template?: string;
  createdAt: Date;
}

export interface WorkspaceUpdatedEvent {
  name: string;
  path: string;
  changes: {
    description?: string;
    template?: string;
  };
  updatedAt: Date;
}

export interface WorkspaceDeletedEvent {
  name: string;
  path: string;
  deletedAt: Date;
}

export interface WorkspaceAccessedEvent {
  name: string;
  path: string;
  accessType: 'read' | 'write' | 'list';
  accessedAt: Date;
}

export interface InstructionCreatedEvent {
  name: string;
  type: 'shared' | 'global';
  description?: string;
  contentLength: number;
  createdAt: Date;
}

export interface InstructionUpdatedEvent {
  name: string;
  type: 'shared' | 'global';
  contentLength: number;
  updatedAt: Date;
}

export interface InstructionDeletedEvent {
  name: string;
  type: 'shared';
  deletedAt: Date;
}

export interface ServerStartingEvent {
  timestamp: Date;
  config: {
    transport: string;
    workspacesRoot: string;
    logLevel: string;
  };
}

export interface ServerStartedEvent {
  timestamp: Date;
  startupTimeMs: number;
  transport: string;
  workspacesRoot: string;
}

export interface ServerStoppingEvent {
  timestamp: Date;
  reason: 'shutdown' | 'error' | 'restart';
}

export interface ServerStoppedEvent {
  timestamp: Date;
  uptime: number;
  shutdownTimeMs: number;
}

export interface ServerErrorEvent {
  timestamp: Date;
  error: Error;
  context: string;
  fatal: boolean;
}

export interface TransportConnectedEvent {
  transport: string;
  endpoint?: string;
  timestamp: Date;
}

export interface TransportDisconnectedEvent {
  transport: string;
  endpoint?: string;
  timestamp: Date;
  reason?: string;
}

export interface TransportErrorEvent {
  transport: string;
  error: Error;
  timestamp: Date;
}

export interface ToolExecutedEvent {
  toolName: string;
  args: unknown;
  success: boolean;
  executionTimeMs: number;
  timestamp: Date;
  result?: unknown;
  error?: Error;
}

export interface ToolFailedEvent {
  toolName: string;
  args: unknown;
  error: Error;
  executionTimeMs: number;
  timestamp: Date;
}

export interface ToolRegisteredEvent {
  toolName: string;
  description: string;
  timestamp: Date;
}

export interface ToolUnregisteredEvent {
  toolName: string;
  timestamp: Date;
}

export interface ResourceRequestedEvent {
  uri: string;
  timestamp: Date;
  requestId?: string;
}

export interface ResourceServedEvent {
  uri: string;
  contentType?: string;
  contentLength: number;
  responseTimeMs: number;
  timestamp: Date;
  requestId?: string;
}

export interface ResourceErrorEvent {
  uri: string;
  error: Error;
  timestamp: Date;
  requestId?: string;
}

export interface ConfigLoadedEvent {
  timestamp: Date;
  configPath?: string;
  overrides: Record<string, unknown>;
}

export interface ConfigUpdatedEvent {
  timestamp: Date;
  changes: Record<string, unknown>;
}

export interface ConfigValidationFailedEvent {
  timestamp: Date;
  errors: string[];
  config: Record<string, unknown>;
}

export interface FileCreatedEvent {
  path: string;
  size: number;
  timestamp: Date;
}

export interface FileUpdatedEvent {
  path: string;
  oldSize: number;
  newSize: number;
  timestamp: Date;
}

export interface FileDeletedEvent {
  path: string;
  timestamp: Date;
}

export interface DirectoryCreatedEvent {
  path: string;
  timestamp: Date;
}

export interface DirectoryDeletedEvent {
  path: string;
  timestamp: Date;
}

export interface ValidationErrorEvent {
  context: string;
  field: string;
  value: unknown;
  error: string;
  timestamp: Date;
}

export interface PermissionErrorEvent {
  operation: string;
  path: string;
  error: string;
  timestamp: Date;
}

export interface NotFoundErrorEvent {
  resource: string;
  path: string;
  timestamp: Date;
}

export interface InternalErrorEvent {
  context: string;
  error: Error;
  timestamp: Date;
  stack?: string;
}

// Union type for all events
export type DomainEvent =
  | WorkspaceCreatedEvent
  | WorkspaceUpdatedEvent
  | WorkspaceDeletedEvent
  | WorkspaceAccessedEvent
  | InstructionCreatedEvent
  | InstructionUpdatedEvent
  | InstructionDeletedEvent
  | ServerStartingEvent
  | ServerStartedEvent
  | ServerStoppingEvent
  | ServerStoppedEvent
  | ServerErrorEvent
  | TransportConnectedEvent
  | TransportDisconnectedEvent
  | TransportErrorEvent
  | ToolExecutedEvent
  | ToolFailedEvent
  | ToolRegisteredEvent
  | ToolUnregisteredEvent
  | ResourceRequestedEvent
  | ResourceServedEvent
  | ResourceErrorEvent
  | ConfigLoadedEvent
  | ConfigUpdatedEvent
  | ConfigValidationFailedEvent
  | FileCreatedEvent
  | FileUpdatedEvent
  | FileDeletedEvent
  | DirectoryCreatedEvent
  | DirectoryDeletedEvent
  | ValidationErrorEvent
  | PermissionErrorEvent
  | NotFoundErrorEvent
  | InternalErrorEvent;
