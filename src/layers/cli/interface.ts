// CLI Interface Types and Contracts
export interface CliCommand {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  execute(args: string[]): Promise<void>;
}

export interface CliContext {
  workspacesRoot: string;
  verbose: boolean;
  output: CliOutput;
}

export interface CliOutput {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  json(data: unknown): void;
  table(data: Array<Record<string, unknown>>): void;
}

export abstract class BaseCliCommand implements CliCommand {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly usage: string;

  constructor(protected context: CliContext) {}

  abstract execute(args: string[]): Promise<void>;

  protected validateArgs(
    args: string[],
    minCount: number,
    maxCount?: number
  ): void {
    if (args.length < minCount) {
      throw new Error(`Not enough arguments. Usage: ${this.usage}`);
    }
    if (maxCount !== undefined && args.length > maxCount) {
      throw new Error(`Too many arguments. Usage: ${this.usage}`);
    }
  }

  protected parseFlags(args: string[]): {
    flags: Record<string, boolean>;
    remaining: string[];
  } {
    const flags: Record<string, boolean> = {};
    const remaining: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('--')) {
        flags[arg.slice(2)] = true;
      } else if (arg.startsWith('-')) {
        flags[arg.slice(1)] = true;
      } else {
        remaining.push(arg);
      }
    }

    return { flags, remaining };
  }
}
