// Workspace Repository Implementation
import path from 'node:path';

import { inject, injectable } from 'tsyringe';

import { TOKENS } from '../../../container/tokens.js';
import type { Logger } from '../../../interfaces/services.js';
import { createChildLogger } from '../../../utils/logger.js';
import type {
  FileSystemProvider,
  WorkspaceCreateOptions,
  WorkspaceMetadata,
  WorkspaceRepository,
} from '../interfaces.js';

@injectable()
export class FileSystemWorkspaceRepository implements WorkspaceRepository {
  private logger: Logger;

  constructor(
    @inject(TOKENS.FileSystemService) private fs: FileSystemProvider,
    @inject('WorkspacesRoot') private workspacesRoot: string,
    @inject(TOKENS.Logger) logger?: Logger
  ) {
    this.logger = logger ?? createChildLogger('data:workspace-repository');
  }

  async exists(name: string): Promise<boolean> {
    const workspacePath = this.getWorkspacePath(name);
    return this.fs.exists(workspacePath);
  }

  async create(
    name: string,
    options: WorkspaceCreateOptions = {}
  ): Promise<void> {
    const workspacePath = this.getWorkspacePath(name);

    if (await this.exists(name)) {
      throw new Error(`Workspace '${name}' already exists`);
    }

    try {
      this.logger.debug(`Creating workspace: ${name} at ${workspacePath}`);

      // Create workspace directory
      await this.fs.createDirectory(workspacePath, true);

      // Create workspace metadata
      const metadata = {
        name,
        description: options.description,
        createdAt: new Date(),
        modifiedAt: new Date(),
        template: options.template,
      };

      const metadataPath = path.join(workspacePath, '.workspace.json');
      await this.fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Create basic structure
      await this.fs.createDirectory(
        path.join(workspacePath, 'documents'),
        true
      );
      await this.fs.createDirectory(
        path.join(workspacePath, 'templates'),
        true
      );

      // Create README if description provided
      if (options.description) {
        const readmePath = path.join(workspacePath, 'README.md');
        const readmeContent = `# ${name}\n\n${options.description}\n`;
        await this.fs.writeFile(readmePath, readmeContent);
      }

      this.logger.info(`Workspace created successfully: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to create workspace: ${name}`, error);
      throw new Error(`Unable to create workspace: ${name}`);
    }
  }

  async list(): Promise<WorkspaceMetadata[]> {
    try {
      this.logger.debug(`Listing workspaces in: ${this.workspacesRoot}`);

      if (!(await this.fs.exists(this.workspacesRoot))) {
        return [];
      }

      const entries = await this.fs.readDirectory(this.workspacesRoot);
      const workspaces: WorkspaceMetadata[] = [];

      for (const entry of entries) {
        const workspacePath = path.join(this.workspacesRoot, entry);
        const stats = await this.fs.getStats(workspacePath);

        if (stats.isDirectory) {
          try {
            const metadata = await this.getMetadata(entry);
            workspaces.push(metadata);
          } catch (error) {
            // Skip invalid workspaces
            this.logger.warn(`Skipping invalid workspace: ${entry}`, error);
          }
        }
      }

      this.logger.debug(`Found ${workspaces.length} workspaces`);
      return workspaces.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.logger.error('Failed to list workspaces', error);
      throw new Error('Unable to list workspaces');
    }
  }

  async getMetadata(name: string): Promise<WorkspaceMetadata> {
    const workspacePath = this.getWorkspacePath(name);

    if (!(await this.exists(name))) {
      throw new Error(`Workspace '${name}' does not exist`);
    }

    try {
      const metadataPath = path.join(workspacePath, '.workspace.json');

      const instructionsPath = path.join(workspacePath, 'INSTRUCTIONS.md');
      const hasInstructions = await this.fs.exists(instructionsPath);

      if (await this.fs.exists(metadataPath)) {
        const content = await this.fs.readFile(metadataPath);
        const metadata = JSON.parse(content);
        return {
          ...metadata,
          path: workspacePath,
          createdAt: new Date(metadata.createdAt),
          modifiedAt: new Date(metadata.modifiedAt),
          hasInstructions,
        };
      } else {
        // Fallback for workspaces without metadata
        const stats = await this.fs.getStats(workspacePath);
        return {
          name,
          path: workspacePath,
          createdAt: stats.createdTime,
          modifiedAt: stats.modifiedTime,
          hasInstructions,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get workspace metadata: ${name}`, error);
      throw new Error(`Unable to get workspace metadata: ${name}`);
    }
  }

  async update(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<void> {
    const workspacePath = this.getWorkspacePath(name);

    if (!(await this.exists(name))) {
      throw new Error(`Workspace '${name}' does not exist`);
    }

    try {
      this.logger.debug(`Updating workspace: ${name} at ${workspacePath}`);

      // Read existing metadata
      const metadata = await this.getMetadata(name);

      // Update metadata with new options
      const updatedMetadata = {
        name: metadata.name,
        description: options.description ?? metadata.description,
        createdAt: metadata.createdAt,
        modifiedAt: new Date(),
        template:
          options.template ?? (metadata as { template?: string }).template,
      };

      const metadataPath = path.join(workspacePath, '.workspace.json');
      await this.fs.writeFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2)
      );

      this.logger.info(`Workspace updated successfully: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to update workspace: ${name}`, error);
      throw new Error(`Unable to update workspace: ${name}`);
    }
  }

  async delete(name: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(name);

    if (!(await this.exists(name))) {
      throw new Error(`Workspace '${name}' does not exist`);
    }

    try {
      this.logger.debug(`Deleting workspace: ${name} at ${workspacePath}`);
      await this.fs.deleteDirectory(workspacePath, true);
      this.logger.info(`Workspace deleted successfully: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to delete workspace: ${name}`, error);
      throw new Error(`Unable to delete workspace: ${name}`);
    }
  }

  getWorkspacePath(name: string): string {
    return path.join(this.workspacesRoot, name);
  }
}
