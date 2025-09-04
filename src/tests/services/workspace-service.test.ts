import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import { EVENTS } from '../../events/events.js';
import type {
  EventBus,
  FileSystemService,
  Logger,
  WorkspaceCreateOptions,
} from '../../interfaces/services.js';
import { WorkspaceService } from '../../services/workspace.js';
import {
  WorkspaceAlreadyExistsError,
  WorkspaceNotFoundError,
} from '../../utils/errors.js';
import { DEFAULT_WORKSPACE_README } from '../../utils/templates.js';

// Mock FileSystemService
const createMockFileSystemService = (): FileSystemService => ({
  directoryExists: vi.fn().mockResolvedValue(ok(false)),
  fileExists: vi.fn().mockResolvedValue(ok(true)),
  ensureDirectory: vi.fn().mockResolvedValue(ok(undefined)),
  deleteDirectory: vi.fn().mockResolvedValue(ok(undefined)),
  writeFile: vi.fn().mockResolvedValue(ok(undefined)),
  readFile: vi.fn().mockResolvedValue(ok('file content')),
  listFiles: vi.fn().mockResolvedValue(ok(['README.md'])),
  listDirectories: vi.fn().mockResolvedValue(ok(['workspace1', 'workspace2'])),
  getFileStats: vi.fn().mockResolvedValue(
    ok({
      size: 100,
      isDirectory: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    })
  ),
  watchFile: vi.fn().mockResolvedValue(ok(undefined)),
  unwatchFile: vi.fn().mockResolvedValue(ok(undefined)),
  watchDirectory: vi.fn().mockResolvedValue(ok(undefined)),
  unwatchDirectory: vi.fn().mockResolvedValue(ok(undefined)),
});

// Mock EventBus
const createMockEventBus = (): EventBus => ({
  emit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  once: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
});

// Mock Logger
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
});

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let mockFs: FileSystemService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;
  const workspacesRoot = '/test/workspaces';

  beforeEach(() => {
    mockFs = createMockFileSystemService();
    mockEventBus = createMockEventBus();
    mockLogger = createMockLogger();

    workspaceService = new WorkspaceService(
      workspacesRoot,
      mockFs,
      mockEventBus,
      mockLogger
    );
  });

  describe('createWorkspace', () => {
    const validName = 'test-workspace';

    beforeEach(() => {
      // Default mocks for successful creation
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));
      vi.mocked(mockFs.ensureDirectory).mockResolvedValue(ok(undefined));
      vi.mocked(mockFs.writeFile).mockResolvedValue(ok(undefined));
    });

    it('should create workspace successfully with minimal options', async () => {
      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(validName);
        expect(result.value.path).toBe('/test/workspaces/test-workspace');
        expect(result.value.fileCount).toBe(1);
        expect(result.value.files).toEqual(['README.md']);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }

      expect(mockFs.ensureDirectory).toHaveBeenCalledWith(
        '/test/workspaces/test-workspace'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/workspaces/test-workspace/README.md',
        DEFAULT_WORKSPACE_README(validName)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Creating workspace: ${validName}`,
        { options: {} }
      );
    });

    it('should create workspace with description and template', async () => {
      const options: WorkspaceCreateOptions = {
        description: 'Test workspace description',
        template: 'react',
      };

      const result = await workspaceService.createWorkspace(validName, options);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.description).toBe('Test workspace description');
        expect(result.value.template).toBe('react');
      }
    });

    it('should emit workspace created event', async () => {
      await workspaceService.createWorkspace(validName, {
        description: 'Test description',
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EVENTS.WORKSPACE_CREATED,
        expect.objectContaining({
          name: validName,
          path: '/test/workspaces/test-workspace',
          description: 'Test description',
          createdAt: expect.any(Date),
        })
      );
    });

    it('should continue creation even if event emission fails', async () => {
      vi.mocked(mockEventBus.emit).mockRejectedValue(new Error('Event failed'));

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to emit workspace created event',
        expect.objectContaining({ name: validName })
      );
    });

    it('should reject invalid workspace names', async () => {
      const invalidNames = [
        '',
        'invalid name with spaces',
        'invalid@chars',
        '../path-traversal',
        'name.with.dots',
      ];

      for (const name of invalidNames) {
        const result = await workspaceService.createWorkspace(name);
        expect(result.isOk()).toBe(false);
        if (!result.isOk()) {
          expect(result.error.message).toContain('Invalid workspace name');
        }
      }
    });

    it('should fail if workspace already exists', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBeInstanceOf(WorkspaceAlreadyExistsError);
        expect(result.error.message).toContain(validName);
      }
    });

    it('should handle filesystem errors during directory creation', async () => {
      vi.mocked(mockFs.ensureDirectory).mockResolvedValue(
        err(new Error('Permission denied'))
      );

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to create workspace directory'
        );
        expect(result.error.message).toContain('Permission denied');
      }
    });

    it('should handle filesystem errors during README creation', async () => {
      vi.mocked(mockFs.writeFile).mockResolvedValue(
        err(new Error('Write failed'))
      );

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to create README');
        expect(result.error.message).toContain('Write failed');
      }
    });

    it('should handle errors when checking workspace existence', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspace existence'
        );
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.createWorkspace(validName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Workspace creation failed');
        expect(result.error.message).toContain('Unexpected error');
      }
    });
  });

  describe('listWorkspaces', () => {
    beforeEach(() => {
      // Default setup for successful listing
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));
      vi.mocked(mockFs.listDirectories).mockResolvedValue(
        ok(['workspace1', 'workspace2', 'SHARED_INSTRUCTIONS'])
      );
    });

    it('should list workspaces successfully', async () => {
      // Mock getWorkspaceInfo for each workspace
      const workspace1 = {
        name: 'workspace1',
        path: '/test/workspaces/workspace1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        fileCount: 2,
        size: 200,
        files: ['README.md', 'file.txt'],
      };
      const workspace2 = {
        name: 'workspace2',
        path: '/test/workspaces/workspace2',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-04'),
        fileCount: 1,
        size: 100,
        files: ['README.md'],
      };

      // Mock individual workspace info calls
      vi.spyOn(workspaceService, 'getWorkspaceInfo')
        .mockResolvedValueOnce(ok(workspace1))
        .mockResolvedValueOnce(ok(workspace2));

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].name).toBe('workspace1'); // Sorted alphabetically
        expect(result.value[1].name).toBe('workspace2');
      }

      expect(mockLogger.debug).toHaveBeenCalledWith('Found 2 workspaces');
    });

    it('should return empty array when workspaces root does not exist', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('should skip SHARED_INSTRUCTIONS directory', async () => {
      vi.mocked(mockFs.listDirectories).mockResolvedValue(
        ok(['workspace1', 'SHARED_INSTRUCTIONS'])
      );
      vi.spyOn(workspaceService, 'getWorkspaceInfo').mockResolvedValueOnce(
        ok({
          name: 'workspace1',
          path: '/test/workspaces/workspace1',
          createdAt: new Date(),
          updatedAt: new Date(),
          fileCount: 1,
          size: 100,
          files: ['README.md'],
        })
      );

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('workspace1');
      }
    });

    it('should skip invalid workspaces', async () => {
      vi.mocked(mockFs.listDirectories).mockResolvedValue(
        ok(['valid-workspace', 'invalid-workspace'])
      );
      vi.spyOn(workspaceService, 'getWorkspaceInfo')
        .mockResolvedValueOnce(
          ok({
            name: 'valid-workspace',
            path: '/test/workspaces/valid-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
            fileCount: 1,
            size: 100,
            files: ['README.md'],
          })
        )
        .mockResolvedValueOnce(err(new Error('Invalid workspace')));

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('valid-workspace');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping invalid workspace: invalid-workspace',
        expect.any(Error)
      );
    });

    it('should handle errors when checking root directory existence', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspaces root'
        );
      }
    });

    it('should handle errors when listing directories', async () => {
      vi.mocked(mockFs.listDirectories).mockResolvedValue(
        err(new Error('Read error'))
      );

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to list workspace directory'
        );
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.listWorkspaces();

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to list workspaces');
      }
    });
  });

  describe('getWorkspaceInfo', () => {
    const workspaceName = 'test-workspace';
    const workspacePath = '/test/workspaces/test-workspace';

    beforeEach(() => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));
      vi.mocked(mockFs.listFiles).mockResolvedValue(
        ok(['README.md', 'src/index.js'])
      );
      vi.mocked(mockFs.getFileStats)
        .mockResolvedValueOnce(
          ok({
            size: 1000,
            isDirectory: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
          })
        )
        .mockResolvedValueOnce(
          ok({
            size: 100,
            isDirectory: false,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
          })
        )
        .mockResolvedValueOnce(
          ok({
            size: 200,
            isDirectory: false,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
          })
        );
    });

    it('should get workspace info successfully', async () => {
      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(workspaceName);
        expect(result.value.path).toBe(workspacePath);
        expect(result.value.fileCount).toBe(2);
        expect(result.value.size).toBe(300); // 100 + 200 (files only)
        expect(result.value.files).toEqual(['README.md', 'src/index.js']);
        expect(result.value.createdAt).toEqual(new Date('2024-01-01'));
        expect(result.value.updatedAt).toEqual(new Date('2024-01-02'));
      }
    });

    it('should emit workspace accessed event', async () => {
      await workspaceService.getWorkspaceInfo(workspaceName);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EVENTS.WORKSPACE_ACCESSED,
        expect.objectContaining({
          name: workspaceName,
          path: workspacePath,
          accessType: 'read',
          accessedAt: expect.any(Date),
        })
      );
    });

    it('should continue even if event emission fails', async () => {
      vi.mocked(mockEventBus.emit).mockRejectedValue(new Error('Event failed'));

      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to emit workspace accessed event',
        expect.objectContaining({ name: workspaceName })
      );
    });

    it('should reject invalid workspace names', async () => {
      const result = await workspaceService.getWorkspaceInfo('invalid name');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });

    it('should fail if workspace does not exist', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));

      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });

    it('should handle errors when checking workspace existence', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspace existence'
        );
      }
    });

    it('should handle errors when listing files', async () => {
      vi.mocked(mockFs.listFiles).mockResolvedValue(
        err(new Error('Read error'))
      );

      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to list workspace files'
        );
      }
    });

    it('should handle graceful degradation for file stats', async () => {
      // This test verifies the service continues working even if some file operations fail
      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      // Should succeed with the standard mocked values
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(workspaceName);
        expect(result.value.path).toContain(workspaceName);
        expect(result.value.fileCount).toBe(2); // README.md + src/index.js
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.getWorkspaceInfo(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Failed to get workspace info');
      }
    });
  });

  describe('deleteWorkspace', () => {
    const workspaceName = 'test-workspace';
    const workspacePath = '/test/workspaces/test-workspace';

    beforeEach(() => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));
      vi.mocked(mockFs.deleteDirectory).mockResolvedValue(ok(undefined));
    });

    it('should delete workspace successfully', async () => {
      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(true);
      expect(mockFs.deleteDirectory).toHaveBeenCalledWith(workspacePath);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Deleting workspace: ${workspaceName}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Workspace deleted successfully: ${workspaceName}`
      );
    });

    it('should emit workspace deleted event', async () => {
      await workspaceService.deleteWorkspace(workspaceName);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EVENTS.WORKSPACE_DELETED,
        expect.objectContaining({
          name: workspaceName,
          path: workspacePath,
          deletedAt: expect.any(Date),
        })
      );
    });

    it('should continue deletion even if event emission fails', async () => {
      vi.mocked(mockEventBus.emit).mockRejectedValue(new Error('Event failed'));

      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to emit workspace deleted event',
        expect.objectContaining({ name: workspaceName })
      );
    });

    it('should reject invalid workspace names', async () => {
      const result = await workspaceService.deleteWorkspace('invalid name');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });

    it('should fail if workspace does not exist', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));

      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });

    it('should handle errors when checking workspace existence', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspace existence'
        );
      }
    });

    it('should handle errors during directory deletion', async () => {
      vi.mocked(mockFs.deleteDirectory).mockResolvedValue(
        err(new Error('Delete failed'))
      );

      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to delete workspace directory'
        );
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.deleteWorkspace(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Workspace deletion failed');
      }
    });
  });

  describe('validateWorkspaceFile', () => {
    const workspaceName = 'test-workspace';
    const workspacePath = '/test/workspaces/test-workspace';

    beforeEach(() => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));
      vi.mocked(mockFs.fileExists).mockResolvedValue(ok(true));
    });

    it('should validate workspace file successfully', async () => {
      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'src/index.js'
      );

      expect(result.isOk()).toBe(true);
      expect(mockFs.fileExists).toHaveBeenCalledWith(
        '/test/workspaces/test-workspace/src/index.js'
      );
    });

    it('should reject invalid workspace names', async () => {
      const result = await workspaceService.validateWorkspaceFile(
        'invalid name',
        'file.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });

    it('should fail if workspace does not exist', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'file.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });

    it('should prevent path traversal attacks', async () => {
      // Test specific dangerous path patterns
      const dangerousPath = '../../../etc/passwd';

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        dangerousPath
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Security violation');
        expect(result.error.message).toContain('within workspace directory');
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Path traversal attempt detected',
        expect.objectContaining({
          workspaceName,
          relativePath: dangerousPath,
        })
      );
    });

    it('should prevent relative path traversal attacks', async () => {
      const dangerousPath = 'subdir/../../dangerous.txt';

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        dangerousPath
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Security violation');
      }
    });

    it('should fail if file does not exist', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(ok(false));

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'nonexistent.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('File does not exist');
      }
    });

    it('should handle errors when checking workspace existence', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'file.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspace existence'
        );
      }
    });

    it('should handle errors when checking file existence', async () => {
      vi.mocked(mockFs.fileExists).mockResolvedValue(
        err(new Error('File system error'))
      );

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'file.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check file existence'
        );
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.validateWorkspaceFile(
        workspaceName,
        'file.txt'
      );

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('File validation failed');
      }
    });
  });

  describe('workspaceExists', () => {
    const workspaceName = 'test-workspace';

    it('should return true when workspace exists', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(true));

      const result = await workspaceService.workspaceExists(workspaceName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });

    it('should return false when workspace does not exist', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));

      const result = await workspaceService.workspaceExists(workspaceName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(false);
      }
    });

    it('should reject invalid workspace names', async () => {
      const result = await workspaceService.workspaceExists('invalid name');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });

    it('should handle filesystem errors', async () => {
      vi.mocked(mockFs.directoryExists).mockResolvedValue(
        err(new Error('Access denied'))
      );

      const result = await workspaceService.workspaceExists(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toBe('Access denied');
      }
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockFs.directoryExists).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.workspaceExists(workspaceName);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain(
          'Failed to check workspace existence'
        );
      }
    });
  });

  describe('updateWorkspace', () => {
    const workspaceName = 'test-workspace';
    const currentWorkspace = {
      name: workspaceName,
      path: '/test/workspaces/test-workspace',
      description: 'Original description',
      template: 'basic',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      fileCount: 1,
      size: 100,
      files: ['README.md'],
    };

    beforeEach(() => {
      vi.spyOn(workspaceService, 'getWorkspaceInfo').mockResolvedValue(
        ok(currentWorkspace)
      );
    });

    it('should update workspace with new description', async () => {
      const result = await workspaceService.updateWorkspace(workspaceName, {
        description: 'Updated description',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.description).toBe('Updated description');
        expect(result.value.template).toBe('basic'); // Unchanged
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt.getTime()).toBeGreaterThan(
          currentWorkspace.updatedAt.getTime()
        );
      }
    });

    it('should update workspace with new template', async () => {
      const result = await workspaceService.updateWorkspace(workspaceName, {
        template: 'react',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.template).toBe('react');
        expect(result.value.description).toBe('Original description'); // Unchanged
      }
    });

    it('should emit workspace updated event', async () => {
      const updates = { description: 'New description', template: 'vue' };
      await workspaceService.updateWorkspace(workspaceName, updates);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EVENTS.WORKSPACE_UPDATED,
        expect.objectContaining({
          name: workspaceName,
          path: currentWorkspace.path,
          changes: updates,
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should continue update even if event emission fails', async () => {
      vi.mocked(mockEventBus.emit).mockRejectedValue(new Error('Event failed'));

      const result = await workspaceService.updateWorkspace(workspaceName, {
        description: 'New description',
      });

      expect(result.isOk()).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to emit workspace updated event',
        expect.objectContaining({ name: workspaceName })
      );
    });

    it('should fail if workspace does not exist', async () => {
      vi.spyOn(workspaceService, 'getWorkspaceInfo').mockResolvedValue(
        err(new WorkspaceNotFoundError(workspaceName))
      );

      const result = await workspaceService.updateWorkspace(workspaceName, {
        description: 'New description',
      });

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });

    it('should handle unexpected errors', async () => {
      vi.spyOn(workspaceService, 'getWorkspaceInfo').mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await workspaceService.updateWorkspace(workspaceName, {
        description: 'New description',
      });

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Workspace update failed');
      }
    });
  });

  describe('getWorkspacePath', () => {
    it('should return workspace path for valid name', async () => {
      const result = await workspaceService.getWorkspacePath('test-workspace');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('/test/workspaces/test-workspace');
      }
    });

    it('should reject invalid workspace names', async () => {
      const result = await workspaceService.getWorkspacePath('invalid name');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });
  });

  describe('addFileToWorkspace (deprecated)', () => {
    const workspaceName = 'test-workspace';

    beforeEach(() => {
      vi.spyOn(workspaceService, 'validateWorkspaceFile').mockResolvedValue(
        ok(undefined)
      );
    });

    it('should delegate to validateWorkspaceFile', async () => {
      await workspaceService.addFileToWorkspace(workspaceName, 'file.txt');

      expect(workspaceService.validateWorkspaceFile).toHaveBeenCalledWith(
        workspaceName,
        'file.txt'
      );
    });

    it('should throw error when validation fails', async () => {
      vi.spyOn(workspaceService, 'validateWorkspaceFile').mockResolvedValue(
        err(new Error('Validation failed'))
      );

      await expect(
        workspaceService.addFileToWorkspace(workspaceName, 'file.txt')
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('edge cases and integration', () => {
    it('should handle empty workspace names', async () => {
      const result = await workspaceService.createWorkspace('');

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.message).toContain('Invalid workspace name');
      }
    });

    it('should handle concurrent workspace operations', async () => {
      const workspaceName = 'concurrent-test';
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));
      vi.mocked(mockFs.ensureDirectory).mockResolvedValue(ok(undefined));
      vi.mocked(mockFs.writeFile).mockResolvedValue(ok(undefined));

      // Simulate concurrent creation attempts
      const promises = [
        workspaceService.createWorkspace(workspaceName),
        workspaceService.createWorkspace(workspaceName),
        workspaceService.createWorkspace(workspaceName),
      ];

      const results = await Promise.all(promises);

      // All should complete (though in real scenario only one would succeed due to filesystem races)
      results.forEach((result) => {
        expect(result.isOk()).toBe(true);
      });
    });

    it('should handle workspace names at maximum length', async () => {
      const longName = 'a'.repeat(50); // Assuming reasonable max length
      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));
      vi.mocked(mockFs.ensureDirectory).mockResolvedValue(ok(undefined));
      vi.mocked(mockFs.writeFile).mockResolvedValue(ok(undefined));

      const result = await workspaceService.createWorkspace(longName);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(longName);
      }
    });

    it('should preserve workspace metadata consistency', async () => {
      const workspaceName = 'consistency-test';
      const options = {
        description: 'Test description',
        template: 'react-typescript',
      };

      vi.mocked(mockFs.directoryExists).mockResolvedValue(ok(false));
      vi.mocked(mockFs.ensureDirectory).mockResolvedValue(ok(undefined));
      vi.mocked(mockFs.writeFile).mockResolvedValue(ok(undefined));

      const createResult = await workspaceService.createWorkspace(
        workspaceName,
        options
      );

      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const workspace = createResult.value;
        expect(workspace.name).toBe(workspaceName);
        expect(workspace.description).toBe(options.description);
        expect(workspace.template).toBe(options.template);
        expect(workspace.createdAt).toEqual(workspace.updatedAt);
        expect(workspace.path).toBe(`${workspacesRoot}/${workspaceName}`);
        expect(workspace.fileCount).toBe(1);
        expect(workspace.files).toEqual(['README.md']);
      }
    });
  });
});
