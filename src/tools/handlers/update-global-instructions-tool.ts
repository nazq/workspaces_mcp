// Update Global Instructions Tool Handler
// Handles updating the global instructions file

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { EVENTS } from '../../events/events.js';
import type { ToolContext, ToolHandler } from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, getError, getValue, isErr, Ok } from '../../utils/result.js';

/**
 * Tool handler for updating global instructions
 *
 * This tool updates the GLOBAL.md file which contains instructions that are
 * automatically loaded in every Claude session.
 */
export class UpdateGlobalInstructionsTool implements ToolHandler {
  readonly name = 'update_global_instructions';
  readonly description =
    'Update the global instructions that auto-load in every Claude session';

  readonly inputSchema = z.object({
    content: z
      .string()
      .min(1, 'Global instructions content cannot be empty')
      .max(
        50000,
        'Global instructions content too long (max 50,000 characters)'
      ),
    append: z
      .boolean()
      .optional()
      .default(false)
      .describe('If true, append to existing content instead of replacing it'),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    try {
      const { content, append } = args;

      let finalContent = content;

      // If appending, first get the current content
      if (append) {
        const currentResult =
          await context.instructionsRepository.getGlobalInstructions();
        if (!isErr(currentResult)) {
          const currentContent = getValue(currentResult).content;
          finalContent = `${currentContent}\n\n${content}`;
        }
      }

      // Update the global instructions using the instructions repository
      const result =
        await context.instructionsRepository.updateGlobalInstructions(
          finalContent
        );

      if (isErr(result)) {
        return Err(getError(result));
      }

      // Emit event for other parts of the system
      try {
        context.eventBus.emit(EVENTS.GLOBAL_INSTRUCTIONS_UPDATED, {
          contentLength: finalContent.length,
          appended: append,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Event emission is optional, continue if it fails
      }

      const responseText =
        `Global instructions ${append ? 'updated (appended)' : 'updated (replaced)'} successfully!\n\n` +
        `Content length: ${finalContent.length} characters\n\n` +
        `These instructions will now be automatically loaded in every Claude session. ` +
        `The changes will take effect in new conversations.`;

      return Ok({
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return Err(new Error(`Failed to update global instructions: ${message}`));
    }
  }
}
