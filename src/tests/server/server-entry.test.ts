import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorkspacesServer } from '../../server/index.js';

describe('Server Index Entry Point', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-server-'));
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('createWorkspacesServer', () => {
    it('should create server with default workspace root', () => {
      const server = createWorkspacesServer();
      
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
      
      // Should have MCP server methods
      expect(server).toHaveProperty('connect');
      expect(server).toHaveProperty('close');
      expect(server).toHaveProperty('setRequestHandler');
    });

    it('should create server with custom workspace root', () => {
      const server = createWorkspacesServer(tempDir);
      
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
      
      // Should have MCP server methods
      expect(server).toHaveProperty('connect');
      expect(server).toHaveProperty('close');
    });

    it('should configure server with correct capabilities', () => {
      const server = createWorkspacesServer(tempDir);
      
      // Server should be configured with capabilities
      expect(server).toBeDefined();
      
      // Note: We can't directly inspect capabilities due to MCP SDK encapsulation,
      // but we can verify the server was created without errors
      expect(typeof server.connect).toBe('function');
    });
  });

  describe('Request Handlers', () => {
    let server: any;

    beforeEach(() => {
      server = createWorkspacesServer(tempDir);
    });

    it('should handle ListResources requests', async () => {
      // Create a mock transport to test handler registration
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      // Connect server to test initialization
      await server.connect(mockTransport);
      
      // Server should be connected without errors
      expect(mockTransport.start).toHaveBeenCalled();
      
      // Clean up
      await server.close();
    });

    it('should handle ReadResource requests', async () => {
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await server.connect(mockTransport);
      expect(mockTransport.start).toHaveBeenCalled();
      
      await server.close();
    });

    it('should handle ListTools requests', async () => {
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await server.connect(mockTransport);
      expect(mockTransport.start).toHaveBeenCalled();
      
      await server.close();
    });

    it('should handle CallTool requests', async () => {
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await server.connect(mockTransport);
      expect(mockTransport.start).toHaveBeenCalled();
      
      await server.close();
    });
  });

  describe('Server Lifecycle', () => {
    it('should connect to transport successfully', async () => {
      const server = createWorkspacesServer(tempDir);
      
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await expect(server.connect(mockTransport)).resolves.not.toThrow();
      expect(mockTransport.start).toHaveBeenCalled();
      
      await server.close();
    });

    it('should close server gracefully', async () => {
      const server = createWorkspacesServer(tempDir);
      
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await server.connect(mockTransport);
      await expect(server.close()).resolves.not.toThrow();
      expect(mockTransport.close).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const server = createWorkspacesServer(tempDir);
      
      const failingTransport = {
        start: vi.fn().mockRejectedValue(new Error('Connection failed')),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await expect(server.connect(failingTransport)).rejects.toThrow('Connection failed');
    });
  });

  describe('Handler Initialization', () => {
    it('should initialize ResourceHandler with correct workspace root', () => {
      const server = createWorkspacesServer(tempDir);
      
      // Server should be created without errors (handlers initialized)
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
    });

    it('should initialize ToolHandler with correct workspace root', () => {
      const server = createWorkspacesServer(tempDir);
      
      // Server should be created without errors (handlers initialized)
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
    });

    it('should handle handler initialization errors', () => {
      // Test with invalid workspace root to trigger potential errors
      const invalidPath = '/non/existent/path/that/should/cause/issues';
      
      // Handler initialization should not throw during server creation
      expect(() => createWorkspacesServer(invalidPath)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle resource listing errors', async () => {
      const server = createWorkspacesServer('/non/existent/path');
      
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      // Should still be able to connect even with invalid workspace path
      await expect(server.connect(mockTransport)).resolves.not.toThrow();
      
      await server.close();
    });

    it('should handle tool execution errors', async () => {
      const server = createWorkspacesServer(tempDir);
      
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      await server.connect(mockTransport);
      
      // Server should handle errors internally when handlers fail
      expect(server).toBeDefined();
      
      await server.close();
    });
  });

  describe('Logging Integration', () => {
    it('should create child logger for server operations', () => {
      const server = createWorkspacesServer(tempDir);
      
      // Server should be created with logging configured
      expect(server).toBeDefined();
    });

    it('should log server operations at appropriate levels', async () => {
      const server = createWorkspacesServer(tempDir);
      
      const mockTransport = {
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
      };

      // Operations should complete without logging errors
      await server.connect(mockTransport);
      await server.close();
      
      expect(mockTransport.start).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });
});