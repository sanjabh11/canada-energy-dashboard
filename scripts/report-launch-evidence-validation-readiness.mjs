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
  corepack pnpm run report:launch-evidence-validation-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, branch, or buyer probes.
  --json               Emit the focused validation-readiness payload as JSON.
  --fail-on-blocker    Exit nonzero when the focused launch evidence validation gate is not ready.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Launch evidence validation readiness report failed:\n');
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

function runValidationCheck() {
  const commandArgs = [];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = runNodeScript('scripts/check-launch-evidence-manifest.mjs', commandArgs);
  return {
    command: `corepack pnpm run check:launch-evidence-manifest${skipProbes ? ' -- --skip-probes' : ''}`,
    exit_code: result.status,
    status: result.status === 0 ? 'pass' : 'blocked',
    stdout_summary: (result.stdout ?? '').trim().split(/\r?\n/).slice(0, 6).join('\n'),
    stderr_summary: (result.stderr ?? '').trim().split(/\r?\n/).slice(0, 8).join('\n'),
    error: result.error,
    proof_type: 'launch_evidence_manifest_validation',
    proof_boundary: 'This validation result proves manifest structure and proof-boundary consistency only; it does not grant production approval, create buyer acceptance, deploy, mutate live services, prove current hosted/live parity, or create launch readiness.',
    stop_gate: 'Do not treat a passing launch evidence manifest check, focused validation report, production approval packet row, or public status handle as production approval, buyer evidence, deployment, current hosted/live parity, or commercial-ready status.',
  };
}

function readPublicStatusHandle() {
  try {
    const publicManifestPath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
    const publicManifest = JSON.parse(readFileSync(publicManifestPath, 'utf8'));
    return (publicManifest.items ?? []).find((item) => item?.id === 'launch_evidence_validation_gate') ?? null;
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

function findByName(items, key, value) {
  return (items ?? []).find((item) => item?.[key] === value) ?? null;
}

function focusedPayload(manifest, validationCheck) {
  const launchActionRow = findByName(manifest.launch_action_queue?.items, 'phase', 'launch_evidence_validation');
  const productionPrerequisiteRow = findByName(
    manifest.production_approval?.prerequisite_queue?.items,
    'prerequisite',
    'Launch evidence validation',
  );
  const productionRequestRow = findByName(
    manifest.production_approval?.request_packet?.items,
    'prerequisite',
    'Launch evidence validation',
  );
  const validationReady = validationCheck.status === 'pass'
    && productionPrerequisiteRow?.status === 'ready'
    && productionRequestRow?.blocks_request === false;

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    validation_readiness: {
      status: validationReady ? 'pass' : 'blocked',
      proof_type: 'launch_evidence_validation_readiness',
      validation_check: validationCheck,
      launch_action_row_status: launchActionRow?.status ?? 'missing',
      production_prerequisite_status: productionPrerequisiteRow?.status ?? 'missing',
      request_row_blocks_request: productionRequestRow?.blocks_request ?? null,
      evidence: validationReady
        ? 'Launch evidence manifest validation currently passes as an external predeploy structure/proof-boundary check.'
        : 'Launch evidence validation is not ready; attach a passing check:launch-evidence-manifest result before any production approval request.',
    },
    launch_action_validation_row: launchActionRow,
    production_approval_validation_prerequisite: productionPrerequisiteRow,
    production_approval_request_validation_row: productionRequestRow,
    public_status_validation_gate: readPublicStatusHandle(),
    package_script_handles: {
      report_launch_evidence_validation_readiness: 'corepack pnpm run report:launch-evidence-validation-readiness',
      check_launch_evidence_validation_report: 'corepack pnpm run check:launch-evidence-validation-report',
      check_launch_evidence_manifest: 'corepack pnpm run check:launch-evidence-manifest',
      report_production_approval_packet: 'corepack pnpm run report:production-approval-packet',
      report_launch_evidence_manifest: 'corepack pnpm run report:launch-evidence-manifest',
    },
    proof_boundary: 'Focused launch-evidence validation evidence only; this report runs or records the manifest structure/proof-boundary check, but it does not self-certify the manifest, clear source provenance, run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, mutate live services, prove current hosted/live parity, or create commercial launch readiness.',
    stop_gate: 'Do not treat this focused report, passing validation check, production approval prerequisite row, request-packet row, public status handle, or generated manifest as production approval, buyer acceptance, deployment approval, current hosted/live parity, source readiness, or commercial-ready status.',
  };
}

function renderMarkdown(payload) {
  const readiness = payload.validation_readiness ?? {};
  const validation = readiness.validation_check ?? {};
  const action = payload.launch_action_validation_row ?? {};
  const prerequisite = payload.production_approval_validation_prerequisite ?? {};
  const request = payload.production_approval_request_validation_row ?? {};
  const publicGate = payload.public_status_validation_gate ?? {};
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  return `${[
    '# CEIP Launch Evidence Validation Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Validation readiness status: \`${readiness.status ?? 'unknown'}\``,
    `Validation check status: \`${validation.status ?? 'unknown'}\``,
    `Validation check exit code: \`${validation.exit_code ?? 'unknown'}\``,
    `Launch action row status: \`${readiness.launch_action_row_status ?? 'unknown'}\``,
    `Production prerequisite status: \`${readiness.production_prerequisite_status ?? 'unknown'}\``,
    `Request row blocks request: \`${readiness.request_row_blocks_request === true ? 'yes' : readiness.request_row_blocks_request === false ? 'no' : 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Validation Command Result',
    '',
    renderTable(
      ['Command', 'Status', 'Exit Code', 'Proof Type', 'Stdout Summary', 'Stderr Summary', 'Proof Boundary', 'Stop Gate'],
      [[
        validation.command,
        validation.status,
        validation.exit_code,
        validation.proof_type,
        validation.stdout_summary,
        validation.stderr_summary,
        validation.proof_boundary,
        validation.stop_gate,
      ]],
    ),
    '',
    '## Launch Action Validation Row',
    '',
    renderTable(
      ['Rank', 'Phase', 'Blocker', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      action.phase
        ? [[action.rank, action.phase, action.blocker, action.owner, action.action, action.proof_command, action.proof_type, action.proof_boundary, action.stop_gate, action.status]]
        : [['n/a', 'launch_evidence_validation', 'missing', 'operator', 'Regenerate the launch evidence manifest.', 'corepack pnpm run check:launch-evidence-manifest', 'manifest_validation_and_approval_packet', payload.proof_boundary, payload.stop_gate, 'missing']],
    ),
    '',
    '## Production Approval Validation Prerequisite',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Current', 'Needed', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate', 'Status'],
      prerequisite.prerequisite
        ? [[prerequisite.rank, prerequisite.prerequisite, prerequisite.current, prerequisite.needed, prerequisite.owner, prerequisite.proof_command, prerequisite.proof_type, prerequisite.proof_boundary, prerequisite.stop_gate, prerequisite.status]]
        : [['n/a', 'Launch evidence validation', 'missing', 'Attach passing check:launch-evidence-manifest output.', 'operator', 'corepack pnpm run check:launch-evidence-manifest', 'manifest_validation_and_approval_packet', payload.proof_boundary, payload.stop_gate, 'missing']],
    ),
    '',
    '## Production Approval Request Validation Row',
    '',
    renderTable(
      ['Rank', 'Prerequisite', 'Request Phase', 'Status', 'Blocks Request', 'Evidence To Attach', 'Impact', 'Proof Command', 'Proof Boundary', 'Stop Gate'],
      request.prerequisite
        ? [[request.rank, request.prerequisite, request.request_phase, request.status, request.blocks_request ? 'yes' : 'no', request.evidence_to_attach, request.impact, request.proof_command, request.proof_boundary, request.stop_gate]]
        : [['n/a', 'Launch evidence validation', 'pre_request', 'missing', 'yes', 'Attach passing check:launch-evidence-manifest output.', 'Missing validation row blocks approval request evidence.', 'corepack pnpm run check:launch-evidence-manifest', payload.proof_boundary, payload.stop_gate]],
    ),
    '',
    '## Public Release Status Handle',
    '',
    renderTable(
      ['Id', 'Label', 'Status', 'Proof Bucket', 'Command', 'Evidence Boundary', 'Next Action'],
      publicGate.id
        ? [[publicGate.id, publicGate.label, publicGate.status, publicGate.proofBucket, publicGate.command, publicGate.evidenceBoundary, publicGate.nextAction]]
        : [['launch_evidence_validation_gate', 'missing', 'external_gate', 'repo artifact', 'pnpm run check:launch-evidence-manifest', payload.proof_boundary, payload.stop_gate]],
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
  console.error('Launch evidence validation readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.processError?.trim()) console.error(manifestResult.processError.trim());
  if (manifestResult.stderr?.trim()) console.error(manifestResult.stderr.trim());
  if (manifestResult.stdout?.trim()) console.error(manifestResult.stdout.trim().slice(0, 4000));
  process.exit(1);
}

const validationCheck = runValidationCheck();
const payload = focusedPayload(manifestResult.manifest, validationCheck);
const output = jsonOutput
  ? `${JSON.stringify(payload, null, 2)}\n`
  : renderMarkdown(payload);

if (values.has('output')) {
  writeFileSync(values.get('output'), output, 'utf8');
}

process.stdout.write(output);

if (failOnBlocker && payload.validation_readiness?.status !== 'pass') {
  console.error(`Launch evidence validation readiness remains ${payload.validation_readiness?.status ?? 'unknown'}; this report does not approve, deploy, prove buyer acceptance, or create launch readiness.`);
  process.exit(1);
}
