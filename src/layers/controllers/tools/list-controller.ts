// Tools List Controller
import type {
  ListToolsRequest,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

import type { ToolService } from '../../../interfaces/services.js';
import { BaseController } from '../base.js';

export class ListToolsController extends BaseController<'tools/list'> {
  readonly method = 'tools/list' as const;

  constructor(private toolService: ToolService) {
    super();
  }

  async handle(_request: ListToolsRequest): Promise<ListToolsResult> {
    this.logger.debug('Handling tools/list request');

    const result = await this.toolService.listTools();

    if (result.isErr()) {
      this.handleError(result.error, 'Failed to list tools');
    }

    const tools = result.value;
    this.logger.debug(`Listed ${tools.tools.length} tools`);
    return tools;
  }
}
