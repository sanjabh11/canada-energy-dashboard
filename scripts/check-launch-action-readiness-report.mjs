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
    assertContains(stdout, '## Launch Action Operator Handoff Packet', 'Report must include the launch action operator handoff packet.');
    assertContains(stdout, 'launch_action_operator_handoff_packet', 'Report must classify the launch action operator handoff packet proof type.');
    assertContains(stdout, 'launch_action_queue.items', 'Report must source the operator handoff packet from launch action queue rows.');
    assertContains(stdout, 'Execution Gate', 'Report must render operator execution gates.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must render the packet execution boundary.');
    assertContains(stdout, 'Owner Approval Required', 'Report must render the owner approval flag.');
    assertContains(stdout, 'planning evidence only', 'Report must preserve planning-only operator handoff boundaries.');
    assertContains(stdout, 'corepack pnpm run report:source-provenance-readiness', 'Report must include the source provenance focused command.');
    assertContains(stdout, 'corepack pnpm run report:launch-evidence-validation-readiness', 'Report must include the launch evidence validation focused command.');
    assertContains(stdout, 'corepack pnpm run check:launch-evidence-validation-report', 'Report must include the launch evidence validation checker command.');
    assertContains(stdout, 'corepack pnpm run report:buyer-evidence-gate-readiness', 'Report must include the buyer evidence gate focused command.');
    assertContains(stdout, 'corepack pnpm run check:buyer-evidence-gate-report', 'Report must include the buyer evidence gate checker command.');
    assertContains(stdout, 'corepack pnpm run report:production-approval-readiness', 'Report must include the production approval focused command.');
    assertContains(stdout, 'corepack pnpm run report:post-deploy-live-proof-readiness', 'Report must include the post-deploy focused command.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public launch action handles.');
    assertContains(stdout, 'launch_blocker_action_queue', 'Report must expose the public launch blocker action queue handle.');
    assertContains(stdout, 'launch_action_operator_handoff_packet', 'Report must expose the public launch action operator handoff packet handle.');
    assertContains(stdout, 'launch_action_queue.operator_handoff_packet', 'Report must expose operator handoff public source lineage.');
  }

  if (payload) {
    const queue = payload.launch_action_queue ?? {};
    const operatorHandoffPacket = queue.operator_handoff_packet ?? {};
    const items = queue.items ?? [];
    const operatorItems = operatorHandoffPacket.items ?? [];
    const phases = items.map((item) => item.phase);
    const rowsByPhase = new Map(items.map((item) => [item.phase, item]));
    const operatorRowsByPhase = new Map(operatorItems.map((item) => [item.phase, item]));
    const laneRows = payload.lane_status_summary ?? [];
    const lanes = laneRows.map((item) => item.lane);
    const lanesByName = new Map(laneRows.map((item) => [item.lane, item]));
    const buyerLane = lanesByName.get('buyer_evidence');
    const expectedExecutionGates = {
      source_provenance: 'resolve_source_provenance_first',
      launch_evidence_validation: 'attach_launch_validation_evidence',
      release_toolchain: 'release_toolchain_after_clean_source',
      branch_review: 'read_only_branch_review_before_approval',
      supabase_advisor: 'supabase_advisor_after_authorization',
      buyer_evidence: 'buyer_evidence_before_commercial_ready_claims',
      production_approval: 'owner_approval_after_all_prelaunch_gates',
      post_deploy_live_proof: 'post_deploy_proof_after_approved_deploy',
    };

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
    assert(
      /report:release-preflight/.test(rowsByPhase.get('release_toolchain')?.proof_command ?? '')
        && /check:release-preflight-report/.test(rowsByPhase.get('release_toolchain')?.proof_command ?? '')
        && /check:release-readiness/.test(rowsByPhase.get('release_toolchain')?.proof_command ?? ''),
      'Release toolchain row must point to focused release-preflight proof before guarded release-readiness.',
    );
    assert(rowsByPhase.get('branch_review')?.proof_type === 'read_only_branch_review', 'Branch review row must keep read-only proof type.');
    assert(
      /report:branch-review-readiness/.test(rowsByPhase.get('branch_review')?.proof_command ?? '')
        && /check:branch-review-report/.test(rowsByPhase.get('branch_review')?.proof_command ?? ''),
      'Branch review row must point to the focused branch review report/check.',
    );
    assert(rowsByPhase.get('supabase_advisor')?.proof_type === 'external_account_evidence', 'Supabase row must keep external account proof type.');
    assert(
      /report:supabase-advisor-readiness/.test(rowsByPhase.get('supabase_advisor')?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(rowsByPhase.get('supabase_advisor')?.proof_command ?? ''),
      'Supabase advisor row must point to the focused Supabase advisor report/check.',
    );
    assert(rowsByPhase.get('buyer_evidence')?.proof_type === 'retained_buyer_evidence_validation', 'Buyer row must keep retained evidence proof type.');
    assert(
      /report:buyer-evidence-gate-readiness/.test(rowsByPhase.get('buyer_evidence')?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(rowsByPhase.get('buyer_evidence')?.proof_command ?? ''),
      'Buyer evidence row must point to the focused buyer evidence gate report/check.',
    );
    assert(rowsByPhase.get('production_approval')?.proof_type === 'manual_approval_gate', 'Production approval row must keep manual approval proof type.');
    assert(
      /report:production-approval-readiness/.test(rowsByPhase.get('production_approval')?.proof_command ?? '')
        && /check:production-approval-report/.test(rowsByPhase.get('production_approval')?.proof_command ?? ''),
      'Production approval row must point to the focused production approval report/check.',
    );
    assert(rowsByPhase.get('post_deploy_live_proof')?.proof_type === 'post_deploy_live_proof_gate', 'Post-deploy row must keep post-deploy proof type.');
    assert(
      /report:post-deploy-live-proof-readiness/.test(rowsByPhase.get('post_deploy_live_proof')?.proof_command ?? '')
        && /check:post-deploy-live-proof-report/.test(rowsByPhase.get('post_deploy_live_proof')?.proof_command ?? ''),
      'Post-deploy row must point to the focused post-deploy live proof report/check.',
    );
    assert(operatorHandoffPacket.proof_type === 'launch_action_operator_handoff_packet', 'Operator handoff packet must preserve its proof type.');
    assert(operatorHandoffPacket.source === 'launch_action_queue.items', 'Operator handoff packet must source launch action queue rows.');
    assert(operatorHandoffPacket.status === 'blocked', 'Operator handoff packet must remain blocked while launch action rows are blocked.');
    assert(operatorHandoffPacket.item_count === items.length, 'Operator handoff item count must match launch action rows.');
    assert(operatorItems.length === items.length, 'Operator handoff items must mirror launch action rows.');
    assert(operatorHandoffPacket.blocked_count === operatorItems.filter((item) => item.blocks_launch_clearance).length, 'Operator handoff blocked_count must match launch-blocking rows.');
    assert(operatorHandoffPacket.ready_count === operatorItems.filter((item) => item.status === 'ready').length, 'Operator handoff ready_count must match ready rows.');
    assert(operatorHandoffPacket.manual_stop_count === operatorItems.filter((item) => item.status === 'manual_stop').length, 'Operator handoff manual_stop_count must match manual-stop rows.');
    assert(operatorHandoffPacket.external_gate_count === operatorItems.filter((item) => item.status === 'external_gate').length, 'Operator handoff external_gate_count must match external-gate rows.');
    assert(operatorHandoffPacket.owner_approval_count === operatorItems.filter((item) => item.owner_approval_required).length, 'Operator handoff owner_approval_count must match owner approval rows.');
    assert(operatorHandoffPacket.external_account_count === operatorItems.filter((item) => item.external_account_required).length, 'Operator handoff external_account_count must match external-account rows.');
    assert(operatorHandoffPacket.buyer_evidence_count === operatorItems.filter((item) => item.buyer_evidence_required).length, 'Operator handoff buyer_evidence_count must match buyer evidence rows.');
    assert(operatorHandoffPacket.read_only_count === operatorItems.filter((item) => item.read_only_required).length, 'Operator handoff read_only_count must match read-only rows.');
    assert(operatorHandoffPacket.source_provenance_count === operatorItems.filter((item) => item.source_provenance_required).length, 'Operator handoff source_provenance_count must match source provenance rows.');
    assert(operatorHandoffPacket.release_gate_count === operatorItems.filter((item) => item.release_gate_required).length, 'Operator handoff release_gate_count must match release gate rows.');
    assert(operatorHandoffPacket.post_deploy_boundary_count === operatorItems.filter((item) => item.post_deploy_boundary).length, 'Operator handoff post_deploy_boundary_count must match post-deploy rows.');
    assert(operatorHandoffPacket.evidence.includes('Launch action operator handoff packet'), 'Operator handoff evidence must include a packet marker.');
    assert(/planning evidence only|does not execute queue rows|clear blockers|mutate source|contact buyers|access Supabase|request owner approval|deploy|live proof|launch readiness/i.test(operatorHandoffPacket.proof_boundary ?? ''), 'Operator handoff proof_boundary must preserve planning-only launch boundaries.');
    assert(/Do not execute launch actions|mark blockers ready|request production approval|deploy-production|netlify deploy|contact buyers|access Supabase|commercial-ready status/i.test(operatorHandoffPacket.stop_gate ?? ''), 'Operator handoff stop_gate must reject execution, approval, deploy, external-action, and readiness claims.');
    assert(operatorItems.map((item) => item.phase).join(',') === phases.join(','), 'Operator handoff rows must preserve launch action order.');
    for (const [index, item] of operatorItems.entries()) {
      const queueRow = items[index] ?? {};
      assert(Number.isInteger(item.rank), `Operator handoff row ${index} rank must be an integer.`);
      assert(item.phase === queueRow.phase, `Operator handoff row ${index} phase must match queue row.`);
      assert(item.owner === queueRow.owner, `Operator handoff row ${index} owner must match queue row.`);
      assert(item.status === queueRow.status, `Operator handoff row ${index} status must match queue row.`);
      assert(item.blocker === queueRow.blocker, `Operator handoff row ${index} blocker must match queue row.`);
      assert(item.action === queueRow.action, `Operator handoff row ${index} action must match queue row.`);
      assert(item.proof_command === queueRow.proof_command, `Operator handoff row ${index} proof_command must match queue row.`);
      assert(item.proof_type === queueRow.proof_type, `Operator handoff row ${index} proof_type must match queue row.`);
      assert(item.blocks_launch_clearance === (queueRow.status !== 'ready' && queueRow.status !== 'external_gate'), `Operator handoff row ${index} blocks_launch_clearance must derive from operational queue row status.`);
      assert(item.can_execute_from_packet === false, `Operator handoff row ${index} must not be executable from the packet.`);
      assert(item.execution_gate === expectedExecutionGates[item.phase], `Operator handoff row ${index} must expose the expected execution gate.`);
      assert(/planning evidence only|does not execute the row|clear blockers|mutate source|contact buyers|access Supabase|request owner approval|deploy|live proof|launch readiness/i.test(item.proof_boundary ?? ''), `Operator handoff row ${index} proof_boundary must preserve planning-only semantics.`);
      assert(/Do not execute this launch action|mark it ready|clear blockers|claim launch readiness/i.test(item.stop_gate ?? ''), `Operator handoff row ${index} stop_gate must reject packet execution.`);
    }
    assert(operatorRowsByPhase.get('source_provenance')?.source_provenance_required === true, 'Operator handoff source row must set source_provenance_required.');
    assert(operatorRowsByPhase.get('release_toolchain')?.release_gate_required === true, 'Operator handoff release row must set release_gate_required.');
    assert(operatorRowsByPhase.get('branch_review')?.read_only_required === true, 'Operator handoff branch row must set read_only_required.');
    assert(operatorRowsByPhase.get('supabase_advisor')?.external_account_required === true, 'Operator handoff Supabase row must set external_account_required.');
    assert(operatorRowsByPhase.get('buyer_evidence')?.buyer_evidence_required === true, 'Operator handoff buyer row must set buyer_evidence_required.');
    assert(operatorRowsByPhase.get('buyer_evidence')?.status === 'external_gate', 'Operator handoff buyer row must stay external_gate while buyer evidence is absent before launch.');
    assert(operatorRowsByPhase.get('buyer_evidence')?.blocks_launch_clearance === false, 'Operator handoff buyer row must not block launch-action clearance while external-gated.');
    assert(operatorRowsByPhase.get('production_approval')?.owner_approval_required === true, 'Operator handoff approval row must set owner_approval_required.');
    assert(operatorRowsByPhase.get('post_deploy_live_proof')?.post_deploy_boundary === true, 'Operator handoff post-deploy row must set post_deploy_boundary.');
    assert(lanes.includes('source_provenance') && lanes.includes('post_deploy_live_proof'), 'Lane status summary must include source and post-deploy lanes.');
    assert(buyerLane?.status === 'external_gate', 'Buyer evidence lane summary must remain external_gate while hard-gate or acquisition evidence is skipped/open/non-ready before launch.');
    assert(/open_hard_gate_rows=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose hard-gate open row count.');
    assert(/hard_gate_status=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose hard-gate status.');
    assert(/acquisition_status=/.test(buyerLane?.current ?? ''), 'Buyer evidence lane summary must expose acquisition matrix status.');
    assert(payload.package_script_handles?.check_launch_action_report === 'corepack pnpm run check:launch-action-report', 'Focused report must expose the launch action checker command handle.');
    assert(payload.package_script_handles?.check_launch_evidence_validation_report === 'corepack pnpm run check:launch-evidence-validation-report', 'Focused report must expose the launch evidence validation checker command handle.');
    assert(payload.public_status_handles?.launch_blocker_action_queue?.id === 'launch_blocker_action_queue', 'Focused report must include the public launch blocker action queue handle.');
    assert(payload.public_status_handles?.launch_action_operator_handoff_packet?.id === 'launch_action_operator_handoff_packet', 'Focused report must include the public launch action operator handoff packet handle.');
    assert(
      /report:launch-action-readiness/.test(payload.public_status_handles?.launch_blocker_action_queue?.command ?? '')
        && /check:launch-action-report/.test(payload.public_status_handles?.launch_blocker_action_queue?.command ?? ''),
      'Launch blocker action queue public handle must point at the focused launch action report/check.',
    );
    assert(payload.public_status_handles?.launch_blocker_action_queue?.sourceManifestPath === 'launch_action_queue', 'Launch blocker action queue public handle must point at launch_action_queue.');
    assert(payload.public_status_handles?.launch_action_operator_handoff_packet?.sourceManifestPath === 'launch_action_queue.operator_handoff_packet', 'Launch action operator handoff public handle must point at launch_action_queue.operator_handoff_packet.');
    assert(Array.isArray(payload.public_status_handles?.launch_action_operator_handoff_packet?.sourceProofTypes) && payload.public_status_handles.launch_action_operator_handoff_packet.sourceProofTypes.includes('launch_action_operator_handoff_packet'), 'Launch action operator handoff public handle must expose operator handoff lineage.');
    assert(/does not commit|clear source provenance|checkout branches|merge|push|contact buyers|authorize Supabase|request owner approval|deploy|hosted\/live parity|commercial launch readiness/i.test(payload.proof_boundary ?? ''), 'Focused proof boundary must not imply mutation, external action, deploy, live parity, or launch readiness.');
    assert(/Do not treat this focused report|clean source provenance|production approval|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused stop gate must reject readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Launch action readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch action readiness report check passed: focused action queue, operator handoff packet, lane status summary, command handles, and no-execution boundaries are consistent.');
