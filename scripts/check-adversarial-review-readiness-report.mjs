#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
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
  corepack pnpm run check:adversarial-review-report

Options:
  --skip-probes    Validate the focused adversarial review report without running local Corepack, Git LFS, branch, or buyer probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-adversarial-review-readiness.mjs', ...extraArgs];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = spawnSync(process.execPath, commandArgs, {
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

function assertContains(text, pattern, message) {
  assert(text.includes(pattern), message);
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-adversarial-review-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-adversarial-review-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused adversarial review JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Adversarial Review Readiness Report', 'Report must include the focused adversarial review title.');
    assertContains(stdout, 'Adversarial review readiness status:', 'Report must include adversarial review status.');
    assertContains(stdout, 'Adversarial review proof type:', 'Report must include the adversarial review proof type.');
    assertContains(stdout, 'Claim-refutation lane count:', 'Report must include claim-refutation lane counts.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'Focused adversarial review evidence only', 'Report must classify itself as focused adversarial evidence only.');
    assert(/does not prove production approval|create buyer evidence|contact buyers|prove buyer acceptance|run release-readiness as clearance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|clear launch blockers|commercial launch readiness/i.test(stdout), 'Report must preserve no-approval, no-buyer-proof, no-release-clearance, no-Supabase-clearance, no-branch-approval, no-deploy, no-live-parity, and no-readiness boundaries.');
    assertContains(stdout, '## Adversarial Review Summary', 'Report must include the adversarial review summary.');
    assertContains(stdout, 'adversarial_review_ledger', 'Report must include the adversarial review ledger proof type.');
    assertContains(stdout, '## Claim-Refutation Lanes', 'Report must include claim-refutation lane rows.');
    for (const lane of [
      'buyer evidence',
      'production approval',
      'release toolchain',
      'Supabase advisor clearance',
      'branch risk',
    ]) {
      assertContains(stdout, lane, `Report must include the ${lane} adversarial lane.`);
    }
    assertContains(stdout, 'buyer_evidence_adversarial_review', 'Report must include buyer evidence adversarial proof type.');
    assertContains(stdout, 'production_approval_adversarial_review', 'Report must include production approval adversarial proof type.');
    assertContains(stdout, 'release_toolchain_adversarial_review', 'Report must include release toolchain adversarial proof type.');
    assertContains(stdout, 'external_advisor_adversarial_review', 'Report must include external advisor adversarial proof type.');
    assertContains(stdout, 'branch_risk_adversarial_review', 'Report must include branch risk adversarial proof type.');
    assertContains(stdout, '## Public Release Status Handle', 'Report must include the public status handle.');
    assertContains(stdout, 'adversarial_review_ledger', 'Report must expose the public adversarial review ledger handle.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:adversarial-review-readiness', 'Report must include the focused adversarial report command.');
    assertContains(stdout, 'corepack pnpm run check:adversarial-review-report', 'Report must include the focused adversarial checker command.');
  }

  if (payload) {
    const ledger = payload.adversarial_review_ledger ?? {};
    assert(payload.schema_version === 1, 'Focused adversarial review JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused adversarial review JSON must preserve the blocked launch decision.');
    assert(ledger.status === 'blocked', 'Focused adversarial review status must remain blocked while launch blockers remain open.');
    assert(ledger.proof_type === 'adversarial_review_ledger', 'Focused JSON must include the adversarial review ledger proof type.');
    assert(ledger.review_count >= 5, 'Focused adversarial review must include the core claim-refutation lanes.');
    assert(ledger.missing_core_lane_count === 0, 'Focused adversarial review must include every core lane.');
    assert(Array.isArray(payload.adversarial_reviews) && payload.adversarial_reviews.length >= 5, 'Focused JSON must include adversarial review rows.');
    const lanes = new Set(payload.adversarial_reviews.map((item) => item.lane));
    for (const lane of [
      'buyer evidence',
      'production approval',
      'release toolchain',
      'Supabase advisor clearance',
      'branch risk',
    ]) {
      assert(lanes.has(lane), `Focused JSON must include adversarial lane: ${lane}.`);
    }
    assert(payload.public_status_handle?.id === 'adversarial_review_ledger', 'Focused JSON must include the public adversarial review ledger handle.');
    assert(/report:adversarial-review-readiness/.test(payload.package_script_handles?.report_adversarial_review_readiness ?? ''), 'Focused JSON must expose the adversarial review report script handle.');
    assert(/check:adversarial-review-report/.test(payload.package_script_handles?.check_adversarial_review_report ?? ''), 'Focused JSON must expose the adversarial review checker script handle.');
    assert(/does not prove production approval|create buyer evidence|contact buyers|prove buyer acceptance|run release-readiness as clearance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|clear launch blockers|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must preserve no-approval, no-buyer-proof, no-release-clearance, no-Supabase-clearance, no-branch-approval, no-deploy, no-live-parity, and no-readiness semantics.');
    assert(/Do not treat this focused adversarial review report|production approval|buyer acceptance|release readiness|source readiness|branch approval|Supabase advisor clearance|deployment approval|hosted\/live parity|commercial-ready status|launch-goal completion/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject approval, buyer, release, source, branch, Supabase, deploy, live-parity, ready, and completion claims.');
  }
}

if (failures.length > 0) {
  console.error('Adversarial review readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Adversarial review readiness report check passed: claim-refutation lanes, public handle, package handles, and no-readiness boundaries are consistent.');
