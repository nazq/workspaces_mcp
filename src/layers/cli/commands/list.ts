// List Workspaces Command
import type { WorkspaceRepository } from '../../data/interfaces.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class ListCommand extends BaseCliCommand {
  readonly name = 'list';
  readonly description = 'List all workspaces';
  readonly usage = 'list [--verbose|-v]';

  constructor(
    context: CliContext,
    private workspaceRepository: WorkspaceRepository
  ) {
    super(context);
  }

  async execute(args: string[]): Promise<void> {
    const { flags } = this.parseFlags(args);
    const verbose = flags.verbose || flags.v;

    try {
      const workspaces = await this.workspaceRepository.list();

      if (workspaces.length === 0) {
        this.context.output.info('No workspaces found');
        return;
      }

      if (verbose) {
        this.context.output.table(
          workspaces.map((ws) => ({
            name: ws.name,
            created: ws.createdAt.toISOString(),
            'has-instructions': ws.hasInstructions ? 'yes' : 'no',
            description: ws.description || 'No description',
          }))
        );
      } else {
        workspaces.forEach((ws) => {
          this.context.output.success(ws.name);
        });
      }

      this.context.output.info(`Found ${workspaces.length} workspace(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.output.error(`Failed to list workspaces: ${message}`);
      throw error;
    }
  }
}
