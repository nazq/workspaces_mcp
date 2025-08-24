import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TransportFactory,
  type TransportFactoryConfig,
} from '../../../layers/transport/factory.js';
import { HttpTransport } from '../../../layers/transport/http/transport.js';
import { StdioTransport } from '../../../layers/transport/stdio/transport.js';

describe('TransportFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];
  let originalStdin: any;
  let originalStdout: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    originalStdin = { ...process.stdin };
    originalStdout = { ...process.stdout };

    // Mock STDIO validation to prevent actual stream validation
    vi.spyOn(StdioTransport, 'validateStdioEnvironment').mockImplementation(
      () => {}
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    Object.assign(process.stdin, originalStdin);
    Object.assign(process.stdout, originalStdout);
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create STDIO transport by explicit type', () => {
      const config: TransportFactoryConfig = { type: 'stdio' };

      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.name).toBe('stdio');
    });

    it('should create HTTP transport by explicit type', () => {
      const config: TransportFactoryConfig = {
        type: 'http',
        http: { port: 8080 },
      };

      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.name).toBe('http');
    });

    it('should create HTTP transport with default config', () => {
      const config: TransportFactoryConfig = { type: 'http' };

      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should throw error for unsupported transport type', () => {
      const config = { type: 'websocket' } as any;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: websocket'
      );
    });
  });

  describe('transport detection', () => {
    it('should use explicit MCP_TRANSPORT environment variable', () => {
      process.env.MCP_TRANSPORT = 'HTTP';

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should ignore invalid MCP_TRANSPORT values', () => {
      process.env.MCP_TRANSPORT = 'invalid';
      process.env.NODE_ENV = 'development';

      const transport = TransportFactory.create();

      // Should fall back to auto-detection (development = HTTP)
      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should auto-detect STDIO environment', () => {
      process.env.NODE_ENV = 'production';
      // Mock non-TTY environment
      Object.defineProperty(process.stdin, 'isTTY', { value: false });
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(StdioTransport);
    });

    it('should auto-detect development environment (NODE_ENV=development)', () => {
      process.env.NODE_ENV = 'development';

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should auto-detect development environment (NODE_ENV includes dev)', () => {
      process.env.NODE_ENV = 'development-local';

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should auto-detect development environment (--dev flag)', () => {
      // Set development environment to ensure it's not confused with STDIO detection
      process.env.NODE_ENV = 'development';
      process.env.MCP_TRANSPORT = '';

      // Store original argv and replace with test argv
      const originalArgv = process.argv;
      process.argv = ['node', 'test', '--dev'];

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);

      // Restore original argv and env
      process.argv = originalArgv;
    });

    it('should auto-detect development environment (--http flag)', () => {
      // Set development environment to ensure it's not confused with STDIO detection
      process.env.NODE_ENV = 'development';
      process.env.MCP_TRANSPORT = '';

      // Store original argv and replace with test argv
      const originalArgv = process.argv;
      process.argv = ['node', 'test', '--http'];

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);

      // Restore original argv and env
      process.argv = originalArgv;
    });

    it('should default to STDIO transport', () => {
      process.env.NODE_ENV = 'production';
      process.env.MCP_TRANSPORT = '';

      // Clear argv to avoid conflicts
      const originalArgv = process.argv;
      process.argv = ['node', 'test'];

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(StdioTransport);

      process.argv = originalArgv;
    });
  });

  describe('environment detection helpers', () => {
    it('should detect STDIO environment correctly', () => {
      process.env.NODE_ENV = 'production';
      Object.defineProperty(process.stdin, 'isTTY', { value: false });
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(StdioTransport);
    });

    it('should not detect STDIO environment in development', () => {
      process.env.NODE_ENV = 'development';
      Object.defineProperty(process.stdin, 'isTTY', { value: false });
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      const transport = TransportFactory.create();

      expect(transport).toBeInstanceOf(HttpTransport);
    });
  });
});
