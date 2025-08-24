#!/usr/bin/env node
import { Command } from 'commander';

import { handleInstall } from './commands/install.js';

const program = new Command();

program
  .name('dxt-workspaces')
  .description('Workspaces MCP Developer Experience Toolkit')
  .version('1.0.0');

program
  .command('install')
  .description('Install and setup Workspaces MCP for Claude Desktop')
  .option('--path <path>', 'Custom workspaces directory path')
  .action(handleInstall);

program.parse(process.argv);

export { program };
