// Base Controller with Dependency Injection Support
import { createChildLogger } from '../../utils/logger.js';
import type { McpHandler, McpMethod } from '../protocol/index.js';

export abstract class BaseController<T extends McpMethod>
  implements McpHandler<T>
{
  abstract readonly method: T;
  protected logger = createChildLogger(
    `controller:${this.constructor.name.toLowerCase()}`
  );

  abstract handle(request: unknown): Promise<unknown>;

  protected validateRequest(
    request: unknown,
    validator: (req: unknown) => boolean
  ): void {
    if (!validator(request)) {
      throw new Error(`Invalid request format for ${this.method}`);
    }
  }

  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
    throw error instanceof Error ? error : new Error(message);
  }
}
