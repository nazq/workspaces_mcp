// Resource Read Controller
import type {
  ReadResourceRequest,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

import { BaseController } from '../base.js';

// Forward declaration - will be defined in services layer
interface ResourceService {
  readResource(uri: string): Promise<ReadResourceResult>;
}

export class ReadResourceController extends BaseController<'resources/read'> {
  readonly method = 'resources/read' as const;

  constructor(private resourceService: ResourceService) {
    super();
  }

  async handle(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;
    this.logger.debug(`Handling resources/read request for URI: ${uri}`);

    try {
      const result = await this.resourceService.readResource(uri);

      this.logger.debug(`Successfully read resource: ${uri}`);
      return result;
    } catch (error) {
      this.handleError(error, `Failed to read resource: ${uri}`);
    }
  }
}
