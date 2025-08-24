import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface InstallOptions {
  path?: string;
}

const getDefaultWorkspacesRoot = (customPath?: string): string => {
  return customPath ?? path.join(homedir(), 'Documents', 'workspaces');
};

const getClaudeConfigPath = (): string => {
  const platform = process.platform;
  if (platform === 'darwin') {
    return path.join(
      homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
  } else if (platform === 'win32') {
    return path.join(
      homedir(),
      'AppData',
      'Roaming',
      'Claude',
      'claude_desktop_config.json'
    );
  } else {
    // Linux
    return path.join(
      homedir(),
      '.config',
      'Claude',
      'claude_desktop_config.json'
    );
  }
};

const DEFAULT_GLOBAL_INSTRUCTIONS = `# Global Instructions

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

export const handleInstall = async (options: InstallOptions): Promise<void> => {
  const spinner = ora('Setting up Workspaces MCP...').start();

  try {
    const workspacesRoot = getDefaultWorkspacesRoot(options.path);

    // Step 1: Create workspaces directory structure
    spinner.text = 'Creating workspaces directory structure...';
    await fs.ensureDir(workspacesRoot);

    const sharedInstructionsDir = path.join(
      workspacesRoot,
      'SHARED_INSTRUCTIONS'
    );
    await fs.ensureDir(sharedInstructionsDir);

    // Create default global instructions if they don't exist
    const globalInstructionsPath = path.join(
      sharedInstructionsDir,
      'GLOBAL.md'
    );
    if (!(await fs.pathExists(globalInstructionsPath))) {
      await fs.writeFile(globalInstructionsPath, DEFAULT_GLOBAL_INSTRUCTIONS);
    }

    // Step 2: Get MCP server path (assumes it's built)
    spinner.text = 'Locating MCP server...';
    const mcpServerPath = path.resolve(
      __dirname,
      '../../../mcp-server/dist/index.js'
    );

    if (!(await fs.pathExists(mcpServerPath))) {
      throw new Error(
        `MCP server not found at ${mcpServerPath}. Please build the project first with 'npm run build'.`
      );
    }

    // Step 3: Configure Claude Desktop
    spinner.text = 'Configuring Claude Desktop...';
    const claudeConfigPath = getClaudeConfigPath();
    const claudeConfigDir = path.dirname(claudeConfigPath);

    // Ensure Claude config directory exists
    await fs.ensureDir(claudeConfigDir);

    let claudeConfig: Record<string, any> = {};
    if (await fs.pathExists(claudeConfigPath)) {
      try {
        const existingConfig = await fs.readFile(claudeConfigPath, 'utf8');
        claudeConfig = JSON.parse(existingConfig);
      } catch {
        console.warn(
          chalk.yellow(
            'Warning: Could not parse existing Claude config, creating new one'
          )
        );
      }
    }

    // Add MCP server configuration
    if (!claudeConfig.mcpServers) {
      claudeConfig.mcpServers = {};
    }

    claudeConfig.mcpServers['workspaces-mcp'] = {
      command: 'node',
      args: [mcpServerPath],
      env: {
        WORKSPACES_ROOT: workspacesRoot,
      },
    };

    await fs.writeFile(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));

    spinner.succeed('Workspaces MCP installed successfully!');

    console.log(chalk.green('\n✅ Setup complete! Next steps:'));
    console.log('1. Restart Claude Desktop');
    console.log('2. Look for "🌍 Global Instructions" in resources');
    console.log('3. Click to load your global context');
    console.log('4. Edit global instructions in your workspaces directory');

    console.log(chalk.blue(`\n📁 Workspaces directory: ${workspacesRoot}`));
    console.log(chalk.blue(`📝 Claude config: ${claudeConfigPath}`));

    if (options.path !== undefined) {
      console.log(chalk.yellow(`\n⚠️  Custom workspace path: ${options.path}`));
    }
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
};
