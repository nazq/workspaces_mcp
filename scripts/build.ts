#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

console.log('🔨 Building Workspaces MCP Server...\n');

try {
  execSync('npx tsc', {
    stdio: 'inherit',
  });

  console.log('✅ Workspaces MCP Server built successfully!');
} catch (error) {
  console.error('❌ Failed to build:', error);
  process.exit(1);
}
