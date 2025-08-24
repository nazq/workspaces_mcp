// Create Workspace Command
import type { WorkspaceRepository } from '../../data/interfaces.js';
import type { WorkspaceCreateOptions } from '../../services/interfaces.js';
import { BaseCliCommand, type CliContext } from '../interface.js';

export class CreateCommand extends BaseCliCommand {
  readonly name = 'create';
  readonly description = 'Create a new workspace';
  readonly usage =
    'create <name> [--description|-d <desc>] [--with-instructions|-i]';

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

    // Extract description from flags
    let description: string | undefined;
    const descIndex = args.findIndex(
      (arg) => arg === '--description' || arg === '-d'
    );
    if (descIndex !== -1 && descIndex + 1 < args.length) {
      description = args[descIndex + 1];
    }

    const options: WorkspaceCreateOptions = {
      description,
      initializeInstructions: flags['with-instructions'] || flags.i || false,
    };

    try {
      // Check if workspace already exists
      if (await this.workspaceRepository.exists(name)) {
        this.context.output.error(`Workspace '${name}' already exists`);
        return;
      }

      await this.workspaceRepository.create(name, options);

      this.context.output.success(`Created workspace '${name}'`);

      if (options.description) {
        this.context.output.info(`Description: ${options.description}`);
      }

      if (options.initializeInstructions) {
        this.context.output.info('Initialized with INSTRUCTIONS.md template');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.output.error(
        `Failed to create workspace '${name}': ${message}`
      );
      throw error;
    }
  }
}
