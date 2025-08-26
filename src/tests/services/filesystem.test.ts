import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileSystemService } from '../../services/filesystem.js';
import { FileSystemError } from '../../utils/errors.js';
import { isErr, isOk } from '../../utils/result.js';

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

      const writeResult = await fsService.writeFile(filePath, content);
      expect(isOk(writeResult)).toBe(true);

      const readResult = await fsService.readFile(filePath);
      expect(isOk(readResult)).toBe(true);
      expect(readResult.value).toBe(content);
    });

    it('should create parent directories when writing', async () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'test.txt');
      const content = 'Hello, World!';

      const writeResult = await fsService.writeFile(filePath, content);
      expect(isOk(writeResult)).toBe(true);

      const readResult = await fsService.readFile(filePath);
      expect(isOk(readResult)).toBe(true);
      expect(readResult.value).toBe(content);
    });

    it('should return error when reading non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');

      const result = await fsService.readFile(filePath);
      expect(isErr(result)).toBe(true);
      expect(result.error).toBeInstanceOf(FileSystemError);
    });
  });

  describe('fileExists and directoryExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fsService.fileExists(filePath);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');
      const result = await fsService.fileExists(filePath);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const result = await fsService.directoryExists(tempDir);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      const dirPath = path.join(tempDir, 'non-existent');
      const result = await fsService.directoryExists(dirPath);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(false);
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
      const result = await fsService.listFiles(tempDir, false);
      expect(isOk(result)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value).toContain('file1.txt');
      expect(result.value).toContain('file2.md');
    });

    it('should list files recursively', async () => {
      const result = await fsService.listFiles(tempDir, true);
      expect(isOk(result)).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value).toContain('file1.txt');
      expect(result.value).toContain('file2.md');
      expect(result.value).toContain(path.join('subdir', 'file3.txt'));
    });
  });
});
