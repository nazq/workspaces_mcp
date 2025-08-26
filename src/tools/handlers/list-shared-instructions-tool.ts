// List Shared Instructions Tool Handler
// Handles listing all available shared instruction files

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { ToolContext, ToolHandler } from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, getError, getValue, isErr, Ok } from '../../utils/result.js';

/**
 * Tool handler for listing all shared instructions
 *
 * This tool lists all available shared instruction files with their
 * metadata and brief descriptions.
 */
export class ListSharedInstructionsTool implements ToolHandler {
  readonly name = 'list_shared_instructions';
  readonly description =
    'List all available shared instruction files with metadata';

  readonly inputSchema = z.object({
    includeContent: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include a preview of instruction content'),
    sortBy: z
      .enum(['name', 'created', 'modified', 'size'])
      .optional()
      .default('name')
      .describe('How to sort the results'),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    try {
      const { includeContent, sortBy } = args;

      // Get list of shared instructions from the repository
      const instructionsResult =
        await context.instructionsRepository.listSharedInstructions();

      if (isErr(instructionsResult)) {
        return Err(getError(instructionsResult));
      }

      const instructions = getValue(instructionsResult);

      // Sort instructions based on sortBy parameter
      const sortedInstructions = [...instructions].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'created':
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          case 'modified':
            return (
              new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
            );
          case 'size':
            return a.content.length - b.content.length;
          default:
            return a.name.localeCompare(b.name);
        }
      });

      // Format response
      const instructionList = sortedInstructions.map((instruction) => {
        let item = `• **${instruction.name}**`;

        if (instruction.description) {
          item += ` - ${instruction.description}`;
        }

        item += ` (${Math.round((instruction.content.length / 1024) * 10) / 10}KB, modified: ${new Date(instruction.updatedAt).toLocaleDateString()})`;

        if (includeContent && instruction.content) {
          // Show first 200 characters as preview
          const preview =
            instruction.content.length > 200
              ? `${instruction.content.substring(0, 200)}...`
              : instruction.content;
          item += `\n  Preview: ${preview.replace(/\n/g, ' ')}`;
        }

        return item;
      });

      const responseText =
        instructions.length > 0
          ? `Found ${instructions.length} shared instruction(s):\n\n${instructionList.join('\n\n')}\n\n` +
            `These instructions can be referenced in workspaces and are available in the resources list.`
          : 'No shared instructions found. Create your first shared instruction using the create_shared_instruction tool.';

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

      return Err(new Error(`Failed to list shared instructions: ${message}`));
    }
  }
}
