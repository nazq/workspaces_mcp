#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

console.log('🚀 Building DXT with embedded MCP server...\n');

const buildMCPServer = async () => {
  console.log('📦 Building MCP server...');
  execSync('npx tsc', {
    cwd: 'packages/mcp-server',
    stdio: 'inherit',
  });
  console.log('✅ MCP server built\n');
};

const buildDXT = async () => {
  console.log('📦 Building DXT...');
  execSync('npx tsc', {
    cwd: 'packages/dxt-workspaces',
    stdio: 'inherit',
  });
  console.log('✅ DXT built\n');
};

const embedServer = async () => {
  console.log('🔗 Embedding MCP server into DXT...');

  const mcpServerPath = 'packages/mcp-server/dist';
  const dxtDistPath = 'packages/dxt-workspaces/dist';

  await fs.mkdir(path.join(dxtDistPath, 'embedded'), { recursive: true });

  await fs.cp(mcpServerPath, path.join(dxtDistPath, 'embedded', 'mcp-server'), {
    recursive: true,
  });

  console.log('✅ MCP server embedded into DXT\n');
};

const main = async () => {
  try {
    await buildMCPServer();
    await buildDXT();
    await embedServer();
    console.log('🎉 DXT with embedded MCP server built successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

main();
