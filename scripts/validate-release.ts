#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ValidationResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const runCommand = (command: string, args: string[], options: { cwd?: string; timeout?: number } = {}): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Command timeout: ${command} ${args.join(' ')}`));
    }, options.timeout || 30000);

    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: 'pipe',
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

async function validateBuilds(): Promise<ValidationResult> {
  console.log(chalk.blue('🔍 Validating builds...'));
  
  try {
    // Check that all packages are built
    const mcpServerPath = path.resolve(__dirname, '../packages/mcp-server/dist/index.js');
    const dxtCliPath = path.resolve(__dirname, '../packages/dxt-workspaces/dist/index.js');

    if (!(await fs.pathExists(mcpServerPath))) {
      return {
        name: 'Build Validation',
        passed: false,
        error: 'MCP server build not found at ' + mcpServerPath
      };
    }

    if (!(await fs.pathExists(dxtCliPath))) {
      return {
        name: 'Build Validation',
        passed: false,
        error: 'DXT CLI build not found at ' + dxtCliPath
      };
    }

    return {
      name: 'Build Validation',
      passed: true,
      details: 'All packages built successfully'
    };
  } catch (error) {
    return {
      name: 'Build Validation',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateMCPServer(): Promise<ValidationResult> {
  console.log(chalk.blue('🔍 Validating MCP server...'));
  
  try {
    // Create temp workspace for testing
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), 'validate-mcp-'));
    
    try {
      const result = await runCommand('node', [
        path.resolve(__dirname, '../packages/mcp-server/dist/index.js')
      ], {
        cwd: tempDir,
        timeout: 10000
      });

      // MCP server should start and respond to stdin
      if (result.code === 0 || result.stdout.includes('MCP server initialized')) {
        return {
          name: 'MCP Server Validation',
          passed: true,
          details: 'MCP server starts and initializes correctly'
        };
      } else {
        return {
          name: 'MCP Server Validation',
          passed: false,
          error: `MCP server failed: ${result.stderr || result.stdout}`
        };
      }
    } finally {
      await fs.remove(tempDir);
    }
  } catch (error) {
    return {
      name: 'MCP Server Validation',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateCLI(): Promise<ValidationResult> {
  console.log(chalk.blue('🔍 Validating CLI...'));
  
  try {
    // Test CLI help command
    const helpResult = await runCommand('node', [
      path.resolve(__dirname, '../packages/dxt-workspaces/dist/index.js'),
      '--help'
    ]);

    if (helpResult.code !== 0) {
      return {
        name: 'CLI Validation',
        passed: false,
        error: `CLI help command failed: ${helpResult.stderr}`
      };
    }

    if (!helpResult.stdout.includes('Workspaces MCP Developer Experience Toolkit')) {
      return {
        name: 'CLI Validation',
        passed: false,
        error: 'CLI help output does not contain expected text'
      };
    }

    // Test CLI version command
    const versionResult = await runCommand('node', [
      path.resolve(__dirname, '../packages/dxt-workspaces/dist/index.js'),
      '--version'
    ]);

    if (versionResult.code !== 0) {
      return {
        name: 'CLI Validation',
        passed: false,
        error: `CLI version command failed: ${versionResult.stderr}`
      };
    }

    return {
      name: 'CLI Validation',
      passed: true,
      details: 'CLI help and version commands work correctly'
    };
  } catch (error) {
    return {
      name: 'CLI Validation',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateInstallation(): Promise<ValidationResult> {
  console.log(chalk.blue('🔍 Validating installation flow...'));
  
  try {
    // Create temp directory for installation test
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), 'validate-install-'));
    
    try {
      const result = await runCommand('node', [
        path.resolve(__dirname, '../packages/dxt-workspaces/dist/index.js'),
        'install',
        '--path',
        tempDir
      ], { timeout: 30000 });

      if (result.code !== 0) {
        return {
          name: 'Installation Validation',
          passed: false,
          error: `Installation failed: ${result.stderr || result.stdout}`
        };
      }

      // Check that workspace structure was created
      const sharedDir = path.join(tempDir, 'SHARED_INSTRUCTIONS');
      const globalFile = path.join(sharedDir, 'GLOBAL.md');

      if (!(await fs.pathExists(sharedDir))) {
        return {
          name: 'Installation Validation',
          passed: false,
          error: 'SHARED_INSTRUCTIONS directory not created'
        };
      }

      if (!(await fs.pathExists(globalFile))) {
        return {
          name: 'Installation Validation',
          passed: false,
          error: 'GLOBAL.md file not created'
        };
      }

      const globalContent = await fs.readFile(globalFile, 'utf8');
      if (!globalContent.includes('# Global Instructions')) {
        return {
          name: 'Installation Validation',
          passed: false,
          error: 'GLOBAL.md content is incorrect'
        };
      }

      return {
        name: 'Installation Validation',
        passed: true,
        details: 'Installation creates correct workspace structure'
      };
    } finally {
      await fs.remove(tempDir);
    }
  } catch (error) {
    return {
      name: 'Installation Validation',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function validateRelease() {
  console.log(chalk.yellow.bold('🚀 Validating Workspaces MCP Release\n'));

  const validations = [
    validateBuilds,
    validateMCPServer,
    validateCLI,
    validateInstallation
  ];

  const results: ValidationResult[] = [];

  for (const validation of validations) {
    const result = await validation();
    results.push(result);
  }

  console.log(chalk.yellow.bold('\n📊 Validation Results:\n'));

  let allPassed = true;
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED');
    console.log(`${icon} ${status}: ${result.name}`);
    
    if (result.details) {
      console.log(chalk.gray(`   ${result.details}`));
    }
    
    if (!result.passed) {
      allPassed = false;
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    }
  });

  console.log(`\n${allPassed ? '🎉' : '💥'} Overall: ${allPassed ? chalk.green('RELEASE READY') : chalk.red('VALIDATION FAILED')}`);

  if (allPassed) {
    console.log(chalk.green('\n✅ All validations passed! The release is ready for deployment.'));
    console.log(chalk.blue('\nTo create a release:'));
    console.log('  1. git tag v1.0.0');
    console.log('  2. git push origin v1.0.0');
    console.log('  3. GitHub Actions will build and publish automatically');
  } else {
    console.log(chalk.red('\n❌ Please fix the validation errors before releasing.'));
    process.exit(1);
  }
}

// Run validation
validateRelease().catch((error) => {
  console.error(chalk.red('Validation failed:'), error);
  process.exit(1);
});