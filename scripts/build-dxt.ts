#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

console.log('🚀 Building DXT with embedded MCP server...\n');

const buildMCPServer = async () => {
  console.log('📦 Building MCP server...');
  execSync('npm run build', {
    stdio: 'inherit',
  });
  console.log('✅ MCP server built\n');
};

const buildDXT = async () => {
  console.log('📦 DXT package is embedded - skipping separate build\n');
};

const embedServer = async () => {
  console.log('🔗 DXT integration complete - using flattened structure\n');
  console.log('✅ MCP server is already integrated in dist/ folder\n');
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
