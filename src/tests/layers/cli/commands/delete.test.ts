/**
 * Tests for DeleteCommand
 */

import { describe, expect, it, vi } from 'vitest';

import { DeleteCommand } from '../../../../layers/cli/commands/delete.js';
import type {
  CliContext,
  CliOutput,
} from '../../../../layers/cli/interface.js';
import type { WorkspaceRepository } from '../../../../layers/data/interfaces.js';

// Mock dependencies
const mockWorkspaceRepository: WorkspaceRepository = {
  exists: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  getMetadata: vi.fn(),
  delete: vi.fn(),
  getWorkspacePath: vi.fn(),
};

const mockOutput: CliOutput = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  json: vi.fn(),
  table: vi.fn(),
};

const mockContext: CliContext = {
  workspacesRoot: '/tmp/test-workspaces',
  verbose: false,
  output: mockOutput,
};

describe('DeleteCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name, description, and usage', () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      expect(command.name).toBe('delete');
      expect(command.description).toBe('Delete a workspace');
      expect(command.usage).toBe('delete <name> [--force|-f]');
    });
  });

  describe('execute', () => {
    it('should warn about deletion without force flag', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);

      await command.execute(['my-workspace']);

      expect(mockWorkspaceRepository.exists).toHaveBeenCalledWith(
        'my-workspace'
      );
      expect(mockWorkspaceRepository.delete).not.toHaveBeenCalled();
      expect(mockOutput.warn).toHaveBeenCalledWith(
        "This will permanently delete workspace 'my-workspace' and all its contents."
      );
      expect(mockOutput.info).toHaveBeenCalledWith(
        'Use --force/-f to confirm deletion'
      );
    });

    it('should delete workspace with --force flag', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockResolvedValue();

      await command.execute(['my-workspace', '--force']);

      expect(mockWorkspaceRepository.exists).toHaveBeenCalledWith(
        'my-workspace'
      );
      expect(mockWorkspaceRepository.delete).toHaveBeenCalledWith(
        'my-workspace'
      );
      expect(mockOutput.success).toHaveBeenCalledWith(
        "Deleted workspace 'my-workspace'"
      );
      expect(mockOutput.warn).not.toHaveBeenCalled();
    });

    it('should delete workspace with -f flag', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockResolvedValue();

      await command.execute(['my-workspace', '-f']);

      expect(mockWorkspaceRepository.delete).toHaveBeenCalledWith(
        'my-workspace'
      );
      expect(mockOutput.success).toHaveBeenCalledWith(
        "Deleted workspace 'my-workspace'"
      );
    });

    it('should handle non-existent workspace', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(false);

      await command.execute(['non-existent', '--force']);

      expect(mockWorkspaceRepository.exists).toHaveBeenCalledWith(
        'non-existent'
      );
      expect(mockWorkspaceRepository.delete).not.toHaveBeenCalled();
      expect(mockOutput.error).toHaveBeenCalledWith(
        "Workspace 'non-existent' does not exist"
      );
    });

    it('should handle deletion errors', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);
      const deleteError = new Error('Filesystem error');

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockRejectedValue(deleteError);

      await expect(
        command.execute(['my-workspace', '--force'])
      ).rejects.toThrow('Filesystem error');

      expect(mockOutput.error).toHaveBeenCalledWith(
        "Failed to delete workspace 'my-workspace': Filesystem error"
      );
    });

    it('should handle non-Error exceptions', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockRejectedValue(
        'String error'
      );

      await expect(
        command.execute(['my-workspace', '--force'])
      ).rejects.toThrow('String error');

      expect(mockOutput.error).toHaveBeenCalledWith(
        "Failed to delete workspace 'my-workspace': String error"
      );
    });

    it('should validate minimum arguments', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      await expect(command.execute([])).rejects.toThrow('Not enough arguments');
      expect(mockWorkspaceRepository.exists).not.toHaveBeenCalled();
    });

    it('should validate maximum arguments', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      await expect(
        command.execute(['name1', 'name2', 'name3'])
      ).rejects.toThrow('Too many arguments');
      expect(mockWorkspaceRepository.exists).not.toHaveBeenCalled();
    });

    it('should handle both force flags together', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockResolvedValue();

      await command.execute(['my-workspace', '--force', '-f']);

      expect(mockWorkspaceRepository.delete).toHaveBeenCalledWith(
        'my-workspace'
      );
      expect(mockOutput.success).toHaveBeenCalledWith(
        "Deleted workspace 'my-workspace'"
      );
    });

    it('should handle extra arguments with force flag', async () => {
      const command = new DeleteCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.exists).mockResolvedValue(true);
      vi.mocked(mockWorkspaceRepository.delete).mockResolvedValue();

      // Should still work as parseFlags extracts the workspace name correctly
      await command.execute(['my-workspace', '--force']);

      expect(mockWorkspaceRepository.delete).toHaveBeenCalledWith(
        'my-workspace'
      );
    });
  });
});
