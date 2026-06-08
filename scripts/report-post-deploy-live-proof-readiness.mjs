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
let includeLiveProbes = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--include-live-probes') {
    includeLiveProbes = true;
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
  --include-live-probes
                       Run live metadata, static parity, and hosted proof-pack smoke probes and attach a snapshot.
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

const liveProbeDefinitions = [
  {
    gate: 'Live public metadata',
    command: ['pnpm', 'run', 'check:live-public-metadata'],
    proof_type: 'hosted_metadata_probe',
    proof_boundary: 'Checks current hosted metadata only; it does not prove exact static parity, hosted route smoke, approval, deploy completion, or current-source hosted parity.',
  },
  {
    gate: 'Live static dist parity',
    command: ['pnpm', 'run', 'check:live-static-parity'],
    proof_type: 'hosted_static_parity_probe',
    proof_boundary: 'Compares hosted static files to the current local dist artifact; a mismatch blocks current-source hosted parity and does not request or run a deploy.',
  },
  {
    gate: 'Hosted proof-pack route smoke',
    command: ['pnpm', 'run', 'test:browser:hosted:proof-packs'],
    proof_type: 'hosted_browser_smoke',
    proof_boundary: 'Runs hosted browser smoke for proof-pack routes only; route smoke does not prove exact static parity, owner approval, deploy completion, or buyer evidence.',
  },
];

function commandText(command) {
  return command.join(' ');
}

function cleanOutput(value) {
  return String(value ?? '')
    .replace(/\u001B\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\r/g, '')
    .trim();
}

function excerpt(value, maxLength = 1400) {
  const text = cleanOutput(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 15).trimEnd()} ... [truncated]`;
}

function probeStatus(result) {
  if (result.error) return 'tooling_blocked';
  if (result.status === 0) return 'pass';
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/Executable doesn't exist|playwright install|command not found|not found/i.test(combined)) {
    return 'tooling_blocked';
  }
  return 'failed';
}

function skippedLiveProbeSnapshot() {
  return {
    status: 'not_run',
    requested: false,
    proof_type: 'current_live_probe_snapshot',
    generated_at: null,
    probe_count: liveProbeDefinitions.length,
    pass_count: 0,
    failed_count: 0,
    tooling_blocked_count: 0,
    items: liveProbeDefinitions.map((probe) => ({
      gate: probe.gate,
      status: 'not_run',
      command: commandText(probe.command),
      exit_code: null,
      duration_ms: null,
      proof_type: probe.proof_type,
      proof_boundary: probe.proof_boundary,
      stdout_excerpt: '',
      stderr_excerpt: '',
      evidence: 'Live probe was not run; use --include-live-probes to attach current hosted evidence.',
    })),
    evidence: 'Current live probes were not run for the default focused report; use --include-live-probes to attach live metadata, static parity, and hosted proof-pack smoke results.',
    proof_boundary: 'The default focused report is non-mutating and does not run live probes, deploy, push, rebuild, mutate Netlify, grant owner approval, or prove hosted/live parity.',
    stop_gate: 'Do not claim current-source hosted parity from this report unless --include-live-probes is run and the underlying post-deploy live gate passes after explicit approval and guarded deploy completion.',
  };
}

function runLiveProbeSnapshot() {
  const generatedAt = new Date().toISOString();
  const items = liveProbeDefinitions.map((probe) => {
    const startedAt = Date.now();
    const result = spawnSync(probe.command[0], probe.command.slice(1), {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      maxBuffer: 30 * 1024 * 1024,
    });
    const status = probeStatus(result);
    const durationMs = Date.now() - startedAt;
    return {
      gate: probe.gate,
      status,
      command: commandText(probe.command),
      exit_code: typeof result.status === 'number' ? result.status : null,
      duration_ms: durationMs,
      proof_type: probe.proof_type,
      proof_boundary: probe.proof_boundary,
      stdout_excerpt: excerpt(result.stdout),
      stderr_excerpt: excerpt(result.stderr),
      evidence: status === 'pass'
        ? `${probe.gate} passed in ${durationMs}ms.`
        : `${probe.gate} did not pass in ${durationMs}ms; inspect stdout/stderr excerpts before making live-parity claims.`,
    };
  });
  const passCount = items.filter((item) => item.status === 'pass').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const toolingBlockedCount = items.filter((item) => item.status === 'tooling_blocked').length;
  const status = passCount === items.length ? 'pass' : 'blocked';

  return {
    status,
    requested: true,
    proof_type: 'current_live_probe_snapshot',
    generated_at: generatedAt,
    probe_count: items.length,
    pass_count: passCount,
    failed_count: failedCount,
    tooling_blocked_count: toolingBlockedCount,
    items,
    evidence: `Current live probe snapshot: status=${status} pass=${passCount}/${items.length} failed=${failedCount} tooling_blocked=${toolingBlockedCount}.`,
    proof_boundary: 'This optional snapshot runs live probes and records their current outputs only; it does not grant owner approval, deploy, push, rebuild, mutate Netlify, contact buyers, clear Supabase advisor gates, or prove current-source hosted parity by itself.',
    stop_gate: 'Do not treat a partial snapshot, stale snapshot, route-smoke pass, metadata pass, static-parity mismatch, or tooling-blocked row as production approval, deploy completion, buyer evidence, or current-source hosted parity.',
  };
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
    public_status_handles: {
      post_deploy_live_proof_gate_queue: readPublicStatusHandle('post_deploy_live_proof_gate_queue'),
      post_deploy_live_proof_operator_handoff_packet: readPublicStatusHandle('post_deploy_live_proof_operator_handoff_packet'),
      deployed_artifact_live_parity: readPublicStatusHandle('deployed_artifact_live_parity'),
      current_source_live_parity: readPublicStatusHandle('current_source_live_parity'),
    },
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
    current_live_probe_snapshot: includeLiveProbes ? runLiveProbeSnapshot() : skippedLiveProbeSnapshot(),
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
  const publicRows = Object.entries(payload.public_status_handles ?? {}).map(([id, item]) => [
    id,
    item?.status,
    item?.command,
    item?.sourceManifestPath,
    Array.isArray(item?.sourceProofTypes)
      ? item.sourceProofTypes.join(', ')
      : item?.sourceProofType ?? '',
    item?.evidenceBoundary,
    item?.nextAction,
  ]);
  const currentLiveProbeSnapshot = payload.current_live_probe_snapshot ?? {};
  const currentLiveProbeRows = (currentLiveProbeSnapshot.items ?? []).map((item) => [
    item.gate,
    item.status,
    item.command,
    item.exit_code ?? '-',
    item.duration_ms ?? '-',
    item.proof_type,
    item.evidence,
    item.stdout_excerpt,
    item.stderr_excerpt,
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
    `- Current live probe snapshot: \`${currentLiveProbeSnapshot.status ?? 'unknown'}; requested=${currentLiveProbeSnapshot.requested === true ? 'yes' : 'no'}; pass=${currentLiveProbeSnapshot.pass_count ?? 0}/${currentLiveProbeSnapshot.probe_count ?? 'unknown'}\``,
    `- Live proof evidence: ${postDeployLiveProof.evidence ?? 'No post-deploy live proof evidence captured.'}`,
    '',
    '## Current Live Probe Snapshot',
    '',
    currentLiveProbeSnapshot.evidence ?? 'Current live probe snapshot missing.',
    '',
    `Proof boundary: ${currentLiveProbeSnapshot.proof_boundary ?? 'unknown'}`,
    `Stop gate: ${currentLiveProbeSnapshot.stop_gate ?? 'unknown'}`,
    '',
    renderTable(
      ['Gate', 'Status', 'Command', 'Exit Code', 'Duration Ms', 'Proof Type', 'Evidence', 'Stdout Excerpt', 'Stderr Excerpt'],
      currentLiveProbeRows.length > 0
        ? currentLiveProbeRows
        : [['none', 'missing', 'pnpm run check:post-deploy-live', '-', '-', 'current_live_probe_snapshot', 'No current live probe rows captured.', '', '']],
    ),
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
    '## Public Release Status Handles',
    '',
    renderTable(['Handle', 'Status', 'Command', 'Source Manifest Path', 'Source Proof Types', 'Evidence Boundary', 'Next Action'], publicRows),
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
