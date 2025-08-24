// Tool Call Controller
import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { BaseController } from '../base.js';

// Forward declaration - will be defined in services layer
interface ToolService {
  callTool(name: string, arguments_: unknown): Promise<CallToolResult>;
}

export class CallToolController extends BaseController<'tools/call'> {
  readonly method = 'tools/call' as const;

  constructor(private toolService: ToolService) {
    super();
  }

  async handle(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;
    this.logger.info(`Handling tools/call request for tool: ${name}`);

    try {
      const result = await this.toolService.callTool(name, args);

      this.logger.info(`Successfully executed tool: ${name}`);
      return result;
    } catch (error) {
      this.handleError(error, `Failed to execute tool: ${name}`);
    }
  }
}
