import * as path from 'node:path';

import * as fs from 'fs-extra';

import { FileSystemError } from '../utils/errors.js';
import type { Result } from '../utils/result.js';
import { Err, Ok } from '../utils/result.js';

export class FileSystemService {
  async ensureDirectory(dirPath: string): Promise<Result<void>> {
    try {
      await fs.ensureDir(dirPath);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to ensure directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async writeFile(filePath: string, content: string): Promise<Result<void>> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(`Failed to write file: ${filePath}`, error as Error)
      );
    }
  }

  async readFile(filePath: string): Promise<Result<string>> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return Ok(content);
    } catch (error) {
      return Err(
        new FileSystemError(`Failed to read file: ${filePath}`, error as Error)
      );
    }
  }

  async fileExists(filePath: string): Promise<Result<boolean>> {
    try {
      const stat = await fs.stat(filePath);
      return Ok(stat.isFile());
    } catch {
      return Ok(false);
    }
  }

  async directoryExists(dirPath: string): Promise<Result<boolean>> {
    try {
      const stat = await fs.stat(dirPath);
      return Ok(stat.isDirectory());
    } catch {
      // For directory existence checks, we return false instead of error
      return Ok(false);
    }
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const items = await fs.readdir(dirPath);
      return items.filter((item) => !item.startsWith('.'));
    } catch (error) {
      throw new FileSystemError(
        `Failed to list directory: ${dirPath}`,
        error as Error
      );
    }
  }

  async listDirectories(dirPath: string): Promise<Result<string[]>> {
    try {
      const items = await fs.readdir(dirPath);
      const directories: string[] = [];

      for (const item of items) {
        if (item.startsWith('.')) continue;

        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          directories.push(item);
        }
      }

      return Ok(directories);
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to list directories in: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async listFiles(
    dirPath: string,
    recursive = false
  ): Promise<Result<string[]>> {
    try {
      if (!recursive) {
        const items = await fs.readdir(dirPath);
        const files: string[] = [];

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = await fs.stat(itemPath);
          if (stat.isFile()) {
            files.push(item);
          }
        }

        return Ok(files);
      }

      const files: string[] = [];

      const processDirectory = async (
        currentPath: string,
        relativePath = ''
      ): Promise<void> => {
        const items = await fs.readdir(currentPath);

        for (const item of items) {
          if (item.startsWith('.')) continue;

          const itemPath = path.join(currentPath, item);
          const relativeItemPath = relativePath
            ? path.join(relativePath, item)
            : item;
          const stat = await fs.stat(itemPath);

          if (stat.isFile()) {
            files.push(relativeItemPath);
          } else if (stat.isDirectory()) {
            await processDirectory(itemPath, relativeItemPath);
          }
        }
      };

      await processDirectory(dirPath);
      return Ok(files);
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to list files in directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async deleteFile(filePath: string): Promise<Result<void>> {
    try {
      await fs.unlink(filePath);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to delete file: ${filePath}`,
          error as Error
        )
      );
    }
  }

  async deleteDirectory(dirPath: string): Promise<Result<void>> {
    try {
      await fs.remove(dirPath);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to delete directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async getFileStats(filePath: string): Promise<
    Result<{
      size: number;
      createdAt: Date;
      updatedAt: Date;
      isDirectory: boolean;
    }>
  > {
    try {
      const stats = await fs.stat(filePath);
      return Ok({
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      });
    } catch (error) {
      return Err(
        new FileSystemError(
          `Failed to get file stats: ${filePath}`,
          error as Error
        )
      );
    }
  }
}

// Export alias for compatibility
export const NodeFileSystemService = FileSystemService;
