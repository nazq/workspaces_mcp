/**
 * Tests for CallToolController
 */

import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it, vi } from 'vitest';

import { CallToolController } from '../../../../layers/controllers/tools/call-controller.js';

// Mock ToolService
interface ToolService {
  callTool(name: string, arguments_: unknown): Promise<CallToolResult>;
}

const mockToolService: ToolService = {
  callTool: vi.fn(),
};

describe('CallToolController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct method name', () => {
      const controller = new CallToolController(mockToolService);
      expect(controller.method).toBe('tools/call');
    });
  });

  describe('handle', () => {
    it('should successfully call a tool', async () => {
      const controller = new CallToolController(mockToolService);
      const mockResult: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'Tool executed successfully',
          },
        ],
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(mockResult);

      const request: CallToolRequest = {
        params: {
          name: 'create_workspace',
          arguments: {
            name: 'test-workspace',
            description: 'Test workspace',
          },
        },
      };

      const result = await controller.handle(request);

      expect(mockToolService.callTool).toHaveBeenCalledWith(
        'create_workspace',
        {
          name: 'test-workspace',
          description: 'Test workspace',
        }
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle tool call with no arguments', async () => {
      const controller = new CallToolController(mockToolService);
      const mockResult: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'No arguments required',
          },
        ],
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(mockResult);

      const request: CallToolRequest = {
        params: {
          name: 'list_workspaces',
          arguments: {},
        },
      };

      const result = await controller.handle(request);

      expect(mockToolService.callTool).toHaveBeenCalledWith(
        'list_workspaces',
        {}
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle tool call with complex arguments', async () => {
      const controller = new CallToolController(mockToolService);
      const mockResult: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'Complex operation completed',
          },
        ],
      };

      const complexArgs = {
        name: 'complex-workspace',
        options: {
          nested: true,
          settings: ['option1', 'option2'],
          metadata: {
            version: '1.0.0',
            tags: ['test', 'demo'],
          },
        },
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(mockResult);

      const request: CallToolRequest = {
        params: {
          name: 'complex_tool',
          arguments: complexArgs,
        },
      };

      const result = await controller.handle(request);

      expect(mockToolService.callTool).toHaveBeenCalledWith(
        'complex_tool',
        complexArgs
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle tool service errors', async () => {
      const controller = new CallToolController(mockToolService);
      const serviceError = new Error('Tool execution failed');

      vi.mocked(mockToolService.callTool).mockRejectedValue(serviceError);

      const request: CallToolRequest = {
        params: {
          name: 'failing_tool',
          arguments: { test: true },
        },
      };

      await expect(controller.handle(request)).rejects.toThrow(
        'Tool execution failed'
      );

      expect(mockToolService.callTool).toHaveBeenCalledWith('failing_tool', {
        test: true,
      });
    });

    it('should handle non-Error exceptions', async () => {
      const controller = new CallToolController(mockToolService);

      vi.mocked(mockToolService.callTool).mockRejectedValue('String error');

      const request: CallToolRequest = {
        params: {
          name: 'string_error_tool',
          arguments: {},
        },
      };

      await expect(controller.handle(request)).rejects.toThrow('String error');
    });

    it('should handle undefined arguments', async () => {
      const controller = new CallToolController(mockToolService);
      const mockResult: CallToolResult = {
        content: [{ type: 'text', text: 'Handled undefined args' }],
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(mockResult);

      const request: CallToolRequest = {
        params: {
          name: 'no_args_tool',
          arguments: undefined,
        },
      };

      const result = await controller.handle(request);

      expect(mockToolService.callTool).toHaveBeenCalledWith(
        'no_args_tool',
        undefined
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle tools that return multiple content items', async () => {
      const controller = new CallToolController(mockToolService);
      const mockResult: CallToolResult = {
        content: [
          { type: 'text', text: 'First result' },
          { type: 'text', text: 'Second result' },
        ],
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(mockResult);

      const request: CallToolRequest = {
        params: {
          name: 'multi_content_tool',
          arguments: {},
        },
      };

      const result = await controller.handle(request);

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toBe('First result');
      expect(result.content[1].text).toBe('Second result');
    });

    it('should pass through exact tool service result', async () => {
      const controller = new CallToolController(mockToolService);
      const originalResult: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'Original result from service',
          },
        ],
      };

      vi.mocked(mockToolService.callTool).mockResolvedValue(originalResult);

      const request: CallToolRequest = {
        params: {
          name: 'passthrough_tool',
          arguments: { data: 'test' },
        },
      };

      const result = await controller.handle(request);

      // Result should be exactly what the service returned
      expect(result).toBe(originalResult);
      expect(result.content[0]).toBe(originalResult.content[0]);
    });
  });
});
