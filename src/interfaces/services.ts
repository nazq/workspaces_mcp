// Service Layer Interfaces - Clean Contracts for All Services
// Clean separation of concerns with Result pattern integration

import type {
  CallToolResult,
  ListResourcesResult,
  ListToolsResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';

// Domain Models
export interface WorkspaceMetadata {
  name: string;
  path: string;
  description?: string;
  template?: string;
  createdAt: Date;
  updatedAt: Date;
  fileCount?: number;
  size?: number;
  files?: string[];
}

export interface SharedInstruction {
  name: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalInstructions {
  content: string;
  variables?: Record<string, string>;
  updatedAt: Date;
}

// Service Options
export interface WorkspaceCreateOptions {
  description?: string;
  template?: string;
  variables?: Record<string, string>;
}

export interface SharedInstructionCreateOptions {
  description?: string;
  variables?: Record<string, string>;
}

export interface GlobalInstructionUpdateOptions {
  variables?: Record<string, string>;
}

// Core Service Interfaces
export interface WorkspaceService {
  createWorkspace(
    name: string,
    options?: WorkspaceCreateOptions
  ): Promise<Result<WorkspaceMetadata, Error>>;

  listWorkspaces(): Promise<Result<WorkspaceMetadata[], Error>>;

  getWorkspaceInfo(name: string): Promise<Result<WorkspaceMetadata, Error>>;

  deleteWorkspace(name: string): Promise<Result<void, Error>>;

  workspaceExists(name: string): Promise<Result<boolean, Error>>;

  updateWorkspace(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<WorkspaceMetadata, Error>>;
}

export interface ResourceService {
  listResources(): Promise<Result<ListResourcesResult, Error>>;
  readResource(uri: string): Promise<Result<ReadResourceResult, Error>>;
}

export interface ToolService {
  listTools(): Promise<Result<ListToolsResult, Error>>;
  callTool(
    name: string,
    args?: unknown,
    context?: ToolContext
  ): Promise<Result<CallToolResult, Error>>;
}

export interface InstructionsService {
  createSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void, Error>>;

  listSharedInstructions(): Promise<Result<SharedInstruction[], Error>>;

  getSharedInstruction(name: string): Promise<Result<SharedInstruction, Error>>;

  updateSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void, Error>>;

  deleteSharedInstruction(name: string): Promise<Result<void, Error>>;

  updateGlobalInstructions(
    content: string,
    options?: GlobalInstructionUpdateOptions
  ): Promise<Result<void, Error>>;

  getGlobalInstructions(): Promise<Result<GlobalInstructions, Error>>;
}

// Repository Interfaces
export interface WorkspaceRepository {
  create(
    name: string,
    options?: WorkspaceCreateOptions
  ): Promise<Result<void, Error>>;

  list(): Promise<Result<WorkspaceMetadata[], Error>>;

  exists(name: string): Promise<Result<boolean, Error>>;

  getMetadata(name: string): Promise<Result<WorkspaceMetadata, Error>>;

  delete(name: string): Promise<Result<void, Error>>;

  update(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<void, Error>>;
}

export interface InstructionsRepository {
  createShared(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void, Error>>;

  listShared(): Promise<Result<SharedInstruction[], Error>>;

  getShared(name: string): Promise<Result<SharedInstruction, Error>>;

  updateShared(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void, Error>>;

  deleteShared(name: string): Promise<Result<void, Error>>;

  updateGlobal(
    content: string,
    options?: GlobalInstructionUpdateOptions
  ): Promise<Result<void, Error>>;

  getGlobal(): Promise<Result<GlobalInstructions, Error>>;
}

// Infrastructure Interfaces
export interface FileSystemService {
  ensureDirectory(path: string): Promise<Result<void, Error>>;
  writeFile(path: string, content: string): Promise<Result<void, Error>>;
  readFile(path: string): Promise<Result<string, Error>>;
  fileExists(path: string): Promise<Result<boolean, Error>>;
  directoryExists(path: string): Promise<Result<boolean, Error>>;
  listFiles(
    path: string,
    recursive?: boolean
  ): Promise<Result<string[], Error>>;
  listDirectories(path: string): Promise<Result<string[], Error>>;
  deleteFile(path: string): Promise<Result<void, Error>>;
  deleteDirectory(path: string): Promise<Result<void, Error>>;
  getFileStats(path: string): Promise<
    Result<
      {
        size: number;
        createdAt: Date;
        updatedAt: Date;
        isDirectory: boolean;
      },
      Error
    >
  >;
}

// Event System Interfaces
export interface EventBus {
  // Method overloads for type-safe event handling
  emit<K extends keyof import('../events/events.js').EventMap>(
    event: K,
    data: import('../events/events.js').EventMap[K]
  ): Promise<void>;
  emit<T = unknown>(event: string, data: T): Promise<void>;

  on<K extends keyof import('../events/events.js').EventMap>(
    event: K,
    handler: EventHandler<import('../events/events.js').EventMap[K]>
  ): () => void;
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;

  once<K extends keyof import('../events/events.js').EventMap>(
    event: K,
    handler: EventHandler<import('../events/events.js').EventMap[K]>
  ): void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;

  off<K extends keyof import('../events/events.js').EventMap>(
    event: K,
    handler?: EventHandler<import('../events/events.js').EventMap[K]>
  ): void;
  off(event: string, handler?: EventHandler): void;

  removeAllListeners(event?: string): void;
}

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

// Tool System Interfaces
export interface ToolHandler<TArgs = unknown, TResult = CallToolResult> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown; // Zod schema - typed as unknown to avoid import dependencies

  execute(args: TArgs, context: ToolContext): Promise<Result<TResult, Error>>;
}

export interface ToolContext {
  workspaceRepository: WorkspaceService;
  instructionsRepository: InstructionsService;
  config: AppConfig;
  logger: Logger;
  eventBus: EventBus;
}

// Re-export AppConfig type for ToolContext
export type AppConfig = {
  workspaces: {
    rootPath: string;
    maxWorkspaces: number;
    allowedTemplates: string[];
  };
  server: {
    transport: {
      type: string;
      stdio?: Record<string, unknown>;
      http?: {
        host: string;
        port: number;
      };
    };
    timeout: number;
  };
  logging: {
    level: string;
    format: string;
    destination: string;
  };
  features: {
    enableTemplates: boolean;
    enableSharedInstructions: boolean;
    enableFileWatching: boolean;
  };
  development: {
    enableDebugMode: boolean;
    mockServices: boolean;
  };
  security: {
    maxFileSize: number;
    allowedFileTypes: string[];
    sanitizeContent: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    cacheTTL: number;
    maxConcurrentRequests: number;
  };
};

export interface ToolRegistry {
  register(handler: ToolHandler): void;
  unregister(name: string): void;
  listTools(): unknown[]; // MCP Tool[] - typed as unknown to avoid import dependencies
  execute(
    name: string,
    args: unknown,
    context: ToolContext
  ): Promise<Result<CallToolResult, Error>>;
  hasHandler(name: string): boolean;
  getHandlerNames(): string[];
  getHandler(name: string): ToolHandler | undefined;
  clear(): void;
}

// Logging Interface
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
}

// Transport & Protocol Interfaces
export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: Record<string, unknown>): Promise<void>;
  isConnected(): boolean;
}

export interface ProtocolProcessor {
  processRequest(
    request: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  registerHandler(method: string, handler: RequestHandler): void;
  unregisterHandler(method: string): void;
}

export type RequestHandler = (
  request: Record<string, unknown>
) => Promise<Record<string, unknown>>;

// Controller Interfaces
export interface Controller {
  readonly method: string;
  handle(request: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export interface ControllerFactory {
  createAll(): Controller[];
  createResourceControllers(): Controller[];
  createToolControllers(): Controller[];
}
