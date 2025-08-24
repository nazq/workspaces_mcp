#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import path from 'node:path';

const packages = ['mcp-server', 'dxt-workspaces'];

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

    // Set executable permissions for CLI packages
    if (pkg === 'dxt-workspaces') {
      const cliPath = path.join(pkgPath, 'dist', 'index.js');
      if (existsSync(cliPath)) {
        chmodSync(cliPath, '755');
        console.log(`🔧 Set executable permissions for ${cliPath}`);
      }
    }

    console.log(`✅ ${pkg} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${pkg}:`, error);
    process.exit(1);
  }
}

console.log('🎉 All packages built successfully!');
