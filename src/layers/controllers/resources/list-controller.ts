// Resources List Controller
import type {
  ListResourcesRequest,
  ListResourcesResult,
} from '@modelcontextprotocol/sdk/types.js';

import type { ResourceService } from '../../../interfaces/services.js';
import { getError, getValue, isErr } from '../../../utils/result.js';
import { BaseController } from '../base.js';

export class ListResourcesController extends BaseController<'resources/list'> {
  readonly method = 'resources/list' as const;

  constructor(private resourceService: ResourceService) {
    super();
  }

  async handle(_request: ListResourcesRequest): Promise<ListResourcesResult> {
    this.logger.debug('Handling resources/list request');

    const result = await this.resourceService.listResources();

    if (isErr(result)) {
      this.handleError(getError(result), 'Failed to list resources');
    }

    const resources = getValue(result);
    this.logger.debug(`Listed ${resources.resources.length} resources`);
    return resources;
  }
}
