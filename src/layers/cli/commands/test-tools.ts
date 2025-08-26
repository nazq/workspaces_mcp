// Test MCP Tools Command
import { getError, getValue, isErr } from '../../../utils/result.js';
import type { ToolService } from '../../services/tool-service.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class TestToolsCommand extends BaseCliCommand {
  readonly name = 'test-tools';
  readonly description = 'Test MCP tool functionality';
  readonly usage = 'test-tools [tool-name] [--list] [--verbose|-v]';

  constructor(
    context: CliContext,
    private toolService: ToolService
  ) {
    super(context);
  }

  async execute(args: string[]): Promise<void> {
    const { flags, remaining } = this.parseFlags(args);
    const verbose = flags.verbose || flags.v;
    const listOnly = flags.list;

    try {
      // List available tools
      const toolsResult = await this.toolService.listTools();

      if (isErr(toolsResult)) {
        this.context.output.error(
          `Failed to list tools: ${getError(toolsResult).message}`
        );
        return;
      }

      const tools = getValue(toolsResult).tools;

      if (listOnly || remaining.length === 0) {
        this.context.output.info(`Available tools (${tools.length}):`);

        if (verbose) {
          this.context.output.table(
            tools.map(
              (tool: {
                name: string;
                description?: string;
                inputSchema?: unknown;
              }) => ({
                name: tool.name,
                description: tool.description || 'No description',
                'input-schema': tool.inputSchema ? 'defined' : 'none',
              })
            )
          );
        } else {
          tools.forEach((tool: { name: string; description?: string }) => {
            this.context.output.success(
              `${tool.name}: ${tool.description || 'No description'}`
            );
          });
        }
        return;
      }

      // Test specific tool
      const [toolName] = remaining;
      const tool = tools.find((t: { name: string }) => t.name === toolName);

      if (!tool) {
        this.context.output.error(`Tool '${toolName}' not found`);
        this.context.output.info('Available tools:');
        tools.forEach((t: { name: string }) =>
          this.context.output.info(`  - ${t.name}`)
        );
        return;
      }

      this.context.output.info(`Testing tool: ${tool.name}`);
      this.context.output.info(
        `Description: ${tool.description || 'No description'}`
      );

      if (verbose && tool.inputSchema) {
        this.context.output.info('Input schema:');
        this.context.output.json(tool.inputSchema);
      }

      // For tools that don't require complex input, we can test them
      if (toolName === 'list-workspaces') {
        this.context.output.info('Executing list-workspaces...');
        const result = await this.toolService.callTool(toolName, {});

        if (isErr(result)) {
          this.context.output.error(
            `Tool execution failed: ${getError(result).message}`
          );
          return;
        }

        this.context.output.success('Tool executed successfully');

        if (verbose) {
          this.context.output.json(getValue(result));
        } else {
          this.context.output.info('Result: Success');
          if (getValue(result).content) {
            this.context.output.info(
              `Content items: ${getValue(result).content.length}`
            );
          }
        }
      } else {
        this.context.output.warn(
          'Tool requires specific arguments - manual testing needed'
        );
        this.context.output.info(
          'Use MCP Inspector or client for full testing'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.output.error(`Failed to test tools: ${message}`);
      throw error;
    }
  }
}
