#!/usr/bin/env tsx
import { execSync } from 'node:child_process';

console.log('🧪 Running all tests...\n');

try {
  execSync('npx vitest run', {
    stdio: 'inherit',
  });
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Tests failed:', error);
  process.exit(1);
}
