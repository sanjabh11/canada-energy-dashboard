#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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
  corepack pnpm run report:launch-action-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, branch, or buyer probes.
  --json               Emit the focused launch-action payload as JSON.
  --fail-on-blocker    Exit nonzero when any launch action queue row is not ready.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Launch action readiness report failed:\n');
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

function readPublicStatusHandle(id) {
  try {
    const publicManifestPath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
    const publicManifest = JSON.parse(readFileSync(publicManifestPath, 'utf8'));
    return (publicManifest.items ?? []).find((item) => item?.id === id) ?? null;
  } catch {
    return null;
  }
}

function firstOpenAction(items) {
  return (items ?? []).find((item) => item?.status !== 'ready') ?? null;
}

function buyerEvidenceLaneStatus(buyerEvidence = {}) {
  const buyerStatus = buyerEvidence?.status ?? 'unknown';
  const hardGateStatus = buyerEvidence?.hard_gate_deficits?.status ?? 'unknown';
  const acquisitionStatus = buyerEvidence?.acquisition_matrix?.status ?? 'unknown';
  return buyerStatus === 'pass' && hardGateStatus === 'pass' && acquisitionStatus === 'ready'
    ? 'ready'
    : 'blocked';
}

function focusedPayload(manifest) {
  const launchActionQueue = manifest.launch_action_queue ?? {};
  const queueItems = launchActionQueue.items ?? [];
  const firstOpen = firstOpenAction(queueItems);

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    launch_action_queue: launchActionQueue,
    first_open_action: firstOpen,
    lane_status_summary: [
      {
        lane: 'source_provenance',
        status: manifest.source_provenance?.is_dirty ? 'blocked' : 'ready',
        current: manifest.source_provenance?.deploy_gate ?? manifest.source_provenance?.evidence ?? 'source provenance evidence missing',
        proof_command: 'corepack pnpm run report:source-provenance-readiness && corepack pnpm run check:source-provenance-report',
      },
      {
        lane: 'launch_evidence_validation',
        status: 'external_gate',
        current: 'Run manifest validation before any deploy approval request; validation does not grant approval.',
        proof_command: 'corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report',
      },
      {
        lane: 'release_toolchain',
        status: manifest.release_preflight?.status ?? 'unknown',
        current: `open=${manifest.release_preflight?.open_count ?? 'unknown'}; probe_status=${manifest.release_preflight?.toolchain_probe_ledger?.status ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report',
      },
      {
        lane: 'branch_review',
        status: manifest.branch_review?.status ?? 'unknown',
        current: `review_first=${manifest.branch_review?.review_queue?.review_first_count ?? 'unknown'}; canonical_open=${manifest.branch_review?.canonical_head_decisions?.open_count ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report',
      },
      {
        lane: 'supabase_advisor',
        status: manifest.supabase_advisor?.status ?? 'unknown',
        current: `open=${manifest.supabase_advisor?.clearance_deficits?.open_count ?? 'unknown'}; connector_permission=${manifest.supabase_advisor?.connector_permission ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report',
      },
      {
        lane: 'buyer_evidence',
        status: buyerEvidenceLaneStatus(manifest.buyer_evidence),
        current: `open_hard_gate_rows=${manifest.buyer_evidence?.hard_gate_deficits?.open_count ?? 'unknown'}; hard_gate_status=${manifest.buyer_evidence?.hard_gate_deficits?.status ?? 'unknown'}; acquisition_status=${manifest.buyer_evidence?.acquisition_matrix?.status ?? 'unknown'}; phase_f_gate=${manifest.buyer_evidence?.phase_f_gate ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report',
      },
      {
        lane: 'production_approval',
        status: manifest.production_approval?.status ?? 'unknown',
        current: `request_eligible=${manifest.production_approval?.request_packet?.request_eligible === true ? 'yes' : 'no'}; open_prerequisites=${manifest.production_approval?.prerequisite_queue?.blocked_count ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report',
      },
      {
        lane: 'post_deploy_live_proof',
        status: manifest.post_deploy_live_proof?.status ?? 'unknown',
        current: `current_source_live_proven=${manifest.post_deploy_live_proof?.current_source_live_proven === true ? 'yes' : 'no'}; open=${manifest.post_deploy_live_proof?.gate_queue?.blocked_count ?? 'unknown'}`,
        proof_command: 'corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report',
      },
    ],
    public_status_handles: {
      launch_blocker_action_queue: readPublicStatusHandle('launch_blocker_action_queue'),
      launch_action_operator_handoff_packet: readPublicStatusHandle('launch_action_operator_handoff_packet'),
    },
    package_script_handles: {
      report_launch_action_readiness: 'corepack pnpm run report:launch-action-readiness',
      check_launch_action_report: 'corepack pnpm run check:launch-action-report',
      report_launch_evidence_validation_readiness: 'corepack pnpm run report:launch-evidence-validation-readiness',
      check_launch_evidence_validation_report: 'corepack pnpm run check:launch-evidence-validation-report',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
      report_commercial_launch_readiness: 'corepack pnpm run report:commercial-launch-readiness',
      check_commercial_launch_readiness_report: 'corepack pnpm run check:commercial-launch-readiness-report',
    },
    proof_boundary: 'Focused launch-action execution-plan evidence only; this report does not commit, unstage, stash, revert, clear source provenance, run release-readiness, checkout branches, merge, push, contact buyers, authorize Supabase, request owner approval, deploy, mutate live services, prove hosted/live parity, prove launch evidence validation, or create commercial launch readiness.',
    stop_gate: 'Do not treat this focused report, JSON output, skipped probes, public status handle, or check pass as clean source provenance, release-readiness, branch clearance, Supabase advisor clearance, buyer acceptance, production approval, deployment, hosted/live parity, or commercial-ready status.',
  };
}

function renderMarkdown(payload) {
  const queue = payload.launch_action_queue ?? {};
  const items = queue.items ?? [];
  const operatorHandoffPacket = queue.operator_handoff_packet ?? {};
  const actionRows = items.map((item) => [
    item.rank,
    item.phase,
    item.blocker,
    item.owner,
    item.action,
    item.proof_command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
    item.status,
  ]);
  const operatorHandoffRows = (operatorHandoffPacket.items ?? []).map((item) => [
    item.rank,
    item.phase,
    item.owner,
    item.status,
    item.execution_gate,
    item.proof_command,
    item.proof_type,
    item.blocks_launch_clearance ? 'yes' : 'no',
    item.owner_approval_required ? 'yes' : 'no',
    item.external_account_required ? 'yes' : 'no',
    item.buyer_evidence_required ? 'yes' : 'no',
    item.read_only_required ? 'yes' : 'no',
    item.source_provenance_required ? 'yes' : 'no',
    item.release_gate_required ? 'yes' : 'no',
    item.post_deploy_boundary ? 'yes' : 'no',
    item.can_execute_from_packet ? 'yes' : 'no',
    item.proof_boundary,
    item.stop_gate,
  ]);
  const laneRows = (payload.lane_status_summary ?? []).map((item) => [
    item.lane,
    item.status,
    item.current,
    item.proof_command,
  ]);
  const publicRows = Object.entries(payload.public_status_handles ?? {}).map(([id, item]) => [
    id,
    item?.status,
    item?.command,
    item?.sourceManifestPath,
    (item?.sourceProofTypes ?? []).join('; '),
    item?.evidenceBoundary,
    item?.nextAction,
  ]);
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Launch Action Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Launch action queue status: \`${queue.status ?? 'unknown'}\``,
    `Open action rows: \`${queue.blocked_count ?? 'unknown'}/${queue.item_count ?? 'unknown'}\``,
    `First open action: \`${payload.first_open_action?.phase ?? 'none'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Queue evidence: ${queue.evidence ?? 'No launch action queue evidence captured.'}`,
    `- Operator handoff packet: \`${operatorHandoffPacket.status ?? 'unknown'}; blocked=${operatorHandoffPacket.blocked_count ?? 'unknown'}/${operatorHandoffPacket.item_count ?? 'unknown'}\``,
    `- First open action: ${payload.first_open_action ? `${payload.first_open_action.rank}:${payload.first_open_action.phase}:${payload.first_open_action.status}` : 'none'}`,
    '',
    '## Launch Blocker Action Queue',
    '',
    renderTable(
      ['Rank', 'Phase', 'Blocker', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      actionRows.length > 0
        ? actionRows
        : [['n/a', 'queue_missing', 'not available', 'operator', 'Regenerate the launch evidence manifest.', 'corepack pnpm run report:launch-evidence-manifest', 'sequenced_launch_action_queue', payload.proof_boundary, payload.stop_gate, 'missing']],
    ),
    '',
    '## Launch Action Operator Handoff Packet',
    '',
    `Evidence: ${operatorHandoffPacket.evidence ?? 'No launch action operator handoff packet evidence captured.'}`,
    '',
    `Proof type: \`${operatorHandoffPacket.proof_type ?? 'unknown'}\``,
    `Source: \`${operatorHandoffPacket.source ?? 'unknown'}\``,
    `Proof boundary: ${operatorHandoffPacket.proof_boundary ?? payload.proof_boundary}`,
    `Stop gate: ${operatorHandoffPacket.stop_gate ?? payload.stop_gate}`,
    '',
    renderTable(
      ['Rank', 'Phase', 'Owner', 'Status', 'Execution Gate', 'Proof Command', 'Proof Type', 'Blocks Launch Clearance', 'Owner Approval Required', 'External Account Required', 'Buyer Evidence Required', 'Read Only Required', 'Source Provenance Required', 'Release Gate Required', 'Post Deploy Boundary', 'Can Execute From Packet', 'Proof Boundary', 'Stop Gate'],
      operatorHandoffRows.length > 0
        ? operatorHandoffRows
        : [['n/a', 'queue_missing', 'operator', 'missing', 'launch_action_review', 'corepack pnpm run report:launch-evidence-manifest', 'launch_action_operator_handoff_packet', 'yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', payload.proof_boundary, payload.stop_gate]],
    ),
    '',
    '## Lane Status Summary',
    '',
    renderTable(['Lane', 'Status', 'Current', 'Focused Proof Command'], laneRows),
    '',
    '## Public Release Status Handles',
    '',
    renderTable(['Handle', 'Status', 'Command', 'Source Manifest Path', 'Source Proof Types', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Launch action readiness report failed:\n');
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

const blocked = payload.launch_action_queue?.status !== 'ready'
  || payload.launch_action_queue?.blocked_count !== 0
  || payload.launch_action_queue?.operator_handoff_packet?.status !== 'ready';

if (failOnBlocker && blocked) {
  console.error(`Launch action queue remains ${payload.launch_action_queue?.status ?? 'unknown'}; this report does not clear blockers, deploy, or create launch readiness.`);
  process.exit(1);
}
