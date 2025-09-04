import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import type {
  EventBus,
  Logger,
  ToolContext,
  WorkspaceService,
} from '../../../interfaces/services.js';
import { GetWorkspaceInfoTool } from '../../../tools/handlers/get-workspace-info-tool.js';

// Mock workspace service
const createMockWorkspaceService = (): WorkspaceService => ({
  createWorkspace: vi.fn().mockResolvedValue(ok({})),
  listWorkspaces: vi.fn().mockResolvedValue(ok([])),
  workspaceExists: vi.fn().mockResolvedValue(ok(false)),
  getWorkspaceInfo: vi.fn().mockResolvedValue(
    ok({
      name: 'test-workspace',
      path: '/test/workspaces/test-workspace',
      description: 'A test workspace',
      template: 'basic',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-02T15:30:00Z'),
      fileCount: 5,
      size: 1024,
    })
  ),
  deleteWorkspace: vi.fn().mockResolvedValue(ok(undefined)),
});

// Mock tool context
const createMockContext = (): ToolContext => ({
  workspaceRepository: createMockWorkspaceService(),
  instructionsRepository: {} as any,
  config: {
    workspaces: {
      rootPath: '/test/workspaces',
      maxWorkspaces: 100,
      allowedTemplates: ['basic', 'react', 'python'],
    },
  } as any,
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  } as Logger,
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
  } as EventBus,
});

describe('GetWorkspaceInfoTool', () => {
  let tool: GetWorkspaceInfoTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new GetWorkspaceInfoTool();
    mockContext = createMockContext();
  });

  describe('Tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('get_workspace_info');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe(
        'Get detailed information about a specific workspace'
      );
    });

    it('should have valid input schema', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test-workspace',
        includeFiles: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should accept valid workspace names', () => {
      const validNames = [
        'my-workspace',
        'workspace_123',
        'MyWorkspace',
        'project-2024',
        'test_workspace_final',
      ];

      for (const name of validNames) {
        const result = tool.inputSchema.safeParse({ name });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid workspace names', () => {
      const invalidNames = [
        '',
        'workspace with spaces',
        'workspace@special',
        'workspace.dot',
        'workspace/slash',
        'workspace#hash',
      ];

      for (const name of invalidNames) {
        const result = tool.inputSchema.safeParse({ name });
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid includeFiles values', () => {
      const result1 = tool.inputSchema.safeParse({
        name: 'test',
        includeFiles: true,
      });
      expect(result1.success).toBe(true);

      const result2 = tool.inputSchema.safeParse({
        name: 'test',
        includeFiles: false,
      });
      expect(result2.success).toBe(true);
    });

    it('should use default includeFiles value when not provided', () => {
      const result = tool.inputSchema.safeParse({ name: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeFiles).toBe(false);
      }
    });

    it('should reject non-boolean includeFiles', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test',
        includeFiles: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should require name parameter', () => {
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Successful execution', () => {
    it('should return workspace information without files by default', async () => {
      const mockWorkspace = {
        name: 'my-project',
        path: '/test/workspaces/my-project',
        description: 'My awesome project',
        template: 'react-typescript',
        createdAt: new Date('2024-01-15T09:30:00Z'),
        updatedAt: new Date('2024-01-20T14:45:00Z'),
        fileCount: 12,
        size: 2048,
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute({ name: 'my-project' }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining('Workspace Information: my-project') &&
                expect.stringContaining('Description: My awesome project') &&
                expect.stringContaining('Path: /test/workspaces/my-project') &&
                expect.stringContaining('Template: react-typescript') &&
                expect.stringContaining('Created: ') &&
                expect.stringContaining('Last Modified: '),
            },
          ],
        })
      );
    });

    it('should handle workspaces without descriptions', async () => {
      const mockWorkspace = {
        name: 'no-desc-workspace',
        path: '/test/workspaces/no-desc-workspace',
        description: undefined,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'no-desc-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Description: No description provided'
        );
      }
    });

    it('should handle workspaces with empty descriptions', async () => {
      const mockWorkspace = {
        name: 'empty-desc-workspace',
        path: '/test/workspaces/empty-desc-workspace',
        description: '',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'empty-desc-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Description: No description provided'
        );
      }
    });

    it('should handle workspaces without templates', async () => {
      const mockWorkspace = {
        name: 'no-template-workspace',
        path: '/test/workspaces/no-template-workspace',
        description: 'A workspace without template',
        template: undefined,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'no-template-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('no-template-workspace');
        expect(result.value.content[0].text).toContain(
          'A workspace without template'
        );
        // Template line should not be present
        expect(result.value.content[0].text).not.toMatch(/Template: .+/);
      }
    });

    it('should include file listing message when includeFiles is true', async () => {
      const mockWorkspace = {
        name: 'file-test-workspace',
        path: '/test/workspaces/file-test-workspace',
        description: 'Testing file inclusion',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'file-test-workspace', includeFiles: true },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Files: File listing not available in this context'
        );
      }
    });

    it('should not include file listing when includeFiles is false', async () => {
      const mockWorkspace = {
        name: 'no-files-workspace',
        path: '/test/workspaces/no-files-workspace',
        description: 'No file listing',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'no-files-workspace', includeFiles: false },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).not.toContain('Files:');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle workspace repository errors', async () => {
      const repositoryError = new Error('Workspace not found');
      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(err(repositoryError));

      const result = await tool.execute({ name: 'nonexistent' }, mockContext);

      expect(result).toEqual(err(repositoryError));
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockRejectedValue(new Error('File system error'));

      const result = await tool.execute(
        { name: 'test-workspace' },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to get workspace info: File system error'))
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockRejectedValue('String error');

      const result = await tool.execute(
        { name: 'test-workspace' },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to get workspace info: String error'))
      );
    });

    it('should handle null/undefined thrown values', async () => {
      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockRejectedValue(null);

      const result = await tool.execute(
        { name: 'test-workspace' },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to get workspace info: null'))
      );
    });
  });

  describe('Date formatting', () => {
    it('should handle valid dates correctly', async () => {
      const mockWorkspace = {
        name: 'date-test-workspace',
        path: '/test/workspaces/date-test-workspace',
        description: 'Testing date formatting',
        createdAt: new Date('2024-01-15T10:30:45Z'),
        updatedAt: new Date('2024-01-20T16:45:30Z'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'date-test-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('Created: ');
        expect(result.value.content[0].text).toContain('Last Modified: ');
      }
    });

    it('should handle invalid dates gracefully', async () => {
      const mockWorkspace = {
        name: 'invalid-date-workspace',
        path: '/test/workspaces/invalid-date-workspace',
        description: 'Testing invalid date handling',
        createdAt: new Date('invalid-date'),
        updatedAt: new Date('also-invalid'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'invalid-date-workspace' },
        mockContext
      );

      // Should not throw error, even with invalid dates
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'invalid-date-workspace'
        );
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle very long workspace names', async () => {
      const longName = 'a'.repeat(100); // Test with long name
      const mockWorkspace = {
        name: longName,
        path: `/test/workspaces/${longName}`,
        description: 'Very long workspace name',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute({ name: longName }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(longName);
      }
    });

    it('should handle workspaces with special characters in paths', async () => {
      const mockWorkspace = {
        name: 'special-chars-workspace',
        path: '/test/work spaces/special & weird/chars-workspace',
        description: 'Has special characters in path',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'special-chars-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          '/test/work spaces/special & weird/chars-workspace'
        );
      }
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const mockWorkspace = {
        name: 'long-desc-workspace',
        path: '/test/workspaces/long-desc-workspace',
        description: longDescription,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      ).mockResolvedValue(ok(mockWorkspace));

      const result = await tool.execute(
        { name: 'long-desc-workspace' },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(longDescription);
      }
    });

    it('should handle all supported workspace name patterns', async () => {
      const testCases = [
        'simple',
        'with-dashes',
        'with_underscores',
        'MixedCase',
        'numbers123',
        'a1-b2_c3',
      ];

      for (const name of testCases) {
        const mockWorkspace = {
          name,
          path: `/test/workspaces/${name}`,
          description: `Test workspace: ${name}`,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        };

        vi.mocked(
          mockContext.workspaceRepository.getWorkspaceInfo
        ).mockResolvedValue(ok(mockWorkspace));

        const result = await tool.execute({ name }, mockContext);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.content[0].text).toContain(name);
        }
      }
    });
  });

  describe('Repository interaction', () => {
    it('should call getWorkspaceInfo with correct parameters', async () => {
      const mockWorkspace = {
        name: 'param-test-workspace',
        path: '/test/workspaces/param-test-workspace',
        description: 'Testing parameter passing',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const getWorkspaceInfoSpy = vi.mocked(
        mockContext.workspaceRepository.getWorkspaceInfo
      );
      getWorkspaceInfoSpy.mockResolvedValue(ok(mockWorkspace));

      await tool.execute({ name: 'param-test-workspace' }, mockContext);

      expect(getWorkspaceInfoSpy).toHaveBeenCalledWith('param-test-workspace');
      expect(getWorkspaceInfoSpy).toHaveBeenCalledTimes(1);
    });
  });
});
