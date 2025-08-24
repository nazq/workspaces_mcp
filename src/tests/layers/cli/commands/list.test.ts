/**
 * Tests for ListCommand
 */

import { describe, expect, it, vi } from 'vitest';

import { ListCommand } from '../../../../layers/cli/commands/list.js';
import type {
  CliContext,
  CliOutput,
} from '../../../../layers/cli/interface.js';
import type {
  WorkspaceMetadata,
  WorkspaceRepository,
} from '../../../../layers/data/interfaces.js';

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

const sampleWorkspaces: WorkspaceMetadata[] = [
  {
    name: 'workspace-a',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    description: 'First workspace',
    hasInstructions: true,
  },
  {
    name: 'workspace-b',
    createdAt: new Date('2023-01-02T00:00:00.000Z'),
    description: undefined,
    hasInstructions: false,
  },
  {
    name: 'workspace-c',
    createdAt: new Date('2023-01-03T00:00:00.000Z'),
    description: 'Third workspace',
    hasInstructions: true,
  },
];

describe('ListCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct name, description, and usage', () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      expect(command.name).toBe('list');
      expect(command.description).toBe('List all workspaces');
      expect(command.usage).toBe('list [--verbose|-v]');
    });
  });

  describe('execute', () => {
    it('should list workspaces in simple format by default', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        sampleWorkspaces
      );

      await command.execute([]);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledTimes(3);
      expect(mockOutput.success).toHaveBeenCalledWith('workspace-a');
      expect(mockOutput.success).toHaveBeenCalledWith('workspace-b');
      expect(mockOutput.success).toHaveBeenCalledWith('workspace-c');
      expect(mockOutput.info).toHaveBeenCalledWith('Found 3 workspace(s)');
      expect(mockOutput.table).not.toHaveBeenCalled();
    });

    it('should list workspaces in verbose format with --verbose flag', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        sampleWorkspaces
      );

      await command.execute(['--verbose']);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.success).not.toHaveBeenCalled();
      expect(mockOutput.table).toHaveBeenCalledWith([
        {
          name: 'workspace-a',
          created: '2023-01-01T00:00:00.000Z',
          'has-instructions': 'yes',
          description: 'First workspace',
        },
        {
          name: 'workspace-b',
          created: '2023-01-02T00:00:00.000Z',
          'has-instructions': 'no',
          description: 'No description',
        },
        {
          name: 'workspace-c',
          created: '2023-01-03T00:00:00.000Z',
          'has-instructions': 'yes',
          description: 'Third workspace',
        },
      ]);
      expect(mockOutput.info).toHaveBeenCalledWith('Found 3 workspace(s)');
    });

    it('should list workspaces in verbose format with -v flag', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        sampleWorkspaces
      );

      await command.execute(['-v']);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.table).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('Found 3 workspace(s)');
    });

    it('should handle empty workspace list', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);

      await command.execute([]);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('No workspaces found');
      expect(mockOutput.success).not.toHaveBeenCalled();
      expect(mockOutput.table).not.toHaveBeenCalled();
    });

    it('should handle empty workspace list in verbose mode', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);

      await command.execute(['--verbose']);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('No workspaces found');
      expect(mockOutput.table).not.toHaveBeenCalled();
    });

    it('should handle single workspace', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);
      const singleWorkspace = [sampleWorkspaces[0]];

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        singleWorkspace
      );

      await command.execute([]);

      expect(mockOutput.success).toHaveBeenCalledTimes(1);
      expect(mockOutput.success).toHaveBeenCalledWith('workspace-a');
      expect(mockOutput.info).toHaveBeenCalledWith('Found 1 workspace(s)');
    });

    it('should handle workspaces without description in verbose mode', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);
      const workspaceWithoutDesc = [
        {
          name: 'no-desc-workspace',
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          description: undefined,
          hasInstructions: false,
        },
      ];

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        workspaceWithoutDesc
      );

      await command.execute(['--verbose']);

      expect(mockOutput.table).toHaveBeenCalledWith([
        {
          name: 'no-desc-workspace',
          created: '2023-01-01T00:00:00.000Z',
          'has-instructions': 'no',
          description: 'No description',
        },
      ]);
    });

    it('should handle list errors', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);
      const listError = new Error('Repository error');

      vi.mocked(mockWorkspaceRepository.list).mockRejectedValue(listError);

      await expect(command.execute([])).rejects.toThrow('Repository error');

      expect(mockOutput.error).toHaveBeenCalledWith(
        'Failed to list workspaces: Repository error'
      );
    });

    it('should handle non-Error exceptions', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockRejectedValue('String error');

      await expect(command.execute([])).rejects.toThrow('String error');

      expect(mockOutput.error).toHaveBeenCalledWith(
        'Failed to list workspaces: String error'
      );
    });

    it('should handle extra arguments gracefully', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        sampleWorkspaces
      );

      await command.execute(['extra', 'args', '--verbose']);

      expect(mockWorkspaceRepository.list).toHaveBeenCalled();
      expect(mockOutput.table).toHaveBeenCalled();
    });

    it('should handle mixed flags', async () => {
      const command = new ListCommand(mockContext, mockWorkspaceRepository);

      vi.mocked(mockWorkspaceRepository.list).mockResolvedValue(
        sampleWorkspaces
      );

      // Both flags should activate verbose mode
      await command.execute(['--verbose', '-v']);

      expect(mockOutput.table).toHaveBeenCalled();
    });
  });
});
