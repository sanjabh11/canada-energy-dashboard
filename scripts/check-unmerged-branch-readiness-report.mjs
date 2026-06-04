#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const values = new Map();
const failures = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['repo-root', 'max-files'].includes(key)) {
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

const repoRoot = path.resolve(values.get('repo-root') ?? process.cwd());
const maxFiles = Number.parseInt(values.get('max-files') ?? '12', 10);
const reportScriptPath = new URL('./report-unmerged-branch-readiness.mjs', import.meta.url).pathname;

if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 50) {
  failures.push('--max-files must be an integer from 1 to 50.');
}

if (!existsSync(path.join(repoRoot, '.git'))) {
  failures.push(`--repo-root must point to a Git worktree: ${repoRoot}`);
}

if (failures.length > 0) {
  console.error('Unmerged branch readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:unmerged-branch-readiness-report

Options:
  --repo-root <path>     Git worktree to inspect. Defaults to cwd.
  --max-files <count>    Max changed paths shown per branch. Defaults to 12.
`);
}

function runReport(reportArgs = []) {
  const result = spawnSync(process.execPath, [reportScriptPath, ...reportArgs], {
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(label, text, expected) {
  assert(text.includes(expected), `${label} is missing required text: ${expected}`);
}

function summaryCount(report, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = report.match(new RegExp(`- ${escapedLabel}: (\\d+)`));
  assert(Boolean(match), `Default report is missing summary count: ${label}`);
  return Number.parseInt(match?.[1] ?? '0', 10) || 0;
}

function parseBranchRows(report) {
  const rows = [];
  const lines = report.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('| ')) continue;
    if (line.startsWith('| Branch |') || line.startsWith('|---')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 9) continue;
    const [branch, scope, risk, aheadBehind, categories] = cells;
    rows.push({ branch, scope, risk, aheadBehind, categories });
  }
  return rows;
}

const defaultResult = runReport(['--max-files', String(maxFiles)]);
assert(defaultResult.status === 0, `Default report exited ${defaultResult.status}; stderr=${defaultResult.stderr}; error=${defaultResult.error}`);

const report = defaultResult.stdout;
assertContains('Default report', report, '# CEIP Unmerged Branch Readiness Report');
assertContains('Default report', report, '## Decision Boundary');
assertContains('Default report', report, 'This report is read-only: it does not merge, checkout, deploy, run migrations, contact buyers, or mutate branch state.');
assertContains('Default report', report, 'High-risk unmerged branches are review queues, not launch evidence and not production approval.');
assertContains('Default report', report, 'Buyer-proven market confidence still requires the filled buyer register and retained redacted artifacts to pass the Phase F gate.');
assertContains('Default report', report, '## Summary');
assertContains('Default report', report, '## Next Review Order');

const localCount = summaryCount(report, 'Unmerged local branches');
const remoteCount = summaryCount(report, 'Unmerged origin branches');
const highCount = summaryCount(report, 'High-risk branches');
const mediumCount = summaryCount(report, 'Medium-risk branches');
const lowCount = summaryCount(report, 'Low-risk branches');
const totalCount = highCount + mediumCount + lowCount;
assert(totalCount === localCount + remoteCount, `Risk counts (${totalCount}) do not match scope counts (${localCount + remoteCount}).`);

const branchRows = parseBranchRows(report);
if (totalCount === 0) {
  assertContains('Default report', report, 'No unmerged branches were found for the selected scope.');
  assertContains('Default report', report, '- None.');
} else {
  assert(branchRows.length === totalCount, `Parsed branch rows (${branchRows.length}) do not match risk counts (${totalCount}).`);
  assertContains('Default report', report, '## Branch Inventory');
  assertContains('Default report', report, '| Branch | Scope | Risk | Ahead/Behind | Categories | Diff summary | Changed paths | Latest commit | Action |');
  assertContains('Default report', report, 'manual review before merge');
}

if (highCount > 0) {
  const failOnHigh = runReport(['--max-files', String(maxFiles), '--fail-on-high-risk']);
  assert(failOnHigh.status === 1, `--fail-on-high-risk should exit 1 when high-risk branches exist; got ${failOnHigh.status}.`);
  assertContains('High-risk failure report', failOnHigh.stdout, `- High-risk branches: ${highCount}`);
} else {
  const failOnHigh = runReport(['--max-files', String(maxFiles), '--fail-on-high-risk']);
  assert(failOnHigh.status === 0, `--fail-on-high-risk should pass when no high-risk branches exist; got ${failOnHigh.status}.`);
}

if (branchRows.length > 0) {
  const focusedCandidate = branchRows.find((row) => row.risk === 'high') ?? branchRows[0];
  const focusedResult = runReport(['--branch', focusedCandidate.branch, '--max-files', String(maxFiles)]);
  const focused = focusedResult.stdout;
  assert(focusedResult.status === 0, `Focused report for ${focusedCandidate.branch} exited ${focusedResult.status}.`);
  assertContains('Focused report', focused, `Focused branch: ${focusedCandidate.branch}`);
  assertContains('Focused report', focused, `## Focused Review Plan: ${focusedCandidate.branch}`);
  assertContains('Focused report', focused, '- Confidence boundary: this plan can make the branch reviewable, but it does not create buyer evidence or production approval.');
  assertContains('Focused report', focused, '| Area | Review focus | Suggested checks | Stop/approval gate |');
  assertContains('Focused report', focused, 'git diff --name-status');
  assertContains('Focused report', focused, 'corepack pnpm run check:production-deploy-script');
  assertContains('Focused report', focused, 'corepack pnpm run check:release-readiness');

  if (/supabase\/functions\/[^/]+\//.test(focused)) {
    assertContains('Focused report', focused, '## Changed Supabase Function Review Queue');
    assertContains('Focused report', focused, 'supabase functions serve');
    assertContains('Focused report', focused, 'No production function deploy');
  }
}

const missingBranchResult = runReport(['--branch', 'ceip-nonexistent-review-branch']);
assert(missingBranchResult.status === 1, `Missing branch focus should exit 1; got ${missingBranchResult.status}.`);
assertContains('Missing branch stderr', missingBranchResult.stderr, 'Selected branch/ref is not an unmerged branch in the selected scope: ceip-nonexistent-review-branch');

if (failures.length > 0) {
  console.error('Unmerged branch readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  [
    'Unmerged branch readiness report check passed:',
    `local=${localCount}`,
    `origin=${remoteCount}`,
    `high=${highCount}`,
    `medium=${mediumCount}`,
    `low=${lowCount}`,
    'read-only boundary, focused review plan, and high-risk failure semantics are intact.',
  ].join(' '),
);
