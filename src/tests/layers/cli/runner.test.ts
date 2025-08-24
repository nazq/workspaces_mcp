import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../../interfaces/services.js';
import { CliRunner, type CliRunnerConfig } from '../../../layers/cli/runner.js';
import { NodeFileSystemProvider } from '../../../layers/data/filesystem/node-provider.js';
import { FileSystemInstructionsRepository } from '../../../layers/data/repositories/instructions-repository.js';
import { FileSystemWorkspaceRepository } from '../../../layers/data/repositories/workspace-repository.js';
import { ToolService } from '../../../layers/services/tool-service.js';
import { ToolRegistry } from '../../../tools/registry.js';

describe('CliRunner', () => {
  let runner: CliRunner;
  let tempDir: string;
  let workspaceRepository: FileSystemWorkspaceRepository;
  let toolService: ToolService;
  let mockExit: any;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-cli-runner-'));

    const fsProvider = new NodeFileSystemProvider();
    workspaceRepository = new FileSystemWorkspaceRepository(
      fsProvider,
      tempDir
    );

    const instructionsRepository = new FileSystemInstructionsRepository(
      fsProvider,
      path.join(tempDir, 'SHARED_INSTRUCTIONS'),
      path.join(tempDir, 'SHARED_INSTRUCTIONS', 'GLOBAL.md')
    );

    // Create mock logger
    const mockLogger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };

    // Create tool registry
    const toolRegistry = new ToolRegistry();

    toolService = new ToolService(toolRegistry, mockLogger);

    const config: CliRunnerConfig = {
      workspacesRoot: tempDir,
      verbose: false,
    };

    runner = new CliRunner(config, workspaceRepository, toolService);

    // Mock process.exit and console methods
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(runner).toBeInstanceOf(CliRunner);
    });

    it('should initialize with verbose output when configured', () => {
      const verboseConfig: CliRunnerConfig = {
        workspacesRoot: tempDir,
        verbose: true,
      };

      const verboseRunner = new CliRunner(
        verboseConfig,
        workspaceRepository,
        toolService
      );

      expect(verboseRunner).toBeInstanceOf(CliRunner);
    });
  });

  describe('run', () => {
    it('should show help when --help flag is provided', async () => {
      await runner.run(['--help']);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should show help when -h flag is provided', async () => {
      await runner.run(['-h']);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should enable verbose mode when --verbose flag is provided', async () => {
      await runner.run(['--verbose', 'help']);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should enable verbose mode when -v flag is provided', async () => {
      await runner.run(['-v', 'help']);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should show help and exit when no command specified', async () => {
      try {
        await runner.run([]);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        '✗',
        'No command specified'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should show error and exit for unknown command', async () => {
      try {
        await runner.run(['unknown-command']);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        '✗',
        'Unknown command: unknown-command'
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should execute list command successfully', async () => {
      // First create a workspace so list command has something to show
      await workspaceRepository.create('test-workspace');

      await runner.run(['list']);

      // List command should output at least one workspace (which calls console.log via success())
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute help command successfully', async () => {
      await runner.run(['help']);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle command execution errors', async () => {
      // Mock command to throw error
      const mockCommand = {
        name: 'error-command',
        description: 'Command that throws error',
        execute: vi.fn().mockRejectedValue(new Error('Command failed')),
      };

      // Manually add the mock command for testing
      (runner as any).commands.set('error-command', mockCommand);

      try {
        await runner.run(['error-command']);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockConsoleError).toHaveBeenCalledWith('✗', 'Command failed');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should show stack trace in verbose mode when command fails', async () => {
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';

      const mockCommand = {
        name: 'error-command',
        description: 'Command that throws error',
        execute: vi.fn().mockRejectedValue(testError),
      };

      (runner as any).commands.set('error-command', mockCommand);

      try {
        await runner.run(['--verbose', 'error-command']);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(mockConsoleError).toHaveBeenCalledWith('✗', 'Command failed');
      expect(mockConsoleError).toHaveBeenCalledWith('✗', 'Test stack trace');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('parseGlobalFlags', () => {
    it('should parse help flags correctly', () => {
      const result = (runner as any).parseGlobalFlags(['--help', 'list']);

      expect(result.help).toBe(true);
      expect(result.verbose).toBe(false);
      expect(result.remaining).toEqual(['list']);
    });

    it('should parse short help flag', () => {
      const result = (runner as any).parseGlobalFlags(['-h']);

      expect(result.help).toBe(true);
      expect(result.remaining).toEqual([]);
    });

    it('should parse verbose flags correctly', () => {
      const result = (runner as any).parseGlobalFlags(['--verbose', 'create']);

      expect(result.help).toBe(false);
      expect(result.verbose).toBe(true);
      expect(result.remaining).toEqual(['create']);
    });

    it('should parse short verbose flag', () => {
      const result = (runner as any).parseGlobalFlags(['-v', 'list']);

      expect(result.verbose).toBe(true);
      expect(result.remaining).toEqual(['list']);
    });

    it('should parse combined flags', () => {
      const result = (runner as any).parseGlobalFlags([
        '--help',
        '--verbose',
        'info',
        'workspace-name',
      ]);

      expect(result.help).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.remaining).toEqual(['info', 'workspace-name']);
    });

    it('should handle no flags', () => {
      const result = (runner as any).parseGlobalFlags(['list', 'arg1', 'arg2']);

      expect(result.help).toBe(false);
      expect(result.verbose).toBe(false);
      expect(result.remaining).toEqual(['list', 'arg1', 'arg2']);
    });
  });
});
