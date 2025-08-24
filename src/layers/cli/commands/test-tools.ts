// Test MCP Tools Command
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
      const tools = await this.toolService.listTools();

      if (listOnly || remaining.length === 0) {
        this.context.output.info(`Available tools (${tools.tools.length}):`);

        if (verbose) {
          this.context.output.table(
            tools.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description || 'No description',
              'input-schema': tool.inputSchema ? 'defined' : 'none',
            }))
          );
        } else {
          tools.tools.forEach((tool: any) => {
            this.context.output.success(
              `${tool.name}: ${tool.description || 'No description'}`
            );
          });
        }
        return;
      }

      // Test specific tool
      const [toolName] = remaining;
      const tool = tools.tools.find((t: any) => t.name === toolName);

      if (!tool) {
        this.context.output.error(`Tool '${toolName}' not found`);
        this.context.output.info('Available tools:');
        tools.tools.forEach((t: any) =>
          this.context.output.info(`  - ${t.name}`)
        );
        return;
      }

      this.context.output.info(`Testing tool: ${tool.name}`);
      this.context.output.info(
        `Description: ${(tool as any).description || 'No description'}`
      );

      if (verbose && (tool as any).inputSchema) {
        this.context.output.info('Input schema:');
        this.context.output.json((tool as any).inputSchema);
      }

      // For tools that don't require complex input, we can test them
      if (toolName === 'list-workspaces') {
        this.context.output.info('Executing list-workspaces...');
        const result = await this.toolService.callTool(toolName, {});
        this.context.output.success('Tool executed successfully');

        if (verbose) {
          this.context.output.json(result);
        } else {
          this.context.output.info(
            `Result: ${result.isError ? 'Error' : 'Success'}`
          );
          if (result.content) {
            this.context.output.info(`Content items: ${result.content.length}`);
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
