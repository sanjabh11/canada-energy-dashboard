#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const reportArgs = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg === '--fail-when-empty') {
    reportArgs.push(arg);
    continue;
  }
  if (arg === '--root' || arg === '--evidence-root') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) failures.push(`${arg} requires a value.`);
    else reportArgs.push(arg, value);
    continue;
  }
  if (arg.startsWith('--root=') || arg.startsWith('--evidence-root=')) {
    reportArgs.push(arg);
    continue;
  }
  failures.push(`Unexpected argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:buyer-evidence-readiness-report

Options:
  --root <dir>           Pass a scan root through to report:buyer-evidence-readiness.
  --evidence-root <dir>  Pass retained artifact root through to report:buyer-evidence-readiness.
  --fail-when-empty      Pass through to make empty evidence inputs fail.
`);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(text, pattern, message) {
  assert(text.includes(pattern), message);
}

function runReport() {
  const result = spawnSync(process.execPath, ['scripts/report-buyer-evidence-readiness.mjs', ...reportArgs], {
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

if (failures.length === 0) {
  const report = runReport();
  if (report.status !== 0) {
    failures.push(`report-buyer-evidence-readiness exited ${report.status}.`);
    if (report.error.trim()) failures.push(report.error.trim());
    if (report.stderr.trim()) failures.push(report.stderr.trim());
    if (report.stdout.trim()) failures.push(report.stdout.trim().slice(0, 4000));
  } else {
    const stdout = report.stdout;
    assertContains(stdout, '# CEIP Buyer Evidence Readiness Report', 'Report must include the buyer evidence readiness title.');
    assertContains(stdout, 'Phase F 95% gate:', 'Report must include the Phase F gate status.');
    assertContains(stdout, '## Minimum Phase F 95% Evidence Map', 'Report must include the minimum Phase F evidence map.');
    assertContains(stdout, 'Starter intake bundle for the default minimum lane mix:', 'Report must include starter intake bundle guidance.');
    assertContains(stdout, 'All-in-one Phase F collection workspace for operators:', 'Report must include Phase F workspace guidance.');
    assertContains(stdout, '## Hard 95% Gate Deficit Ledger', 'Report must include the hard-gate deficit ledger.');
    assertContains(stdout, 'Open hard-gate deficits:', 'Report must summarize hard-gate deficit count.');
    assertContains(stdout, 'Generated scaffolding, outreach headers, and starter registers do not close any deficit.', 'Report must preserve generated-artifact no-proof boundary.');
    assertContains(stdout, '| Utility forecast lane |', 'Report must include the utility forecast hard-gate row.');
    assertContains(stdout, '| TIER or credit lane |', 'Report must include the TIER or credit hard-gate row.');
    assertContains(stdout, '| Billing or security lane |', 'Report must include the billing or security hard-gate row.');
    assertContains(stdout, '| Retained-artifact 95% validation |', 'Report must include the retained-artifact validation hard-gate row.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:buyer-evidence-readiness', 'Report must include the readiness report package handle.');
    assertContains(stdout, 'corepack pnpm run check:buyer-evidence-readiness-report', 'Report must include the readiness checker package handle.');
    assertContains(stdout, 'corepack pnpm run report:buyer-evidence-gate-readiness', 'Report must include the focused buyer gate report package handle.');
    assertContains(stdout, 'corepack pnpm run check:buyer-evidence-gate-report', 'Report must include the focused buyer gate checker package handle.');
    assertContains(stdout, 'corepack pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence', 'Report must include the all-in-one Phase F workspace package handle.');
    assertContains(stdout, 'corepack pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence', 'Report must include the Phase F workspace report package handle.');
    assertContains(stdout, 'corepack pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv', 'Report must include the updated-register workspace report package handle.');
    assertContains(stdout, 'corepack pnpm run validate:pilot-evidence -- --require-95', 'Report must include the final retained-artifact validator package handle.');
    assertContains(stdout, 'corepack pnpm run report:pilot-evidence-95', 'Report must include the 95% report package handle.');
    assertContains(stdout, 'corepack pnpm run check:phase-f-evidence-workspace', 'Report must include the Phase F workspace checker package handle.');
    assertContains(stdout, '## Next Actions', 'Report must include next actions.');
    assertContains(stdout, 'Start the all-in-one Phase F evidence workspace', 'Report must include the all-in-one workspace starting action.');
    assertContains(stdout, 'After `update:pilot-evidence-register-row` writes an updated candidate register inside the workspace', 'Report must include updated-register rerun guidance.');
    assertContains(stdout, 'Append only real, anonymized buyer activity rows', 'Report must preserve real buyer activity append guidance.');
    assert(/does not contact buyers|create accepted evidence|attach retained artifacts|move confidence|validate the 95% gate|approve production|deploy|hosted\/live parity/i.test(stdout), 'Report package handles must preserve no-contact, no-proof, no-validation, no-approval, no-deploy, and no-live-parity boundaries.');
  }
}

if (failures.length > 0) {
  console.error('Buyer evidence readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Buyer evidence readiness report check passed: readiness sections, hard-gate deficits, package handles, and no-buyer-proof boundaries are consistent.');
