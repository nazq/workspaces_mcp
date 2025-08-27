// Tool Call Controller
import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import type { ToolService } from '../../../interfaces/services.js';
import { getError, getValue, isErr } from '../../../utils/result.js';
import { BaseController } from '../base.js';

export class CallToolController extends BaseController<'tools/call'> {
  readonly method = 'tools/call' as const;

  constructor(private toolService: ToolService) {
    super();
  }

  async handle(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;
    this.logger.info(`Handling tools/call request for tool: ${name}`);

    const result = await this.toolService.callTool(name, args);

    if (isErr(result)) {
      this.handleError(getError(result), `Failed to execute tool: ${name}`);
    }

    const toolResult = getValue(result);
    this.logger.info(`Successfully executed tool: ${name}`);
    return toolResult;
  }
}
