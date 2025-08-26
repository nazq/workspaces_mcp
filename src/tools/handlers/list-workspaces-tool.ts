// List Workspaces Tool Handler
// Handles listing all available workspaces with metadata and filtering options

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { ToolContext, ToolHandler } from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, getError, getValue, isErr, Ok } from '../../utils/result.js';

/**
 * Tool handler for listing all workspaces
 *
 * This tool lists all available workspaces in the configured workspace root
 * directory, optionally with metadata and filtering capabilities.
 */
export class ListWorkspacesTool implements ToolHandler {
  readonly name = 'list_workspaces';
  readonly description = 'List all available workspaces with their metadata';

  // Optional parameters for filtering/sorting
  readonly inputSchema = z.object({
    includeMetadata: z.boolean().optional().default(true),
    sortBy: z.enum(['name', 'created', 'modified']).optional().default('name'),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    try {
      const { includeMetadata, sortBy } = args;

      // Use the workspace repository to list workspaces
      const workspacesResult =
        await context.workspaceRepository.listWorkspaces();

      if (isErr(workspacesResult)) {
        return Err(getError(workspacesResult));
      }

      const workspaces = getValue(workspacesResult);

      // Sort workspaces based on sortBy parameter
      const sortedWorkspaces = [...workspaces].sort((a, b) => {
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
          default:
            return a.name.localeCompare(b.name);
        }
      });

      // Format response
      const workspaceList = sortedWorkspaces.map((ws) => {
        if (includeMetadata) {
          return `• ${ws.name} - ${ws.description || 'No description'} (Created: ${new Date(ws.createdAt).toLocaleDateString()})`;
        }
        return `• ${ws.name}`;
      });

      const responseText =
        workspaces.length > 0
          ? `Found ${workspaces.length} workspace(s):\n${workspaceList.join('\n')}`
          : 'No workspaces found. Create your first workspace using the create_workspace tool.';

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

      return Err(new Error(`Failed to list workspaces: ${message}`));
    }
  }
}
