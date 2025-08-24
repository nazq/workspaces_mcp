import path from 'node:path';

import fs from 'fs-extra';

import type {
  FileEvent,
  FileStats,
  FileSystemProvider,
  FileWatcher,
} from '../../../../layers/data/interfaces.js';

export class MockFileSystemProvider implements FileSystemProvider {
  private watchers: Set<FileWatcher> = new Set();

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async readDirectory(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async createDirectory(dirPath: string, recursive?: boolean): Promise<void> {
    if (recursive) {
      await fs.ensureDir(dirPath);
    } else {
      await fs.mkdir(dirPath);
    }
  }

  async deleteDirectory(dirPath: string, recursive?: boolean): Promise<void> {
    if (recursive) {
      await fs.remove(dirPath);
    } else {
      await fs.rmdir(dirPath);
    }
  }

  async getStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modifiedTime: stats.mtime,
      createdTime: stats.birthtime,
    };
  }

  async watch(
    filePath: string,
    callback: (event: FileEvent) => void
  ): Promise<FileWatcher> {
    // Mock implementation - just return a watcher that can be closed
    const watcher: FileWatcher = {
      close: async () => {
        this.watchers.delete(watcher);
      },
    };
    this.watchers.add(watcher);
    return watcher;
  }

  async cleanup(): Promise<void> {
    // Close all watchers
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers.clear();
  }
}
