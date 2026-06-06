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
  corepack pnpm run report:post-deploy-live-proof-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack or Git LFS probes.
  --json               Emit the focused post-deploy live-proof payload as JSON.
  --fail-on-blocker    Exit nonzero when post_deploy_live_proof.status is not pass.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Post-deploy live proof readiness report failed:\n');
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
  const postDeployLiveProof = manifest.post_deploy_live_proof ?? {};
  const gateQueue = postDeployLiveProof.gate_queue ?? {};
  const launchRows = manifest.launch_action_queue?.items ?? [];
  const prerequisiteRows = manifest.production_approval?.prerequisite_queue?.items ?? [];
  const requestRows = manifest.production_approval?.request_packet?.items ?? [];
  const gateRows = gateQueue.items ?? [];
  const gateByName = new Map(gateRows.map((item) => [item.gate, item]));

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    post_deploy_live_proof: postDeployLiveProof,
    package_script_handles: {
      check_post_deploy_live: gateByName.get('Current-source hosted parity claim')?.proof_command ?? 'corepack pnpm run check:post-deploy-live',
      check_live_public_metadata: gateByName.get('Live public metadata')?.proof_command ?? 'corepack pnpm run check:live-public-metadata',
      check_live_static_parity: gateByName.get('Live static dist parity')?.proof_command ?? 'corepack pnpm run check:live-static-parity',
      test_browser_hosted_proof_packs: gateByName.get('Hosted proof-pack route smoke')?.proof_command ?? 'corepack pnpm run test:browser:hosted:proof-packs',
      deploy_completion: gateByName.get('Guarded production deploy completion')?.proof_command ?? 'corepack pnpm run check:production-deploy-request && scripts/deploy-production.sh',
    },
    launch_action_post_deploy_row: findByKey(launchRows, 'phase', 'post_deploy_live_proof'),
    production_approval_live_prerequisite: findByKey(prerequisiteRows, 'prerequisite', 'Post-deploy live proof boundary'),
    production_approval_request_live_row: findByKey(requestRows, 'prerequisite', 'Post-deploy live proof boundary'),
    production_approval_request_packet: manifest.production_approval?.request_packet ?? null,
    proof_boundary: 'Focused post-deploy live-proof evidence only; this report does not grant owner approval, deploy, push, rebuild, mutate Netlify, access live accounts, run browser smoke, or prove hosted/live parity.',
    stop_gate: 'Do not treat this focused report, JSON output, skipped probes, public status handle, or check pass as production approval, deployment, current-source hosted parity, commercial-ready status, or post-deploy live proof.',
  };
}

function renderMarkdown(payload) {
  const postDeployLiveProof = payload.post_deploy_live_proof ?? {};
  const gateQueue = postDeployLiveProof.gate_queue ?? {};
  const operatorHandoffPacket = postDeployLiveProof.operator_handoff_packet ?? gateQueue.operator_handoff_packet ?? {};
  const gateRows = (gateQueue.items ?? []).map((item) => [
    item.rank,
    item.gate,
    item.current,
    item.needed,
    item.owner,
    item.proof_command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
    item.status,
  ]);
  const operatorHandoffRows = (operatorHandoffPacket.items ?? []).map((item) => [
    item.rank,
    item.gate,
    item.owner,
    item.status,
    item.execution_gate,
    item.proof_command,
    item.proof_type,
    item.approval_required ? 'yes' : 'no',
    item.deploy_required ? 'yes' : 'no',
    item.live_account_required ? 'yes' : 'no',
    item.browser_smoke_required ? 'yes' : 'no',
    item.blocks_live_proof_gate ? 'yes' : 'no',
    item.can_execute_from_packet ? 'yes' : 'no',
    item.approval_phrase ?? '-',
    item.execution_command ?? '-',
    item.proof_boundary,
    item.stop_gate,
  ]);
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);
  const launchActionRow = payload.launch_action_post_deploy_row
    ? [[
      payload.launch_action_post_deploy_row.rank,
      payload.launch_action_post_deploy_row.phase,
      payload.launch_action_post_deploy_row.blocker,
      payload.launch_action_post_deploy_row.owner,
      payload.launch_action_post_deploy_row.action,
      payload.launch_action_post_deploy_row.proof_command,
      payload.launch_action_post_deploy_row.proof_type,
      payload.launch_action_post_deploy_row.proof_boundary,
      payload.launch_action_post_deploy_row.stop_gate,
      payload.launch_action_post_deploy_row.status,
    ]]
    : [['n/a', 'post_deploy_live_proof', 'missing', 'operator', 'Regenerate the launch evidence manifest.', 'corepack pnpm run report:launch-evidence-manifest', 'post_deploy_live_proof_gate', payload.proof_boundary, payload.stop_gate, 'missing']];
  const prerequisiteRow = payload.production_approval_live_prerequisite
    ? [[
      payload.production_approval_live_prerequisite.rank,
      payload.production_approval_live_prerequisite.prerequisite,
      payload.production_approval_live_prerequisite.current,
      payload.production_approval_live_prerequisite.needed,
      payload.production_approval_live_prerequisite.owner,
      payload.production_approval_live_prerequisite.proof_command,
      payload.production_approval_live_prerequisite.proof_type,
      payload.production_approval_live_prerequisite.proof_boundary,
      payload.production_approval_live_prerequisite.stop_gate,
      payload.production_approval_live_prerequisite.status,
    ]]
    : [['n/a', 'Post-deploy live proof boundary', 'missing', 'Regenerate the launch evidence manifest.', 'operator', 'corepack pnpm run check:post-deploy-live', 'post_deploy_live_proof_gate', payload.proof_boundary, payload.stop_gate, 'missing']];
  const requestRow = payload.production_approval_request_live_row
    ? [[
      payload.production_approval_request_live_row.rank,
      payload.production_approval_request_live_row.prerequisite,
      payload.production_approval_request_live_row.request_phase,
      payload.production_approval_request_live_row.current,
      payload.production_approval_request_live_row.needed,
      payload.production_approval_request_live_row.owner,
      payload.production_approval_request_live_row.evidence_to_attach,
      payload.production_approval_request_live_row.proof_command,
      payload.production_approval_request_live_row.request_impact,
      payload.production_approval_request_live_row.status,
      payload.production_approval_request_live_row.blocks_request ? 'yes' : 'no',
    ]]
    : [['n/a', 'Post-deploy live proof boundary', 'post_deploy_boundary', 'missing', 'Regenerate the launch evidence manifest.', 'operator', 'No request row captured.', 'corepack pnpm run check:post-deploy-live', 'No request impact captured.', 'missing', 'no']];

  return `${[
    '# CEIP Post-Deploy Live Proof Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Post-deploy live proof status: \`${postDeployLiveProof.status ?? 'unknown'}\``,
    `Current source live-proven: \`${postDeployLiveProof.current_source_live_proven === true ? 'true' : 'false'}\``,
    `Open post-deploy live-proof gates: \`${gateQueue.blocked_count ?? 'unknown'}/${gateQueue.item_count ?? 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Gate queue status: \`${gateQueue.status ?? 'unknown'}\``,
    `- Full post-deploy command: \`${payload.package_script_handles?.check_post_deploy_live ?? 'corepack pnpm run check:post-deploy-live'}\``,
    `- Approval state: \`${payload.production_approval_request_packet?.status ?? 'unknown'}\``,
    `- Operator handoff packet: \`${operatorHandoffPacket.status ?? 'unknown'}; blocked=${operatorHandoffPacket.blocked_count ?? 'unknown'}/${operatorHandoffPacket.item_count ?? 'unknown'}\``,
    `- Live proof evidence: ${postDeployLiveProof.evidence ?? 'No post-deploy live proof evidence captured.'}`,
    '',
    '## Post-Deploy Live Proof Gate Queue',
    '',
    renderTable(
      ['Rank', 'Gate', 'Current', 'Needed', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      gateRows.length > 0
        ? gateRows
        : [['n/a', 'none', 'post-deploy live proof queue missing', 'Regenerate launch evidence manifest before live parity claims.', 'operator', 'corepack pnpm run check:post-deploy-live', 'post_deploy_live_proof_gate', payload.proof_boundary, payload.stop_gate, 'missing']],
    ),
    '',
    '## Post-Deploy Live Proof Operator Handoff Packet',
    '',
    operatorHandoffPacket.evidence ?? 'Post-deploy live proof operator handoff packet missing.',
    '',
    `Proof type: ${operatorHandoffPacket.proof_type ?? 'unknown'}`,
    `Source: ${operatorHandoffPacket.source ?? 'unknown'}`,
    `Boundary: ${operatorHandoffPacket.proof_boundary ?? 'unknown'}`,
    `Stop gate: ${operatorHandoffPacket.stop_gate ?? 'unknown'}`,
    '',
    renderTable(
      ['Rank', 'Gate', 'Owner', 'Status', 'Execution Gate', 'Proof Command', 'Proof Type', 'Approval Required', 'Deploy Required', 'Live Account Required', 'Browser Smoke Required', 'Blocks Live Proof Gate', 'Can Execute From Packet', 'Approval Phrase', 'Execution Command', 'Proof Boundary', 'Stop Gate'],
      operatorHandoffRows,
    ),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
    '## Launch Action Post-Deploy Row',
    '',
    renderTable(
      ['Rank', 'Phase', 'Blocker', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      launchActionRow,
    ),
    '',
    '## Production Approval Live Prerequisite',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Current', 'Needed', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      prerequisiteRow,
    ),
    '',
    '## Production Approval Request Live Row',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Request Phase', 'Current', 'Needed', 'Owner', 'Evidence To Attach', 'Proof Command', 'Request Impact', 'Status', 'Blocks Request'],
      requestRow,
    ),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Post-deploy live proof readiness report failed:\n');
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

const blocked = payload.post_deploy_live_proof?.status !== 'pass'
  || payload.post_deploy_live_proof?.current_source_live_proven !== true
  || payload.post_deploy_live_proof?.operator_handoff_packet?.status !== 'ready';

if (failOnBlocker && blocked) {
  console.error(`Post-deploy live proof remains ${payload.post_deploy_live_proof?.status ?? 'unknown'}; this report does not deploy or prove hosted/live parity.`);
  process.exit(1);
}
