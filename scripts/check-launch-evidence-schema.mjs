#!/usr/bin/env node

import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = process.env.LAUNCH_EVIDENCE_VALIDATOR || path.join(repoRoot, 'scripts/validate_launch_evidence.py');
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unexpected argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:launch-evidence-schema

Options:
  --skip-probes    Generate the launch evidence manifest without local readiness probes before schema validation.
`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-schema-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`report-launch-evidence-manifest exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim().slice(0, 4000));
    } else {
      try {
        JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        failures.push(`Generated manifest is not valid JSON: ${error.message}`);
      }
    }
  }

  if (failures.length === 0) {
    if (!existsSync(validatorPath)) {
      failures.push('Launch evidence schema validation skipped: validator not found at ' + validatorPath + '. Set LAUNCH_EVIDENCE_VALIDATOR env var.');
    } else {
    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    if (validation.status !== 0) {
      failures.push(`validate_launch_evidence.py exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validation.stderr.trim()) failures.push(validation.stderr.trim());
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    } else if (!validation.stdout.includes('VALID')) {
      failures.push('validate_launch_evidence.py did not report VALID.');
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    }
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Launch evidence schema check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch evidence schema check passed: validate_launch_evidence.py reported VALID for the generated manifest; this proves schema shape only and does not clear buyer, source, release, branch, Supabase, approval, deploy, live-proof, or commercial-readiness gates.');
