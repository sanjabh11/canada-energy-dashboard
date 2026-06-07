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
  corepack pnpm run check:post-deploy-live-proof-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-post-deploy-live-proof-readiness.mjs', ...extraArgs];
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
    failures.push(`report-post-deploy-live-proof-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-post-deploy-live-proof-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused post-deploy live proof JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Post-Deploy Live Proof Readiness Report', 'Report must include the focused post-deploy title.');
    assertContains(stdout, 'Post-deploy live proof status:', 'Report must include post-deploy live proof status.');
    assertContains(stdout, 'Current source live-proven:', 'Report must include current-source live proof status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not grant owner approval, deploy, push, rebuild, mutate Netlify', 'Report must preserve no-approval and no-live-mutation boundaries.');
    assertContains(stdout, '## Post-Deploy Live Proof Gate Queue', 'Report must include the post-deploy live proof gate queue.');
    assertContains(stdout, '| Production approval clearance |', 'Report must include the production approval clearance row.');
    assertContains(stdout, '| Guarded production deploy completion |', 'Report must include the guarded deploy completion row.');
    assertContains(stdout, '| Live public metadata |', 'Report must include the live public metadata row.');
    assertContains(stdout, '| Live static dist parity |', 'Report must include the live static parity row.');
    assertContains(stdout, '| Hosted proof-pack route smoke |', 'Report must include the hosted proof-pack smoke row.');
    assertContains(stdout, '| Current-source hosted parity claim |', 'Report must include the current-source hosted parity claim row.');
    assertContains(stdout, 'corepack pnpm run check:post-deploy-live', 'Report must include the full post-deploy proof command.');
    assertContains(stdout, 'corepack pnpm run check:live-public-metadata', 'Report must include the live metadata proof command.');
    assertContains(stdout, 'corepack pnpm run check:live-static-parity', 'Report must include the live static parity proof command.');
    assertContains(stdout, 'corepack pnpm run test:browser:hosted:proof-packs', 'Report must include the hosted proof-pack smoke command.');
    assertContains(stdout, 'DEPLOY CEIP PRODUCTION', 'Report must preserve the explicit deploy phrase boundary.');
    assertContains(stdout, '## Post-Deploy Live Proof Operator Handoff Packet', 'Report must include the post-deploy live proof operator handoff packet.');
    assertContains(stdout, 'post_deploy_live_proof_operator_handoff_packet', 'Report must include the post-deploy operator handoff proof type.');
    assertContains(stdout, 'post_deploy_live_proof.gate_queue.items', 'Report must expose the post-deploy operator packet source.');
    assertContains(stdout, 'Execution Gate', 'Report must render post-deploy operator execution gates.');
    assertContains(stdout, 'Can Execute From Packet', 'Report must render post-deploy operator non-execution boundaries.');
    assertContains(stdout, 'Live Account Required', 'Report must render live-account gating.');
    assertContains(stdout, 'Browser Smoke Required', 'Report must render browser-smoke gating.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public post-deploy live-proof handles.');
    assertContains(stdout, 'post_deploy_live_proof_gate_queue', 'Report must include the post-deploy gate queue public handle.');
    assertContains(stdout, 'post_deploy_live_proof_operator_handoff_packet', 'Report must include the post-deploy operator handoff public handle.');
    assertContains(stdout, 'deployed_artifact_live_parity', 'Report must include the deployed artifact live parity public handle.');
    assertContains(stdout, 'current_source_live_parity', 'Report must include the current source live parity public handle.');
    assertContains(stdout, '## Launch Action Post-Deploy Row', 'Report must include the launch action post-deploy row.');
    assertContains(stdout, '## Production Approval Live Prerequisite', 'Report must include the production approval live prerequisite.');
    assertContains(stdout, '## Production Approval Request Live Row', 'Report must include the production approval request live row.');
    assertContains(stdout, 'post_deploy_boundary', 'Report must classify the request row as post_deploy_boundary.');
  }

  if (payload) {
    const postDeploy = payload.post_deploy_live_proof ?? {};
    const gateQueue = postDeploy.gate_queue ?? {};
    const operatorHandoffPacket = postDeploy.operator_handoff_packet ?? gateQueue.operator_handoff_packet ?? {};
    const items = gateQueue.items ?? [];
    const gates = items.map((item) => item.gate);
    const gatesByName = new Map(items.map((item) => [item.gate, item]));

    assert(payload.schema_version === 1, 'Focused post-deploy live proof JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused post-deploy live proof JSON must preserve the blocked launch decision.');
    assert(postDeploy.current_source_live_proven === false, 'Focused report must not imply current source is live-proven.');
    assert(typeof postDeploy.status === 'string' && postDeploy.status.length > 0, 'post_deploy_live_proof.status must be set.');
    assert(gateQueue.status === 'blocked', 'Post-deploy live proof gate queue must remain blocked before approved deploy evidence.');
    assert(gateQueue.item_count === 6, 'Post-deploy live proof gate queue must include six rows.');
    assert(gateQueue.blocked_count === 6, 'Post-deploy live proof gate queue must keep all six rows blocked before approved deploy evidence.');
    assert(gateQueue.item_count === items.length, 'Post-deploy live proof gate item_count must match items length.');
    assert(gates.join(',') === 'Production approval clearance,Guarded production deploy completion,Live public metadata,Live static dist parity,Hosted proof-pack route smoke,Current-source hosted parity claim', 'Post-deploy live proof gate order must be stable.');
    assert(gatesByName.get('Production approval clearance')?.proof_type === 'manual_approval_gate', 'Production approval clearance must remain a manual approval gate.');
    assert(gatesByName.get('Guarded production deploy completion')?.proof_type === 'approved_deploy_execution', 'Guarded deploy completion must remain approved deploy execution.');
    assert(gatesByName.get('Live public metadata')?.proof_type === 'hosted_metadata_probe', 'Live public metadata must remain a hosted metadata probe.');
    assert(gatesByName.get('Live static dist parity')?.proof_type === 'hosted_static_parity_probe', 'Live static parity must remain a hosted static parity probe.');
    assert(gatesByName.get('Hosted proof-pack route smoke')?.proof_type === 'hosted_browser_smoke', 'Hosted proof-pack route smoke must remain hosted browser smoke.');
    assert(gatesByName.get('Current-source hosted parity claim')?.proof_type === 'post_deploy_parity_claim', 'Current-source hosted parity claim must remain a parity claim row.');
    assert(gatesByName.get('Live public metadata')?.proof_command === 'corepack pnpm run check:live-public-metadata', 'Live metadata proof command must use the package-script handle.');
    assert(gatesByName.get('Live static dist parity')?.proof_command === 'corepack pnpm run check:live-static-parity', 'Live static parity proof command must use the package-script handle.');
    assert(gatesByName.get('Hosted proof-pack route smoke')?.proof_command === 'corepack pnpm run test:browser:hosted:proof-packs', 'Hosted proof-pack smoke proof command must use the package-script handle.');
    assert(gatesByName.get('Current-source hosted parity claim')?.proof_command === 'corepack pnpm run check:post-deploy-live', 'Current-source hosted parity proof command must use check:post-deploy-live.');
    assert(gatesByName.get('Guarded production deploy completion')?.approval_required === true, 'Guarded deploy completion must require approval.');
    assert(gatesByName.get('Guarded production deploy completion')?.approval_phrase === 'DEPLOY CEIP PRODUCTION', 'Guarded deploy completion must preserve the typed approval phrase.');
    assert(items.every((item) => item.status !== 'ready'), 'Post-deploy gate rows must remain non-ready until live proof is current.');
    assert(operatorHandoffPacket.proof_type === 'post_deploy_live_proof_operator_handoff_packet', 'Focused JSON must include the post-deploy live proof operator handoff packet.');
    assert(operatorHandoffPacket.source === 'post_deploy_live_proof.gate_queue.items', 'Post-deploy operator handoff packet must link to the gate queue.');
    assert(['ready', 'blocked'].includes(operatorHandoffPacket.status), 'Post-deploy operator handoff packet status must be ready or blocked.');
    assert(Array.isArray(operatorHandoffPacket.items), 'Post-deploy operator handoff packet items must be a list.');
    assert(typeof operatorHandoffPacket.evidence === 'string' && /Post-deploy live proof operator handoff packet/i.test(operatorHandoffPacket.evidence), 'Post-deploy operator handoff packet evidence must be set.');
    assert(typeof operatorHandoffPacket.proof_boundary === 'string' && /planning evidence only|does not grant owner approval|run deploys|mutate Netlify|access live accounts|run browser smoke|hosted\/live parity/i.test(operatorHandoffPacket.proof_boundary), 'Post-deploy operator handoff packet proof_boundary must preserve planning-only live-proof boundaries.');
    assert(typeof operatorHandoffPacket.stop_gate === 'string' && /Do not claim post-deploy live proof|run deploy-production\.sh|netlify deploy|hosted\/live parity/i.test(operatorHandoffPacket.stop_gate), 'Post-deploy operator handoff packet stop_gate must reject deploy and live-parity claims.');
    assert(operatorHandoffPacket.item_count === items.length, 'Post-deploy operator handoff packet item_count must match gate queue items.');
    assert(operatorHandoffPacket.blocked_count === (operatorHandoffPacket.items ?? []).filter((item) => item.blocks_live_proof_gate).length, 'Post-deploy operator handoff packet blocked_count must match blocked handoff rows.');
    assert(operatorHandoffPacket.manual_approval_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'manual_approval_gate').length, 'Post-deploy operator manual_approval_count must match manual approval rows.');
    assert(operatorHandoffPacket.approved_deploy_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'approved_deploy_execution').length, 'Post-deploy operator approved_deploy_count must match deploy rows.');
    assert(operatorHandoffPacket.hosted_probe_count === (operatorHandoffPacket.items ?? []).filter((item) => ['hosted_metadata_probe', 'hosted_static_parity_probe'].includes(item.proof_type)).length, 'Post-deploy operator hosted_probe_count must match hosted probe rows.');
    assert(operatorHandoffPacket.browser_smoke_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'hosted_browser_smoke').length, 'Post-deploy operator browser_smoke_count must match browser smoke rows.');
    assert(operatorHandoffPacket.parity_claim_count === (operatorHandoffPacket.items ?? []).filter((item) => item.proof_type === 'post_deploy_parity_claim').length, 'Post-deploy operator parity_claim_count must match parity claim rows.');
    assert(
      JSON.stringify((operatorHandoffPacket.items ?? []).map((item) => item.gate)) === JSON.stringify(gates),
      'Post-deploy operator handoff packet rows must preserve gate queue order.',
    );
    const operatorRowsByGate = new Map((operatorHandoffPacket.items ?? []).map((item) => [item.gate, item]));
    for (const [index, item] of (operatorHandoffPacket.items ?? []).entries()) {
      const gateRow = items[index] ?? {};
      assert(Number.isInteger(item.rank), `operator_handoff_packet.items[${index}].rank must be an integer.`);
      assert(item.gate === gateRow.gate, `operator_handoff_packet.items[${index}].gate must match the gate queue row.`);
      assert(item.owner === gateRow.owner, `operator_handoff_packet.items[${index}].owner must match the gate queue row.`);
      assert(['ready', 'blocked', 'manual_stop'].includes(item.status), `operator_handoff_packet.items[${index}].status must be ready, blocked, or manual_stop.`);
      assert(typeof item.execution_gate === 'string' && item.execution_gate.length > 0, `operator_handoff_packet.items[${index}].execution_gate must be set.`);
      assert(item.proof_command === gateRow.proof_command, `operator_handoff_packet.items[${index}].proof_command must match the gate queue row.`);
      assert(item.proof_type === gateRow.proof_type, `operator_handoff_packet.items[${index}].proof_type must match the gate queue row.`);
      assert(typeof item.approval_required === 'boolean', `operator_handoff_packet.items[${index}].approval_required must be boolean.`);
      assert(typeof item.deploy_required === 'boolean', `operator_handoff_packet.items[${index}].deploy_required must be boolean.`);
      assert(typeof item.live_account_required === 'boolean', `operator_handoff_packet.items[${index}].live_account_required must be boolean.`);
      assert(typeof item.browser_smoke_required === 'boolean', `operator_handoff_packet.items[${index}].browser_smoke_required must be boolean.`);
      assert(typeof item.blocks_live_proof_gate === 'boolean', `operator_handoff_packet.items[${index}].blocks_live_proof_gate must be boolean.`);
      assert(item.blocks_live_proof_gate === (gateRow.status !== 'ready'), `operator_handoff_packet.items[${index}] must derive blocks_live_proof_gate from gate row status.`);
      assert(item.can_execute_from_packet === false, `operator_handoff_packet.items[${index}] must not be executable from the packet.`);
      assert(typeof item.proof_boundary === 'string' && /planning evidence only|does not grant owner approval|run deploys|mutate Netlify|access live accounts|run browser smoke|hosted\/live parity/i.test(item.proof_boundary), `operator_handoff_packet.items[${index}].proof_boundary must preserve planning-only live-proof boundaries.`);
      assert(typeof item.stop_gate === 'string' && /Do not execute deploy or live-proof work|claim hosted\/live parity|mark this row ready/i.test(item.stop_gate), `operator_handoff_packet.items[${index}].stop_gate must reject packet execution and live-proof claims.`);
    }
    assert(operatorRowsByGate.get('Production approval clearance')?.execution_gate === 'production_approval_clearance_first', 'Post-deploy operator approval row must use production_approval_clearance_first.');
    assert(operatorRowsByGate.get('Guarded production deploy completion')?.execution_gate === 'approved_deploy_after_owner_phrase', 'Post-deploy operator deploy row must use approved_deploy_after_owner_phrase.');
    assert(operatorRowsByGate.get('Guarded production deploy completion')?.approval_required === true, 'Post-deploy operator deploy row must preserve approval_required.');
    assert(operatorRowsByGate.get('Guarded production deploy completion')?.approval_phrase === 'DEPLOY CEIP PRODUCTION', 'Post-deploy operator deploy row must preserve the typed approval phrase.');
    assert(operatorRowsByGate.get('Guarded production deploy completion')?.deploy_required === true, 'Post-deploy operator deploy row must mark deploy_required.');
    assert(operatorRowsByGate.get('Live public metadata')?.execution_gate === 'live_metadata_after_approved_deploy', 'Post-deploy operator metadata row must wait for approved deploy.');
    assert(operatorRowsByGate.get('Live static dist parity')?.execution_gate === 'static_parity_after_metadata_and_build', 'Post-deploy operator static parity row must wait for metadata and build.');
    assert(operatorRowsByGate.get('Hosted proof-pack route smoke')?.execution_gate === 'hosted_smoke_after_deploy', 'Post-deploy operator hosted smoke row must wait for deploy.');
    assert(operatorRowsByGate.get('Hosted proof-pack route smoke')?.browser_smoke_required === true, 'Post-deploy operator hosted smoke row must mark browser_smoke_required.');
    assert(operatorRowsByGate.get('Current-source hosted parity claim')?.execution_gate === 'parity_claim_after_all_live_gates_pass', 'Post-deploy operator parity claim row must wait for all live gates.');
    assert(operatorRowsByGate.get('Current-source hosted parity claim')?.live_account_required === true, 'Post-deploy operator parity row must mark live_account_required.');
    assert(payload.public_status_handles?.post_deploy_live_proof_gate_queue?.id === 'post_deploy_live_proof_gate_queue', 'Focused JSON must include the post-deploy gate queue public handle.');
    assert(payload.public_status_handles?.post_deploy_live_proof_operator_handoff_packet?.id === 'post_deploy_live_proof_operator_handoff_packet', 'Focused JSON must include the post-deploy operator handoff public handle.');
    assert(payload.public_status_handles?.deployed_artifact_live_parity?.id === 'deployed_artifact_live_parity', 'Focused JSON must include the deployed artifact live parity public handle.');
    assert(payload.public_status_handles?.current_source_live_parity?.id === 'current_source_live_parity', 'Focused JSON must include the current source live parity public handle.');
    assert(
      /report:post-deploy-live-proof-readiness/.test(payload.public_status_handles?.post_deploy_live_proof_gate_queue?.command ?? '')
        && /check:post-deploy-live-proof-report/.test(payload.public_status_handles?.post_deploy_live_proof_gate_queue?.command ?? ''),
      'Post-deploy gate queue public handle must point at the focused post-deploy report/check.',
    );
    assert(payload.public_status_handles?.post_deploy_live_proof_operator_handoff_packet?.sourceManifestPath === 'post_deploy_live_proof.operator_handoff_packet', 'Post-deploy operator handoff public handle must point at post_deploy_live_proof.operator_handoff_packet.');
    assert(payload.public_status_handles?.deployed_artifact_live_parity?.command === 'pnpm run check:post-deploy-live', 'Deployed artifact live parity public handle must point at check:post-deploy-live.');
    assert(/report:production-approval-packet/.test(payload.public_status_handles?.current_source_live_parity?.command ?? '') && /check:post-deploy-live/.test(payload.public_status_handles?.current_source_live_parity?.command ?? ''), 'Current source live parity public handle must point at production approval packet and post-deploy live check.');
    assert(Array.isArray(payload.public_status_handles?.post_deploy_live_proof_operator_handoff_packet?.sourceProofTypes) && payload.public_status_handles.post_deploy_live_proof_operator_handoff_packet.sourceProofTypes.includes('post_deploy_live_proof_operator_handoff_packet'), 'Post-deploy operator handoff public handle must expose operator handoff lineage.');
    assert(Array.isArray(payload.public_status_handles?.current_source_live_parity?.sourceProofTypes) && payload.public_status_handles.current_source_live_parity.sourceProofTypes.includes('post_deploy_parity_claim'), 'Current source live parity public handle must expose parity claim lineage.');
    assert(/does not grant owner approval|deploy|mutate Netlify|run browser smoke|prove hosted\/live parity/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must not imply approval, deploy, browser smoke, or live parity.');
    assert(/Do not treat this focused report|production approval|hosted parity|post-deploy live proof/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject live-proof claims from the report itself.');
    assert(payload.launch_action_post_deploy_row?.phase === 'post_deploy_live_proof', 'Focused report JSON must include the launch action post-deploy row.');
    assert(payload.production_approval_live_prerequisite?.prerequisite === 'Post-deploy live proof boundary', 'Focused report JSON must include the production approval post-deploy prerequisite.');
    assert(
      /report:post-deploy-live-proof-readiness/.test(payload.production_approval_live_prerequisite?.proof_command ?? '')
        && /check:post-deploy-live-proof-report/.test(payload.production_approval_live_prerequisite?.proof_command ?? ''),
      'Production approval post-deploy prerequisite must point to the focused post-deploy live-proof report/check.',
    );
    assert(/underlying check:post-deploy-live/i.test(payload.production_approval_live_prerequisite?.needed ?? ''), 'Production approval post-deploy prerequisite must preserve the underlying post-deploy live check requirement.');
    assert(payload.production_approval_request_live_row?.request_phase === 'post_deploy_boundary', 'Focused report JSON must preserve the post-deploy request phase.');
    assert(payload.production_approval_request_live_row?.blocks_request === false, 'Post-deploy request row must not count as a pre-request blocker.');
    assert(
      /report:post-deploy-live-proof-readiness/.test(payload.production_approval_request_live_row?.proof_command ?? '')
        && /check:post-deploy-live-proof-report/.test(payload.production_approval_request_live_row?.proof_command ?? ''),
      'Production approval post-deploy request row must point to the focused post-deploy live-proof report/check.',
    );
    assert(/underlying check:post-deploy-live result/i.test(payload.production_approval_request_live_row?.evidence_to_attach ?? ''), 'Production approval post-deploy request row must preserve the underlying post-deploy live check attachment.');
  }
}

if (failures.length > 0) {
  console.error('Post-deploy live proof readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Post-deploy live proof readiness report check passed: focused post-deploy gate queue, operator handoff packet, production approval rows, package-script handles, and no-live-parity boundaries are consistent.');
