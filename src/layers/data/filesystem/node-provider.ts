// Node.js File System Provider Implementation
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { watch } from 'chokidar';

import { createChildLogger } from '../../../utils/logger.js';
import type {
  FileEvent,
  FileStats,
  FileSystemProvider,
  FileWatcher,
} from '../interfaces.js';

const logger = createChildLogger('data:filesystem');

export class NodeFileSystemProvider implements FileSystemProvider {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      logger.debug(`Reading file: ${filePath}`);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      throw new Error(`Unable to read file: ${filePath}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      logger.debug(`Writing file: ${filePath}`);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.createDirectory(dir, true);

      await fs.writeFile(filePath, content, 'utf-8');
      logger.debug(`File written successfully: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      throw new Error(`Unable to write file: ${filePath}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      logger.debug(`Deleting file: ${filePath}`);
      await fs.unlink(filePath);
      logger.debug(`File deleted successfully: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error);
      throw new Error(`Unable to delete file: ${filePath}`);
    }
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    try {
      logger.debug(`Reading directory: ${dirPath}`);
      const entries = await fs.readdir(dirPath);
      logger.debug(`Found ${entries.length} entries in: ${dirPath}`);
      return entries;
    } catch (error) {
      logger.error(`Failed to read directory: ${dirPath}`, error);
      throw new Error(`Unable to read directory: ${dirPath}`);
    }
  }

  async createDirectory(dirPath: string, recursive = false): Promise<void> {
    try {
      if (await this.exists(dirPath)) {
        return;
      }

      logger.debug(`Creating directory: ${dirPath} (recursive: ${recursive})`);
      await fs.mkdir(dirPath, { recursive });
      logger.debug(`Directory created successfully: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to create directory: ${dirPath}`, error);
      throw new Error(`Unable to create directory: ${dirPath}`);
    }
  }

  async deleteDirectory(dirPath: string, recursive = false): Promise<void> {
    try {
      logger.debug(`Deleting directory: ${dirPath} (recursive: ${recursive})`);
      await fs.rmdir(dirPath, { recursive });
      logger.debug(`Directory deleted successfully: ${dirPath}`);
    } catch (error) {
      logger.error(`Failed to delete directory: ${dirPath}`, error);
      throw new Error(`Unable to delete directory: ${dirPath}`);
    }
  }

  async getStats(filePath: string): Promise<FileStats> {
    try {
      logger.debug(`Getting stats for: ${filePath}`);
      const stats = await fs.stat(filePath);

      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime,
      };
    } catch (error) {
      logger.error(`Failed to get stats for: ${filePath}`, error);
      throw new Error(`Unable to get stats for: ${filePath}`);
    }
  }

  async watch(
    filePath: string,
    callback: (event: FileEvent) => void
  ): Promise<FileWatcher> {
    try {
      logger.debug(`Starting file watch: ${filePath}`);

      const watcher = watch(filePath, {
        ignoreInitial: true,
        persistent: true,
      });

      watcher.on('add', (watchPath) => {
        callback({
          type: 'created',
          path: watchPath,
          isDirectory: false,
        });
      });

      watcher.on('addDir', (watchPath) => {
        callback({
          type: 'created',
          path: watchPath,
          isDirectory: true,
        });
      });

      watcher.on('change', (watchPath) => {
        callback({
          type: 'modified',
          path: watchPath,
          isDirectory: false,
        });
      });

      watcher.on('unlink', (watchPath) => {
        callback({
          type: 'deleted',
          path: watchPath,
          isDirectory: false,
        });
      });

      watcher.on('unlinkDir', (watchPath) => {
        callback({
          type: 'deleted',
          path: watchPath,
          isDirectory: true,
        });
      });

      logger.debug(`File watcher started for: ${filePath}`);

      return {
        async close() {
          logger.debug(`Closing file watcher for: ${filePath}`);
          await watcher.close();
        },
      };
    } catch (error) {
      logger.error(`Failed to start file watcher: ${filePath}`, error);
      throw new Error(`Unable to watch file: ${filePath}`);
    }
  }
}
