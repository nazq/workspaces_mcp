#!/usr/bin/env tsx
// Performance Analysis Script - Run each test file multiple times and analyze timing
// Identifies slow tests and performance bottlenecks

import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface TestResult {
  file: string;
  runs: number[];
  avgTime: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
}

// Find all test files recursively
function findTestFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', 'dist', 'coverage'].includes(entry)) {
        files.push(...findTestFiles(fullPath, baseDir));
      }
    } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.js')) {
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

// Run a single test file and return execution time
async function runSingleTest(testFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const child = spawn('npm', ['test', testFile, '--', '--run'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
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
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (code === 0) {
        resolve(duration);
      } else {
        console.error(`❌ Test failed: ${testFile}`);
        console.error(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Calculate standard deviation
function calculateStdDev(values: number[], mean: number): number {
  const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Run performance analysis
async function analyzeTestPerformance() {
  console.log('🔍 Analyzing test performance...\n');

  const baseDir = process.cwd();
  const testFiles = findTestFiles(baseDir, baseDir);

  console.log(`Found ${testFiles.length} test files to analyze\n`);

  const results: TestResult[] = [];
  const runsPerTest = 10;

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    console.log(`📊 Running ${testFile} (${i + 1}/${testFiles.length})`);

    const runs: number[] = [];

    for (let run = 1; run <= runsPerTest; run++) {
      try {
        process.stdout.write(`  Run ${run}/${runsPerTest}... `);
        const duration = await runSingleTest(testFile);
        runs.push(duration);
        console.log(`${duration}ms`);
      } catch (error) {
        console.log(`❌ FAILED`);
        console.error(`Error in run ${run}:`, error);
        break; // Skip remaining runs for this file if it fails
      }
    }

    if (runs.length > 0) {
      const avgTime = runs.reduce((a, b) => a + b, 0) / runs.length;
      const minTime = Math.min(...runs);
      const maxTime = Math.max(...runs);
      const stdDev = calculateStdDev(runs, avgTime);

      results.push({
        file: testFile,
        runs,
        avgTime,
        minTime,
        maxTime,
        stdDev,
      });

      console.log(
        `  ✅ Avg: ${Math.round(avgTime)}ms, Min: ${minTime}ms, Max: ${maxTime}ms, StdDev: ${Math.round(stdDev)}ms\n`
      );
    }
  }

  // Sort by average time (slowest first)
  results.sort((a, b) => b.avgTime - a.avgTime);

  console.log('\n🚀 PERFORMANCE ANALYSIS RESULTS\n');
  console.log('='.repeat(80));

  console.log('\n📈 TOP 10 SLOWEST TESTS:');
  console.log('-'.repeat(80));
  console.log(
    'Rank | File                                    | Avg Time | Min-Max   | StdDev'
  );
  console.log('-'.repeat(80));

  for (let i = 0; i < Math.min(10, results.length); i++) {
    const result = results[i];
    const rank = (i + 1).toString().padStart(4);
    const file = result.file.padEnd(40);
    const avgTime = `${Math.round(result.avgTime)}ms`.padStart(8);
    const range = `${result.minTime}-${result.maxTime}ms`.padStart(9);
    const stdDev = `${Math.round(result.stdDev)}ms`.padStart(6);

    console.log(`${rank} | ${file} | ${avgTime} | ${range} | ${stdDev}`);
  }

  console.log('\n⚡ PERFORMANCE CATEGORIES:');
  console.log('-'.repeat(50));

  const verySlow = results.filter((r) => r.avgTime > 5000); // > 5 seconds
  const slow = results.filter((r) => r.avgTime > 1000 && r.avgTime <= 5000); // 1-5 seconds
  const moderate = results.filter((r) => r.avgTime > 100 && r.avgTime <= 1000); // 100ms-1s
  const fast = results.filter((r) => r.avgTime <= 100); // <= 100ms

  console.log(`🐌 Very Slow (>5s):     ${verySlow.length} files`);
  console.log(`🐢 Slow (1-5s):         ${slow.length} files`);
  console.log(`🚶 Moderate (100ms-1s): ${moderate.length} files`);
  console.log(`⚡ Fast (<=100ms):      ${fast.length} files`);

  if (verySlow.length > 0) {
    console.log('\n🚨 VERY SLOW TESTS (>5s avg):');
    console.log('-'.repeat(50));
    verySlow.forEach((result) => {
      console.log(`  ${result.file}: ${Math.round(result.avgTime)}ms avg`);
    });
  }

  if (slow.length > 0) {
    console.log('\n🔍 SLOW TESTS (1-5s avg):');
    console.log('-'.repeat(50));
    slow.forEach((result) => {
      console.log(`  ${result.file}: ${Math.round(result.avgTime)}ms avg`);
    });
  }

  // Identify tests with high variance (inconsistent performance)
  const highVariance = results.filter((r) => r.stdDev > r.avgTime * 0.3); // StdDev > 30% of avg

  if (highVariance.length > 0) {
    console.log('\n📊 HIGH VARIANCE TESTS (inconsistent performance):');
    console.log('-'.repeat(60));
    highVariance.forEach((result) => {
      const variancePercent = Math.round(
        (result.stdDev / result.avgTime) * 100
      );
      console.log(
        `  ${result.file}: ${variancePercent}% variance (${Math.round(result.stdDev)}ms stddev)`
      );
    });
  }

  const totalTime = results.reduce((sum, r) => sum + r.avgTime, 0);
  console.log(
    `\n⏱️  TOTAL AVERAGE TEST TIME: ${Math.round(totalTime)}ms (${Math.round(totalTime / 1000)}s)`
  );

  console.log(
    '\n✨ Analysis complete! Focus on optimizing the slowest tests first.'
  );
}

// Run the analysis
analyzeTestPerformance().catch(console.error);
