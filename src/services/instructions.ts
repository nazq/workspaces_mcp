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
import { isErr } from '../utils/result.js';
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
    const fileExistsResult = await this.fs.fileExists(this.globalInstructionsPath);
    if (isErr(fileExistsResult) || !fileExistsResult.data) {
      await this.updateGlobalInstructions(DEFAULT_GLOBAL_INSTRUCTIONS);
    }

    const content = await this.fs.readFile(this.globalInstructionsPath);
    const statsResult = await this.fs.getFileStats(this.globalInstructionsPath);
    
    if (isErr(statsResult)) {
      throw new Error(`Failed to get file stats for global instructions: ${statsResult.error.message}`);
    }

    const contentResult = await this.fs.readFile(this.globalInstructionsPath);
    if (isErr(contentResult)) {
      throw new Error(`Failed to read global instructions: ${contentResult.error.message}`);
    }

    return {
      content: contentResult.data,
      lastModified: statsResult.data.updatedAt,
    };
  }

  async listSharedInstructions(): Promise<SharedInstruction[]> {
    const existsResult = await this.fs.directoryExists(this.sharedInstructionsPath);
    if (isErr(existsResult) || !existsResult.data) {
      return [];
    }

    const filesResult = await this.fs.listFiles(this.sharedInstructionsPath);
    if (isErr(filesResult)) {
      return [];
    }

    const files = filesResult.data;
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
    if (isErr(fileExistsResult) || !fileExistsResult.data) {
      throw new SharedInstructionNotFoundError(name);
    }

    const contentResult = await this.fs.readFile(filePath);
    if (isErr(contentResult)) {
      throw new Error(`Failed to read instruction ${name}: ${contentResult.error.message}`);
    }

    const statsResult = await this.fs.getFileStats(filePath);
    if (isErr(statsResult)) {
      throw new Error(`Failed to get file stats for ${name}: ${statsResult.error.message}`);
    }

    return {
      name,
      path: filePath,
      content: contentResult.data,
      createdAt: statsResult.data.createdAt,
      updatedAt: statsResult.data.updatedAt,
    };
  }

  async deleteSharedInstruction(name: string): Promise<void> {
    validateInstructionName(name);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    const fileExistsResult = await this.fs.fileExists(filePath);
    if (isErr(fileExistsResult) || !fileExistsResult.data) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.deleteFile(filePath);
  }

  async updateSharedInstruction(name: string, content: string): Promise<void> {
    validateInstructionName(name);
    validateFileContent(content);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    const fileExistsResult = await this.fs.fileExists(filePath);
    if (isErr(fileExistsResult) || !fileExistsResult.data) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.writeFile(filePath, content);
  }
}
