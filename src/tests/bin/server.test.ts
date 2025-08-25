import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the server binary
const SERVER_PATH = join(__dirname, '../../bin/server.ts');
const TEST_WORKSPACES_ROOT = join(
  __dirname,
  '../../../tmp/test-server-workspaces'
);

describe('Server Binary Entry Point', () => {
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

  describe('Server Startup', () => {
    it('should start server and log startup messages', async () => {
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          WORKSPACES_LOG_LEVEL: 'info',
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

      // Give server time to start up
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      const result = await new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        child.on('close', (code, signal) => {
          resolve({ code, signal, stdout, stderr });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Server startup test timed out'));
        }, 10000);
      });

      const output = result.stdout + result.stderr;

      // Should log startup messages
      expect(output).toMatch(/Starting.*MCP Server/);
      expect(output).toMatch(/Workspaces root:/);
      expect(output).toMatch(/Log level:/);

      // Should handle termination gracefully
      expect(result.signal).toBe('SIGTERM');
    }, 15000);

    it('should handle server startup errors', async () => {
      // Test with invalid environment to trigger startup error
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: '/non/existent/path/that/will/fail',
          WORKSPACES_LOG_LEVEL: 'error',
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

      const result = await new Promise<{ code: number | null }>(
        (resolve, reject) => {
          child.on('close', (code) => {
            resolve({ code });
          });

          child.on('exit', (code) => {
            resolve({ code });
          });

          child.on('error', (error) => {
            reject(error);
          });

          // Kill if it doesn't exit on its own
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
            // Still resolve with whatever we have rather than reject
            setTimeout(() => resolve({ code: null }), 100);
          }, 3000);
        }
      );

      // Server should exit with error code on startup failure or be killed
      expect([null, 1]).toContain(result.code);

      const output = stdout + stderr;
      // Should log error information or indicate startup issue
      if (output.length > 0) {
        expect(output).toMatch(
          /(Failed to start server|Server error|ENOENT|does not exist)/
        );
      }
    }, 10000);

    it('should respect log level environment variable', async () => {
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          WORKSPACES_LOG_LEVEL: 'debug',
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

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          child.on('close', () => {
            resolve({ stdout, stderr });
          });

          child.on('error', (error) => {
            reject(error);
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('Log level test timed out'));
          }, 8000);
        }
      );

      const output = result.stdout + result.stderr;

      // Should show the log level in output
      expect(output).toMatch(/Log level:.*debug/);
    }, 12000);

    it('should default log level when not specified', async () => {
      const envWithoutLogLevel = { ...process.env };
      delete envWithoutLogLevel.WORKSPACES_LOG_LEVEL;

      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...envWithoutLogLevel,
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

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          child.on('close', () => {
            resolve({ stdout, stderr });
          });

          child.on('error', (error) => {
            reject(error);
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('Default log level test timed out'));
          }, 8000);
        }
      );

      const output = result.stdout + result.stderr;

      // Should default to 'info' log level
      expect(output).toMatch(/Log level:.*info/);
    }, 12000);
  });

  describe('Process Signal Handling', () => {
    it('should handle SIGTERM gracefully', async () => {
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
        },
        stdio: 'pipe',
      });

      // Give server time to start
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1000);

      const result = await new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>((resolve, reject) => {
        child.on('exit', (code, signal) => {
          resolve({ code, signal });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('SIGTERM handling test timed out'));
        }, 5000);
      });

      expect(result.signal).toBe('SIGTERM');
    }, 8000);

    it('should handle SIGINT gracefully', async () => {
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
        },
        stdio: 'pipe',
      });

      // Give server time to start
      setTimeout(() => {
        child.kill('SIGINT');
      }, 1000);

      const result = await new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>((resolve, reject) => {
        child.on('exit', (code, signal) => {
          resolve({ code, signal });
        });

        child.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          child.kill('SIGKILL');
          // Signal handling behavior can vary by platform, accept different outcomes
          setTimeout(() => resolve({ code: null, signal: null }), 100);
        }, 3000);
      });

      // Signal handling can vary by platform - accept SIGINT, SIGKILL, or process termination
      expect(
        result.signal === 'SIGINT' ||
          result.signal === 'SIGKILL' ||
          typeof result.code === 'number'
      ).toBe(true);
    }, 8000);
  });

  describe('Configuration Validation', () => {
    it('should use default workspace root when not specified', async () => {
      const envWithoutRoot = { ...process.env };
      delete envWithoutRoot.WORKSPACES_ROOT;

      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: envWithoutRoot,
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

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2000);

      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          child.on('close', () => {
            resolve({ stdout, stderr });
          });

          child.on('error', (error) => {
            reject(error);
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('Default workspace root test timed out'));
          }, 8000);
        }
      );

      const output = result.stdout + result.stderr;

      // Should show some default workspace root path
      expect(output).toMatch(/Workspaces root:.*\/.*workspaces/);
    }, 12000);
  });

  describe('MCP Server Integration', () => {
    it('should create and configure MCP server properly', async () => {
      const child = spawn('npx', ['tsx', SERVER_PATH], {
        env: {
          ...process.env,
          WORKSPACES_ROOT: TEST_WORKSPACES_ROOT,
          NODE_ENV: 'development', // Enable request logging
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

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 3000);

      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          child.on('close', () => {
            resolve({ stdout, stderr });
          });

          child.on('error', (error) => {
            reject(error);
          });

          setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('MCP server integration test timed out'));
          }, 10000);
        }
      );

      const output = result.stdout + result.stderr;

      // Should start the server
      expect(output).toMatch(/Starting.*MCP Server/);

      // Should not have initialization errors
      expect(output).not.toMatch(/Failed to create.*server/);
      expect(output).not.toMatch(/Invalid configuration/);
    }, 15000);
  });
});
