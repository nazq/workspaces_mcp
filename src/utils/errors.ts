export class WorkspaceError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
  }
}

export class InvalidWorkspaceNameError extends WorkspaceError {
  constructor(name: string) {
    super(`Invalid workspace name: ${name}`, 'INVALID_WORKSPACE_NAME');
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(name: string) {
    super(`Workspace not found: ${name}`, 'WORKSPACE_NOT_FOUND');
  }
}

export class WorkspaceAlreadyExistsError extends WorkspaceError {
  constructor(name: string) {
    super(`Workspace already exists: ${name}`, 'WORKSPACE_ALREADY_EXISTS');
  }
}

export class SharedInstructionNotFoundError extends WorkspaceError {
  constructor(name: string) {
    super(
      `Shared instruction not found: ${name}`,
      'SHARED_INSTRUCTION_NOT_FOUND'
    );
  }
}

export class FileSystemError extends WorkspaceError {
  constructor(message: string, cause?: Error) {
    super(message, 'FILESYSTEM_ERROR', cause);
  }
}
