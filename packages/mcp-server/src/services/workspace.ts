import path from 'node:path';

import type { Workspace, WorkspaceCreateOptions } from '../types/index.js';
import {
  WorkspaceAlreadyExistsError,
  WorkspaceNotFoundError,
} from '../utils/errors.js';
import { DEFAULT_WORKSPACE_README } from '../utils/templates.js';
import { validateWorkspaceName } from '../utils/validation.js';

import { FileSystemService } from './filesystem.js';

export class WorkspaceService {
  private fs: FileSystemService;

  constructor(
    private workspacesRoot: string,
    fileSystemService?: FileSystemService
  ) {
    this.fs = fileSystemService ?? new FileSystemService();
  }

  async createWorkspace(
    name: string,
    options: Omit<WorkspaceCreateOptions, 'name'> = {}
  ): Promise<Workspace> {
    validateWorkspaceName(name);

    const workspacePath = path.join(this.workspacesRoot, name);

    if (await this.fs.directoryExists(workspacePath)) {
      throw new WorkspaceAlreadyExistsError(name);
    }

    await this.fs.ensureDirectory(workspacePath);

    const readmePath = path.join(workspacePath, 'README.md');
    await this.fs.writeFile(readmePath, DEFAULT_WORKSPACE_README(name));

    const now = new Date();
    const workspace: Workspace = {
      name,
      path: workspacePath,
      ...(options.description !== undefined && {
        description: options.description,
      }),
      ...(options.template !== undefined && { template: options.template }),
      createdAt: now,
      updatedAt: now,
      files: ['README.md'],
    };

    return workspace;
  }

  async listWorkspaces(): Promise<Workspace[]> {
    if (!(await this.fs.directoryExists(this.workspacesRoot))) {
      return [];
    }

    const items = await this.fs.listDirectory(this.workspacesRoot);
    const workspaces: Workspace[] = [];

    for (const item of items) {
      if (item === 'SHARED_INSTRUCTIONS') {
        continue;
      }

      const workspacePath = path.join(this.workspacesRoot, item);
      if (await this.fs.directoryExists(workspacePath)) {
        try {
          const workspace = await this.getWorkspaceInfo(item);
          workspaces.push(workspace);
        } catch {
          // Skip invalid workspaces
          continue;
        }
      }
    }

    return workspaces.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getWorkspaceInfo(name: string): Promise<Workspace> {
    validateWorkspaceName(name);

    const workspacePath = path.join(this.workspacesRoot, name);

    if (!(await this.fs.directoryExists(workspacePath))) {
      throw new WorkspaceNotFoundError(name);
    }

    const files = await this.fs.listFiles(workspacePath, true);

    const stats = await this.fs.getFileStats(workspacePath);

    const workspace: Workspace = {
      name,
      path: workspacePath,
      createdAt: stats.ctime,
      updatedAt: stats.mtime,
      files,
    };

    return workspace;
  }

  async deleteWorkspace(name: string): Promise<void> {
    validateWorkspaceName(name);

    const workspacePath = path.join(this.workspacesRoot, name);

    if (!(await this.fs.directoryExists(workspacePath))) {
      throw new WorkspaceNotFoundError(name);
    }

    await this.fs.deleteDirectory(workspacePath);
  }

  async addFileToWorkspace(
    workspaceName: string,
    relativePath: string
  ): Promise<void> {
    validateWorkspaceName(workspaceName);

    const workspacePath = path.join(this.workspacesRoot, workspaceName);

    if (!(await this.fs.directoryExists(workspacePath))) {
      throw new WorkspaceNotFoundError(workspaceName);
    }

    const filePath = path.join(workspacePath, relativePath);

    if (path.relative(workspacePath, filePath).startsWith('..')) {
      throw new Error('File path must be within workspace directory');
    }

    if (!(await this.fs.fileExists(filePath))) {
      throw new Error(`File does not exist: ${relativePath}`);
    }
  }

  async getWorkspacePath(name: string): Promise<string> {
    validateWorkspaceName(name);
    return path.join(this.workspacesRoot, name);
  }
}
