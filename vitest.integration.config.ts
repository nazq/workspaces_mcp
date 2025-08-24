import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'packages/*/node_modules/**',
      'packages/*/dist/**',
    ],
    globals: true,
    environment: 'node',
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 30000,
    poolOptions: {
      threads: {
        singleThread: true, // Run integration tests sequentially to avoid conflicts
      },
    },
    coverage: {
      provider: 'v8',
      enabled: false, // Disable coverage for integration tests
    },
    reporters: ['verbose'],
  },
  esbuild: {
    target: 'node18',
  },
});
