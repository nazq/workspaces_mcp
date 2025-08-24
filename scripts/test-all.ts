#!/usr/bin/env tsx

import chalk from 'chalk';
import { spawn } from 'node:child_process';

interface TestResult {
  name: string;
  passed: boolean;
  output: string;
  error?: string;
}

const runCommand = (
  command: string,
  args: string[],
  cwd = process.cwd()
): Promise<TestResult> => {
  return new Promise((resolve) => {
    console.log(chalk.blue(`\n📋 Running: ${command} ${args.join(' ')}`));

    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        name: `${command} ${args.join(' ')}`,
        passed: code === 0,
        output,
        error: code !== 0 ? errorOutput : undefined,
      });
    });

    child.on('error', (error) => {
      resolve({
        name: `${command} ${args.join(' ')}`,
        passed: false,
        output,
        error: error.message,
      });
    });
  });
};

async function runAllTests() {
  console.log(
    chalk.yellow.bold('🧪 Running complete test suite for Workspaces MCP\n')
  );

  const results: TestResult[] = [];

  // TypeScript type checking
  results.push(await runCommand('npm', ['run', 'typecheck']));

  // Code linting
  results.push(await runCommand('npm', ['run', 'lint']));

  // Code formatting check
  results.push(await runCommand('npm', ['run', 'format', '--', '--check']));

  // Unit tests with coverage
  results.push(await runCommand('npm', ['run', 'test:coverage']));

  // Build all packages
  results.push(await runCommand('npm', ['run', 'build']));

  // Integration tests
  results.push(await runCommand('npm', ['run', 'test:integration']));

  // Security audit
  results.push(await runCommand('npm', ['audit', '--audit-level', 'high']));

  console.log(chalk.yellow.bold('\n📊 Test Results Summary:\n'));

  let allPassed = true;
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED');
    console.log(`${icon} ${status}: ${result.name}`);

    if (!result.passed) {
      allPassed = false;
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    }
  });

  console.log(
    `\n${allPassed ? '🎉' : '💥'} Overall: ${allPassed ? chalk.green('ALL TESTS PASSED') : chalk.red('SOME TESTS FAILED')}`
  );

  if (allPassed) {
    console.log(chalk.green('\n✅ Ready for production deployment!'));
    console.log(chalk.blue('\nNext steps:'));
    console.log('  • Create a release tag: git tag v1.0.0');
    console.log('  • Push the tag: git push origin v1.0.0');
    console.log('  • GitHub Actions will handle the rest!');
  } else {
    console.log(
      chalk.red('\n❌ Please fix the failing tests before deploying.')
    );
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test suite
runAllTests().catch((error) => {
  console.error(chalk.red('Test runner failed:'), error);
  process.exit(1);
});
