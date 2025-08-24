import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Disable file watching to prevent EMFILE issues
    watch: false,
    // Reduce parallelism to avoid too many open files
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.*',
        '**/*.d.ts',
        'tests/fixtures/**',
        'scripts/**',
        'src/tests/**',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
      // Reduce the number of files opened simultaneously
      reportsDirectory: './coverage',
      clean: true,
    },
    include: ['packages/*/src/tests/**/*.test.ts', '**/src/tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'cypress',
      'tests/integration/install.test.ts',
      'tests/integration/mcp-protocol.test.ts',
      '**/index.test.ts',
      '**/mcp-protocol.test.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    passWithNoTests: true,
    logHeapUsage: false, // Reduce logging overhead
    allowOnly: process.env.CI !== 'true',
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['default'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
    // Reduce file system operations
    server: {
      deps: {
        external: ['**/node_modules/**'],
      },
    },
  },
});
