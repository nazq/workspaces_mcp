#!/usr/bin/env tsx
import { spawn } from 'node:child_process';

const processes = [
  {
    name: 'MCP Server',
    command: 'tsx',
    args: ['watch', 'packages/mcp-server/src/index.ts'],
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'DXT CLI',
    command: 'tsx',
    args: ['watch', 'packages/dxt-workspaces/src/index.ts'],
    color: '\x1b[33m', // Yellow
  },
];

const reset = '\x1b[0m';

console.log('🚀 Starting development servers...\n');

processes.forEach(({ name, command, args, color }) => {
  const child = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
  });

  child.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => {
      console.log(`${color}[${name}]${reset} ${line}`);
    });
  });

  child.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach((line: string) => {
      console.error(`${color}[${name}]${reset} ${line}`);
    });
  });

  child.on('close', (code) => {
    console.log(`${color}[${name}]${reset} Process exited with code ${code}`);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development servers...');
  process.exit(0);
});
