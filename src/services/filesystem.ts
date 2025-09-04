import * as path from 'node:path';

import * as fs from 'fs-extra';
import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';

import { FileSystemError } from '../utils/errors.js';

export class FileSystemService {
  async ensureDirectory(dirPath: string): Promise<Result<void, Error>> {
    try {
      await fs.ensureDir(dirPath);
      return ok(undefined);
    } catch (error) {
      return err(
        new FileSystemError(
          `Failed to ensure directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async writeFile(
    filePath: string,
    content: string
  ): Promise<Result<void, Error>> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      return ok(undefined);
    } catch (error) {
      return err(
        new FileSystemError(`Failed to write file: ${filePath}`, error as Error)
      );
    }
  }

  async readFile(filePath: string): Promise<Result<string, Error>> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return ok(content);
    } catch (error) {
      return err(
        new FileSystemError(`Failed to read file: ${filePath}`, error as Error)
      );
    }
  }

  async fileExists(filePath: string): Promise<Result<boolean, Error>> {
    try {
      const stat = await fs.stat(filePath);
      return ok(stat.isFile());
    } catch {
      return ok(false);
    }
  }

  async directoryExists(dirPath: string): Promise<Result<boolean, Error>> {
    try {
      const stat = await fs.stat(dirPath);
      return ok(stat.isDirectory());
    } catch {
      // For directory existence checks, we return false instead of error
      return ok(false);
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

  async listDirectories(dirPath: string): Promise<Result<string[], Error>> {
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

      return ok(directories);
    } catch (error) {
      return err(
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
  ): Promise<Result<string[], Error>> {
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

        return ok(files);
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
      return ok(files);
    } catch (error) {
      return err(
        new FileSystemError(
          `Failed to list files in directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async deleteFile(filePath: string): Promise<Result<void, Error>> {
    try {
      await fs.unlink(filePath);
      return ok(undefined);
    } catch (error) {
      return err(
        new FileSystemError(
          `Failed to delete file: ${filePath}`,
          error as Error
        )
      );
    }
  }

  async deleteDirectory(dirPath: string): Promise<Result<void, Error>> {
    try {
      await fs.remove(dirPath);
      return ok(undefined);
    } catch (error) {
      return err(
        new FileSystemError(
          `Failed to delete directory: ${dirPath}`,
          error as Error
        )
      );
    }
  }

  async getFileStats(filePath: string): Promise<
    Result<
      {
        size: number;
        createdAt: Date;
        updatedAt: Date;
        isDirectory: boolean;
      },
      Error
    >
  > {
    try {
      const stats = await fs.stat(filePath);
      return ok({
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
      });
    } catch (error) {
      return err(
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
