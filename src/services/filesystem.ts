import path from 'node:path';

import fs from 'fs-extra';

import { FileSystemError } from '../utils/errors.js';

export class FileSystemService {
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      throw new FileSystemError(
        `Failed to ensure directory: ${dirPath}`,
        error as Error
      );
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to write file: ${filePath}`,
        error as Error
      );
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to read file: ${filePath}`,
        error as Error
      );
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
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

  async listFiles(dirPath: string, recursive = false): Promise<string[]> {
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

        return files;
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
      return files;
    } catch (error) {
      throw new FileSystemError(
        `Failed to list files in directory: ${dirPath}`,
        error as Error
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new FileSystemError(
        `Failed to delete file: ${filePath}`,
        error as Error
      );
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.remove(dirPath);
    } catch (error) {
      throw new FileSystemError(
        `Failed to delete directory: ${dirPath}`,
        error as Error
      );
    }
  }

  async getFileStats(
    filePath: string
  ): Promise<{ size: number; mtime: Date; ctime: Date }> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
      };
    } catch (error) {
      throw new FileSystemError(
        `Failed to get file stats: ${filePath}`,
        error as Error
      );
    }
  }
}
