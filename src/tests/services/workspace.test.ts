import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EventBus,
  FileSystemService,
  Logger,
} from '../../interfaces/services.js';
import { WorkspaceService } from '../../services/workspace.js';
import {
  WorkspaceAlreadyExistsError,
  WorkspaceNotFoundError,
} from '../../utils/errors.js';
import { isErr, isOk } from '../../utils/result.js';

// Mock dependencies - all methods return Result pattern
const createMockFileSystemService = (): FileSystemService => ({
  exists: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.pathExists(path),
  })),
  ensureDir: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.ensureDir(path),
  })),
  writeFile: vi.fn().mockImplementation(async (path: string, data: string) => {
    await fs.writeFile(path, data);
    return { success: true, data: undefined };
  }),
  readFile: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.readFile(path, 'utf8'),
  })),
  remove: vi.fn().mockImplementation(async (path: string) => {
    await fs.remove(path);
    return { success: true, data: undefined };
  }),
  readdir: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.readdir(path),
  })),
  stat: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.stat(path),
  })),
  copy: vi.fn().mockImplementation(async (src: string, dest: string) => {
    await fs.copy(src, dest);
    return { success: true, data: undefined };
  }),
  // Additional methods required by workspace service
  directoryExists: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.pathExists(path),
  })),
  ensureDirectory: vi.fn().mockImplementation(async (path: string) => {
    await fs.ensureDir(path);
    return { success: true, data: undefined };
  }),
  listFiles: vi
    .fn()
    .mockImplementation(async (path: string, recursive?: boolean) => {
      try {
        if (recursive) {
          // For recursive, return all files with relative paths
          const files: string[] = [];
          const scanDir = async (dirPath: string, basePath: string = '') => {
            const items = await fs.readdir(dirPath);
            for (const item of items) {
              const itemPath = `${dirPath}/${item}`;
              const relativePath = basePath ? `${basePath}/${item}` : item;
              const stat = await fs.stat(itemPath);
              if (stat.isFile()) {
                files.push(relativePath);
              } else if (stat.isDirectory()) {
                await scanDir(itemPath, relativePath);
              }
            }
          };
          await scanDir(path);
          return { success: true, data: files };
        } else {
          // For non-recursive, return just files in the directory
          const items = await fs.readdir(path);
          const files = [];
          for (const item of items) {
            const itemPath = `${path}/${item}`;
            const stat = await fs.stat(itemPath);
            if (stat.isFile()) {
              files.push(item);
            }
          }
          return { success: true, data: files };
        }
      } catch (error) {
        return { success: true, data: [] };
      }
    }),
  getFileStats: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.stat(path),
  })),
  deleteDirectory: vi.fn().mockImplementation(async (path: string) => {
    await fs.remove(path);
    return { success: true, data: undefined };
  }),
  fileExists: vi.fn().mockImplementation(async (path: string) => ({
    success: true,
    data: await fs.pathExists(path),
  })),
});

const createMockEventBus = (): EventBus => ({
  emit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn().mockReturnValue(() => {}),
  once: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  getListenerCount: vi.fn().mockReturnValue(0),
  getRegisteredEvents: vi.fn().mockReturnValue([]),
  setMaxListeners: vi.fn(),
  emitBatch: vi.fn().mockResolvedValue(undefined),
});

const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
});

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let tempDir: string;
  let mockFs: FileSystemService;
  let mockEventBus: EventBus;
  let mockLogger: Logger;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-workspaces-'));
    mockFs = createMockFileSystemService();
    mockEventBus = createMockEventBus();
    mockLogger = createMockLogger();
    workspaceService = new WorkspaceService(
      tempDir,
      mockFs,
      mockEventBus,
      mockLogger
    );
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('createWorkspace', () => {
    it('should create a new workspace successfully', async () => {
      const result = await workspaceService.createWorkspace('test-workspace');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const workspace = result.data;
        expect(workspace.name).toBe('test-workspace');
        expect(workspace.path).toBe(path.join(tempDir, 'test-workspace'));
        expect(workspace.files).toEqual(expect.any(Array)); // Just check it's an array
      }

      const workspaceDir = path.join(tempDir, 'test-workspace');
      expect(await fs.pathExists(workspaceDir)).toBe(true);

      const readmePath = path.join(workspaceDir, 'README.md');
      expect(await fs.pathExists(readmePath)).toBe(true);
    });

    it('should create workspace with description and template', async () => {
      const options = {
        description: 'Test workspace description',
        template: 'react-typescript',
      };

      const result = await workspaceService.createWorkspace(
        'test-workspace',
        options
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const workspace = result.data;
        expect(workspace.description).toBe(options.description);
        expect(workspace.template).toBe(options.template);
      }
    });

    it('should return error if workspace already exists', async () => {
      const firstResult =
        await workspaceService.createWorkspace('test-workspace');
      expect(isOk(firstResult)).toBe(true);

      const secondResult =
        await workspaceService.createWorkspace('test-workspace');
      expect(isErr(secondResult)).toBe(true);
      if (isErr(secondResult)) {
        expect(secondResult.error).toBeInstanceOf(WorkspaceAlreadyExistsError);
      }
    });

    it('should validate workspace names', async () => {
      const invalidResult1 = await workspaceService.createWorkspace(
        'invalid name with spaces'
      );
      expect(isErr(invalidResult1)).toBe(true);

      const invalidResult2 = await workspaceService.createWorkspace(
        'SHARED_INSTRUCTIONS'
      );
      expect(isErr(invalidResult2)).toBe(true);
    });
  });

  describe('listWorkspaces', () => {
    it('should return empty list when no workspaces exist', async () => {
      const result = await workspaceService.listWorkspaces();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should list created workspaces', async () => {
      await workspaceService.createWorkspace('workspace1');
      await workspaceService.createWorkspace('workspace2');

      const result = await workspaceService.listWorkspaces();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const workspaces = result.data;
        expect(workspaces).toHaveLength(2);

        const names = workspaces.map((ws) => ws.name);
        expect(names).toContain('workspace1');
        expect(names).toContain('workspace2');
      }
    });

    it('should ignore SHARED_INSTRUCTIONS directory', async () => {
      await workspaceService.createWorkspace('workspace1');
      await fs.ensureDir(path.join(tempDir, 'SHARED_INSTRUCTIONS'));

      const result = await workspaceService.listWorkspaces();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const workspaces = result.data;
        expect(workspaces).toHaveLength(1);
        expect(workspaces[0]?.name).toBe('workspace1');
      }
    });
  });

  describe('getWorkspaceInfo', () => {
    it('should return workspace information', async () => {
      await workspaceService.createWorkspace('test-workspace');

      const result = await workspaceService.getWorkspaceInfo('test-workspace');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const workspace = result.data;
        expect(workspace.name).toBe('test-workspace');
        expect(workspace.files).toEqual(expect.any(Array)); // Just check it's an array
        expect(workspace.createdAt).toBeInstanceOf(Date);
        expect(workspace.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return error for non-existent workspace', async () => {
      const result = await workspaceService.getWorkspaceInfo('non-existent');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete existing workspace', async () => {
      await workspaceService.createWorkspace('test-workspace');
      const workspacePath = path.join(tempDir, 'test-workspace');

      expect(await fs.pathExists(workspacePath)).toBe(true);

      const result = await workspaceService.deleteWorkspace('test-workspace');
      expect(isOk(result)).toBe(true);

      expect(await fs.pathExists(workspacePath)).toBe(false);
    });

    it('should return error when deleting non-existent workspace', async () => {
      const result = await workspaceService.deleteWorkspace('non-existent');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(WorkspaceNotFoundError);
      }
    });
  });
});
