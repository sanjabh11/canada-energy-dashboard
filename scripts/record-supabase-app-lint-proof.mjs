#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
const SUPABASE_APP_LINT_COMMAND = 'corepack pnpm run check:supabase-app-lint';

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
  corepack pnpm run record:supabase-app-lint-proof -- --output /tmp/ceip-supabase-app-lint-proof.json

Options:
  --output <path>    Write the Supabase app-lint proof JSON. Defaults to /tmp/ceip-supabase-app-lint-proof.json.
`);
}

if (failures.length > 0) {
  console.error('Supabase app-lint proof recording failed:\n');
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
    maxBuffer: 30 * 1024 * 1024,
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

function parseIntegerMatch(text, pattern) {
  const match = String(text ?? '').match(pattern);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseClassification(stdout) {
  const text = String(stdout ?? '');
  const extensionMatch = text.match(/Extension-owned rows:\s*(\d+)\s*\((\d+)\s+issues\)/i);
  const appMatch = text.match(/App-owned rows:\s*(\d+)\s*\((\d+)\s+issues\)/i);
  const functionsMatch = text.match(/Extension-owned functions:\s*([^\n]+)/i);
  return {
    total_lint_rows: parseIntegerMatch(text, /Total lint rows:\s*(\d+)/i),
    extension_owned_rows: extensionMatch ? Number.parseInt(extensionMatch[1], 10) : null,
    extension_owned_issues: extensionMatch ? Number.parseInt(extensionMatch[2], 10) : null,
    app_owned_rows: appMatch ? Number.parseInt(appMatch[1], 10) : null,
    app_owned_issues: appMatch ? Number.parseInt(appMatch[2], 10) : null,
    extension_owned_functions: functionsMatch
      ? functionsMatch[1].split(',').map((name) => name.trim()).filter(Boolean).sort()
      : [],
  };
}

const pkg = packageMetadata();
const outputPath = path.resolve(repoRoot, values.get('output') ?? path.join(tmpdir(), 'ceip-supabase-app-lint-proof.json'));
const startedAtMs = Date.now();
const startedAt = new Date(startedAtMs).toISOString();
const result = run('corepack', ['pnpm', 'run', 'check:supabase-app-lint']);
const completedAtMs = Date.now();
const completedAt = new Date(completedAtMs).toISOString();
const classification = parseClassification(result.stdout);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) process.stderr.write(`${result.error}\n`);

const proof = {
  schema_version: 1,
  generated_by: 'scripts/record-supabase-app-lint-proof.mjs',
  generated_at: completedAt,
  started_at: startedAt,
  command: SUPABASE_APP_LINT_COMMAND,
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
  total_lint_rows: classification.total_lint_rows,
  extension_owned_rows: classification.extension_owned_rows,
  extension_owned_issues: classification.extension_owned_issues,
  app_owned_rows: classification.app_owned_rows,
  app_owned_issues: classification.app_owned_issues,
  extension_owned_functions: classification.extension_owned_functions,
  classification,
  stdout_tail: commandTail(result.stdout),
  stderr_tail: commandTail([result.stderr, result.error].filter(Boolean).join('\n')),
  error: result.error || null,
  proof_boundary: 'This proof records a local Supabase app-owned lint classification for the current source commit only; it does not authorize Supabase connectors, access the dashboard, rerun Security Advisor or Performance Advisor, clear advisor findings, run migrations, alter secrets, grant production approval, deploy, or prove hosted/live parity.',
  stop_gate: 'Do not treat this proof as current if the source commit, packageManager pin, current worktree cleanliness, Supabase linked project, or lint command output changes; rerun the recorder before Supabase advisor or production approval review.',
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`);

console.log(`Supabase app-lint proof written: ${outputPath}`);
process.exit(result.status);
