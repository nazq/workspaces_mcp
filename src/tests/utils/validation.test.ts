import { describe, expect, it } from 'vitest';

import {
  validateFileContent,
  validateInstructionName,
  validateWorkspaceName,
} from '../../utils/validation.js';

describe('validation', () => {
  describe('validateWorkspaceName', () => {
    it('should accept valid workspace names', () => {
      expect(() => validateWorkspaceName('valid-name')).not.toThrow();
      expect(() => validateWorkspaceName('valid_name')).not.toThrow();
      expect(() => validateWorkspaceName('ValidName123')).not.toThrow();
      expect(() => validateWorkspaceName('project1')).not.toThrow();
    });

    it('should reject invalid workspace names', () => {
      expect(() => validateWorkspaceName('')).toThrow();
      expect(() => validateWorkspaceName('name with spaces')).toThrow();
      expect(() => validateWorkspaceName('name-with-special@chars')).toThrow();
      expect(() => validateWorkspaceName('-starts-with-hyphen')).toThrow();
      expect(() => validateWorkspaceName('ends-with-hyphen-')).toThrow();
      expect(() => validateWorkspaceName('SHARED_INSTRUCTIONS')).toThrow();
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => validateWorkspaceName(longName)).toThrow();
    });
  });

  describe('validateInstructionName', () => {
    it('should accept valid instruction names', () => {
      expect(() => validateInstructionName('react-typescript')).not.toThrow();
      expect(() => validateInstructionName('python_data')).not.toThrow();
      expect(() => validateInstructionName('NodeAPI')).not.toThrow();
    });

    it('should reject invalid instruction names', () => {
      expect(() => validateInstructionName('')).toThrow();
      expect(() => validateInstructionName('name with spaces')).toThrow();
      expect(() => validateInstructionName('GLOBAL')).toThrow();
    });
  });

  describe('validateFileContent', () => {
    it('should accept valid file content', () => {
      expect(() => validateFileContent('Valid content')).not.toThrow();
      expect(() => validateFileContent('')).not.toThrow();
      expect(() => validateFileContent('# Markdown\n\nContent')).not.toThrow();
    });

    it('should reject content that is too large', () => {
      const largeContent = 'a'.repeat(100001);
      expect(() => validateFileContent(largeContent)).toThrow();
    });
  });
});
