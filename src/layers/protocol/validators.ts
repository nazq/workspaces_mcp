// MCP Request Validation
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodSchema } from 'zod';

import { createChildLogger } from '../../utils/logger.js';

import { McpErrorCode, type McpMethod, type McpRequestMap } from './types.js';

const logger = createChildLogger('protocol:validator');

// Schema mapping for validation
const SCHEMA_MAP: Record<McpMethod, ZodSchema> = {
  'resources/list': ListResourcesRequestSchema,
  'resources/read': ReadResourceRequestSchema,
  'tools/list': ListToolsRequestSchema,
  'tools/call': CallToolRequestSchema,
};

export class RequestValidator {
  static validate<T extends McpMethod>(
    method: T,
    request: unknown
  ): McpRequestMap[T] {
    logger.debug(`Validating request for method: ${method}`);

    const schema = SCHEMA_MAP[method];
    if (!schema) {
      logger.error(`No validation schema found for method: ${method}`);
      throw this.createValidationError(
        `Unknown method: ${method}`,
        McpErrorCode.METHOD_NOT_FOUND
      );
    }

    try {
      const result = schema.parse(request);
      logger.debug(`Request validation successful for method: ${method}`);
      return result;
    } catch (error) {
      logger.error(`Request validation failed for method: ${method}`, error);
      throw this.createValidationError(
        `Invalid request parameters for ${method}`,
        McpErrorCode.INVALID_PARAMS,
        error
      );
    }
  }

  static validateJsonRpc(request: unknown): void {
    if (typeof request !== 'object' || request === null) {
      throw this.createValidationError(
        'Request must be an object',
        McpErrorCode.INVALID_REQUEST
      );
    }

    const req = request as Record<string, unknown>;

    if (req.jsonrpc !== '2.0') {
      throw this.createValidationError(
        'Invalid jsonrpc version',
        McpErrorCode.INVALID_REQUEST
      );
    }

    if (typeof req.id !== 'string' && typeof req.id !== 'number') {
      throw this.createValidationError(
        'Request ID must be string or number',
        McpErrorCode.INVALID_REQUEST
      );
    }

    if (typeof req.method !== 'string') {
      throw this.createValidationError(
        'Method must be a string',
        McpErrorCode.INVALID_REQUEST
      );
    }
  }

  static isValidMethod(method: string): method is McpMethod {
    return method in SCHEMA_MAP;
  }

  private static createValidationError(
    message: string,
    code: McpErrorCode,
    data?: unknown
  ): Error {
    const error = new Error(message) as Error & {
      code: McpErrorCode;
      data?: unknown;
    };
    error.code = code;
    error.data = data;
    return error;
  }
}
