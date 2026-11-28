#!/usr/bin/env node
/**
 * Lint-warning ratchet gate.
 *
 * `pnpm run lint` allows warnings (legacy debt). This gate stores a measured
 * baseline in .lint-warning-baseline.json and fails if the warning count
 * REGRESSES above it — the count can only ratchet down or hold, never grow.
 * Update the baseline deliberately with `--update-baseline` after cleanup.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baselinePath = path.join(repoRoot, '.lint-warning-baseline.json');
const updateMode = process.argv.includes('--update-baseline');

let output;
try {
  output = execFileSync(
    'pnpm',
    ['exec', 'eslint', '.', '--format', 'json'],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
} catch (error) {
  // eslint exits 1 when findings include errors — the JSON is still on stdout.
  output = error.stdout?.toString() ?? '';
  if (!output.trim()) {
    console.error(`check-lint-baseline: eslint crashed: ${error.message}`);
    process.exitCode = 1;
    process.exit();
  }
}

const results = JSON.parse(output);
let errors = 0;
let warnings = 0;
for (const file of results) {
  errors += file.errorCount ?? 0;
  warnings += file.warningCount ?? 0;
}

if (updateMode) {
  const baseline = { warnings, errors, updated_at: new Date().toISOString().slice(0, 10) };
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`check-lint-baseline: baseline updated → ${warnings} warnings, ${errors} errors`);
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error('check-lint-baseline: no baseline file — run with --update-baseline once.');
  process.exitCode = 1;
  process.exit();
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
console.log(`check-lint-baseline: current ${warnings} warnings / ${errors} errors vs baseline ${baseline.warnings}/${baseline.errors}`);

if (errors > 0 || warnings > baseline.warnings || errors > baseline.errors) {
  console.error('check-lint-baseline: FAILED — lint findings regressed above baseline.');
  process.exitCode = 1;
} else {
  console.log('check-lint-baseline: passed (at or below baseline).');
}
