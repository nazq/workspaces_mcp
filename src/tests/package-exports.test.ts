import { describe, expect, it } from 'vitest';

import {
  createWorkspacesServer,
  FileSystemService,
  InstructionsService,
  WorkspaceService,
} from '../index.js';
import type { SharedInstruction, Workspace, WorkspaceConfig } from '../index.js';

describe('Package Exports', () => {
  describe('Service Exports', () => {
    it('should export createWorkspacesServer function', () => {
      expect(createWorkspacesServer).toBeDefined();
      expect(typeof createWorkspacesServer).toBe('function');
    });

    it('should export FileSystemService class', () => {
      expect(FileSystemService).toBeDefined();
      expect(typeof FileSystemService).toBe('function');
      expect(FileSystemService.name).toBe('FileSystemService');
    });

    it('should export InstructionsService class', () => {
      expect(InstructionsService).toBeDefined();
      expect(typeof InstructionsService).toBe('function');
      expect(InstructionsService.name).toBe('InstructionsService');
    });

    it('should export WorkspaceService class', () => {
      expect(WorkspaceService).toBeDefined();
      expect(typeof WorkspaceService).toBe('function');
      expect(WorkspaceService.name).toBe('WorkspaceService');
    });
  });

  describe('Type Exports', () => {
    it('should export types without runtime impact', () => {
      // Types should not exist at runtime, but we can test that imports don't throw
      const testTypes = (): void => {
        // These should compile without errors if types are properly exported
        const _sharedInstruction: SharedInstruction = {
          name: 'test',
          path: '/path/to/test',
          content: 'test content',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const _workspace: Workspace = {
          name: 'test-workspace',
          path: '/path/to/workspace',
          createdAt: new Date(),
          updatedAt: new Date(),
          files: [],
        };

        const _workspaceConfig: WorkspaceConfig = {
          workspacesRoot: '/path/to/workspaces',
          sharedInstructionsPath: '/path/to/shared',
          globalInstructionsPath: '/path/to/global',
        };
      };

      // Should not throw
      expect(testTypes).not.toThrow();
    });
  });

  describe('Module Integration', () => {
    it('should create server instance from exported function', () => {
      const server = createWorkspacesServer('/tmp/test-workspaces');
      
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
      // Should have MCP server methods
      expect(server).toHaveProperty('connect');
      expect(server).toHaveProperty('close');
    });

    it('should instantiate service classes', () => {
      const fsService = new FileSystemService();
      expect(fsService).toBeInstanceOf(FileSystemService);

      const instructionsService = new InstructionsService('/tmp/test-workspaces');
      expect(instructionsService).toBeInstanceOf(InstructionsService);
    });
  });
});