import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileSystemWorkspaceRepository } from '../../../../layers/data/repositories/workspace-repository.js';
import { MockFileSystemProvider } from './mock-filesystem-provider.js';

describe('FileSystemWorkspaceRepository', () => {
  let repository: FileSystemWorkspaceRepository;
  let fsProvider: MockFileSystemProvider;
  let tempDir: string;

  beforeEach(async () => {
    fsProvider = new MockFileSystemProvider();
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-workspaces-'));
    repository = new FileSystemWorkspaceRepository(fsProvider, tempDir);
  });

  afterEach(async () => {
    await fsProvider.cleanup();
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('exists', () => {
    it('should return true for existing workspace', async () => {
      const workspaceName = 'existing-workspace';
      const workspacePath = path.join(tempDir, workspaceName);
      await fs.ensureDir(workspacePath);

      const result = await repository.exists(workspaceName);

      expect(result).toBe(true);
    });

    it('should return false for non-existing workspace', async () => {
      const result = await repository.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create workspace with basic structure', async () => {
      const workspaceName = 'test-workspace';

      await repository.create(workspaceName);

      const workspacePath = path.join(tempDir, workspaceName);
      expect(await fs.pathExists(workspacePath)).toBe(true);
      expect(
        await fs.pathExists(path.join(workspacePath, '.workspace.json'))
      ).toBe(true);
      expect(await fs.pathExists(path.join(workspacePath, 'documents'))).toBe(
        true
      );
      expect(await fs.pathExists(path.join(workspacePath, 'templates'))).toBe(
        true
      );
    });

    it('should create workspace with description and README', async () => {
      const workspaceName = 'test-workspace';
      const description = 'Test workspace description';

      await repository.create(workspaceName, { description });

      const workspacePath = path.join(tempDir, workspaceName);
      const readmePath = path.join(workspacePath, 'README.md');

      expect(await fs.pathExists(readmePath)).toBe(true);
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      expect(readmeContent).toContain(workspaceName);
      expect(readmeContent).toContain(description);
    });

    it('should create workspace metadata with correct structure', async () => {
      const workspaceName = 'test-workspace';
      const description = 'Test description';
      const template = 'react-typescript';

      await repository.create(workspaceName, { description, template });

      const metadataPath = path.join(tempDir, workspaceName, '.workspace.json');
      const content = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(content);

      expect(metadata.name).toBe(workspaceName);
      expect(metadata.description).toBe(description);
      expect(metadata.template).toBe(template);
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.modifiedAt).toBeDefined();
      expect(new Date(metadata.createdAt)).toBeInstanceOf(Date);
      expect(new Date(metadata.modifiedAt)).toBeInstanceOf(Date);
    });

    it('should throw error when workspace already exists', async () => {
      const workspaceName = 'existing-workspace';
      await repository.create(workspaceName);

      await expect(repository.create(workspaceName)).rejects.toThrow(
        `Workspace '${workspaceName}' already exists`
      );
    });

    it('should throw error when filesystem operation fails', async () => {
      const mockFs = {
        exists: vi.fn().mockResolvedValue(false),
        createDirectory: vi.fn().mockRejectedValue(new Error('FS Error')),
        writeFile: vi.fn(),
        readDirectory: vi.fn(),
        getStats: vi.fn(),
        readFile: vi.fn(),
        deleteDirectory: vi.fn(),
      };

      const repo = new FileSystemWorkspaceRepository(mockFs as any, tempDir);

      await expect(repo.create('test')).rejects.toThrow(
        'Unable to create workspace: test'
      );
    });
  });

  describe('list', () => {
    it('should return empty array when workspaces root does not exist', async () => {
      const nonExistentRoot = path.join(tempDir, 'non-existent');
      const repo = new FileSystemWorkspaceRepository(fs, nonExistentRoot);

      const result = await repo.list();

      expect(result).toEqual([]);
    });

    it('should list workspaces with metadata', async () => {
      // Create multiple workspaces
      await repository.create('workspace-a', {
        description: 'First workspace',
      });
      await repository.create('workspace-b', {
        description: 'Second workspace',
      });

      const result = await repository.list();

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe('workspace-a'); // Sorted alphabetically
      expect(result[1]?.name).toBe('workspace-b');
      expect(result[0]?.description).toBe('First workspace');
      expect(result[1]?.description).toBe('Second workspace');
      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.modifiedAt).toBeInstanceOf(Date);
    });

    it('should include directories as workspaces (fallback behavior)', async () => {
      // Create a valid workspace
      await repository.create('valid-workspace');

      // Create a directory without workspace metadata (treated as legacy workspace)
      const legacyPath = path.join(tempDir, 'legacy-dir');
      await fs.ensureDir(legacyPath);

      const result = await repository.list();

      // Both should be included - one with metadata, one without
      expect(result).toHaveLength(2);
      const names = result.map((w) => w.name).sort();
      expect(names).toEqual(['legacy-dir', 'valid-workspace']);
    });

    it('should sort workspaces alphabetically', async () => {
      await repository.create('zebra-workspace');
      await repository.create('alpha-workspace');
      await repository.create('beta-workspace');

      const result = await repository.list();

      const names = result.map((w) => w.name);
      expect(names).toEqual([
        'alpha-workspace',
        'beta-workspace',
        'zebra-workspace',
      ]);
    });

    it('should handle filesystem errors', async () => {
      const mockFs = {
        exists: vi.fn().mockResolvedValue(true),
        readDirectory: vi.fn().mockRejectedValue(new Error('Read error')),
        createDirectory: vi.fn(),
        writeFile: vi.fn(),
        getStats: vi.fn(),
        readFile: vi.fn(),
        deleteDirectory: vi.fn(),
      };

      const repo = new FileSystemWorkspaceRepository(mockFs as any, tempDir);

      await expect(repo.list()).rejects.toThrow('Unable to list workspaces');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for workspace with .workspace.json', async () => {
      const workspaceName = 'test-workspace';
      const description = 'Test description';
      await repository.create(workspaceName, { description });

      const metadata = await repository.getMetadata(workspaceName);

      expect(metadata.name).toBe(workspaceName);
      expect(metadata.description).toBe(description);
      expect(metadata.path).toBe(path.join(tempDir, workspaceName));
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.modifiedAt).toBeInstanceOf(Date);
      expect(metadata.hasInstructions).toBe(false);
    });

    it('should return metadata for workspace with INSTRUCTIONS.md', async () => {
      const workspaceName = 'test-workspace';
      await repository.create(workspaceName);

      // Create INSTRUCTIONS.md
      const instructionsPath = path.join(
        tempDir,
        workspaceName,
        'INSTRUCTIONS.md'
      );
      await fs.writeFile(
        instructionsPath,
        '# Instructions\n\nTest instructions'
      );

      const metadata = await repository.getMetadata(workspaceName);

      expect(metadata.hasInstructions).toBe(true);
    });

    it('should return fallback metadata for workspace without .workspace.json', async () => {
      const workspaceName = 'legacy-workspace';
      const workspacePath = path.join(tempDir, workspaceName);

      // Create workspace directory without metadata file
      await fs.ensureDir(workspacePath);

      const metadata = await repository.getMetadata(workspaceName);

      expect(metadata.name).toBe(workspaceName);
      expect(metadata.path).toBe(workspacePath);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.modifiedAt).toBeInstanceOf(Date);
      expect(metadata.hasInstructions).toBe(false);
      expect(metadata.description).toBeUndefined();
    });

    it('should throw error for non-existent workspace', async () => {
      await expect(repository.getMetadata('non-existent')).rejects.toThrow(
        `Workspace 'non-existent' does not exist`
      );
    });

    it('should handle JSON parsing errors', async () => {
      const workspaceName = 'corrupted-workspace';
      const workspacePath = path.join(tempDir, workspaceName);

      // Create workspace with corrupted metadata
      await fs.ensureDir(workspacePath);
      const metadataPath = path.join(workspacePath, '.workspace.json');
      await fs.writeFile(metadataPath, 'invalid json');

      await expect(repository.getMetadata(workspaceName)).rejects.toThrow(
        `Unable to get workspace metadata: ${workspaceName}`
      );
    });
  });

  describe('delete', () => {
    it('should delete existing workspace', async () => {
      const workspaceName = 'workspace-to-delete';
      await repository.create(workspaceName);

      expect(await repository.exists(workspaceName)).toBe(true);

      await repository.delete(workspaceName);

      expect(await repository.exists(workspaceName)).toBe(false);
    });

    it('should throw error when deleting non-existent workspace', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(
        `Workspace 'non-existent' does not exist`
      );
    });

    it('should handle filesystem deletion errors', async () => {
      const workspaceName = 'test-workspace';
      await repository.create(workspaceName);

      const mockFs = {
        exists: vi.fn().mockResolvedValue(true),
        deleteDirectory: vi.fn().mockRejectedValue(new Error('Delete failed')),
        createDirectory: vi.fn(),
        writeFile: vi.fn(),
        readDirectory: vi.fn(),
        getStats: vi.fn(),
        readFile: vi.fn(),
      };

      const repo = new FileSystemWorkspaceRepository(mockFs as any, tempDir);

      await expect(repo.delete(workspaceName)).rejects.toThrow(
        `Unable to delete workspace: ${workspaceName}`
      );
    });
  });

  describe('getWorkspacePath', () => {
    it('should return correct workspace path', () => {
      const workspaceName = 'test-workspace';

      const result = repository.getWorkspacePath(workspaceName);

      expect(result).toBe(path.join(tempDir, workspaceName));
    });

    it('should handle workspace names with special characters', () => {
      const workspaceName = 'my-special_workspace.2024';

      const result = repository.getWorkspacePath(workspaceName);

      expect(result).toBe(path.join(tempDir, workspaceName));
    });
  });
});
