import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkspacesMcpServer,
  WorkspacesMcpServer,
  type ServerConfig,
} from '../../layers/server.js';

describe('WorkspacesMcpServer', () => {
  let tempDir: string;
  let server: WorkspacesMcpServer;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-server-'));
  });

  afterEach(async () => {
    if (server?.running) {
      await server.stop();
    }
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('constructor', () => {
    it('should create server with default configuration', () => {
      server = new WorkspacesMcpServer();

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
      expect(server.running).toBe(false);
    });

    it('should create server with custom workspaces root', () => {
      const config: ServerConfig = {
        workspacesRoot: tempDir,
      };

      server = new WorkspacesMcpServer(config);

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
      expect(server.running).toBe(false);
    });

    it('should create server with protocol configuration', () => {
      const config: ServerConfig = {
        workspacesRoot: tempDir,
        protocol: {
          validateRequests: true,
          logRequests: true,
          rateLimiting: {
            enabled: true,
            maxRequestsPerMinute: 60,
          },
        },
      };

      server = new WorkspacesMcpServer(config);

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
    });
  });

  describe('start', () => {
    it('should throw error when starting already running server', async () => {
      server = new WorkspacesMcpServer({ workspacesRoot: tempDir });

      // Mock the server to be running
      Object.defineProperty(server, 'isRunning', { value: true });

      await expect(server.start()).rejects.toThrow('Server is already running');
    });

    it('should throw error when transport fails to connect', async () => {
      server = new WorkspacesMcpServer({ workspacesRoot: tempDir });

      // Mock TransportFactory to throw error
      const originalCreate = await import('../../layers/transport/factory.js');
      vi.spyOn(originalCreate.TransportFactory, 'create').mockReturnValue({
        name: 'stdio',
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as any);

      await expect(server.start()).rejects.toThrow('Connection failed');
    });
  });

  describe('stop', () => {
    it('should not throw when stopping non-running server', async () => {
      server = new WorkspacesMcpServer({ workspacesRoot: tempDir });

      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should stop running server', async () => {
      server = new WorkspacesMcpServer({ workspacesRoot: tempDir });

      // Simulate running state
      Object.defineProperty(server, 'isRunning', {
        value: true,
        writable: true,
      });

      await server.stop();

      expect(server.running).toBe(false);
    });
  });

  describe('running property', () => {
    it('should return false for new server', () => {
      server = new WorkspacesMcpServer({ workspacesRoot: tempDir });

      expect(server.running).toBe(false);
    });
  });

  describe('graceful shutdown', () => {
    it('should initialize without throwing errors', () => {
      // Test that server initializes properly with signal handlers
      expect(() => {
        server = new WorkspacesMcpServer({ workspacesRoot: tempDir });
      }).not.toThrow();

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
    });
  });

  describe('createWorkspacesMcpServer factory', () => {
    it('should create server with default config', () => {
      server = createWorkspacesMcpServer();

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
    });

    it('should create server with custom config', () => {
      const config: ServerConfig = {
        workspacesRoot: tempDir,
      };

      server = createWorkspacesMcpServer(config);

      expect(server).toBeInstanceOf(WorkspacesMcpServer);
    });
  });
});
