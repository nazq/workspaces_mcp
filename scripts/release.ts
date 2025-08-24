#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const platforms = [
  { platform: 'linux', arch: 'x64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
];

const createArchive = async (
  sourceDir: string,
  targetFile: string,
  isWindows = false
) => {
  if (isWindows) {
    execSync(
      `cd "${sourceDir}" && zip -r "../${path.basename(targetFile)}" .`,
      {
        shell: true,
        stdio: 'inherit',
      }
    );
  } else {
    execSync(`tar -czf "${targetFile}" -C "${sourceDir}" .`, {
      stdio: 'inherit',
    });
  }
};

const main = async () => {
  console.log('📦 Creating platform-specific release packages...\n');

  await fs.mkdir('dist', { recursive: true });

  for (const { platform, arch } of platforms) {
    const outputDir = path.join('dist', `dxt-workspaces-${platform}-${arch}`);
    const isWindows = platform === 'win32';
    const executable = `dxt-workspaces${isWindows ? '.exe' : ''}`;

    console.log(`🔨 Creating package for ${platform}-${arch}...`);

    await fs.mkdir(outputDir, { recursive: true });

    await fs.cp('packages/dxt-workspaces/dist', path.join(outputDir, 'dist'), {
      recursive: true,
    });

    const packageJson = {
      name: 'dxt-workspaces',
      version: '1.0.0',
      bin: {
        'dxt-workspaces': `./dist/index.js`,
      },
    };

    await fs.writeFile(
      path.join(outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const archiveName = `dxt-workspaces-${platform}-${arch}.${isWindows ? 'zip' : 'tar.gz'}`;
    const archivePath = path.join('dist', archiveName);

    await createArchive(outputDir, archivePath, isWindows);

    await fs.rm(outputDir, { recursive: true });

    console.log(`✅ Created ${archiveName}`);
  }

  console.log('\n🎉 All release packages created successfully!');
};

main().catch((error) => {
  console.error('❌ Release failed:', error);
  process.exit(1);
});
