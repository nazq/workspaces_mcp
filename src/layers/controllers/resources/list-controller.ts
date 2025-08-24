// Resources List Controller
import type {
  ListResourcesRequest,
  ListResourcesResult,
} from '@modelcontextprotocol/sdk/types.js';

import { BaseController } from '../base.js';

// Forward declaration - will be defined in services layer
interface ResourceService {
  listResources(): Promise<ListResourcesResult>;
}

export class ListResourcesController extends BaseController<'resources/list'> {
  readonly method = 'resources/list' as const;

  constructor(private resourceService: ResourceService) {
    super();
  }

  async handle(_request: ListResourcesRequest): Promise<ListResourcesResult> {
    this.logger.debug('Handling resources/list request');

    try {
      const result = await this.resourceService.listResources();

      this.logger.debug(`Listed ${result.resources.length} resources`);
      return result;
    } catch (error) {
      this.handleError(error, 'Failed to list resources');
    }
  }
}
