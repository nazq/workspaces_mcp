import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.*',
        '**/*.d.ts',
        'tests/fixtures/**',
        'scripts/**',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    include: ['packages/*/src/tests/**/*.test.ts', '**/src/tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'cypress',
      'tests/integration/**/*.test.ts',
      '**/logger.test.ts',
      '**/index.test.ts',
      '**/mcp-protocol.test.ts',
    ],
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    passWithNoTests: true,
    logHeapUsage: true,
    allowOnly: process.env.CI !== 'true',
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});
