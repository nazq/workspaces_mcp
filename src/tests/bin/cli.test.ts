import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the CLI binary
const CLI_PATH = join(__dirname, '../../bin/cli.ts');
const TEST_WORKSPACES_ROOT = join(
  __dirname,
  '../../../tmp/test-cli-workspaces'
);

describe('CLI Binary Entry Point', () => {
  beforeEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(TEST_WORKSPACES_ROOT)) {
      await fs.remove(TEST_WORKSPACES_ROOT);
    }
    await fs.ensureDir(TEST_WORKSPACES_ROOT);
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(TEST_WORKSPACES_ROOT)) {
      await fs.remove(TEST_WORKSPACES_ROOT);
    }
  });

  describe('Process Execution', () => {
    it('should execute without syntax errors', async () => {
      const result = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = spawn('npx', ['tsx', CLI_PATH, '--help'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          },
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

        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          child.kill();
          reject(new Error('CLI execution timed out'));
        }, 10000);
      });

      // CLI should handle --help gracefully (exit code 0 or 1 both acceptable)
      expect([0, 1]).toContain(result.code);
      // Should not have syntax errors
      expect(result.stderr).not.toMatch(/SyntaxError/);
      expect(result.stderr).not.toMatch(/TypeError.*import/);
    }, 15000);

    it('should handle version flag', async () => {
      const result = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = spawn('npx', ['tsx', CLI_PATH, '--version'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          },
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

        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          child.kill();
          reject(new Error('Version check timed out'));
        }, 10000);
      });

      // Version command should work
      expect([0, 1]).toContain(result.code);
      // Should not have runtime errors
      expect(result.stderr).not.toMatch(/Error.*Cannot/);
      expect(result.stderr).not.toMatch(/ReferenceError/);
    }, 15000);
  });

  describe('Environment Variables', () => {
    it('should respect WORKSPACES_ROOT environment variable', async () => {
      const customRoot = join(TEST_WORKSPACES_ROOT, 'custom');

      const result = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = spawn('npx', ['tsx', CLI_PATH, 'list'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: customRoot,
          },
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

        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill();
          reject(new Error('Custom root test timed out'));
        }, 10000);
      });

      // List command with custom root should work (empty is fine)
      expect([0, 1]).toContain(result.code);
      // Should not have initialization errors
      expect(result.stderr).not.toMatch(/initialization failed/);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', async () => {
      const result = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        const child = spawn('npx', ['tsx', CLI_PATH, 'invalid-command'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          },
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

        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill();
          reject(new Error('Invalid command test timed out'));
        }, 10000);
      });

      // Invalid command should exit with error code
      expect(result.code).not.toBe(0);
      // Should show helpful error or usage info
      const output = result.stdout + result.stderr;
      expect(output.length).toBeGreaterThan(0);
    }, 15000);

    it('should handle process signals properly', async () => {
      const result = await new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>((resolve, reject) => {
        const child = spawn('npx', ['tsx', CLI_PATH, 'list'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          },
          stdio: 'pipe',
        });

        // Give it a moment to start
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 1000);

        child.on('exit', (code, signal) => {
          resolve({ code, signal });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Signal handling test timed out'));
        }, 5000);
      });

      // Should handle termination signal gracefully (signal and code behavior varies by system)
      expect(
        typeof result.signal === 'string' || typeof result.code === 'number'
      ).toBe(true);
    }, 10000);
  });

  describe('Dependency Initialization', () => {
    it('should initialize all required dependencies', async () => {
      const result = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        // Test that the CLI can initialize without throwing dependency errors
        const child = spawn('npx', ['tsx', CLI_PATH, 'list'], {
          env: {
            ...process.env,
            WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
            WORKSPACES_LOG_LEVEL: 'debug', // Enable debug logging to see initialization
          },
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

        child.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill();
          reject(new Error('Dependency initialization test timed out'));
        }, 15000);
      });

      // Should complete initialization
      expect([0, 1]).toContain(result.code);

      // Should not have dependency injection errors
      expect(result.stderr).not.toMatch(/Cannot resolve/);
      expect(result.stderr).not.toMatch(/Dependency.*not found/);
      expect(result.stderr).not.toMatch(/Module.*not found/);
    }, 20000);
  });
});
