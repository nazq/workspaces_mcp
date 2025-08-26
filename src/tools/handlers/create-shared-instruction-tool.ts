// Create Shared Instruction Tool Handler
// Handles creation of shared instruction files

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { EVENTS } from '../../events/events.js';
import type { ToolContext, ToolHandler } from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, getError, isErr, Ok } from '../../utils/result.js';

/**
 * Tool handler for creating shared instruction files
 *
 * This tool creates new shared instruction files that can be referenced
 * across multiple workspaces for consistent AI guidance.
 */
export class CreateSharedInstructionTool implements ToolHandler {
  readonly name = 'create_shared_instruction';
  readonly description =
    'Create a new shared instruction file for reuse across workspaces';

  readonly inputSchema = z.object({
    name: z
      .string()
      .min(1, 'Instruction name cannot be empty')
      .max(100, 'Instruction name too long')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Instruction name can only contain letters, numbers, hyphens, and underscores'
      ),
    content: z
      .string()
      .min(1, 'Instruction content cannot be empty')
      .max(10000, 'Instruction content too long (max 10,000 characters)'),
    description: z
      .string()
      .max(500, 'Description too long (max 500 characters)')
      .optional(),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    try {
      const { name, content, description } = args;

      // Create the shared instruction using the instructions repository
      const result =
        await context.instructionsRepository.createSharedInstruction(
          name,
          content,
          { description }
        );

      if (isErr(result)) {
        return Err(getError(result));
      }

      // Emit event for other parts of the system
      try {
        context.eventBus.emit(EVENTS.INSTRUCTION_CREATED, {
          name,
          description,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Event emission is optional, continue if it fails
      }

      const responseText =
        `Shared instruction '${name}' created successfully!\n\n` +
        `Description: ${description || 'No description provided'}\n` +
        `Content length: ${content.length} characters\n\n` +
        `This instruction can now be referenced in workspaces and will be available ` +
        `in the resources list for easy access.`;

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

      return Err(new Error(`Failed to create shared instruction: ${message}`));
    }
  }
}
