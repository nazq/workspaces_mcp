import * as path from 'node:path';

import {
  DEFAULT_GLOBAL_INSTRUCTIONS,
  GLOBAL_INSTRUCTIONS_NAME,
} from '../config/constants.js';
import {
  getGlobalInstructionsPath,
  getSharedInstructionsPath,
} from '../config/paths.js';
import type {
  GlobalInstructions,
  InstructionCreateOptions,
  SharedInstruction,
} from '../types/index.js';
import { SharedInstructionNotFoundError } from '../utils/errors.js';
import {
  validateFileContent,
  validateInstructionName,
} from '../utils/validation.js';

import { FileSystemService } from './filesystem.js';

export class InstructionsService {
  private fs: FileSystemService;
  private sharedInstructionsPath: string;
  private globalInstructionsPath: string;

  constructor(
    private workspacesRoot: string,
    fileSystemService?: FileSystemService
  ) {
    this.fs = fileSystemService ?? new FileSystemService();
    this.sharedInstructionsPath = getSharedInstructionsPath(
      this.workspacesRoot
    );
    this.globalInstructionsPath = getGlobalInstructionsPath(
      this.workspacesRoot
    );
  }

  async createSharedInstruction(
    name: string,
    options: Omit<InstructionCreateOptions, 'name'>
  ): Promise<void> {
    validateInstructionName(name);
    validateFileContent(options.content);

    await this.fs.ensureDirectory(this.sharedInstructionsPath);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);
    await this.fs.writeFile(filePath, options.content);
  }

  async updateGlobalInstructions(content: string): Promise<void> {
    validateFileContent(content);

    await this.fs.ensureDirectory(this.sharedInstructionsPath);
    await this.fs.writeFile(this.globalInstructionsPath, content);
  }

  async getGlobalInstructions(): Promise<GlobalInstructions> {
    const fileExistsResult = await this.fs.fileExists(
      this.globalInstructionsPath
    );
    if (fileExistsResult.isErr() || !fileExistsResult.value) {
      await this.updateGlobalInstructions(DEFAULT_GLOBAL_INSTRUCTIONS);
    }

    // Content will be read when needed
    const statsResult = await this.fs.getFileStats(this.globalInstructionsPath);

    if (statsResult.isErr()) {
      throw new Error(
        `Failed to get file stats for global instructions: ${statsResult.error instanceof Error ? statsResult.error.message : 'Unknown error'}`
      );
    }

    const contentResult = await this.fs.readFile(this.globalInstructionsPath);
    if (contentResult.isErr()) {
      throw new Error(
        `Failed to read global instructions: ${contentResult.error instanceof Error ? contentResult.error.message : 'Unknown error'}`
      );
    }

    return {
      content: contentResult.value,
      lastModified: statsResult.value.updatedAt,
    };
  }

  async listSharedInstructions(): Promise<SharedInstruction[]> {
    const existsResult = await this.fs.directoryExists(
      this.sharedInstructionsPath
    );
    if (existsResult.isErr() || !existsResult.value) {
      return [];
    }

    const filesResult = await this.fs.listFiles(this.sharedInstructionsPath);
    if (filesResult.isErr()) {
      return [];
    }

    const files = filesResult.value;
    const instructions: SharedInstruction[] = [];

    for (const file of files) {
      if (!file.endsWith('.md') || file === GLOBAL_INSTRUCTIONS_NAME) {
        continue;
      }

      const name = path.basename(file, '.md');
      try {
        const instruction = await this.getSharedInstruction(name);
        instructions.push(instruction);
      } catch {
        // Skip invalid instructions
        continue;
      }
    }

    return instructions.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSharedInstruction(name: string): Promise<SharedInstruction> {
    validateInstructionName(name);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    const fileExistsResult = await this.fs.fileExists(filePath);
    if (fileExistsResult.isErr() || !fileExistsResult.value) {
      throw new SharedInstructionNotFoundError(name);
    }

    const contentResult = await this.fs.readFile(filePath);
    if (contentResult.isErr()) {
      throw new Error(
        `Failed to read instruction ${name}: ${contentResult.error instanceof Error ? contentResult.error.message : 'Unknown error'}`
      );
    }

    const statsResult = await this.fs.getFileStats(filePath);
    if (statsResult.isErr()) {
      throw new Error(
        `Failed to get file stats for ${name}: ${statsResult.error instanceof Error ? statsResult.error.message : 'Unknown error'}`
      );
    }

    return {
      name,
      path: filePath,
      content: contentResult.value,
      createdAt: statsResult.value.createdAt,
      updatedAt: statsResult.value.updatedAt,
    };
  }

  async deleteSharedInstruction(name: string): Promise<void> {
    validateInstructionName(name);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    const fileExistsResult = await this.fs.fileExists(filePath);
    if (fileExistsResult.isErr() || !fileExistsResult.value) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.deleteFile(filePath);
  }

  async updateSharedInstruction(name: string, content: string): Promise<void> {
    validateInstructionName(name);
    validateFileContent(content);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    const fileExistsResult = await this.fs.fileExists(filePath);
    if (fileExistsResult.isErr() || !fileExistsResult.value) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.writeFile(filePath, content);
  }
}
