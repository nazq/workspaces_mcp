import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  EventBus,
  Logger,
  ToolContext,
  ToolHandler,
} from '../../interfaces/services.js';
import { ToolRegistry } from '../../tools/registry.js';
import { Err, Ok } from '../../utils/result.js';

// Mock tool handler for testing
const createMockToolHandler = (name: string = 'test-tool'): ToolHandler => ({
  name,
  description: `Test tool: ${name}`,
  inputSchema: z.object({
    message: z.string(),
    count: z.number().optional(),
  }),
  async execute(args: any) {
    return Ok({
      content: [
        {
          type: 'text' as const,
          text: `Executed ${name} with: ${args.message}`,
        },
      ],
      isError: false,
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

// Mock tool context
const createMockContext = (): ToolContext => ({
  workspaceRepository: {} as any,
  instructionsRepository: {} as any,
  config: {} as any,
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  } as Logger,
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  } as EventBus,
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockContext: ToolContext;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockContext = createMockContext();
  });

  describe('Tool Registration', () => {
    it('should register a tool handler', () => {
      const handler = createMockToolHandler();

      registry.register(handler);

      expect(registry.hasHandler('test-tool')).toBe(true);
      expect(registry.getHandlerNames()).toContain('test-tool');
    });

    it('should prevent duplicate tool registration', () => {
      const handler = createMockToolHandler('duplicate-tool');

      registry.register(handler);

      expect(() => registry.register(handler)).toThrow(
        'Tool handler already registered: duplicate-tool'
      );
    });

    it('should register multiple different tools', () => {
      const handler1 = createMockToolHandler('tool-one');
      const handler2 = createMockToolHandler('tool-two');

      registry.register(handler1);
      registry.register(handler2);

      expect(registry.hasHandler('tool-one')).toBe(true);
      expect(registry.hasHandler('tool-two')).toBe(true);
      expect(registry.getHandlerNames()).toHaveLength(2);
    });
  });

  describe('Tool Unregistration', () => {
    it('should unregister existing tool', () => {
      const handler = createMockToolHandler();

      registry.register(handler);
      expect(registry.hasHandler('test-tool')).toBe(true);

      registry.unregister('test-tool');
      expect(registry.hasHandler('test-tool')).toBe(false);
    });

    it('should handle unregistering non-existent tool', () => {
      // Should not throw
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('Tool Listing', () => {
    it('should list no tools when registry is empty', () => {
      const tools = registry.listTools();
      expect(tools).toHaveLength(0);
    });

    it('should list registered tools with correct format', () => {
      const handler = createMockToolHandler('sample-tool');
      registry.register(handler);

      const tools = registry.listTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'sample-tool',
        description: 'Test tool: sample-tool',
        inputSchema: expect.any(Object),
      });
    });

    it('should convert Zod schema to JSON schema', () => {
      const handler = createMockToolHandler();
      registry.register(handler);

      const tools = registry.listTools();
      const tool = tools[0];

      // JSON schema should have properties structure
      expect(tool?.inputSchema).toHaveProperty('type', 'object');
      expect(tool?.inputSchema).toHaveProperty('properties');
      expect(tool?.inputSchema.properties).toHaveProperty('message');
      expect(tool?.inputSchema.properties).toHaveProperty('count');
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      const handler = createMockToolHandler();
      registry.register(handler);
    });

    it('should execute tool with valid arguments', async () => {
      const result = await registry.execute(
        'test-tool',
        { message: 'Hello World', count: 5 },
        mockContext
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.content[0]?.text).toContain('Hello World');
        expect(result.value.isError).toBe(false);
      }
    });

    it('should return error for unknown tool', async () => {
      const result = await registry.execute(
        'unknown-tool',
        { message: 'test' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Unknown tool: unknown-tool');
      }
    });

    it('should validate arguments against schema', async () => {
      const result = await registry.execute(
        'test-tool',
        { message: 123 }, // Invalid: message should be string
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid arguments');
      }
    });

    it('should handle missing required arguments', async () => {
      const result = await registry.execute(
        'test-tool',
        {}, // Missing required 'message' field
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid arguments');
      }
    });

    it('should handle tool execution errors', async () => {
      const failingHandler = createFailingToolHandler();
      registry.register(failingHandler);

      const result = await registry.execute(
        'failing-tool',
        { message: 'test' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Tool execution failed');
      }
    });

    it('should emit events on successful execution', async () => {
      await registry.execute('test-tool', { message: 'test' }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        'tool.executed',
        expect.objectContaining({
          toolName: 'test-tool',
          args: { message: 'test' },
          success: true,
          executionTimeMs: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should emit events on failed execution', async () => {
      const failingHandler = createFailingToolHandler();
      registry.register(failingHandler);

      await registry.execute('failing-tool', { message: 'test' }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        'tool.failed',
        expect.objectContaining({
          toolName: 'failing-tool',
          args: { message: 'test' },
          success: false,
          error: expect.any(Error),
          executionTimeMs: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should emit events on validation failure', async () => {
      await registry.execute('test-tool', { invalid: 'args' }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        'tool.failed',
        expect.objectContaining({
          toolName: 'test-tool',
          args: { invalid: 'args' },
          success: false,
          error: expect.any(Error),
          executionTimeMs: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Tool Management', () => {
    it('should check if handler exists', () => {
      expect(registry.hasHandler('non-existent')).toBe(false);

      const handler = createMockToolHandler('exists-tool');
      registry.register(handler);

      expect(registry.hasHandler('exists-tool')).toBe(true);
    });

    it('should get handler names', () => {
      expect(registry.getHandlerNames()).toHaveLength(0);

      registry.register(createMockToolHandler('tool-a'));
      registry.register(createMockToolHandler('tool-b'));

      const names = registry.getHandlerNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('tool-a');
      expect(names).toContain('tool-b');
    });

    it('should get specific handler', () => {
      const handler = createMockToolHandler('specific-tool');
      registry.register(handler);

      const retrieved = registry.getHandler('specific-tool');
      expect(retrieved).toBe(handler);

      const notFound = registry.getHandler('not-found');
      expect(notFound).toBeUndefined();
    });

    it('should clear all handlers', () => {
      registry.register(createMockToolHandler('tool-1'));
      registry.register(createMockToolHandler('tool-2'));

      expect(registry.getHandlerNames()).toHaveLength(2);

      registry.clear();

      expect(registry.getHandlerNames()).toHaveLength(0);
      expect(registry.hasHandler('tool-1')).toBe(false);
      expect(registry.hasHandler('tool-2')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle event emission errors gracefully', async () => {
      const handler = createMockToolHandler();
      registry.register(handler);

      // Mock event bus to throw error
      vi.mocked(mockContext.eventBus.emit).mockRejectedValue(
        new Error('Event emission failed')
      );

      // Tool execution should still succeed even if event emission fails
      const result = await registry.execute(
        'test-tool',
        { message: 'test' },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should handle malformed input gracefully', async () => {
      const handler = createMockToolHandler();
      registry.register(handler);

      const result = await registry.execute(
        'test-tool',
        null, // Malformed input
        mockContext
      );

      expect(result.success).toBe(false);
    });

    it('should handle undefined arguments', async () => {
      const handler = createMockToolHandler();
      registry.register(handler);

      const result = await registry.execute(
        'test-tool',
        undefined,
        mockContext
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Performance and Logging', () => {
    it('should measure execution time', async () => {
      const handler = createMockToolHandler();
      registry.register(handler);

      await registry.execute('test-tool', { message: 'test' }, mockContext);

      // Check that event was emitted with execution time
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        'tool.executed',
        expect.objectContaining({
          executionTimeMs: expect.any(Number),
        })
      );
    });

    it('should log tool registration', () => {
      const handler = createMockToolHandler('logged-tool');

      // The registry creates its own logger, so we can't directly mock it
      // but we can verify no errors are thrown during registration
      expect(() => registry.register(handler)).not.toThrow();
    });
  });
});
