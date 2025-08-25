#!/usr/bin/env node

// Workspaces MCP CLI - Direct tool testing and debugging interface
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CliRunner } from '../layers/cli/index.js';
import {
  FileSystemWorkspaceRepository,
  NodeFileSystemProvider,
} from '../layers/data/index.js';
import { ToolService } from '../layers/services/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { createChildLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(): Promise<void> {
  // Default workspaces root - can be overridden with env var
  const workspacesRoot =
    process.env.WORKSPACES_ROOT || join(__dirname, '../../tmp/test-workspaces');

  try {
    // Initialize data layer
    const fileSystemProvider = new NodeFileSystemProvider();
    const workspaceRepository = new FileSystemWorkspaceRepository(
      fileSystemProvider,
      workspacesRoot
    );
    // Repository setup for future compatibility

    // Initialize services layer
    const toolRegistry = new ToolRegistry();
    const logger = createChildLogger('cli');
    const toolService = new ToolService(toolRegistry, logger);

    // Initialize CLI runner
    const verbose =
      process.argv.includes('--verbose') || process.argv.includes('-v');
    const cliRunner = new CliRunner(
      { workspacesRoot, verbose },
      workspaceRepository,
      toolService
    );

    // Parse command line arguments (skip node and script name)
    const args = process.argv.slice(2);
    await cliRunner.run(args);
  } catch (error) {
    console.error('CLI initialization failed:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('CLI failed:', error);
  process.exit(1);
});
