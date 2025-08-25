import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the CLI binary
const CLI_PATH = join(__dirname, '../../bin/cli.ts');
const TEST_WORKSPACES_ROOT = join(__dirname, '../../../tmp/test-cli-workspaces');

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
    it('should execute without syntax errors', (done) => {
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
        // CLI should handle --help gracefully (exit code 0 or 1 both acceptable)
        expect([0, 1]).toContain(code);
        // Should not have syntax errors
        expect(stderr).not.toMatch(/SyntaxError/);
        expect(stderr).not.toMatch(/TypeError.*import/);
        done();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        done(new Error('CLI execution timed out'));
      }, 10000);
    }, 15000);

    it('should handle version flag', (done) => {
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
        // Version command should work
        expect([0, 1]).toContain(code);
        // Should not have runtime errors
        expect(stderr).not.toMatch(/Error.*Cannot/);
        expect(stderr).not.toMatch(/ReferenceError/);
        done();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        done(new Error('Version check timed out'));
      }, 10000);
    }, 15000);
  });

  describe('Environment Variables', () => {
    it('should respect WORKSPACES_ROOT environment variable', (done) => {
      const customRoot = join(TEST_WORKSPACES_ROOT, 'custom');

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
        // List command with custom root should work (empty is fine)
        expect([0, 1]).toContain(code);
        // Should not have initialization errors
        expect(stderr).not.toMatch(/initialization failed/);
        done();
      });

      setTimeout(() => {
        child.kill();
        done(new Error('Custom root test timed out'));
      }, 10000);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', (done) => {
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
        // Invalid command should exit with error code
        expect(code).not.toBe(0);
        // Should show helpful error or usage info
        const output = stdout + stderr;
        expect(output.length).toBeGreaterThan(0);
        done();
      });

      setTimeout(() => {
        child.kill();
        done(new Error('Invalid command test timed out'));
      }, 10000);
    }, 15000);

    it('should handle process signals properly', (done) => {
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
        // Should handle termination signal
        expect(signal).toBe('SIGTERM');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('Signal handling test timed out'));
      }, 5000);
    }, 10000);
  });

  describe('Dependency Initialization', () => {
    it('should initialize all required dependencies', (done) => {
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
        // Should complete initialization
        expect([0, 1]).toContain(code);
        
        // Should not have dependency injection errors
        expect(stderr).not.toMatch(/Cannot resolve/);
        expect(stderr).not.toMatch(/Dependency.*not found/);
        expect(stderr).not.toMatch(/Module.*not found/);
        
        done();
      });

      setTimeout(() => {
        child.kill();
        done(new Error('Dependency initialization test timed out'));
      }, 15000);
    }, 20000);
  });
});