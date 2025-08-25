import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  EventBus,
  Logger,
  ToolContext,
  ToolHandler,
  ToolRegistry,
} from '../../../interfaces/services.js';
import { ToolService } from '../../../layers/services/tool-service.js';
import { Ok, Err } from '../../../utils/result.js';

// Mock tool handler for testing
const createMockToolHandler = (name: string = 'mock-tool'): ToolHandler => ({
  name,
  description: `Mock tool: ${name}`,
  inputSchema: z.object({
    message: z.string(),
    count: z.number().optional(),
  }),
  async execute(args: any) {
    return Ok({
      content: [
        {
          type: 'text' as const,
          text: `Mock executed ${name} with: ${args.message}`,
        },
      ],
    });
  },
});

// Mock failing tool handler
const createFailingToolHandler = (): ToolHandler => ({
  name: 'failing-tool',
  description: 'Tool that always fails',
  inputSchema: z.object({
    message: z.string(),
  }),
  async execute() {
    return Err(new Error('Tool execution failed'));
  },
});

// Mock ToolRegistry
const createMockToolRegistry = (): ToolRegistry => ({
  register: vi.fn(),
  unregister: vi.fn(),
  listTools: vi.fn().mockReturnValue([
    {
      name: 'create_workspace',
      description: 'Create a new workspace',
      inputSchema: { type: 'object', properties: {} },
    } as Tool,
  ]),
  execute: vi.fn().mockResolvedValue(Ok({
    content: [{ type: 'text', text: 'Success' }],
  })),
  hasHandler: vi.fn().mockReturnValue(true),
  getHandlerNames: vi.fn().mockReturnValue(['create_workspace']),
  getHandler: vi.fn(),
  clear: vi.fn(),
});

// Mock logger
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
});

// Mock context
const createMockContext = (): ToolContext => ({
  workspaceRepository: {} as any,
  instructionsRepository: {} as any,
  config: {} as any,
  logger: createMockLogger(),
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  } as EventBus,
});

describe('ToolService', () => {
  let toolService: ToolService;
  let mockToolRegistry: ToolRegistry;
  let mockLogger: Logger;
  let mockContext: ToolContext;

  beforeEach(() => {
    mockToolRegistry = createMockToolRegistry();
    mockLogger = createMockLogger();
    mockContext = createMockContext();
    toolService = new ToolService(mockToolRegistry, mockLogger);
  });

  describe('Initialization', () => {
    it('should initialize with default tools', () => {
      expect(mockToolRegistry.register).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Default tool handlers initialized successfully');
    });

    it('should handle initialization errors', () => {
      const failingRegistry = createMockToolRegistry();
      vi.mocked(failingRegistry.register).mockImplementation(() => {
        throw new Error('Registration failed');
      });

      expect(() => new ToolService(failingRegistry, mockLogger)).toThrow(
        'Tool service initialization failed'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize default tool handlers',
        expect.any(Error)
      );
    });
  });

  describe('listTools', () => {
    it('should successfully list tools', async () => {
      const result = await toolService.listTools();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tools).toHaveLength(1);
        expect(result.data.tools[0]?.name).toBe('create_workspace');
      }

      expect(mockToolRegistry.listTools).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Listing all available tools from registry');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Registry contains 1 registered tools',
        { toolNames: ['create_workspace'] }
      );
    });

    it('should handle errors when listing tools', async () => {
      vi.mocked(mockToolRegistry.listTools).mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = await toolService.listTools();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Tool listing failed');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list tools from registry',
        expect.any(Error)
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockToolRegistry.listTools).mockImplementation(() => {
        throw 'String error';
      });

      const result = await toolService.listTools();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Tool listing failed: String error');
      }
    });
  });

  describe('callTool', () => {
    it('should successfully execute a tool', async () => {
      const result = await toolService.callTool(
        'create_workspace',
        { name: 'test' },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content[0]?.text).toBe('Success');
      }

      expect(mockToolRegistry.hasHandler).toHaveBeenCalledWith('create_workspace');
      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        'create_workspace',
        { name: 'test' },
        mockContext
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Executing tool via registry: create_workspace',
        { args: { name: 'test' } }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool executed successfully: create_workspace'
      );
    });

    it('should handle unknown tool error', async () => {
      vi.mocked(mockToolRegistry.hasHandler).mockReturnValue(false);
      vi.mocked(mockToolRegistry.getHandlerNames).mockReturnValue(['tool1', 'tool2']);

      const result = await toolService.callTool('unknown-tool', {}, mockContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe(
          "Unknown tool: 'unknown-tool'. Available tools: tool1, tool2"
        );
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Tool execution failed - unknown tool',
        {
          requestedTool: 'unknown-tool',
          availableTools: ['tool1', 'tool2'],
        }
      );
    });

    it('should handle tool execution errors', async () => {
      const executionError = new Error('Tool failed');
      vi.mocked(mockToolRegistry.execute).mockResolvedValue(Err(executionError));

      const result = await toolService.callTool('create_workspace', {}, mockContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(executionError);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tool execution failed: create_workspace',
        {
          error: executionError,
          args: {},
        }
      );
    });

    it('should handle missing context with warning', async () => {
      const result = await toolService.callTool('create_workspace', { name: 'test' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No tool context provided, tool execution may fail'
      );
      expect(mockToolRegistry.execute).toHaveBeenCalled();
    });

    it('should handle unexpected errors during execution', async () => {
      vi.mocked(mockToolRegistry.execute).mockRejectedValue(new Error('Unexpected error'));

      const result = await toolService.callTool('create_workspace', {}, mockContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Tool execution failed');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error executing tool: create_workspace',
        {
          error: expect.any(Error),
          args: {},
        }
      );
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockToolRegistry.execute).mockRejectedValue('String error');

      const result = await toolService.callTool('create_workspace', {}, mockContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Tool execution failed: String error');
      }
    });

    it('should use default empty args when none provided', async () => {
      await toolService.callTool('create_workspace', undefined, mockContext);

      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        'create_workspace',
        {},
        mockContext
      );
    });
  });

  describe('registerTool', () => {
    it('should successfully register a tool', () => {
      const mockHandler = createMockToolHandler('new-tool');

      const result = toolService.registerTool(mockHandler);

      expect(result.success).toBe(true);
      expect(mockToolRegistry.register).toHaveBeenCalledWith(mockHandler);
      expect(mockLogger.info).toHaveBeenCalledWith('Tool handler registered: new-tool');
    });

    it('should handle registration errors', () => {
      const mockHandler = createMockToolHandler('duplicate-tool');
      vi.mocked(mockToolRegistry.register).mockImplementation(() => {
        throw new Error('Tool already exists');
      });

      const result = toolService.registerTool(mockHandler);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Tool registration failed');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to register tool handler',
        expect.any(Error)
      );
    });

    it('should handle non-Error exceptions during registration', () => {
      const mockHandler = createMockToolHandler('error-tool');
      vi.mocked(mockToolRegistry.register).mockImplementation(() => {
        throw 'String error';
      });

      const result = toolService.registerTool(mockHandler);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Tool registration failed: String error');
      }
    });
  });

  describe('unregisterTool', () => {
    it('should successfully unregister a tool', () => {
      const result = toolService.unregisterTool('test-tool');

      expect(result.success).toBe(true);
      expect(mockToolRegistry.unregister).toHaveBeenCalledWith('test-tool');
      expect(mockLogger.info).toHaveBeenCalledWith('Tool handler unregistered: test-tool');
    });

    it('should handle unregistration errors', () => {
      vi.mocked(mockToolRegistry.unregister).mockImplementation(() => {
        throw new Error('Unregistration failed');
      });

      const result = toolService.unregisterTool('test-tool');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Tool unregistration failed');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to unregister tool handler: test-tool',
        expect.any(Error)
      );
    });

    it('should handle non-Error exceptions during unregistration', () => {
      vi.mocked(mockToolRegistry.unregister).mockImplementation(() => {
        throw 'String error';
      });

      const result = toolService.unregisterTool('test-tool');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Tool unregistration failed: String error');
      }
    });
  });

  describe('getRegisteredTools', () => {
    it('should return list of registered tool names', () => {
      vi.mocked(mockToolRegistry.getHandlerNames).mockReturnValue(['tool1', 'tool2', 'tool3']);

      const result = toolService.getRegisteredTools();

      expect(result).toEqual(['tool1', 'tool2', 'tool3']);
      expect(mockToolRegistry.getHandlerNames).toHaveBeenCalled();
    });

    it('should return empty array when no tools registered', () => {
      vi.mocked(mockToolRegistry.getHandlerNames).mockReturnValue([]);

      const result = toolService.getRegisteredTools();

      expect(result).toEqual([]);
    });
  });

  describe('getToolStatistics', () => {
    it('should return comprehensive tool statistics', () => {
      vi.mocked(mockToolRegistry.getHandlerNames).mockReturnValue([
        'create_workspace',
        'list_workspaces',
        'delete_workspace',
      ]);

      const result = toolService.getToolStatistics();

      expect(result).toEqual({
        totalTools: 3,
        toolNames: ['create_workspace', 'list_workspaces', 'delete_workspace'],
        registryType: 'ToolRegistry (Modern Architecture)',
      });
    });

    it('should handle empty registry', () => {
      vi.mocked(mockToolRegistry.getHandlerNames).mockReturnValue([]);

      const result = toolService.getToolStatistics();

      expect(result).toEqual({
        totalTools: 0,
        toolNames: [],
        registryType: 'ToolRegistry (Modern Architecture)',
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle registry being null or undefined gracefully', () => {
      // This tests the error handling in initialization
      const failingRegistry = {
        register: vi.fn().mockImplementation(() => {
          throw new TypeError('Cannot read properties of null');
        }),
      } as any;

      expect(() => new ToolService(failingRegistry, mockLogger)).toThrow(
        'Tool service initialization failed'
      );
    });

    it('should handle context being null during tool execution', async () => {
      const result = await toolService.callTool('create_workspace', {}, null as any);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No tool context provided, tool execution may fail'
      );
      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        'create_workspace',
        {},
        null
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: register, list, execute, unregister', async () => {
      const handler = createMockToolHandler('workflow-tool');

      // Register
      const registerResult = toolService.registerTool(handler);
      expect(registerResult.success).toBe(true);

      // List tools
      const listResult = await toolService.listTools();
      expect(listResult.success).toBe(true);

      // Execute tool
      const executeResult = await toolService.callTool('workflow-tool', { message: 'test' }, mockContext);
      expect(executeResult.success).toBe(true);

      // Unregister
      const unregisterResult = toolService.unregisterTool('workflow-tool');
      expect(unregisterResult.success).toBe(true);

      // Verify all operations were logged
      expect(mockLogger.info).toHaveBeenCalledTimes(5); // init + register + execute (2 calls) + unregister
    });

    it('should provide detailed error context for debugging', async () => {
      const complexArgs = {
        name: 'test-workspace',
        options: { template: 'react', description: 'A test project' },
        metadata: { tags: ['frontend', 'react'], priority: 'high' },
      };

      vi.mocked(mockToolRegistry.execute).mockRejectedValue(new Error('Complex execution error'));

      const result = await toolService.callTool('create_workspace', complexArgs, mockContext);

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error executing tool: create_workspace',
        {
          error: expect.any(Error),
          args: complexArgs,
        }
      );
    });
  });
});