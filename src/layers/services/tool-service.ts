// Modern Tool Service - Migrated to ToolRegistry Architecture
// Replaces monolithic tool handling with extensible registry pattern

import type {
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';
import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../container/tokens.js';
import type {
  ToolService as IToolService,
  Logger,
  ToolContext,
  ToolHandler,
  ToolRegistry,
} from '../../interfaces/services.js';
import { CreateSharedInstructionTool } from '../../tools/handlers/create-shared-instruction-tool.js';
import { CreateWorkspaceTool } from '../../tools/handlers/create-workspace-tool.js';
import { GetWorkspaceInfoTool } from '../../tools/handlers/get-workspace-info-tool.js';
import { ListSharedInstructionsTool } from '../../tools/handlers/list-shared-instructions-tool.js';
import { ListWorkspacesTool } from '../../tools/handlers/list-workspaces-tool.js';
import { UpdateGlobalInstructionsTool } from '../../tools/handlers/update-global-instructions-tool.js';

/**
 * Modern tool service using extensible ToolRegistry architecture
 *
 * This service replaces the monolithic tool handler approach with a
 * clean registry pattern that allows for modular, testable tool handlers.
 * Each tool is implemented as a separate handler class with its own
 * validation, execution logic, and comprehensive documentation.
 *
 * @example
 * ```typescript
 * // Register tool handlers
 * const toolService = new ToolService(toolRegistry, logger);
 *
 * // List available tools
 * const listResult = await toolService.listTools();
 * if (listResult.isOk()) {
 *   console.log(`Found ${listResult.value.tools.length} tools`);
 * }
 *
 * // Execute tool
 * const result = await toolService.callTool('create_workspace', {
 *   name: 'my-project',
 *   description: 'My awesome project'
 * });
 * ```
 */
@injectable()
export class ToolService implements IToolService {
  /**
   * Create tool service with modern registry architecture
   *
   * @param toolRegistry - Registry containing all tool handlers
   * @param logger - Logger for comprehensive monitoring
   */
  constructor(
    @inject(TOKENS.ToolRegistry) private readonly toolRegistry: ToolRegistry,
    @inject(TOKENS.Logger) private readonly logger: Logger
  ) {
    this.initializeDefaultTools();
  }

  /**
   * Initialize and register default tool handlers
   *
   * This method registers all built-in tools with the registry.
   * Additional tools can be registered dynamically at runtime.
   */
  private initializeDefaultTools(): void {
    try {
      // Register core workspace management tools
      this.toolRegistry.register(new CreateWorkspaceTool());
      this.toolRegistry.register(new ListWorkspacesTool());
      this.toolRegistry.register(new GetWorkspaceInfoTool());

      // Register shared instruction tools
      this.toolRegistry.register(new CreateSharedInstructionTool());
      this.toolRegistry.register(new UpdateGlobalInstructionsTool());
      this.toolRegistry.register(new ListSharedInstructionsTool());

      this.logger.info('Default tool handlers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default tool handlers', error);
      throw new Error('Tool service initialization failed');
    }
  }

  /**
   * List all available tools from the registry
   *
   * Delegates to the tool registry to provide a comprehensive list
   * of all registered tools with their schemas and descriptions.
   *
   * @returns Result containing list of available tools
   */
  async listTools(): Promise<Result<ListToolsResult, Error>> {
    try {
      this.logger.debug('Listing all available tools from registry');

      const tools = this.toolRegistry.listTools();

      this.logger.debug(`Registry contains ${tools.length} registered tools`, {
        toolNames: tools.map((t) => (t as { name: string }).name),
      });

      return ok({ tools } as ListToolsResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list tools from registry', error);
      return err(new Error(`Tool listing failed: ${message}`));
    }
  }

  /**
   * Execute a tool with comprehensive error handling and monitoring
   *
   * Delegates to the tool registry for execution, providing a clean
   * abstraction over the underlying tool handler architecture.
   *
   * @param name - Name of tool to execute
   * @param args - Tool arguments (will be validated by handler)
   * @param context - Execution context with dependencies
   * @returns Result containing tool output or detailed error
   */
  async callTool(
    name: string,
    args: unknown = {},
    context?: ToolContext
  ): Promise<Result<CallToolResult, Error>> {
    try {
      this.logger.info(`Executing tool via registry: ${name}`, { args });

      // Validate tool exists in registry
      if (!this.toolRegistry.hasHandler(name)) {
        const availableTools = this.toolRegistry.getHandlerNames();
        const error = new Error(
          `Unknown tool: '${name}'. Available tools: ${availableTools.join(', ')}`
        );
        this.logger.warn('Tool execution failed - unknown tool', {
          requestedTool: name,
          availableTools,
        });
        return err(error);
      }

      // Provide minimal context if not provided
      // In a real implementation, this would come from the MCP server
      if (!context) {
        this.logger.warn('No tool context provided, tool execution may fail');
      }

      // Execute tool through registry
      const result = await this.toolRegistry.execute(
        name,
        args,
        context as ToolContext // Type assertion needed due to optional parameter
      );

      if (result.isErr()) {
        this.logger.error(`Tool execution failed: ${name}`, {
          error: result.error,
          args,
        });
        return result;
      }

      this.logger.info(`Tool executed successfully: ${name}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error executing tool: ${name}`, {
        error,
        args,
      });

      // Return user-friendly error result
      return err(new Error(`Tool execution failed: ${message}`));
    }
  }

  /**
   * Register a new tool handler dynamically
   *
   * @param handler - Tool handler to register
   * @returns Result indicating success or error
   */
  registerTool(handler: ToolHandler): Result<void, Error> {
    try {
      this.toolRegistry.register(handler);
      this.logger.info(`Tool handler registered: ${handler.name}`);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to register tool handler', error);
      return err(new Error(`Tool registration failed: ${message}`));
    }
  }

  /**
   * Unregister a tool handler
   *
   * @param name - Name of tool to unregister
   * @returns Result indicating success or error
   */
  unregisterTool(name: string): Result<void, Error> {
    try {
      this.toolRegistry.unregister(name);
      this.logger.info(`Tool handler unregistered: ${name}`);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to unregister tool handler: ${name}`, error);
      return err(new Error(`Tool unregistration failed: ${message}`));
    }
  }

  /**
   * Get list of registered tool names
   *
   * @returns Array of tool names currently registered
   */
  getRegisteredTools(): string[] {
    return this.toolRegistry.getHandlerNames();
  }

  /**
   * Get comprehensive statistics about registered tools
   *
   * @returns Statistics object with tool counts and names
   */
  getToolStatistics(): {
    totalTools: number;
    toolNames: string[];
    registryType: string;
  } {
    const toolNames = this.toolRegistry.getHandlerNames();

    return {
      totalTools: toolNames.length,
      toolNames,
      registryType: 'ToolRegistry (Modern Architecture)',
    };
  }
}
