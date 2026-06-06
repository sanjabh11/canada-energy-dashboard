import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-post-deploy-live-proof-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-post-deploy-live-proof-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-post-deploy-live-proof-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('post-deploy live proof readiness report', () => {
  it('renders a focused post-deploy live proof report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'post-deploy-live-proof.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Post-Deploy Live Proof Readiness Report');
    expect(stdout).toContain('Post-deploy live proof status:');
    expect(stdout).toContain('Current source live-proven:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not grant owner approval, deploy, push, rebuild, mutate Netlify');
    expect(stdout).toContain('Post-Deploy Live Proof Gate Queue');
    expect(stdout).toContain('| Production approval clearance |');
    expect(stdout).toContain('| Guarded production deploy completion |');
    expect(stdout).toContain('| Live public metadata |');
    expect(stdout).toContain('| Live static dist parity |');
    expect(stdout).toContain('| Hosted proof-pack route smoke |');
    expect(stdout).toContain('| Current-source hosted parity claim |');
    expect(stdout).toContain('corepack pnpm run check:post-deploy-live');
    expect(stdout).toContain('corepack pnpm run check:live-public-metadata');
    expect(stdout).toContain('corepack pnpm run check:live-static-parity');
    expect(stdout).toContain('corepack pnpm run test:browser:hosted:proof-packs');
    expect(stdout).toContain('DEPLOY CEIP PRODUCTION');
    expect(stdout).toContain('Launch Action Post-Deploy Row');
    expect(stdout).toContain('Production Approval Live Prerequisite');
    expect(stdout).toContain('Production Approval Request Live Row');
    expect(stdout).toContain('post_deploy_boundary');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with post-deploy gate rows and no-live-proof boundaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.post_deploy_live_proof.current_source_live_proven).toBe(false);
    expect(payload.post_deploy_live_proof.gate_queue.status).toBe('blocked');
    expect(payload.post_deploy_live_proof.gate_queue.item_count).toBe(6);
    expect(payload.post_deploy_live_proof.gate_queue.blocked_count).toBe(6);
    expect(payload.post_deploy_live_proof.gate_queue.items.map((item: { gate: string }) => item.gate)).toEqual([
      'Production approval clearance',
      'Guarded production deploy completion',
      'Live public metadata',
      'Live static dist parity',
      'Hosted proof-pack route smoke',
      'Current-source hosted parity claim',
    ]);
    expect(payload.package_script_handles.check_post_deploy_live).toBe('corepack pnpm run check:post-deploy-live');
    expect(payload.package_script_handles.check_live_public_metadata).toBe('corepack pnpm run check:live-public-metadata');
    expect(payload.package_script_handles.check_live_static_parity).toBe('corepack pnpm run check:live-static-parity');
    expect(payload.package_script_handles.test_browser_hosted_proof_packs).toBe('corepack pnpm run test:browser:hosted:proof-packs');
    const deployGate = payload.post_deploy_live_proof.gate_queue.items.find(
      (item: { gate: string }) => item.gate === 'Guarded production deploy completion',
    );
    expect(deployGate.approval_required).toBe(true);
    expect(deployGate.approval_phrase).toBe('DEPLOY CEIP PRODUCTION');
    expect(payload.launch_action_post_deploy_row.phase).toBe('post_deploy_live_proof');
    expect(payload.production_approval_live_prerequisite.prerequisite).toBe('Post-deploy live proof boundary');
    expect(payload.production_approval_live_prerequisite.proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(payload.production_approval_live_prerequisite.proof_command).toContain('check:post-deploy-live-proof-report');
    expect(payload.production_approval_live_prerequisite.needed).toMatch(/underlying check:post-deploy-live/i);
    expect(payload.production_approval_request_live_row.request_phase).toBe('post_deploy_boundary');
    expect(payload.production_approval_request_live_row.blocks_request).toBe(false);
    expect(payload.production_approval_request_live_row.proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(payload.production_approval_request_live_row.proof_command).toContain('check:post-deploy-live-proof-report');
    expect(payload.production_approval_request_live_row.evidence_to_attach).toMatch(/underlying check:post-deploy-live result/i);
    expect(payload.proof_boundary).toMatch(/does not grant owner approval|deploy|mutate Netlify|run browser smoke|prove hosted\/live parity/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|post-deploy live proof/i);
  });

  it('validates the focused report contract without requiring live proof to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Post-deploy live proof readiness report check passed');
  });

  it('can fail as a machine post-deploy gate while live-proof blockers remain', () => {
    const json = JSON.parse(execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    }));

    const result = spawnSync(process.execPath, [reportScriptPath, '--skip-probes', '--fail-on-blocker'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(result.status).toBe(json.post_deploy_live_proof.status === 'pass' ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Post-Deploy Live Proof Readiness Report');
    if (json.post_deploy_live_proof.status !== 'pass') {
      expect(result.stderr).toContain('Post-deploy live proof remains blocked');
      expect(result.stderr).toContain('does not deploy or prove hosted/live parity');
    }
  });
});
