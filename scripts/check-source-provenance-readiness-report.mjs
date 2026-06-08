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
    assert(
      stdout.includes('git status --porcelain=v1')
        || /Source provenance isolation ledger: status=pass dirty_paths=0 release_blocking_paths=0/i.test(stdout),
      'Report must include the source isolation proof command or clean zero-row isolation ledger evidence.',
    );
    assertContains(stdout, '## Source Provenance Resolution Queue', 'Report must include source resolution queue evidence.');
    assertContains(stdout, 'Source provenance resolution queue', 'Report must include structured source resolution evidence.');
    assertContains(stdout, '## Source Owner Decision Packet', 'Report must include the source owner decision packet.');
    assertContains(stdout, 'source_owner_decision_packet', 'Report must classify the source owner decision packet.');
    assertContains(stdout, 'Recommended Owner Options', 'Report must render recommended owner options.');
    assertContains(stdout, 'Do not mutate source paths', 'Report must preserve packet no-mutation semantics.');
    assertContains(stdout, '## Release Preflight Source Row', 'Report must include the release preflight clean-source row.');
    assertContains(stdout, '| Clean source provenance |', 'Report must include the clean source provenance row.');
    assertContains(stdout, '## Production Approval Source Prerequisite', 'Report must include the production approval source prerequisite.');
    assertContains(stdout, '## Production Approval Request Source Row', 'Report must include the production approval request source row.');
    assertContains(stdout, 'does not clear source provenance or production approval', 'Report must preserve no-clearance language.');
    assertContains(stdout, '## Public Release Status Handles', 'Report must include public source-provenance handles.');
    assertContains(stdout, 'source_provenance_resolution_queue', 'Report must include the source provenance resolution queue public handle.');
    assertContains(stdout, 'source_owner_decision_packet', 'Report must include the source owner decision packet public handle.');
    assertContains(stdout, '## Package Script Handles', 'Report must include package script handles.');
    assertContains(stdout, 'corepack pnpm run report:source-provenance-readiness', 'Report must include the focused source provenance package report handle.');
    assertContains(stdout, 'corepack pnpm run check:source-provenance-report', 'Report must include the focused source provenance package check handle.');
  }

  if (payload) {
    const source = payload.source_provenance ?? {};
    const isolationLedger = source.isolation_ledger ?? {};
    const resolutionQueue = source.resolution_queue ?? {};
    const ownerDecisionPacket = source.owner_decision_packet ?? {};
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
    assert(ownerDecisionPacket.proof_type === 'source_owner_decision_packet', 'Focused JSON must include the source owner decision packet.');
    assert(ownerDecisionPacket.source === 'source_provenance.resolution_queue.items', 'Source owner decision packet must point at the source resolution queue.');
    assert(ownerDecisionPacket.status === (source.is_dirty ? 'blocked' : 'ready'), 'Source owner decision packet status must match source dirty state.');
    assert(ownerDecisionPacket.item_count === resolutionQueue.item_count, 'Source owner decision packet item_count must match the resolution queue.');
    assert(ownerDecisionPacket.blocked_count === resolutionQueue.blocked_count, 'Source owner decision packet blocked_count must match the resolution queue.');
    assert(ownerDecisionPacket.owner_decision_count === resolutionQueue.blocked_count, 'Source owner decision packet owner decision count must match blocked source decisions.');
    assert(Array.isArray(ownerDecisionPacket.items), 'Source owner decision packet items must be a list.');
    assert(/decision support only|does not commit|clear source provenance|request production approval|deploy/i.test(ownerDecisionPacket.proof_boundary ?? ''), 'Source owner decision packet proof boundary must preserve no-mutation and no-approval semantics.');
    assert(/Do not mutate source paths|explicit owner intent|clean source-provenance rerun/i.test(ownerDecisionPacket.stop_gate ?? ''), 'Source owner decision packet stop gate must require explicit owner intent and clean rerun.');
    if ((resolutionQueue.items ?? []).length > 0) {
      assert(/report:source-provenance-readiness/.test(resolutionQueue.items[0]?.proof_command ?? '') && /check:source-provenance-report/.test(resolutionQueue.items[0]?.proof_command ?? ''), 'Resolution queue proof command must point to the focused source provenance report/check.');
    }
    if ((ownerDecisionPacket.items ?? []).length > 0) {
      const firstOwnerDecision = ownerDecisionPacket.items[0] ?? {};
      const firstResolutionDecision = resolutionQueue.items[0] ?? {};
      assert(firstOwnerDecision.file_path === firstResolutionDecision.file_path, 'Source owner decision packet first item must preserve the resolution queue file path.');
      assert(firstOwnerDecision.old_path === firstResolutionDecision.old_path, 'Source owner decision packet first item must preserve the resolution queue old path.');
      assert(firstOwnerDecision.proof_type === firstResolutionDecision.proof_type, 'Source owner decision packet first item must preserve source decision proof type.');
      assert(firstOwnerDecision.owner_decision_required === true, 'Source owner decision packet first item must require owner decision.');
      assert(Array.isArray(firstOwnerDecision.recommended_owner_options) && firstOwnerDecision.recommended_owner_options.length >= 2, 'Source owner decision packet items must include recommended owner options.');
      const optionNames = firstOwnerDecision.recommended_owner_options.map((option) => option?.option);
      if (firstOwnerDecision.old_path || firstOwnerDecision.staging_state === 'staged_only') {
        assert(
          optionNames.includes('commit_as_intentional_change')
            && (optionNames.includes('unstage_for_later_review') || optionNames.includes('stash_or_revert_with_owner_approval')),
          'Source owner decision packet must include intentional commit plus non-commit owner options for staged or renamed rows.',
        );
      }
      assert(/report:source-provenance-readiness/.test(firstOwnerDecision.proof_command ?? '') && /check:source-provenance-report/.test(firstOwnerDecision.proof_command ?? ''), 'Source owner decision packet proof command must point to the focused source report/check.');
      assert(/decision support only|does not mutate source|request production approval|deploy/i.test(firstOwnerDecision.proof_boundary ?? ''), 'Source owner decision packet item proof boundary must preserve no-mutation semantics.');
      assert(/Do not treat this packet item as approval|clear source provenance/i.test(firstOwnerDecision.stop_gate ?? ''), 'Source owner decision packet item stop gate must reject approval and clearance claims.');
    }
    for (const [index, ownerDecision] of (ownerDecisionPacket.items ?? []).entries()) {
      if (ownerDecision.old_path || ownerDecision.staging_state === 'staged_only') {
        const optionNames = (ownerDecision.recommended_owner_options ?? []).map((option) => option?.option);
        assert(
          optionNames.includes('commit_as_intentional_change')
            && (optionNames.includes('unstage_for_later_review') || optionNames.includes('stash_or_revert_with_owner_approval')),
          `Source owner decision packet item ${index} must include intentional commit plus non-commit owner options for staged or renamed rows.`,
        );
      }
    }
    if ((isolationLedger.rows ?? []).length > 0) {
      assert(/git status --porcelain=v1/.test(isolationLedger.rows[0]?.proof_command ?? '') && /report:source-provenance-readiness/.test(isolationLedger.rows[0]?.proof_command ?? '') && /check:source-provenance-report/.test(isolationLedger.rows[0]?.proof_command ?? ''), 'Isolation ledger proof command must include git status plus the focused source provenance report/check.');
    }
    assert(payload.release_preflight_source_row?.requirement === 'Clean source provenance', 'Focused JSON must include the release preflight clean-source row.');
    assert(payload.production_approval_source_prerequisite?.prerequisite === 'Clean source provenance', 'Focused JSON must include the production approval clean-source prerequisite.');
    assert(payload.production_approval_request_source_row?.prerequisite === 'Clean source provenance', 'Focused JSON must include the production approval request clean-source row.');
    assert(payload.public_status_handles?.source_provenance?.id === 'source_provenance', 'Focused JSON must include the source provenance public handle.');
    assert(payload.public_status_handles?.source_provenance_isolation_ledger?.id === 'source_provenance_isolation_ledger', 'Focused JSON must include the source provenance isolation public handle.');
    assert(payload.public_status_handles?.source_provenance_resolution_queue?.id === 'source_provenance_resolution_queue', 'Focused JSON must include the source provenance resolution queue public handle.');
    assert(payload.public_status_handles?.source_owner_decision_packet?.id === 'source_owner_decision_packet', 'Focused JSON must include the source owner decision packet public handle.');
    assert(/report:source-provenance-readiness/.test(payload.public_status_handles?.source_owner_decision_packet?.command ?? '') && /check:source-provenance-report/.test(payload.public_status_handles?.source_owner_decision_packet?.command ?? ''), 'Source owner decision packet public handle must point at the focused source report/check.');
    assert(/source_provenance\.owner_decision_packet/.test(payload.public_status_handles?.source_owner_decision_packet?.sourceManifestPath ?? ''), 'Source owner decision packet public handle must point at source_provenance.owner_decision_packet.');
    assert(payload.package_script_handles?.report_source_provenance_readiness === 'corepack pnpm run report:source-provenance-readiness', 'Focused JSON must include the source provenance report package handle.');
    assert(payload.package_script_handles?.check_source_provenance_report === 'corepack pnpm run check:source-provenance-report', 'Focused JSON must include the source provenance checker package handle.');
    assert(payload.package_script_handles?.report_production_approval_packet === 'corepack pnpm run report:production-approval-packet', 'Focused JSON must include the production approval packet package handle for the downstream source gate.');
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
