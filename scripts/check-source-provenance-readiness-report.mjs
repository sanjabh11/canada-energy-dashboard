#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--') continue;
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unexpected argument: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:source-provenance-report

Options:
  --skip-probes    Validate the focused report contract without running local Corepack or Git LFS probes.
`);
}

function runReport(extraArgs = []) {
  const commandArgs = ['scripts/report-source-provenance-readiness.mjs', ...extraArgs];
  if (skipProbes) commandArgs.push('--skip-probes');
  const result = spawnSync(process.execPath, commandArgs, {
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(text, pattern, message) {
  assert(text.includes(pattern), message);
}

if (failures.length === 0) {
  const markdown = runReport();
  if (markdown.status !== 0) {
    failures.push(`report-source-provenance-readiness exited ${markdown.status}.`);
    if (markdown.error.trim()) failures.push(markdown.error.trim());
    if (markdown.stderr.trim()) failures.push(markdown.stderr.trim());
    if (markdown.stdout.trim()) failures.push(markdown.stdout.trim().slice(0, 4000));
  }

  const jsonReport = runReport(['--json']);
  let payload = null;
  if (jsonReport.status !== 0) {
    failures.push(`report-source-provenance-readiness --json exited ${jsonReport.status}.`);
    if (jsonReport.error.trim()) failures.push(jsonReport.error.trim());
    if (jsonReport.stderr.trim()) failures.push(jsonReport.stderr.trim());
  } else {
    try {
      payload = JSON.parse(jsonReport.stdout);
    } catch (error) {
      failures.push(`Could not parse focused source provenance JSON: ${error.message}`);
    }
  }

  if (markdown.status === 0) {
    const stdout = markdown.stdout;
    assertContains(stdout, '# CEIP Source Provenance Readiness Report', 'Report must include the focused source provenance title.');
    assertContains(stdout, 'Source provenance status:', 'Report must include source provenance status.');
    assertContains(stdout, '## Decision Boundary', 'Report must include a decision-boundary section.');
    assertContains(stdout, 'does not commit, unstage, stash, revert, delete, rename, move, clear source provenance', 'Report must preserve source no-mutation boundaries.');
    assertContains(stdout, '## Raw Source Provenance', 'Report must include raw source provenance evidence.');
    assertContains(stdout, 'Source provenance:', 'Report must include source provenance evidence text.');
    assertContains(stdout, '## Source Provenance Isolation Ledger', 'Report must include source isolation ledger evidence.');
    assertContains(stdout, 'source_provenance_isolation_ledger', 'Report must classify the source provenance isolation ledger.');
    assertContains(stdout, 'dirty-source release impact only', 'Report must preserve source isolation proof boundaries.');
    assertContains(stdout, 'git status --porcelain=v1', 'Report must include the source isolation proof command.');
    assertContains(stdout, '## Source Provenance Resolution Queue', 'Report must include source resolution queue evidence.');
    assertContains(stdout, 'Source provenance resolution queue', 'Report must include structured source resolution evidence.');
    assertContains(stdout, '## Release Preflight Source Row', 'Report must include the release preflight clean-source row.');
    assertContains(stdout, '| Clean source provenance |', 'Report must include the clean source provenance row.');
    assertContains(stdout, '## Production Approval Source Prerequisite', 'Report must include the production approval source prerequisite.');
    assertContains(stdout, '## Production Approval Request Source Row', 'Report must include the production approval request source row.');
    assertContains(stdout, 'does not clear source provenance or production approval', 'Report must preserve no-clearance language.');
  }

  if (payload) {
    const source = payload.source_provenance ?? {};
    const isolationLedger = source.isolation_ledger ?? {};
    const resolutionQueue = source.resolution_queue ?? {};
    assert(payload.schema_version === 1, 'Focused source provenance JSON schema_version must be 1.');
    assert(payload.launch_decision === 'blocked', 'Focused source provenance JSON must preserve the blocked launch decision.');
    assert(['pass', 'blocked'].includes(source.status), 'source_provenance.status must be pass or blocked.');
    assert(typeof source.branch === 'string' && source.branch.length > 0, 'source_provenance.branch must be set.');
    assert(typeof source.commit === 'string' && source.commit.length > 0, 'source_provenance.commit must be set.');
    assert(typeof source.is_dirty === 'boolean', 'source_provenance.is_dirty must be boolean.');
    assert(Number.isInteger(source.dirty_path_count), 'source_provenance.dirty_path_count must be an integer.');
    assert(Array.isArray(source.dirty_paths), 'source_provenance.dirty_paths must be a list.');
    assert(source.status === (source.is_dirty ? 'blocked' : 'pass'), 'source_provenance.status must match dirty state.');
    assert(isolationLedger.proof_type === 'source_provenance_isolation_ledger', 'Focused JSON must include source provenance isolation ledger.');
    assert(isolationLedger.dirty_path_count === source.dirty_path_count, 'Isolation ledger dirty_path_count must match source provenance.');
    assert(resolutionQueue.dirty_path_count === source.dirty_path_count, 'Resolution queue dirty_path_count must match source provenance.');
    assert(Array.isArray(resolutionQueue.items), 'Resolution queue items must be a list.');
    if ((resolutionQueue.items ?? []).length > 0) {
      assert(/report:source-provenance-readiness/.test(resolutionQueue.items[0]?.proof_command ?? '') && /check:source-provenance-report/.test(resolutionQueue.items[0]?.proof_command ?? ''), 'Resolution queue proof command must point to the focused source provenance report/check.');
    }
    if ((isolationLedger.rows ?? []).length > 0) {
      assert(/git status --porcelain=v1/.test(isolationLedger.rows[0]?.proof_command ?? '') && /report:source-provenance-readiness/.test(isolationLedger.rows[0]?.proof_command ?? '') && /check:source-provenance-report/.test(isolationLedger.rows[0]?.proof_command ?? ''), 'Isolation ledger proof command must include git status plus the focused source provenance report/check.');
    }
    assert(payload.release_preflight_source_row?.requirement === 'Clean source provenance', 'Focused JSON must include the release preflight clean-source row.');
    assert(payload.production_approval_source_prerequisite?.prerequisite === 'Clean source provenance', 'Focused JSON must include the production approval clean-source prerequisite.');
    assert(payload.production_approval_request_source_row?.prerequisite === 'Clean source provenance', 'Focused JSON must include the production approval request clean-source row.');
    assert(/report:source-provenance-readiness/.test(payload.release_preflight_source_row?.proof_command ?? '') && /check:source-provenance-report/.test(payload.release_preflight_source_row?.proof_command ?? ''), 'Release preflight clean-source row must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(payload.production_approval_source_prerequisite?.proof_command ?? '') && /check:source-provenance-report/.test(payload.production_approval_source_prerequisite?.proof_command ?? ''), 'Production approval source prerequisite must point to the focused source provenance report/check.');
    assert(/report:source-provenance-readiness/.test(payload.production_approval_request_source_row?.proof_command ?? '') && /check:source-provenance-report/.test(payload.production_approval_request_source_row?.proof_command ?? ''), 'Production approval request source row must point to the focused source provenance report/check.');
    assert(/does not commit|clear source provenance|run release-readiness|push|deploy|grant owner approval/i.test(payload.proof_boundary ?? ''), 'Focused report proof boundary must preserve source no-mutation and no-release semantics.');
    assert(/Do not treat this focused report|clean source provenance|production approval|hosted\/live parity/i.test(payload.stop_gate ?? ''), 'Focused report stop gate must reject clearance claims from this report itself.');
    for (const [index, item] of (source.dirty_paths ?? []).entries()) {
      assert(typeof item.file_path === 'string' && item.file_path.length > 0, `dirty_paths[${index}].file_path must be set.`);
      assert(typeof item.proof_type === 'string' && item.proof_type.length > 0, `dirty_paths[${index}].proof_type must be set.`);
      assert(item.owner_decision_required === true, `dirty_paths[${index}].owner_decision_required must be true.`);
      assert(/does not.*commit|clear provenance|deploy|grant approval/i.test(item.proof_boundary ?? ''), `dirty_paths[${index}].proof_boundary must preserve raw no-mutation semantics.`);
      assert(/explicit owner intent|classification evidence only|production approval/i.test(item.stop_gate ?? ''), `dirty_paths[${index}].stop_gate must preserve owner intent.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Source provenance readiness report check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Source provenance readiness report check passed: focused source status, dirty-path classification, isolation ledger, resolution queue, release preflight source row, production approval source rows, and proof boundaries are consistent.');
