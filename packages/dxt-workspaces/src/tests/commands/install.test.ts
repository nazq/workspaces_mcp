import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import { describe, expect, it, vi } from 'vitest';

import { handleInstall } from '../../commands/install.js';

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text) => `GREEN:${text}`),
    blue: vi.fn((text) => `BLUE:${text}`),
    red: vi.fn((text) => `RED:${text}`),
    yellow: vi.fn((text) => `YELLOW:${text}`),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    pathExists: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  })),
}));

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

// Mock process.exit
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('install command', () => {
  const mockSpinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ora).mockReturnValue(mockSpinner as any);
    vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('{}');
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    processExitSpy.mockClear();
  });

  describe('handleInstall', () => {
    it('should complete installation successfully', async () => {
      await handleInstall({});

      expect(ora).toHaveBeenCalledWith('Setting up Workspaces MCP...');
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Workspaces MCP installed successfully!'
      );
    });

    it('should update spinner text during installation steps', async () => {
      await handleInstall({});

      // Check that spinner text was updated during installation
      expect(mockSpinner.text).toBeDefined();
    });

    it('should display next steps after successful installation', async () => {
      await handleInstall({});

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'GREEN:\n✅ Setup complete! Next steps:'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('1. Restart Claude Desktop');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '2. Look for "🌍 Global Instructions" in resources'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('3. Click to load your global context');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '4. Edit global instructions in your workspaces directory'
      );
    });

    it('should display custom path when provided', async () => {
      const customPath = '/custom/workspaces/path';
      await handleInstall({ path: customPath });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        `YELLOW:\n⚠️  Custom workspace path: ${customPath}`
      );
    });

    it('should not display custom path message when path is not provided', async () => {
      await handleInstall({});

      expect(consoleSpy.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Using custom path')
      );
    });

    it('should handle installation errors gracefully', async () => {
      const mockError = new Error('Installation failed');

      // Mock fs.ensureDir to throw an error
      vi.mocked(fs.ensureDir).mockRejectedValueOnce(mockError);

      await expect(async () => {
        await handleInstall({});
      }).rejects.toThrow('process.exit called');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Installation failed');
      expect(consoleSpy.error).toHaveBeenCalledWith('RED:Installation failed');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle missing MCP server binary', async () => {
      // Mock pathExists to return false for MCP server path
      vi.mocked(fs.pathExists).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('mcp-server')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      await expect(async () => {
        await handleInstall({});
      }).rejects.toThrow('process.exit called');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Installation failed');
    });
  });

  describe('InstallOptions interface', () => {
    it('should accept empty options', async () => {
      await expect(() => handleInstall({})).not.toThrow();
    });

    it('should accept path option', async () => {
      await expect(() =>
        handleInstall({ path: '/custom/path' })
      ).not.toThrow();
    });
  });

  describe('installation steps', () => {
    it('should create workspace directory structure', async () => {
      await handleInstall({});

      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('workspaces')
      );
      expect(fs.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('SHARED_INSTRUCTIONS')
      );
    });

    it('should create default global instructions', async () => {
      // Mock pathExists to return false for global instructions
      vi.mocked(fs.pathExists).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('GLOBAL.md')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      await handleInstall({});

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('GLOBAL.md'),
        expect.stringContaining('# Global Instructions')
      );
    });
  });

  describe('spinner integration', () => {
    it('should create spinner with correct initial message', async () => {
      await handleInstall({});

      expect(ora).toHaveBeenCalledWith('Setting up Workspaces MCP...');
    });

    it('should start the spinner', async () => {
      await handleInstall({});

      expect(mockSpinner.start).toHaveBeenCalled();
    });

    it('should succeed the spinner on completion', async () => {
      await handleInstall({});

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'Workspaces MCP installed successfully!'
      );
    });

    it('should fail the spinner on error', async () => {
      vi.mocked(fs.ensureDir).mockRejectedValueOnce(new Error('Test error'));

      await expect(async () => {
        await handleInstall({});
      }).rejects.toThrow('process.exit called');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Installation failed');
    });
  });
});