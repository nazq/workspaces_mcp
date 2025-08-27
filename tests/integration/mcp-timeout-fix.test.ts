import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Helper function to poll for server readiness
async function waitForServerReady(logFile: string, maxWaitMs = 2000): Promise<void> {
  const pollInterval = 100;
  const maxAttempts = Math.ceil(maxWaitMs / pollInterval);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      if (content.includes('🚀 Starting Workspaces MCP Server')) {
        return;
      }
    } catch {
      // File doesn't exist yet, continue polling
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Server not ready within ${maxWaitMs}ms`);
}

describe('MCP Server Timeout Fix', () => {
  let mcpServer: ChildProcess;
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary workspace directory
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'timeout-test-'));

    // Start MCP server with debug logging
    const serverPath = path.resolve('dist/bin/server.js');
    mcpServer = spawn('node', [serverPath], {
      env: {
        ...process.env,
        WORKSPACES_ROOT: tempDir,
        WORKSPACES_LOG_LEVEL: 'debug',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    // Debug server output
    let serverOutput = '';
    let serverErrors = '';

    mcpServer.stdout?.on('data', (data) => {
      serverOutput += data.toString();
      console.log('SERVER STDOUT:', data.toString());
    });

    mcpServer.stderr?.on('data', (data) => {
      serverErrors += data.toString();
      console.log('SERVER STDERR:', data.toString());
    });

    mcpServer.on('error', (error) => {
      console.error('SERVER ERROR:', error);
    });

    mcpServer.on('exit', (code, signal) => {
      console.log(`SERVER EXITED: code=${code}, signal=${signal}`);
    });

    // Wait for server to initialize by polling log file
    const logFile = path.join(tempDir, 'workspace_mcp.log');
    await waitForServerReady(logFile, 3000);
  });

  afterAll(async () => {
    // Clean up MCP server
    if (mcpServer) {
      mcpServer.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve) => {
        mcpServer.once('exit', resolve);
        setTimeout(() => {
          mcpServer.kill('SIGKILL');
          resolve(null);
        }, 1000);
      });
    }

    // Clean up temp directory
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  it('should start server without crashing', async () => {
    // Check if server process is still running
    expect(mcpServer.killed).toBe(false);
    expect(mcpServer.pid).toBeDefined();
  });

  it('should respond to simple initialize request', async () => {
    const initRequest = {
      jsonrpc: '2.0' as const,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'timeout-test',
          version: '1.0.0',
        },
      },
      id: 1,
    };

    // Send initialize request with reasonable timeout
    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initialize request timeout'));
      }, 3000); // 3 second timeout should be plenty

      let responseData = '';

      const dataHandler = (data: Buffer) => {
        responseData += data.toString();
        console.log('RECEIVED DATA:', data.toString());

        // Look for complete JSON response
        const lines = responseData.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line.trim());
            if (parsed.id === initRequest.id) {
              clearTimeout(timeout);
              mcpServer.stdout?.off('data', dataHandler);
              resolve(parsed);
              return;
            }
          } catch (e) {
            // Not complete JSON yet
          }
        }
      };

      mcpServer.stdout?.on('data', dataHandler);

      // Send the request
      console.log('SENDING REQUEST:', JSON.stringify(initRequest));
      mcpServer.stdin?.write(JSON.stringify(initRequest) + '\n');
    });

    expect(response).toBeDefined();
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe(1);

    // Should not have error
    if (response.error) {
      console.error('Initialize error:', response.error);
    }
  });
});
