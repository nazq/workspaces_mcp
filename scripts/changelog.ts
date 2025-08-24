#!/usr/bin/env tsx
/**
 * Changelog Management Script
 *
 * Usage:
 *   npm run changelog add "Added new feature"
 *   npm run changelog release 1.2.3
 *   npm run changelog beta
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');

interface ChangelogEntry {
  type: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
  description: string;
}

class ChangelogManager {
  private changelog: string;

  constructor() {
    this.changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  }

  /**
   * Add a new entry to the Unreleased section
   */
  addEntry(type: ChangelogEntry['type'], description: string): void {
    console.log(`📝 Adding ${type.toLowerCase()} entry: ${description}`);

    const unreleasedSection = /## \[Unreleased\](.*?)(?=## \[|$)/s;
    const match = this.changelog.match(unreleasedSection);

    if (!match) {
      throw new Error('Could not find [Unreleased] section in changelog');
    }

    let unreleasedContent = match[1];
    const typeSection = new RegExp(`### ${type}([^#]*?)(?=### |$)`, 's');
    const typeMatch = unreleasedContent.match(typeSection);

    if (typeMatch) {
      // Add to existing section
      const existingEntries = typeMatch[1];
      const newEntry = `- ${description}\n`;
      const updatedSection = `### ${type}${existingEntries.trimEnd()}\n${newEntry}`;
      unreleasedContent = unreleasedContent.replace(
        typeSection,
        updatedSection
      );
    } else {
      // Create new section
      const newSection = `\n### ${type}\n- ${description}\n`;
      unreleasedContent = unreleasedContent.trimEnd() + newSection + '\n';
    }

    this.changelog = this.changelog.replace(
      unreleasedSection,
      `## [Unreleased]${unreleasedContent}`
    );
    this.save();
  }

  /**
   * Create a new release from Unreleased section
   */
  createRelease(version: string): void {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🚀 Creating release ${version} (${today})`);

    // Extract unreleased content
    const unreleasedSection = /## \[Unreleased\](.*?)(?=## \[|$)/s;
    const match = this.changelog.match(unreleasedSection);

    if (!match) {
      throw new Error('Could not find [Unreleased] section');
    }

    const unreleasedContent = match[1].trim();
    if (!unreleasedContent || unreleasedContent.length < 10) {
      throw new Error('Unreleased section is empty - add some changes first!');
    }

    // Create new release section
    const releaseSection = `## [${version}] - ${today}\n\n${unreleasedContent}\n\n`;

    // Reset unreleased section
    const newUnreleased = `## [Unreleased]\n\n### Added\n### Changed\n### Fixed\n\n`;

    // Replace in changelog
    this.changelog = this.changelog.replace(
      unreleasedSection,
      newUnreleased + releaseSection
    );

    this.save();
    console.log(`✅ Release ${version} created in changelog`);
  }

  /**
   * Generate beta changelog from git history
   */
  generateBetaChangelog(): string {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '')
      .slice(0, 15);
    const betaVersion = `1.0.0-beta.${timestamp}`;

    return `## [${betaVersion}] - ${today}

**Beta Release - Latest Development Build**

### Changes since last release:
- Latest development changes from main branch
- Automated beta build for testing purposes
- See git commit history for detailed changes

⚠️ **This is a beta release** - use for testing purposes only.

`;
  }

  /**
   * Validate changelog format
   */
  validate(): boolean {
    console.log('✅ Validating changelog format...');

    const requiredSections = [
      '# Changelog',
      '## [Unreleased]',
      'The format is based on [Keep a Changelog]',
    ];

    for (const section of requiredSections) {
      if (!this.changelog.includes(section)) {
        console.error(`❌ Missing required section: ${section}`);
        return false;
      }
    }

    // Check for proper version format
    const versions = this.changelog.match(/## \[(\d+\.\d+\.\d+)\]/g);
    if (versions) {
      for (const version of versions) {
        const versionNumber = version.match(/\[(\d+\.\d+\.\d+)\]/)?.[1];
        if (versionNumber && !versionNumber.match(/^\d+\.\d+\.\d+$/)) {
          console.error(`❌ Invalid version format: ${versionNumber}`);
          return false;
        }
      }
    }

    console.log('✅ Changelog format is valid');
    return true;
  }

  /**
   * Get the content for a specific version
   */
  getVersionContent(version: string): string {
    const versionSection = new RegExp(
      `## \\[${version}\\](.*?)(?=## \\[|$)`,
      's'
    );
    const match = this.changelog.match(versionSection);
    return match ? match[1].trim() : '';
  }

  private save(): void {
    fs.writeFileSync(CHANGELOG_PATH, this.changelog);
    console.log('💾 Changelog saved');
  }
}

// CLI Program
const program = new Command();
const changelog = new ChangelogManager();

program
  .name('changelog')
  .description('Manage project changelog')
  .version('1.0.0');

program
  .command('add')
  .description('Add an entry to the unreleased section')
  .argument('<type>', 'Entry type: Added, Changed, Fixed, etc.')
  .argument('<description>', 'Description of the change')
  .action((type: string, description: string) => {
    const validTypes = [
      'Added',
      'Changed',
      'Deprecated',
      'Removed',
      'Fixed',
      'Security',
    ];
    const normalizedType =
      type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    if (!validTypes.includes(normalizedType as any)) {
      console.error(
        `❌ Invalid type: ${type}. Valid types: ${validTypes.join(', ')}`
      );
      process.exit(1);
    }

    changelog.addEntry(normalizedType as ChangelogEntry['type'], description);
  });

program
  .command('release')
  .description('Create a new release from unreleased changes')
  .argument('<version>', 'Release version (e.g., 1.2.3)')
  .action((version: string) => {
    if (!version.match(/^\d+\.\d+\.\d+$/)) {
      console.error('❌ Invalid version format. Expected: X.Y.Z (e.g., 1.2.3)');
      process.exit(1);
    }

    changelog.createRelease(version);
  });

program
  .command('beta')
  .description('Generate beta changelog content')
  .action(() => {
    console.log(changelog.generateBetaChangelog());
  });

program
  .command('validate')
  .description('Validate changelog format')
  .action(() => {
    const isValid = changelog.validate();
    process.exit(isValid ? 0 : 1);
  });

program
  .command('get')
  .description('Get changelog content for a specific version')
  .argument('<version>', 'Version to get (e.g., 1.2.3)')
  .action((version: string) => {
    const content = changelog.getVersionContent(version);
    if (content) {
      console.log(content);
    } else {
      console.error(`❌ Version ${version} not found in changelog`);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
