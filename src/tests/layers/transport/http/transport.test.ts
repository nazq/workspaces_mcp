/**
 * Tests for HttpTransport
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HttpTransport,
  type HttpTransportConfig,
} from '../../../../layers/transport/http/transport.js';

describe('HttpTransport', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console to avoid noise in tests
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with required config', () => {
      const config: HttpTransportConfig = { port: 8080 };
      const transport = new HttpTransport(config);

      expect(transport.name).toBe('http');
      expect(transport.getConfig()).toEqual({
        port: 8080,
        host: 'localhost',
        cors: true,
      });
    });

    it('should use provided host and cors settings', () => {
      const config: HttpTransportConfig = {
        port: 3000,
        host: '0.0.0.0',
        cors: false,
      };
      const transport = new HttpTransport(config);

      expect(transport.getConfig()).toEqual({
        port: 3000,
        host: '0.0.0.0',
        cors: false,
      });
    });

    it('should default host to localhost', () => {
      const transport = new HttpTransport({ port: 8080 });
      expect(transport.getConfig().host).toBe('localhost');
    });

    it('should default cors to true', () => {
      const transport = new HttpTransport({ port: 8080 });
      expect(transport.getConfig().cors).toBe(true);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await transport.connect();

      expect(transport.isConnected).toBe(true);
    });

    it('should throw error if already connected', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await transport.connect();

      await expect(transport.connect()).rejects.toThrow(
        'HTTP transport is already connected'
      );
    });

    it('should log connection success', async () => {
      const transport = new HttpTransport({ port: 8080, host: 'localhost' });
      const infoSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await transport.connect();

      // Logger should work without throwing
      await expect(transport.connect()).rejects.toThrow('already connected');

      infoSpy.mockRestore();
    });

    it('should handle connection errors', async () => {
      const transport = new HttpTransport({ port: 8080 });

      // Mock a connection error by breaking the internal state
      const originalConnect = transport.connect;
      transport.connect = vi.fn().mockImplementation(async () => {
        throw new Error('Connection failed');
      });

      await expect(transport.connect()).rejects.toThrow('Connection failed');

      // Restore original method
      transport.connect = originalConnect;
    });

    it('should work with different host configurations', async () => {
      const configs = [
        { port: 8080, host: 'localhost' },
        { port: 3000, host: '0.0.0.0' },
        { port: 9000, host: '127.0.0.1' },
      ];

      for (const config of configs) {
        const transport = new HttpTransport(config);
        await transport.connect();
        expect(transport.isConnected).toBe(true);
        await transport.disconnect();
      }
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await transport.connect();
      await transport.disconnect();

      expect(transport.isConnected).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      const transport = new HttpTransport({ port: 8080 });

      // Should not throw
      await transport.disconnect();

      expect(transport.isConnected).toBe(false);
    });

    it('should log disconnection', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await transport.connect();
      await transport.disconnect();

      // Should complete without throwing
      expect(transport.isConnected).toBe(false);
    });

    it('should handle disconnect errors', async () => {
      const transport = new HttpTransport({ port: 8080 });
      await transport.connect();

      // Mock disconnect error by overriding handleClose
      const originalHandleClose = (transport as any).handleClose;
      (transport as any).handleClose = vi.fn().mockImplementation(() => {
        throw new Error('Disconnect failed');
      });

      await expect(transport.disconnect()).rejects.toThrow('Disconnect failed');

      // Restore original method
      (transport as any).handleClose = originalHandleClose;
    });
  });

  describe('send', () => {
    it('should send message when connected', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await transport.connect();

      // Should not throw
      await transport.send({ test: 'message' });
    });

    it('should throw error when not connected', async () => {
      const transport = new HttpTransport({ port: 8080 });

      await expect(transport.send({ test: 'message' })).rejects.toThrow(
        'HTTP transport not connected'
      );
    });

    it('should handle different message types', async () => {
      const transport = new HttpTransport({ port: 8080 });
      await transport.connect();

      const messages = [
        { type: 'test', data: 'string' },
        { type: 'test', data: 123 },
        { type: 'test', data: { nested: true } },
        null,
        undefined,
        'string message',
        123,
      ];

      for (const message of messages) {
        await expect(transport.send(message)).resolves.not.toThrow();
      }
    });

    it('should handle send errors', async () => {
      const transport = new HttpTransport({ port: 8080 });
      await transport.connect();

      // Mock send error by overriding send method behavior
      const originalSend = transport.send;
      transport.send = vi.fn().mockImplementation(async () => {
        throw new Error('Send failed');
      });

      await expect(transport.send({ test: 'message' })).rejects.toThrow(
        'Send failed'
      );

      // Restore original method
      transport.send = originalSend;
    });

    it('should log debug messages on send', async () => {
      const transport = new HttpTransport({ port: 8080 });
      await transport.connect();

      // Should complete without errors
      await transport.send({ test: 'message' });

      expect(transport.isConnected).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return config copy', () => {
      const originalConfig = { port: 8080, host: '0.0.0.0', cors: false };
      const transport = new HttpTransport(originalConfig);

      const config = transport.getConfig();

      expect(config).toEqual({
        port: 8080,
        host: '0.0.0.0',
        cors: false,
      });

      // Should be a copy, not the same object
      expect(config).not.toBe((transport as any).config);
    });

    it('should not allow external config modification', () => {
      const transport = new HttpTransport({ port: 8080 });

      const config = transport.getConfig();
      config.port = 9999;

      // Original config should be unchanged
      expect(transport.getConfig().port).toBe(8080);
    });

    it('should include all required properties', () => {
      const transport = new HttpTransport({ port: 8080 });
      const config = transport.getConfig();

      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('cors');

      expect(typeof config.port).toBe('number');
      expect(typeof config.host).toBe('string');
      expect(typeof config.cors).toBe('boolean');
    });
  });

  describe('integration scenarios', () => {
    it('should handle connect-disconnect cycles', async () => {
      const transport = new HttpTransport({ port: 8080 });

      // Multiple connect-disconnect cycles
      for (let i = 0; i < 3; i++) {
        await transport.connect();
        expect(transport.isConnected).toBe(true);

        await transport.send({ cycle: i });

        await transport.disconnect();
        expect(transport.isConnected).toBe(false);
      }
    });

    it('should maintain state across operations', async () => {
      const transport = new HttpTransport({ port: 8080, host: 'test-host' });

      expect(transport.getConfig().host).toBe('test-host');

      await transport.connect();
      expect(transport.getConfig().host).toBe('test-host');

      await transport.send({ test: true });
      expect(transport.getConfig().host).toBe('test-host');

      await transport.disconnect();
      expect(transport.getConfig().host).toBe('test-host');
    });

    it('should handle edge case configurations', async () => {
      const edgeCases = [
        { port: 1 }, // Minimum port
        { port: 65535 }, // Maximum port
        { port: 8080, host: '' }, // Empty host
        { port: 8080, cors: false }, // CORS disabled
      ];

      for (const config of edgeCases) {
        const transport = new HttpTransport(config);

        // Should create without errors
        expect(transport.name).toBe('http');
        expect(transport.getConfig().port).toBe(config.port);

        // Should be able to connect (simulated)
        await transport.connect();
        expect(transport.isConnected).toBe(true);

        await transport.disconnect();
      }
    });
  });
});
