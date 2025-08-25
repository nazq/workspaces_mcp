import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the server binary
const SERVER_PATH = join(__dirname, '../../bin/server.ts');
const TEST_WORKSPACES_ROOT = join(__dirname, '../../../tmp/test-server-workspaces');

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
    it('should start server and log startup messages', (done) => {
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

      child.on('close', (code, signal) => {
        const output = stdout + stderr;
        
        // Should log startup messages
        expect(output).toMatch(/Starting.*MCP Server/);
        expect(output).toMatch(/Workspaces root:/);
        expect(output).toMatch(/Log level:/);
        
        // Should handle termination gracefully
        expect(signal).toBe('SIGTERM');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('Server startup test timed out'));
      }, 10000);
    }, 15000);

    it('should handle server startup errors', (done) => {
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

      child.on('close', (code) => {
        // Server should exit with error code on startup failure
        expect(code).toBe(1);
        
        const output = stdout + stderr;
        // Should log error information
        expect(output).toMatch(/(Failed to start server|Server error)/);
        done();
      });

      // Kill if it doesn't exit on its own
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
          done(new Error('Error handling test timed out'));
        }
      }, 5000);
    }, 10000);

    it('should respect log level environment variable', (done) => {
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

      child.on('close', () => {
        const output = stdout + stderr;
        
        // Should show the log level in output
        expect(output).toMatch(/Log level:.*debug/);
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('Log level test timed out'));
      }, 8000);
    }, 12000);

    it('should default log level when not specified', (done) => {
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

      child.on('close', () => {
        const output = stdout + stderr;
        
        // Should default to 'info' log level
        expect(output).toMatch(/Log level:.*info/);
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('Default log level test timed out'));
      }, 8000);
    }, 12000);
  });

  describe('Process Signal Handling', () => {
    it('should handle SIGTERM gracefully', (done) => {
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

      child.on('exit', (code, signal) => {
        expect(signal).toBe('SIGTERM');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('SIGTERM handling test timed out'));
      }, 5000);
    }, 8000);

    it('should handle SIGINT gracefully', (done) => {
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

      child.on('exit', (code, signal) => {
        expect(signal).toBe('SIGINT');
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('SIGINT handling test timed out'));
      }, 5000);
    }, 8000);
  });

  describe('Configuration Validation', () => {
    it('should use default workspace root when not specified', (done) => {
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

      child.on('close', () => {
        const output = stdout + stderr;
        
        // Should show some default workspace root path
        expect(output).toMatch(/Workspaces root:.*\/.*workspaces/);
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('Default workspace root test timed out'));
      }, 8000);
    }, 12000);
  });

  describe('MCP Server Integration', () => {
    it('should create and configure MCP server properly', (done) => {
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

      child.on('close', () => {
        const output = stdout + stderr;
        
        // Should start the server
        expect(output).toMatch(/Starting.*MCP Server/);
        
        // Should not have initialization errors
        expect(output).not.toMatch(/Failed to create.*server/);
        expect(output).not.toMatch(/Invalid configuration/);
        
        done();
      });

      setTimeout(() => {
        child.kill('SIGKILL');
        done(new Error('MCP server integration test timed out'));
      }, 10000);
    }, 15000);
  });
});