import path from 'node:path';

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
    if (!(await this.fs.fileExists(this.globalInstructionsPath))) {
      await this.updateGlobalInstructions(DEFAULT_GLOBAL_INSTRUCTIONS);
    }

    const content = await this.fs.readFile(this.globalInstructionsPath);
    const stats = await this.fs.getFileStats(this.globalInstructionsPath);

    return {
      content,
      lastModified: stats.mtime,
    };
  }

  async listSharedInstructions(): Promise<SharedInstruction[]> {
    if (!(await this.fs.directoryExists(this.sharedInstructionsPath))) {
      return [];
    }

    const files = await this.fs.listFiles(this.sharedInstructionsPath);
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

    if (!(await this.fs.fileExists(filePath))) {
      throw new SharedInstructionNotFoundError(name);
    }

    const content = await this.fs.readFile(filePath);
    const stats = await this.fs.getFileStats(filePath);

    return {
      name,
      path: filePath,
      content,
      createdAt: stats.ctime,
      updatedAt: stats.mtime,
    };
  }

  async deleteSharedInstruction(name: string): Promise<void> {
    validateInstructionName(name);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    if (!(await this.fs.fileExists(filePath))) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.deleteFile(filePath);
  }

  async updateSharedInstruction(name: string, content: string): Promise<void> {
    validateInstructionName(name);
    validateFileContent(content);

    const filePath = path.join(this.sharedInstructionsPath, `${name}.md`);

    if (!(await this.fs.fileExists(filePath))) {
      throw new SharedInstructionNotFoundError(name);
    }

    await this.fs.writeFile(filePath, content);
  }
}
