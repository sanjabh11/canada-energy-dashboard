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
  corepack pnpm run report:progress-digest-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, branch, or buyer probes.
  --json               Emit the focused progress/bottleneck digest payload as JSON.
  --fail-on-blocker    Exit nonzero while launch blockers remain open.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Progress digest readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

function runNodeScript(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
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

function runManifest() {
  const commandArgs = [];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = runNodeScript('scripts/report-launch-evidence-manifest.mjs', commandArgs);

  if (result.status !== 0) {
    return {
      ok: false,
      error: `Launch evidence manifest exited ${result.status}.`,
      stdout: result.stdout,
      stderr: result.stderr,
      processError: result.error,
    };
  }

  try {
    return { ok: true, manifest: JSON.parse(result.stdout ?? '{}') };
  } catch (error) {
    return {
      ok: false,
      error: `Could not parse launch evidence manifest JSON: ${error.message}`,
      stdout: String(result.stdout ?? '').slice(0, 4000),
      stderr: result.stderr,
      processError: result.error,
    };
  }
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

function progressStatus(manifest) {
  const blockers = manifest.completion_audit?.items?.filter((item) => item?.blocks_goal_completion) ?? [];
  const blockedCount = blockers.filter((item) => item.status !== 'pass' && item.status !== 'present').length;
  return blockedCount > 0 || manifest.launch_decision !== 'commercial-ready' ? 'blocked' : 'pass';
}

function isRemainingAction(item) {
  return !['pass', 'present', 'ready', 'complete', 'completed'].includes(item?.status ?? '');
}

function normalizeAction(item, index, source) {
  return {
    rank: Number.isInteger(item?.rank) ? item.rank : index + 1,
    source,
    phase: item?.phase ?? item?.prerequisite ?? item?.gate ?? item?.check ?? `action_${index + 1}`,
    status: item?.status ?? 'missing',
    proof_type: item?.proof_type ?? 'missing',
    proof_command: item?.proof_command ?? item?.next_proof_command ?? 'missing',
  };
}

function remainingActions(items, source) {
  return (Array.isArray(items) ? items : [])
    .filter(isRemainingAction)
    .map((item, index) => normalizeAction(item, index, source));
}

function deriveActivitiesRemaining(manifest, currentProgressUpdate) {
  const completionBlockers = (manifest.completion_audit?.items ?? [])
    .filter((item) => item?.blocks_goal_completion && item.status !== 'present');
  const currentPhaseActions = remainingActions(manifest.launch_action_queue?.items, 'launch_action_queue');
  const productionActions = remainingActions(manifest.production_approval?.prerequisite_queue?.items, 'production_approval.prerequisite_queue');
  const postDeployActions = remainingActions(manifest.post_deploy_live_proof?.gate_queue?.items, 'post_deploy_live_proof.gate_queue');
  const nextPhaseActions = [...productionActions, ...postDeployActions];
  const status = completionBlockers.length > 0 || currentPhaseActions.length > 0 || nextPhaseActions.length > 0
    ? 'blocked'
    : 'pass';

  return {
    status,
    proof_type: 'activities_remaining_digest',
    current_phase: currentProgressUpdate?.phase ?? 'missing',
    current_phase_action_count: currentPhaseActions.length,
    current_phase_actions: currentPhaseActions,
    next_phase: 'production approval and post-deploy live proof',
    next_phase_action_count: nextPhaseActions.length,
    next_phase_actions: nextPhaseActions,
    completion_blocker_count: completionBlockers.length,
    evidence: 'Activities remaining are derived from launch_action_queue, completion_audit, production_approval.prerequisite_queue, and post_deploy_live_proof.gate_queue without executing any proof commands.',
  };
}

function focusedPayload(manifest) {
  const progressUpdates = Array.isArray(manifest.progress_updates) ? manifest.progress_updates : [];
  const currentProgressUpdate = progressUpdates[0] ?? null;
  const bottleneckLog = Array.isArray(manifest.bottleneck_log) ? manifest.bottleneck_log : [];
  const blockers = manifest.completion_audit?.items?.filter((item) => item?.blocks_goal_completion) ?? [];
  const activitiesRemaining = deriveActivitiesRemaining(manifest, currentProgressUpdate);

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    progress_digest: {
      status: progressStatus(manifest),
      proof_type: 'progress_update_digest',
      update_count: progressUpdates.length,
      blocker_count: blockers.length,
      current_phase: currentProgressUpdate?.phase ?? 'missing',
      current_bottleneck: currentProgressUpdate?.bottleneck ?? 'missing',
      pending: currentProgressUpdate?.pending ?? 'missing',
      target_matrix_count: Array.isArray(currentProgressUpdate?.target_matrix) ? currentProgressUpdate.target_matrix.length : 0,
      evidence: progressUpdates.length > 0
        ? 'Progress digest is present and maps accomplished work, target matrix, pending work, and current bottleneck.'
        : 'Progress digest is missing from the launch evidence manifest.',
    },
    bottleneck_digest: {
      status: bottleneckLog.length > 0 ? 'blocked' : 'missing',
      proof_type: 'bottleneck_log_digest',
      entry_count: bottleneckLog.length,
      current_task_or_subtask: bottleneckLog[0]?.task_or_subtask ?? 'missing',
      affected_lane: bottleneckLog[0]?.affected_lane ?? 'missing',
      elapsed_minutes: bottleneckLog[0]?.elapsed_minutes ?? null,
      last_update: bottleneckLog[0]?.last_update ?? 'missing',
      root_cause: bottleneckLog[0]?.root_cause ?? 'missing',
      top_unblock_option_count: Array.isArray(bottleneckLog[0]?.top_unblock_options) ? bottleneckLog[0].top_unblock_options.length : 0,
      evidence: bottleneckLog.length > 0
        ? 'Bottleneck digest is present and records the active evidence-gap blocker, affected lane, elapsed time, last update, and structured top unblock options.'
        : 'Bottleneck digest is missing from the launch evidence manifest.',
    },
    activities_remaining: activitiesRemaining,
    progress_updates: progressUpdates,
    bottleneck_log: bottleneckLog,
    public_status_handles: {
      progress_update_digest: readPublicStatusHandle('progress_update_digest'),
      bottleneck_log_digest: readPublicStatusHandle('bottleneck_log_digest'),
    },
    package_script_handles: {
      report_progress_digest_readiness: 'corepack pnpm run report:progress-digest-readiness',
      check_progress_digest_report: 'corepack pnpm run check:progress-digest-report',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
      report_commercial_launch_readiness: 'corepack pnpm run report:commercial-launch-readiness',
    },
    proof_boundary: 'Focused progress and bottleneck digest evidence only; this report renders manifest progress updates, bottleneck entries, public status handles, and package-script handles, but it does not complete pending work, clear blockers, run missing checks as clearance, contact buyers, approve branches, authorize Supabase, resolve evidence gaps, request owner approval, deploy, mutate live services, prove hosted/live parity, or create commercial launch readiness.',
    stop_gate: 'Do not treat this focused progress digest report, public status handle, bottleneck options, manifest output, checker pass, or generated Markdown as production approval, buyer acceptance, release readiness, branch approval, Supabase advisor clearance, source readiness, deployment approval, hosted/live parity, or commercial-ready status.',
  };
}

function formatTargetMatrixItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';

  const evidence = Array.isArray(item.evidence)
    ? item.evidence.join(', ')
    : String(item.evidence ?? '');
  const confidence = item.confidence === undefined ? 'n/a' : item.confidence;
  const targetPercent = item.target_percent === undefined ? 'n/a' : item.target_percent;
  const currentPercent = item.current_percent === undefined ? 'n/a' : item.current_percent;

  return `${item.lane ?? 'Unknown lane'} (${item.status ?? 'unknown'}; target ${targetPercent}%; current ${currentPercent}%; confidence ${confidence}): ${evidence}`;
}

function formatUnblockOption(option) {
  if (typeof option === 'string') return option;
  if (!option || typeof option !== 'object') return '';

  return [
    `Action: ${option.action ?? 'missing'}`,
    `Tradeoff: ${option.tradeoff ?? 'missing'}`,
    `Expected time saved: ${option.expected_time_saved ?? 'missing'}`,
    `Risk: ${option.risk ?? 'missing'}`,
  ].join(' ');
}

function renderMarkdown(payload) {
  const progress = payload.progress_digest ?? {};
  const bottleneck = payload.bottleneck_digest ?? {};
  const activities = payload.activities_remaining ?? {};
  const progressRows = (payload.progress_updates ?? []).map((item, index) => [
    index + 1,
    item.phase,
    item.accomplished,
    Array.isArray(item.target_matrix) ? item.target_matrix.map(formatTargetMatrixItem).join('; ') : '',
    item.pending,
    item.bottleneck,
    item.created_at,
  ]);
  const bottleneckRows = (payload.bottleneck_log ?? []).map((item, index) => [
    index + 1,
    item.phase,
    item.task_or_subtask,
    item.affected_lane,
    item.elapsed_minutes,
    item.last_update,
    item.root_cause,
    Array.isArray(item.top_unblock_options) ? item.top_unblock_options.map(formatUnblockOption).join('; ') : '',
  ]);
  const currentActivityRows = (activities.current_phase_actions ?? []).map((item) => [
    item.rank,
    item.source,
    item.phase,
    item.status,
    item.proof_type,
    item.proof_command,
  ]);
  const nextActivityRows = (activities.next_phase_actions ?? []).map((item) => [
    item.rank,
    item.source,
    item.phase,
    item.status,
    item.proof_type,
    item.proof_command,
  ]);
  const publicRows = Object.entries(payload.public_status_handles ?? {}).map(([id, item]) => [
    id,
    item?.status,
    item?.sourceManifestPath,
    item?.command,
    item?.evidenceBoundary,
    item?.nextAction,
  ]);
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Progress Digest Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Progress digest status: \`${progress.status ?? 'unknown'}\``,
    `Activities remaining status: \`${activities.status ?? 'unknown'}\``,
    `Bottleneck digest status: \`${bottleneck.status ?? 'unknown'}\``,
    `Progress update count: \`${progress.update_count ?? 0}\``,
    `Current phase action count: \`${activities.current_phase_action_count ?? 0}\``,
    `Next phase action count: \`${activities.next_phase_action_count ?? 0}\``,
    `Bottleneck entry count: \`${bottleneck.entry_count ?? 0}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Progress Summary',
    '',
    renderTable(
      ['Status', 'Proof Type', 'Current Phase', 'Target Matrix Count', 'Pending', 'Current Bottleneck', 'Evidence'],
      [[progress.status, progress.proof_type, progress.current_phase, progress.target_matrix_count, progress.pending, progress.current_bottleneck, progress.evidence]],
    ),
    '',
    '## Progress Updates',
    '',
    renderTable(['Rank', 'Phase', 'Accomplished', 'Target Matrix', 'Pending', 'Bottleneck', 'Created At'], progressRows),
    '',
    '## Activities Remaining',
    '',
    renderTable(
      ['Status', 'Proof Type', 'Current Phase', 'Current Phase Actions', 'Next Phase', 'Next Phase Actions', 'Completion Blockers', 'Evidence'],
      [[activities.status, activities.proof_type, activities.current_phase, activities.current_phase_action_count, activities.next_phase, activities.next_phase_action_count, activities.completion_blocker_count, activities.evidence]],
    ),
    '',
    '## Current Phase Actions',
    '',
    renderTable(['Rank', 'Source', 'Phase', 'Status', 'Proof Type', 'Proof Command'], currentActivityRows),
    '',
    '## Next Phase Actions',
    '',
    renderTable(['Rank', 'Source', 'Phase', 'Status', 'Proof Type', 'Proof Command'], nextActivityRows),
    '',
    '## Bottleneck Summary',
    '',
    renderTable(
      ['Status', 'Proof Type', 'Current Task Or Subtask', 'Affected Lane', 'Elapsed Minutes', 'Last Update', 'Root Cause', 'Top Unblock Options', 'Evidence'],
      [[bottleneck.status, bottleneck.proof_type, bottleneck.current_task_or_subtask, bottleneck.affected_lane, bottleneck.elapsed_minutes, bottleneck.last_update, bottleneck.root_cause, bottleneck.top_unblock_option_count, bottleneck.evidence]],
    ),
    '',
    '## Bottleneck Log',
    '',
    renderTable(['Rank', 'Phase', 'Task Or Subtask', 'Affected Lane', 'Elapsed Minutes', 'Last Update', 'Root Cause', 'Top Unblock Options'], bottleneckRows),
    '',
    '## Public Release Status Handles',
    '',
    renderTable(['Handle', 'Status', 'Source Manifest Path', 'Command', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Progress digest readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.processError) console.error(`- ${manifestResult.processError}`);
  if (manifestResult.stderr) console.error(manifestResult.stderr.slice(0, 4000));
  process.exit(1);
}

const payload = focusedPayload(manifestResult.manifest);
const output = jsonOutput ? `${JSON.stringify(payload, null, 2)}\n` : renderMarkdown(payload);
const outputPath = values.get('output');
if (outputPath) {
  writeFileSync(path.resolve(repoRoot, outputPath), output, 'utf8');
}

process.stdout.write(output);

if (failOnBlocker && payload.progress_digest.status !== 'pass') {
  process.exit(1);
}
