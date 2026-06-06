#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
let skipProbes = false;
let jsonOutput = false;
let failOnBlocker = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--json') {
    jsonOutput = true;
    continue;
  }
  if (arg === '--fail-on-blocker') {
    failOnBlocker = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!['output'].includes(key)) {
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

function printUsage() {
  console.log(`Usage:
  corepack pnpm run report:production-approval-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack or Git LFS probes.
  --json               Emit the focused production-approval payload as JSON.
  --fail-on-blocker    Exit nonzero when production approval request is not eligible.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Production approval readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function runManifest() {
  const commandArgs = ['scripts/report-launch-evidence-manifest.mjs'];
  if (skipProbes) commandArgs.push('--skip-probes');

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
  });

  if (result.error) {
    return {
      ok: false,
      error: String(result.error.message ?? result.error),
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error: `Launch evidence manifest exited ${result.status ?? 1}.`,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  }
  try {
    return { ok: true, manifest: JSON.parse(result.stdout ?? '{}') };
  } catch (error) {
    return {
      ok: false,
      error: `Could not parse launch evidence manifest JSON: ${error.message}`,
      stdout: String(result.stdout ?? '').slice(0, 4000),
      stderr: result.stderr ?? '',
    };
  }
}

function cell(value) {
  const text = String(value ?? '-')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return text || '-';
}

function renderTable(headers, rows) {
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

function findByKey(items, key, value) {
  return (items ?? []).find((item) => item?.[key] === value) ?? null;
}

function focusedPayload(manifest) {
  const productionApproval = manifest.production_approval ?? {};
  const prerequisiteQueue = productionApproval.prerequisite_queue ?? {};
  const requestPacket = productionApproval.request_packet ?? {};
  const launchRows = manifest.launch_action_queue?.items ?? [];
  const releaseRows = manifest.release_preflight?.items ?? [];

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    production_approval: productionApproval,
    package_script_handles: {
      report_production_approval_packet: 'corepack pnpm run report:production-approval-packet',
      check_production_deploy_request: 'corepack pnpm run check:production-deploy-request',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
    },
    launch_action_production_approval_row: findByKey(launchRows, 'phase', 'production_approval'),
    release_preflight_owner_approval_row: findByKey(releaseRows, 'requirement', 'Explicit owner production approval'),
    post_deploy_live_proof: {
      status: manifest.post_deploy_live_proof?.status ?? null,
      current_source_live_proven: manifest.post_deploy_live_proof?.current_source_live_proven ?? null,
      evidence: manifest.post_deploy_live_proof?.evidence ?? '',
      stop_gate: manifest.post_deploy_live_proof?.stop_gate ?? '',
    },
    proof_boundary: 'Focused production-approval evidence only; this report does not grant owner approval, request owner approval, run deploys, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, run release-readiness, or prove hosted/live parity.',
    stop_gate: 'Do not treat this focused report, JSON output, skipped probes, public status handle, or check pass as production approval, deploy authorization, clean source provenance, buyer acceptance, release-readiness, current-source hosted parity, or commercial-ready status.',
  };
}

function renderMarkdown(payload) {
  const productionApproval = payload.production_approval ?? {};
  const prerequisiteQueue = productionApproval.prerequisite_queue ?? {};
  const requestPacket = productionApproval.request_packet ?? {};
  const operatorHandoffPacket = productionApproval.operator_handoff_packet ?? requestPacket.operator_handoff_packet ?? {};
  const prerequisiteRows = (prerequisiteQueue.items ?? []).map((item) => [
    item.rank,
    item.prerequisite,
    item.current,
    item.needed,
    item.owner,
    item.proof_command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
    item.status,
  ]);
  const requestRows = (requestPacket.items ?? []).map((item) => [
    item.rank,
    item.prerequisite,
    item.request_phase,
    item.current,
    item.needed,
    item.owner,
    item.evidence_to_attach,
    item.proof_command,
    item.request_impact,
    item.source_status,
    item.status,
    item.blocks_request ? 'yes' : 'no',
  ]);
  const operatorHandoffRows = (operatorHandoffPacket.items ?? []).map((item) => [
    item.rank,
    item.prerequisite,
    item.request_phase,
    item.owner,
    item.status,
    item.source_status,
    item.execution_gate,
    item.proof_command,
    item.proof_type,
    item.blocks_approval_request ? 'yes' : 'no',
    item.owner_decision_required ? 'yes' : 'no',
    item.post_deploy_boundary ? 'yes' : 'no',
    item.can_execute_from_packet ? 'yes' : 'no',
    item.proof_boundary,
    item.stop_gate,
  ]);
  const launchActionRows = payload.launch_action_production_approval_row
    ? [[
      payload.launch_action_production_approval_row.rank,
      payload.launch_action_production_approval_row.phase,
      payload.launch_action_production_approval_row.blocker,
      payload.launch_action_production_approval_row.owner,
      payload.launch_action_production_approval_row.action,
      payload.launch_action_production_approval_row.proof_command,
      payload.launch_action_production_approval_row.proof_type,
      payload.launch_action_production_approval_row.proof_boundary,
      payload.launch_action_production_approval_row.stop_gate,
      payload.launch_action_production_approval_row.status,
    ]]
    : [['n/a', 'production_approval', 'missing', 'owner', 'Regenerate the launch evidence manifest.', 'corepack pnpm run report:launch-evidence-manifest', 'manual_approval_gate', payload.proof_boundary, payload.stop_gate, 'missing']];
  const releaseOwnerRows = payload.release_preflight_owner_approval_row
    ? [[
      payload.release_preflight_owner_approval_row.requirement,
      payload.release_preflight_owner_approval_row.current,
      payload.release_preflight_owner_approval_row.needed,
      payload.release_preflight_owner_approval_row.proof_type,
      payload.release_preflight_owner_approval_row.proof_boundary,
      payload.release_preflight_owner_approval_row.stop_gate,
      payload.release_preflight_owner_approval_row.status,
    ]]
    : [['Explicit owner production approval', 'missing', 'Regenerate the launch evidence manifest.', 'manual_approval', payload.proof_boundary, payload.stop_gate, 'missing']];
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Production Approval Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Production approval status: \`${productionApproval.status ?? 'unknown'}\``,
    `Explicit owner approval: \`${productionApproval.explicit_owner_approval === true ? 'true' : 'false'}\``,
    `Request packet status: \`${requestPacket.status ?? 'unknown'}\``,
    `Request eligible: \`${requestPacket.request_eligible === true ? 'yes' : 'no'}\``,
    `Open prerequisite rows: \`${prerequisiteQueue.blocked_count ?? 'unknown'}/${prerequisiteQueue.item_count ?? 'unknown'}\``,
    `Open pre-request blockers: \`${requestPacket.request_blocking_count ?? 'unknown'}/${requestPacket.item_count ?? 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Prerequisite queue: ${prerequisiteQueue.evidence ?? 'No production approval prerequisite queue evidence captured.'}`,
    `- Request packet: ${requestPacket.evidence ?? 'No production approval request packet evidence captured.'}`,
    `- Operator handoff packet: \`${operatorHandoffPacket.status ?? 'unknown'}; request_blocking=${operatorHandoffPacket.request_blocking_count ?? 'unknown'}/${operatorHandoffPacket.item_count ?? 'unknown'}\``,
    `- Post-deploy live proof: ${payload.post_deploy_live_proof?.evidence ?? 'No post-deploy live proof evidence captured.'}`,
    '',
    '## Production Approval Prerequisite Queue',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Current', 'Needed', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      prerequisiteRows.length > 0
        ? prerequisiteRows
        : [['n/a', 'none', 'production approval queue missing', 'Regenerate launch evidence manifest before requesting approval.', 'operator', 'corepack pnpm run report:launch-evidence-manifest', 'production_approval_prerequisite', payload.proof_boundary, payload.stop_gate, 'missing']],
    ),
    '',
    '## Production Approval Request Packet',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Request Phase', 'Current', 'Needed', 'Owner', 'Evidence To Attach', 'Proof Command', 'Request Impact', 'Source Status', 'Packet Status', 'Blocks Request'],
      requestRows.length > 0
        ? requestRows
        : [['n/a', 'none', 'missing', 'production approval request packet missing', 'Regenerate launch evidence manifest before requesting approval.', 'operator', 'No request evidence captured.', 'corepack pnpm run report:launch-evidence-manifest', 'No request impact captured.', 'unknown', 'missing', 'yes']],
    ),
    '',
    '## Production Approval Operator Handoff Packet',
    '',
    `Evidence: ${operatorHandoffPacket.evidence ?? 'No production approval operator handoff packet evidence captured.'}`,
    '',
    `Proof type: \`${operatorHandoffPacket.proof_type ?? 'unknown'}\``,
    `Source: \`${operatorHandoffPacket.source ?? 'unknown'}\``,
    `Proof boundary: ${operatorHandoffPacket.proof_boundary ?? payload.proof_boundary}`,
    `Stop gate: ${operatorHandoffPacket.stop_gate ?? payload.stop_gate}`,
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Request Phase', 'Owner', 'Status', 'Source Status', 'Execution Gate', 'Proof Command', 'Proof Type', 'Blocks Approval Request', 'Owner Decision Required', 'Post Deploy Boundary', 'Can Execute From Packet', 'Proof Boundary', 'Stop Gate'],
      operatorHandoffRows.length > 0
        ? operatorHandoffRows
        : [['n/a', 'none', 'missing', 'operator', 'missing', 'unknown', 'production_approval_prerequisite_review', 'corepack pnpm run report:launch-evidence-manifest', 'production_approval_operator_handoff_packet', 'yes', 'no', 'no', 'no', payload.proof_boundary, payload.stop_gate]],
    ),
    '',
    '## Launch Action Production Approval Row',
    '',
    renderTable(
      ['Rank', 'Phase', 'Blocker', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      launchActionRows,
    ),
    '',
    '## Release Preflight Owner Approval Row',
    '',
    renderTable(
      ['Requirement', 'Current', 'Needed', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      releaseOwnerRows,
    ),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Production approval readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.stderr?.trim()) console.error(manifestResult.stderr.trim());
  if (manifestResult.stdout?.trim()) console.error(manifestResult.stdout.trim().slice(0, 4000));
  process.exit(1);
}

const payload = focusedPayload(manifestResult.manifest);
const output = jsonOutput
  ? `${JSON.stringify(payload, null, 2)}\n`
  : renderMarkdown(payload);

if (values.has('output')) {
  writeFileSync(values.get('output'), output, 'utf8');
}

process.stdout.write(output);

const blocked = payload.production_approval?.request_packet?.request_eligible !== true
  || payload.production_approval?.request_packet?.status !== 'ready_to_request'
  || payload.production_approval?.operator_handoff_packet?.status !== 'ready_to_request'
  || payload.production_approval?.explicit_owner_approval !== true;

if (failOnBlocker && blocked) {
  console.error(`Production approval remains ${payload.production_approval?.status ?? 'unknown'}; this report does not grant approval, deploy, or prove hosted/live parity.`);
  process.exit(1);
}
