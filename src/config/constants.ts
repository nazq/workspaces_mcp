export const SERVER_NAME = 'workspaces-mcp-server';
export const SERVER_VERSION = '1.0.0';

export const GLOBAL_INSTRUCTIONS_NAME = 'GLOBAL.md';
export const SHARED_INSTRUCTIONS_FOLDER = 'SHARED_INSTRUCTIONS';

export const DEFAULT_GLOBAL_INSTRUCTIONS = `# Global Instructions

These instructions will be automatically loaded in every Claude session when using the Workspaces MCP server.

## Your AI Assistant Guidelines

- Be concise and helpful
- Follow project conventions
- Ask for clarification when needed
- Focus on code quality and best practices

## Workspace Context

This workspace provides:
- Automatic context loading
- Shared instruction templates
- Project-specific organization

## Getting Started

1. Edit this file to customize your global instructions
2. Create shared instructions for different project types
3. Organize your projects in workspace folders

---

*This file is managed by Workspaces MCP. Edit freely to match your preferences.*
`;

export const MCP_RESOURCE_SCHEMES = {
  SHARED: 'file://shared',
  WORKSPACE: 'file://workspace',
} as const;
