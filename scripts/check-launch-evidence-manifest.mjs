#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
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
  failures.push(`Unknown option: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:launch-evidence-manifest

Options:
  --skip-probes      Skip local readiness probes for fast unit-level checks.
`);
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function hasOpenGap(manifest, severity, needle) {
  return Array.isArray(manifest.gaps)
    && manifest.gaps.some((gap) => (
      gap
      && gap.severity === severity
      && typeof gap.gap === 'string'
      && gap.gap.includes(needle)
      && gap.status === 'open'
    ));
}

function hasIntegerOrNull(value) {
  return value === null || Number.isInteger(value);
}

function isBoolean(value) {
  return value === true || value === false;
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-check-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`Launch evidence manifest report exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim());
    } else if (report.stdout.trim()) {
      try {
        JSON.parse(report.stdout);
      } catch {
        failures.push('Launch evidence manifest stdout is not valid JSON.');
      }
    }
  }

  let manifest = null;
  if (failures.length === 0) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      failures.push(`Unable to parse generated manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (manifest) {
    assert(manifest.schema_version === 1, 'Manifest schema_version must be 1.');
    assert(manifest.repo?.path === repoRoot, 'Manifest repo.path must match the current repository root.');
    assert(manifest.launch_decision === 'blocked', 'Manifest launch_decision must remain blocked until buyer and deploy gates clear.');
    assert(manifest.scores?.overall === 2, 'Manifest overall score must stay at the conservative blocked value of 2.');
    assert(manifest.scores?.evidence === 1, 'Manifest evidence score must stay at 1 while buyer evidence is absent.');
    assert(Array.isArray(manifest.pain_points) && manifest.pain_points.length === 10, 'Manifest must include exactly ten pain points.');
    assert(Array.isArray(manifest.target_customers) && manifest.target_customers.length === 10, 'Manifest must include exactly ten target customers or segments.');
    assert(
      ['hosted_live', 'local', 'repo_artifact', 'candidate_shadow', 'roadmap'].every((bucket) => Object.hasOwn(manifest.proof_buckets ?? {}, bucket)),
      'Manifest must keep the five proof buckets: hosted_live, local, repo_artifact, candidate_shadow, and roadmap.',
    );
    assert(hasOpenGap(manifest, 'P0', 'Phase F evidence'), 'Manifest must keep the open P0 Phase F buyer-evidence gap.');
    assert(typeof manifest.buyer_evidence?.evidence === 'string', 'Manifest must include buyer_evidence.evidence.');
    assert(manifest.buyer_evidence.evidence.includes('Buyer evidence review'), 'Manifest buyer_evidence evidence must summarize Phase F buyer evidence readiness.');
    assert(typeof manifest.buyer_evidence?.phase_f_gate === 'string' && manifest.buyer_evidence.phase_f_gate.length > 0, 'Manifest buyer_evidence.phase_f_gate must be set.');
    assert(typeof manifest.buyer_evidence?.workspace_next_step === 'string' && manifest.buyer_evidence.workspace_next_step.length > 0, 'Manifest buyer_evidence.workspace_next_step must be set.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.production_registers), 'Manifest buyer_evidence.production_registers must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.outreach_logs), 'Manifest buyer_evidence.outreach_logs must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.confidence_moving_rows), 'Manifest buyer_evidence.confidence_moving_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.actionable_outreach_rows), 'Manifest buyer_evidence.actionable_outreach_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.batchable_intake_packet_rows), 'Manifest buyer_evidence.batchable_intake_packet_rows must be an integer or null.');
    assert(typeof manifest.buyer_evidence?.hard_gate_deficits?.evidence === 'string', 'Manifest buyer_evidence.hard_gate_deficits.evidence must be set.');
    assert(manifest.buyer_evidence.hard_gate_deficits.evidence.includes('Buyer hard-gate deficit ledger'), 'Manifest buyer hard-gate deficits evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.hard_gate_deficits?.open_count), 'Manifest buyer_evidence.hard_gate_deficits.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.hard_gate_deficits?.total_count), 'Manifest buyer_evidence.hard_gate_deficits.total_count must be an integer or null.');
    assert(Array.isArray(manifest.buyer_evidence?.hard_gate_deficits?.items), 'Manifest buyer_evidence.hard_gate_deficits.items must be a list.');
    for (const [index, item] of (manifest.buyer_evidence.hard_gate_deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `buyer_evidence.hard_gate_deficits.items[${index}].next_action must be set.`);
    }
    if (!skipProbes) {
      assert(Number.isInteger(manifest.buyer_evidence?.production_registers), 'Non-skipped manifest must include numeric buyer-evidence production register count.');
      assert(Number.isInteger(manifest.buyer_evidence?.outreach_logs), 'Non-skipped manifest must include numeric buyer-evidence outreach log count.');
      assert(Number.isInteger(manifest.buyer_evidence?.confidence_moving_rows), 'Non-skipped manifest must include numeric buyer-evidence confidence row count.');
      assert(Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.open_count), 'Non-skipped manifest must include numeric buyer hard-gate deficit open count.');
      assert(Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.total_count), 'Non-skipped manifest must include numeric buyer hard-gate deficit total count.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.length >= 10, 'Non-skipped manifest must include the buyer hard-gate deficit item table.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.some((item) => item.requirement === 'Utility forecast lane'), 'Buyer hard-gate deficits must include the utility forecast lane.');
      assert(manifest.buyer_evidence.hard_gate_deficits.items.some((item) => item.requirement === 'Retained-artifact 95% validation'), 'Buyer hard-gate deficits must include retained-artifact validation.');
    }
    assert(typeof manifest.source_provenance?.evidence === 'string', 'Manifest must include source_provenance.evidence.');
    assert(manifest.source_provenance.evidence.includes('Source provenance:'), 'Manifest source provenance evidence must include a summary marker.');
    assert(typeof manifest.source_provenance?.branch === 'string' && manifest.source_provenance.branch.length > 0, 'Manifest source_provenance.branch must be set.');
    assert(typeof manifest.source_provenance?.commit === 'string' && manifest.source_provenance.commit.length > 0, 'Manifest source_provenance.commit must be set.');
    assert(isBoolean(manifest.source_provenance?.is_dirty), 'Manifest source_provenance.is_dirty must be boolean.');
    assert(Number.isInteger(manifest.source_provenance?.dirty_path_count), 'Manifest source_provenance.dirty_path_count must be an integer.');
    assert(Array.isArray(manifest.source_provenance?.dirty_paths), 'Manifest source_provenance.dirty_paths must be a list.');
    assert(
      manifest.source_provenance.dirty_paths.length === manifest.source_provenance.dirty_path_count
        || manifest.source_provenance.dirty_paths.length === Math.min(manifest.source_provenance.dirty_path_count, 40),
      'Manifest source_provenance dirty_paths must match the dirty path count or the 40-path cap.',
    );
    for (const [index, dirtyPath] of (manifest.source_provenance.dirty_paths ?? []).entries()) {
      assert(typeof dirtyPath.file_path === 'string' && dirtyPath.file_path.length > 0, `source_provenance.dirty_paths[${index}].file_path must be set.`);
      assert(typeof dirtyPath.status === 'string' && dirtyPath.status.length > 0, `source_provenance.dirty_paths[${index}].status must be set.`);
      assert(typeof dirtyPath.index_status === 'string' && dirtyPath.index_status.length > 0, `source_provenance.dirty_paths[${index}].index_status must be set.`);
      assert(typeof dirtyPath.worktree_status === 'string' && dirtyPath.worktree_status.length > 0, `source_provenance.dirty_paths[${index}].worktree_status must be set.`);
      assert(typeof dirtyPath.staging_state === 'string' && dirtyPath.staging_state.length > 0, `source_provenance.dirty_paths[${index}].staging_state must be set.`);
      assert(isBoolean(dirtyPath.tracked), `source_provenance.dirty_paths[${index}].tracked must be boolean.`);
      assert(isBoolean(dirtyPath.ignored_by_rule), `source_provenance.dirty_paths[${index}].ignored_by_rule must be boolean.`);
      assert(typeof dirtyPath.action === 'string' && dirtyPath.action.length > 0, `source_provenance.dirty_paths[${index}].action must be set.`);
    }
    if (manifest.source_provenance.dirty_paths.length > 0) {
      assert(manifest.source_provenance.evidence.includes('staging_state='), 'Manifest source provenance evidence must include staging_state classification for dirty paths.');
      assert(manifest.source_provenance.evidence.includes('index_status='), 'Manifest source provenance evidence must include index_status classification for dirty paths.');
      assert(manifest.source_provenance.evidence.includes('worktree_status='), 'Manifest source provenance evidence must include worktree_status classification for dirty paths.');
    }
    assert(hasOpenGap(manifest, 'P1', 'Release toolchain'), 'Manifest must keep the open P1 release toolchain and approval proof gap.');
    assert(typeof manifest.release_preflight?.evidence === 'string', 'Manifest must include release_preflight.evidence.');
    assert(manifest.release_preflight.evidence.includes('Release toolchain and approval deficit ledger'), 'Manifest release preflight evidence must include a ledger marker.');
    assert(typeof manifest.release_preflight?.package_manager === 'string' && manifest.release_preflight.package_manager.length > 0, 'Manifest release_preflight.package_manager must be set.');
    assert(typeof manifest.release_preflight?.expected_pnpm_version === 'string' && manifest.release_preflight.expected_pnpm_version.length > 0, 'Manifest release_preflight.expected_pnpm_version must be set.');
    assert(typeof manifest.release_preflight?.corepack_probe === 'string' && manifest.release_preflight.corepack_probe.length > 0, 'Manifest release_preflight.corepack_probe must be set.');
    assert(typeof manifest.release_preflight?.git_lfs_probe === 'string' && manifest.release_preflight.git_lfs_probe.length > 0, 'Manifest release_preflight.git_lfs_probe must be set.');
    assert(hasIntegerOrNull(manifest.release_preflight?.open_count), 'Manifest release_preflight.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.release_preflight?.total_count), 'Manifest release_preflight.total_count must be an integer or null.');
    assert(Array.isArray(manifest.release_preflight?.items), 'Manifest release_preflight.items must be a list.');
    for (const [index, item] of (manifest.release_preflight.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `release_preflight.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `release_preflight.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `release_preflight.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `release_preflight.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `release_preflight.items[${index}].next_action must be set.`);
    }
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Corepack pnpm resolver'),
      'Release preflight deficits must include Corepack pnpm resolver.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Release-readiness execution'),
      'Release preflight deficits must include release-readiness execution.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Git LFS push-path proof'),
      'Release preflight deficits must include Git LFS push-path proof.',
    );
    assert(
      manifest.release_preflight.items.some((item) => item.requirement === 'Explicit owner production approval'),
      'Release preflight deficits must include explicit owner approval.',
    );
    assert(typeof manifest.launch_action_queue?.evidence === 'string', 'Manifest launch_action_queue.evidence must be set.');
    assert(manifest.launch_action_queue.evidence.includes('Launch blocker action queue'), 'Manifest launch action queue evidence must include a queue marker.');
    assert(hasIntegerOrNull(manifest.launch_action_queue?.item_count), 'Manifest launch_action_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.launch_action_queue?.blocked_count), 'Manifest launch_action_queue.blocked_count must be an integer or null.');
    assert(Array.isArray(manifest.launch_action_queue?.items), 'Manifest launch_action_queue.items must be a list.');
    assert((manifest.launch_action_queue.items ?? []).length >= 6, 'Manifest launch action queue must include the launch blocker execution phases.');
    for (const [index, item] of (manifest.launch_action_queue.items ?? []).entries()) {
      assert(Number.isInteger(item.rank), `launch_action_queue.items[${index}].rank must be an integer.`);
      assert(typeof item.phase === 'string' && item.phase.length > 0, `launch_action_queue.items[${index}].phase must be set.`);
      assert(typeof item.blocker === 'string' && item.blocker.length > 0, `launch_action_queue.items[${index}].blocker must be set.`);
      assert(typeof item.owner === 'string' && item.owner.length > 0, `launch_action_queue.items[${index}].owner must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `launch_action_queue.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.length > 0, `launch_action_queue.items[${index}].proof_command must be set.`);
      assert(typeof item.stop_gate === 'string' && /do not|no /i.test(item.stop_gate), `launch_action_queue.items[${index}].stop_gate must preserve an explicit stop gate.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `launch_action_queue.items[${index}].status must be set.`);
    }
    for (const phase of ['source_provenance', 'release_toolchain', 'branch_review', 'supabase_advisor', 'buyer_evidence', 'production_approval', 'post_deploy_live_proof']) {
      assert(
        manifest.launch_action_queue.items.some((item) => item.phase === phase),
        `Manifest launch action queue must include phase: ${phase}.`,
      );
    }
    const buyerActionItem = manifest.launch_action_queue.items.find((item) => item.phase === 'buyer_evidence');
    if (Number.isInteger(manifest.buyer_evidence?.hard_gate_deficits?.open_count) && manifest.buyer_evidence.hard_gate_deficits.open_count > 0) {
      assert(manifest.buyer_evidence.hard_gate_deficits.status !== 'pass', 'Buyer hard-gate deficits status must not pass while open deficits remain.');
      assert(buyerActionItem?.status !== 'ready', 'Buyer evidence launch action must not be ready while hard-gate deficits remain.');
    }
    assert(
      manifest.launch_action_queue.items.some((item) => item.proof_command.includes('check:post-deploy-live')),
      'Manifest launch action queue must include post-deploy live proof command.',
    );
    assert(
      manifest.launch_action_queue.items.some((item) => /no checkout|no .*merge|no .*push|no .*deploy/i.test(item.stop_gate)),
      'Manifest launch action queue must preserve branch/deploy no-mutation stop gates.',
    );
    assert(hasOpenGap(manifest, 'P1', 'stale/aging unmerged branches'), 'Manifest must keep the open P1 branch freshness review gap.');
    assert(hasOpenGap(manifest, 'P1', 'Supabase security/performance advisor clearance'), 'Manifest must keep the open P1 Supabase advisor clearance gap.');
    assert(typeof manifest.supabase_advisor?.evidence === 'string', 'Manifest must include supabase_advisor.evidence.');
    assert(manifest.supabase_advisor.evidence.includes('Supabase advisor review'), 'Manifest supabase_advisor evidence must summarize advisor access.');
    assert(typeof manifest.supabase_advisor?.project_ref === 'string' && manifest.supabase_advisor.project_ref.length > 0, 'Manifest supabase_advisor.project_ref must be set.');
    assert(typeof manifest.supabase_advisor?.cli_app_lint_status === 'string' && manifest.supabase_advisor.cli_app_lint_status.length > 0, 'Manifest supabase_advisor.cli_app_lint_status must be set.');
    assert(typeof manifest.supabase_advisor?.security_performance_advisors_status === 'string' && manifest.supabase_advisor.security_performance_advisors_status.length > 0, 'Manifest supabase_advisor.security_performance_advisors_status must be set.');
    assert(typeof manifest.supabase_advisor?.connector_permission === 'string' && manifest.supabase_advisor.connector_permission.length > 0, 'Manifest supabase_advisor.connector_permission must be set.');
    assert(typeof manifest.supabase_advisor?.evidence_boundary === 'string' && /does not substitute|advisor evidence|authorization/i.test(manifest.supabase_advisor.evidence_boundary), 'Manifest supabase_advisor.evidence_boundary must preserve the proof limitation.');
    assert(typeof manifest.supabase_advisor?.clearance_deficits?.evidence === 'string', 'Manifest supabase_advisor.clearance_deficits.evidence must be set.');
    assert(manifest.supabase_advisor.clearance_deficits.evidence.includes('Supabase advisor clearance deficit ledger'), 'Manifest Supabase advisor clearance deficits evidence must include a ledger marker.');
    assert(hasIntegerOrNull(manifest.supabase_advisor?.clearance_deficits?.open_count), 'Manifest supabase_advisor.clearance_deficits.open_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.supabase_advisor?.clearance_deficits?.total_count), 'Manifest supabase_advisor.clearance_deficits.total_count must be an integer or null.');
    assert(Array.isArray(manifest.supabase_advisor?.clearance_deficits?.items), 'Manifest supabase_advisor.clearance_deficits.items must be a list.');
    for (const [index, item] of (manifest.supabase_advisor.clearance_deficits.items ?? []).entries()) {
      assert(typeof item.requirement === 'string' && item.requirement.length > 0, `supabase_advisor.clearance_deficits.items[${index}].requirement must be set.`);
      assert(typeof item.current === 'string' && item.current.length > 0, `supabase_advisor.clearance_deficits.items[${index}].current must be set.`);
      assert(typeof item.needed === 'string' && item.needed.length > 0, `supabase_advisor.clearance_deficits.items[${index}].needed must be set.`);
      assert(typeof item.status === 'string' && item.status.length > 0, `supabase_advisor.clearance_deficits.items[${index}].status must be set.`);
      assert(typeof item.next_action === 'string' && item.next_action.length > 0, `supabase_advisor.clearance_deficits.items[${index}].next_action must be set.`);
    }
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Security advisor evidence'),
      'Supabase advisor clearance deficits must include security advisor evidence.',
    );
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Performance advisor evidence'),
      'Supabase advisor clearance deficits must include performance advisor evidence.',
    );
    assert(
      manifest.supabase_advisor.clearance_deficits.items.some((item) => item.requirement === 'Advisor clearance claim'),
      'Supabase advisor clearance deficits must include the no-clearance-claim row.',
    );
    assert(typeof manifest.branch_review?.evidence === 'string', 'Manifest must include branch_review.evidence.');
    assert(manifest.branch_review.evidence.includes('Branch family review'), 'Manifest branch_review evidence must summarize local/origin branch families.');
    assert(manifest.branch_review.evidence.includes('Branch freshness review'), 'Manifest branch_review evidence must summarize freshness.');
    assert(manifest.branch_review.evidence.includes('Branch review queue'), 'Manifest branch_review evidence must summarize the actionable review queue.');
    assert(manifest.branch_review.evidence.includes('Review-first branch packets'), 'Manifest branch_review evidence must summarize review-first focused branch packets.');
    assert(manifest.branch_review.evidence.includes('Top branch review packet'), 'Manifest branch_review evidence must summarize the top focused branch packet.');
    assert(hasIntegerOrNull(manifest.branch_review?.risk_counts?.high), 'Manifest branch_review risk_counts.high must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_only), 'Manifest branch_review family_counts.local_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.origin_only), 'Manifest branch_review family_counts.origin_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_ahead), 'Manifest branch_review family_counts.local_ahead must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.diverged), 'Manifest branch_review family_counts.diverged must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.stale), 'Manifest branch_review freshness_counts.stale must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.aging), 'Manifest branch_review freshness_counts.aging must be an integer or null.');
    assert(typeof manifest.branch_review?.review_queue?.evidence === 'string', 'Manifest branch_review.review_queue.evidence must be set.');
    assert(manifest.branch_review.review_queue.evidence.includes('Branch review queue'), 'Manifest branch_review.review_queue evidence must include a queue marker.');
    assert(Array.isArray(manifest.branch_review?.review_queue?.items), 'Manifest branch_review.review_queue.items must be a list.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_queue?.item_count), 'Manifest branch_review.review_queue.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_queue?.review_first_count), 'Manifest branch_review.review_queue.review_first_count must be an integer or null.');
    for (const [index, item] of (manifest.branch_review.review_queue.items ?? []).entries()) {
      assert(typeof item.family === 'string' && item.family.length > 0, `branch_review.review_queue.items[${index}].family must be set.`);
      assert(Array.isArray(item.family_refs), `branch_review.review_queue.items[${index}].family_refs must be a list.`);
      assert(item.local_ref === null || typeof item.local_ref === 'string', `branch_review.review_queue.items[${index}].local_ref must be string or null.`);
      assert(item.origin_ref === null || typeof item.origin_ref === 'string', `branch_review.review_queue.items[${index}].origin_ref must be string or null.`);
      assert(typeof item.review_ref === 'string' && item.review_ref.length > 0, `branch_review.review_queue.items[${index}].review_ref must be set.`);
      assert(typeof item.priority === 'string' && item.priority.length > 0, `branch_review.review_queue.items[${index}].priority must be set.`);
      assert(typeof item.highest_risk === 'string' && item.highest_risk.length > 0, `branch_review.review_queue.items[${index}].highest_risk must be set.`);
      assert(typeof item.local_origin_state === 'string' && item.local_origin_state.length > 0, `branch_review.review_queue.items[${index}].local_origin_state must be set.`);
      assert(typeof item.freshness === 'string' && item.freshness.length > 0, `branch_review.review_queue.items[${index}].freshness must be set.`);
      assert(typeof item.review_command === 'string' && item.review_command.includes('report:unmerged-branch-readiness'), `branch_review.review_queue.items[${index}].review_command must point to the focused branch report.`);
      assert(typeof item.stop_gate === 'string' && /no checkout|no .*merge|owner approval/i.test(item.stop_gate), `branch_review.review_queue.items[${index}].stop_gate must preserve the non-mutating approval boundary.`);
    }
    assert(typeof manifest.branch_review?.review_first_packets?.evidence === 'string', 'Manifest branch_review.review_first_packets.evidence must be set.');
    assert(manifest.branch_review.review_first_packets.evidence.includes('Review-first branch packets'), 'Manifest branch_review.review_first_packets evidence must include a packet-set marker.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.item_count), 'Manifest branch_review.review_first_packets.item_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.queue_review_first_count), 'Manifest branch_review.review_first_packets.queue_review_first_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.pass_count), 'Manifest branch_review.review_first_packets.pass_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.review_first_packets?.fail_count), 'Manifest branch_review.review_first_packets.fail_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review?.review_first_packets?.packets), 'Manifest branch_review.review_first_packets.packets must be a list.');
    for (const [index, packet] of (manifest.branch_review.review_first_packets.packets ?? []).entries()) {
      assert(typeof packet.evidence === 'string' && packet.evidence.includes('Review-first branch packet'), `branch_review.review_first_packets.packets[${index}].evidence must include a packet marker.`);
      assert(typeof packet.branch === 'string' && packet.branch.length > 0, `branch_review.review_first_packets.packets[${index}].branch must be set.`);
      assert(typeof packet.family === 'string' && packet.family.length > 0, `branch_review.review_first_packets.packets[${index}].family must be set.`);
      assert(typeof packet.priority === 'string' && packet.priority.startsWith('review_first'), `branch_review.review_first_packets.packets[${index}].priority must be review_first.`);
      assert(typeof packet.risk === 'string' && packet.risk.length > 0, `branch_review.review_first_packets.packets[${index}].risk must be set.`);
      assert(typeof packet.local_origin_state === 'string' && packet.local_origin_state.length > 0, `branch_review.review_first_packets.packets[${index}].local_origin_state must be set.`);
      assert(typeof packet.family_freshness === 'string' && packet.family_freshness.length > 0, `branch_review.review_first_packets.packets[${index}].family_freshness must be set.`);
      assert(typeof packet.focused_branch_freshness === 'string' && packet.focused_branch_freshness.length > 0, `branch_review.review_first_packets.packets[${index}].focused_branch_freshness must be set.`);
      assert(Array.isArray(packet.categories), `branch_review.review_first_packets.packets[${index}].categories must be a list.`);
      assert(Array.isArray(packet.changed_supabase_functions), `branch_review.review_first_packets.packets[${index}].changed_supabase_functions must be a list.`);
      assert(hasIntegerOrNull(packet.changed_supabase_function_count), `branch_review.review_first_packets.packets[${index}].changed_supabase_function_count must be an integer or null.`);
      assert(typeof packet.command === 'string' && packet.command.includes('report:unmerged-branch-readiness'), `branch_review.review_first_packets.packets[${index}].command must point to the focused branch report.`);
      assert(typeof packet.stop_gate === 'string' && /no checkout|no .*merge|owner approval/i.test(packet.stop_gate), `branch_review.review_first_packets.packets[${index}].stop_gate must preserve the non-mutating approval boundary.`);
      assert(typeof packet.canonical_head_comparison?.evidence === 'string' && packet.canonical_head_comparison.evidence.includes('Canonical head comparison'), `branch_review.review_first_packets.packets[${index}].canonical_head_comparison evidence must be set.`);
    }
    assert(typeof manifest.branch_review?.top_review_packet?.evidence === 'string', 'Manifest branch_review.top_review_packet.evidence must be set.');
    assert(manifest.branch_review.top_review_packet.evidence.includes('Top branch review packet'), 'Manifest branch_review.top_review_packet evidence must include a packet marker.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.categories), 'Manifest branch_review.top_review_packet.categories must be a list.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.changed_supabase_functions), 'Manifest branch_review.top_review_packet.changed_supabase_functions must be a list.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.changed_supabase_function_count), 'Manifest branch_review.top_review_packet.changed_supabase_function_count must be an integer or null.');
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.evidence === 'string', 'Manifest branch_review.top_review_packet.canonical_head_comparison.evidence must be set.');
    assert(manifest.branch_review.top_review_packet.canonical_head_comparison.evidence.includes('Canonical head comparison'), 'Manifest canonical head comparison evidence must include a comparison marker.');
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.status === 'string', 'Manifest canonical head comparison status must be set.');
    assert(typeof manifest.branch_review?.top_review_packet?.canonical_head_comparison?.state === 'string', 'Manifest canonical head comparison state must be set.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.local_only_count), 'Manifest canonical head comparison local_only_count must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.origin_only_count), 'Manifest canonical head comparison origin_only_count must be an integer or null.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.local_only_subjects), 'Manifest canonical head comparison local_only_subjects must be a list.');
    assert(Array.isArray(manifest.branch_review?.top_review_packet?.canonical_head_comparison?.origin_only_subjects), 'Manifest canonical head comparison origin_only_subjects must be a list.');
    assert(typeof manifest.branch_review?.top_review_packet?.command === 'string' && manifest.branch_review.top_review_packet.command.includes('report:unmerged-branch-readiness'), 'Manifest branch_review.top_review_packet.command must point to the focused branch report.');
    assert(typeof manifest.branch_review?.top_review_packet?.stop_gate === 'string' && /no branch mutation|no checkout|no .*merge|owner approval/i.test(manifest.branch_review.top_review_packet.stop_gate), 'Manifest branch_review.top_review_packet.stop_gate must preserve the non-mutating approval boundary.');
    if (!skipProbes) {
      assert(Number.isInteger(manifest.branch_review?.family_counts?.local_only), 'Non-skipped manifest must include numeric local-only family count.');
      assert(Number.isInteger(manifest.branch_review?.family_counts?.origin_only), 'Non-skipped manifest must include numeric origin-only family count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.stale), 'Non-skipped manifest must include numeric stale branch count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.aging), 'Non-skipped manifest must include numeric aging branch count.');
      assert(Number.isInteger(manifest.branch_review?.review_queue?.item_count), 'Non-skipped manifest must include numeric branch review queue item count.');
      assert(manifest.branch_review.review_queue.items.length > 0 || manifest.branch_review.review_queue.item_count === 0, 'Non-skipped manifest branch review queue must include items when queue count is positive.');
      assert(Number.isInteger(manifest.branch_review?.review_first_packets?.item_count), 'Non-skipped manifest must include numeric review-first packet count.');
      assert(manifest.branch_review.review_first_packets.item_count === manifest.branch_review.review_first_packets.packets.length, 'Review-first packet count must match packet list length.');
      assert(
        manifest.branch_review.review_first_packets.item_count === Math.min(manifest.branch_review.review_queue.review_first_count ?? 0, 4),
        'Review-first packet count must match the bounded review-first queue length.',
      );
      assert(manifest.branch_review.review_first_packets.status === 'pass' || manifest.branch_review.review_first_packets.item_count === 0, 'Review-first packet bundle must pass when packet items exist.');
      assert(manifest.branch_review?.top_review_packet?.status === 'pass' || manifest.branch_review?.review_queue?.item_count === 0, 'Non-skipped manifest top branch review packet must pass when queue items exist.');
      assert(typeof manifest.branch_review?.top_review_packet?.branch === 'string' || manifest.branch_review?.review_queue?.item_count === 0, 'Non-skipped manifest top branch review packet must identify the focused branch when queue items exist.');
      assert(Array.isArray(manifest.branch_review?.top_review_packet?.changed_supabase_function_rows), 'Non-skipped manifest top branch review packet must include changed Supabase function review rows.');
      assert(
        manifest.branch_review.top_review_packet.changed_supabase_functions.length === manifest.branch_review.top_review_packet.changed_supabase_function_count,
        'Top branch review packet function names must match changed_supabase_function_count.',
      );
      if (manifest.branch_review.top_review_packet.canonical_head_comparison.status === 'pass') {
        assert(
          typeof manifest.branch_review.top_review_packet.canonical_head_comparison.command === 'string'
            && manifest.branch_review.top_review_packet.canonical_head_comparison.command.includes('git log --left-right --cherry-pick --oneline'),
          'Passing canonical head comparison must record the read-only git log command.',
        );
      }
    }
    assert(
      typeof manifest.outreach_plan?.email_script_boundary === 'string'
        && manifest.outreach_plan.email_script_boundary.includes('Do not claim buyer-proven 95% confidence'),
      'Manifest outreach plan must preserve the buyer-proof boundary.',
    );
    assert(manifest.ecc_ledger?.decision === 'blocked', 'Manifest ECC ledger decision must remain blocked.');

    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    if (validation.status !== 0) {
      failures.push(`Launch evidence schema validation exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validation.stderr.trim()) failures.push(validation.stderr.trim());
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    } else if (!validation.stdout.includes('VALID')) {
      failures.push('Launch evidence schema validation did not report VALID.');
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Launch evidence manifest check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch evidence manifest check passed: blocked decision, proof buckets, buyer evidence, buyer hard-gate deficits, Supabase advisor evidence, Supabase advisor clearance deficits, release preflight deficits, launch action queue, source provenance, branch families, branch freshness, branch review queue, review-first branch packets, top branch packet, canonical head comparison, pain map, target map, buyer boundary, and schema validation are consistent.');
