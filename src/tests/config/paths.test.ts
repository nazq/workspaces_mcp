import { homedir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  getDefaultWorkspacesRoot,
  getGlobalInstructionsPath,
  getSharedInstructionsPath,
  getWorkspacePath,
} from '../../config/paths.js';

describe('paths', () => {
  describe('getDefaultWorkspacesRoot', () => {
    it('should use environment variable when set', () => {
      const customPath = '/custom/workspaces/path';
      vi.stubEnv('WORKSPACES_ROOT', customPath);

      const result = getDefaultWorkspacesRoot();

      expect(result).toBe(customPath);
    });

    it('should use default path when environment variable is not set', () => {
      vi.stubEnv('WORKSPACES_ROOT', undefined);

      const result = getDefaultWorkspacesRoot();
      const expected = path.join(homedir(), 'Documents', 'workspaces');

      expect(result).toBe(expected);
    });

    it('should return absolute paths', () => {
      const result = getDefaultWorkspacesRoot();
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('getSharedInstructionsPath', () => {
    it('should return correct shared instructions path', () => {
      const workspacesRoot = '/test/workspaces';
      const result = getSharedInstructionsPath(workspacesRoot);
      const expected = path.join(workspacesRoot, 'SHARED_INSTRUCTIONS');

      expect(result).toBe(expected);
    });

    it('should handle different path separators correctly', () => {
      const workspacesRoot = '/test/workspaces';
      const result = getSharedInstructionsPath(workspacesRoot);

      expect(result).toContain('SHARED_INSTRUCTIONS');
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('getGlobalInstructionsPath', () => {
    it('should return correct global instructions path', () => {
      const workspacesRoot = '/test/workspaces';
      const result = getGlobalInstructionsPath(workspacesRoot);
      const expected = path.join(
        workspacesRoot,
        'SHARED_INSTRUCTIONS',
        'GLOBAL.md'
      );

      expect(result).toBe(expected);
    });

    it('should build path using shared instructions path', () => {
      const workspacesRoot = '/test/workspaces';
      const sharedPath = getSharedInstructionsPath(workspacesRoot);
      const globalPath = getGlobalInstructionsPath(workspacesRoot);

      expect(globalPath).toBe(path.join(sharedPath, 'GLOBAL.md'));
    });

    it('should have .md extension', () => {
      const workspacesRoot = '/test/workspaces';
      const result = getGlobalInstructionsPath(workspacesRoot);

      expect(result.endsWith('.md')).toBe(true);
    });
  });

  describe('getWorkspacePath', () => {
    it('should return correct workspace path', () => {
      const workspacesRoot = '/test/workspaces';
      const workspaceName = 'my-project';
      const result = getWorkspacePath(workspacesRoot, workspaceName);
      const expected = path.join(workspacesRoot, workspaceName);

      expect(result).toBe(expected);
    });

    it('should handle workspace names with special characters', () => {
      const workspacesRoot = '/test/workspaces';
      const workspaceName = 'project-with_underscores';
      const result = getWorkspacePath(workspacesRoot, workspaceName);

      expect(result).toContain(workspaceName);
      expect(path.basename(result)).toBe(workspaceName);
    });

    it('should create absolute paths when root is absolute', () => {
      const workspacesRoot = '/absolute/path/workspaces';
      const workspaceName = 'test-workspace';
      const result = getWorkspacePath(workspacesRoot, workspaceName);

      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should create relative paths when root is relative', () => {
      const workspacesRoot = 'relative/workspaces';
      const workspaceName = 'test-workspace';
      const result = getWorkspacePath(workspacesRoot, workspaceName);

      expect(path.isAbsolute(result)).toBe(false);
    });
  });
});
