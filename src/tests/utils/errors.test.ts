import { describe, expect, it } from 'vitest';

import {
  FileSystemError,
  InvalidWorkspaceNameError,
  SharedInstructionNotFoundError,
  WorkspaceAlreadyExistsError,
  WorkspaceError,
  WorkspaceNotFoundError,
} from '../../utils/errors.js';

describe('errors', () => {
  describe('WorkspaceError', () => {
    it('should create error with message and code', () => {
      const error = new WorkspaceError('Test message', 'TEST_CODE');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('WorkspaceError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new WorkspaceError('Test message', 'TEST_CODE', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('InvalidWorkspaceNameError', () => {
    it('should create error with workspace name', () => {
      const error = new InvalidWorkspaceNameError('invalid-name');

      expect(error).toBeInstanceOf(WorkspaceError);
      expect(error.name).toBe('WorkspaceError');
      expect(error.message).toBe('Invalid workspace name: invalid-name');
      expect(error.code).toBe('INVALID_WORKSPACE_NAME');
    });
  });

  describe('WorkspaceNotFoundError', () => {
    it('should create error with workspace name', () => {
      const error = new WorkspaceNotFoundError('missing-workspace');

      expect(error).toBeInstanceOf(WorkspaceError);
      expect(error.message).toBe('Workspace not found: missing-workspace');
      expect(error.code).toBe('WORKSPACE_NOT_FOUND');
    });
  });

  describe('WorkspaceAlreadyExistsError', () => {
    it('should create error with workspace name', () => {
      const error = new WorkspaceAlreadyExistsError('existing-workspace');

      expect(error).toBeInstanceOf(WorkspaceError);
      expect(error.message).toBe(
        'Workspace already exists: existing-workspace'
      );
      expect(error.code).toBe('WORKSPACE_ALREADY_EXISTS');
    });
  });

  describe('SharedInstructionNotFoundError', () => {
    it('should create error with instruction name', () => {
      const error = new SharedInstructionNotFoundError('missing-instruction');

      expect(error).toBeInstanceOf(WorkspaceError);
      expect(error.message).toBe(
        'Shared instruction not found: missing-instruction'
      );
      expect(error.code).toBe('SHARED_INSTRUCTION_NOT_FOUND');
    });
  });

  describe('FileSystemError', () => {
    it('should create error without cause', () => {
      const error = new FileSystemError('Filesystem operation failed');

      expect(error).toBeInstanceOf(WorkspaceError);
      expect(error.message).toBe('Filesystem operation failed');
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with cause', () => {
      const cause = new Error('ENOENT: no such file or directory');
      const error = new FileSystemError('Filesystem operation failed', cause);

      expect(error.cause).toBe(cause);
    });
  });
});
