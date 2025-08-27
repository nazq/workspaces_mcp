import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Helper function to poll for server readiness by checking stdout
async function waitForServerOutput(server: ChildProcess, expectedString: string, maxWaitMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server output not found within ${maxWaitMs}ms`));
    }, maxWaitMs);

    let outputBuffer = '';
    const dataHandler = (data: Buffer) => {
      outputBuffer += data.toString();
      if (outputBuffer.includes(expectedString)) {
        clearTimeout(timeout);
        server.stdout?.off('data', dataHandler);
        resolve();
      }
    };

    server.stdout?.on('data', dataHandler);
  });
}

describe('Simple MCP Server Test', () => {
  let mcpServer: ChildProcess;
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary workspace directory
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'simple-server-test-'));

    // Use the basic server from src/server/index.ts instead of the complex one
    const serverPath = path.resolve('dist/server/index.js');
    mcpServer = spawn('node', [serverPath], {
      env: {
        ...process.env,
        WORKSPACES_ROOT: tempDir,
        WORKSPACES_LOG_LEVEL: 'debug',
      },
      stdio: 'pipe',
    });

    // Debug server output
    mcpServer.stdout?.on('data', (data) => {
      console.log('SERVER STDOUT:', data.toString());
    });

    mcpServer.stderr?.on('data', (data) => {
      console.log('SERVER STDERR:', data.toString());
    });

    mcpServer.on('error', (error) => {
      console.error('SERVER ERROR:', error);
    });

    mcpServer.on('exit', (code, signal) => {
      console.log(`SERVER EXITED: code=${code}, signal=${signal}`);
    });

    // Wait for server to initialize by checking for any stdout output
    try {
      await waitForServerOutput(mcpServer, '', 3000); // Wait for any output
    } catch {
      // If no output, just wait a short time as fallback
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
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

  it('should start basic MCP server successfully', async () => {
    // Check if server process is still running
    expect(mcpServer.killed).toBe(false);
    expect(mcpServer.pid).toBeDefined();
  });

  it('should respond to initialize request', async () => {
    const initRequest = {
      jsonrpc: '2.0' as const,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'simple-test',
          version: '1.0.0',
        },
      },
      id: 1,
    };

    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Initialize request timeout'));
      }, 2000);

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

    // Should have successful result
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  });
});
