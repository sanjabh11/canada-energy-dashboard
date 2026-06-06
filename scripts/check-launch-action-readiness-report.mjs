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
  corepack pnpm run check:launch-action-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack, Git LFS, branch, or buyer probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-launch-action-readiness.mjs', ...extraArgs];
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
    failures.push(`report-launch-action-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-launch-action-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused launch action JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Launch Action Readiness Report', 'Report must include the focused launch action title.');
    assertContains(stdout, 'Launch action queue status:', 'Report must include launch action queue status.');
    assertContains(stdout, 'Open action rows:', 'Report must include open action row count.');
    assertContains(stdout, 'First open action:', 'Report must include first open action.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not commit, unstage, stash, revert, clear source provenance', 'Report must preserve no-source-mutation boundaries.');
    assert(/contact buyers[\s\S]*authorize Supabase[\s\S]*request owner approval[\s\S]*deploy/i.test(stdout), 'Report must preserve no-external-action and no-deploy boundaries.');
    assertContains(stdout, '## Launch Blocker Action Queue', 'Report must include the launch blocker action queue.');
    for (const phase of [
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]) {
      assertContains(stdout, `| ${phase} |`, `Report must include launch action phase ${phase}.`);
    }
    assertContains(stdout, '## Lane Status Summary', 'Report must include the lane status summary.');
    assertContains(stdout, 'corepack pnpm run report:source-provenance-readiness', 'Report must include the source provenance focused command.');
    assertContains(stdout, 'corepack pnpm run report:launch-evidence-validation-readiness', 'Report must include the launch evidence validation focused command.');
    assertContains(stdout, 'corepack pnpm run check:launch-evidence-validation-report', 'Report must include the launch evidence validation checker command.');
    assertContains(stdout, 'corepack pnpm run report:production-approval-readiness', 'Report must include the production approval focused command.');
    assertContains(stdout, 'corepack pnpm run report:post-deploy-live-proof-readiness', 'Report must include the post-deploy focused command.');
  }

  if (payload) {
    const queue = payload.launch_action_queue ?? {};
    const items = queue.items ?? [];
    const phases = items.map((item) => item.phase);
    const rowsByPhase = new Map(items.map((item) => [item.phase, item]));
    const laneRows = payload.lane_status_summary ?? [];
    const lanes = laneRows.map((item) => item.lane);
    const lanesByName = new Map(laneRows.map((item) => [item.lane, item]));
    const buyerLane = lanesByName.get('buyer_evidence');

    assert(payload.schema_version === 1, 'Focused launch action JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused launch action JSON must preserve the blocked launch decision.');
    assert(queue.status === 'blocked', 'Launch action queue must remain blocked before current gates clear.');
    assert(queue.item_count === 8, 'Launch action queue must include eight execution phases.');
    assert(queue.blocked_count >= 1, 'Launch action queue must keep open blocker rows visible.');
    assert(phases.join(',') === 'source_provenance,launch_evidence_validation,release_toolchain,branch_review,supabase_advisor,buyer_evidence,production_approval,post_deploy_live_proof', 'Launch action phase order must remain stable.');
    assert(payload.first_open_action?.phase === 'source_provenance' || payload.first_open_action?.status !== 'ready', 'Focused JSON must include the first open action.');
    assert(rowsByPhase.get('source_provenance')?.proof_type === 'source_provenance_decision', 'Source provenance row must keep source provenance proof type.');
    assert(/report:source-provenance-readiness/.test(rowsByPhase.get('source_provenance')?.proof_command ?? '') && /check:source-provenance-report/.test(rowsByPhase.get('source_provenance')?.proof_command ?? ''), 'Source provenance row must point to the focused source provenance report/check.');
    assert(rowsByPhase.get('launch_evidence_validation')?.status === 'ready', 'Launch evidence validation row must be ready after focused validation evidence is externalized.');
    assert(rowsByPhase.get('release_toolchain')?.proof_type === 'release_toolchain_and_gated_release', 'Release toolchain row must keep release proof type.');
    assert(rowsByPhase.get('branch_review')?.proof_type === 'read_only_branch_review', 'Branch review row must keep read-only proof type.');
    assert(rowsByPhase.get('supabase_advisor')?.proof_type === 'external_account_evidence', 'Supabase row must keep external account proof type.');
    assert(rowsByPhase.get('buyer_evidence')?.proof_type === 'retained_buyer_evidence_validation', 'Buyer row must keep retained evidence proof type.');
    assert(rowsByPhase.get('production_approval')?.proof_type === 'manual_approval_gate', 'Production approval row must keep manual approval proof type.');
    assert(rowsByPhase.get('post_deploy_live_proof')?.proof_type === 'post_deploy_live_proof_gate', 'Post-deploy row must keep post-deploy proof type.');
    assert(lanes.includes('source_provenance') && lanes.includes('post_deploy_live_proof'), 'Lane status summary must include source and post-deploy lanes.');
    assert(buyerLane?.status === 'blocked', 'Buyer evidence lane summary must remain blocked while hard-gate or acquisition evidence is skipped/open/non-ready.');
    assert(/open_hard_gate_rows=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose hard-gate open row count.');
    assert(/hard_gate_status=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose hard-gate status.');
    assert(/acquisition_status=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose acquisition matrix status.');
    assert(payload.package_script_handles?.check_launch_action_report === 'corepack pnpm run check:launch-action-report', 'Focused report must expose the launch action checker command handle.');
    assert(payload.package_script_handles?.check_launch_evidence_validation_report === 'corepack pnpm run check:launch-evidence-validation-report', 'Focused report must expose the launch evidence validation checker command handle.');
    assert(/does not commit|clear source provenance|checkout branches|merge|push|contact buyers|authorize Supabase|request owner approval|deploy|hosted\/live parity|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must not imply mutation, external action, deploy, live parity, or launch readiness.');
    assert(/Do not treat this focused report|clean source provenance|production approval|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Launch action readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch action readiness report check passed: focused action queue, lane status summary, command handles, and no-execution boundaries are consistent.');
