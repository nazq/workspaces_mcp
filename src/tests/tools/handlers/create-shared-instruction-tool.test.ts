import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import { EVENTS } from '../../../events/events.js';
import type {
  EventBus,
  InstructionsService,
  Logger,
  ToolContext,
} from '../../../interfaces/services.js';
import { CreateSharedInstructionTool } from '../../../tools/handlers/create-shared-instruction-tool.js';

// Mock instructions service
const createMockInstructionsService = (): InstructionsService => ({
  getGlobalInstructions: vi.fn().mockResolvedValue(
    ok({
      content: 'Global instructions',
      lastModified: new Date(),
    })
  ),
  updateGlobalInstructions: vi.fn().mockResolvedValue(ok(undefined)),
  getSharedInstructions: vi.fn().mockResolvedValue(ok([])),
  createSharedInstruction: vi.fn().mockResolvedValue(ok(undefined)),
  deleteSharedInstruction: vi.fn().mockResolvedValue(ok(undefined)),
  getSharedInstruction: vi.fn().mockResolvedValue(
    ok({
      name: 'test',
      content: 'test content',
      lastModified: new Date(),
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
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  } as EventBus,
});

describe('CreateSharedInstructionTool', () => {
  let tool: CreateSharedInstructionTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new CreateSharedInstructionTool();
    mockContext = createMockContext();
  });

  describe('Tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('create_shared_instruction');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe(
        'Create a new shared instruction file for reuse across workspaces'
      );
    });

    it('should have valid input schema', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test-instruction',
        content: 'Test content',
        description: 'Test description',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should accept valid instruction names', () => {
      const validNames = [
        'simple',
        'with-dashes',
        'with_underscores',
        'MixedCase',
        'numbers123',
        'a1-b2_c3',
      ];

      for (const name of validNames) {
        const result = tool.inputSchema.safeParse({ name, content: 'test' });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid instruction names', () => {
      const invalidNames = [
        '',
        'name with spaces',
        'name@special',
        'name.dot',
        'name/slash',
        'name#hash',
        'name$dollar',
        'a'.repeat(101), // Too long
      ];

      for (const name of invalidNames) {
        const result = tool.inputSchema.safeParse({ name, content: 'test' });
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid content', () => {
      const validContent = [
        'Single line instruction',
        'Multi-line\ninstruction\nwith breaks',
        '# Markdown content\n- Item 1\n- Item 2',
        'a'.repeat(1000), // Reasonable length
      ];

      for (const content of validContent) {
        const result = tool.inputSchema.safeParse({ name: 'test', content });
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty content', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content that is too long', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test',
        content: 'x'.repeat(10001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid descriptions', () => {
      const validDescriptions = [
        'Short description',
        'A longer description with more details about what this instruction does',
        'x'.repeat(500), // Max length
      ];

      for (const description of validDescriptions) {
        const result = tool.inputSchema.safeParse({
          name: 'test',
          content: 'test content',
          description,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject descriptions that are too long', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test',
        content: 'test content',
        description: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept missing description', () => {
      const result = tool.inputSchema.safeParse({
        name: 'test',
        content: 'test content',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(undefined);
      }
    });

    it('should require name and content parameters', () => {
      // Missing name
      const result1 = tool.inputSchema.safeParse({
        content: 'test content',
      });
      expect(result1.success).toBe(false);

      // Missing content
      const result2 = tool.inputSchema.safeParse({
        name: 'test',
      });
      expect(result2.success).toBe(false);

      // Missing both
      const result3 = tool.inputSchema.safeParse({});
      expect(result3.success).toBe(false);
    });
  });

  describe('Successful execution', () => {
    it('should create shared instruction with name and content', async () => {
      const args = {
        name: 'test-instruction',
        content: 'Test instruction content',
      };

      const result = await tool.execute(args, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining(
                  "Shared instruction 'test-instruction' created successfully"
                ) &&
                expect.stringContaining(
                  'Description: No description provided'
                ) &&
                expect.stringContaining('Content length: 24 characters') &&
                expect.stringContaining('available in the resources list'),
            },
          ],
        })
      );

      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith('test-instruction', 'Test instruction content', {
        description: undefined,
      });
    });

    it('should create shared instruction with description', async () => {
      const args = {
        name: 'detailed-instruction',
        content: 'Detailed instruction content',
        description: 'This is a test instruction',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Description: This is a test instruction'
        );
      }

      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith(
        'detailed-instruction',
        'Detailed instruction content',
        { description: 'This is a test instruction' }
      );
    });

    it('should emit instruction created event', async () => {
      const args = {
        name: 'event-instruction',
        content: 'Event test content',
        description: 'Event test description',
      };

      await tool.execute(args, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.INSTRUCTION_CREATED,
        {
          name: 'event-instruction',
          description: 'Event test description',
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
          ),
        }
      );
    });

    it('should emit event without description when not provided', async () => {
      const args = {
        name: 'no-desc-instruction',
        content: 'No description content',
      };

      await tool.execute(args, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.INSTRUCTION_CREATED,
        {
          name: 'no-desc-instruction',
          description: undefined,
          timestamp: expect.any(String),
        }
      );
    });

    it('should continue execution even if event emission fails', async () => {
      vi.mocked(mockContext.eventBus.emit).mockRejectedValue(
        new Error('Event system down')
      );

      const args = {
        name: 'event-fail-instruction',
        content: 'Event failure test',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('created successfully');
      }
    });

    it('should handle max length content', async () => {
      const maxContent = 'x'.repeat(10000);
      const args = {
        name: 'max-content',
        content: maxContent,
        description: 'Max length test',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Content length: 10000 characters'
        );
      }
    });

    it('should format response text correctly with description', async () => {
      const args = {
        name: 'format-test',
        content: 'Format test content',
        description: 'Format test description',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const responseText = result.value.content[0].text;

        expect(responseText).toContain(
          "Shared instruction 'format-test' created successfully!"
        );
        expect(responseText).toContain('Description: Format test description');
        expect(responseText).toContain('Content length: 19 characters');
        expect(responseText).toContain('available in the resources list');
      }
    });

    it('should format response text correctly without description', async () => {
      const args = {
        name: 'no-desc-format',
        content: 'No description format test',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const responseText = result.value.content[0].text;

        expect(responseText).toContain(
          "Shared instruction 'no-desc-format' created successfully!"
        );
        expect(responseText).toContain('Description: No description provided');
        expect(responseText).toContain('Content length: 26 characters');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle instructions repository creation errors', async () => {
      const repositoryError = new Error('Instruction already exists');
      vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      ).mockResolvedValue(err(repositoryError));

      const result = await tool.execute(
        {
          name: 'existing-instruction',
          content: 'Test content',
        },
        mockContext
      );

      expect(result).toEqual(err(repositoryError));
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      ).mockRejectedValue(new Error('File system error'));

      const result = await tool.execute(
        {
          name: 'error-instruction',
          content: 'Test content',
        },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to create shared instruction: File system error'))
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      ).mockRejectedValue('String error');

      const result = await tool.execute(
        {
          name: 'string-error',
          content: 'Test content',
        },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to create shared instruction: String error'))
      );
    });

    it('should handle null/undefined thrown values', async () => {
      vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      ).mockRejectedValue(null);

      const result = await tool.execute(
        {
          name: 'null-error',
          content: 'Test content',
        },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to create shared instruction: null'))
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle markdown content correctly', async () => {
      const markdownContent = `# Shared Instruction

## Purpose
Provide guidance for AI behavior.

### Rules
- Always be helpful
- Provide accurate information

\`\`\`typescript
// Example code block
const example = true;
\`\`\``;

      const result = await tool.execute(
        {
          name: 'markdown-instruction',
          content: markdownContent,
          description: 'Markdown formatting test',
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith('markdown-instruction', markdownContent, {
        description: 'Markdown formatting test',
      });
    });

    it('should handle content with special characters', async () => {
      const specialContent =
        'Content with émojis 🚀 and spëcial chars: @#$%^&*()';
      const result = await tool.execute(
        {
          name: 'special-chars',
          content: specialContent,
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith('special-chars', specialContent, {
        description: undefined,
      });
    });

    it('should handle multiline content correctly', async () => {
      const multilineContent = `Line 1
Line 2

Line 4 after blank line
Final line`;

      const result = await tool.execute(
        {
          name: 'multiline-test',
          content: multilineContent,
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith('multiline-test', multilineContent, {
        description: undefined,
      });
    });

    it('should handle all supported name patterns', async () => {
      const testCases = [
        'simple',
        'with-dashes',
        'with_underscores',
        'MixedCase',
        'numbers123',
        'a1-b2_c3',
        'a'.repeat(100), // Max length
      ];

      for (const name of testCases) {
        const mockContext = createMockContext();
        const result = await tool.execute(
          {
            name,
            content: `Test content for ${name}`,
          },
          mockContext
        );

        expect(result.isOk()).toBe(true);
        expect(
          mockContext.instructionsRepository.createSharedInstruction
        ).toHaveBeenCalledWith(name, `Test content for ${name}`, {
          description: undefined,
        });
      }
    });

    it('should handle empty description correctly', async () => {
      const result = await tool.execute(
        {
          name: 'empty-desc',
          content: 'Test content',
          description: '',
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain('Description: ');
      }
      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith('empty-desc', 'Test content', { description: '' });
    });
  });

  describe('Repository interaction', () => {
    it('should call createSharedInstruction with correct parameters', async () => {
      const createSpy = vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      );
      const args = {
        name: 'param-test',
        content: 'Parameter test content',
        description: 'Parameter test description',
      };

      await tool.execute(args, mockContext);

      expect(createSpy).toHaveBeenCalledWith(
        'param-test',
        'Parameter test content',
        { description: 'Parameter test description' }
      );
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('should pass undefined description when not provided', async () => {
      const createSpy = vi.mocked(
        mockContext.instructionsRepository.createSharedInstruction
      );

      await tool.execute(
        {
          name: 'no-desc-param',
          content: 'No description param test',
        },
        mockContext
      );

      expect(createSpy).toHaveBeenCalledWith(
        'no-desc-param',
        'No description param test',
        { description: undefined }
      );
    });
  });

  describe('Content length validation', () => {
    it('should handle content exactly at max length', async () => {
      const maxLengthContent = 'x'.repeat(10000);
      const result = await tool.execute(
        {
          name: 'max-test',
          content: maxLengthContent,
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Content length: 10000 characters'
        );
      }
    });

    it('should calculate content length correctly for unicode characters', async () => {
      const unicodeContent = '🚀🌟💫'; // 3 unicode characters
      const result = await tool.execute(
        {
          name: 'unicode-test',
          content: unicodeContent,
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          `Content length: ${unicodeContent.length} characters`
        );
      }
    });
  });

  describe('Name length validation', () => {
    it('should handle names exactly at max length', async () => {
      const maxLengthName = 'a'.repeat(100);
      const result = await tool.execute(
        {
          name: maxLengthName,
          content: 'Max name length test',
        },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.createSharedInstruction
      ).toHaveBeenCalledWith(maxLengthName, 'Max name length test', {
        description: undefined,
      });
    });
  });
});
