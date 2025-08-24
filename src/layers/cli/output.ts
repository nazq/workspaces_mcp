// CLI Output Implementation with Colors and Formatting
import chalk from 'chalk';

import type { CliOutput } from './interface.js';

export class ConsoleOutput implements CliOutput {
  constructor(private verbose = false) {}

  info(message: string): void {
    if (this.verbose) {
      console.log(chalk.blue('ℹ'), message);
    }
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  json(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
  }

  table(data: Array<Record<string, unknown>>): void {
    if (data.length === 0) {
      this.info('No data to display');
      return;
    }

    console.table(data);
  }
}

export class TestOutput implements CliOutput {
  public messages: Array<{ type: string; content: string | unknown }> = [];

  info(message: string): void {
    this.messages.push({ type: 'info', content: message });
  }

  success(message: string): void {
    this.messages.push({ type: 'success', content: message });
  }

  error(message: string): void {
    this.messages.push({ type: 'error', content: message });
  }

  warn(message: string): void {
    this.messages.push({ type: 'warn', content: message });
  }

  json(data: unknown): void {
    this.messages.push({ type: 'json', content: data });
  }

  table(data: Array<Record<string, unknown>>): void {
    this.messages.push({ type: 'table', content: data });
  }

  clear(): void {
    this.messages = [];
  }

  getMessages(
    type?: string
  ): Array<{ type: string; content: string | unknown }> {
    return type ? this.messages.filter((m) => m.type === type) : this.messages;
  }
}
