#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
const RELEASE_READINESS_COMMAND = 'corepack pnpm run check:release-readiness';

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['output'].includes(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run record:release-readiness-proof -- --output /tmp/ceip-release-readiness-proof.json

Options:
  --output <path>    Write the release-readiness proof JSON. Defaults to /tmp/ceip-release-readiness-proof.json.
`);
}

if (failures.length > 0) {
  console.error('Release-readiness proof recording failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 100 * 1024 * 1024,
    ...options,
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message ?? result.error) : '',
  };
}

function packageMetadata() {
  try {
    const data = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    return {
      name: data.name ?? path.basename(repoRoot),
      packageManager: data.packageManager ?? '',
    };
  } catch {
    return { name: path.basename(repoRoot), packageManager: '' };
  }
}

function gitText(commandArgs, fallback = '') {
  const result = run('git', commandArgs);
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function commandTail(text, maxChars = 12000) {
  const normalized = String(text ?? '').replace(/\r\n/g, '\n');
  return normalized.length > maxChars ? normalized.slice(-maxChars) : normalized;
}

function sourceClean() {
  const result = run('git', ['status', '--porcelain=v1']);
  return result.status === 0 && String(result.stdout ?? '').trim().length === 0;
}

const pkg = packageMetadata();
const outputPath = path.resolve(repoRoot, values.get('output') ?? path.join(tmpdir(), 'ceip-release-readiness-proof.json'));
const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();
const result = run('corepack', ['pnpm', 'run', 'check:release-readiness']);
const completedAtMs = Date.now();
const completedAt = new Date(completedAtMs).toISOString();

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) process.stderr.write(`${result.error}\n`);

const proof = {
  schema_version: 1,
  generated_by: 'scripts/record-release-readiness-proof.mjs',
  generated_at: completedAt,
  started_at: startedAt,
  command: RELEASE_READINESS_COMMAND,
  status: result.status === 0 ? 'pass' : 'blocked',
  exit_code: result.status,
  duration_ms: completedAtMs - startedAtMs,
  repo: {
    name: pkg.name,
    path: repoRoot,
    branch: gitText(['branch', '--show-current'], 'unknown'),
    commit: gitText(['rev-parse', '--short', 'HEAD'], 'unknown'),
    package_manager: pkg.packageManager,
  },
  source_clean: sourceClean(),
  corepack_pnpm_version: run('corepack', ['pnpm', '--version']).stdout.trim(),
  git_lfs_version: run('git', ['lfs', 'version']).stdout.trim(),
  stdout_tail: commandTail(result.stdout),
  stderr_tail: commandTail([result.stderr, result.error].filter(Boolean).join('\n')),
  error: result.error || null,
  proof_boundary: 'This proof records a local Corepack-pinned release-readiness command result for the current source commit only; it does not grant owner approval, deploy, push, merge, contact buyers, access Supabase, or prove hosted/live parity.',
  stop_gate: 'Do not treat this proof as current if the source commit, packageManager pin, current worktree cleanliness, or release shell changes; rerun the recorder before production approval review.',
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`);

console.log(`Release-readiness proof written: ${outputPath}`);
process.exit(result.status);
