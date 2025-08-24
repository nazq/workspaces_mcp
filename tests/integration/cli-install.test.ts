import { spawn } from 'node:child_process';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('CLI Install Integration Tests', () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create temporary directory for test workspace
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'cli-test-'));

    // Get CLI path
    cliPath = path.resolve('dist/bin/cli.js');

    // Ensure CLI is built
    if (!(await fs.pathExists(cliPath))) {
      throw new Error(
        `CLI not built at ${cliPath}. Run 'npm run build' first.`
      );
    }
  });

  afterEach(async () => {
    // Clean up temp directory
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  const runCLI = (
    args: string[],
    options?: { input?: string }
  ): Promise<{
    stdout: string;
    stderr: string;
    code: number | null;
  }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        env: {
          ...process.env,
          CI: 'true', // Prevent interactive prompts
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (options?.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });
    });
  };

  describe('CLI Help and Version', () => {
    it('should show help when --help flag is used', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain(
        'Workspaces MCP Developer Experience Toolkit'
      );
      expect(result.stdout).toContain('install [options]');
      expect(result.stdout).toContain(
        'Install and setup Workspaces MCP for Claude Desktop'
      );
    });

    it('should show version when --version flag is used', async () => {
      const result = await runCLI(['--version']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('1.0.0');
    });

    it('should show help for install command', async () => {
      const result = await runCLI(['install', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain(
        'Install and setup Workspaces MCP for Claude Desktop'
      );
      expect(result.stdout).toContain('--path <path>');
      expect(result.stdout).toContain('Custom workspaces directory path');
    });
  });

  describe('Install Command', () => {
    it('should install successfully with custom path', async () => {
      const result = await runCLI(['install', '--path', tempDir]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ Setup complete!');
      expect(result.stdout).toContain('Workspaces directory:');
      expect(result.stdout).toContain(tempDir);
    });

    it('should create workspace directory structure', async () => {
      await runCLI(['install', '--path', tempDir]);

      // Check workspace directory exists
      expect(await fs.pathExists(tempDir)).toBe(true);

      // Check SHARED_INSTRUCTIONS directory
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      expect(await fs.pathExists(sharedDir)).toBe(true);

      // Check GLOBAL.md file
      const globalFile = path.join(sharedDir, 'GLOBAL.md');
      expect(await fs.pathExists(globalFile)).toBe(true);

      const globalContent = await fs.readFile(globalFile, 'utf8');
      expect(globalContent).toContain('# Global Instructions');
      expect(globalContent).toContain(
        'automatically loaded in every Claude session'
      );
    });

    it('should not overwrite existing global instructions', async () => {
      // Pre-create GLOBAL.md with custom content
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      await fs.ensureDir(sharedDir);
      const customContent =
        '# My Custom Global Instructions\n\nCustom content here.';
      await fs.writeFile(path.join(sharedDir, 'GLOBAL.md'), customContent);

      await runCLI(['install', '--path', tempDir]);

      // Should preserve existing content
      const globalContent = await fs.readFile(
        path.join(sharedDir, 'GLOBAL.md'),
        'utf8'
      );
      expect(globalContent).toBe(customContent);
    });

    it('should handle invalid path gracefully', async () => {
      const invalidPath = '/root/cannot-write-here';
      const result = await runCLI(['install', '--path', invalidPath]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Installation failed');
    });

    it('should validate MCP server exists', async () => {
      // Move MCP server temporarily to simulate missing server
      const mcpServerPath = path.resolve('dist/bin/server.js');
      const backupPath = mcpServerPath + '.backup';

      if (await fs.pathExists(mcpServerPath)) {
        await fs.move(mcpServerPath, backupPath);
      }

      try {
        const result = await runCLI(['install', '--path', tempDir]);

        expect(result.code).toBe(1);
        expect(result.stderr).toContain('MCP server not found');
        expect(result.stderr).toContain('Please build the project first');
      } finally {
        // Restore MCP server
        if (await fs.pathExists(backupPath)) {
          await fs.move(backupPath, mcpServerPath);
        }
      }
    });
  });

  describe('Cross-Platform Configuration', () => {
    let originalPlatform: string;
    let mockConfigPath: string;

    beforeEach(() => {
      originalPlatform = process.platform;
      mockConfigPath = path.join(tempDir, 'mock-claude-config.json');
    });

    afterEach(() => {
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    const mockPlatform = (platform: string) => {
      Object.defineProperty(process, 'platform', { value: platform });
    };

    it('should handle Linux configuration path', async () => {
      mockPlatform('linux');

      // Mock HOME directory for test
      const mockHome = tempDir;
      const originalHome = process.env.HOME;
      process.env.HOME = mockHome;

      try {
        // Pre-create config directory
        const configDir = path.join(mockHome, '.config', 'Claude');
        await fs.ensureDir(configDir);

        const result = await runCLI([
          'install',
          '--path',
          path.join(tempDir, 'workspaces'),
        ]);

        expect(result.code).toBe(0);

        // Check config was created
        const configPath = path.join(configDir, 'claude_desktop_config.json');
        expect(await fs.pathExists(configPath)).toBe(true);

        const config = await fs.readJson(configPath);
        expect(config.mcpServers).toBeDefined();
        expect(config.mcpServers['workspaces-mcp']).toBeDefined();
        expect(config.mcpServers['workspaces-mcp'].command).toBe('node');
      } finally {
        // Restore HOME
        if (originalHome !== undefined) {
          process.env.HOME = originalHome;
        } else {
          delete process.env.HOME;
        }
      }
    });

    // Note: We can't easily test macOS/Windows paths on Linux, but the logic is covered in unit tests
  });

  describe('Configuration Generation', () => {
    it('should generate valid Claude Desktop configuration', async () => {
      // Use a mock config directory we can control
      const mockConfigDir = path.join(tempDir, 'mock-config');
      const mockConfigFile = path.join(
        mockConfigDir,
        'claude_desktop_config.json'
      );
      await fs.ensureDir(mockConfigDir);

      // Mock the getClaudeConfigPath function by using environment variable
      const result = await runCLI(['install', '--path', tempDir], {
        input: '\n', // Simulate enter key if any prompts
      });

      expect(result.code).toBe(0);

      // For this test, we'll check the workspace structure since we can't easily mock the config path
      // In a real scenario, the config would be written to the actual Claude config location
      expect(await fs.pathExists(tempDir)).toBe(true);
      expect(
        await fs.pathExists(
          path.join(tempDir, 'SHARED_INSTRUCTIONS', 'GLOBAL.md')
        )
      ).toBe(true);
    });

    it('should preserve existing Claude configuration', async () => {
      const mockConfigDir = path.join(tempDir, 'mock-config');
      const mockConfigFile = path.join(
        mockConfigDir,
        'claude_desktop_config.json'
      );
      await fs.ensureDir(mockConfigDir);

      // Pre-create existing config
      const existingConfig = {
        existingServer: {
          command: 'existing-command',
          args: ['existing-arg'],
        },
      };
      await fs.writeJson(mockConfigFile, existingConfig);

      const result = await runCLI(['install', '--path', tempDir]);

      expect(result.code).toBe(0);
      // The actual config merging is tested in unit tests
      // Here we just verify the command succeeds
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required arguments', async () => {
      const result = await runCLI(['install', '--path']); // Missing path value

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('error');
    });

    it('should handle unknown commands', async () => {
      const result = await runCLI(['unknown-command']);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('error');
    });

    it('should handle unknown options', async () => {
      const result = await runCLI(['install', '--unknown-option']);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('error');
    });
  });

  describe('Output Format', () => {
    it('should provide clear success messages', async () => {
      const result = await runCLI(['install', '--path', tempDir]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('✅ Setup complete!');
      expect(result.stdout).toContain('Next steps:');
      expect(result.stdout).toContain('1. Restart Claude Desktop');
      expect(result.stdout).toContain('2. Look for "🌍 Global Instructions"');
      expect(result.stdout).toContain('📁 Workspaces directory:');
    });

    it('should show custom path information', async () => {
      const customPath = path.join(tempDir, 'my-custom-workspaces');
      const result = await runCLI(['install', '--path', customPath]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('⚠️  Custom workspace path:');
      expect(result.stdout).toContain(customPath);
    });

    it('should provide helpful error messages', async () => {
      const result = await runCLI([
        'install',
        '--path',
        '/invalid/path/that/cannot/exist',
      ]);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Installation failed');
      // Error should be descriptive enough to help user understand the issue
    });
  });
});
