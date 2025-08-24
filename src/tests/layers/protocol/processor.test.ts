import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtocolProcessor } from '../../../layers/protocol/processor.js';
import {
  McpErrorCode,
  type McpRequest,
} from '../../../layers/protocol/types.js';

describe('ProtocolProcessor', () => {
  let processor: ProtocolProcessor;

  beforeEach(() => {
    processor = new ProtocolProcessor();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(processor).toBeInstanceOf(ProtocolProcessor);
    });

    it('should initialize with custom configuration', () => {
      const customProcessor = new ProtocolProcessor({
        validateRequests: false,
        logRequests: false,
        rateLimiting: { enabled: true, maxRequestsPerMinute: 30 },
      });

      expect(customProcessor).toBeInstanceOf(ProtocolProcessor);
    });
  });

  describe('getRegistry', () => {
    it('should return the handler registry', () => {
      const registry = processor.getRegistry();

      expect(registry).toBeDefined();
      expect(registry).toHaveProperty('register');
      expect(registry).toHaveProperty('get');
    });
  });

  describe('processRequest', () => {
    const validRequest: McpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    it('should reject invalid JSON-RPC requests', async () => {
      const response = await processor.processRequest({ invalid: 'request' });

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(McpErrorCode.INVALID_REQUEST);
    });

    it('should reject requests with invalid methods', async () => {
      const invalidMethodRequest = {
        ...validRequest,
        method: 'invalid/method',
      };

      const response = await processor.processRequest(invalidMethodRequest);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(McpErrorCode.METHOD_NOT_FOUND);
    });

    it('should reject requests when no handler is registered', async () => {
      const response = await processor.processRequest(validRequest);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(McpErrorCode.METHOD_NOT_FOUND);
      expect(response.error!.message).toContain(
        'No handler registered for method: tools/list'
      );
    });

    it('should successfully process request with registered handler', async () => {
      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockResolvedValue({ tools: [] }),
      };

      processor.getRegistry().register(mockHandler);

      const response = await processor.processRequest(validRequest);

      expect(response.result).toEqual({ tools: [] });
      expect(response.error).toBeUndefined();
      expect(mockHandler.handle).toHaveBeenCalledWith(validRequest);
    });

    it('should handle handler errors gracefully', async () => {
      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockRejectedValue(new Error('Handler failed')),
      };

      processor.getRegistry().register(mockHandler);

      const response = await processor.processRequest(validRequest);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(McpErrorCode.INTERNAL_ERROR);
      expect(response.error!.message).toBe('Handler failed');
    });

    it('should disable request logging when configured', async () => {
      const silentProcessor = new ProtocolProcessor({
        logRequests: false,
      });

      // This should not throw an error even with invalid request
      const result = await silentProcessor.processRequest({
        invalid: 'request',
      });

      // Should still return an error response
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(McpErrorCode.INVALID_REQUEST);
    });
  });

  describe('rate limiting', () => {
    const testRequest: McpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    it('should allow requests when rate limiting is disabled', async () => {
      const processor = new ProtocolProcessor({
        rateLimiting: { enabled: false, maxRequestsPerMinute: 1 },
      });

      // Make multiple requests that would exceed the limit
      const responses = await Promise.all([
        processor.processRequest(testRequest),
        processor.processRequest(testRequest),
        processor.processRequest(testRequest),
      ]);

      // All should be processed (though they'll fail due to no handler)
      responses.forEach((response) => {
        expect(response.error!.code).toBe(McpErrorCode.METHOD_NOT_FOUND); // Not rate limited
      });
    });

    it('should enforce rate limits when enabled', async () => {
      const processor = new ProtocolProcessor({
        rateLimiting: { enabled: true, maxRequestsPerMinute: 1 },
      });

      // First request should go through
      const firstResponse = await processor.processRequest(testRequest);
      expect(firstResponse.error!.code).toBe(McpErrorCode.METHOD_NOT_FOUND);

      // Second request should be rate limited
      const secondResponse = await processor.processRequest(testRequest);
      expect(secondResponse.error!.code).toBe(McpErrorCode.RATE_LIMITED);
    });
  });

  describe('request validation', () => {
    const testRequest: McpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    };

    it('should validate requests when validation is enabled', async () => {
      const processor = new ProtocolProcessor({
        validateRequests: true,
      });

      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockResolvedValue({ tools: [] }),
      };

      processor.getRegistry().register(mockHandler);

      // This will go through validation
      const response = await processor.processRequest(testRequest);

      expect(mockHandler.handle).toHaveBeenCalled();
    });

    it('should skip validation when disabled', async () => {
      const processor = new ProtocolProcessor({
        validateRequests: false,
      });

      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockResolvedValue({ tools: [] }),
      };

      processor.getRegistry().register(mockHandler);

      const response = await processor.processRequest(testRequest);

      expect(mockHandler.handle).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle requests without valid id', async () => {
      const response = await processor.processRequest({
        jsonrpc: '2.0',
        method: 'test',
        // Missing id
      });

      expect(response.error).toBeDefined();
      expect(response.id).toBe(0); // Default id for invalid requests
    });

    it('should preserve request id in successful responses', async () => {
      const testRequest: McpRequest = {
        jsonrpc: '2.0',
        id: 'test-id-123',
        method: 'tools/list',
        params: {},
      };

      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockResolvedValue({ tools: [] }),
      };

      processor.getRegistry().register(mockHandler);

      const response = await processor.processRequest(testRequest);

      expect(response.id).toBe('test-id-123');
    });

    it('should handle various error types', async () => {
      const testRequest: McpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      };

      const customError = new Error('Custom error') as Error & {
        code: number;
        data: any;
      };
      customError.code = 999;
      customError.data = { extra: 'info' };

      const mockHandler = {
        method: 'tools/list' as const,
        handle: vi.fn().mockRejectedValue(customError),
      };

      processor.getRegistry().register(mockHandler);

      const response = await processor.processRequest(testRequest);

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(999);
      expect(response.error!.message).toBe('Custom error');
      expect(response.error!.data).toEqual({ extra: 'info' });
    });
  });
});
