// Help Command
import type { CliCommand } from '../interface.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class HelpCommand extends BaseCliCommand {
  readonly name = 'help';
  readonly description = 'Show help information';
  readonly usage = 'help [command]';

  constructor(
    context: CliContext,
    private commands: Map<string, CliCommand>
  ) {
    super(context);
  }

  async execute(args: string[]): Promise<void> {
    const { remaining } = this.parseFlags(args);

    if (remaining.length === 0) {
      // Show general help
      this.showGeneralHelp();
    } else {
      // Show specific command help
      const [commandName] = remaining;
      this.showCommandHelp(commandName);
    }
  }

  private showGeneralHelp(): void {
    this.context.output.success('Workspaces MCP CLI');
    this.context.output.info(
      'Direct testing and debugging interface for workspace operations'
    );
    this.context.output.info('');
    this.context.output.info(
      'Usage: workspaces-cli <command> [options] [args]'
    );
    this.context.output.info('');
    this.context.output.info('Available commands:');

    const sortedCommands = Array.from(this.commands.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const command of sortedCommands) {
      this.context.output.info(
        `  ${command.name.padEnd(12)} ${command.description}`
      );
    }

    this.context.output.info('');
    this.context.output.info('Global options:');
    this.context.output.info('  --verbose, -v    Show detailed output');
    this.context.output.info('  --help, -h       Show help information');
    this.context.output.info('');
    this.context.output.info(
      'Use "workspaces-cli help <command>" for more information about a command'
    );
  }

  private showCommandHelp(commandName: string): void {
    const command = this.commands.get(commandName);

    if (!command) {
      this.context.output.error(`Unknown command: ${commandName}`);
      this.context.output.info(
        'Use "workspaces-cli help" to see available commands'
      );
      return;
    }

    this.context.output.success(`Command: ${command.name}`);
    this.context.output.info(`Description: ${command.description}`);
    this.context.output.info(`Usage: workspaces-cli ${command.usage}`);
  }
}
