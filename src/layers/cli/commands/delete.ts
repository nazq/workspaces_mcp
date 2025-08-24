// Delete Workspace Command
import type { WorkspaceRepository } from '../../data/interfaces.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class DeleteCommand extends BaseCliCommand {
  readonly name = 'delete';
  readonly description = 'Delete a workspace';
  readonly usage = 'delete <name> [--force|-f]';

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
    const force = flags.force || flags.f;

    try {
      // Check if workspace exists
      if (!(await this.workspaceRepository.exists(name))) {
        this.context.output.error(`Workspace '${name}' does not exist`);
        return;
      }

      // Warning for non-force deletion
      if (!force) {
        this.context.output.warn(
          `This will permanently delete workspace '${name}' and all its contents.`
        );
        this.context.output.info('Use --force/-f to confirm deletion');
        return;
      }

      await this.workspaceRepository.delete(name);
      this.context.output.success(`Deleted workspace '${name}'`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.output.error(
        `Failed to delete workspace '${name}': ${message}`
      );
      throw error;
    }
  }
}
