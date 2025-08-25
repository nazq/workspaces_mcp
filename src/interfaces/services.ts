// Service Layer Interfaces - Clean Contracts for All Services
// Professional separation of concerns with Result pattern integration

import type {
  CallToolResult,
  ListResourcesResult,
  ListToolsResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

import type { Result } from '../utils/result.js';

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
  ): Promise<Result<WorkspaceMetadata>>;

  listWorkspaces(): Promise<Result<WorkspaceMetadata[]>>;

  getWorkspaceInfo(name: string): Promise<Result<WorkspaceMetadata>>;

  deleteWorkspace(name: string): Promise<Result<void>>;

  workspaceExists(name: string): Promise<Result<boolean>>;

  updateWorkspace(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<WorkspaceMetadata>>;
}

export interface ResourceService {
  listResources(): Promise<Result<ListResourcesResult>>;
  readResource(uri: string): Promise<Result<ReadResourceResult>>;
}

export interface ToolService {
  listTools(): Promise<Result<ListToolsResult>>;
  callTool(name: string, args?: unknown): Promise<Result<CallToolResult>>;
}

export interface InstructionsService {
  createSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>>;

  listSharedInstructions(): Promise<Result<SharedInstruction[]>>;

  getSharedInstruction(name: string): Promise<Result<SharedInstruction>>;

  updateSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>>;

  deleteSharedInstruction(name: string): Promise<Result<void>>;

  updateGlobalInstructions(
    content: string,
    options?: GlobalInstructionUpdateOptions
  ): Promise<Result<void>>;

  getGlobalInstructions(): Promise<Result<GlobalInstructions>>;
}

// Repository Interfaces
export interface WorkspaceRepository {
  create(name: string, options?: WorkspaceCreateOptions): Promise<Result<void>>;

  list(): Promise<Result<WorkspaceMetadata[]>>;

  exists(name: string): Promise<Result<boolean>>;

  getMetadata(name: string): Promise<Result<WorkspaceMetadata>>;

  delete(name: string): Promise<Result<void>>;

  update(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<void>>;
}

export interface InstructionsRepository {
  createShared(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>>;

  listShared(): Promise<Result<SharedInstruction[]>>;

  getShared(name: string): Promise<Result<SharedInstruction>>;

  updateShared(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>>;

  deleteShared(name: string): Promise<Result<void>>;

  updateGlobal(
    content: string,
    options?: GlobalInstructionUpdateOptions
  ): Promise<Result<void>>;

  getGlobal(): Promise<Result<GlobalInstructions>>;
}

// Infrastructure Interfaces
export interface FileSystemService {
  ensureDirectory(path: string): Promise<Result<void>>;
  writeFile(path: string, content: string): Promise<Result<void>>;
  readFile(path: string): Promise<Result<string>>;
  fileExists(path: string): Promise<Result<boolean>>;
  directoryExists(path: string): Promise<Result<boolean>>;
  listFiles(path: string, recursive?: boolean): Promise<Result<string[]>>;
  listDirectories(path: string): Promise<Result<string[]>>;
  deleteFile(path: string): Promise<Result<void>>;
  deleteDirectory(path: string): Promise<Result<void>>;
  getFileStats(path: string): Promise<
    Result<{
      size: number;
      createdAt: Date;
      updatedAt: Date;
      isDirectory: boolean;
    }>
  >;
}

// Event System Interfaces
export interface EventBus {
  emit<T = unknown>(event: string, data: T): Promise<void>;
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  off(event: string, handler?: EventHandler): void;
  removeAllListeners(event?: string): void;
}

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

// Tool System Interfaces
export interface ToolHandler<TArgs = unknown, TResult = CallToolResult> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown; // Zod schema - typed as unknown to avoid import dependencies

  execute(args: TArgs, context: ToolContext): Promise<Result<TResult>>;
}

export interface ToolContext {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
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
  ): Promise<Result<CallToolResult>>;
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
