import { homedir } from 'node:os';
import path from 'node:path';

export const getDefaultWorkspacesRoot = (): string => {
  return (
    process.env.WORKSPACES_ROOT ??
    path.join(homedir(), 'Documents', 'workspaces')
  );
};

export const getSharedInstructionsPath = (workspacesRoot: string): string => {
  return path.join(workspacesRoot, 'SHARED_INSTRUCTIONS');
};

export const getGlobalInstructionsPath = (workspacesRoot: string): string => {
  return path.join(getSharedInstructionsPath(workspacesRoot), 'GLOBAL.md');
};

export const getWorkspacePath = (
  workspacesRoot: string,
  workspaceName: string
): string => {
  return path.join(workspacesRoot, workspaceName);
};
