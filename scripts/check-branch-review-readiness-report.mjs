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
    assertContains(stdout, '## Branch Operator Handoff Packet', 'Report must include the branch operator handoff packet.');
    assertContains(stdout, 'branch_operator_handoff_packet', 'Report must include the branch operator handoff proof type.');
    assertContains(stdout, 'branch_review.clearance_matrix.rows', 'Report must expose the branch operator handoff packet source.');
    assertContains(stdout, 'Execution Gate', 'Report must render branch operator handoff execution gates.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must render branch operator packet execution boundaries.');
    assertContains(stdout, 'read-only planning evidence only', 'Report must preserve the branch operator handoff planning-only boundary.');
    assertContains(stdout, '## Review-First Branch Packets', 'Report must include review-first branch packets.');
    assertContains(stdout, '## Top Branch Review Packet', 'Report must include the top branch review packet.');
    assertContains(stdout, '## Top Branch Changed Supabase Function Rows', 'Report must include top branch Supabase function impact rows.');
    assertContains(stdout, '## Canonical Head Comparison', 'Report must include canonical-head comparison.');
    assertContains(stdout, '## Launch Action Branch Row', 'Report must include the launch action branch row.');
    assertContains(stdout, '## Production Approval Branch Prerequisite', 'Report must include the production approval branch prerequisite.');
    assertContains(stdout, '## Production Approval Request Branch Row', 'Report must include the production approval request branch row.');
    assert(/does not[ \s\S]{0,240}(grant production approval|prove hosted\/live parity)/i.test(stdout), 'Report must preserve no-approval and no-live-proof language.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public branch-review handles.');
    assertContains(stdout, 'unmerged_branch_review_queue', 'Report must include the unmerged branch review queue public handle.');
    assertContains(stdout, 'branch_family_freshness_rollup', 'Report must include the branch family freshness public handle.');
    assertContains(stdout, 'top_branch_review_packet', 'Report must include the top branch packet public handle.');
    assertContains(stdout, 'branch_clearance_matrix', 'Report must include the branch clearance matrix public handle.');
    assertContains(stdout, 'branch_operator_handoff_packet', 'Report must include the branch operator handoff public handle.');
    assertContains(stdout, 'canonical_head_decision_queue', 'Report must include the canonical-head decision public handle.');
    assertContains(stdout, 'canonical_head_resolution_queue', 'Report must include the canonical-head resolution public handle.');
    assertContains(stdout, 'review_first_branch_packet_queue', 'Report must include the review-first packet queue public handle.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:branch-review-readiness', 'Report must include the focused branch review package report handle.');
    assertContains(stdout, 'corepack pnpm run check:branch-review-report', 'Report must include the focused branch review package check handle.');
    assertContains(stdout, 'corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high', 'Report must include the high-risk unmerged branch report package handle.');
    const markdownOperatorRows = payload?.branch_review?.operator_handoff_packet?.items ?? [];
    if (markdownOperatorRows.some((item) => item.blocker_class === 'review_first')) {
      assertContains(stdout, 'read_only_focused_review_first', 'Report must render review-first branch operator execution gates when present.');
    }
    if (markdownOperatorRows.some((item) => item.blocker_class === 'canonical_head_decision')) {
      assertContains(stdout, 'owner_canonical_head_decision_first', 'Report must render owner canonical-head decision execution gates when present.');
    }
  }

  if (payload) {
    const branch = payload.branch_review ?? {};
    const reviewQueue = branch.review_queue ?? {};
    const canonical = branch.canonical_head_decisions ?? {};
    const resolutionQueue = branch.canonical_head_resolution_queue ?? {};
    const clearanceMatrix = branch.clearance_matrix ?? {};
    const operatorHandoffPacket = branch.operator_handoff_packet ?? {};
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
    assert(operatorHandoffPacket.proof_type === 'branch_operator_handoff_packet', 'Focused JSON must include the branch operator handoff packet.');
    assert(operatorHandoffPacket.source === 'branch_review.clearance_matrix.rows', 'Branch operator handoff packet must link to branch_review.clearance_matrix.rows.');
    assert(['ready', 'blocked', 'skipped'].includes(operatorHandoffPacket.status), 'Branch operator handoff packet status must be ready, blocked, or skipped.');
    assert(Array.isArray(operatorHandoffPacket.items), 'branch operator handoff packet items must be a list.');
    assert(typeof operatorHandoffPacket.evidence === 'string' && /Branch operator handoff packet/i.test(operatorHandoffPacket.evidence), 'Branch operator handoff packet evidence must be set.');
    assert(typeof operatorHandoffPacket.proof_boundary === 'string' && /read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|request production approval|grant owner approval|hosted\/live parity/i.test(operatorHandoffPacket.proof_boundary), 'Branch operator handoff packet proof_boundary must preserve read-only branch planning boundaries.');
    assert(typeof operatorHandoffPacket.stop_gate === 'string' && /Do not mark branch review clear|select canonical heads|merge|push|discard|delete|deploy|request production approval/i.test(operatorHandoffPacket.stop_gate), 'Branch operator handoff packet stop_gate must reject clearance, branch mutation, approval, and deploy claims.');
    assert(Array.isArray(packetSet.packets), 'review_first_packets.packets must be a list.');
    assert(topPacket && typeof topPacket === 'object', 'top_review_packet must be an object.');
    assert(payload.launch_action_branch_row?.phase === 'branch_review', 'Focused JSON must include the launch action branch row.');
    assert(payload.production_approval_branch_prerequisite?.prerequisite === 'Canonical branch review', 'Focused JSON must include the production approval branch prerequisite.');
    assert(payload.production_approval_request_branch_row?.prerequisite === 'Canonical branch review', 'Focused JSON must include the production approval request branch row.');
    assert(payload.public_status_handles?.unmerged_branch_review_queue?.id === 'unmerged_branch_review_queue', 'Focused JSON must include the unmerged branch review queue public handle.');
    assert(payload.public_status_handles?.branch_family_freshness_rollup?.id === 'branch_family_freshness_rollup', 'Focused JSON must include the branch family freshness public handle.');
    assert(payload.public_status_handles?.top_branch_review_packet?.id === 'top_branch_review_packet', 'Focused JSON must include the top branch packet public handle.');
    assert(payload.public_status_handles?.branch_clearance_matrix?.id === 'branch_clearance_matrix', 'Focused JSON must include the branch clearance matrix public handle.');
    assert(payload.public_status_handles?.branch_operator_handoff_packet?.id === 'branch_operator_handoff_packet', 'Focused JSON must include the branch operator handoff public handle.');
    assert(payload.public_status_handles?.canonical_head_decision_queue?.id === 'canonical_head_decision_queue', 'Focused JSON must include the canonical-head decision public handle.');
    assert(payload.public_status_handles?.canonical_head_resolution_queue?.id === 'canonical_head_resolution_queue', 'Focused JSON must include the canonical-head resolution public handle.');
    assert(payload.public_status_handles?.review_first_branch_packet_queue?.id === 'review_first_branch_packet_queue', 'Focused JSON must include the review-first branch packet queue public handle.');
    assert(/report:branch-review-readiness/.test(payload.public_status_handles?.branch_operator_handoff_packet?.command ?? '') && /check:branch-review-report/.test(payload.public_status_handles?.branch_operator_handoff_packet?.command ?? ''), 'Branch operator handoff public handle must point at the focused branch report/check.');
    assert(/branch_review\.operator_handoff_packet/.test(payload.public_status_handles?.branch_operator_handoff_packet?.sourceManifestPath ?? ''), 'Branch operator handoff public handle must point at branch_review.operator_handoff_packet.');
    assert(Array.isArray(payload.public_status_handles?.unmerged_branch_review_queue?.sourceProofTypes) && payload.public_status_handles.unmerged_branch_review_queue.sourceProofTypes.includes('read_only_branch_review'), 'Unmerged branch public handle must expose read-only branch review lineage.');
    assert(payload.public_status_handles?.branch_clearance_matrix?.sourceProofType === 'read_only_branch_clearance_matrix', 'Branch clearance public handle must expose the clearance matrix proof type.');
    assert(payload.package_script_handles?.report_branch_review_readiness === 'corepack pnpm run report:branch-review-readiness', 'Focused JSON must include the branch review report package handle.');
    assert(payload.package_script_handles?.check_branch_review_report === 'corepack pnpm run check:branch-review-report', 'Focused JSON must include the branch review checker package handle.');
    assert(payload.package_script_handles?.report_unmerged_branch_readiness === 'corepack pnpm run report:unmerged-branch-readiness', 'Focused JSON must include the unmerged branch readiness package handle.');
    assert(payload.package_script_handles?.report_unmerged_branch_readiness_high_risk === 'corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high', 'Focused JSON must include the high-risk branch readiness package handle.');
    assert(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|deploy|grant production approval/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve branch non-mutation and no-approval semantics.');
    assert(/Do not treat this focused report|branch approval|canonical-head owner selection|merge approval|release readiness|production approval|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject clearance claims from this report itself.');

    if (branch.status !== 'skipped') {
      assert(Number.isInteger(reviewQueue.item_count), 'review_queue.item_count must be an integer when branch probes run.');
      assert(reviewQueue.item_count === reviewQueue.items.length, 'review_queue.item_count must match item count when branch probes run.');
      assert(Number.isInteger(clearanceMatrix.family_count), 'clearance_matrix.family_count must be an integer when branch probes run.');
      assert(clearanceMatrix.family_count === clearanceMatrix.rows.length, 'clearance_matrix.family_count must match rows when branch probes run.');
      const expectedOperatorStatus = (clearanceMatrix.rows ?? []).some((item) => item.blocks_launch_clearance === true || item.clearance_status !== 'pass') ? 'blocked' : 'ready';
      assert(operatorHandoffPacket.status === expectedOperatorStatus, 'Branch operator handoff packet status must derive from clearance matrix row blockers.');
      assert(operatorHandoffPacket.item_count === clearanceMatrix.rows.length, 'Branch operator handoff packet item_count must match clearance matrix rows.');
      assert(operatorHandoffPacket.blocked_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocks_branch_gate).length, 'Branch operator handoff packet blocked_count must match blocked handoff rows.');
      assert(operatorHandoffPacket.review_first_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocker_class === 'review_first').length, 'Branch operator handoff packet review_first_count must match review-first rows.');
      assert(operatorHandoffPacket.canonical_decision_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocker_class === 'canonical_head_decision').length, 'Branch operator handoff packet canonical_decision_count must match canonical-head decision rows.');
      assert(operatorHandoffPacket.drift_review_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocker_class === 'drift_review').length, 'Branch operator handoff packet drift_review_count must match drift review rows.');
      assert(operatorHandoffPacket.high_risk_count === (operatorHandoffPacket.items ?? []).filter((item) => item.highest_risk === 'high').length, 'Branch operator handoff packet high_risk_count must match high-risk rows.');
      assert(operatorHandoffPacket.stale_or_aging_count === (operatorHandoffPacket.items ?? []).filter((item) => ['stale', 'aging'].includes(item.freshness)).length, 'Branch operator handoff packet stale_or_aging_count must match stale or aging rows.');
      assert(
        JSON.stringify((operatorHandoffPacket.items ?? []).map((item) => item.family)) === JSON.stringify((clearanceMatrix.rows ?? []).map((item) => item.family)),
        'Branch operator handoff packet rows must preserve clearance matrix row order.',
      );
      assert(typeof topPacket.proof_boundary === 'string' && /read-only branch evidence|does not checkout|merge|push/i.test(topPacket.proof_boundary), 'top_review_packet.proof_boundary must preserve read-only branch semantics.');
      assert(Number.isInteger(topPacket.changed_supabase_function_count), 'top_review_packet.changed_supabase_function_count must be an integer when branch probes run.');
      assert(Array.isArray(topPacket.changed_supabase_functions), 'top_review_packet.changed_supabase_functions must be a list when branch probes run.');
      assert(Array.isArray(topPacket.changed_supabase_function_rows), 'top_review_packet.changed_supabase_function_rows must be a list when branch probes run.');
      assert(topPacket.changed_supabase_function_rows.length === topPacket.changed_supabase_function_count, 'top_review_packet changed Supabase function rows must match changed_supabase_function_count.');
      if (topPacket.changed_supabase_function_count > 0) {
        assert((topPacket.categories ?? []).includes('supabase/database'), 'top_review_packet must include the supabase/database category when Supabase functions changed.');
      }
    } else {
      assert(operatorHandoffPacket.status === 'skipped', 'Skipped branch probes must produce a skipped branch operator handoff packet.');
      assert(operatorHandoffPacket.item_count === 0, 'Skipped branch operator handoff packet item_count must be zero.');
      assert(operatorHandoffPacket.blocked_count === 0, 'Skipped branch operator handoff packet blocked_count must be zero.');
    }

    for (const [index, item] of (operatorHandoffPacket.items ?? []).entries()) {
      const clearanceRow = (clearanceMatrix.rows ?? [])[index] ?? {};
      assert(Number.isInteger(item.rank), `operator_handoff_packet.items[${index}].rank must be an integer.`);
      assert(item.family === clearanceRow.family, `operator_handoff_packet.items[${index}].family must match the clearance matrix row.`);
      assert(item.review_ref === clearanceRow.review_ref, `operator_handoff_packet.items[${index}].review_ref must match the clearance matrix row.`);
      assert(['owner', 'operator'].includes(item.owner), `operator_handoff_packet.items[${index}].owner must be owner or operator.`);
      assert(['ready', 'blocked'].includes(item.status), `operator_handoff_packet.items[${index}].status must be ready or blocked.`);
      assert(typeof item.execution_gate === 'string' && item.execution_gate.length > 0, `operator_handoff_packet.items[${index}].execution_gate must be set.`);
      assert(typeof item.action === 'string' && item.action.length > 0, `operator_handoff_packet.items[${index}].action must be set.`);
      assert(typeof item.proof_command === 'string' && item.proof_command.includes('report:unmerged-branch-readiness'), `operator_handoff_packet.items[${index}].proof_command must point at the read-only branch report.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `operator_handoff_packet.items[${index}].proof_type must be set.`);
      assert(item.read_only === true, `operator_handoff_packet.items[${index}].read_only must be true.`);
      assert(item.can_execute_from_packet === false, `operator_handoff_packet.items[${index}].can_execute_from_packet must be false.`);
      assert(item.blocks_branch_gate === (clearanceRow.blocks_launch_clearance === true || clearanceRow.clearance_status !== 'pass'), `operator_handoff_packet.items[${index}].blocks_branch_gate must derive from the clearance matrix row.`);
      assert(typeof item.proof_boundary === 'string' && /read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|request production approval|grant owner approval|hosted\/live parity/i.test(item.proof_boundary), `operator_handoff_packet.items[${index}].proof_boundary must preserve branch handoff boundaries.`);
      assert(typeof item.stop_gate === 'string' && /Do not execute|mutate branch state|select canonical heads|request production approval|mark this row ready/i.test(item.stop_gate), `operator_handoff_packet.items[${index}].stop_gate must reject execution and approval claims.`);
      if (item.blocker_class === 'review_first') {
        assert(item.execution_gate === 'read_only_focused_review_first', `operator_handoff_packet.items[${index}] review-first rows must use the read_only_focused_review_first execution gate.`);
      }
      if (item.blocker_class === 'canonical_head_decision') {
        assert(item.owner === 'owner', `operator_handoff_packet.items[${index}] canonical-head rows must be owner-gated.`);
        assert(item.execution_gate === 'owner_canonical_head_decision_first', `operator_handoff_packet.items[${index}] canonical-head rows must use the owner_canonical_head_decision_first execution gate.`);
      }
    }

    for (const [index, item] of (reviewQueue.items ?? []).entries()) {
      assert(item.read_only === true, `review_queue.items[${index}].read_only must be true.`);
      assert(typeof item.review_command === 'string' && item.review_command.includes('report:unmerged-branch-readiness'), `review_queue.items[${index}].review_command must point at the read-only branch report.`);
      assert(typeof item.proof_boundary === 'string' && /does not checkout|merge|push/i.test(item.proof_boundary), `review_queue.items[${index}].proof_boundary must preserve read-only semantics.`);
    }

    for (const [index, item] of (topPacket.changed_supabase_function_rows ?? []).entries()) {
      assert(typeof item.function_name === 'string' && item.function_name.length > 0, `top_review_packet.changed_supabase_function_rows[${index}].function_name must be set.`);
      assert(typeof item.changed_paths === 'string' && /supabase\/functions\//.test(item.changed_paths), `top_review_packet.changed_supabase_function_rows[${index}].changed_paths must name Supabase function paths.`);
      assert(typeof item.review_focus === 'string' && /secret|auth|entitlement|database writes|observability|import-impact/i.test(item.review_focus), `top_review_packet.changed_supabase_function_rows[${index}].review_focus must describe security/runtime review focus.`);
      assert(typeof item.suggested_checks === 'string' && /git diff/.test(item.suggested_checks), `top_review_packet.changed_supabase_function_rows[${index}].suggested_checks must include read-only git diff checks.`);
      assert(item.proof_type === 'read_only_supabase_function_branch_review', `top_review_packet.changed_supabase_function_rows[${index}].proof_type must be read_only_supabase_function_branch_review.`);
      assert(typeof item.proof_boundary === 'string' && /does not deploy functions|run migrations|alter secrets|change policies|grant production approval/i.test(item.proof_boundary), `top_review_packet.changed_supabase_function_rows[${index}].proof_boundary must preserve no-deploy/no-secret boundaries.`);
      assert(typeof item.stop_gate === 'string' && /No production function deploy|service-role|live data write/i.test(item.stop_gate), `top_review_packet.changed_supabase_function_rows[${index}].stop_gate must block production function deploys and live writes.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Branch review readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Branch review readiness report check passed: focused branch status, review queue, canonical-head decisions, clearance matrix, operator handoff packet, review-first packets, top branch Supabase function impact rows, production approval rows, and no-branch-mutation boundaries are consistent.');
