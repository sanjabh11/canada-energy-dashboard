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
  corepack pnpm run report:objective-completion-audit-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, branch, or buyer probes.
  --json               Emit the focused objective completion audit payload as JSON.
  --fail-on-blocker    Exit nonzero while launch blockers remain open.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Objective completion audit readiness report failed:\n');
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

function focusedPayload(manifest) {
  const completionAudit = manifest.completion_audit ?? {};
  const items = Array.isArray(completionAudit.items) ? completionAudit.items : [];
  const blockerItems = items.filter((item) => item?.blocks_goal_completion);
  const deliverableItems = items.filter((item) => !item?.blocks_goal_completion);

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    objective_completion_audit: {
      status: completionAudit.status ?? 'missing',
      proof_type: completionAudit.proof_type ?? 'missing',
      completed_count: completionAudit.completed_count ?? 0,
      blocked_count: completionAudit.blocked_count ?? 0,
      manual_stop_count: completionAudit.manual_stop_count ?? 0,
      total_count: completionAudit.total_count ?? items.length,
      goal_completion_blocked_count: completionAudit.goal_completion_blocked_count ?? blockerItems.length,
      evidence: completionAudit.evidence ?? 'Objective completion audit is missing from the launch evidence manifest.',
      proof_boundary: completionAudit.proof_boundary ?? '',
      stop_gate: completionAudit.stop_gate ?? '',
    },
    deliverable_items: deliverableItems,
    blocker_items: blockerItems,
    completion_audit: completionAudit,
    public_status_handle: readPublicStatusHandle('objective_completion_audit'),
    package_script_handles: {
      report_objective_completion_audit_readiness: 'corepack pnpm run report:objective-completion-audit-readiness',
      check_objective_completion_audit_report: 'corepack pnpm run check:objective-completion-audit-report',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
      report_commercial_launch_readiness: 'corepack pnpm run report:commercial-launch-readiness',
      check_commercial_launch_readiness_report: 'corepack pnpm run check:commercial-launch-readiness-report',
    },
    proof_boundary: 'Focused objective completion audit evidence only; this report renders current manifest completion-audit rows, deliverable rows, blocker rows, public status handle, and package-script handles, but it does not mark the launch goal complete, clear P0/P1 blockers, collect buyer evidence, contact buyers, authorize Supabase, approve branches, resolve source provenance, run release-readiness as clearance, request owner approval, deploy, mutate live services, prove hosted/live parity, prove production approval, prove buyer acceptance, or create commercial launch readiness.',
    stop_gate: 'Do not treat this focused objective completion audit report, checker pass, public status handle, manifest output, generated Markdown, deliverable row, blocker row, or package handle as production approval, buyer acceptance, release readiness, source readiness, branch approval, Supabase advisor clearance, deployment approval, hosted/live parity, commercial-ready status, or launch-goal completion.',
  };
}

function itemRows(items) {
  return items.map((item, index) => [
    index + 1,
    item.requirement,
    item.status,
    item.blocks_goal_completion ? 'yes' : 'no',
    item.proof_type,
    item.evidence,
    item.proof_boundary,
    item.stop_gate,
    item.next_proof_command,
  ]);
}

function renderMarkdown(payload) {
  const audit = payload.objective_completion_audit ?? {};
  const publicRows = [[
    payload.public_status_handle?.id,
    payload.public_status_handle?.status,
    payload.public_status_handle?.command,
    payload.public_status_handle?.evidenceBoundary,
    payload.public_status_handle?.nextAction,
  ]];
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Objective Completion Audit Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Objective completion audit readiness status: \`${audit.status ?? 'unknown'}\``,
    `Completion audit proof type: \`${audit.proof_type ?? 'unknown'}\``,
    `Deliverable rows present: \`${audit.completed_count ?? 0}\``,
    `Blocked rows: \`${audit.blocked_count ?? 0}\``,
    `Manual-stop rows: \`${audit.manual_stop_count ?? 0}\``,
    `Goal-completion blocker rows: \`${audit.goal_completion_blocked_count ?? 0}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Completion Audit Summary',
    '',
    renderTable(
      ['Status', 'Proof Type', 'Completed', 'Blocked', 'Manual Stop', 'Goal Blockers', 'Total', 'Evidence', 'Proof Boundary', 'Stop Gate'],
      [[audit.status, audit.proof_type, audit.completed_count, audit.blocked_count, audit.manual_stop_count, audit.goal_completion_blocked_count, audit.total_count, audit.evidence, audit.proof_boundary, audit.stop_gate]],
    ),
    '',
    '## Deliverable Evidence Rows',
    '',
    renderTable(['Rank', 'Requirement', 'Status', 'Blocks Goal', 'Proof Type', 'Evidence', 'Proof Boundary', 'Stop Gate', 'Next Proof Command'], itemRows(payload.deliverable_items ?? [])),
    '',
    '## Goal-Blocking Rows',
    '',
    renderTable(['Rank', 'Requirement', 'Status', 'Blocks Goal', 'Proof Type', 'Evidence', 'Proof Boundary', 'Stop Gate', 'Next Proof Command'], itemRows(payload.blocker_items ?? [])),
    '',
    '## Public Release Status Handle',
    '',
    renderTable(['Handle', 'Status', 'Command', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
    '',
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Objective completion audit readiness report failed:\n');
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

if (failOnBlocker && payload.objective_completion_audit.status !== 'present') {
  process.exit(1);
}
