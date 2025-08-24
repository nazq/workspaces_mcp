import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  InstructionsRepository,
  WorkspaceRepository,
} from '../../../layers/data/index.js';
import { ToolService } from '../../../layers/services/tool-service.js';
import type {
  SharedInstruction,
  WorkspaceMetadata,
} from '../../../types/index.js';

// Mock logger to avoid console output during tests
vi.mock('../../../utils/logger.js', () => ({
  createChildLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('ToolService', () => {
  let toolService: ToolService;
  let mockWorkspaceRepository: WorkspaceRepository;
  let mockInstructionsRepository: InstructionsRepository;

  const mockWorkspaceMetadata: WorkspaceMetadata = {
    name: 'test-workspace',
    description: 'A test workspace',
    path: '/path/to/workspace',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    modifiedAt: new Date('2024-01-02T00:00:00Z'),
  };

  const mockSharedInstruction: SharedInstruction = {
    name: 'react-guide',
    description: 'React development guide',
    content: '# React Guide\n\nUse hooks and functional components.',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    modifiedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    // Create mock repositories
    mockWorkspaceRepository = {
      list: vi.fn(),
      create: vi.fn(),
      getMetadata: vi.fn(),
    } as any;

    mockInstructionsRepository = {
      listShared: vi.fn(),
      createShared: vi.fn(),
      updateGlobal: vi.fn(),
    } as any;

    toolService = new ToolService({
      workspaceRepository: mockWorkspaceRepository,
      instructionsRepository: mockInstructionsRepository,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listTools', () => {
    it('should return all available tools', async () => {
      const result = await toolService.listTools();

      expect(result.tools).toHaveLength(6);

      const toolNames = result.tools.map((tool) => tool.name);
      expect(toolNames).toContain('create_workspace');
      expect(toolNames).toContain('list_workspaces');
      expect(toolNames).toContain('get_workspace_info');
      expect(toolNames).toContain('create_shared_instruction');
      expect(toolNames).toContain('list_shared_instructions');
      expect(toolNames).toContain('update_global_instructions');
    });

    it('should include proper schemas for each tool', async () => {
      const result = await toolService.listTools();

      const createWorkspaceTool = result.tools.find(
        (tool) => tool.name === 'create_workspace'
      );
      expect(createWorkspaceTool?.inputSchema).toBeDefined();
      expect(createWorkspaceTool?.inputSchema.properties).toHaveProperty(
        'name'
      );
      expect(createWorkspaceTool?.inputSchema.required).toContain('name');

      const createInstructionTool = result.tools.find(
        (tool) => tool.name === 'create_shared_instruction'
      );
      expect(createInstructionTool?.inputSchema.required).toEqual([
        'name',
        'content',
      ]);
    });

    it('should include descriptions for all tools', async () => {
      const result = await toolService.listTools();

      result.tools.forEach((tool) => {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('callTool', () => {
    describe('create_workspace', () => {
      it('should create workspace with required arguments', async () => {
        const args = { name: 'test-workspace' };
        vi.mocked(mockWorkspaceRepository.create).mockResolvedValue();

        const result = await toolService.callTool('create_workspace', args);

        expect(mockWorkspaceRepository.create).toHaveBeenCalledWith(
          'test-workspace',
          {}
        );
        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain(
          "Workspace 'test-workspace' created successfully"
        );
        expect(result.isError).toBeUndefined();
      });

      it('should create workspace with optional arguments', async () => {
        const args = {
          name: 'test-workspace',
          description: 'Test description',
          template: 'react-ts',
        };
        vi.mocked(mockWorkspaceRepository.create).mockResolvedValue();

        const result = await toolService.callTool('create_workspace', args);

        expect(mockWorkspaceRepository.create).toHaveBeenCalledWith(
          'test-workspace',
          {
            description: 'Test description',
            template: 'react-ts',
          }
        );
        expect(result.content[0]?.text).toContain(
          "Workspace 'test-workspace' created successfully"
        );
      });

      it('should handle workspace creation errors', async () => {
        const args = { name: 'test-workspace' };
        vi.mocked(mockWorkspaceRepository.create).mockRejectedValue(
          new Error('Workspace already exists')
        );

        const result = await toolService.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Workspace already exists');
      });

      it('should validate arguments schema', async () => {
        const args = { name: '' }; // Invalid: empty name

        const result = await toolService.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Error executing tool');
      });

      it('should handle missing name argument', async () => {
        const args = {}; // Missing required name

        const result = await toolService.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Error executing tool');
      });
    });

    describe('list_workspaces', () => {
      it('should list workspaces successfully', async () => {
        const workspace2 = { ...mockWorkspaceMetadata, name: 'workspace2' };
        vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
          mockWorkspaceMetadata,
          workspace2,
        ]);

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain('Available workspaces (2)');
        expect(result.content[0]?.text).toContain('test-workspace');
        expect(result.content[0]?.text).toContain('workspace2');
        expect(result.isError).toBeUndefined();
      });

      it('should handle empty workspace list', async () => {
        vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.content[0]?.text).toBe('No workspaces found');
      });

      it('should include workspace descriptions', async () => {
        vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
          mockWorkspaceMetadata,
        ]);

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.content[0]?.text).toContain('A test workspace');
      });

      it('should handle workspaces without descriptions', async () => {
        const workspaceWithoutDescription = {
          ...mockWorkspaceMetadata,
          description: undefined,
        };
        vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([
          workspaceWithoutDescription,
        ]);

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.content[0]?.text).toContain('test-workspace');
        // Should not have description colon after workspace name
        expect(result.content[0]?.text).toContain('- test-workspace');
        expect(result.content[0]?.text).not.toContain('test-workspace:');
      });

      it('should handle repository errors', async () => {
        vi.mocked(mockWorkspaceRepository.list).mockRejectedValue(
          new Error('Database connection failed')
        );

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Database connection failed');
      });
    });

    describe('get_workspace_info', () => {
      it('should get workspace info successfully', async () => {
        const args = { name: 'test-workspace' };
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          mockWorkspaceMetadata
        );

        const result = await toolService.callTool('get_workspace_info', args);

        expect(mockWorkspaceRepository.getMetadata).toHaveBeenCalledWith(
          'test-workspace'
        );
        expect(result.content[0]?.text).toContain('Name: test-workspace');
        expect(result.content[0]?.text).toContain(
          'Description: A test workspace'
        );
        expect(result.content[0]?.text).toContain('Path: /path/to/workspace');
        expect(result.content[0]?.text).toContain(
          'Created: 2024-01-01T00:00:00.000Z'
        );
        expect(result.content[0]?.text).toContain(
          'Modified: 2024-01-02T00:00:00.000Z'
        );
      });

      it('should handle workspace without description', async () => {
        const workspaceWithoutDescription = {
          ...mockWorkspaceMetadata,
          description: undefined,
        };
        const args = { name: 'test-workspace' };
        vi.mocked(mockWorkspaceRepository.getMetadata).mockResolvedValue(
          workspaceWithoutDescription
        );

        const result = await toolService.callTool('get_workspace_info', args);

        expect(result.content[0]?.text).not.toContain('Description:');
        expect(result.content[0]?.text).toContain('Name: test-workspace');
      });

      it('should handle non-existent workspace', async () => {
        const args = { name: 'non-existent' };
        vi.mocked(mockWorkspaceRepository.getMetadata).mockRejectedValue(
          new Error('Workspace not found')
        );

        const result = await toolService.callTool('get_workspace_info', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Workspace not found');
      });

      it('should validate arguments', async () => {
        const args = { name: '' }; // Invalid: empty name

        const result = await toolService.callTool('get_workspace_info', args);

        expect(result.isError).toBe(true);
      });
    });

    describe('create_shared_instruction', () => {
      it('should create shared instruction with required arguments', async () => {
        const args = {
          name: 'react-guide',
          content: '# React Guide\n\nUse hooks.',
        };
        vi.mocked(mockInstructionsRepository.createShared).mockResolvedValue();

        const result = await toolService.callTool(
          'create_shared_instruction',
          args
        );

        expect(mockInstructionsRepository.createShared).toHaveBeenCalledWith(
          'react-guide',
          {
            name: 'react-guide',
            content: '# React Guide\n\nUse hooks.',
            description: undefined,
            variables: {},
          }
        );
        expect(result.content[0]?.text).toContain(
          "Shared instruction 'react-guide' created successfully"
        );
      });

      it('should create shared instruction with all optional arguments', async () => {
        const args = {
          name: 'react-guide',
          content: '# React Guide\n\nUse hooks.',
          description: 'Guide for React development',
          variables: { framework: 'React', version: '18' },
        };
        vi.mocked(mockInstructionsRepository.createShared).mockResolvedValue();

        const result = await toolService.callTool(
          'create_shared_instruction',
          args
        );

        expect(mockInstructionsRepository.createShared).toHaveBeenCalledWith(
          'react-guide',
          {
            name: 'react-guide',
            content: '# React Guide\n\nUse hooks.',
            description: 'Guide for React development',
            variables: { framework: 'React', version: '18' },
          }
        );
        expect(result.content[0]?.text).toContain(
          "Shared instruction 'react-guide' created successfully"
        );
      });

      it('should handle creation errors', async () => {
        const args = {
          name: 'react-guide',
          content: '# React Guide',
        };
        vi.mocked(mockInstructionsRepository.createShared).mockRejectedValue(
          new Error('Instruction already exists')
        );

        const result = await toolService.callTool(
          'create_shared_instruction',
          args
        );

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Instruction already exists');
      });

      it('should validate required arguments', async () => {
        const args = { name: 'test' }; // Missing content

        const result = await toolService.callTool(
          'create_shared_instruction',
          args
        );

        expect(result.isError).toBe(true);
      });

      it('should handle empty content validation', async () => {
        const args = { name: 'test', content: '' }; // Empty content

        const result = await toolService.callTool(
          'create_shared_instruction',
          args
        );

        expect(result.isError).toBe(true);
      });
    });

    describe('list_shared_instructions', () => {
      it('should list shared instructions successfully', async () => {
        const instruction2 = { ...mockSharedInstruction, name: 'python-guide' };
        vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
          mockSharedInstruction,
          instruction2,
        ]);

        const result = await toolService.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toContain(
          'Available shared instructions (2)'
        );
        expect(result.content[0]?.text).toContain('react-guide');
        expect(result.content[0]?.text).toContain('python-guide');
      });

      it('should handle empty instructions list', async () => {
        vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([]);

        const result = await toolService.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toBe('No shared instructions found');
      });

      it('should include instruction descriptions', async () => {
        vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
          mockSharedInstruction,
        ]);

        const result = await toolService.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toContain('React development guide');
      });

      it('should handle instructions without descriptions', async () => {
        const instructionWithoutDescription = {
          ...mockSharedInstruction,
          description: undefined,
        };
        vi.mocked(mockInstructionsRepository.listShared).mockResolvedValue([
          instructionWithoutDescription,
        ]);

        const result = await toolService.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toContain('react-guide');
        // Should not have description colon after instruction name
        expect(result.content[0]?.text).toContain('- react-guide');
        expect(result.content[0]?.text).not.toContain('react-guide:');
      });

      it('should handle repository errors', async () => {
        vi.mocked(mockInstructionsRepository.listShared).mockRejectedValue(
          new Error('File system error')
        );

        const result = await toolService.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('File system error');
      });
    });

    describe('update_global_instructions', () => {
      it('should update global instructions with required arguments', async () => {
        const args = {
          content: '# Global Instructions\n\nThese apply everywhere.',
        };
        vi.mocked(mockInstructionsRepository.updateGlobal).mockResolvedValue();

        const result = await toolService.callTool(
          'update_global_instructions',
          args
        );

        expect(mockInstructionsRepository.updateGlobal).toHaveBeenCalledWith({
          content: '# Global Instructions\n\nThese apply everywhere.',
          variables: {},
        });
        expect(result.content[0]?.text).toBe(
          'Global instructions updated successfully'
        );
      });

      it('should update global instructions with variables', async () => {
        const args = {
          content: '# Global Instructions\n\nProject: {{project}}',
          variables: { project: 'My Project' },
        };
        vi.mocked(mockInstructionsRepository.updateGlobal).mockResolvedValue();

        const result = await toolService.callTool(
          'update_global_instructions',
          args
        );

        expect(mockInstructionsRepository.updateGlobal).toHaveBeenCalledWith({
          content: '# Global Instructions\n\nProject: {{project}}',
          variables: { project: 'My Project' },
        });
        expect(result.content[0]?.text).toBe(
          'Global instructions updated successfully'
        );
      });

      it('should handle update errors', async () => {
        const args = {
          content: '# Global Instructions',
        };
        vi.mocked(mockInstructionsRepository.updateGlobal).mockRejectedValue(
          new Error('Permission denied')
        );

        const result = await toolService.callTool(
          'update_global_instructions',
          args
        );

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Permission denied');
      });

      it('should validate required content', async () => {
        const args = {}; // Missing content

        const result = await toolService.callTool(
          'update_global_instructions',
          args
        );

        expect(result.isError).toBe(true);
      });

      it('should validate empty content', async () => {
        const args = { content: '' }; // Empty content

        const result = await toolService.callTool(
          'update_global_instructions',
          args
        );

        expect(result.isError).toBe(true);
      });
    });

    describe('unknown tools', () => {
      it('should handle unknown tool names', async () => {
        const result = await toolService.callTool('unknown_tool', {});

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Unknown tool: unknown_tool');
      });
    });

    describe('error handling', () => {
      it('should handle non-Error exceptions', async () => {
        vi.mocked(mockWorkspaceRepository.create).mockRejectedValue(
          'String error'
        );

        const result = await toolService.callTool('create_workspace', {
          name: 'test',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('String error');
      });

      it('should handle null/undefined exceptions', async () => {
        vi.mocked(mockWorkspaceRepository.create).mockRejectedValue(null);

        const result = await toolService.callTool('create_workspace', {
          name: 'test',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('null');
      });

      it('should handle object exceptions', async () => {
        vi.mocked(mockWorkspaceRepository.create).mockRejectedValue({
          code: 500,
          message: 'Server error',
        });

        const result = await toolService.callTool('create_workspace', {
          name: 'test',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('[object Object]');
      });
    });

    describe('schema validation edge cases', () => {
      it('should handle invalid argument types for create_workspace', async () => {
        const args = { name: 123 }; // Invalid type

        const result = await toolService.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
      });

      it('should handle null arguments', async () => {
        const result = await toolService.callTool('create_workspace', null);

        expect(result.isError).toBe(true);
      });

      it('should handle undefined arguments', async () => {
        const result = await toolService.callTool(
          'create_workspace',
          undefined
        );

        expect(result.isError).toBe(true);
      });

      it('should accept valid empty object for list operations', async () => {
        vi.mocked(mockWorkspaceRepository.list).mockResolvedValue([]);

        const result = await toolService.callTool('list_workspaces', {});

        expect(result.isError).toBeUndefined();
        expect(result.content[0]?.text).toBe('No workspaces found');
      });
    });
  });
});
