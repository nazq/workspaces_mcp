// Workspace Service - Business Logic Layer for Workspace Management
// Wraps repository with Result pattern and business logic

import type {
  WorkspaceService as IWorkspaceService,
  Logger,
  WorkspaceCreateOptions,
  WorkspaceMetadata,
} from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, Ok } from '../../utils/result.js';
import type { WorkspaceRepository } from '../data/interfaces.js';

/**
 * Workspace service that provides business logic and Result pattern wrapping
 *
 * This service acts as an adapter between the raw data repository layer and the
 * service interface expected by tools. It converts exceptions to Result objects
 * and adds business logic validation.
 */
export class WorkspaceService implements IWorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly logger: Logger
  ) {}

  async createWorkspace(
    name: string,
    options?: WorkspaceCreateOptions
  ): Promise<Result<WorkspaceMetadata>> {
    try {
      this.logger.debug(`Creating workspace: ${name}`, options);

      // Use repository to create workspace
      await this.repository.create(name, options ?? {});

      // Get metadata for the created workspace
      const metadata = await this.repository.getMetadata(name);

      // Map data layer type to service layer type by adding missing timestamp
      const serviceMetadata = {
        ...metadata,
        updatedAt: metadata.createdAt, // Use createdAt as updatedAt if missing
      };

      this.logger.info(`Workspace created successfully: ${name}`);
      return Ok(serviceMetadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create workspace: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to create workspace: ${message}`));
    }
  }

  async listWorkspaces(): Promise<Result<WorkspaceMetadata[]>> {
    try {
      this.logger.debug('Listing all workspaces');
      const workspaces = await this.repository.list();

      // Map data layer types to service layer types
      const serviceWorkspaces = workspaces.map((workspace) => ({
        ...workspace,
        updatedAt: workspace.createdAt, // Use createdAt as updatedAt if missing
      }));

      this.logger.debug(`Found ${serviceWorkspaces.length} workspaces`);
      return Ok(serviceWorkspaces);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list workspaces', { error: message });
      return Err(new Error(`Failed to list workspaces: ${message}`));
    }
  }

  async getWorkspaceInfo(name: string): Promise<Result<WorkspaceMetadata>> {
    try {
      this.logger.debug(`Getting workspace info: ${name}`);
      const metadata = await this.repository.getMetadata(name);

      // Map data layer type to service layer type
      const serviceMetadata = {
        ...metadata,
        updatedAt: metadata.createdAt, // Use createdAt as updatedAt if missing
      };

      return Ok(serviceMetadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get workspace info: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to get workspace info: ${message}`));
    }
  }

  async deleteWorkspace(name: string): Promise<Result<void>> {
    try {
      this.logger.debug(`Deleting workspace: ${name}`);
      await this.repository.delete(name);
      this.logger.info(`Workspace deleted successfully: ${name}`);
      return Ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete workspace: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to delete workspace: ${message}`));
    }
  }

  async workspaceExists(name: string): Promise<Result<boolean>> {
    try {
      this.logger.debug(`Checking if workspace exists: ${name}`);
      const exists = await this.repository.exists(name);
      return Ok(exists);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check workspace existence: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to check workspace existence: ${message}`));
    }
  }

  async updateWorkspace(
    name: string,
    options: Partial<WorkspaceCreateOptions>
  ): Promise<Result<WorkspaceMetadata>> {
    try {
      this.logger.debug(`Updating workspace: ${name}`, options);

      await this.repository.update(name, options);
      const metadata = await this.repository.getMetadata(name);

      // Map data layer type to service layer type
      const serviceMetadata = {
        ...metadata,
        updatedAt: new Date(), // Set current time as updated time
      };

      this.logger.info(`Workspace updated successfully: ${name}`);
      return Ok(serviceMetadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update workspace: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to update workspace: ${message}`));
    }
  }
}
