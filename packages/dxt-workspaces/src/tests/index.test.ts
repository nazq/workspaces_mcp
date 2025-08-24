import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

// Mock the install command handler
vi.mock('../commands/install.js', () => ({
  handleInstall: vi.fn(),
}));

// Mock process.argv to prevent commander from trying to parse actual CLI args
const originalArgv = process.argv;

describe('DXT CLI', () => {
  beforeEach(() => {
    // Set up mock argv for testing
    process.argv = ['node', 'dxt-workspaces'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  describe('program configuration', () => {
    it('should be configured as a Command instance', async () => {
      const { program } = await import('../index.js');
      expect(program).toBeInstanceOf(Command);
    });

    it('should have correct program name', async () => {
      const { program } = await import('../index.js');
      expect(program.name()).toBe('dxt-workspaces');
    });

    it('should have correct description', async () => {
      const { program } = await import('../index.js');
      expect(program.description()).toBe(
        'Workspaces MCP Developer Experience Toolkit'
      );
    });

    it('should have correct version', async () => {
      const { program } = await import('../index.js');
      expect(program.version()).toBe('1.0.0');
    });
  });

  describe('install command', () => {
    it('should have install command configured', async () => {
      const { program } = await import('../index.js');
      const commands = program.commands;
      const installCommand = commands.find((cmd) => cmd.name() === 'install');

      expect(installCommand).toBeDefined();
      expect(installCommand?.description()).toBe(
        'Install and setup Workspaces MCP for Claude Desktop'
      );
    });

    it('should have path option configured', async () => {
      const { program } = await import('../index.js');
      const commands = program.commands;
      const installCommand = commands.find((cmd) => cmd.name() === 'install');
      const options = installCommand?.options;
      const pathOption = options?.find((opt) => opt.long === '--path');

      expect(pathOption).toBeDefined();
      expect(pathOption?.description).toBe('Custom workspaces directory path');
      expect(pathOption?.argumentDescription).toBe('<path>');
    });

    it('should parse command line arguments', () => {
      // Test that program can parse basic arguments without throwing
      expect(() => {
        const testProgram = new Command();
        testProgram
          .name('dxt-workspaces')
          .description('Workspaces MCP Developer Experience Toolkit')
          .version('1.0.0');

        testProgram
          .command('install')
          .description('Install and setup Workspaces MCP for Claude Desktop')
          .option('--path <path>', 'Custom workspaces directory path')
          .action(() => {
            // Mock action
          });

        testProgram.parse(['node', 'dxt-workspaces', 'install', '--path', '/custom/path'], {
          from: 'node',
        });
      }).not.toThrow();
    });
  });

  describe('command structure', () => {
    it('should have correct number of commands', async () => {
      const { program } = await import('../index.js');
      const commands = program.commands;
      expect(commands).toHaveLength(1);
    });

    it('should export program for external use', async () => {
      const { program } = await import('../index.js');
      expect(program).toBeDefined();
      expect(typeof program.parse).toBe('function');
      expect(typeof program.parseAsync).toBe('function');
    });
  });
});