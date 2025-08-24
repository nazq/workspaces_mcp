// Professional Tool Registry - Extensible, Type-Safe Tool Management
// Replaces the monolithic ToolService with elegant composition

import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { EVENTS } from '../events/events.js';
import type {
  ToolRegistry as IToolRegistry,
  ToolContext,
  ToolHandler,
} from '../interfaces/services.js';
import { createChildLogger } from '../utils/logger.js';
import type { Result } from '../utils/result.js';
import { Err, isErr } from '../utils/result.js';

export class ToolRegistry implements IToolRegistry {
  private handlers = new Map<string, ToolHandler>();
  private logger = createChildLogger('tool-registry');

  register(handler: ToolHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Tool handler already registered: ${handler.name}`);
    }

    this.handlers.set(handler.name, handler);
    this.logger.info(`Tool registered: ${handler.name}`);
  }

  unregister(name: string): void {
    if (this.handlers.delete(name)) {
      this.logger.info(`Tool unregistered: ${name}`);
    }
  }

  listTools(): Tool[] {
    return Array.from(this.handlers.values()).map((handler) => ({
      name: handler.name,
      description: handler.description,
      inputSchema: this.zodToJsonSchema(handler.inputSchema),
    }));
  }

  async execute(
    name: string,
    args: unknown,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    const startTime = Date.now();

    try {
      const handler = this.handlers.get(name);
      if (!handler) {
        return Err(new Error(`Unknown tool: ${name}`));
      }

      // Validate arguments using the handler's schema
      const parseResult = handler.inputSchema.safeParse(args);
      if (!parseResult.success) {
        const error = new Error(
          `Invalid arguments: ${parseResult.error.message}`
        );
        await this.emitToolEvent(
          context,
          'failed',
          name,
          args,
          startTime,
          undefined,
          error
        );
        return Err(error);
      }

      this.logger.debug(`Executing tool: ${name}`, { args: parseResult.data });

      // Execute the tool
      const result = await handler.execute(parseResult.data, context);

      const executionTime = Date.now() - startTime;

      if (isErr(result)) {
        await this.emitToolEvent(
          context,
          'failed',
          name,
          args,
          executionTime,
          undefined,
          result.error
        );
        return result;
      }

      await this.emitToolEvent(
        context,
        'executed',
        name,
        args,
        executionTime,
        result.data
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const toolError =
        error instanceof Error ? error : new Error(String(error));

      this.logger.error(`Tool execution failed: ${name}`, toolError);
      await this.emitToolEvent(
        context,
        'failed',
        name,
        args,
        executionTime,
        undefined,
        toolError
      );

      return Err(toolError);
    }
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  // Utility methods
  getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  clear(): void {
    const count = this.handlers.size;
    this.handlers.clear();
    this.logger.info(`All tool handlers cleared (${count} handlers)`);
  }

  // Event emission helper
  private async emitToolEvent(
    context: ToolContext,
    type: 'executed' | 'failed',
    toolName: string,
    args: unknown,
    executionTimeMs: number,
    result?: any,
    error?: Error
  ): Promise<void> {
    try {
      const event =
        type === 'executed' ? EVENTS.TOOL_EXECUTED : EVENTS.TOOL_FAILED;

      await context.eventBus.emit(event, {
        toolName,
        args,
        success: type === 'executed',
        executionTimeMs,
        timestamp: new Date(),
        result,
        error,
      });
    } catch (eventError) {
      this.logger.warn('Failed to emit tool event', {
        type,
        toolName,
        error: eventError,
      });
    }
  }

  // Convert Zod schema to JSON Schema for MCP
  private zodToJsonSchema(zodSchema: z.ZodSchema): any {
    // Basic conversion - in a real implementation, you'd use a library like zod-to-json-schema
    // For now, we'll use a simplified approach

    if (zodSchema instanceof z.ZodObject) {
      const shape = zodSchema.shape;
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        if (value instanceof z.ZodString) {
          properties[key] = { type: 'string' };
          if (!value.isOptional()) required.push(key);
        } else if (value instanceof z.ZodNumber) {
          properties[key] = { type: 'number' };
          if (!value.isOptional()) required.push(key);
        } else if (value instanceof z.ZodBoolean) {
          properties[key] = { type: 'boolean' };
          if (!value.isOptional()) required.push(key);
        } else {
          // Fallback for complex types
          properties[key] = { type: 'object' };
        }
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    // Fallback for non-object schemas
    return { type: 'object' };
  }
}
