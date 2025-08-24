// CLI Runner and Command Coordinator
import type { WorkspaceRepository } from '../data/interfaces.js';
import type { ToolService } from '../services/tool-service.js';

import {
  CreateCommand,
  DeleteCommand,
  HelpCommand,
  InfoCommand,
  ListCommand,
  TestToolsCommand,
} from './commands/index.js';
import type { CliCommand, CliContext } from './interface.js';
import { ConsoleOutput } from './output.js';

export interface CliRunnerConfig {
  workspacesRoot: string;
  verbose?: boolean;
}

export class CliRunner {
  private commands = new Map<string, CliCommand>();
  private context: CliContext;

  constructor(
    config: CliRunnerConfig,
    workspaceRepository: WorkspaceRepository,
    toolService: ToolService
  ) {
    this.context = {
      workspacesRoot: config.workspacesRoot,
      verbose: config.verbose || false,
      output: new ConsoleOutput(config.verbose),
    };

    // Register commands
    this.registerCommand(new ListCommand(this.context, workspaceRepository));
    this.registerCommand(new CreateCommand(this.context, workspaceRepository));
    this.registerCommand(new DeleteCommand(this.context, workspaceRepository));
    this.registerCommand(new InfoCommand(this.context, workspaceRepository));
    this.registerCommand(new TestToolsCommand(this.context, toolService));
    this.registerCommand(new HelpCommand(this.context, this.commands));
  }

  private registerCommand(command: CliCommand): void {
    this.commands.set(command.name, command);
  }

  async run(argv: string[]): Promise<void> {
    // Parse global flags
    const globalFlags = this.parseGlobalFlags(argv);

    if (globalFlags.help) {
      await this.commands.get('help')?.execute([]);
      return;
    }

    if (globalFlags.verbose) {
      this.context.verbose = true;
      this.context.output = new ConsoleOutput(true);
    }

    // Get command and arguments
    const commandName = globalFlags.remaining[0];
    const commandArgs = globalFlags.remaining.slice(1);

    if (!commandName) {
      this.context.output.error('No command specified');
      await this.commands.get('help')?.execute([]);
      process.exit(1);
    }

    const command = this.commands.get(commandName);
    if (!command) {
      this.context.output.error(`Unknown command: ${commandName}`);
      this.context.output.info(
        'Use "workspaces-cli help" to see available commands'
      );
      process.exit(1);
    }

    try {
      await command.execute(commandArgs);
    } catch (error) {
      this.context.output.error('Command failed');
      if (this.context.verbose && error instanceof Error) {
        this.context.output.error(error.stack || error.message);
      }
      process.exit(1);
    }
  }

  private parseGlobalFlags(argv: string[]): {
    help: boolean;
    verbose: boolean;
    remaining: string[];
  } {
    const help = argv.includes('--help') || argv.includes('-h');
    const verbose = argv.includes('--verbose') || argv.includes('-v');

    const remaining = argv.filter(
      (arg) => !['--help', '-h', '--verbose', '-v'].includes(arg)
    );

    return { help, verbose, remaining };
  }
}
