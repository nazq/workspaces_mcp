import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createChildLogger, logger } from '../../utils/logger.js';

describe('logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Spy on process.stderr.write
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;

    // Restore stderr
    stderrSpy.mockRestore();
  });

  describe('log level filtering', () => {
    it('should respect WORKSPACES_LOG_LEVEL environment variable', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'error';

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // Only error and above should be logged when level is 'error'
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [workspaces-mcp] error message')
      );
    });

    it('should default to info level when no environment variable is set', () => {
      delete process.env.WORKSPACES_LOG_LEVEL;

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');

      // debug should not be logged, info and warn should be
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [workspaces-mcp] info message')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [workspaces-mcp] warn message')
      );
    });

    it('should handle case insensitive log levels', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'WARN';

      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // Only warn and above should be logged
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [workspaces-mcp] warn message')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [workspaces-mcp] error message')
      );
    });

    it('should handle debug level logging', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'debug';

      logger.debug('debug message');
      logger.info('info message');

      // All levels should be logged when level is debug
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [workspaces-mcp] debug message')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [workspaces-mcp] info message')
      );
    });

    it('should handle fatal level logging', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'fatal';

      logger.error('error message');
      logger.fatal('fatal message');

      // Only fatal should be logged
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL] [workspaces-mcp] fatal message')
      );
    });
  });

  describe('log message formatting', () => {
    beforeEach(() => {
      process.env.WORKSPACES_LOG_LEVEL = 'debug';
    });

    it('should format log messages with timestamp, level, and name', () => {
      const testMessage = 'test message';
      logger.info(testMessage);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[workspaces-mcp\] test message\n$/
        )
      );
    });

    it('should handle multiple arguments', () => {
      logger.info('message', 123, true);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [workspaces-mcp] message 123 true')
      );
    });

    it('should serialize objects to JSON', () => {
      const testObject = { key: 'value', number: 42 };
      logger.info('object:', testObject);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[INFO] [workspaces-mcp] object: {"key":"value","number":42}'
        )
      );
    });

    it('should handle null and undefined values', () => {
      logger.info('values:', null, undefined);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[INFO] [workspaces-mcp] values: null undefined'
        )
      );
    });

    it('should convert all arguments to strings', () => {
      logger.info('mixed:', 42, true, { test: true }, [1, 2, 3]);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[INFO] [workspaces-mcp] mixed: 42 true {"test":true} [1,2,3]'
        )
      );
    });
  });

  describe('error handling', () => {
    it('should handle JSON serialization errors silently', () => {
      // Create a circular reference to cause JSON.stringify to throw
      const circular: any = { name: 'circular' };
      circular.self = circular;

      process.env.WORKSPACES_LOG_LEVEL = 'debug';

      // This should not throw
      expect(() => {
        logger.info('circular:', circular);
      }).not.toThrow();

      // Since JSON.stringify fails, the try-catch prevents stderr.write
      // The key requirement is that it doesn't throw, not that it writes
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should handle stderr write errors silently', () => {
      stderrSpy.mockImplementation(() => {
        throw new Error('Write failed');
      });

      process.env.WORKSPACES_LOG_LEVEL = 'debug';

      // This should not throw despite stderr.write throwing
      expect(() => {
        logger.info('test message');
      }).not.toThrow();
    });
  });

  describe('createChildLogger', () => {
    beforeEach(() => {
      process.env.WORKSPACES_LOG_LEVEL = 'debug';
    });

    it('should create child logger with custom name', () => {
      const childLogger = createChildLogger('test-service');

      childLogger.info('child message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [test-service] child message')
      );
    });

    it('should create child logger that respects log levels', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'warn';

      const childLogger = createChildLogger('child');

      childLogger.debug('debug msg');
      childLogger.info('info msg');
      childLogger.warn('warn msg');
      childLogger.error('error msg');

      // Only warn and error should be logged
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [child] warn msg')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [child] error msg')
      );
    });

    it('should create multiple independent child loggers', () => {
      const logger1 = createChildLogger('service-1');
      const logger2 = createChildLogger('service-2');

      logger1.info('message from service 1');
      logger2.error('error from service 2');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [service-1] message from service 1')
      );
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [service-2] error from service 2')
      );
    });

    it('should handle all log levels for child loggers', () => {
      const childLogger = createChildLogger('child');

      childLogger.debug('debug');
      childLogger.info('info');
      childLogger.warn('warn');
      childLogger.error('error');
      childLogger.fatal('fatal');

      expect(stderrSpy).toHaveBeenCalledTimes(5);

      const calls = stderrSpy.mock.calls.map((call) => call[0]);
      expect(calls[0]).toContain('[DEBUG] [child] debug');
      expect(calls[1]).toContain('[INFO] [child] info');
      expect(calls[2]).toContain('[WARN] [child] warn');
      expect(calls[3]).toContain('[ERROR] [child] error');
      expect(calls[4]).toContain('[FATAL] [child] fatal');
    });
  });

  describe('main logger methods', () => {
    beforeEach(() => {
      process.env.WORKSPACES_LOG_LEVEL = 'debug';
    });

    it('should have debug method', () => {
      logger.debug('debug message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [workspaces-mcp] debug message')
      );
    });

    it('should have info method', () => {
      logger.info('info message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [workspaces-mcp] info message')
      );
    });

    it('should have warn method', () => {
      logger.warn('warn message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [workspaces-mcp] warn message')
      );
    });

    it('should have error method', () => {
      logger.error('error message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [workspaces-mcp] error message')
      );
    });

    it('should have fatal method', () => {
      logger.fatal('fatal message');

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL] [workspaces-mcp] fatal message')
      );
    });
  });

  describe('STDIO protocol compatibility', () => {
    it('should only write to stderr, never stdout', () => {
      const stdoutSpy = vi.spyOn(process.stdout, 'write');

      process.env.WORKSPACES_LOG_LEVEL = 'debug';

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.fatal('fatal');

      // Should never write to stdout (reserved for JSON-RPC)
      expect(stdoutSpy).not.toHaveBeenCalled();

      // Should write to stderr
      expect(stderrSpy).toHaveBeenCalledTimes(5);

      stdoutSpy.mockRestore();
    });
  });
});
