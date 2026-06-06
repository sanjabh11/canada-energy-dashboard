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
  corepack pnpm run report:source-provenance-readiness

Options:
  --skip-probes        Reuse the launch manifest without running local Corepack or Git LFS probes.
  --json               Emit the focused source-provenance payload as JSON.
  --fail-on-blocker    Exit nonzero when source_provenance.status is not pass.
  --output <path>      Write the report to a file as well as stdout.
`);
}

if (failures.length > 0) {
  console.error('Source provenance readiness report failed:\n');
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

function focusedPayload(manifest) {
  const source = manifest.source_provenance ?? {};
  const status = source.is_dirty === false ? 'pass' : 'blocked';
  const releaseSourceRow = findByName(manifest.release_preflight?.items, 'requirement', 'Clean source provenance');
  const productionPrerequisiteRow = findByName(
    manifest.production_approval?.prerequisite_queue?.items,
    'prerequisite',
    'Clean source provenance',
  );
  const productionRequestRow = findByName(
    manifest.production_approval?.request_packet?.items,
    'prerequisite',
    'Clean source provenance',
  );

  return {
    schema_version: 1,
    generated_at: manifest.run?.generated_at ?? null,
    launch_decision: manifest.launch_decision ?? null,
    repo: manifest.repo ?? {},
    source_provenance: {
      status,
      branch: source.branch ?? null,
      commit: source.commit ?? null,
      is_dirty: source.is_dirty ?? null,
      dirty_path_count: source.dirty_path_count ?? null,
      dirty_paths: source.dirty_paths ?? [],
      isolation_ledger: source.isolation_ledger ?? null,
      resolution_queue: source.resolution_queue ?? null,
      evidence: source.evidence ?? '',
      deploy_gate: source.deploy_gate ?? '',
    },
    release_preflight_source_row: releaseSourceRow,
    production_approval_source_prerequisite: productionPrerequisiteRow,
    production_approval_request_source_row: productionRequestRow,
    proof_boundary: 'Focused source-provenance evidence only; this report does not commit, unstage, stash, revert, delete, rename, move, clear source provenance, run release-readiness, push, deploy, grant owner approval, or prove hosted/live parity. It does not clear source provenance or production approval.',
    stop_gate: 'Do not treat this focused report, skipped probes, dirty-path classification, isolation ledgers, or resolution queues as clean source provenance, release-readiness, production approval, or current hosted/live parity.',
  };
}

function renderMarkdown(payload) {
  const source = payload.source_provenance ?? {};
  const isolationLedger = source.isolation_ledger ?? {};
  const resolutionQueue = source.resolution_queue ?? {};
  const releaseRow = payload.release_preflight_source_row ?? {};
  const productionPrerequisite = payload.production_approval_source_prerequisite ?? {};
  const productionRequest = payload.production_approval_request_source_row ?? {};

  const dirtyRows = (source.dirty_paths ?? []).map((item, index) => [
    index + 1,
    item.file_path,
    item.old_path ?? '-',
    item.status,
    item.index_status,
    item.worktree_status,
    item.staging_state,
    item.tracked ? 'yes' : 'no',
    item.ignored_by_rule ? 'yes' : 'no',
    item.proof_type,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const isolationRows = (isolationLedger.rows ?? []).map((item) => [
    item.rank,
    item.file_path,
    item.old_path ?? '-',
    item.source_status,
    item.staging_state,
    item.release_impact,
    item.isolation_status,
    item.proof_type,
    item.blocks_release_source_gate ? 'yes' : 'no',
    item.proof_command,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const resolutionRows = (resolutionQueue.items ?? []).map((item) => [
    item.rank,
    item.file_path,
    item.old_path ?? '-',
    item.source_status,
    item.index_status,
    item.worktree_status,
    item.staging_state,
    item.decision_required,
    item.proof_type,
    item.status,
    item.proof_boundary,
    item.stop_gate,
  ]);

  const releaseRows = releaseRow.requirement ? [[
    releaseRow.requirement,
    releaseRow.current,
    releaseRow.needed,
    releaseRow.status,
    releaseRow.next_action,
    releaseRow.proof_command,
    releaseRow.proof_type,
    releaseRow.proof_boundary,
    releaseRow.stop_gate,
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
    '# CEIP Source Provenance Readiness Report',
    `Generated: ${payload.generated_at ?? 'unknown'}`,
    `Repo: ${payload.repo?.name ?? 'unknown'} @ ${payload.repo?.commit ?? 'unknown'}`,
    `Launch decision: \`${payload.launch_decision ?? 'unknown'}\``,
    `Source provenance status: \`${source.status ?? 'unknown'}\``,
    `Open source rows: \`${source.dirty_path_count ?? 'unknown'}\``,
    '',
    '## Decision Boundary',
    '',
    payload.proof_boundary,
    '',
    payload.stop_gate,
    '',
    '## Summary',
    '',
    `- Branch: \`${source.branch ?? 'unknown'}\``,
    `- Commit: \`${source.commit ?? 'unknown'}\``,
    `- Worktree: \`${source.is_dirty ? 'dirty' : 'clean'}\``,
    `- Dirty paths: \`${source.dirty_path_count ?? 'unknown'}\``,
    `- Isolation ledger: \`${isolationLedger.status ?? 'unknown'}\`, release-blocking \`${isolationLedger.release_blocking_path_count ?? 'unknown'}\``,
    `- Resolution queue: \`${resolutionQueue.status ?? 'unknown'}\`, owner decisions \`${resolutionQueue.blocked_count ?? 'unknown'}\``,
    `- Deploy gate: ${source.deploy_gate || 'not reported'}`,
    '',
    '## Raw Source Provenance',
    '',
    source.evidence || 'Source provenance evidence missing.',
    '',
    renderTable(['Rank', 'Path', 'Old Path', 'Source Status', 'Index Status', 'Worktree Status', 'Staging State', 'Tracked', 'Ignored By Rule', 'Proof Type', 'Proof Boundary', 'Stop Gate'], dirtyRows),
    '',
    '## Source Provenance Isolation Ledger',
    '',
    isolationLedger.evidence ?? 'Source provenance isolation ledger missing.',
    '',
    `Proof type: ${isolationLedger.proof_type ?? 'source_provenance_isolation_ledger'}`,
    '',
    isolationLedger.proof_boundary ?? 'Source provenance isolation proof boundary missing.',
    '',
    isolationLedger.stop_gate ?? 'Source provenance isolation stop gate missing.',
    '',
    renderTable(['Rank', 'Path', 'Old Path', 'Source Status', 'Staging State', 'Release Impact', 'Isolation Status', 'Proof Type', 'Blocks Release Source Gate', 'Proof Command', 'Proof Boundary', 'Stop Gate'], isolationRows),
    '',
    '## Source Provenance Resolution Queue',
    '',
    resolutionQueue.evidence ?? 'Source provenance resolution queue missing.',
    '',
    renderTable(['Rank', 'Path', 'Old Path', 'Source Status', 'Index Status', 'Worktree Status', 'Staging State', 'Decision Required', 'Proof Type', 'Status', 'Proof Boundary', 'Stop Gate'], resolutionRows),
    '',
    '## Release Preflight Source Row',
    '',
    renderTable(['Requirement', 'Current', 'Needed', 'Status', 'Next Action', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], releaseRows),
    '',
    '## Production Approval Source Prerequisite',
    '',
    renderTable(['Prerequisite', 'Current', 'Needed', 'Status', 'Owner', 'Proof Command', 'Proof Type', 'Proof Boundary', 'Stop Gate'], productionRows),
    '',
    '## Production Approval Request Source Row',
    '',
    renderTable(['Prerequisite', 'Request Phase', 'Source Status', 'Status', 'Blocks Request', 'Evidence To Attach', 'Request Impact'], requestRows),
  ].join('\n')}\n`;
}

const manifestResult = runManifest();
if (!manifestResult.ok) {
  console.error('Source provenance readiness report failed:\n');
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
    console.error('Source provenance readiness report failed:\n');
    console.error(`- Refusing to overwrite non-${expectedSuffix.slice(1).toUpperCase()} output path: ${outputPath}`);
    process.exit(1);
  }
  writeFileSync(absoluteOutput, output, 'utf8');
}

process.stdout.write(output);

if (failOnBlocker && payload.source_provenance?.status !== 'pass') {
  console.error(`Source provenance remains ${payload.source_provenance?.status ?? 'unknown'}; this report does not clear source provenance or production approval.`);
  process.exit(1);
}
