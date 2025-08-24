import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: number;
}

describe('MCP Protocol Integration Tests', () => {
  let mcpServer: ChildProcess;
  let tempDir: string;
  let requestId = 1;

  const sendMCPRequest = async (request: MCPRequest): Promise<MCPResponse> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MCP request timeout for method ${request.method}`));
      }, 5000);

      let responseData = '';

      const dataHandler = (data: Buffer) => {
        responseData += data.toString();

        // Split by newlines to handle multiple JSON responses
        const lines = responseData.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const response = JSON.parse(line.trim());
            if (response.id === request.id) {
              clearTimeout(timeout);
              mcpServer.stdout?.off('data', dataHandler);
              resolve(response);
              return;
            }
          } catch (e) {
            // Not complete JSON yet, continue
          }
        }
      };

      const errorHandler = (data: Buffer) => {
        console.error('MCP Server error:', data.toString());
      };

      mcpServer.stdout?.on('data', dataHandler);
      mcpServer.stderr?.on('data', errorHandler);

      // Send the request
      mcpServer.stdin?.write(JSON.stringify(request) + '\n');
    });
  };

  beforeAll(async () => {
    // Create temporary workspace directory
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'integration-test-'));

    // Start MCP server
    const serverPath = path.resolve('dist/bin/server.js');
    mcpServer = spawn('node', [serverPath], {
      env: {
        ...process.env,
        WORKSPACES_ROOT: tempDir,
        WORKSPACES_LOG_LEVEL: 'error', // Reduce noise in tests
      },
      stdio: 'pipe',
    });

    // Wait for server to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize MCP connection
    const initRequest = {
      jsonrpc: '2.0' as const,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'integration-test',
          version: '1.0.0',
        },
      },
      id: 0,
    };

    try {
      await sendMCPRequest(initRequest);
    } catch (error) {
      console.warn('MCP initialization failed, proceeding anyway:', error);
    }
  });

  afterAll(async () => {
    // Clean up MCP server
    if (mcpServer) {
      mcpServer.kill();
    }

    // Clean up temp directory
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  beforeEach(() => {
    requestId++;
  });

  describe('Resources API', () => {
    it('should list resources including global instructions', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/list',
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeInstanceOf(Array);
      expect(response.result.resources.length).toBeGreaterThan(0);

      // Should include global instructions
      const globalResource = response.result.resources.find(
        (r: any) => r.name === 'Global Instructions'
      );
      expect(globalResource).toBeDefined();
      expect(globalResource.uri).toBe('instruction://global');
    });

    it('should read global instructions resource', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/read',
        params: {
          uri: 'instruction://global',
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.contents).toBeInstanceOf(Array);
      expect(response.result.contents[0]?.text).toContain(
        'Default global instructions for all workspaces.'
      );
    });

    it('should handle invalid resource URI gracefully', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'resources/read',
        params: {
          uri: 'invalid://resource',
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeDefined();
      expect(response.result).toBeUndefined();
    });
  });

  describe('Tools API', () => {
    it('should list all available tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools).toHaveLength(6);

      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('create_workspace');
      expect(toolNames).toContain('list_workspaces');
      expect(toolNames).toContain('get_workspace_info');
      expect(toolNames).toContain('create_shared_instruction');
      expect(toolNames).toContain('update_global_instructions');
      expect(toolNames).toContain('list_shared_instructions');
    });

    it('should create a workspace successfully', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_workspace',
          arguments: {
            name: 'test-integration-workspace',
            description: 'Integration test workspace',
          },
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content[0]?.text).toContain(
        "Workspace 'test-integration-workspace' created successfully"
      );

      // Verify workspace was actually created on filesystem
      const workspacePath = path.join(tempDir, 'test-integration-workspace');
      expect(await fs.pathExists(workspacePath)).toBe(true);
      expect(await fs.pathExists(path.join(workspacePath, 'README.md'))).toBe(
        true
      );
    });

    it('should list workspaces after creation', async () => {
      // First ensure workspace exists from previous test
      await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_workspace',
          arguments: { name: 'list-test-workspace' },
        },
        id: requestId++,
      });

      // Now list workspaces
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_workspaces',
          arguments: {},
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result?.content[0]?.text).toContain(
        'Available workspaces'
      );
      expect(response.result?.content[0]?.text).toContain(
        'list-test-workspace'
      );
    });

    it('should get workspace info', async () => {
      // Create workspace first
      await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_workspace',
          arguments: { name: 'info-test-workspace' },
        },
        id: requestId++,
      });

      // Get workspace info
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_workspace_info',
          arguments: { name: 'info-test-workspace' },
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result?.content[0]?.text).toContain(
        'Name: info-test-workspace'
      );
    });

    it('should create shared instruction', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_shared_instruction',
          arguments: {
            name: 'integration-test-template',
            content: '# Integration Test Template\n\nThis is a test template.',
            description: 'Test template for integration tests',
          },
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result?.content[0]?.text).toContain(
        "Shared instruction 'integration-test-template' created successfully"
      );

      // Verify file was created
      const templatePath = path.join(
        tempDir,
        'SHARED_INSTRUCTIONS',
        'integration-test-template.md'
      );
      expect(await fs.pathExists(templatePath)).toBe(true);

      const content = await fs.readFile(templatePath, 'utf8');
      expect(content).toContain('# Integration Test Template');
      expect(content).toContain('AI ASSISTANT DIRECTIVE');
      expect(content).toContain('MANDATORY');
    });

    it('should handle tool errors gracefully', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_workspace',
          arguments: {
            name: '', // Empty name that should fail
          },
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result.isError).toBe(true);
    });

    it('should handle unknown tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
        id: requestId,
      };

      const response = await sendMCPRequest(request);

      expect(response.error).toBeUndefined();
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0]?.text).toContain('Unknown tool');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workspace management workflow', async () => {
      // 1. Create workspace
      const createResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_workspace',
          arguments: {
            name: 'e2e-workflow-test',
            description: 'End-to-end test workspace',
            template: 'react-typescript',
          },
        },
        id: requestId++,
      });

      expect(createResponse.error).toBeUndefined();

      // 2. Verify workspace appears in resource list
      const listResourcesResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'resources/list',
        id: requestId++,
      });

      const workspaceResource = listResourcesResponse.result.resources.find(
        (r: any) => r.uri === 'workspace://e2e-workflow-test'
      );
      expect(workspaceResource).toBeDefined();

      // 3. Read workspace resource
      const readWorkspaceResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: {
          uri: 'workspace://e2e-workflow-test',
        },
        id: requestId++,
      });

      expect(readWorkspaceResponse.error).toBeUndefined();
      const workspaceData = JSON.parse(
        readWorkspaceResponse.result.contents[0].text
      );
      expect(workspaceData.name).toBe('e2e-workflow-test');

      // 4. List workspaces via tool
      const listWorkspacesResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_workspaces',
          arguments: {},
        },
        id: requestId++,
      });

      expect(listWorkspacesResponse.result.content[0].text).toContain(
        'e2e-workflow-test'
      );
    });

    it.skip('should handle shared instruction workflow', async () => {
      // 1. Create shared instruction
      const createResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_shared_instruction',
          arguments: {
            name: 'e2e-template',
            content: '# E2E Template\n\nEnd-to-end testing template.',
          },
        },
        id: requestId++,
      });

      expect(createResponse.error).toBeUndefined();

      // 2. Verify appears in resource list
      const listResourcesResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'resources/list',
        id: requestId++,
      });

      const templateResource = listResourcesResponse.result.resources.find(
        (r: any) => r.uri === 'instruction://shared/e2e-template'
      );
      expect(templateResource).toBeDefined();
      expect(templateResource.name).toBe('Shared Instruction: e2e-template');

      // 3. Read template resource
      const readTemplateResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: {
          uri: 'instruction://shared/e2e-template',
        },
        id: requestId++,
      });

      expect(readTemplateResponse.error).toBeUndefined();
      expect(readTemplateResponse.result.contents[0].text).toContain(
        '# E2E Template'
      );

      // 4. List shared instructions via tool
      const listInstructionsResponse = await sendMCPRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list_shared_instructions',
          arguments: {},
        },
        id: requestId++,
      });

      expect(listInstructionsResponse.result.content[0].text).toContain(
        'e2e-template'
      );
    });
  });
});
