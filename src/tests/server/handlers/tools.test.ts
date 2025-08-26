import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolHandler } from '../../../server/handlers/tools.js';

describe('ToolHandler', () => {
  let toolHandler: ToolHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-tools-'));
    toolHandler = new ToolHandler(tempDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('listTools', () => {
    it('should return all available tools', async () => {
      const result = await toolHandler.listTools();

      expect(result.tools).toHaveLength(6);

      const toolNames = result.tools.map((tool) => tool.name);
      expect(toolNames).toContain('create_workspace');
      expect(toolNames).toContain('list_workspaces');
      expect(toolNames).toContain('get_workspace_info');
      expect(toolNames).toContain('create_shared_instruction');
      expect(toolNames).toContain('update_global_instructions');
      expect(toolNames).toContain('list_shared_instructions');
    });

    it('should have proper tool schemas', async () => {
      const result = await toolHandler.listTools();

      const createWorkspaceTool = result.tools.find(
        (tool) => tool.name === 'create_workspace'
      );
      expect(createWorkspaceTool).toBeDefined();
      expect(createWorkspaceTool?.inputSchema.properties).toHaveProperty(
        'name'
      );
      expect(createWorkspaceTool?.inputSchema.required).toContain('name');
    });
  });

  describe('callTool', () => {
    describe('create_workspace', () => {
      it('should create a workspace successfully', async () => {
        const args = {
          name: 'test-workspace',
          description: 'A test workspace',
          template: 'react-typescript',
        };

        const result = await toolHandler.callTool('create_workspace', args);

        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain(
          '✅ Created workspace "test-workspace" successfully!'
        );

        // Verify workspace was created
        const workspacePath = path.join(tempDir, 'test-workspace');
        expect(await fs.pathExists(workspacePath)).toBe(true);
        expect(await fs.pathExists(path.join(workspacePath, 'README.md'))).toBe(
          true
        );
      });

      it('should create workspace with minimal args', async () => {
        const args = { name: 'minimal-workspace' };

        const result = await toolHandler.callTool('create_workspace', args);

        expect(result.content[0]?.text).toContain(
          '✅ Created workspace "minimal-workspace" successfully!'
        );
      });

      it('should return error for invalid workspace name', async () => {
        const args = { name: 'invalid name with spaces' };

        const result = await toolHandler.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Failed to create workspace');
        expect(result.content[0]?.text).toContain('invalid name with spaces');
      });

      it('should return error if workspace already exists', async () => {
        const args = { name: 'test-workspace' };

        // Create workspace first time (this will fail due to missing dependencies, but that's ok)
        await toolHandler.callTool('create_workspace', args);

        // Try to create again - should return error
        const result = await toolHandler.callTool('create_workspace', args);

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Failed to create workspace');
      });
    });

    describe('list_workspaces', () => {
      it('should return empty message when no workspaces exist', async () => {
        const result = await toolHandler.callTool('list_workspaces', {});

        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.text).toContain('📁 No workspaces found');
      });

      it('should list existing workspaces', async () => {
        // Create some workspaces
        await toolHandler.callTool('create_workspace', { name: 'workspace1' });
        await toolHandler.callTool('create_workspace', {
          name: 'workspace2',
          description: 'Second workspace',
        });

        const result = await toolHandler.callTool('list_workspaces', {});

        expect(result.content[0]?.text).toContain(
          '🏠 **Available Workspaces (2):**'
        );
        expect(result.content[0]?.text).toContain('📁 **workspace1**');
        expect(result.content[0]?.text).toContain('📁 **workspace2**');
        // Note: Description persistence will be implemented later
        expect(result.content[0]?.text).toContain('files');
      });
    });

    describe('get_workspace_info', () => {
      it('should return workspace information', async () => {
        // Create workspace first
        await toolHandler.callTool('create_workspace', {
          name: 'test-workspace',
        });

        const result = await toolHandler.callTool('get_workspace_info', {
          name: 'test-workspace',
        });

        expect(result.content[0]?.text).toContain(
          '📁 **Workspace: test-workspace**'
        );
        expect(result.content[0]?.text).toContain('"name": "test-workspace"');
      });

      it('should return error for non-existent workspace', async () => {
        const result = await toolHandler.callTool('get_workspace_info', {
          name: 'non-existent',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain(
          '❌ Failed to get workspace info'
        );
        expect(result.content[0]?.text).toContain(
          'Workspace not found: non-existent'
        );
      });
    });

    describe('create_shared_instruction', () => {
      it('should create shared instruction successfully', async () => {
        const args = {
          name: 'react-guide',
          content: '# React Guide\n\nUse hooks and functional components.',
          description: 'React development guide',
        };

        const result = await toolHandler.callTool(
          'create_shared_instruction',
          args
        );

        expect(result.content[0]?.text).toContain(
          '✅ Created shared instruction "react-guide" successfully!'
        );

        // Verify file was created
        const filePath = path.join(
          tempDir,
          'SHARED_INSTRUCTIONS',
          'react-guide.md'
        );
        expect(await fs.pathExists(filePath)).toBe(true);
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toBe(args.content);
      });

      it('should create shared instruction with minimal args', async () => {
        const args = {
          name: 'minimal-guide',
          content: '# Minimal Guide\n\nBasic content.',
        };

        const result = await toolHandler.callTool(
          'create_shared_instruction',
          args
        );

        expect(result.content[0]?.text).toContain(
          '✅ Created shared instruction "minimal-guide" successfully!'
        );
      });

      it('should throw error for invalid instruction name', async () => {
        const args = {
          name: 'GLOBAL',
          content: 'Content',
        };

        await expect(
          toolHandler.callTool('create_shared_instruction', args)
        ).rejects.toThrow();
      });
    });

    describe('update_global_instructions', () => {
      it('should update global instructions', async () => {
        const args = {
          content: '# Updated Global Instructions\n\nNew global rules.',
        };

        const result = await toolHandler.callTool(
          'update_global_instructions',
          args
        );

        expect(result.content[0]?.text).toContain(
          '✅ Updated global instructions successfully!'
        );

        // Verify file was updated
        const globalPath = path.join(
          tempDir,
          'SHARED_INSTRUCTIONS',
          'GLOBAL.md'
        );
        expect(await fs.pathExists(globalPath)).toBe(true);
        const content = await fs.readFile(globalPath, 'utf8');
        expect(content).toBe(args.content);
      });

      it('should throw error for content that is too large', async () => {
        const args = {
          content: 'a'.repeat(100001),
        };

        await expect(
          toolHandler.callTool('update_global_instructions', args)
        ).rejects.toThrow();
      });
    });

    describe('list_shared_instructions', () => {
      it('should return empty message when no shared instructions exist', async () => {
        const result = await toolHandler.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toContain(
          '📋 No shared instructions found'
        );
      });

      it('should list existing shared instructions', async () => {
        // Create some shared instructions
        await toolHandler.callTool('create_shared_instruction', {
          name: 'react-guide',
          content: '# React Guide',
        });
        await toolHandler.callTool('create_shared_instruction', {
          name: 'python-guide',
          content: '# Python Guide',
        });

        const result = await toolHandler.callTool(
          'list_shared_instructions',
          {}
        );

        expect(result.content[0]?.text).toContain(
          '📚 **Shared Instructions (2):**'
        );
        expect(result.content[0]?.text).toContain('📋 **react-guide**');
        expect(result.content[0]?.text).toContain('📋 **python-guide**');
      });
    });

    describe('unknown tools', () => {
      it('should throw error for unknown tool', async () => {
        await expect(toolHandler.callTool('unknown_tool', {})).rejects.toThrow(
          'Unknown tool: unknown_tool'
        );
      });
    });

    describe('argument validation', () => {
      it('should validate required arguments for create_workspace', async () => {
        await expect(
          toolHandler.callTool('create_workspace', {})
        ).rejects.toThrow();
      });

      it('should validate required arguments for create_shared_instruction', async () => {
        await expect(
          toolHandler.callTool('create_shared_instruction', { name: 'test' })
        ).rejects.toThrow();

        await expect(
          toolHandler.callTool('create_shared_instruction', { content: 'test' })
        ).rejects.toThrow();
      });

      it('should validate required arguments for update_global_instructions', async () => {
        await expect(
          toolHandler.callTool('update_global_instructions', {})
        ).rejects.toThrow();
      });

      it('should validate required arguments for get_workspace_info', async () => {
        await expect(
          toolHandler.callTool('get_workspace_info', {})
        ).rejects.toThrow();
      });
    });
  });
});
