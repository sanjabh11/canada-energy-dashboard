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
  corepack pnpm run check:branch-review-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack, Git LFS, buyer, branch, or Supabase probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-branch-review-readiness.mjs', ...extraArgs];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 60 * 1024 * 1024,
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

function hasIntegerOrNull(value) {
  return value === null || Number.isInteger(value);
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-branch-review-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-branch-review-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused branch review JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Branch Review Readiness Report', 'Report must include the focused branch review title.');
    assertContains(stdout, 'Branch review status:', 'Report must include branch review status.');
    assertContains(stdout, 'Review-first branch families:', 'Report must include review-first queue status.');
    assertContains(stdout, 'Canonical-head decisions open:', 'Report must include canonical-head open count.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not checkout, merge, push, discard, delete, select canonical heads', 'Report must preserve branch no-mutation boundaries.');
    assertContains(stdout, 'run migrations, mutate Supabase, deploy', 'Report must preserve migration/Supabase/deploy boundaries.');
    assertContains(stdout, '## Branch Review Queue', 'Report must include the branch review queue.');
    assertContains(stdout, '## Canonical Head Decisions', 'Report must include canonical-head decisions.');
    assertContains(stdout, '## Canonical Head Resolution Queue', 'Report must include canonical-head resolution queue.');
    assertContains(stdout, '## Branch Clearance Matrix', 'Report must include the branch clearance matrix.');
    assertContains(stdout, '## Review-First Branch Packets', 'Report must include review-first branch packets.');
    assertContains(stdout, '## Top Branch Review Packet', 'Report must include the top branch review packet.');
    assertContains(stdout, '## Canonical Head Comparison', 'Report must include canonical-head comparison.');
    assertContains(stdout, '## Launch Action Branch Row', 'Report must include the launch action branch row.');
    assertContains(stdout, '## Production Approval Branch Prerequisite', 'Report must include the production approval branch prerequisite.');
    assertContains(stdout, '## Production Approval Request Branch Row', 'Report must include the production approval request branch row.');
    assert(/does not[ \s\S]{0,240}(grant production approval|prove hosted\/live parity)/i.test(stdout), 'Report must preserve no-approval and no-live-proof language.');
  }

  if (payload) {
    const branch = payload.branch_review ?? {};
    const reviewQueue = branch.review_queue ?? {};
    const canonical = branch.canonical_head_decisions ?? {};
    const resolutionQueue = branch.canonical_head_resolution_queue ?? {};
    const clearanceMatrix = branch.clearance_matrix ?? {};
    const packetSet = branch.review_first_packets ?? {};
    const topPacket = branch.top_review_packet ?? {};

    assert(payload.schema_version === 1, 'Focused branch review JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused branch review JSON must preserve the blocked launch decision.');
    assert(typeof branch.status === 'string' && branch.status.length > 0, 'branch_review.status must be set.');
    assert(typeof branch.probe_status === 'string' && branch.probe_status.length > 0, 'branch_review.probe_status must be set.');
    assert(['pass', 'blocked', 'skipped'].includes(branch.status), 'branch_review.status must be pass, blocked, or skipped.');
    assert(typeof branch.evidence_boundary === 'string' && /does not clear review-first branch families/i.test(branch.evidence_boundary), 'branch_review.evidence_boundary must preserve the no-clearance boundary.');
    assert(hasIntegerOrNull(branch.risk_counts?.high), 'branch_review.risk_counts.high must be integer or null.');
    assert(hasIntegerOrNull(branch.family_counts?.local_only), 'branch_review.family_counts.local_only must be integer or null.');
    assert(hasIntegerOrNull(branch.freshness_counts?.stale), 'branch_review.freshness_counts.stale must be integer or null.');
    assert(typeof reviewQueue.status === 'string' && reviewQueue.status.length > 0, 'review_queue.status must be set.');
    assert(Array.isArray(reviewQueue.items), 'review_queue.items must be a list.');
    assert(hasIntegerOrNull(reviewQueue.review_first_count), 'review_queue.review_first_count must be integer or null.');
    assert(reviewQueue.blocked_count === reviewQueue.review_first_count, 'review_queue.blocked_count must match review_first_count.');
    assert(typeof canonical.status === 'string' && canonical.status.length > 0, 'canonical_head_decisions.status must be set.');
    assert(Array.isArray(canonical.items), 'canonical_head_decisions.items must be a list.');
    assert(hasIntegerOrNull(canonical.open_count), 'canonical_head_decisions.open_count must be integer or null.');
    assert(resolutionQueue.proof_type === 'canonical_head_resolution_queue', 'Focused JSON must include canonical-head resolution queue.');
    assert(Array.isArray(resolutionQueue.items), 'canonical_head_resolution_queue.items must be a list.');
    assert(clearanceMatrix.proof_type === 'read_only_branch_clearance_matrix', 'Focused JSON must include the branch clearance matrix.');
    assert(Array.isArray(clearanceMatrix.rows), 'clearance_matrix.rows must be a list.');
    assert(Array.isArray(packetSet.packets), 'review_first_packets.packets must be a list.');
    assert(topPacket && typeof topPacket === 'object', 'top_review_packet must be an object.');
    assert(payload.launch_action_branch_row?.phase === 'branch_review', 'Focused JSON must include the launch action branch row.');
    assert(payload.production_approval_branch_prerequisite?.prerequisite === 'Canonical branch review', 'Focused JSON must include the production approval branch prerequisite.');
    assert(payload.production_approval_request_branch_row?.prerequisite === 'Canonical branch review', 'Focused JSON must include the production approval request branch row.');
    assert(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|deploy|grant production approval/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve branch non-mutation and no-approval semantics.');
    assert(/Do not treat this focused report|branch approval|canonical-head owner selection|merge approval|release readiness|production approval|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject clearance claims from this report itself.');

    if (branch.status !== 'skipped') {
      assert(Number.isInteger(reviewQueue.item_count), 'review_queue.item_count must be an integer when branch probes run.');
      assert(reviewQueue.item_count === reviewQueue.items.length, 'review_queue.item_count must match item count when branch probes run.');
      assert(Number.isInteger(clearanceMatrix.family_count), 'clearance_matrix.family_count must be an integer when branch probes run.');
      assert(clearanceMatrix.family_count === clearanceMatrix.rows.length, 'clearance_matrix.family_count must match rows when branch probes run.');
      assert(typeof topPacket.proof_boundary === 'string' && /read-only branch evidence|does not checkout|merge|push/i.test(topPacket.proof_boundary), 'top_review_packet.proof_boundary must preserve read-only branch semantics.');
    }

    for (const [index, item] of (reviewQueue.items ?? []).entries()) {
      assert(item.read_only === true, `review_queue.items[${index}].read_only must be true.`);
      assert(typeof item.review_command === 'string' && item.review_command.includes('report:unmerged-branch-readiness'), `review_queue.items[${index}].review_command must point at the read-only branch report.`);
      assert(typeof item.proof_boundary === 'string' && /does not checkout|merge|push/i.test(item.proof_boundary), `review_queue.items[${index}].proof_boundary must preserve read-only semantics.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Branch review readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Branch review readiness report check passed: focused branch status, review queue, canonical-head decisions, clearance matrix, review-first packets, production approval rows, and no-branch-mutation boundaries are consistent.');
