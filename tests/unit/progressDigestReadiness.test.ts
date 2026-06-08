import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-progress-digest-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-progress-digest-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-progress-digest-'));
  tempRoots.push(root);
  return root;
}

function writeCurrentProofs(root: string) {
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
  const packageManager = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).packageManager;
  const repo = {
    name: 'canada-energy-dashboard',
    path: process.cwd(),
    branch: 'main',
    commit,
    package_manager: packageManager,
  };
  const releaseProofPath = path.join(root, 'release-readiness-proof.json');
  const supabaseProofPath = path.join(root, 'supabase-app-lint-proof.json');
  writeFileSync(releaseProofPath, JSON.stringify({
    schema_version: 1,
    generated_by: 'scripts/record-release-readiness-proof.mjs',
    generated_at: '2026-06-08T21:04:40.634Z',
    command: 'corepack pnpm run check:release-readiness',
    status: 'pass',
    exit_code: 0,
    duration_ms: 1234,
    repo,
    source_clean: true,
    corepack_pnpm_version: '10.23.0',
    git_lfs_version: 'git-lfs/3.6.1',
  }));
  writeFileSync(supabaseProofPath, JSON.stringify({
    schema_version: 1,
    generated_by: 'scripts/record-supabase-app-lint-proof.mjs',
    generated_at: '2026-06-08T21:05:02.007Z',
    command: 'corepack pnpm run check:supabase-app-lint',
    status: 'pass',
    exit_code: 0,
    duration_ms: 123,
    repo,
    source_clean: true,
    total_lint_rows: 14,
    extension_owned_rows: 14,
    extension_owned_issues: 37,
    app_owned_rows: 0,
    app_owned_issues: 0,
  }));
  return { releaseProofPath, supabaseProofPath };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('progress digest readiness report', () => {
  it('renders focused progress, activities, and bottleneck evidence from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'progress-digest.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Progress Digest Readiness Report');
    expect(stdout).toContain('Progress digest status:');
    expect(stdout).toContain('Activities remaining status:');
    expect(stdout).toContain('Bottleneck digest status:');
    expect(stdout).toContain('## Decision Boundary');
    expect(stdout).toContain('does not complete pending work');
    expect(stdout).toMatch(/clear blockers[\s\S]*contact buyers[\s\S]*authorize Supabase[\s\S]*deploy[\s\S]*hosted\/live parity/i);
    expect(stdout).toContain('## Retained Proof Summary');
    expect(stdout).toContain('release_readiness');
    expect(stdout).toContain('supabase_app_lint');
    expect(stdout).toContain('## Progress Summary');
    expect(stdout).toContain('## Progress Updates');
    expect(stdout).toContain('CEIP-SAFE-FIX-FIX-REPORT-PROOF-AWARE-BLOCKERS');
    expect(stdout).toContain('objective completion audit');
    expect(stdout).toContain('Safe Fix Lane');
    expect(stdout).toContain('code optimization review evidence');
    expect(stdout).toContain('## Activities Remaining');
    expect(stdout).toContain('## Current Phase Actions');
    expect(stdout).toMatch(/source_provenance|source provenance/i);
    expect(stdout).toContain('production_approval');
    expect(stdout).toContain('## Next Phase Actions');
    expect(stdout).toContain('post_deploy_live_proof');
    expect(stdout).toContain('Hosted proof-pack route smoke');
    expect(stdout).toContain('## Bottleneck Summary');
    expect(stdout).toContain('## Bottleneck Log');
    expect(stdout).toContain('evidence gap');
    expect(stdout).toContain('Expected time saved:');
    expect(stdout).toContain('Tradeoff:');
    expect(stdout).toContain('Risk:');
    expect(stdout).toContain('## Public Release Status Handles');
    expect(stdout).toContain('progress_update_digest');
    expect(stdout).toContain('bottleneck_log_digest');
    expect(stdout).toContain('Source Manifest Path');
    expect(stdout).toContain('| progress_update_digest | external_gate | progress_updates |');
    expect(stdout).toContain('| bottleneck_log_digest | external_gate | bottleneck_log |');
    expect(stdout).toContain('## Package Script Handles');
    expect(stdout).toContain('corepack pnpm run report:progress-digest-readiness');
    expect(stdout).toContain('corepack pnpm run check:progress-digest-report');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits focused JSON with progress, activities, bottleneck, handle, and no-readiness boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.progress_digest.status).toBe('blocked');
    expect(payload.progress_digest.proof_type).toBe('progress_update_digest');
    expect(payload.progress_digest.update_count).toBeGreaterThanOrEqual(2);
    expect(payload.progress_digest.current_phase).toBe('CEIP-SAFE-FIX-FIX-REPORT-PROOF-AWARE-BLOCKERS');
    expect(payload.progress_digest.target_matrix_count).toBeGreaterThanOrEqual(5);
    expect(payload.progress_digest.current_bottleneck).toMatch(/retained buyer artifacts|guarded deploy\/live proof/i);
    expect(payload.progress_updates.map((item: { phase: string }) => item.phase)).toEqual(expect.arrayContaining([
      'CEIP-SAFE-FIX-FIX-REPORT-PROOF-AWARE-BLOCKERS',
      'objective completion audit',
    ]));

    expect(payload.activities_remaining.status).toBe('blocked');
    expect(payload.activities_remaining.proof_type).toBe('activities_remaining_digest');
    expect(payload.activities_remaining.current_phase).toBe('CEIP-SAFE-FIX-FIX-REPORT-PROOF-AWARE-BLOCKERS');
    expect(payload.activities_remaining.current_phase_action_count).toBe(payload.activities_remaining.current_phase_actions.length);
    expect(payload.activities_remaining.current_phase_action_count).toBeGreaterThanOrEqual(6);
    expect(payload.activities_remaining.next_phase_action_count).toBeGreaterThanOrEqual(10);
    expect(payload.activities_remaining.completion_blocker_count).toBeGreaterThanOrEqual(4);
    expect(payload.activities_remaining.current_phase_actions.map((item: { phase: string }) => item.phase)).toEqual(expect.arrayContaining([
      'production_approval',
      'post_deploy_live_proof',
    ]));
    expect(payload.activities_remaining.next_phase_actions.map((item: { phase: string }) => item.phase)).toEqual(expect.arrayContaining([
      'Post-deploy live proof boundary',
      'Hosted proof-pack route smoke',
    ]));
    expect(payload.activities_remaining.evidence).toMatch(/without executing any proof commands/i);

    expect(payload.bottleneck_digest.status).toBe('blocked');
    expect(payload.bottleneck_digest.proof_type).toBe('bottleneck_log_digest');
    expect(payload.bottleneck_digest.root_cause).toBe('evidence gap');
    expect(payload.bottleneck_digest.affected_lane).toBe('Synthesis + Validation');
    expect(payload.bottleneck_digest.top_unblock_option_count).toBeGreaterThanOrEqual(3);
    expect(payload.bottleneck_log[0].top_unblock_options.map((item: { action: string }) => item.action).join(' ')).toMatch(/buyer rows|source provenance|branch review|Supabase advisor/i);

    expect(payload.public_status_handles.progress_update_digest.id).toBe('progress_update_digest');
    expect(payload.public_status_handles.bottleneck_log_digest.id).toBe('bottleneck_log_digest');
    expect(payload.public_status_handles.progress_update_digest.sourceManifestPath).toBe('progress_updates');
    expect(payload.public_status_handles.bottleneck_log_digest.sourceManifestPath).toBe('bottleneck_log');
    expect(payload.package_script_handles.report_progress_digest_readiness).toBe('corepack pnpm run report:progress-digest-readiness');
    expect(payload.package_script_handles.check_progress_digest_report).toBe('corepack pnpm run check:progress-digest-report');
    expect(payload.proof_boundary).toMatch(/does not complete pending work|clear blockers|contact buyers|approve branches|authorize Supabase|resolve evidence gaps|request owner approval|deploy|hosted\/live parity|commercial launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused progress digest report|production approval|buyer acceptance|release readiness|branch approval|Supabase advisor clearance|source readiness|deployment approval|hosted\/live parity|commercial-ready status/i);
  });

  it('validates the focused progress digest report contract', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Progress digest readiness report check passed');
  });

  it('accepts retained proof paths and handles release_toolchain according to remaining non-proof gates', () => {
    const tempRoot = makeTempRoot();
    const { releaseProofPath, supabaseProofPath } = writeCurrentProofs(tempRoot);
    const stdout = execFileSync(process.execPath, [
      reportScriptPath,
      '--skip-probes',
      '--json',
      '--release-readiness-proof',
      releaseProofPath,
      '--supabase-app-lint-proof',
      supabaseProofPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.retained_proof_summary.release_readiness).toMatchObject({
      status: 'pass',
      validation_error_count: 0,
    });
    expect(payload.retained_proof_summary.supabase_app_lint).toMatchObject({
      status: 'pass',
      app_owned_rows: 0,
      validation_error_count: 0,
    });
    const releaseToolchainAction = payload.activities_remaining.current_phase_actions.find(
      (item: { phase: string }) => item.phase === 'release_toolchain',
    );
    if (releaseToolchainAction) {
      expect(releaseToolchainAction).toMatchObject({ status: 'blocked' });
    }
    expect(payload.activities_remaining.current_phase_action_count).toBe(payload.activities_remaining.current_phase_actions.length);
    expect(payload.activities_remaining.current_phase_action_count).toBeGreaterThanOrEqual(5);
    expect(payload.activities_remaining.completion_blocker_count).toBeGreaterThanOrEqual(3);

    const checkOutput = execFileSync(process.execPath, [
      checkScriptPath,
      '--skip-probes',
      '--release-readiness-proof',
      releaseProofPath,
      '--supabase-app-lint-proof',
      supabaseProofPath,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    expect(checkOutput).toContain('Progress digest readiness report check passed');
  });

  it('can fail as a machine gate while launch blockers remain open', () => {
    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('# CEIP Progress Digest Readiness Report');
    expect(result.stdout).toContain('Progress digest status: `blocked`');
    expect(result.stdout).toContain('Do not treat this focused progress digest report');
  });
});
