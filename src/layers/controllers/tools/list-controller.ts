// Tools List Controller
import type {
  ListToolsRequest,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

import { BaseController } from '../base.js';

// Forward declaration - will be defined in services layer
interface ToolService {
  listTools(): Promise<ListToolsResult>;
}

export class ListToolsController extends BaseController<'tools/list'> {
  readonly method = 'tools/list' as const;

  constructor(private toolService: ToolService) {
    super();
  }

  async handle(_request: ListToolsRequest): Promise<ListToolsResult> {
    this.logger.debug('Handling tools/list request');

    try {
      const result = await this.toolService.listTools();

      this.logger.debug(`Listed ${result.tools.length} tools`);
      return result;
    } catch (error) {
      this.handleError(error, 'Failed to list tools');
    }
  }
}
