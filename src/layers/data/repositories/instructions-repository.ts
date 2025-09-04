// Instructions Repository Implementation
import path from 'node:path';

import { inject, injectable } from 'tsyringe';

import { LLM_DIRECTIVE_HEADER } from '../../../config/constants.js';
import { TOKENS } from '../../../container/tokens.js';
import type { Logger } from '../../../interfaces/services.js';
import { createChildLogger } from '../../../utils/logger.js';
import type {
  FileSystemProvider,
  GlobalInstructions,
  InstructionsRepository,
  SharedInstruction,
  SharedInstructionMetadata,
} from '../interfaces.js';

@injectable()
export class FileSystemInstructionsRepository
  implements InstructionsRepository
{
  private logger: Logger;

  constructor(
    @inject(TOKENS.FileSystemService) private fs: FileSystemProvider,
    @inject('SharedInstructionsPath') private sharedInstructionsPath: string,
    @inject('GlobalInstructionsPath') private globalInstructionsPath: string,
    @inject(TOKENS.Logger) logger?: Logger
  ) {
    this.logger = logger ?? createChildLogger('data:instructions-repository');
  }

  async listShared(): Promise<SharedInstructionMetadata[]> {
    try {
      this.logger.debug(
        `Listing shared instructions in: ${this.sharedInstructionsPath}`
      );

      if (!(await this.fs.exists(this.sharedInstructionsPath))) {
        return [];
      }

      const entries = await this.fs.readDirectory(this.sharedInstructionsPath);
      const instructions: SharedInstructionMetadata[] = [];

      for (const entry of entries) {
        if (entry.endsWith('.md') && entry !== 'GLOBAL.md') {
          const name = path.basename(entry, '.md');
          const filePath = path.join(this.sharedInstructionsPath, entry);

          try {
            const stats = await this.fs.getStats(filePath);
            const content = await this.fs.readFile(filePath);
            const instruction = this.parseSharedInstructionFromMarkdown(
              content,
              name
            );

            instructions.push({
              name,
              description: instruction.description,
              createdAt: stats.createdTime,
              modifiedAt: stats.modifiedTime,
            });
          } catch (error) {
            this.logger.warn(
              `Skipping invalid instruction file: ${entry}`,
              error
            );
          }
        }
      }

      this.logger.debug(`Found ${instructions.length} shared instructions`);
      return instructions.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.logger.error('Failed to list shared instructions', error);
      throw new Error('Unable to list shared instructions');
    }
  }

  async getShared(name: string): Promise<SharedInstruction> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    try {
      this.logger.debug(`Getting shared instruction: ${name}`);

      if (!(await this.fs.exists(filePath))) {
        throw new Error(`Shared instruction '${name}' not found`);
      }

      const content = await this.fs.readFile(filePath);
      const instruction = this.parseSharedInstructionFromMarkdown(
        content,
        name
      );

      this.logger.debug(`Retrieved shared instruction: ${name}`);
      return instruction;
    } catch (error) {
      this.logger.error(`Failed to get shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to get shared instruction: ${name}`);
    }
  }

  async createShared(
    name: string,
    instruction: SharedInstruction
  ): Promise<void> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    try {
      this.logger.debug(`Creating shared instruction: ${name}`);

      // Ensure directory exists
      await this.fs.createDirectory(this.sharedInstructionsPath, true);

      // Check if instruction already exists
      if (await this.fs.exists(filePath)) {
        throw new Error(`Shared instruction '${name}' already exists`);
      }

      // Create markdown content with strong LLM directive
      const markdownContent =
        this.formatSharedInstructionAsMarkdown(instruction);

      await this.fs.writeFile(filePath, markdownContent);
      this.logger.info(`Shared instruction created: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to create shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to create shared instruction: ${name}`);
    }
  }

  async deleteShared(name: string): Promise<void> {
    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    try {
      this.logger.debug(`Deleting shared instruction: ${name}`);

      if (!(await this.fs.exists(filePath))) {
        throw new Error(`Shared instruction '${name}' not found`);
      }

      await this.fs.deleteFile(filePath);
      this.logger.info(`Shared instruction deleted: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to delete shared instruction: ${name}`, error);
      throw error instanceof Error
        ? error
        : new Error(`Unable to delete shared instruction: ${name}`);
    }
  }

  async getGlobal(): Promise<GlobalInstructions> {
    try {
      this.logger.debug('Getting global instructions');

      if (!(await this.fs.exists(this.globalInstructionsPath))) {
        // Return default global instructions
        return {
          content: 'Default global instructions for all workspaces.',
          variables: {},
        };
      }

      const content = await this.fs.readFile(this.globalInstructionsPath);
      // Parse markdown content - extract everything after the directive header
      const markdownContent = content.startsWith(LLM_DIRECTIVE_HEADER)
        ? content.substring(LLM_DIRECTIVE_HEADER.length)
        : content;
      const instructions: GlobalInstructions = {
        content: markdownContent,
        variables: {},
      };

      this.logger.debug('Retrieved global instructions');
      return instructions;
    } catch (error) {
      this.logger.error('Failed to get global instructions', error);
      throw new Error('Unable to get global instructions');
    }
  }

  async updateGlobal(instructions: GlobalInstructions): Promise<void> {
    try {
      this.logger.debug('Updating global instructions');

      // Ensure directory exists
      const dir = path.dirname(this.globalInstructionsPath);
      await this.fs.createDirectory(dir, true);

      await this.fs.writeFile(
        this.globalInstructionsPath,
        JSON.stringify(instructions, null, 2)
      );
      this.logger.info('Global instructions updated');
    } catch (error) {
      this.logger.error('Failed to update global instructions', error);
      throw new Error('Unable to update global instructions');
    }
  }

  /**
   * Format shared instruction as markdown with strong LLM directive
   */
  private formatSharedInstructionAsMarkdown(
    instruction: SharedInstruction
  ): string {
    const header = `${LLM_DIRECTIVE_HEADER}# ${instruction.name}

`;
    const description = instruction.description
      ? `> ${instruction.description}\n\n`
      : '';
    const content = instruction.content;

    return `${header}${description}${content}`;
  }

  /**
   * Parse shared instruction from markdown content
   */
  private parseSharedInstructionFromMarkdown(
    content: string,
    name: string
  ): SharedInstruction {
    try {
      // Remove the LLM directive header
      let cleanContent = content;
      if (content.startsWith(LLM_DIRECTIVE_HEADER)) {
        cleanContent = content.substring(LLM_DIRECTIVE_HEADER.length);
      }

      // Extract description from markdown (looking for > quoted text)
      let description: string | undefined;
      const descriptionMatch = cleanContent.match(/^>\s*(.+)$/m);
      if (descriptionMatch) {
        description = descriptionMatch[1].trim();
        // Remove the description line from content
        cleanContent = cleanContent.replace(/^>\s*.+$/m, '').trim();
      }

      // Remove the title line if it matches the name (more flexible matching)
      const titlePattern = new RegExp(
        `^#\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
        'im'
      );
      cleanContent = cleanContent.replace(titlePattern, '').trim();

      return {
        name,
        description,
        content: cleanContent,
        variables: {},
      };
    } catch (error) {
      this.logger.error(
        `Error parsing shared instruction markdown for ${name}:`,
        error
      );
      // Return a minimal valid instruction if parsing fails
      return {
        name,
        description: undefined,
        content,
        variables: {},
      };
    }
  }
}
