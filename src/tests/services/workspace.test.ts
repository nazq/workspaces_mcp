import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WorkspaceService } from '../../services/workspace.js';
import {
  WorkspaceAlreadyExistsError,
  WorkspaceNotFoundError,
} from '../../utils/errors.js';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-workspaces-'));
    workspaceService = new WorkspaceService(tempDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('createWorkspace', () => {
    it('should create a new workspace successfully', async () => {
      const workspace =
        await workspaceService.createWorkspace('test-workspace');

      expect(workspace.name).toBe('test-workspace');
      expect(workspace.path).toBe(path.join(tempDir, 'test-workspace'));
      expect(workspace.files).toContain('README.md');

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

      const workspace = await workspaceService.createWorkspace(
        'test-workspace',
        options
      );

      expect(workspace.description).toBe(options.description);
      expect(workspace.template).toBe(options.template);
    });

    it('should throw error if workspace already exists', async () => {
      await workspaceService.createWorkspace('test-workspace');

      await expect(
        workspaceService.createWorkspace('test-workspace')
      ).rejects.toThrow(WorkspaceAlreadyExistsError);
    });

    it('should validate workspace names', async () => {
      await expect(
        workspaceService.createWorkspace('invalid name with spaces')
      ).rejects.toThrow();

      await expect(
        workspaceService.createWorkspace('SHARED_INSTRUCTIONS')
      ).rejects.toThrow();
    });
  });

  describe('listWorkspaces', () => {
    it('should return empty list when no workspaces exist', async () => {
      const workspaces = await workspaceService.listWorkspaces();
      expect(workspaces).toHaveLength(0);
    });

    it('should list created workspaces', async () => {
      await workspaceService.createWorkspace('workspace1');
      await workspaceService.createWorkspace('workspace2');

      const workspaces = await workspaceService.listWorkspaces();
      expect(workspaces).toHaveLength(2);

      const names = workspaces.map((ws) => ws.name);
      expect(names).toContain('workspace1');
      expect(names).toContain('workspace2');
    });

    it('should ignore SHARED_INSTRUCTIONS directory', async () => {
      await workspaceService.createWorkspace('workspace1');
      await fs.ensureDir(path.join(tempDir, 'SHARED_INSTRUCTIONS'));

      const workspaces = await workspaceService.listWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0]?.name).toBe('workspace1');
    });
  });

  describe('getWorkspaceInfo', () => {
    it('should return workspace information', async () => {
      await workspaceService.createWorkspace('test-workspace');

      const workspace =
        await workspaceService.getWorkspaceInfo('test-workspace');

      expect(workspace.name).toBe('test-workspace');
      expect(workspace.files).toContain('README.md');
      expect(workspace.createdAt).toBeInstanceOf(Date);
      expect(workspace.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent workspace', async () => {
      await expect(
        workspaceService.getWorkspaceInfo('non-existent')
      ).rejects.toThrow(WorkspaceNotFoundError);
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete existing workspace', async () => {
      await workspaceService.createWorkspace('test-workspace');
      const workspacePath = path.join(tempDir, 'test-workspace');

      expect(await fs.pathExists(workspacePath)).toBe(true);

      await workspaceService.deleteWorkspace('test-workspace');

      expect(await fs.pathExists(workspacePath)).toBe(false);
    });

    it('should throw error when deleting non-existent workspace', async () => {
      await expect(
        workspaceService.deleteWorkspace('non-existent')
      ).rejects.toThrow(WorkspaceNotFoundError);
    });
  });
});
