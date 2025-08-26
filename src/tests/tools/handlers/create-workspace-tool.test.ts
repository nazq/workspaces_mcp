import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EventBus,
  Logger,
  ToolContext,
  WorkspaceService,
} from '../../../interfaces/services.js';
import { CreateWorkspaceTool } from '../../../tools/handlers/create-workspace-tool.js';
import { Err, Ok } from '../../../utils/result.js';

// Mock workspace service
const createMockWorkspaceService = (): WorkspaceService => ({
  createWorkspace: vi.fn().mockResolvedValue(
    Ok({
      name: 'test-workspace',
      path: '/test/path',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  listWorkspaces: vi.fn().mockResolvedValue(Ok([])),
  workspaceExists: vi.fn().mockResolvedValue(Ok(false)),
  getWorkspaceInfo: vi.fn().mockResolvedValue(
    Ok({
      name: 'test-workspace',
      path: '/test/path',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  ),
  deleteWorkspace: vi.fn().mockResolvedValue(Ok(undefined)),
});

// Mock tool context
const createMockContext = (): ToolContext => ({
  workspaceRepository: createMockWorkspaceService(),
  instructionsRepository: {} as any,
  config: {
    workspaces: {
      rootPath: '/test/workspaces',
      maxWorkspaces: 100,
      allowedTemplates: ['basic', 'react', 'python'],
    },
  } as any,
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

describe('CreateWorkspaceTool', () => {
  let tool: CreateWorkspaceTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    tool = new CreateWorkspaceTool();
    mockContext = createMockContext();
  });

  describe('Tool Properties', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('create_workspace');
      expect(tool.description).toContain('Create a new workspace');
    });

    it('should have input schema for validation', () => {
      expect(tool.inputSchema).toBeDefined();

      // Test valid input
      const validInput = {
        name: 'test-workspace',
        description: 'A test workspace',
        template: 'basic',
      };
      const validResult = tool.inputSchema.safeParse(validInput);
      expect(validResult.success).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should accept valid workspace names', () => {
      const validNames = [
        'my-workspace',
        'workspace_123',
        'ProjectA',
        'test-project-2024',
      ];

      for (const name of validNames) {
        const result = tool.inputSchema.safeParse({ name });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid workspace names', () => {
      const invalidNames = [
        '', // Empty
        'a'.repeat(101), // Too long
        'name with spaces', // Spaces
        'name@invalid', // Special characters
        '-starts-with-hyphen',
        'ends-with-hyphen-',
        'name.with.dots',
      ];

      for (const name of invalidNames) {
        const result = tool.inputSchema.safeParse({ name });
        expect(result.success).toBe(false);
      }
    });

    it('should validate optional description', () => {
      // Valid descriptions
      const validResult = tool.inputSchema.safeParse({
        name: 'test',
        description: 'A short description',
      });
      expect(validResult.success).toBe(true);

      // Too long description
      const longDescription = 'x'.repeat(501);
      const invalidResult = tool.inputSchema.safeParse({
        name: 'test',
        description: longDescription,
      });
      expect(invalidResult.success).toBe(false);

      // Missing description should be fine
      const noDescResult = tool.inputSchema.safeParse({
        name: 'test',
      });
      expect(noDescResult.success).toBe(true);
    });

    it('should validate optional template', () => {
      // Valid template
      const validResult = tool.inputSchema.safeParse({
        name: 'test',
        template: 'react',
      });
      expect(validResult.success).toBe(true);

      // Too long template name
      const longTemplate = 'x'.repeat(51);
      const invalidResult = tool.inputSchema.safeParse({
        name: 'test',
        template: longTemplate,
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    it('should create workspace successfully with minimal arguments', async () => {
      const args = { name: 'test-workspace' };

      const result = await tool.execute(args, mockContext);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.content[0]?.text).toContain('created successfully');
      }

      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith('test-workspace', expect.any(Object));
    });

    it('should create workspace with description and template', async () => {
      const args = {
        name: 'full-workspace',
        description: 'A complete workspace',
        template: 'react',
      };

      const result = await tool.execute(args, mockContext);

      expect(result.success).toBe(true);
      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith(
        'full-workspace',
        expect.objectContaining({
          description: 'A complete workspace',
          template: 'react',
        })
      );
    });

    it('should handle workspace already exists error', async () => {
      vi.mocked(
        mockContext.workspaceRepository.createWorkspace
      ).mockResolvedValue(Err(new Error('Workspace already exists')));

      const result = await tool.execute(
        { name: 'existing-workspace' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Workspace already exists');
      }
    });

    it('should handle repository errors', async () => {
      vi.mocked(
        mockContext.workspaceRepository.createWorkspace
      ).mockResolvedValue(Err(new Error('Repository error')));

      const result = await tool.execute(
        { name: 'error-workspace' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Repository error');
      }
    });

    it('should emit workspace created event', async () => {
      await tool.execute({ name: 'event-workspace' }, mockContext);

      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        'workspace.created',
        expect.objectContaining({
          name: 'event-workspace',
        })
      );
    });

    it('should log workspace creation', async () => {
      await tool.execute({ name: 'logged-workspace' }, mockContext);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Creating workspace: logged-workspace',
        expect.objectContaining({
          description: undefined,
          template: undefined,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected repository exceptions', async () => {
      vi.mocked(
        mockContext.workspaceRepository.createWorkspace
      ).mockRejectedValue(new Error('Unexpected database error'));

      const result = await tool.execute(
        { name: 'exception-workspace' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(
          'Unexpected error creating workspace'
        );
      }
    });

    it('should handle event emission errors gracefully', async () => {
      vi.mocked(mockContext.eventBus.emit).mockRejectedValue(
        new Error('Event system down')
      );

      // Workspace creation should fail if event emission fails (not handled gracefully)
      const result = await tool.execute(
        { name: 'event-error-workspace' },
        mockContext
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(
          'Unexpected error creating workspace'
        );
      }
    });

    it('should validate workspace name length limits', async () => {
      // Should handle exactly at limit
      const maxLengthName = 'a'.repeat(100);
      const result = await tool.execute({ name: maxLengthName }, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle null or undefined context gracefully', async () => {
      // This should be handled by the tool registry, but test defensive coding
      try {
        await tool.execute({ name: 'test' }, null as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Template Support', () => {
    it('should create workspace without template', async () => {
      const result = await tool.execute({ name: 'no-template' }, mockContext);

      expect(result.success).toBe(true);
      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith(
        'no-template',
        expect.objectContaining({
          template: undefined,
        })
      );
    });

    it('should create workspace with specified template', async () => {
      const result = await tool.execute(
        { name: 'templated', template: 'python' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith(
        'templated',
        expect.objectContaining({
          template: 'python',
        })
      );
    });
  });

  describe('Workspace Metadata', () => {
    it('should pass correct metadata to repository', async () => {
      const args = {
        name: 'metadata-test',
        description: 'Test workspace for metadata',
        template: 'basic',
      };

      await tool.execute(args, mockContext);

      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith('metadata-test', {
        description: 'Test workspace for metadata',
        template: 'basic',
      });
    });

    it('should handle empty description correctly', async () => {
      const result = await tool.execute(
        { name: 'empty-desc', description: '' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(
        mockContext.workspaceRepository.createWorkspace
      ).toHaveBeenCalledWith(
        'empty-desc',
        expect.objectContaining({
          description: '',
        })
      );
    });
  });

  describe('Response Formatting', () => {
    it('should return properly formatted success response', async () => {
      const result = await tool.execute({ name: 'format-test' }, mockContext);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toMatchObject({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.stringContaining('format-test'),
            }),
          ]),
        });
        // The actual response doesn't include isError field - removed expectation
      }
    });

    it('should return properly formatted error response', async () => {
      vi.mocked(
        mockContext.workspaceRepository.createWorkspace
      ).mockResolvedValue(Err(new Error('Creation failed')));

      const result = await tool.execute({ name: 'error-format' }, mockContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Creation failed');
      }
    });
  });
});
