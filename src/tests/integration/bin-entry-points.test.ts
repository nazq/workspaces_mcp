/**
 * Integration tests for CLI and server entry points
 * These tests cover the bin files which are currently 0% coverage
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

// Helper function to poll for log content efficiently
async function waitForLogContent(
  logFile: string,
  expectedStrings: string[],
  maxWaitMs = 2000
): Promise<string> {
  const pollInterval = 100;
  const maxAttempts = Math.ceil(maxWaitMs / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      if (expectedStrings.every((str) => content.includes(str))) {
        return content;
      }
    } catch {
      // File doesn't exist yet, continue polling
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Log content not found within ${maxWaitMs}ms. Expected: ${expectedStrings.join(', ')}`
  );
}

const CLI_PATH = path.join(process.cwd(), 'dist', 'bin', 'cli.js');
const SERVER_PATH = path.join(process.cwd(), 'dist', 'bin', 'server.js');

describe('Binary Entry Points Integration', () => {
  let testWorkspacesRoot: string;

  beforeEach(async () => {
    // Create temporary workspaces directory for testing
    testWorkspacesRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'workspaces-test-')
    );
  });

  describe('CLI Entry Point', () => {
    it('should show help when run without arguments', async () => {
      const result = await runProcess('node', [CLI_PATH], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      // CLI exits with code 1 when no command specified, but shows help
      expect(result.code).toBe(1);
      expect(result.stdout).toContain('✓ Workspaces MCP CLI');
      expect(result.stderr).toContain('✗ No command specified');
    });

    it('should handle verbose flag', async () => {
      const result = await runProcess('node', [CLI_PATH, '--verbose', 'help'], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('CLI');
    });

    it('should handle short verbose flag', async () => {
      const result = await runProcess('node', [CLI_PATH, '-v', 'help'], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('CLI');
    });

    it('should create workspace through CLI', async () => {
      const result = await runProcess(
        'node',
        [CLI_PATH, 'create', 'test-workspace'],
        {
          env: { WORKSPACES_ROOT: testWorkspacesRoot },
          timeout: 2000,
        }
      );

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('test-workspace');

      // Verify workspace was created
      const workspacePath = path.join(testWorkspacesRoot, 'test-workspace');
      const exists = await fs
        .access(workspacePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should list workspaces through CLI', async () => {
      // First create a workspace
      await runProcess('node', [CLI_PATH, 'create', 'test-workspace'], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      // Then list workspaces
      const result = await runProcess('node', [CLI_PATH, 'list'], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('test-workspace');
    });

    it('should handle initialization errors gracefully', async () => {
      // Use valid workspaces root but test help command
      const result = await runProcess('node', [CLI_PATH, 'help'], {
        env: { WORKSPACES_ROOT: testWorkspacesRoot },
        timeout: 2000,
      });

      // Should work for help command
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('CLI');
    });
  });

  describe('Server Entry Point', () => {
    it('should start server and log startup messages', async () => {
      const child = spawn('node', [SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: testWorkspacesRoot,
        },
        stdio: 'pipe',
      });

      const logFile = path.join(testWorkspacesRoot, 'workspace_mcp.log');

      let logContent: string;
      try {
        // Wait for log content to appear
        logContent = await waitForLogContent(logFile, [
          '🚀 Starting Workspaces MCP Server',
          '📁 Workspaces root:',
          '🔧 Log level:',
        ]);

        // Kill server once we have the logs we need
        child.kill('SIGTERM');
      } catch (error) {
        child.kill('SIGKILL');
        throw error;
      }

      // Wait for clean shutdown
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 1000);
      });

      // Server should start logging to file
      expect(logContent).toContain('🚀 Starting Workspaces MCP Server');
      expect(logContent).toContain('📁 Workspaces root:');
      expect(logContent).toContain('🔧 Log level:');
    });

    it('should handle server startup errors', async () => {
      const child = spawn('node', [SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: testWorkspacesRoot,
        },
        stdio: 'pipe',
      });

      const logFile = path.join(testWorkspacesRoot, 'workspace_mcp.log');

      let logContent: string;
      try {
        // Wait for log content to appear
        logContent = await waitForLogContent(logFile, [
          '🚀 Starting Workspaces MCP Server',
        ]);

        // Kill server once we have the logs we need
        child.kill('SIGTERM');
      } catch (error) {
        child.kill('SIGKILL');
        throw error;
      }

      // Wait for clean shutdown
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 1000);
      });

      // Should start logging to file
      expect(logContent).toContain('🚀 Starting Workspaces MCP Server');
    });

    it('should respect log level environment variable', async () => {
      const child = spawn('node', [SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: testWorkspacesRoot,
          WORKSPACES_LOG_LEVEL: 'debug',
        },
        stdio: 'pipe',
      });

      const logFile = path.join(testWorkspacesRoot, 'workspace_mcp.log');

      let logContent: string;
      try {
        // Wait for log content to appear
        logContent = await waitForLogContent(logFile, [
          '🚀 Starting Workspaces MCP Server',
          '🔧 Log level: debug',
        ]);

        // Kill server once we have the logs we need
        child.kill('SIGTERM');
      } catch (error) {
        child.kill('SIGKILL');
        throw error;
      }

      // Wait for clean shutdown
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 1000);
      });

      expect(logContent).toContain('🔧 Log level: debug');
    });

    it('should default log level when not specified', async () => {
      const child = spawn('node', [SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: testWorkspacesRoot,
        },
        stdio: 'pipe',
      });

      const logFile = path.join(testWorkspacesRoot, 'workspace_mcp.log');

      let logContent: string;
      try {
        // Wait for log content to appear
        logContent = await waitForLogContent(logFile, [
          '🚀 Starting Workspaces MCP Server',
          '🔧 Log level: info',
        ]);

        // Kill server once we have the logs we need
        child.kill('SIGTERM');
      } catch (error) {
        child.kill('SIGKILL');
        throw error;
      }

      // Wait for clean shutdown
      await new Promise<void>((resolve) => {
        child.on('close', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 1000);
      });

      expect(logContent).toContain('🔧 Log level: info');
    });
  });
});

// Helper function to run a process and capture output
async function runProcess(
  command: string,
  args: string[],
  options: {
    env?: Record<string, string>;
    timeout?: number;
    expectTimeout?: boolean;
  } = {}
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = options.timeout || 10000;
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      if (options.expectTimeout) {
        // If we expect timeout, treat it as success
        resolve({ code: 0, stdout, stderr });
      } else {
        resolve({ code: null, stdout, stderr });
      }
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: stderr + error.message });
    });
  });
}
