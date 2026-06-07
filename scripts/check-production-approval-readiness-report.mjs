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
  corepack pnpm run check:production-approval-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-production-approval-readiness.mjs', ...extraArgs];
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
    failures.push(`report-production-approval-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-production-approval-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused production approval JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Production Approval Readiness Report', 'Report must include the focused production approval title.');
    assertContains(stdout, 'Production approval status:', 'Report must include production approval status.');
    assertContains(stdout, 'Explicit owner approval:', 'Report must include explicit owner approval status.');
    assertContains(stdout, 'Request packet status:', 'Report must include request packet status.');
    assertContains(stdout, 'Request eligible:', 'Report must include request eligibility.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not grant owner approval, request owner approval, run deploys', 'Report must preserve no-approval and no-deploy boundaries.');
    assertContains(stdout, '## Production Approval Prerequisite Queue', 'Report must include the prerequisite queue.');
    assertContains(stdout, '| Clean source provenance |', 'Report must include the clean source provenance prerequisite.');
    assertContains(stdout, '| Launch evidence validation |', 'Report must include the launch evidence validation prerequisite.');
    assertContains(stdout, '| Corepack release-readiness |', 'Report must include the Corepack release-readiness prerequisite.');
    assertContains(stdout, '| Canonical branch review |', 'Report must include the canonical branch review prerequisite.');
    assertContains(stdout, '| Supabase advisor clearance |', 'Report must include the Supabase advisor prerequisite.');
    assertContains(stdout, '| Buyer evidence hard gate |', 'Report must include the buyer evidence prerequisite.');
    assertContains(stdout, '| Explicit owner production approval |', 'Report must include the explicit owner approval prerequisite.');
    assertContains(stdout, '| Post-deploy live proof boundary |', 'Report must include the post-deploy live proof prerequisite.');
    assertContains(stdout, '## Production Approval Request Packet', 'Report must include the request packet.');
    assertContains(stdout, 'pre_request', 'Report must include pre-request request phases.');
    assertContains(stdout, 'owner_decision', 'Report must include the owner decision phase.');
    assertContains(stdout, 'post_deploy_boundary', 'Report must include the post-deploy boundary phase.');
    assertContains(stdout, '## Production Approval Operator Handoff Packet', 'Report must include the operator handoff packet.');
    assertContains(stdout, 'production_approval_operator_handoff_packet', 'Report must classify the operator handoff packet proof type.');
    assertContains(stdout, 'production_approval.request_packet.items', 'Report must source the operator handoff packet from request packet rows.');
    assertContains(stdout, 'Execution Gate', 'Report must render operator execution gates.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must render the packet execution boundary.');
    assertContains(stdout, 'Owner Decision Required', 'Report must render the owner-decision flag.');
    assertContains(stdout, 'planning evidence only', 'Report must preserve planning-only operator handoff boundaries.');
    assertContains(stdout, '## Launch Action Production Approval Row', 'Report must include the launch action production approval row.');
    assertContains(stdout, '## Release Preflight Owner Approval Row', 'Report must include the release preflight owner approval row.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public production approval handles.');
    assertContains(stdout, 'production_approval_prerequisite_queue', 'Report must include the production approval prerequisite queue public handle.');
    assertContains(stdout, 'production_approval_request_packet', 'Report must include the production approval request packet public handle.');
    assertContains(stdout, 'production_approval_operator_handoff_packet', 'Report must include the production approval operator handoff public handle.');
    assertContains(stdout, 'corepack pnpm run report:buyer-evidence-gate-readiness', 'Report must include the buyer evidence gate focused command.');
    assertContains(stdout, 'corepack pnpm run check:buyer-evidence-gate-report', 'Report must include the buyer evidence gate checker command.');
    assertContains(stdout, 'corepack pnpm run check:production-deploy-request', 'Report must include the production deploy request command.');
    assertContains(stdout, 'corepack pnpm run report:production-approval-packet', 'Report must include the production approval packet command.');
  }

  if (payload) {
    const productionApproval = payload.production_approval ?? {};
    const prerequisiteQueue = productionApproval.prerequisite_queue ?? {};
    const requestPacket = productionApproval.request_packet ?? {};
    const operatorHandoffPacket = productionApproval.operator_handoff_packet ?? requestPacket.operator_handoff_packet ?? {};
    const prerequisiteItems = prerequisiteQueue.items ?? [];
    const requestItems = requestPacket.items ?? [];
    const operatorItems = operatorHandoffPacket.items ?? [];
    const prerequisites = prerequisiteItems.map((item) => item.prerequisite);
    const prerequisiteRowsByName = new Map(prerequisiteItems.map((item) => [item.prerequisite, item]));
    const requestRowsByPrerequisite = new Map(requestItems.map((item) => [item.prerequisite, item]));
    const operatorRowsByPrerequisite = new Map(operatorItems.map((item) => [item.prerequisite, item]));
    const expectedExecutionGates = {
      'Clean source provenance': 'clean_source_provenance_first',
      'Launch evidence validation': 'attach_manifest_validation_evidence',
      'Corepack release-readiness': 'release_readiness_after_clean_source',
      'Canonical branch review': 'branch_review_before_owner_request',
      'Supabase advisor clearance': 'supabase_advisor_after_authorization',
      'Buyer evidence hard gate': 'buyer_evidence_validation_before_approval',
      'Explicit owner production approval': 'owner_approval_after_pre_request_gates',
      'Post-deploy live proof boundary': 'post_deploy_proof_after_approved_deploy',
    };

    assert(payload.schema_version === 1, 'Focused production approval JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused production approval JSON must preserve the blocked launch decision.');
    assert(productionApproval.explicit_owner_approval === false, 'Focused report must not imply explicit owner approval is granted.');
    assert(productionApproval.status === 'blocked', 'Production approval status must remain blocked before prerequisites clear.');
    assert(prerequisiteQueue.status === 'blocked', 'Production approval prerequisite queue must remain blocked before current evidence clears.');
    assert(prerequisiteQueue.item_count === 8, 'Production approval prerequisite queue must include eight rows.');
    assert(prerequisites.join(',') === 'Clean source provenance,Launch evidence validation,Corepack release-readiness,Canonical branch review,Supabase advisor clearance,Buyer evidence hard gate,Explicit owner production approval,Post-deploy live proof boundary', 'Production approval prerequisite order must remain stable.');
    assert(requestPacket.proof_type === 'production_approval_request_packet', 'Request packet must preserve its proof type.');
    assert(requestPacket.status === 'blocked', 'Request packet must remain blocked while pre-request rows are blocked.');
    assert(requestPacket.request_eligible === false, 'Request packet must remain ineligible while pre-request blockers remain.');
    assert(requestPacket.item_count === prerequisiteQueue.item_count, 'Request packet item count must match prerequisite rows.');
    assert(requestItems.length === prerequisiteItems.length, 'Request packet items must mirror prerequisite rows.');
    assert(requestRowsByPrerequisite.get('Clean source provenance')?.request_phase === 'pre_request', 'Clean source provenance must be a pre-request row.');
    assert(requestRowsByPrerequisite.get('Launch evidence validation')?.request_phase === 'pre_request', 'Launch evidence validation must be a pre-request row.');
    assert(
      /report:launch-evidence-validation-readiness/.test(prerequisiteRowsByName.get('Launch evidence validation')?.proof_command ?? '')
        && /check:launch-evidence-validation-report/.test(prerequisiteRowsByName.get('Launch evidence validation')?.proof_command ?? ''),
      'Launch evidence validation prerequisite must point to the focused validation report/check.',
    );
    assert(
      /report:launch-evidence-validation-readiness/.test(requestRowsByPrerequisite.get('Launch evidence validation')?.proof_command ?? '')
        && /check:launch-evidence-validation-report/.test(requestRowsByPrerequisite.get('Launch evidence validation')?.proof_command ?? ''),
      'Launch evidence validation request row must point to the focused validation report/check.',
    );
    assert(/underlying check:launch-evidence-manifest/i.test(prerequisiteRowsByName.get('Launch evidence validation')?.needed ?? ''), 'Launch evidence validation prerequisite must keep the underlying manifest check requirement.');
    assert(/underlying check:launch-evidence-manifest result/i.test(requestRowsByPrerequisite.get('Launch evidence validation')?.evidence_to_attach ?? ''), 'Launch evidence validation request row must keep the underlying manifest check attachment.');
    assert(requestRowsByPrerequisite.get('Corepack release-readiness')?.request_phase === 'pre_request', 'Corepack release-readiness must be a pre-request row.');
    assert(
      /report:release-preflight/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-preflight-report/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-readiness/.test(prerequisiteRowsByName.get('Corepack release-readiness')?.proof_command ?? ''),
      'Corepack release-readiness prerequisite must point to focused release-preflight proof before guarded release-readiness.',
    );
    assert(
      /report:release-preflight/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-preflight-report/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? '')
        && /check:release-readiness/.test(requestRowsByPrerequisite.get('Corepack release-readiness')?.proof_command ?? ''),
      'Corepack release-readiness request row must point to focused release-preflight proof before guarded release-readiness.',
    );
    assert(requestRowsByPrerequisite.get('Canonical branch review')?.request_phase === 'pre_request', 'Canonical branch review must be a pre-request row.');
    assert(
      /report:branch-review-readiness/.test(prerequisiteRowsByName.get('Canonical branch review')?.proof_command ?? '')
        && /check:branch-review-report/.test(prerequisiteRowsByName.get('Canonical branch review')?.proof_command ?? ''),
      'Canonical branch review prerequisite must point to the focused branch review report/check.',
    );
    assert(
      /report:branch-review-readiness/.test(requestRowsByPrerequisite.get('Canonical branch review')?.proof_command ?? '')
        && /check:branch-review-report/.test(requestRowsByPrerequisite.get('Canonical branch review')?.proof_command ?? ''),
      'Canonical branch review request row must point to the focused branch review report/check.',
    );
    assert(requestRowsByPrerequisite.get('Supabase advisor clearance')?.request_phase === 'pre_request', 'Supabase advisor clearance must be a pre-request row.');
    assert(
      /report:supabase-advisor-readiness/.test(prerequisiteRowsByName.get('Supabase advisor clearance')?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(prerequisiteRowsByName.get('Supabase advisor clearance')?.proof_command ?? ''),
      'Supabase advisor clearance prerequisite must point to the focused Supabase advisor report/check.',
    );
    assert(
      /report:supabase-advisor-readiness/.test(requestRowsByPrerequisite.get('Supabase advisor clearance')?.proof_command ?? '')
        && /check:supabase-advisor-report/.test(requestRowsByPrerequisite.get('Supabase advisor clearance')?.proof_command ?? ''),
      'Supabase advisor clearance request row must point to the focused Supabase advisor report/check.',
    );
    assert(requestRowsByPrerequisite.get('Buyer evidence hard gate')?.request_phase === 'pre_request', 'Buyer evidence hard gate must be a pre-request row.');
    assert(
      /report:buyer-evidence-gate-readiness/.test(prerequisiteRowsByName.get('Buyer evidence hard gate')?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(prerequisiteRowsByName.get('Buyer evidence hard gate')?.proof_command ?? ''),
      'Buyer evidence prerequisite must point to the focused buyer evidence gate report/check.',
    );
    assert(
      /report:buyer-evidence-gate-readiness/.test(requestRowsByPrerequisite.get('Buyer evidence hard gate')?.proof_command ?? '')
        && /check:buyer-evidence-gate-report/.test(requestRowsByPrerequisite.get('Buyer evidence hard gate')?.proof_command ?? ''),
      'Buyer evidence request row must point to the focused buyer evidence gate report/check.',
    );
    assert(requestRowsByPrerequisite.get('Explicit owner production approval')?.request_phase === 'owner_decision', 'Explicit owner approval must be an owner-decision row.');
    assert(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.request_phase === 'post_deploy_boundary', 'Post-deploy live proof must be a post-deploy boundary row.');
    assert(
      /report:post-deploy-live-proof-readiness/.test(prerequisiteRowsByName.get('Post-deploy live proof boundary')?.proof_command ?? '')
        && /check:post-deploy-live-proof-report/.test(prerequisiteRowsByName.get('Post-deploy live proof boundary')?.proof_command ?? ''),
      'Post-deploy live proof prerequisite must point to the focused post-deploy live-proof report/check.',
    );
    assert(
      /report:post-deploy-live-proof-readiness/.test(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.proof_command ?? '')
        && /check:post-deploy-live-proof-report/.test(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.proof_command ?? ''),
      'Post-deploy live proof request row must point to the focused post-deploy live-proof report/check.',
    );
    assert(/underlying check:post-deploy-live/i.test(prerequisiteRowsByName.get('Post-deploy live proof boundary')?.needed ?? ''), 'Post-deploy live proof prerequisite must keep the underlying post-deploy live check requirement.');
    assert(/underlying check:post-deploy-live result/i.test(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.evidence_to_attach ?? ''), 'Post-deploy live proof request row must keep the underlying post-deploy live check attachment.');
    assert(requestRowsByPrerequisite.get('Explicit owner production approval')?.blocks_request === false, 'Owner decision row must not count as a pre-request blocker.');
    assert(requestRowsByPrerequisite.get('Post-deploy live proof boundary')?.blocks_request === false, 'Post-deploy boundary row must not count as a pre-request blocker.');
    assert(requestPacket.request_blocking_count >= 1, 'Request packet must keep pre-request blockers visible.');
    assert(operatorHandoffPacket.proof_type === 'production_approval_operator_handoff_packet', 'Operator handoff packet must preserve its proof type.');
    assert(operatorHandoffPacket.source === 'production_approval.request_packet.items', 'Operator handoff packet must source request packet rows.');
    assert(operatorHandoffPacket.status === 'blocked', 'Operator handoff packet must remain blocked while request rows are blocked.');
    assert(operatorHandoffPacket.item_count === requestItems.length, 'Operator handoff item count must match request rows.');
    assert(operatorItems.length === requestItems.length, 'Operator handoff items must mirror request rows.');
    assert(operatorHandoffPacket.request_blocking_count === operatorItems.filter((item) => item.blocks_approval_request).length, 'Operator handoff request_blocking_count must match blocking rows.');
    assert(operatorHandoffPacket.owner_decision_count === operatorItems.filter((item) => item.owner_decision_required).length, 'Operator handoff owner_decision_count must match owner-decision rows.');
    assert(operatorHandoffPacket.post_deploy_boundary_count === operatorItems.filter((item) => item.post_deploy_boundary).length, 'Operator handoff post_deploy_boundary_count must match post-deploy rows.');
    assert(operatorHandoffPacket.pre_request_count === operatorItems.filter((item) => item.request_phase === 'pre_request').length, 'Operator handoff pre_request_count must match pre-request rows.');
    assert(operatorHandoffPacket.ready_count === operatorItems.filter((item) => item.status === 'ready').length, 'Operator handoff ready_count must match ready rows.');
    assert(operatorHandoffPacket.manual_stop_count === operatorItems.filter((item) => item.status === 'manual_stop').length, 'Operator handoff manual_stop_count must match manual-stop rows.');
    assert(operatorHandoffPacket.blocked_count === operatorItems.filter((item) => item.status !== 'ready').length, 'Operator handoff blocked_count must match non-ready rows.');
    assert(operatorHandoffPacket.evidence.includes('Production approval operator handoff packet'), 'Operator handoff evidence must include a packet marker.');
    assert(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|clear source provenance|hosted\/live parity/i.test(operatorHandoffPacket.proof_boundary ?? ''), 'Operator handoff proof_boundary must preserve planning-only approval boundaries.');
    assert(/Do not request or claim production approval|deploy-production|netlify deploy|contact buyers|access Supabase|hosted\/live parity/i.test(operatorHandoffPacket.stop_gate ?? ''), 'Operator handoff stop_gate must reject approval, deploy, external-account, and live claims.');
    assert(
      operatorItems.map((item) => item.prerequisite).join(',') === requestItems.map((item) => item.prerequisite).join(','),
      'Operator handoff rows must preserve request packet order.',
    );
    for (const [index, item] of operatorItems.entries()) {
      const requestRow = requestItems[index] ?? {};
      assert(Number.isInteger(item.rank), `Operator handoff row ${index} rank must be an integer.`);
      assert(item.prerequisite === requestRow.prerequisite, `Operator handoff row ${index} prerequisite must match request row.`);
      assert(item.request_phase === requestRow.request_phase, `Operator handoff row ${index} request_phase must match request row.`);
      assert(item.owner === requestRow.owner, `Operator handoff row ${index} owner must match request row.`);
      assert(item.status === requestRow.status, `Operator handoff row ${index} status must match request row.`);
      assert(item.source_status === requestRow.source_status, `Operator handoff row ${index} source_status must match request row.`);
      assert(item.proof_command === requestRow.proof_command, `Operator handoff row ${index} proof_command must match request row.`);
      assert(item.proof_type === requestRow.proof_type, `Operator handoff row ${index} proof_type must match request row.`);
      assert(item.blocks_approval_request === requestRow.blocks_request, `Operator handoff row ${index} blocks_approval_request must match request row blocks_request.`);
      assert(item.can_execute_from_packet === false, `Operator handoff row ${index} must not be executable from the packet.`);
      assert(item.execution_gate === expectedExecutionGates[item.prerequisite], `Operator handoff row ${index} must expose the expected execution gate.`);
      assert(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|hosted\/live parity/i.test(item.proof_boundary ?? ''), `Operator handoff row ${index} proof_boundary must preserve planning-only semantics.`);
      assert(/Do not execute approval, deploy, or external-account work|claim readiness|mark this row ready/i.test(item.stop_gate ?? ''), `Operator handoff row ${index} stop_gate must reject packet execution.`);
    }
    assert(operatorRowsByPrerequisite.get('Explicit owner production approval')?.owner_decision_required === true, 'Operator handoff owner decision row must set owner_decision_required.');
    assert(operatorRowsByPrerequisite.get('Post-deploy live proof boundary')?.post_deploy_boundary === true, 'Operator handoff post-deploy row must set post_deploy_boundary.');
    assert(payload.launch_action_production_approval_row?.phase === 'production_approval', 'Focused report JSON must include the launch action production approval row.');
    assert(payload.release_preflight_owner_approval_row?.requirement === 'Explicit owner production approval', 'Focused report JSON must include the release preflight owner approval row.');
    assert(payload.public_status_handles?.production_approval_prerequisite_queue?.id === 'production_approval_prerequisite_queue', 'Focused JSON must include the production approval prerequisite queue public handle.');
    assert(payload.public_status_handles?.production_approval_request_packet?.id === 'production_approval_request_packet', 'Focused JSON must include the production approval request packet public handle.');
    assert(payload.public_status_handles?.production_approval_operator_handoff_packet?.id === 'production_approval_operator_handoff_packet', 'Focused JSON must include the production approval operator handoff public handle.');
    assert(
      /report:production-approval-readiness/.test(payload.public_status_handles?.production_approval_prerequisite_queue?.command ?? '')
        && /check:production-approval-report/.test(payload.public_status_handles?.production_approval_prerequisite_queue?.command ?? ''),
      'Production approval prerequisite queue public handle must point at the focused production approval report/check.',
    );
    assert(
      /report:production-approval-readiness/.test(payload.public_status_handles?.production_approval_request_packet?.command ?? '')
        && /check:production-approval-report/.test(payload.public_status_handles?.production_approval_request_packet?.command ?? '')
        && /check:production-deploy-request/.test(payload.public_status_handles?.production_approval_request_packet?.command ?? ''),
      'Production approval request packet public handle must point at the focused report/check and guarded deploy-request check.',
    );
    assert(payload.public_status_handles?.production_approval_operator_handoff_packet?.sourceManifestPath === 'production_approval.operator_handoff_packet', 'Production approval operator handoff public handle must point at production_approval.operator_handoff_packet.');
    assert(Array.isArray(payload.public_status_handles?.production_approval_request_packet?.sourceProofTypes) && payload.public_status_handles.production_approval_request_packet.sourceProofTypes.includes('production_approval_request_packet'), 'Production approval request packet public handle must expose request packet lineage.');
    assert(Array.isArray(payload.public_status_handles?.production_approval_operator_handoff_packet?.sourceProofTypes) && payload.public_status_handles.production_approval_operator_handoff_packet.sourceProofTypes.includes('production_approval_operator_handoff_packet'), 'Production approval operator handoff public handle must expose operator handoff lineage.');
    assert(payload.package_script_handles?.check_production_deploy_request === 'corepack pnpm run check:production-deploy-request', 'Focused report must expose the production deploy request command handle.');
    assert(/does not grant owner approval|request owner approval|run deploys|clear source provenance|prove hosted\/live parity/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply approval, deploy, source clearance, or live parity.');
    assert(/Do not treat this focused report|production approval|deploy authorization|commercial-ready status/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject approval and readiness claims from the report itself.');
  }
}

if (failures.length > 0) {
  console.error('Production approval readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production approval readiness report check passed: focused prerequisite queue, request packet, operator handoff packet, approval rows, command handles, and no-approval boundaries are consistent.');
