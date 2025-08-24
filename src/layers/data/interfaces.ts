// Data Layer Interfaces and Types
export interface FileSystemProvider {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  readDirectory(path: string): Promise<string[]>;
  createDirectory(path: string, recursive?: boolean): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  getStats(path: string): Promise<FileStats>;
  watch(
    path: string,
    callback: (event: FileEvent) => void
  ): Promise<FileWatcher>;
}

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
  createdTime: Date;
}

export interface FileEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  isDirectory: boolean;
}

export interface FileWatcher {
  close(): Promise<void>;
}

// Repository patterns for domain entities
export interface WorkspaceRepository {
  exists(name: string): Promise<boolean>;
  create(name: string, options: WorkspaceCreateOptions): Promise<void>;
  list(): Promise<WorkspaceMetadata[]>;
  getMetadata(name: string): Promise<WorkspaceMetadata>;
  delete(name: string): Promise<void>;
  getWorkspacePath(name: string): string;
}

export interface InstructionsRepository {
  listShared(): Promise<SharedInstructionMetadata[]>;
  getShared(name: string): Promise<SharedInstruction>;
  createShared(name: string, instruction: SharedInstruction): Promise<void>;
  deleteShared(name: string): Promise<void>;
  getGlobal(): Promise<GlobalInstructions>;
  updateGlobal(instructions: GlobalInstructions): Promise<void>;
}

// Domain types
export interface WorkspaceCreateOptions {
  description?: string;
  template?: string;
  initializeInstructions?: boolean;
}

export interface WorkspaceMetadata {
  name: string;
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
  path: string;
  hasInstructions: boolean;
}

export interface SharedInstructionMetadata {
  name: string;
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface SharedInstruction {
  name: string;
  description?: string;
  content: string;
  variables?: Record<string, string>;
}

export interface GlobalInstructions {
  content: string;
  variables?: Record<string, string>;
}

// Data validation
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
