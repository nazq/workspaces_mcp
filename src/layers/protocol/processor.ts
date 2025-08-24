// MCP Protocol Message Processor
import { createChildLogger } from '../../utils/logger.js';

import { HandlerRegistry } from './handlers/registry.js';
import type {
  McpError,
  McpRequest,
  McpResponse,
  ProtocolConfig,
} from './types.js';
import { McpErrorCode } from './types.js';
import { RequestValidator } from './validators.js';

const logger = createChildLogger('protocol:processor');

export class ProtocolProcessor {
  private registry = new HandlerRegistry();
  private config: Required<ProtocolConfig>;
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(config: Partial<ProtocolConfig> = {}) {
    this.config = {
      validateRequests: true,
      logRequests: true,
      rateLimiting: { enabled: false, maxRequestsPerMinute: 60 },
      ...config,
    };
  }

  getRegistry(): HandlerRegistry {
    return this.registry;
  }

  async processRequest(rawRequest: unknown): Promise<McpResponse> {
    const startTime = Date.now();

    try {
      // Basic JSON-RPC validation
      RequestValidator.validateJsonRpc(rawRequest);
      const request = rawRequest as McpRequest;

      if (this.config.logRequests) {
        logger.debug(
          `Processing request: ${request.method} (ID: ${request.id})`
        );
      }

      // Rate limiting check
      if (this.config.rateLimiting.enabled) {
        this.checkRateLimit(request.method);
      }

      // Method validation
      if (!RequestValidator.isValidMethod(request.method)) {
        throw this.createError(
          `Method not found: ${request.method}`,
          McpErrorCode.METHOD_NOT_FOUND,
          request.id
        );
      }

      // Get handler
      const handler = this.registry.get(request.method);
      if (!handler) {
        throw this.createError(
          `No handler registered for method: ${request.method}`,
          McpErrorCode.METHOD_NOT_FOUND,
          request.id
        );
      }

      // Request validation
      if (this.config.validateRequests) {
        const validatedRequest = RequestValidator.validate(
          request.method,
          request
        );
        request.params = validatedRequest.params;
      }

      // Execute handler
      // TypeScript can't narrow the union type automatically, so we need to cast
      // This is safe because the handler was retrieved by method match
      const result = await handler.handle(
        request as Parameters<typeof handler.handle>[0]
      );

      const duration = Date.now() - startTime;
      if (this.config.logRequests) {
        logger.debug(`Request completed: ${request.method} (${duration}ms)`);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Request failed (${duration}ms):`, error);

      if (this.isValidRequest(rawRequest)) {
        const request = rawRequest as McpRequest;
        return this.createErrorResponse(error, request.id);
      }

      return this.createErrorResponse(error, null);
    }
  }

  private checkRateLimit(method: string): void {
    if (!this.config.rateLimiting.enabled) return;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const clientKey = `global:${method}`; // Could be enhanced with client identification
    let clientData = this.requestCounts.get(clientKey);

    if (!clientData || clientData.resetTime < windowStart) {
      clientData = { count: 0, resetTime: now };
    }

    if (clientData.count >= this.config.rateLimiting.maxRequestsPerMinute) {
      throw this.createError(
        'Rate limit exceeded',
        McpErrorCode.RATE_LIMITED,
        null
      );
    }

    clientData.count++;
    this.requestCounts.set(clientKey, clientData);

    // Cleanup old entries
    if (Math.random() < 0.01) {
      // 1% chance to cleanup
      this.cleanupRateLimitData(windowStart);
    }
  }

  private cleanupRateLimitData(cutoff: number): void {
    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime < cutoff) {
        this.requestCounts.delete(key);
      }
    }
  }

  private isValidRequest(request: unknown): boolean {
    try {
      RequestValidator.validateJsonRpc(request);
      return true;
    } catch {
      return false;
    }
  }

  private createError(
    message: string,
    code: McpErrorCode,
    id: string | number | null
  ): Error {
    const error = new Error(message) as Error & {
      code: McpErrorCode;
      id: string | number | null;
    };
    error.code = code;
    error.id = id;
    return error;
  }

  private createErrorResponse(
    error: unknown,
    id: string | number | null
  ): McpResponse {
    let mcpError: McpError;

    if (error instanceof Error && 'code' in error) {
      mcpError = {
        code:
          'code' in error
            ? (error as { code: number }).code
            : McpErrorCode.INTERNAL_ERROR,
        message: error.message,
        data: 'data' in error ? (error as { data: unknown }).data : undefined,
      };
    } else {
      mcpError = {
        code: McpErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return {
      jsonrpc: '2.0',
      id: id ?? 0,
      error: mcpError,
    };
  }
}
