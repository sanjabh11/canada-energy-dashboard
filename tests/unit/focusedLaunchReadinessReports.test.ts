import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const checkScriptPath = path.join(process.cwd(), 'scripts/check-focused-launch-readiness-reports.mjs');
const timeout = 300_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-focused-suite-'));
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

describe('focused launch readiness report suite', () => {
  it('runs the focused report contract checks without claiming launch readiness', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Focused Launch Readiness Report Suite');
    expect(stdout).toContain('Status: pass');
    expect(stdout).toContain('Focused report checks: 12/12 passed');
    expect(stdout).toContain('Skip probes: yes');
    expect(stdout).toContain('## Decision Boundary');
    expect(stdout).toMatch(/does not clear source provenance|run release-readiness|choose canonical branch heads|authorize Supabase|contact buyers|request or grant owner approval|push|deploy|hosted\/live parity|create launch readiness/i);
    expect(stdout).toContain('launch_action: pass');
    expect(stdout).toContain('launch_evidence_validation: pass');
    expect(stdout).toContain('source_provenance: pass');
    expect(stdout).toContain('release_preflight: pass');
    expect(stdout).toContain('branch_review: pass');
    expect(stdout).toContain('supabase_advisor: pass');
    expect(stdout).toContain('buyer_evidence: pass');
    expect(stdout).toContain('production_approval: pass');
    expect(stdout).toContain('post_deploy_live_proof: pass');
    expect(stdout).toContain('progress_digest: pass');
    expect(stdout).toContain('objective_completion_audit: pass');
    expect(stdout).toContain('adversarial_review: pass');
    expect(stdout).toContain('## Package Script Handles');
    expect(stdout).toContain('corepack pnpm run check:focused-launch-readiness-reports');
    expect(stdout).toContain('corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes');
    expect(stdout).toContain('corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes --json');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-manifest');
    expect(stdout).toContain('corepack pnpm run check:commercial-launch-readiness-report');
    expect(stdout).toContain('## Blocking Gate Handles');
    expect(stdout).toMatch(/not executed by this aggregate suite|do not treat their presence/i);
    expect(stdout).toContain('corepack pnpm run report:buyer-evidence-readiness');
    expect(stdout).toContain('corepack pnpm run check:buyer-evidence-readiness-report');
    expect(stdout).toContain('corepack pnpm run report:production-approval-packet');
    expect(stdout).toContain('corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('corepack pnpm run check:post-deploy-live');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-schema');
    expect(stdout).toContain('validate_launch_evidence.py <manifest>');
  });

  it('emits structured JSON for operator handoff and automation logs', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.status).toBe('pass');
    expect(payload.skip_probes).toBe(true);
    expect(payload.check_count).toBe(12);
    expect(payload.pass_count).toBe(12);
    expect(payload.fail_count).toBe(0);
    expect(payload.checks.map((item: { id: string }) => item.id)).toEqual([
      'launch_action',
      'launch_evidence_validation',
      'source_provenance',
      'release_preflight',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
      'progress_digest',
      'objective_completion_audit',
      'adversarial_review',
    ]);
    expect(payload.checks.every((item: { status: string; command: string }) => (
      item.status === 'pass' && item.command.includes('--skip-probes')
    ))).toBe(true);
    expect(payload.package_script_handles.check_focused_launch_readiness_reports).toBe('corepack pnpm run check:focused-launch-readiness-reports');
    expect(payload.package_script_handles.check_focused_launch_readiness_reports_skip_probes).toBe('corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes');
    expect(payload.package_script_handles.check_focused_launch_readiness_reports_json).toBe('corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes --json');
    expect(payload.package_script_handles.report_launch_evidence_manifest).toBe('corepack pnpm run report:launch-evidence-manifest');
    expect(payload.package_script_handles.check_launch_evidence_manifest).toBe('corepack pnpm run check:launch-evidence-manifest');
    expect(payload.package_script_handles.check_commercial_launch_readiness_report).toBe('corepack pnpm run check:commercial-launch-readiness-report');
    expect(payload.blocking_gate_handles.report_buyer_evidence_readiness).toBe('corepack pnpm run report:buyer-evidence-readiness');
    expect(payload.blocking_gate_handles.check_buyer_evidence_readiness_report).toBe('corepack pnpm run check:buyer-evidence-readiness-report');
    expect(payload.blocking_gate_handles.report_production_approval_packet).toBe('corepack pnpm run report:production-approval-packet');
    expect(payload.blocking_gate_handles.report_unmerged_branch_readiness_high_risk).toBe('corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high');
    expect(payload.blocking_gate_handles.check_release_readiness).toBe('corepack pnpm run check:release-readiness');
    expect(payload.blocking_gate_handles.check_production_deploy_request).toBe('corepack pnpm run check:production-deploy-request');
    expect(payload.blocking_gate_handles.check_post_deploy_live).toBe('corepack pnpm run check:post-deploy-live');
    expect(payload.blocking_gate_handles.check_launch_evidence_schema).toBe('corepack pnpm run check:launch-evidence-schema');
    expect(payload.blocking_gate_handles.validate_launch_evidence_schema).toContain('validate_launch_evidence.py <manifest>');
    expect(payload.blocking_gate_boundary).toMatch(/not executed by this aggregate suite|release-readiness|production deploy approval|post-deploy live proof|buyer evidence|branch approval|source cleanup|launch readiness/i);
    expect(payload.proof_boundary).toMatch(/does not clear source provenance|run release-readiness|authorize Supabase|contact buyers|deploy|hosted\/live parity|launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this suite|commercial-ready status|buyer acceptance|production approval|deploy authorization|current hosted\/live proof/i);
  });

  it('routes retained proof paths only to proof-aware child checks', () => {
    const tempRoot = makeTempRoot();
    const { releaseProofPath, supabaseProofPath } = writeCurrentProofs(tempRoot);
    const stdout = execFileSync(process.execPath, [
      checkScriptPath,
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
    const checksById = new Map(payload.checks.map((item: { id: string }) => [item.id, item]));

    expect(payload.status).toBe('pass');
    for (const id of [
      'launch_evidence_validation',
      'production_approval',
      'progress_digest',
      'objective_completion_audit',
    ]) {
      expect((checksById.get(id) as { command: string }).command).toContain('--release-readiness-proof');
      expect((checksById.get(id) as { command: string }).command).toContain('--supabase-app-lint-proof');
    }
    expect((checksById.get('release_preflight') as { command: string }).command).toContain('--release-readiness-proof');
    expect((checksById.get('release_preflight') as { command: string }).command).not.toContain('--supabase-app-lint-proof');
    expect((checksById.get('supabase_advisor') as { command: string }).command).toContain('--supabase-app-lint-proof');
    expect((checksById.get('supabase_advisor') as { command: string }).command).not.toContain('--release-readiness-proof');
    expect((checksById.get('branch_review') as { command: string }).command).not.toContain('--release-readiness-proof');
    expect((checksById.get('buyer_evidence') as { command: string }).command).not.toContain('--supabase-app-lint-proof');
  });
});
