import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_GLOBAL_INSTRUCTIONS } from '../../config/constants.js';
import { InstructionsService } from '../../services/instructions.js';
import { SharedInstructionNotFoundError } from '../../utils/errors.js';

describe('InstructionsService', () => {
  let instructionsService: InstructionsService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-instructions-'));
    instructionsService = new InstructionsService(tempDir);
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('createSharedInstruction', () => {
    it('should create a new shared instruction', async () => {
      const options = {
        content: '# React Project Instructions\n\nUse TypeScript and hooks.',
        description: 'React project template',
      };

      await instructionsService.createSharedInstruction('react-project', options);

      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      const filePath = path.join(sharedDir, 'react-project.md');

      expect(await fs.pathExists(filePath)).toBe(true);
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(options.content);
    });

    it('should validate instruction name', async () => {
      const options = { content: 'Test content' };

      await expect(
        instructionsService.createSharedInstruction('GLOBAL', options)
      ).rejects.toThrow();

      await expect(
        instructionsService.createSharedInstruction('invalid name', options)
      ).rejects.toThrow();
    });

    it('should validate file content', async () => {
      const largeContent = 'a'.repeat(100001);
      const options = { content: largeContent };

      await expect(
        instructionsService.createSharedInstruction('test', options)
      ).rejects.toThrow();
    });
  });

  describe('updateGlobalInstructions', () => {
    it('should create global instructions file if it does not exist', async () => {
      const content = '# Updated Global Instructions\n\nCustom content.';

      await instructionsService.updateGlobalInstructions(content);

      const globalPath = path.join(tempDir, 'SHARED_INSTRUCTIONS', 'GLOBAL.md');
      expect(await fs.pathExists(globalPath)).toBe(true);

      const savedContent = await fs.readFile(globalPath, 'utf8');
      expect(savedContent).toBe(content);
    });

    it('should update existing global instructions', async () => {
      // First create with default content
      await instructionsService.getGlobalInstructions();

      const newContent = '# Updated Global Instructions\n\nNew content.';
      await instructionsService.updateGlobalInstructions(newContent);

      const globalPath = path.join(tempDir, 'SHARED_INSTRUCTIONS', 'GLOBAL.md');
      const savedContent = await fs.readFile(globalPath, 'utf8');
      expect(savedContent).toBe(newContent);
    });

    it('should validate content size', async () => {
      const largeContent = 'a'.repeat(100001);

      await expect(
        instructionsService.updateGlobalInstructions(largeContent)
      ).rejects.toThrow();
    });
  });

  describe('getGlobalInstructions', () => {
    it('should return default global instructions if file does not exist', async () => {
      const result = await instructionsService.getGlobalInstructions();

      expect(result.content).toBe(DEFAULT_GLOBAL_INSTRUCTIONS);
      expect(result.lastModified).toBeInstanceOf(Date);

      // Verify file was created
      const globalPath = path.join(tempDir, 'SHARED_INSTRUCTIONS', 'GLOBAL.md');
      expect(await fs.pathExists(globalPath)).toBe(true);
    });

    it('should return existing global instructions', async () => {
      const customContent = '# Custom Global Instructions\n\nCustom content.';
      await instructionsService.updateGlobalInstructions(customContent);

      const result = await instructionsService.getGlobalInstructions();

      expect(result.content).toBe(customContent);
      expect(result.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('listSharedInstructions', () => {
    it('should return empty list when no shared instructions exist', async () => {
      const instructions = await instructionsService.listSharedInstructions();
      expect(instructions).toHaveLength(0);
    });

    it('should list shared instructions excluding GLOBAL.md', async () => {
      // Create some shared instructions
      await instructionsService.createSharedInstruction('react-project', {
        content: 'React content',
      });
      await instructionsService.createSharedInstruction('python-project', {
        content: 'Python content',
      });

      // Also create global instructions
      await instructionsService.getGlobalInstructions();

      const instructions = await instructionsService.listSharedInstructions();

      expect(instructions).toHaveLength(2);
      const names = instructions.map((inst) => inst.name);
      expect(names).toContain('react-project');
      expect(names).toContain('python-project');
      expect(names).not.toContain('GLOBAL');
    });

    it('should return empty list if shared instructions directory does not exist', async () => {
      const instructions = await instructionsService.listSharedInstructions();
      expect(instructions).toHaveLength(0);
    });

    it('should ignore non-markdown files', async () => {
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      await fs.ensureDir(sharedDir);

      // Create markdown file
      await fs.writeFile(path.join(sharedDir, 'react.md'), 'React content');
      // Create non-markdown files
      await fs.writeFile(path.join(sharedDir, 'readme.txt'), 'Text file');
      await fs.writeFile(path.join(sharedDir, 'config.json'), '{}');

      const instructions = await instructionsService.listSharedInstructions();

      expect(instructions).toHaveLength(1);
      expect(instructions[0]?.name).toBe('react');
    });
  });

  describe('getSharedInstruction', () => {
    it('should return shared instruction content', async () => {
      const options = {
        content: '# React Instructions\n\nUse hooks and TypeScript.',
        description: 'React guide',
      };

      await instructionsService.createSharedInstruction('react', options);
      const instruction = await instructionsService.getSharedInstruction('react');

      expect(instruction.name).toBe('react');
      expect(instruction.content).toBe(options.content);
      expect(instruction.createdAt).toBeInstanceOf(Date);
      expect(instruction.updatedAt).toBeInstanceOf(Date);
      expect(instruction.path).toBe(
        path.join(tempDir, 'SHARED_INSTRUCTIONS', 'react.md')
      );
    });

    it('should throw error for non-existent shared instruction', async () => {
      await expect(
        instructionsService.getSharedInstruction('non-existent')
      ).rejects.toThrow(SharedInstructionNotFoundError);
    });

    it('should validate instruction name', async () => {
      await expect(
        instructionsService.getSharedInstruction('invalid name')
      ).rejects.toThrow();
    });
  });

  describe('deleteSharedInstruction', () => {
    it('should delete existing shared instruction', async () => {
      await instructionsService.createSharedInstruction('test-instruction', {
        content: 'Test content',
      });

      const filePath = path.join(tempDir, 'SHARED_INSTRUCTIONS', 'test-instruction.md');
      expect(await fs.pathExists(filePath)).toBe(true);

      await instructionsService.deleteSharedInstruction('test-instruction');

      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('should throw error when deleting non-existent instruction', async () => {
      await expect(
        instructionsService.deleteSharedInstruction('non-existent')
      ).rejects.toThrow(SharedInstructionNotFoundError);
    });

    it('should validate instruction name', async () => {
      await expect(
        instructionsService.deleteSharedInstruction('invalid name')
      ).rejects.toThrow();
    });
  });

  describe('updateSharedInstruction', () => {
    it('should update existing shared instruction', async () => {
      const originalContent = '# Original Content';
      await instructionsService.createSharedInstruction('test', {
        content: originalContent,
      });

      const newContent = '# Updated Content\n\nNew information.';
      await instructionsService.updateSharedInstruction('test', newContent);

      const instruction = await instructionsService.getSharedInstruction('test');
      expect(instruction.content).toBe(newContent);
    });

    it('should throw error when updating non-existent instruction', async () => {
      await expect(
        instructionsService.updateSharedInstruction('non-existent', 'content')
      ).rejects.toThrow(SharedInstructionNotFoundError);
    });

    it('should validate instruction name and content', async () => {
      await expect(
        instructionsService.updateSharedInstruction('invalid name', 'content')
      ).rejects.toThrow();

      const largeContent = 'a'.repeat(100001);
      await expect(
        instructionsService.updateSharedInstruction('test', largeContent)
      ).rejects.toThrow();
    });
  });
});