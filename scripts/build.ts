#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const packages = ['mcp-server'];

console.log('🔨 Building all packages...\n');

for (const pkg of packages) {
  const pkgPath = path.join('packages', pkg);

  if (!existsSync(pkgPath)) {
    console.error(`❌ Package ${pkg} not found at ${pkgPath}`);
    process.exit(1);
  }

  console.log(`📦 Building ${pkg}...`);

  try {
    execSync('npx tsc', {
      cwd: pkgPath,
      stdio: 'inherit',
    });

    // MCP server built successfully

    console.log(`✅ ${pkg} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${pkg}:`, error);
    process.exit(1);
  }
}

console.log('🎉 All packages built successfully!');
