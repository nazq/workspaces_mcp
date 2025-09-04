import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from 'neverthrow';
import { EVENTS } from '../../../events/events.js';
import type {
  EventBus,
  InstructionsService,
  Logger,
  ToolContext,
} from '../../../interfaces/services.js';
import { UpdateGlobalInstructionsTool } from '../../../tools/handlers/update-global-instructions-tool.js';

// Mock instructions service
const createMockInstructionsService = (): InstructionsService => ({
  getGlobalInstructions: vi.fn().mockResolvedValue(
    ok({
      content: 'Existing global instructions',
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

describe('UpdateGlobalInstructionsTool', () => {
  let tool: UpdateGlobalInstructionsTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new UpdateGlobalInstructionsTool();
    mockContext = createMockContext();
  });

  describe('Tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('update_global_instructions');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe(
        'Update the global instructions that auto-load in every Claude session'
      );
    });

    it('should have valid input schema', () => {
      const result = tool.inputSchema.safeParse({
        content: 'Test content',
        append: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should accept valid content', () => {
      const validContent = [
        'Single line instruction',
        'Multi-line\ninstruction\nwith breaks',
        '# Markdown content\n- Item 1\n- Item 2',
        'a'.repeat(1000), // Reasonable length
      ];

      for (const content of validContent) {
        const result = tool.inputSchema.safeParse({ content });
        expect(result.success).toBe(true);
      }
    });

    it('should reject empty content', () => {
      const result = tool.inputSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content that is too long', () => {
      const result = tool.inputSchema.safeParse({
        content: 'x'.repeat(50001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid append values', () => {
      const result1 = tool.inputSchema.safeParse({
        content: 'test',
        append: true,
      });
      expect(result1.success).toBe(true);

      const result2 = tool.inputSchema.safeParse({
        content: 'test',
        append: false,
      });
      expect(result2.success).toBe(true);
    });

    it('should use default append value when not provided', () => {
      const result = tool.inputSchema.safeParse({ content: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.append).toBe(false);
      }
    });

    it('should reject non-boolean append', () => {
      const result = tool.inputSchema.safeParse({
        content: 'test',
        append: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('should require content parameter', () => {
      const result = tool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Successful execution', () => {
    it('should replace global instructions by default', async () => {
      const content = 'New global instructions';
      const result = await tool.execute({ content }, mockContext);

      expect(result).toEqual(
        ok({
          content: [
            {
              type: 'text',
              text:
                expect.stringContaining('updated (replaced) successfully') &&
                expect.stringContaining('Content length: 24 characters') &&
                expect.stringContaining('automatically loaded'),
            },
          ],
        })
      );

      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith('New global instructions');
    });

    it('should append to existing global instructions when requested', async () => {
      const newContent = 'Additional instructions';
      const result = await tool.execute(
        { content: newContent, append: true },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'updated (appended) successfully'
        );
      }

      // Should call updateGlobalInstructions with existing + new content
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(
        'Existing global instructions\n\nAdditional instructions'
      );
    });

    it('should handle append when no existing content exists', async () => {
      vi.mocked(
        mockContext.instructionsRepository.getGlobalInstructions
      ).mockResolvedValue(err(new Error('No existing content')));

      const content = 'New instructions';
      const result = await tool.execute({ content, append: true }, mockContext);

      expect(result.isOk()).toBe(true);

      // Should use new content only when append fails to get existing
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith('New instructions');
    });

    it('should emit global instructions updated event', async () => {
      const content = 'Test content';
      await tool.execute({ content, append: false }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.GLOBAL_INSTRUCTIONS_UPDATED,
        {
          contentLength: content.length,
          appended: false,
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
          ),
        }
      );
    });

    it('should emit event with correct appended flag when appending', async () => {
      const content = 'Additional content';
      await tool.execute({ content, append: true }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        EVENTS.GLOBAL_INSTRUCTIONS_UPDATED,
        expect.objectContaining({
          contentLength: 'Existing global instructions\n\nAdditional content'
            .length,
          appended: true,
          timestamp: expect.any(String),
        })
      );
    });

    it('should continue execution even if event emission fails', async () => {
      vi.mocked(mockContext.eventBus.emit).mockRejectedValue(
        new Error('Event system down')
      );

      const content = 'Test content';
      const result = await tool.execute({ content }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'updated (replaced) successfully'
        );
      }
    });

    it('should handle very long content (at max limit)', async () => {
      const maxContent = 'x'.repeat(50000);
      const result = await tool.execute({ content: maxContent }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Content length: 50000 characters'
        );
      }
    });

    it('should format response text correctly for replacement', async () => {
      const content = 'Test instructions';
      const result = await tool.execute({ content }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const responseText = result.value.content[0].text;

        expect(responseText).toContain(
          'Global instructions updated (replaced) successfully!'
        );
        expect(responseText).toContain('Content length: 17 characters');
        expect(responseText).toContain(
          'automatically loaded in every Claude session'
        );
        expect(responseText).toContain(
          'changes will take effect in new conversations'
        );
      }
    });

    it('should format response text correctly for append', async () => {
      const content = 'Additional content';
      const result = await tool.execute({ content, append: true }, mockContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const responseText = result.value.content[0].text;

        expect(responseText).toContain(
          'Global instructions updated (appended) successfully!'
        );
        expect(responseText).toContain('Content length: 48 characters'); // "Existing global instructions" (28) + "\n\n" (2) + "Additional content" (18)
      }
    });
  });

  describe('Error handling', () => {
    it('should handle instructions repository update errors', async () => {
      const repositoryError = new Error('Failed to write file');
      vi.mocked(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).mockResolvedValue(err(repositoryError));

      const result = await tool.execute(
        { content: 'Test content' },
        mockContext
      );

      expect(result).toEqual(err(repositoryError));
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).mockRejectedValue(new Error('File system error'));

      const result = await tool.execute(
        { content: 'Test content' },
        mockContext
      );

      expect(result).toEqual(
        err(
          new Error('Failed to update global instructions: File system error')
        )
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).mockRejectedValue('String error');

      const result = await tool.execute(
        { content: 'Test content' },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to update global instructions: String error'))
      );
    });

    it('should handle null/undefined thrown values', async () => {
      vi.mocked(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).mockRejectedValue(null);

      const result = await tool.execute(
        { content: 'Test content' },
        mockContext
      );

      expect(result).toEqual(
        err(new Error('Failed to update global instructions: null'))
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle markdown content correctly', async () => {
      const markdownContent = `# Global Instructions

## Rules
- Always be helpful
- Provide accurate information

### Additional Notes
This is a test of markdown formatting.`;

      const result = await tool.execute(
        { content: markdownContent },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(markdownContent);
    });

    it('should handle content with special characters', async () => {
      const specialContent =
        'Content with émojis 🚀 and spëcial chars: @#$%^&*()';
      const result = await tool.execute(
        { content: specialContent },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(specialContent);
    });

    it('should handle content with only whitespace', async () => {
      const whitespaceContent = '   \t\n  '; // Should pass min length validation
      const result = await tool.execute(
        { content: whitespaceContent },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(whitespaceContent);
    });

    it('should handle multiline content correctly', async () => {
      const multilineContent = `Line 1
Line 2

Line 4 after blank line
Final line`;

      const result = await tool.execute(
        { content: multilineContent },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(multilineContent);
    });

    it('should handle existing content with various formats when appending', async () => {
      const existingContent = '# Existing\nContent here';
      vi.mocked(
        mockContext.instructionsRepository.getGlobalInstructions
      ).mockResolvedValue(
        ok({
          content: existingContent,
          lastModified: new Date(),
        })
      );

      const newContent = '## Additional\nMore content';
      const result = await tool.execute(
        { content: newContent, append: true },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      expect(
        mockContext.instructionsRepository.updateGlobalInstructions
      ).toHaveBeenCalledWith(`${existingContent}\n\n${newContent}`);
    });
  });

  describe('Repository interaction', () => {
    it('should call getGlobalInstructions when appending', async () => {
      const getGlobalSpy = vi.mocked(
        mockContext.instructionsRepository.getGlobalInstructions
      );

      await tool.execute({ content: 'test', append: true }, mockContext);

      expect(getGlobalSpy).toHaveBeenCalledWith();
      expect(getGlobalSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call getGlobalInstructions when replacing', async () => {
      const getGlobalSpy = vi.mocked(
        mockContext.instructionsRepository.getGlobalInstructions
      );

      await tool.execute({ content: 'test', append: false }, mockContext);

      expect(getGlobalSpy).not.toHaveBeenCalled();
    });

    it('should call updateGlobalInstructions with correct content', async () => {
      const updateGlobalSpy = vi.mocked(
        mockContext.instructionsRepository.updateGlobalInstructions
      );
      const content = 'Test global instructions';

      await tool.execute({ content }, mockContext);

      expect(updateGlobalSpy).toHaveBeenCalledWith(content);
      expect(updateGlobalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content length validation', () => {
    it('should handle content exactly at max length', async () => {
      const maxLengthContent = 'x'.repeat(50000);
      const result = await tool.execute(
        { content: maxLengthContent },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Content length: 50000 characters'
        );
      }
    });

    it('should calculate combined length correctly when appending', async () => {
      const existingContent = 'Existing content'; // 16 chars
      vi.mocked(
        mockContext.instructionsRepository.getGlobalInstructions
      ).mockResolvedValue(
        ok({
          content: existingContent,
          lastModified: new Date(),
        })
      );

      const newContent = 'New content'; // 11 chars
      const result = await tool.execute(
        { content: newContent, append: true },
        mockContext
      );

      expect(result.isOk()).toBe(true);
      // Should be: "Existing content" (16) + "\n\n" (2) + "New content" (11) = 29 chars
      if (result.isOk()) {
        expect(result.value.content[0].text).toContain(
          'Content length: 29 characters'
        );
      }
    });
  });
});
