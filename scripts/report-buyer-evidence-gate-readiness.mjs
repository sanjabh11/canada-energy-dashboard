#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
  corepack pnpm run report:buyer-evidence-gate-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack, Git LFS, buyer, branch, or Supabase probes.
  --json               Emit the focused buyer-evidence gate payload as JSON.
  --fail-on-blocker    Exit nonzero when the buyer evidence hard gate is not ready.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Buyer evidence gate readiness report failed:\n');
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

function findByName(items, key, value) {
  return (items ?? []).find((item) => item?.[key] === value) ?? null;
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
  const buyer = manifest.buyer_evidence ?? {};
  const productionPrerequisiteRow = findByName(
    manifest.production_approval?.prerequisite_queue?.items,
    'prerequisite',
    'Buyer evidence hard gate',
  );
  const productionRequestRow = findByName(
    manifest.production_approval?.request_packet?.items,
    'prerequisite',
    'Buyer evidence hard gate',
  );
  const launchActionRow = findByName(
    manifest.launch_action_queue?.items,
    'phase',
    'buyer_evidence',
  );

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    buyer_evidence: buyer,
    minimum_evidence_packet: buyer.minimum_evidence_packet ?? null,
    launch_action_buyer_row: launchActionRow,
    production_approval_buyer_prerequisite: productionPrerequisiteRow,
    production_approval_request_buyer_row: productionRequestRow,
    public_status_handles: {
      buyer_evidence_gate: readPublicStatusHandle('buyer_evidence_gate'),
      buyer_evidence_hard_gate_deficit_ledger: readPublicStatusHandle('buyer_evidence_hard_gate_deficit_ledger'),
      buyer_evidence_acquisition_matrix: readPublicStatusHandle('buyer_evidence_acquisition_matrix'),
      buyer_evidence_minimum_packet_handoff: readPublicStatusHandle('buyer_evidence_minimum_packet_handoff'),
      buyer_evidence_remediation_queue: readPublicStatusHandle('buyer_evidence_remediation_queue'),
    },
    package_script_handles: {
      report_buyer_evidence_gate_readiness: 'corepack pnpm run report:buyer-evidence-gate-readiness',
      check_buyer_evidence_gate_report: 'corepack pnpm run check:buyer-evidence-gate-report',
      report_buyer_evidence_readiness: 'corepack pnpm run report:buyer-evidence-readiness',
      check_buyer_evidence_readiness_report: 'corepack pnpm run check:buyer-evidence-readiness-report',
      report_pilot_evidence_95: 'corepack pnpm run report:pilot-evidence-95',
      validate_pilot_evidence_require_95: 'corepack pnpm run validate:pilot-evidence -- --require-95',
      plan_outreach_intake: 'corepack pnpm run plan:outreach-intake',
    },
    proof_boundary: 'Focused buyer-evidence hard-gate evidence only; this report does not contact buyers, send outreach, create accepted evidence, move confidence, attach retained artifacts, validate 95%, create buyer proof, claim buyer acceptance, grant production approval, deploy, or prove hosted/live parity.',
    stop_gate: 'Do not treat this focused report, acquisition matrix, remediation queue, generated workspace, starter register, skipped probes, public status handle, or check pass as buyer-proven evidence, Phase F 95% validation, production approval, commercial-ready status, or hosted/live parity.',
  };
}

function renderMarkdown(payload) {
  const buyer = payload.buyer_evidence ?? {};
  const deficits = buyer.hard_gate_deficits ?? {};
  const remediationQueue = deficits.remediation_queue ?? {};
  const acquisitionMatrix = buyer.acquisition_matrix ?? {};
  const minimumPacket = payload.minimum_evidence_packet ?? {};
  const launchRow = payload.launch_action_buyer_row ?? {};
  const productionPrerequisite = payload.production_approval_buyer_prerequisite ?? {};
  const productionRequest = payload.production_approval_request_buyer_row ?? {};
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
  const scriptRows = Object.entries(payload.package_script_handles ?? {}).map(([name, command]) => [
    name,
    command,
  ]);

  const deficitRows = (deficits.items ?? []).map((item) => [
    item.requirement,
    item.current,
    item.needed,
    item.status,
    item.next_action,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const acquisitionRows = (acquisitionMatrix.rows ?? []).map((item) => [
    item.rank,
    item.lane,
    item.source_requirement,
    item.current,
    item.required_artifact,
    item.minimum_accepted_signal,
    item.status,
    item.owner,
    item.proof_type,
    item.validation_command,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const minimumPacketRows = (minimumPacket.items ?? []).map((item) => [
    item.rank,
    item.lane,
    item.owner,
    item.status,
    item.required_artifact,
    item.minimum_accepted_signal,
    item.validation_command,
    item.blocks_95_gate ? 'yes' : 'no',
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const remediationRows = (remediationQueue.items ?? []).map((item) => [
    item.rank,
    item.requirement,
    item.current,
    item.needed,
    item.deficit_status,
    item.status,
    item.owner,
    item.action,
    item.proof_command,
    item.proof_type,
    item.buyer_accepted_evidence_required ? 'yes' : 'no',
    item.retained_artifact_required ? 'yes' : 'no',
    item.proof_boundary,
    item.stop_gate,
  ]);

  const launchRows = launchRow.phase ? [[
    launchRow.rank,
    launchRow.phase,
    launchRow.blocker,
    launchRow.owner,
    launchRow.next_action ?? launchRow.action,
    launchRow.proof_command,
    launchRow.status,
    launchRow.proof_type,
    launchRow.proof_boundary,
    launchRow.stop_gate,
  ]] : [];

  const productionRows = productionPrerequisite.prerequisite ? [[
    productionPrerequisite.prerequisite,
    productionPrerequisite.current,
    productionPrerequisite.needed,
    productionPrerequisite.status,
    productionPrerequisite.owner,
    productionPrerequisite.proof_command,
    productionPrerequisite.proof_type,
    productionPrerequisite.proof_boundary,
    productionPrerequisite.stop_gate,
  ]] : [];

  const requestRows = productionRequest.prerequisite ? [[
    productionRequest.prerequisite,
    productionRequest.request_phase,
    productionRequest.source_status,
    productionRequest.status,
    productionRequest.blocks_request ? 'yes' : 'no',
    productionRequest.evidence_to_attach,
    productionRequest.request_impact,
  ]] : [];

  return `${[
    '# CEIP Buyer Evidence Hard-Gate Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Buyer evidence status: \`${buyer.status ?? 'unknown'}\``,
    `Phase F 95% gate: \`${buyer.phase_f_gate ?? 'unknown'}\``,
    `Evidence root: \`${buyer.evidence_root ?? 'unknown'}\``,
    `Open hard-gate rows: \`${deficits.open_count ?? 'unknown'}/${deficits.total_count ?? 'unknown'}\``,
    `Acquisition matrix: \`${acquisitionMatrix.status ?? 'unknown'}\`, blocked \`${acquisitionMatrix.blocked_count ?? 'unknown'}/${acquisitionMatrix.row_count ?? 'unknown'}\``,
    `Minimum evidence packet: \`${minimumPacket.status ?? 'unknown'}\`, blocked \`${minimumPacket.blocked_count ?? 'unknown'}/${minimumPacket.item_count ?? 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Production pilot evidence registers: \`${buyer.production_registers ?? 'unknown'}\``,
    `- Starter-only pilot evidence registers: \`${buyer.starter_only_registers ?? 'unknown'}\``,
    `- Production outreach response logs: \`${buyer.outreach_logs ?? 'unknown'}\``,
    `- Confidence-moving rows: \`${buyer.confidence_moving_rows ?? 'unknown'}\``,
    `- Actionable outreach rows: \`${buyer.actionable_outreach_rows ?? 'unknown'}\``,
    `- Batchable intake-packet rows: \`${buyer.batchable_intake_packet_rows ?? 'unknown'}\``,
    `- Workspace next step: ${buyer.workspace_next_step ?? 'not recorded'}`,
    '',
    '## Buyer Evidence Review',
    '',
    buyer.evidence ?? 'Buyer evidence review missing.',
    '',
    '## Buyer Hard-Gate Deficit Ledger',
    '',
    deficits.evidence ?? 'Buyer evidence hard-gate deficit ledger missing.',
    '',
    renderTable(['Requirement', 'Current', 'Needed', 'Status', 'Next Action', 'Proof Type', 'Proof Boundary', 'Stop Gate'], deficitRows),
    '',
    '## Buyer Evidence Acquisition Matrix',
    '',
    acquisitionMatrix.evidence ?? 'Buyer evidence acquisition matrix missing.',
    '',
    renderTable(['Rank', 'Lane', 'Source Requirement', 'Current', 'Required Artifact', 'Minimum Accepted Signal', 'Status', 'Owner', 'Proof Type', 'Validation Command', 'Proof Boundary', 'Stop Gate'], acquisitionRows),
    '',
    '## Minimum Buyer Evidence Packet Handoff',
    '',
    minimumPacket.evidence ?? 'Minimum buyer evidence packet handoff missing.',
    '',
    renderTable(['Rank', 'Lane', 'Owner', 'Status', 'Required Artifact', 'Minimum Accepted Signal', 'Validation Command', 'Blocks 95 Gate', 'Proof Type', 'Proof Boundary', 'Stop Gate'], minimumPacketRows),
    '',
    '## Buyer Evidence Remediation Queue',
    '',
    remediationQueue.evidence ?? 'Buyer evidence remediation queue missing.',
    '',
    renderTable(['Rank', 'Requirement', 'Current', 'Needed', 'Deficit Status', 'Status', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Buyer Accepted Evidence Required', 'Retained Artifact Required', 'Proof Boundary', 'Stop Gate'], remediationRows),
    '',
    '## Launch Action Buyer Row',
    '',
    renderTable(['Rank', 'Phase', 'Blocker', 'Owner', 'Next Action', 'Proof Command', 'Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], launchRows),
    '',
    '## Production Approval Buyer Prerequisite',
    '',
    renderTable(['Prerequisite', 'Current', 'Needed', 'Status', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], productionRows),
    '',
    '## Production Approval Request Buyer Row',
    '',
    renderTable(['Prerequisite', 'Request Phase', 'Source Status', 'Status', 'Blocks Request', 'Evidence To Attach', 'Request Impact'], requestRows),
    '',
    '## Public Release Status Handles',
    '',
    renderTable(['Handle', 'Status', 'Command', 'Source Manifest Path', 'Source Proof Types', 'Evidence Boundary', 'Next Action'], publicRows),
    '',
    '## Package Script Handles',
    '',
    renderTable(['Handle', 'Command'], scriptRows),
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Buyer evidence gate readiness report failed:\n');
  console.error(`- ${manifestResult.error}`);
  if (manifestResult.stderr.trim()) console.error(manifestResult.stderr.trim());
  if (manifestResult.stdout.trim()) console.error(manifestResult.stdout.trim());
  process.exit(1);
}

const payload = focusedPayload(manifestResult.manifest);
const output = jsonOutput ? `${JSON.stringify(payload, null, 2)}\n` : renderMarkdown(payload);
const outputPath = values.get('output');

if (outputPath) {
  const absoluteOutput = path.resolve(repoRoot, outputPath);
  const expectedSuffix = jsonOutput ? '.json' : '.md';
  if (existsSync(absoluteOutput) && !absoluteOutput.endsWith(expectedSuffix)) {
    console.error('Buyer evidence gate readiness report failed:\n');
    console.error(`- Refusing to overwrite non-${expectedSuffix.slice(1).toUpperCase()} output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, output, 'utf8');
}

process.stdout.write(output);

const buyerReady = payload.buyer_evidence?.status === 'pass'
  && payload.buyer_evidence?.hard_gate_deficits?.status === 'pass'
  && payload.buyer_evidence?.acquisition_matrix?.status === 'ready';
if (failOnBlocker && !buyerReady) {
  console.error(`Buyer evidence hard gate remains ${payload.buyer_evidence?.status ?? 'unknown'}; this report does not contact buyers, create evidence, validate 95%, or grant production approval.`);
  process.exit(1);
}
