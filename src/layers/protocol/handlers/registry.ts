// Protocol Handler Registry
import { createChildLogger } from '../../../utils/logger.js';
import type { AnyMcpHandler, McpHandler, McpMethod } from '../types.js';

const logger = createChildLogger('protocol:registry');

export class HandlerRegistry {
  private handlers = new Map<McpMethod, AnyMcpHandler>();

  register<T extends McpMethod>(handler: McpHandler<T>): void {
    logger.debug(`Registering handler for method: ${handler.method}`);

    if (this.handlers.has(handler.method)) {
      logger.warn(`Overriding existing handler for method: ${handler.method}`);
    }

    this.handlers.set(handler.method, handler as AnyMcpHandler);
    logger.info(`Handler registered for method: ${handler.method}`);
  }

  get<T extends McpMethod>(method: T): McpHandler<T> | undefined {
    return this.handlers.get(method) as McpHandler<T> | undefined;
  }

  has(method: McpMethod): boolean {
    return this.handlers.has(method);
  }

  getRegisteredMethods(): McpMethod[] {
    return Array.from(this.handlers.keys());
  }

  unregister(method: McpMethod): boolean {
    const existed = this.handlers.delete(method);
    if (existed) {
      logger.info(`Handler unregistered for method: ${method}`);
    } else {
      logger.warn(
        `Attempted to unregister non-existent handler for method: ${method}`
      );
    }
    return existed;
  }

  clear(): void {
    const methodCount = this.handlers.size;
    this.handlers.clear();
    logger.info(`Cleared all handlers (${methodCount} methods)`);
  }
}
