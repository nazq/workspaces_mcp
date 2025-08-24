// Workspace Info Command
import type { WorkspaceRepository } from '../../data/interfaces.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class InfoCommand extends BaseCliCommand {
  readonly name = 'info';
  readonly description = 'Show detailed information about a workspace';
  readonly usage = 'info <name> [--json]';

  constructor(
    context: CliContext,
    private workspaceRepository: WorkspaceRepository
  ) {
    super(context);
  }

  async execute(args: string[]): Promise<void> {
    const { flags, remaining } = this.parseFlags(args);
    this.validateArgs(remaining, 1, 1);

    const [name] = remaining;
    const jsonOutput = flags.json;

    try {
      // Check if workspace exists
      if (!(await this.workspaceRepository.exists(name))) {
        this.context.output.error(`Workspace '${name}' does not exist`);
        return;
      }

      const metadata = await this.workspaceRepository.getMetadata(name);

      if (jsonOutput) {
        this.context.output.json(metadata);
      } else {
        this.context.output.success(`Workspace: ${metadata.name}`);

        if (metadata.description) {
          this.context.output.info(`Description: ${metadata.description}`);
        } else {
          this.context.output.info('Description: No description');
        }

        this.context.output.info(
          `Created: ${metadata.createdAt.toISOString()}`
        );
        this.context.output.info(
          `Has Instructions: ${metadata.hasInstructions ? 'Yes' : 'No'}`
        );
        this.context.output.info(
          `Path: ${this.context.workspacesRoot}/${metadata.name}`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.output.error(
        `Failed to get workspace info '${name}': ${message}`
      );
      throw error;
    }
  }
}
