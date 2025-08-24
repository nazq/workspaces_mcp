export interface Workspace {
  name: string;
  path: string;
  description?: string;
  template?: string;
  createdAt: Date;
  updatedAt: Date;
  files: string[];
}

export interface WorkspaceCreateOptions {
  name: string;
  description?: string;
  template?: string;
}

export interface SharedInstruction {
  name: string;
  path: string;
  content: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceConfig {
  workspacesRoot: string;
  sharedInstructionsPath: string;
  globalInstructionsPath: string;
}
