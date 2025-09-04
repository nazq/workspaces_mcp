import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import type {
  EventBus,
  InstructionsService,
  Logger,
  ToolContext,
} from '../../../interfaces/services.js';
import { ListSharedInstructionsTool } from '../../../tools/handlers/list-shared-instructions-tool.js';

// Mock instructions service
const createMockInstructionsService = (): InstructionsService => ({
  createSharedInstruction: vi.fn().mockResolvedValue(ok(undefined)),
  listSharedInstructions: vi.fn().mockResolvedValue(ok([])),
  getSharedInstruction: vi.fn().mockResolvedValue(
    ok({
      name: 'test-instruction',
      content: 'Test instruction content',
      description: 'Test description',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  updateSharedInstruction: vi.fn().mockResolvedValue(ok(undefined)),
  deleteSharedInstruction: vi.fn().mockResolvedValue(ok(undefined)),
  updateGlobal: vi.fn().mockResolvedValue(ok(undefined)),
  getGlobal: vi.fn().mockResolvedValue(
    ok({
      content: 'Global instructions',
      updatedAt: new Date(),
    })
  ),
});

// Mock tool context
const createMockContext = (): ToolContext => ({
  workspaceRepository: {} as any,
  instructionsRepository: createMockInstructionsService(),
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

describe('ListSharedInstructionsTool', () => {
  let tool: ListSharedInstructionsTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new ListSharedInstructionsTool();
    mockContext = createMockContext();
  });

  describe('Tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('list_shared_instructions');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe(
        'List all available shared instruction files with metadata'
      );
    });

    it('should have valid input schema', () => {
      const result = tool.inputSchema.safeParse({
        includeContent: true,
        sortBy: 'name',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should accept valid input with all parameters', () => {
      const result = tool.inputSchema.safeParse({
        includeContent: true,
        sortBy: 'name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty input (use defaults)', () => {
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeContent).toBe(false);
        expect(result.data.sortBy).toBe('name');
      }
    });

    it('should accept all valid sortBy options', () => {
      const validOptions = ['name', 'created', 'modified', 'size'];

      for (const sortBy of validOptions) {
        const result = tool.inputSchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid sortBy values', () => {
      const result = tool.inputSchema.safeParse({
        sortBy: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeContent', () => {
      const result = tool.inputSchema.safeParse({
        includeContent: 'true',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Successful execution', () => {
    it('should list empty instructions with appropriate message', async () => {
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok([]));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: 'No shared instructions found. Create your first shared instruction using the create_shared_instruction tool.',
            },
          ],
        })
      );
    });

    it('should list instructions without content preview by default', async () => {
      const mockInstructions = [
        {
          name: 'coding-standards',
          content: 'Use TypeScript and follow ESLint rules...',
          description: 'Coding standards for the project',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'deployment-guide',
          content: 'Deploy to production using these steps...',
          description: 'How to deploy applications',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining('Found 2 shared instruction(s):') &&
                expect.stringContaining(
                  '• **coding-standards** - Coding standards for the project'
                ) &&
                expect.stringContaining(
                  '• **deployment-guide** - How to deploy applications'
                ) &&
                expect.not.stringContaining('Preview:'),
            },
          ],
        })
      );
    });

    it('should include content preview when requested', async () => {
      const mockInstructions = [
        {
          name: 'short-instruction',
          content: 'This is a short instruction.',
          description: 'A brief instruction',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'long-instruction',
          content:
            'This is a very long instruction that should be truncated because it exceeds the 200 character limit that is set for previews in the list shared instructions tool output format.',
          description: 'A lengthy instruction',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({ includeContent: true }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Found 2 shared instruction(s):'
        );
        expect(result.value.content[0].text).toContain('short-instruction');
        expect(result.value.content[0].text).toContain('long-instruction');
        expect(result.value.content[0].text).toContain(
          'Preview: This is a short instruction.'
        );
        expect(result.value.content[0].text).toContain(
          'Preview: This is a very long'
        );
      }
    });

    it('should handle instructions without descriptions', async () => {
      const mockInstructions = [
        {
          name: 'no-description',
          content: 'Some content here',
          description: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'empty-description',
          content: 'More content here',
          description: '',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining('• **empty-description**') &&
                expect.stringContaining('• **no-description**'),
            },
          ],
        })
      );
    });
  });

  describe('Sorting functionality', () => {
    const mockInstructions = [
      {
        name: 'zebra-instruction',
        content: 'Short content',
        description: 'Last alphabetically',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
      },
      {
        name: 'alpha-instruction',
        content:
          'This is a very long piece of content that will help test the size-based sorting functionality',
        description: 'First alphabetically',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        name: 'beta-instruction',
        content: 'Medium length content here',
        description: 'Middle alphabetically',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-04'),
      },
    ];

    beforeEach(() => {
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));
    });

    it('should sort by name by default', async () => {
      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /alpha-instruction.*beta-instruction.*zebra-instruction/s
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
                /alpha-instruction.*beta-instruction.*zebra-instruction/s
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
                /zebra-instruction.*beta-instruction.*alpha-instruction/s
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
                /alpha-instruction.*beta-instruction.*zebra-instruction/s
              ),
            },
          ],
        })
      );
    });

    it('should sort by content size', async () => {
      const result = await tool.execute({ sortBy: 'size' }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringMatching(
                /zebra-instruction.*beta-instruction.*alpha-instruction/s
              ),
            },
          ],
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle instructions repository errors', async () => {
      const repositoryError = new Error(
        'Failed to access instructions directory'
      );
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(err(repositoryError));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(err(repositoryError));
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockRejectedValue(new Error('File system error'));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        err(new Error('Failed to list shared instructions: File system error'))
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockRejectedValue('String error');

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        err(new Error('Failed to list shared instructions: String error'))
      );
    });

    it('should handle null/undefined thrown values', async () => {
      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockRejectedValue(null);

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        err(new Error('Failed to list shared instructions: null'))
      );
    });
  });

  describe('Content formatting', () => {
    it('should format file sizes correctly', async () => {
      const mockInstructions = [
        {
          name: 'small-file',
          content: 'A', // 1 byte
          description: 'Very small',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'medium-file',
          content: 'A'.repeat(1024), // 1KB
          description: 'Medium size',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          name: 'large-file',
          content: 'A'.repeat(2560), // 2.5KB
          description: 'Large size',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining('(0KB,') && // small-file
                expect.stringContaining('(1KB,') && // medium-file
                expect.stringContaining('(2.5KB,'), // large-file
            },
          ],
        })
      );
    });

    it('should replace newlines in content preview', async () => {
      const mockInstructions = [
        {
          name: 'multiline-instruction',
          content:
            'Line 1\nLine 2\nLine 3\nThis should all be on one line in preview',
          description: 'Has multiple lines',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({ includeContent: true }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(
                'Preview: Line 1 Line 2 Line 3 This should all be on one line in preview'
              ),
            },
          ],
        })
      );
    });

    it('should handle empty content gracefully', async () => {
      const mockInstructions = [
        {
          name: 'empty-content',
          content: '',
          description: 'Has no content',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({ includeContent: true }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Found 1 shared instruction(s):'
        );
        expect(result.value.content[0].text).toContain('empty-content');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid date objects gracefully', async () => {
      const mockInstructions = [
        {
          name: 'invalid-date-instruction',
          content: 'Some content',
          description: 'Has invalid dates',
          createdAt: new Date('invalid-date'),
          updatedAt: new Date('also-invalid'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      // Should not throw error, even with invalid dates
      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('invalid-date-instruction'),
            },
          ],
        })
      );
    });

    it('should handle large number of instructions', async () => {
      const mockInstructions = Array.from({ length: 50 }, (_, i) => ({
        name: `instruction-${i.toString().padStart(2, '0')}`,
        content: `Content for instruction ${i}`,
        description: `Description for instruction ${i}`,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      }));

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Found 50 shared instruction(s):'),
            },
          ],
        })
      );
    });

    it('should handle instructions with special characters in names', async () => {
      const mockInstructions = [
        {
          name: 'special-chars_123!',
          content: 'Content with special characters',
          description: 'Has special chars in name',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(
        mockContext.instructionsRepository.listSharedInstructions
      ).mockResolvedValue(ok(mockInstructions));

      const result = await tool.execute({}, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('• **special-chars_123!**'),
            },
          ],
        })
      );
    });
  });
});
