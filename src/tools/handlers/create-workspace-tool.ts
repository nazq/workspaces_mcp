// Create Workspace Tool Handler
// Handles workspace creation with validation, templating, and comprehensive error handling
// Part of the modular tool registry system for maximum extensibility

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';
import { z } from 'zod';

import { EVENTS } from '../../events/events.js';
import type { ToolContext, ToolHandler } from '../../interfaces/services.js';

/**
 * Tool handler for creating new workspaces
 *
 * This tool creates a new workspace directory with optional description and template.
 * It validates input, ensures the workspace doesn't already exist, creates the directory
 * structure, and emits appropriate events for other parts of the system to react to.
 */
export class CreateWorkspaceTool implements ToolHandler {
  readonly name = 'create_workspace';
  readonly description =
    'Create a new workspace with optional description and template';

  // Zod schema for argument validation - ensures type safety at runtime
  readonly inputSchema = z.object({
    name: z
      .string()
      .min(1, 'Workspace name cannot be empty')
      .max(100, 'Workspace name too long')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Workspace name can only contain letters, numbers, hyphens, and underscores'
      )
      .refine(
        (name) => !name.startsWith('-') && !name.endsWith('-'),
        'Workspace name cannot start or end with hyphen'
      ),
    description: z.string().max(500, 'Description too long').optional(),
    template: z.string().max(50, 'Template name too long').optional(),
  });

  /**
   * Execute the workspace creation
   *
   * @param args - Validated arguments from the input schema
   * @param context - Tool execution context with dependencies
   * @returns Result containing success message or error
   */
  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult, Error>> {
    const { name, description, template } = args;

    try {
      context.logger.info(`Creating workspace: ${name}`, {
        description,
        template,
      });

      // Check if workspace already exists
      const existsResult =
        await context.workspaceRepository.workspaceExists(name);
      if (existsResult.isErr()) {
        const message =
          existsResult.error instanceof Error
            ? existsResult.error.message
            : String(existsResult.error);
        return err(
          new Error(`Failed to check workspace existence: ${message}`)
        );
      }

      if (existsResult.value) {
        return err(new Error(`Workspace '${name}' already exists`));
      }

      // Create the workspace using the repository
      const createResult = await context.workspaceRepository.createWorkspace(
        name,
        {
          description,
          template,
        }
      );

      if (createResult.isErr()) {
        context.logger.error(
          `Failed to create workspace: ${name}`,
          createResult.error
        );
        const message =
          createResult.error instanceof Error
            ? createResult.error.message
            : String(createResult.error);
        return err(new Error(`Failed to create workspace: ${message}`));
      }

      // Emit workspace created event for other components to react
      // This enables decoupled features like notifications, indexing, etc.
      await context.eventBus.emit(EVENTS.WORKSPACE_CREATED, {
        name,
        path: `${context.config.workspaces.rootPath}/${name}`,
        description,
        template,
        createdAt: new Date(),
      });

      // Success! Return user-friendly message
      const message = this.buildSuccessMessage(name, description, template);
      context.logger.info(`Workspace created successfully: ${name}`);

      return ok({
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      });
    } catch (error) {
      // Handle unexpected errors gracefully
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      context.logger.error(
        `Unexpected error creating workspace: ${name}`,
        error
      );

      return err(
        new Error(`Unexpected error creating workspace: ${errorMessage}`)
      );
    }
  }

  /**
   * Build a user-friendly success message based on what was created
   *
   * @param name - Workspace name
   * @param description - Optional description
   * @param template - Optional template used
   * @returns Formatted success message
   */
  private buildSuccessMessage(
    name: string,
    description?: string,
    template?: string
  ): string {
    let message = `✅ Workspace '${name}' created successfully!`;

    if (description) {
      message += `\n📝 Description: ${description}`;
    }

    if (template) {
      message += `\n🎨 Template: ${template}`;
    }

    message += `\n\n💡 Next steps:`;
    message += `\n• Add your project files to the workspace directory`;
    message += `\n• The workspace will appear automatically in Claude Desktop resources`;
    message += `\n• Use shared instructions to customize how Claude works with this project type`;

    return message;
  }
}
