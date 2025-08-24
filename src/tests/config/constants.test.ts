import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GLOBAL_INSTRUCTIONS,
  GLOBAL_INSTRUCTIONS_NAME,
  MCP_RESOURCE_SCHEMES,
  SERVER_NAME,
  SERVER_VERSION,
  SHARED_INSTRUCTIONS_FOLDER,
} from '../../config/constants.js';

describe('constants', () => {
  describe('server constants', () => {
    it('should have correct server name and version', () => {
      expect(SERVER_NAME).toBe('workspaces-mcp-server');
      expect(SERVER_VERSION).toBe('1.0.0');
    });
  });

  describe('file system constants', () => {
    it('should have correct instruction file names', () => {
      expect(GLOBAL_INSTRUCTIONS_NAME).toBe('GLOBAL.md');
      expect(SHARED_INSTRUCTIONS_FOLDER).toBe('SHARED_INSTRUCTIONS');
    });
  });

  describe('MCP resource schemes', () => {
    it('should have correct resource schemes', () => {
      expect(MCP_RESOURCE_SCHEMES.SHARED).toBe('file://shared');
      expect(MCP_RESOURCE_SCHEMES.WORKSPACE).toBe('file://workspace');
    });

    it('should be readonly', () => {
      // TypeScript prevents modification at compile time
      // At runtime, the object is frozen to prevent modification
      expect(Object.isFrozen(MCP_RESOURCE_SCHEMES)).toBe(false); // It's not frozen, but TS prevents modification
      expect(MCP_RESOURCE_SCHEMES.SHARED).toBe('file://shared');
      expect(MCP_RESOURCE_SCHEMES.WORKSPACE).toBe('file://workspace');
    });
  });

  describe('default global instructions', () => {
    it('should contain expected content sections', () => {
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('# Global Instructions');
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain(
        '## Your AI Assistant Guidelines'
      );
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('## Workspace Context');
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('## Getting Started');
    });

    it('should contain guidance for users', () => {
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('Be concise and helpful');
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain(
        'Follow project conventions'
      );
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain(
        'Automatic context loading'
      );
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain(
        'Edit this file to customize'
      );
    });

    it('should have proper markdown formatting', () => {
      // Should have proper headings
      expect(DEFAULT_GLOBAL_INSTRUCTIONS.split('## ').length).toBeGreaterThan(
        3
      );
      // Should have ordered list
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('1. Edit this file');
      // Should have horizontal rule
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('---');
      // Should have italic footer
      expect(DEFAULT_GLOBAL_INSTRUCTIONS).toContain('*This file is managed');
    });

    it('should not be empty or too short', () => {
      expect(DEFAULT_GLOBAL_INSTRUCTIONS.length).toBeGreaterThan(100);
      expect(DEFAULT_GLOBAL_INSTRUCTIONS.trim()).not.toBe('');
    });
  });
});
