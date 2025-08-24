import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileSystemService } from '../../services/filesystem.js';
import { FileSystemError } from '../../utils/errors.js';

describe('FileSystemService', () => {
  let fsService: FileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    fsService = new FileSystemService();
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-temp-'));
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const testDir = path.join(tempDir, 'new-dir');
      await fsService.ensureDirectory(testDir);
      expect(await fs.pathExists(testDir)).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await fs.ensureDir(tempDir);
      await expect(fsService.ensureDirectory(tempDir)).resolves.not.toThrow();
    });
  });

  describe('writeFile and readFile', () => {
    it('should write and read file content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';

      await fsService.writeFile(filePath, content);
      const readContent = await fsService.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should create parent directories when writing', async () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'test.txt');
      const content = 'Hello, World!';

      await fsService.writeFile(filePath, content);
      const readContent = await fsService.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should throw FileSystemError when reading non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');

      await expect(fsService.readFile(filePath)).rejects.toThrow(
        FileSystemError
      );
    });
  });

  describe('fileExists and directoryExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      expect(await fsService.fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');
      expect(await fsService.fileExists(filePath)).toBe(false);
    });

    it('should return true for existing directory', async () => {
      expect(await fsService.directoryExists(tempDir)).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      const dirPath = path.join(tempDir, 'non-existent');
      expect(await fsService.directoryExists(dirPath)).toBe(false);
    });
  });

  describe('listFiles', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.md'), 'content2');
      await fs.ensureDir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'file3.txt'), 'content3');
    });

    it('should list files non-recursively', async () => {
      const files = await fsService.listFiles(tempDir, false);
      expect(files).toHaveLength(2);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.md');
    });

    it('should list files recursively', async () => {
      const files = await fsService.listFiles(tempDir, true);
      expect(files).toHaveLength(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.md');
      expect(files).toContain(path.join('subdir', 'file3.txt'));
    });
  });
});
