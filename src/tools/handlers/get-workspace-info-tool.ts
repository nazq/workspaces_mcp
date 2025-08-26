// Get Workspace Info Tool Handler
// Retrieves detailed information about a specific workspace

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { ToolContext, ToolHandler } from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, getError, getValue, isErr, Ok } from '../../utils/result.js';

/**
 * Tool handler for getting detailed workspace information
 *
 * This tool retrieves comprehensive information about a specific workspace
 * including metadata, file count, size, and recent activity.
 */
export class GetWorkspaceInfoTool implements ToolHandler {
  readonly name = 'get_workspace_info';
  readonly description = 'Get detailed information about a specific workspace';

  readonly inputSchema = z.object({
    name: z
      .string()
      .min(1, 'Workspace name cannot be empty')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Workspace name can only contain letters, numbers, hyphens, and underscores'
      ),
    includeFiles: z.boolean().optional().default(false),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    try {
      const { name, includeFiles } = args;

      // Get workspace information from the repository
      const workspaceResult =
        await context.workspaceRepository.getWorkspaceInfo(name);

      if (isErr(workspaceResult)) {
        return Err(getError(workspaceResult));
      }

      const workspace = getValue(workspaceResult);

      // Build detailed information response
      let infoText = `Workspace Information: ${workspace.name}\n\n`;
      infoText += `Description: ${workspace.description || 'No description provided'}\n`;
      infoText += `Path: ${workspace.path}\n`;
      infoText += `Created: ${new Date(workspace.createdAt).toLocaleString()}\n`;
      infoText += `Last Modified: ${new Date(workspace.updatedAt).toLocaleString()}\n`;

      // Add template information if available
      if (workspace.template) {
        infoText += `Template: ${workspace.template}\n`;
      }

      // Add file listing if requested
      if (includeFiles) {
        try {
          // Skip file listing for now as FileSystemService is not available in ToolContext
          infoText += '\nFiles: File listing not available in this context';
        } catch {
          // Skip file listing errors
        }
      }

      return Ok({
        content: [
          {
            type: 'text',
            text: infoText,
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return Err(new Error(`Failed to get workspace info: ${message}`));
    }
  }
}
