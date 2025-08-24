// Instructions Repository Implementation
import path from 'node:path';

import { createChildLogger } from '../../../utils/logger.js';
import type {
  FileSystemProvider,
  GlobalInstructions,
  InstructionsRepository,
  SharedInstruction,
  SharedInstructionMetadata,
} from '../interfaces.js';

const logger = createChildLogger('data:instructions-repository');

export class FileSystemInstructionsRepository
  implements InstructionsRepository
{
  constructor(
    private fs: FileSystemProvider,
    private sharedInstructionsPath: string,
    private globalInstructionsPath: string
  ) {}

  async listShared(): Promise<SharedInstructionMetadata[]> {
    try {
      logger.debug(
        `Listing shared instructions in: ${this.sharedInstructionsPath}`
      );

      if (!(await this.fs.exists(this.sharedInstructionsPath))) {
        return [];
      }

      const entries = await this.fs.readDirectory(this.sharedInstructionsPath);
      const instructions: SharedInstructionMetadata[] = [];

      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const name = path.basename(entry, '.json');
          const filePath = path.join(this.sharedInstructionsPath, entry);

          try {
            const stats = await this.fs.getStats(filePath);
            const content = await this.fs.readFile(filePath);
            const instruction = JSON.parse(content) as SharedInstruction;

            instructions.push({
              name,
              description: instruction.description,
              createdAt: stats.createdTime,
              modifiedAt: stats.modifiedTime,
            });
          } catch (error) {
            logger.warn(`Skipping invalid instruction file: ${entry}`, error);
          }
        }
      }

      logger.debug(`Found ${instructions.length} shared instructions`);
      return instructions.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('Failed to list shared instructions', error);
      throw new Error('Unable to list shared instructions');
    }
  }

  async getShared(name: string): Promise<SharedInstruction> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.json`);

    try {
      logger.debug(`Getting shared instruction: ${name}`);

      if (!(await this.fs.exists(filePath))) {
        throw new Error(`Shared instruction '${name}' not found`);
      }

      const content = await this.fs.readFile(filePath);
      const instruction = JSON.parse(content) as SharedInstruction;

      logger.debug(`Retrieved shared instruction: ${name}`);
      return instruction;
    } catch (error) {
      logger.error(`Failed to get shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to get shared instruction: ${name}`);
    }
  }

  async createShared(
    name: string,
    instruction: SharedInstruction
  ): Promise<void> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.json`);

    try {
      logger.debug(`Creating shared instruction: ${name}`);

      // Ensure directory exists
      await this.fs.createDirectory(this.sharedInstructionsPath, true);

      // Check if instruction already exists
      if (await this.fs.exists(filePath)) {
        throw new Error(`Shared instruction '${name}' already exists`);
      }

      // Ensure name matches
      const instructionData = { ...instruction, name };

      await this.fs.writeFile(
        filePath,
        JSON.stringify(instructionData, null, 2)
      );
      logger.info(`Shared instruction created: ${name}`);
    } catch (error) {
      logger.error(`Failed to create shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to create shared instruction: ${name}`);
    }
  }

  async deleteShared(name: string): Promise<void> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.json`);

    try {
      logger.debug(`Deleting shared instruction: ${name}`);

      if (!(await this.fs.exists(filePath))) {
        throw new Error(`Shared instruction '${name}' not found`);
      }

      await this.fs.deleteFile(filePath);
      logger.info(`Shared instruction deleted: ${name}`);
    } catch (error) {
      logger.error(`Failed to delete shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to delete shared instruction: ${name}`);
    }
  }

  async getGlobal(): Promise<GlobalInstructions> {
    try {
      logger.debug('Getting global instructions');

      if (!(await this.fs.exists(this.globalInstructionsPath))) {
        // Return default global instructions
        return {
          content: 'Default global instructions for all workspaces.',
          variables: {},
        };
      }

      const content = await this.fs.readFile(this.globalInstructionsPath);
      const instructions = JSON.parse(content) as GlobalInstructions;

      logger.debug('Retrieved global instructions');
      return instructions;
    } catch (error) {
      logger.error('Failed to get global instructions', error);
      throw new Error('Unable to get global instructions');
    }
  }

  async updateGlobal(instructions: GlobalInstructions): Promise<void> {
    try {
      logger.debug('Updating global instructions');

      // Ensure directory exists
      const dir = path.dirname(this.globalInstructionsPath);
      await this.fs.createDirectory(dir, true);

      await this.fs.writeFile(
        this.globalInstructionsPath,
        JSON.stringify(instructions, null, 2)
      );
      logger.info('Global instructions updated');
    } catch (error) {
      logger.error('Failed to update global instructions', error);
      throw new Error('Unable to update global instructions');
    }
  }
}
