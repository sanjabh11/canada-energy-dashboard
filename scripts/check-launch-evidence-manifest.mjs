#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const args = process.argv.slice(2);
const failures = [];
let skipProbes = false;

for (const arg of args) {
  if (arg === '--skip-probes') {
    skipProbes = true;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  failures.push(`Unknown option: ${arg}`);
}

function printUsage() {
  console.log(`Usage:
  corepack pnpm run check:launch-evidence-manifest

Options:
  --skip-probes      Skip local readiness probes for fast unit-level checks.
`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 30 * 1024 * 1024,
    ...options,
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

function hasOpenGap(manifest, severity, needle) {
  return Array.isArray(manifest.gaps)
    && manifest.gaps.some((gap) => (
      gap
      && gap.severity === severity
      && typeof gap.gap === 'string'
      && gap.gap.includes(needle)
      && gap.status === 'open'
    ));
}

function hasIntegerOrNull(value) {
  return value === null || Number.isInteger(value);
}

function isBoolean(value) {
  return value === true || value === false;
}

const tempRoot = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-check-'));
const manifestPath = path.join(tempRoot, 'launch-evidence.json');

try {
  if (failures.length === 0) {
    const reportArgs = ['scripts/report-launch-evidence-manifest.mjs', '--output', manifestPath];
    if (skipProbes) reportArgs.push('--skip-probes');

    const report = run(process.execPath, reportArgs);
    if (report.status !== 0) {
      failures.push(`Launch evidence manifest report exited ${report.status}.`);
      if (report.error.trim()) failures.push(report.error.trim());
      if (report.stderr.trim()) failures.push(report.stderr.trim());
      if (report.stdout.trim()) failures.push(report.stdout.trim());
    } else if (report.stdout.trim()) {
      try {
        JSON.parse(report.stdout);
      } catch {
        failures.push('Launch evidence manifest stdout is not valid JSON.');
      }
    }
  }

  let manifest = null;
  if (failures.length === 0) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      failures.push(`Unable to parse generated manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (manifest) {
    assert(manifest.schema_version === 1, 'Manifest schema_version must be 1.');
    assert(manifest.repo?.path === repoRoot, 'Manifest repo.path must match the current repository root.');
    assert(manifest.launch_decision === 'blocked', 'Manifest launch_decision must remain blocked until buyer and deploy gates clear.');
    assert(manifest.scores?.overall === 2, 'Manifest overall score must stay at the conservative blocked value of 2.');
    assert(manifest.scores?.evidence === 1, 'Manifest evidence score must stay at 1 while buyer evidence is absent.');
    assert(Array.isArray(manifest.pain_points) && manifest.pain_points.length === 10, 'Manifest must include exactly ten pain points.');
    assert(Array.isArray(manifest.target_customers) && manifest.target_customers.length === 10, 'Manifest must include exactly ten target customers or segments.');
    assert(
      ['hosted_live', 'local', 'repo_artifact', 'candidate_shadow', 'roadmap'].every((bucket) => Object.hasOwn(manifest.proof_buckets ?? {}, bucket)),
      'Manifest must keep the five proof buckets: hosted_live, local, repo_artifact, candidate_shadow, and roadmap.',
    );
    assert(hasOpenGap(manifest, 'P0', 'Phase F evidence'), 'Manifest must keep the open P0 Phase F buyer-evidence gap.');
    assert(typeof manifest.buyer_evidence?.evidence === 'string', 'Manifest must include buyer_evidence.evidence.');
    assert(manifest.buyer_evidence.evidence.includes('Buyer evidence review'), 'Manifest buyer_evidence evidence must summarize Phase F buyer evidence readiness.');
    assert(typeof manifest.buyer_evidence?.phase_f_gate === 'string' && manifest.buyer_evidence.phase_f_gate.length > 0, 'Manifest buyer_evidence.phase_f_gate must be set.');
    assert(typeof manifest.buyer_evidence?.workspace_next_step === 'string' && manifest.buyer_evidence.workspace_next_step.length > 0, 'Manifest buyer_evidence.workspace_next_step must be set.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.production_registers), 'Manifest buyer_evidence.production_registers must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.outreach_logs), 'Manifest buyer_evidence.outreach_logs must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.confidence_moving_rows), 'Manifest buyer_evidence.confidence_moving_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.actionable_outreach_rows), 'Manifest buyer_evidence.actionable_outreach_rows must be an integer or null.');
    assert(hasIntegerOrNull(manifest.buyer_evidence?.batchable_intake_packet_rows), 'Manifest buyer_evidence.batchable_intake_packet_rows must be an integer or null.');
    if (!skipProbes) {
      assert(Number.isInteger(manifest.buyer_evidence?.production_registers), 'Non-skipped manifest must include numeric buyer-evidence production register count.');
      assert(Number.isInteger(manifest.buyer_evidence?.outreach_logs), 'Non-skipped manifest must include numeric buyer-evidence outreach log count.');
      assert(Number.isInteger(manifest.buyer_evidence?.confidence_moving_rows), 'Non-skipped manifest must include numeric buyer-evidence confidence row count.');
    }
    assert(typeof manifest.source_provenance?.evidence === 'string', 'Manifest must include source_provenance.evidence.');
    assert(manifest.source_provenance.evidence.includes('Source provenance:'), 'Manifest source provenance evidence must include a summary marker.');
    assert(typeof manifest.source_provenance?.branch === 'string' && manifest.source_provenance.branch.length > 0, 'Manifest source_provenance.branch must be set.');
    assert(typeof manifest.source_provenance?.commit === 'string' && manifest.source_provenance.commit.length > 0, 'Manifest source_provenance.commit must be set.');
    assert(isBoolean(manifest.source_provenance?.is_dirty), 'Manifest source_provenance.is_dirty must be boolean.');
    assert(Number.isInteger(manifest.source_provenance?.dirty_path_count), 'Manifest source_provenance.dirty_path_count must be an integer.');
    assert(Array.isArray(manifest.source_provenance?.dirty_paths), 'Manifest source_provenance.dirty_paths must be a list.');
    assert(
      manifest.source_provenance.dirty_paths.length === manifest.source_provenance.dirty_path_count
        || manifest.source_provenance.dirty_paths.length === Math.min(manifest.source_provenance.dirty_path_count, 40),
      'Manifest source_provenance dirty_paths must match the dirty path count or the 40-path cap.',
    );
    for (const [index, dirtyPath] of (manifest.source_provenance.dirty_paths ?? []).entries()) {
      assert(typeof dirtyPath.file_path === 'string' && dirtyPath.file_path.length > 0, `source_provenance.dirty_paths[${index}].file_path must be set.`);
      assert(typeof dirtyPath.status === 'string' && dirtyPath.status.length > 0, `source_provenance.dirty_paths[${index}].status must be set.`);
      assert(isBoolean(dirtyPath.tracked), `source_provenance.dirty_paths[${index}].tracked must be boolean.`);
      assert(isBoolean(dirtyPath.ignored_by_rule), `source_provenance.dirty_paths[${index}].ignored_by_rule must be boolean.`);
      assert(typeof dirtyPath.action === 'string' && dirtyPath.action.length > 0, `source_provenance.dirty_paths[${index}].action must be set.`);
    }
    assert(hasOpenGap(manifest, 'P1', 'stale/aging unmerged branches'), 'Manifest must keep the open P1 branch freshness review gap.');
    assert(typeof manifest.branch_review?.evidence === 'string', 'Manifest must include branch_review.evidence.');
    assert(manifest.branch_review.evidence.includes('Branch family review'), 'Manifest branch_review evidence must summarize local/origin branch families.');
    assert(manifest.branch_review.evidence.includes('Branch freshness review'), 'Manifest branch_review evidence must summarize freshness.');
    assert(hasIntegerOrNull(manifest.branch_review?.risk_counts?.high), 'Manifest branch_review risk_counts.high must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_only), 'Manifest branch_review family_counts.local_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.origin_only), 'Manifest branch_review family_counts.origin_only must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.local_ahead), 'Manifest branch_review family_counts.local_ahead must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.family_counts?.diverged), 'Manifest branch_review family_counts.diverged must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.stale), 'Manifest branch_review freshness_counts.stale must be an integer or null.');
    assert(hasIntegerOrNull(manifest.branch_review?.freshness_counts?.aging), 'Manifest branch_review freshness_counts.aging must be an integer or null.');
    if (!skipProbes) {
      assert(Number.isInteger(manifest.branch_review?.family_counts?.local_only), 'Non-skipped manifest must include numeric local-only family count.');
      assert(Number.isInteger(manifest.branch_review?.family_counts?.origin_only), 'Non-skipped manifest must include numeric origin-only family count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.stale), 'Non-skipped manifest must include numeric stale branch count.');
      assert(Number.isInteger(manifest.branch_review?.freshness_counts?.aging), 'Non-skipped manifest must include numeric aging branch count.');
    }
    assert(
      typeof manifest.outreach_plan?.email_script_boundary === 'string'
        && manifest.outreach_plan.email_script_boundary.includes('Do not claim buyer-proven 95% confidence'),
      'Manifest outreach plan must preserve the buyer-proof boundary.',
    );
    assert(manifest.ecc_ledger?.decision === 'blocked', 'Manifest ECC ledger decision must remain blocked.');

    const validation = run('python3', [validatorPath, manifestPath, '--require-repo-exists']);
    if (validation.status !== 0) {
      failures.push(`Launch evidence schema validation exited ${validation.status}.`);
      if (validation.error.trim()) failures.push(validation.error.trim());
      if (validation.stderr.trim()) failures.push(validation.stderr.trim());
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    } else if (!validation.stdout.includes('VALID')) {
      failures.push('Launch evidence schema validation did not report VALID.');
      if (validation.stdout.trim()) failures.push(validation.stdout.trim());
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('Launch evidence manifest check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch evidence manifest check passed: blocked decision, proof buckets, buyer evidence, source provenance, branch families, branch freshness, pain map, target map, buyer boundary, and schema validation are consistent.');
