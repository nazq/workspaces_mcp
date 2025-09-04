// Tool Registry - Extensible, Type-Safe Tool Management
// Replaces the monolithic ToolService with elegant composition

import { zodToJsonSchema } from '@alcyone-labs/zod-to-json-schema';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';
import { err } from 'neverthrow';
import { inject, injectable } from 'tsyringe';
import type { z } from 'zod';

import { TOKENS } from '../container/tokens.js';
import { EVENTS } from '../events/events.js';
import type {
  ToolRegistry as IToolRegistry,
  Logger,
  ToolContext,
  ToolHandler,
} from '../interfaces/services.js';
import { createChildLogger } from '../utils/logger.js';

@injectable()
export class ToolRegistry implements IToolRegistry {
  private handlers = new Map<string, ToolHandler>();
  private logger: Logger;

  constructor(@inject(TOKENS.Logger) logger?: Logger) {
    this.logger = logger ?? createChildLogger('tool-registry');
  }

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
    return Array.from(this.handlers.values()).map(
      (handler) =>
        ({
          name: handler.name,
          description: handler.description,
          inputSchema: zodToJsonSchema(handler.inputSchema as z.ZodType, {
            target: 'openApi3',
          }),
        }) as Tool
    );
  }

  async execute(
    name: string,
    args: unknown,
    context: ToolContext
  ): Promise<Result<CallToolResult, Error>> {
    const startTime = Date.now();

    try {
      const handler = this.handlers.get(name);
      if (!handler) {
        return err(new Error(`Unknown tool: ${name}`));
      }

      // Validate arguments using the handler's schema
      const parseResult = (
        handler.inputSchema as {
          safeParse: (args: unknown) => {
            success: boolean;
            data?: unknown;
            error?: { errors: unknown[] };
          };
        }
      ).safeParse(args);
      if (!parseResult.success) {
        const error = new Error(
          `Invalid arguments: ${JSON.stringify(parseResult.error?.errors, null, 2)}`
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
        return err(error);
      }

      this.logger.debug(`Executing tool: ${name}`, { args: parseResult.data });

      // Execute the tool
      const result = await handler.execute(
        parseResult.data as Record<string, unknown>,
        context
      );

      const executionTime = Date.now() - startTime;

      if (result.isErr()) {
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
        result.value
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

      return err(toolError);
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
    result?: unknown,
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
}
