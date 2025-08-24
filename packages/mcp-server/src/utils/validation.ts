import { z } from 'zod';

export const workspaceNameSchema = z
  .string()
  .min(1, 'Workspace name cannot be empty')
  .max(100, 'Workspace name too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Workspace name can only contain letters, numbers, hyphens, and underscores'
  )
  .refine(
    (name) => !name.startsWith('-'),
    'Workspace name cannot start with a hyphen'
  )
  .refine(
    (name) => !name.endsWith('-'),
    'Workspace name cannot end with a hyphen'
  )
  .refine(
    (name) => name !== 'SHARED_INSTRUCTIONS',
    'Cannot use reserved name "SHARED_INSTRUCTIONS"'
  );

export const instructionNameSchema = z
  .string()
  .min(1, 'Instruction name cannot be empty')
  .max(100, 'Instruction name too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Instruction name can only contain letters, numbers, hyphens, and underscores'
  )
  .refine((name) => name !== 'GLOBAL', 'Cannot use reserved name "GLOBAL"');

export const fileContentSchema = z
  .string()
  .max(100000, 'File content too large');

export const validateWorkspaceName = (name: string): void => {
  workspaceNameSchema.parse(name);
};

export const validateInstructionName = (name: string): void => {
  instructionNameSchema.parse(name);
};

export const validateFileContent = (content: string): void => {
  fileContentSchema.parse(content);
};
