import { Logger } from 'tslog';
import { describe, expect, it, vi } from 'vitest';

import { createChildLogger, logger } from '../../utils/logger.js';

// Mock tslog
vi.mock('tslog', () => ({
  Logger: vi.fn().mockImplementation((config) => ({
    name: config.name,
    minLevel: config.minLevel,
    type: config.type,
    hideLogPositionForProduction: config.hideLogPositionForProduction,
    getSubLogger: vi.fn().mockImplementation((subConfig) => ({
      name: subConfig.name,
      parentName: config.name,
    })),
  })),
}));

describe('logger', () => {
  describe('main logger configuration', () => {
    it('should create logger with correct default configuration', () => {
      vi.stubEnv('WORKSPACES_LOG_LEVEL', undefined);
      vi.stubEnv('NODE_ENV', undefined);

      // Re-import to get fresh logger with new env
      vi.resetModules();

      expect(Logger).toHaveBeenCalledWith({
        name: 'workspaces-mcp',
        minLevel: 3, // info level
        type: 'pretty',
        hideLogPositionForProduction: false,
      });
    });

    it('should use correct log level from environment', async () => {
      const testCases = [
        { env: 'debug', level: 0 },
        { env: 'info', level: 3 },
        { env: 'warn', level: 4 },
        { env: 'error', level: 5 },
        { env: 'fatal', level: 6 },
        { env: 'invalid', level: 3 }, // defaults to info
      ];

      for (const { env, level } of testCases) {
        vi.stubEnv('WORKSPACES_LOG_LEVEL', env);
        vi.resetModules();

        // Dynamically import to get fresh logger
        await import('../../utils/logger.js');
        const lastCall = vi.mocked(Logger).mock.calls.at(-1);
        expect(lastCall?.[0].minLevel).toBe(level);
      }
    });

    it('should set hideLogPositionForProduction when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.resetModules();

      import('../../utils/logger.js').then(() => {
        const lastCall = vi.mocked(Logger).mock.calls.at(-1);
        expect(lastCall?.[0].hideLogPositionForProduction).toBe(true);
      });
    });

    it('should not hide log position for non-production environments', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.resetModules();

      import('../../utils/logger.js').then(() => {
        const lastCall = vi.mocked(Logger).mock.calls.at(-1);
        expect(lastCall?.[0].hideLogPositionForProduction).toBe(false);
      });
    });
  });

  describe('createChildLogger', () => {
    it('should create child logger with correct name', () => {
      const childName = 'test-child';
      const childLogger = createChildLogger(childName);

      expect(logger.getSubLogger).toHaveBeenCalledWith({ name: childName });
      expect(childLogger.name).toBe(childName);
      expect(childLogger.parentName).toBe('workspaces-mcp');
    });

    it('should create multiple child loggers', () => {
      const names = ['server', 'tools', 'resources'];
      const childLoggers = names.map(createChildLogger);

      expect(childLoggers).toHaveLength(3);
      names.forEach((name, index) => {
        expect(childLoggers[index]?.name).toBe(name);
      });
    });

    it('should call getSubLogger on main logger instance', () => {
      const mockGetSubLogger = vi.fn();
      logger.getSubLogger = mockGetSubLogger;

      const childName = 'test-logger';
      createChildLogger(childName);

      expect(mockGetSubLogger).toHaveBeenCalledWith({ name: childName });
    });
  });

  describe('logger properties', () => {
    it('should have correct logger name', () => {
      expect(logger.name).toBe('workspaces-mcp');
    });

    it('should have pretty type', () => {
      expect(logger.type).toBe('pretty');
    });

    it('should have correct default min level', () => {
      vi.stubEnv('WORKSPACES_LOG_LEVEL', undefined);
      expect(logger.minLevel).toBe(3); // info level
    });
  });

  describe('log level mapping', () => {
    it('should map environment variables to correct log levels', () => {
      const levelMap = {
        debug: 0,
        info: 3,
        warn: 4,
        error: 5,
        fatal: 6,
      };

      Object.entries(levelMap).forEach(([envValue, expectedLevel]) => {
        vi.stubEnv('WORKSPACES_LOG_LEVEL', envValue);
        vi.resetModules();

        import('../../utils/logger.js').then(() => {
          const lastCall = vi.mocked(Logger).mock.calls.at(-1);
          expect(lastCall?.[0].minLevel).toBe(expectedLevel);
        });
      });
    });

    it('should handle case insensitive environment values', async () => {
      const testCases = [
        { env: 'DEBUG', level: 0 },
        { env: 'Info', level: 3 },
        { env: 'WARN', level: 4 },
        { env: 'Error', level: 5 },
        { env: 'FATAL', level: 6 },
      ];

      for (const { env, level } of testCases) {
        vi.stubEnv('WORKSPACES_LOG_LEVEL', env);
        vi.resetModules();

        await import('../../utils/logger.js');
        const lastCall = vi.mocked(Logger).mock.calls.at(-1);
        expect(lastCall?.[0].minLevel).toBe(level);
      }
    });
  });
});
