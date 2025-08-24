import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MCP_RESOURCE_SCHEMES } from '../../../config/constants.js';
import { ResourceHandler } from '../../../server/handlers/resources.js';

describe('ResourceHandler', () => {
  let resourceHandler: ResourceHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-resources-'));
    resourceHandler = new ResourceHandler(tempDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('listResources', () => {
    it('should always include global instructions as first resource', async () => {
      const result = await resourceHandler.listResources();

      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources[0]).toMatchObject({
        uri: `${MCP_RESOURCE_SCHEMES.SHARED}/GLOBAL.md`,
        name: '🌍 Global Instructions',
        description:
          '⭐ Essential global instructions - loads automatically for all sessions',
        mimeType: 'text/markdown',
      });
    });

    it('should include shared instructions', async () => {
      // Create shared instructions directory and files
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      await fs.ensureDir(sharedDir);
      await fs.writeFile(path.join(sharedDir, 'react.md'), '# React Guide');
      await fs.writeFile(path.join(sharedDir, 'python.md'), '# Python Guide');

      const result = await resourceHandler.listResources();

      const sharedResources = result.resources.filter((r) =>
        r.uri.includes('/react.md')
      );
      expect(sharedResources).toHaveLength(1);
      expect(sharedResources[0]).toMatchObject({
        uri: `${MCP_RESOURCE_SCHEMES.SHARED}/react.md`,
        name: '📋 react',
        description: 'Shared instructions for react projects',
        mimeType: 'text/markdown',
      });
    });

    it('should include workspaces and their files', async () => {
      // Create workspace with files
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      await fs.writeFile(path.join(workspaceDir, 'README.md'), '# Test Workspace');
      await fs.writeFile(path.join(workspaceDir, 'notes.txt'), 'Some notes');

      const result = await resourceHandler.listResources();

      // Should include workspace resource (check more specifically)
      const workspaceResources = result.resources.filter((r) =>
        r.uri === `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace`
      );
      expect(workspaceResources.length).toBeGreaterThan(0);

      // Should include workspace files
      const fileResources = result.resources.filter((r) =>
        r.uri.includes('/test-workspace/README.md')
      );
      expect(fileResources).toHaveLength(1);
      expect(fileResources[0]).toMatchObject({
        uri: `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace/README.md`,
        name: '📄 test-workspace/README.md',
        mimeType: 'text/markdown',
      });
    });

    it('should handle errors gracefully when listing resources', async () => {
      // This should not throw even if directories don't exist
      const result = await resourceHandler.listResources();

      // Should at least have global instructions
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]?.name).toBe('🌍 Global Instructions');
    });
  });

  describe('readResource', () => {
    it('should read global instructions', async () => {
      const uri = `${MCP_RESOURCE_SCHEMES.SHARED}/GLOBAL.md`;
      const result = await resourceHandler.readResource(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: `${MCP_RESOURCE_SCHEMES.SHARED}/GLOBAL.md`,
        mimeType: 'text/markdown',
      });
      expect(result.contents[0]?.text).toContain('# Global Instructions');
    });

    it('should read shared instructions', async () => {
      // Create shared instruction
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      await fs.ensureDir(sharedDir);
      const content = '# React Guide\n\nUse hooks and TypeScript.';
      await fs.writeFile(path.join(sharedDir, 'react.md'), content);

      const uri = `${MCP_RESOURCE_SCHEMES.SHARED}/react.md`;
      const result = await resourceHandler.readResource(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri,
        mimeType: 'text/markdown',
        text: content,
      });
    });

    it('should read workspace metadata', async () => {
      // Create workspace
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      await fs.writeFile(path.join(workspaceDir, 'README.md'), '# Test');

      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace`;
      const result = await resourceHandler.readResource(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri,
        mimeType: 'application/json',
      });

      const workspaceData = JSON.parse(result.contents[0]?.text || '{}');
      expect(workspaceData.name).toBe('test-workspace');
      expect(workspaceData.files).toContain('README.md');
    });

    it('should read workspace files', async () => {
      // Create workspace with file
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      const fileContent = '# Project README\n\nThis is a test project.';
      await fs.writeFile(path.join(workspaceDir, 'README.md'), fileContent);

      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace/README.md`;
      const result = await resourceHandler.readResource(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri,
        mimeType: 'text/markdown',
        text: fileContent,
      });
    });

    it('should read text files from workspace', async () => {
      // Create workspace with text file
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      const fileContent = 'Plain text content';
      await fs.writeFile(path.join(workspaceDir, 'notes.txt'), fileContent);

      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace/notes.txt`;
      const result = await resourceHandler.readResource(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri,
        mimeType: 'text/plain',
        text: fileContent,
      });
    });

    it('should throw error for unsupported URI scheme', async () => {
      const uri = 'http://example.com/resource';

      await expect(resourceHandler.readResource(uri)).rejects.toThrow(
        'Unsupported resource URI: http://example.com/resource'
      );
    });

    it('should throw error for invalid workspace resource path', async () => {
      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow(
        'Invalid workspace resource path'
      );
    });

    it('should throw error for path traversal attempts', async () => {
      // Create workspace first so the path validation is triggered
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      await fs.writeFile(path.join(workspaceDir, 'README.md'), '# Test');

      // Test path: test-workspace/../../../etc/passwd should be rejected
      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace/../../../etc/passwd`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow();
    });

    it('should throw error for absolute path attempts', async () => {
      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace//etc/passwd`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow(
        'Invalid file path'
      );
    });

    it('should throw error for non-existent shared instruction', async () => {
      const uri = `${MCP_RESOURCE_SCHEMES.SHARED}/non-existent.md`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow();
    });

    it('should throw error for non-existent workspace', async () => {
      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/non-existent`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow();
    });

    it('should throw error for non-existent workspace file', async () => {
      // Create workspace but not the file
      const workspaceDir = path.join(tempDir, 'test-workspace');
      await fs.ensureDir(workspaceDir);
      await fs.writeFile(path.join(workspaceDir, 'README.md'), '# Test');

      const uri = `${MCP_RESOURCE_SCHEMES.WORKSPACE}/test-workspace/non-existent.md`;

      await expect(resourceHandler.readResource(uri)).rejects.toThrow();
    });
  });
});