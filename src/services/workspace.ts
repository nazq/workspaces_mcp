// Workspace Service - workspace management with Result pattern
// Implements clean interfaces and comprehensive error handling

import * as path from 'node:path';

import type { Result } from 'neverthrow';
import { err, ok } from 'neverthrow';

import { EVENTS } from '../events/events.js';
import type {
  EventBus,
  FileSystemService,
  WorkspaceService as IWorkspaceService,
  Logger,
  WorkspaceCreateOptions,
  WorkspaceMetadata,
} from '../interfaces/services.js';
// Types are now imported from interfaces/services.js
import {
  WorkspaceAlreadyExistsError,
  WorkspaceNotFoundError,
} from '../utils/errors.js';
import { DEFAULT_WORKSPACE_README } from '../utils/templates.js';
import { validateWorkspaceName } from '../utils/validation.js';

/**
 * Workspace management service implementing clean architecture patterns
 *
 * Features:
 * - Result pattern for bulletproof error handling
 * - Event-driven architecture for decoupled components
 * - Comprehensive validation and security
 * - Structured logging and monitoring
 *
 * @example
 * ```typescript
 * const result = await workspaceService.createWorkspace('my-project', {
 *   description: 'My awesome project',
 *   template: 'react'
 * });
 *
 * if (result.isOk()) {
 *   console.log(`Created workspace: ${result.data.name}`);
 * } else {
 *   console.error(`Failed: ${result.error.message}`);
 * }
 * ```
 */
export class WorkspaceService implements IWorkspaceService {
  /**
   * Create workspace service with clean dependency injection
   *
   * @param workspacesRoot - Root directory for all workspaces
   * @param fs - File system service for directory operations
   * @param eventBus - Event bus for publishing workspace events
   * @param logger - Logger for comprehensive monitoring
   */
  constructor(
    private readonly workspacesRoot: string,
    private readonly fs: FileSystemService,
    private readonly eventBus: EventBus,
    private readonly logger: Logger
  ) {}

  /**
   * Create a new workspace with optional template and description
   *
   * Performs comprehensive validation, creates directory structure,
   * initializes with README template, and emits creation events
   * for other components to react to.
   *
   * @param name - Workspace name (validated for security)
   * @param options - Creation options including description and template
   * @returns Result containing workspace metadata or detailed error
   */
  async createWorkspace(
    name: string,
    options: WorkspaceCreateOptions = {}
  ): Promise<Result<WorkspaceMetadata, Error>> {
    try {
      this.logger.info(`Creating workspace: ${name}`, { options });

      // Validate workspace name for security and consistency
      const validationResult = this.validateWorkspaceName(name);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      const workspacePath = path.join(this.workspacesRoot, name);

      // Check if workspace already exists
      const existsResult = await this.fs.directoryExists(workspacePath);
      if (existsResult.isErr()) {
        return err(
          new Error(
            `Failed to check workspace existence: ${existsResult.error.message}`
          )
        );
      }

      if (existsResult.value) {
        const error = new WorkspaceAlreadyExistsError(name);
        this.logger.warn(`Workspace creation failed: ${error.message}`);
        return err(error);
      }

      // Create workspace directory
      const createDirResult = await this.fs.ensureDirectory(workspacePath);
      if (createDirResult.isErr()) {
        return err(
          new Error(
            `Failed to create workspace directory: ${createDirResult.error.message}`
          )
        );
      }

      // Create README template
      const readmePath = path.join(workspacePath, 'README.md');
      const writeResult = await this.fs.writeFile(
        readmePath,
        DEFAULT_WORKSPACE_README(name)
      );
      if (writeResult.isErr()) {
        return err(
          new Error(`Failed to create README: ${writeResult.error.message}`)
        );
      }

      const now = new Date();
      const workspace: WorkspaceMetadata = {
        name,
        path: workspacePath,
        description: options.description,
        template: options.template,
        createdAt: now,
        updatedAt: now,
        fileCount: 1,
        size: DEFAULT_WORKSPACE_README(name).length,
        files: ['README.md'], // Include the created README.md file
      };

      // Emit workspace created event for other components
      try {
        await this.eventBus.emit(EVENTS.WORKSPACE_CREATED, {
          name,
          path: workspacePath,
          description: options.description,
          template: options.template,
          createdAt: now,
        });
      } catch (eventError) {
        // Log event error but don't fail workspace creation
        this.logger.warn('Failed to emit workspace created event', {
          name,
          error: eventError,
        });
      }

      this.logger.info(`Workspace created successfully: ${name}`);
      return ok(workspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error creating workspace: ${name}`, error);
      return err(new Error(`Workspace creation failed: ${message}`));
    }
  }

  /**
   * List all available workspaces with comprehensive metadata
   *
   * Scans workspace root directory, validates each workspace,
   * and returns sorted list with metadata. Gracefully handles
   * invalid or corrupted workspaces.
   *
   * @returns Result containing array of workspace metadata
   */
  async listWorkspaces(): Promise<Result<WorkspaceMetadata[], Error>> {
    try {
      this.logger.debug('Listing workspaces', {
        workspacesRoot: this.workspacesRoot,
      });

      // Check if workspaces root exists
      const rootExistsResult = await this.fs.directoryExists(
        this.workspacesRoot
      );
      if (rootExistsResult.isErr()) {
        return err(
          new Error(
            `Failed to check workspaces root: ${rootExistsResult.error.message}`
          )
        );
      }

      if (!rootExistsResult.value) {
        this.logger.debug(
          'Workspaces root does not exist, returning empty list'
        );
        return ok([]);
      }

      // List directory contents (get directories only)
      const directoriesResult = await this.fs.listDirectories(
        this.workspacesRoot
      );
      if (directoriesResult.isErr()) {
        return err(
          new Error(
            `Failed to list workspace directory: ${directoriesResult.error.message}`
          )
        );
      }

      const directoryItems = directoriesResult.value;

      const workspaces: WorkspaceMetadata[] = [];

      // Process each item, skipping special directories
      for (const item of directoryItems) {
        if (item === 'SHARED_INSTRUCTIONS') {
          continue; // Skip shared instructions directory
        }

        const workspacePath = path.join(this.workspacesRoot, item);
        const isDirResult = await this.fs.directoryExists(workspacePath);

        if (isDirResult.isErr()) {
          this.logger.warn(
            `Failed to check if ${item} is directory`,
            isDirResult.error
          );
          continue;
        }

        if (isDirResult.value) {
          // Get workspace metadata, skip if invalid
          const workspaceResult = await this.getWorkspaceInfo(item);
          if (workspaceResult.isErr()) {
            this.logger.warn(
              `Skipping invalid workspace: ${item}`,
              workspaceResult.error
            );
            continue;
          }
          workspaces.push(workspaceResult.value);
        }
      }

      // Sort workspaces by name for consistent ordering
      const sortedWorkspaces = workspaces.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      this.logger.debug(`Found ${sortedWorkspaces.length} workspaces`);
      return ok(sortedWorkspaces);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Unexpected error listing workspaces', error);
      return err(new Error(`Failed to list workspaces: ${message}`));
    }
  }

  /**
   * Get comprehensive metadata for a specific workspace
   *
   * Retrieves workspace information including file count, size,
   * timestamps, and validates workspace structure integrity.
   *
   * @param name - Workspace name to retrieve info for
   * @returns Result containing workspace metadata or error
   */
  async getWorkspaceInfo(
    name: string
  ): Promise<Result<WorkspaceMetadata, Error>> {
    try {
      this.logger.debug(`Getting workspace info: ${name}`);

      // Validate workspace name
      const validationResult = this.validateWorkspaceName(name);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      const workspacePath = path.join(this.workspacesRoot, name);

      // Check if workspace exists
      const existsResult = await this.fs.directoryExists(workspacePath);
      if (existsResult.isErr()) {
        return err(
          new Error(
            `Failed to check workspace existence: ${existsResult.error.message}`
          )
        );
      }

      if (!existsResult.value) {
        const error = new WorkspaceNotFoundError(name);
        this.logger.warn(`Workspace not found: ${name}`);
        return err(error);
      }

      // Get file list and statistics
      const filesResult = await this.fs.listFiles(workspacePath, true);
      if (filesResult.isErr()) {
        return err(
          new Error(
            `Failed to list workspace files: ${filesResult.error.message}`
          )
        );
      }

      const statsResult = await this.fs.getFileStats(workspacePath);
      if (statsResult.isErr()) {
        return err(
          new Error(
            `Failed to get workspace stats: ${statsResult.error.message}`
          )
        );
      }

      // Calculate total size of workspace files
      let totalSize = 0;
      for (const file of filesResult.value) {
        const filePath = path.join(workspacePath, file);
        const fileStatsResult = await this.fs.getFileStats(filePath);
        if (!fileStatsResult.isErr() && !fileStatsResult.value.isDirectory) {
          totalSize += fileStatsResult.value.size;
        }
      }

      const workspace: WorkspaceMetadata = {
        name,
        path: workspacePath,
        createdAt: statsResult.value.createdAt,
        updatedAt: statsResult.value.updatedAt,
        fileCount: filesResult.value.length,
        size: totalSize,
        files: filesResult.value,
      };

      // Emit workspace accessed event
      try {
        await this.eventBus.emit(EVENTS.WORKSPACE_ACCESSED, {
          name,
          path: workspacePath,
          accessType: 'read' as const,
          accessedAt: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit workspace accessed event', {
          name,
          error: eventError,
        });
      }

      return ok(workspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error getting workspace info: ${name}`,
        error
      );
      return err(new Error(`Failed to get workspace info: ${message}`));
    }
  }

  /**
   * Permanently delete a workspace and all its contents
   *
   * Validates workspace exists, performs secure deletion,
   * and emits deletion events. This operation cannot be undone.
   *
   * @param name - Name of workspace to delete
   * @returns Result indicating success or detailed error
   */
  async deleteWorkspace(name: string): Promise<Result<void, Error>> {
    try {
      this.logger.info(`Deleting workspace: ${name}`);

      // Validate workspace name
      const validationResult = this.validateWorkspaceName(name);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      const workspacePath = path.join(this.workspacesRoot, name);

      // Check if workspace exists
      const existsResult = await this.fs.directoryExists(workspacePath);
      if (existsResult.isErr()) {
        return err(
          new Error(
            `Failed to check workspace existence: ${existsResult.error.message}`
          )
        );
      }

      if (!existsResult.value) {
        const error = new WorkspaceNotFoundError(name);
        this.logger.warn(`Delete failed - workspace not found: ${name}`);
        return err(error);
      }

      // Delete workspace directory and all contents
      const deleteResult = await this.fs.deleteDirectory(workspacePath);
      if (deleteResult.isErr()) {
        return err(
          new Error(
            `Failed to delete workspace directory: ${deleteResult.error.message}`
          )
        );
      }

      // Emit workspace deleted event
      try {
        await this.eventBus.emit(EVENTS.WORKSPACE_DELETED, {
          name,
          path: workspacePath,
          deletedAt: new Date(),
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit workspace deleted event', {
          name,
          error: eventError,
        });
      }

      this.logger.info(`Workspace deleted successfully: ${name}`);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error deleting workspace: ${name}`, error);
      return err(new Error(`Workspace deletion failed: ${message}`));
    }
  }

  /**
   * Verify and validate a file exists within workspace boundaries
   *
   * Performs security validation to prevent path traversal attacks,
   * ensures file exists within workspace directory structure.
   *
   * @param workspaceName - Name of workspace containing the file
   * @param relativePath - Relative path to file within workspace
   * @returns Result indicating successful validation or error
   */
  async validateWorkspaceFile(
    workspaceName: string,
    relativePath: string
  ): Promise<Result<void, Error>> {
    try {
      this.logger.debug(
        `Validating workspace file: ${workspaceName}/${relativePath}`
      );

      // Validate workspace name
      const validationResult = this.validateWorkspaceName(workspaceName);
      if (validationResult.isErr()) {
        return validationResult;
      }

      const workspacePath = path.join(this.workspacesRoot, workspaceName);

      // Check if workspace exists
      const existsResult = await this.fs.directoryExists(workspacePath);
      if (existsResult.isErr()) {
        return err(
          new Error(
            `Failed to check workspace existence: ${existsResult.error.message}`
          )
        );
      }

      if (!existsResult.value) {
        const error = new WorkspaceNotFoundError(workspaceName);
        return err(error);
      }

      const filePath = path.join(workspacePath, relativePath);

      // Security: Prevent path traversal attacks
      const resolvedWorkspacePath = path.resolve(workspacePath);
      const resolvedFilePath = path.resolve(filePath);

      if (
        !resolvedFilePath.startsWith(resolvedWorkspacePath + path.sep) &&
        resolvedFilePath !== resolvedWorkspacePath
      ) {
        const error = new Error(
          `Security violation: File path must be within workspace directory. ` +
            `Attempted path: ${relativePath}`
        );
        this.logger.warn('Path traversal attempt detected', {
          workspaceName,
          relativePath,
          resolvedFilePath,
          resolvedWorkspacePath,
        });
        return err(error);
      }

      // Check if file exists
      const fileExistsResult = await this.fs.fileExists(filePath);
      if (fileExistsResult.isErr()) {
        return err(
          new Error(
            `Failed to check file existence: ${fileExistsResult.error.message}`
          )
        );
      }

      if (!fileExistsResult.value) {
        return err(new Error(`File does not exist: ${relativePath}`));
      }

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error validating workspace file`, error);
      return err(new Error(`File validation failed: ${message}`));
    }
  }

  /**
   * Check if a workspace exists
   *
   * @param name - Workspace name to check
   * @returns Result containing boolean existence status
   */
  async workspaceExists(name: string): Promise<Result<boolean, Error>> {
    try {
      const validationResult = this.validateWorkspaceName(name);
      if (validationResult.isErr()) {
        return err(validationResult.error);
      }

      const workspacePath = path.join(this.workspacesRoot, name);
      return await this.fs.directoryExists(workspacePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Failed to check workspace existence: ${message}`));
    }
  }

  /**
   * Update workspace metadata and properties
   *
   * @param name - Workspace name to update
   * @param options - Update options (description, template, etc.)
   * @returns Result containing updated workspace metadata
   */
  async updateWorkspace(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<WorkspaceMetadata, Error>> {
    try {
      this.logger.info(`Updating workspace: ${name}`, { options });

      // Get current workspace info to ensure it exists
      const currentResult = await this.getWorkspaceInfo(name);
      if (currentResult.isErr()) {
        return currentResult;
      }

      const current = currentResult.value;
      const updatedWorkspace: WorkspaceMetadata = {
        ...current,
        description: options.description ?? current.description,
        template: options.template ?? current.template,
        updatedAt: new Date(),
      };

      // Emit workspace updated event
      try {
        await this.eventBus.emit(EVENTS.WORKSPACE_UPDATED, {
          name,
          path: current.path,
          changes: {
            description: options.description,
            template: options.template,
          },
          updatedAt: updatedWorkspace.updatedAt,
        });
      } catch (eventError) {
        this.logger.warn('Failed to emit workspace updated event', {
          name,
          error: eventError,
        });
      }

      this.logger.info(`Workspace updated successfully: ${name}`);
      return ok(updatedWorkspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error updating workspace: ${name}`, error);
      return err(new Error(`Workspace update failed: ${message}`));
    }
  }

  /**
   * Get absolute path to workspace directory
   *
   * @param name - Workspace name
   * @returns Result containing workspace path
   */
  async getWorkspacePath(name: string): Promise<Result<string, Error>> {
    const validationResult = this.validateWorkspaceName(name);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    return ok(path.join(this.workspacesRoot, name));
  }

  /**
   * Validate workspace name for security and consistency
   *
   * Prevents directory traversal, ensures valid characters,
   * and enforces naming conventions.
   *
   * @param name - Workspace name to validate
   * @returns Result indicating validation success or detailed error
   */
  private validateWorkspaceName(name: string): Result<void, Error> {
    try {
      validateWorkspaceName(name);
      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(new Error(`Invalid workspace name: ${message}`));
    }
  }

  // Legacy compatibility method - deprecated but kept for existing consumers
  /** @deprecated Use validateWorkspaceFile instead */
  async addFileToWorkspace(
    workspaceName: string,
    relativePath: string
  ): Promise<void> {
    const result = await this.validateWorkspaceFile(
      workspaceName,
      relativePath
    );
    if (result.isErr()) {
      throw result.error;
    }
  }
}
