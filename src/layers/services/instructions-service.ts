// Instructions Service - Business Logic Layer for Shared Instructions Management
// Wraps repository with Result pattern and business logic

import type {
  GlobalInstructions,
  GlobalInstructionUpdateOptions,
  InstructionsService as IInstructionsService,
  Logger,
  SharedInstruction,
  SharedInstructionCreateOptions,
} from '../../interfaces/services.js';
import type { Result } from '../../utils/result.js';
import { Err, Ok } from '../../utils/result.js';
import type { InstructionsRepository } from '../data/interfaces.js';

/**
 * Instructions service that provides business logic and Result pattern wrapping
 *
 * This service acts as an adapter between the raw data repository layer and the
 * service interface expected by tools. It converts exceptions to Result objects
 * and adds business logic validation.
 */
export class InstructionsService implements IInstructionsService {
  constructor(
    private readonly repository: InstructionsRepository,
    private readonly logger: Logger
  ) {}

  async createSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>> {
    try {
      this.logger.debug(`Creating shared instruction: ${name}`, {
        contentLength: content.length,
      });

      // Create SharedInstruction object to match data layer interface
      const instruction = {
        name,
        content,
        description: options?.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.repository.createShared(name, instruction);

      this.logger.info(`Shared instruction created successfully: ${name}`);
      return Ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create shared instruction: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to create shared instruction: ${message}`));
    }
  }

  async listSharedInstructions(): Promise<Result<SharedInstruction[]>> {
    try {
      this.logger.debug('Listing all shared instructions');
      const metadataList = await this.repository.listShared();

      // Need to get full SharedInstruction objects, not just metadata
      const instructions = await Promise.all(
        metadataList.map(async (metadata) => {
          try {
            const instruction = await this.repository.getShared(metadata.name);
            return {
              name: instruction.name,
              description: instruction.description,
              content: instruction.content,
              createdAt: metadata.createdAt, // From metadata
              updatedAt: metadata.modifiedAt, // Map modifiedAt to updatedAt
            };
          } catch {
            // If we can't get the full instruction, create a basic one
            return {
              name: metadata.name,
              description: metadata.description,
              content: '', // Empty content if we can't load it
              createdAt: metadata.createdAt,
              updatedAt: metadata.modifiedAt,
            };
          }
        })
      );

      this.logger.debug(`Found ${instructions.length} shared instructions`);
      return Ok(instructions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list shared instructions', {
        error: message,
      });
      return Err(new Error(`Failed to list shared instructions: ${message}`));
    }
  }

  async getSharedInstruction(name: string): Promise<Result<SharedInstruction>> {
    try {
      this.logger.debug(`Getting shared instruction: ${name}`);
      const instruction = await this.repository.getShared(name);

      // Map data layer type to service layer type by adding missing timestamps
      const serviceInstruction = {
        name: instruction.name,
        description: instruction.description,
        content: instruction.content,
        createdAt: new Date(), // Add missing field
        updatedAt: new Date(), // Add missing field
      };

      return Ok(serviceInstruction);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get shared instruction: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to get shared instruction: ${message}`));
    }
  }

  async updateSharedInstruction(
    name: string,
    content: string,
    options?: SharedInstructionCreateOptions
  ): Promise<Result<void>> {
    try {
      this.logger.debug(`Updating shared instruction: ${name}`, {
        contentLength: content.length,
      });

      // Since updateShared doesn't exist, use delete + create approach
      await this.repository.deleteShared(name);

      const instruction = {
        name,
        content,
        description: options?.description,
        createdAt: new Date(), // This will be overwritten if we had the original created date
        updatedAt: new Date(),
      };

      await this.repository.createShared(name, instruction);

      this.logger.info(`Shared instruction updated successfully: ${name}`);
      return Ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update shared instruction: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to update shared instruction: ${message}`));
    }
  }

  async deleteSharedInstruction(name: string): Promise<Result<void>> {
    try {
      this.logger.debug(`Deleting shared instruction: ${name}`);

      await this.repository.deleteShared(name);

      this.logger.info(`Shared instruction deleted successfully: ${name}`);
      return Ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete shared instruction: ${name}`, {
        error: message,
      });
      return Err(new Error(`Failed to delete shared instruction: ${message}`));
    }
  }

  async updateGlobalInstructions(
    content: string,
    options?: GlobalInstructionUpdateOptions
  ): Promise<Result<void>> {
    try {
      this.logger.debug('Updating global instructions', {
        contentLength: content.length,
        hasVariables: !!options?.variables,
      });

      const instructions = {
        content,
        variables: options?.variables,
      };

      await this.repository.updateGlobal(instructions);

      this.logger.info('Global instructions updated successfully');
      return Ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update global instructions', {
        error: message,
      });
      return Err(new Error(`Failed to update global instructions: ${message}`));
    }
  }

  async getGlobalInstructions(): Promise<Result<GlobalInstructions>> {
    try {
      this.logger.debug('Getting global instructions');
      const instructions = await this.repository.getGlobal();

      // Map data layer type to service layer type
      const serviceInstructions = {
        content: instructions.content,
        variables: instructions.variables,
        updatedAt: new Date(), // Add missing field expected by service layer
      };

      return Ok(serviceInstructions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get global instructions', {
        error: message,
      });
      return Err(new Error(`Failed to get global instructions: ${message}`));
    }
  }
}
