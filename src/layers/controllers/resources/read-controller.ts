// Resource Read Controller
import type {
  ReadResourceRequest,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

import type { ResourceService } from '../../../interfaces/services.js';
import { getError, getValue, isErr } from '../../../utils/result.js';
import { BaseController } from '../base.js';

export class ReadResourceController extends BaseController<'resources/read'> {
  readonly method = 'resources/read' as const;

  constructor(private resourceService: ResourceService) {
    super();
  }

  async handle(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;
    this.logger.debug(`Handling resources/read request for URI: ${uri}`);

    const result = await this.resourceService.readResource(uri);

    if (isErr(result)) {
      this.handleError(getError(result), `Failed to read resource: ${uri}`);
    }

    const resource = getValue(result);
    this.logger.debug(`Successfully read resource: ${uri}`);
    return resource;
  }
}
