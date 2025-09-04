import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import type {
  EventBus,
  Logger,
  ToolContext,
  WorkspaceService,
} from '../../../interfaces/services.js';
import { ListWorkspacesTool } from '../../../tools/handlers/list-workspaces-tool.js';

// Mock workspace service
const createMockWorkspaceService = (): WorkspaceService => ({
  createWorkspace: vi.fn().mockResolvedValue(
    ok({
      name: 'test-workspace',
      path: '/test/path',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  listWorkspaces: vi.fn().mockResolvedValue(ok([])),
  workspaceExists: vi.fn().mockResolvedValue(ok(false)),
  getWorkspaceInfo: vi.fn().mockResolvedValue(
    ok({
      name: 'test-workspace',
      path: '/test/path',
      createdAt: new Date(),
      updatedAt: new Date(),
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

describe('ListWorkspacesTool', () => {
  let tool: ListWorkspacesTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new ListWorkspacesTool();
    mockContext = createMockContext();
  });

  describe('Tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('list_workspaces');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe(
        'List all available workspaces with their metadata'
      );
    });

    it('should have valid input schema', () => {
      const result = tool.inputSchema.safeParse({
        includeMetadata: true,
        sortBy: 'name',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should accept valid input with all parameters', () => {
      const result = tool.inputSchema.safeParse({
        includeMetadata: true,
        sortBy: 'name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept input with only includeMetadata', () => {
      const result = tool.inputSchema.safeParse({
        includeMetadata: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('name'); // default value
      }
    });

    it('should accept input with only sortBy', () => {
      const result = tool.inputSchema.safeParse({
        sortBy: 'created',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeMetadata).toBe(true); // default value
      }
    });

    it('should accept empty input (use defaults)', () => {
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeMetadata).toBe(true);
        expect(result.data.sortBy).toBe('name');
      }
    });

    it('should reject invalid sortBy values', () => {
      const result = tool.inputSchema.safeParse({
        sortBy: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeMetadata', () => {
      const result = tool.inputSchema.safeParse({
        includeMetadata: 'true',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Successful execution', () => {
    it('should list empty workspaces with appropriate message', async () => {
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok([]));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: 'No workspaces found. Create your first workspace using the create_workspace tool.',
            },
          ],
        })
      );
    });

    it('should list workspaces with metadata by default', async () => {
      const mockWorkspaces = [
        {
          name: 'project-a',
          path: '/test/project-a',
          description: 'A test project',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'project-b',
          path: '/test/project-b',
          description: '',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];

      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));

      const result = await tool.execute({}, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('Found 2 workspace(s):');
        expect(result.value.content[0].text).toContain('project-a');
        expect(result.value.content[0].text).toContain('project-b');
      }
    });

    it('should list workspaces without metadata when requested', async () => {
      const mockWorkspaces = [
        {
          name: 'project-a',
          path: '/test/project-a',
          description: 'A test project',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'project-b',
          path: '/test/project-b',
          description: 'Another project',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];

      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));

      const result = await tool.execute(
        { includeMetadata: false },
        mockContext
      );

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: 'Found 2 workspace(s):\n• project-a\n• project-b',
            },
          ],
        })
      );
    });
  });

  describe('Sorting functionality', () => {
    const mockWorkspaces = [
      {
        name: 'zebra-project',
        path: '/test/zebra',
        description: 'Last alphabetically',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
      },
      {
        name: 'alpha-project',
        path: '/test/alpha',
        description: 'First alphabetically',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        name: 'beta-project',
        path: '/test/beta',
        description: 'Middle alphabetically',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-04'),
      },
    ];

    beforeEach(() => {
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));
    });

    it('should sort by name by default', async () => {
      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /alpha-project.*beta-project.*zebra-project/s
              ),
            },
          ],
        })
      );
    });

    it('should sort by name when explicitly requested', async () => {
      const result = await tool.execute({ sortBy: 'name' }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /alpha-project.*beta-project.*zebra-project/s
              ),
            },
          ],
        })
      );
    });

    it('should sort by creation date', async () => {
      const result = await tool.execute({ sortBy: 'created' }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /zebra-project.*beta-project.*alpha-project/s
              ),
            },
          ],
        })
      );
    });

    it('should sort by modification date', async () => {
      const result = await tool.execute({ sortBy: 'modified' }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /alpha-project.*beta-project.*zebra-project/s
              ),
            },
          ],
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle workspace repository errors', async () => {
      const repositoryError = new Error('Database connection failed');
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(err(repositoryError));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(err(repositoryError));
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockRejectedValue(new Error('Unexpected network error'));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        err(new Error('Failed to list workspaces: Unexpected network error'))
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockRejectedValue('String error');

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        err(new Error('Failed to list workspaces: String error'))
      );
    });

    it('should handle null/undefined thrown values', async () => {
      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockRejectedValue(null);

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(err(new Error('Failed to list workspaces: null')));
    });
  });

  describe('Edge cases', () => {
    it('should handle workspaces without descriptions', async () => {
      const mockWorkspaces = [
        {
          name: 'no-desc-project',
          path: '/test/no-desc',
          description: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'empty-desc-project',
          path: '/test/empty-desc',
          description: '',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));

      const result = await tool.execute({}, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('Found 2 workspace(s):');
        expect(result.value.content[0].text).toContain('empty-desc-project');
        expect(result.value.content[0].text).toContain('no-desc-project');
      }
    });

    it('should handle invalid date objects gracefully', async () => {
      const mockWorkspaces = [
        {
          name: 'invalid-date-project',
          path: '/test/invalid-date',
          description: 'Has invalid dates',
          createdAt: new Date('invalid-date'),
          updatedAt: new Date('also-invalid'),
        },
      ];

      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));

      const result = await tool.execute({}, mockContext);

      // Should not throw error, even with invalid dates
      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('invalid-date-project'),
            },
          ],
        })
      );
    });

    it('should handle large number of workspaces', async () => {
      const mockWorkspaces = Array.from({ length: 100 }, (_, i) => ({
        name: `project-${i.toString().padStart(3, '0')}`,
        path: `/test/project-${i}`,
        description: `Description for project ${i}`,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      }));

      vi.mocked(
        mockContext.workspaceRepository.listWorkspaces
      ).mockResolvedValue(ok(mockWorkspaces));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Found 100 workspace(s):'),
            },
          ],
        })
      );
    });
  });
});
