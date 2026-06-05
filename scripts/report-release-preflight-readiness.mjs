#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
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
  corepack pnpm run report:release-preflight

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack or Git LFS probes.
  --json               Emit the focused release-preflight payload as JSON.
  --fail-on-blocker    Exit nonzero when release_preflight.status is not pass.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Release preflight readiness report failed:\n');
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

function focusedPayload(manifest) {
  const releasePreflight = manifest.release_preflight ?? {};
  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    release_preflight: releasePreflight,
    source_provenance: {
      branch: manifest.source_provenance?.branch ?? null,
      commit: manifest.source_provenance?.commit ?? null,
      is_dirty: manifest.source_provenance?.is_dirty ?? null,
      dirty_path_count: manifest.source_provenance?.dirty_path_count ?? null,
      evidence: manifest.source_provenance?.evidence ?? '',
      resolution_queue: manifest.source_provenance?.resolution_queue ?? null,
    },
    production_approval_request_packet: manifest.production_approval?.request_packet ?? null,
    proof_boundary: 'Focused release-preflight evidence only; this report does not install tools, run release-readiness, clear source provenance, push, deploy, grant owner approval, or prove hosted/live parity.',
    stop_gate: 'Do not treat this focused report, bare pnpm checks, skipped probes, package metadata, or local hook output as release-readiness, production approval, or current hosted/live parity.',
  };
}

function renderMarkdown(payload) {
  const releasePreflight = payload.release_preflight ?? {};
  const toolchainLedger = releasePreflight.toolchain_probe_ledger ?? {};
  const clearanceMatrix = releasePreflight.clearance_matrix ?? {};
  const remediationQueue = releasePreflight.remediation_queue ?? {};
  const requestPacket = payload.production_approval_request_packet ?? {};
  const sourceQueue = payload.source_provenance?.resolution_queue ?? {};

  const probeRows = (toolchainLedger.items ?? []).map((item) => [
    item.label,
    item.command,
    item.status,
    item.current,
    item.expected,
    item.next_action,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const deficitRows = (releasePreflight.items ?? []).map((item) => [
    item.requirement,
    item.current,
    item.needed,
    item.status,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const clearanceRows = (clearanceMatrix.rows ?? []).map((item) => [
    item.rank,
    item.requirement,
    item.status,
    item.source_status,
    item.owner,
    item.proof_command,
    item.release_impact,
    item.blocks_release_gate ? 'yes' : 'no',
    item.stop_gate,
  ]);

  const remediationRows = (remediationQueue.items ?? []).map((item) => [
    item.rank,
    item.requirement,
    item.status,
    item.owner,
    item.action,
    item.proof_command,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const requestRows = (requestPacket.items ?? []).map((item) => [
    item.rank,
    item.prerequisite,
    item.request_phase,
    item.status,
    item.blocks_request ? 'yes' : 'no',
    item.proof_command,
    item.request_impact,
  ]);

  const sourceRows = (sourceQueue.items ?? []).map((item) => [
    item.rank,
    item.file_path,
    item.source_status,
    item.status,
    item.staging_state,
    item.decision_required,
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  return `${[
    '# CEIP Release Preflight Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Release preflight status: \`${releasePreflight.status ?? 'unknown'}\``,
    `Open release rows: \`${releasePreflight.open_count ?? 'unknown'}/${releasePreflight.total_count ?? 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Package manager: \`${releasePreflight.package_manager ?? 'unknown'}\``,
    `- Expected pnpm version: \`${releasePreflight.expected_pnpm_version ?? 'unknown'}\``,
    `- Corepack probe: \`${releasePreflight.corepack_probe ?? 'unknown'}\``,
    `- Git LFS probe: \`${releasePreflight.git_lfs_probe ?? 'unknown'}\``,
    `- Toolchain probe ledger: \`${toolchainLedger.status ?? 'unknown'}\`, open \`${toolchainLedger.open_count ?? 'unknown'}/${toolchainLedger.item_count ?? 'unknown'}\``,
    `- Clearance matrix: \`${clearanceMatrix.status ?? 'unknown'}\`, blocked \`${clearanceMatrix.blocked_count ?? 'unknown'}/${clearanceMatrix.row_count ?? 'unknown'}\``,
    `- Source provenance: branch \`${payload.source_provenance?.branch ?? 'unknown'}\`, dirty paths \`${payload.source_provenance?.dirty_path_count ?? 'unknown'}\``,
    `- Production approval request: \`${requestPacket.status ?? 'unknown'}\`, eligible \`${requestPacket.request_eligible === true ? 'yes' : 'no'}\``,
    '',
    '## Release Toolchain Probe Ledger',
    '',
    toolchainLedger.evidence ?? 'Release toolchain probe ledger missing.',
    '',
    renderTable(['Probe', 'Command', 'Status', 'Current', 'Expected', 'Next Action', 'Proof Boundary', 'Stop Gate'], probeRows),
    '',
    '## Release Preflight Deficits',
    '',
    releasePreflight.evidence ?? 'Release preflight deficit ledger missing.',
    '',
    renderTable(['Requirement', 'Current', 'Needed', 'Status', 'Proof Type', 'Proof Boundary', 'Stop Gate'], deficitRows),
    '',
    '## Release Preflight Clearance Matrix',
    '',
    clearanceMatrix.evidence ?? 'Release preflight clearance matrix missing.',
    '',
    clearanceMatrix.proof_boundary ?? 'Release preflight clearance matrix proof boundary missing.',
    '',
    clearanceMatrix.stop_gate ?? 'Release preflight clearance matrix stop gate missing.',
    '',
    renderTable(['Rank', 'Requirement', 'Status', 'Source Status', 'Owner', 'Proof Command', 'Release Impact', 'Blocks Release Gate', 'Stop Gate'], clearanceRows),
    '',
    '## Release Preflight Remediation Queue',
    '',
    remediationQueue.evidence ?? 'Release preflight remediation queue missing.',
    '',
    renderTable(['Rank', 'Requirement', 'Status', 'Owner', 'Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], remediationRows),
    '',
    '## Source Provenance Boundary',
    '',
    payload.source_provenance?.evidence ?? 'Source provenance evidence missing.',
    '',
    sourceQueue.evidence ?? 'Source provenance resolution queue missing.',
    '',
    renderTable(['Rank', 'Path', 'Source Status', 'Status', 'Staging State', 'Decision Required', 'Proof Type', 'Proof Boundary', 'Stop Gate'], sourceRows),
    '',
    '## Production Approval Request Boundary',
    '',
    requestPacket.evidence ?? 'Production approval request packet missing.',
    '',
    requestPacket.proof_boundary ?? 'Production approval request packet boundary missing.',
    '',
    requestPacket.stop_gate ?? 'Production approval request packet stop gate missing.',
    '',
    renderTable(['Rank', 'Prerequisite', 'Phase', 'Status', 'Blocks Request', 'Proof Command', 'Request Impact'], requestRows),
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Release preflight readiness report failed:\n');
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
    console.error('Release preflight readiness report failed:\n');
    console.error(`- Refusing to overwrite non-${expectedSuffix.slice(1).toUpperCase()} output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, output, 'utf8');
}

process.stdout.write(output);

if (failOnBlocker && payload.release_preflight?.status !== 'pass') {
  console.error(`Release preflight remains ${payload.release_preflight?.status ?? 'unknown'}; this report does not clear release approval.`);
  process.exit(1);
}
