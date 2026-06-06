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
    expect(stdout).toContain('Post-Deploy Live Proof Operator Handoff Packet');
    expect(stdout).toContain('post_deploy_live_proof_operator_handoff_packet');
    expect(stdout).toContain('Execution Gate');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('Live Account Required');
    expect(stdout).toContain('Browser Smoke Required');
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
    const operatorHandoffPacket = payload.post_deploy_live_proof.operator_handoff_packet;
    expect(operatorHandoffPacket.proof_type).toBe('post_deploy_live_proof_operator_handoff_packet');
    expect(operatorHandoffPacket.source).toBe('post_deploy_live_proof.gate_queue.items');
    expect(operatorHandoffPacket.item_count).toBe(payload.post_deploy_live_proof.gate_queue.items.length);
    expect(operatorHandoffPacket.blocked_count).toBe(
      operatorHandoffPacket.items.filter((item: { blocks_live_proof_gate: boolean }) => item.blocks_live_proof_gate).length,
    );
    expect(operatorHandoffPacket.approved_deploy_count).toBe(
      operatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'approved_deploy_execution').length,
    );
    expect(operatorHandoffPacket.hosted_probe_count).toBe(
      operatorHandoffPacket.items.filter((item: { proof_type: string }) => ['hosted_metadata_probe', 'hosted_static_parity_probe'].includes(item.proof_type)).length,
    );
    expect(operatorHandoffPacket.browser_smoke_count).toBe(
      operatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'hosted_browser_smoke').length,
    );
    expect(operatorHandoffPacket.items.map((item: { gate: string }) => item.gate)).toEqual(
      payload.post_deploy_live_proof.gate_queue.items.map((item: { gate: string }) => item.gate),
    );
    expect(operatorHandoffPacket.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const operatorRowsByGate = new Map<string, {
      execution_gate: string;
      approval_required: boolean;
      approval_phrase: string | null;
      deploy_required: boolean;
      live_account_required: boolean;
      browser_smoke_required: boolean;
      proof_command: string;
      proof_boundary: string;
      stop_gate: string;
    }>(operatorHandoffPacket.items.map((item: {
      gate: string;
      execution_gate: string;
      approval_required: boolean;
      approval_phrase: string | null;
      deploy_required: boolean;
      live_account_required: boolean;
      browser_smoke_required: boolean;
      proof_command: string;
      proof_boundary: string;
      stop_gate: string;
    }) => [item.gate, item]));
    expect(operatorRowsByGate.get('Production approval clearance')?.execution_gate).toBe('production_approval_clearance_first');
    expect(operatorRowsByGate.get('Guarded production deploy completion')?.execution_gate).toBe('approved_deploy_after_owner_phrase');
    expect(operatorRowsByGate.get('Guarded production deploy completion')?.approval_required).toBe(true);
    expect(operatorRowsByGate.get('Guarded production deploy completion')?.approval_phrase).toBe('DEPLOY CEIP PRODUCTION');
    expect(operatorRowsByGate.get('Guarded production deploy completion')?.deploy_required).toBe(true);
    expect(operatorRowsByGate.get('Live public metadata')?.execution_gate).toBe('live_metadata_after_approved_deploy');
    expect(operatorRowsByGate.get('Live static dist parity')?.execution_gate).toBe('static_parity_after_metadata_and_build');
    expect(operatorRowsByGate.get('Hosted proof-pack route smoke')?.execution_gate).toBe('hosted_smoke_after_deploy');
    expect(operatorRowsByGate.get('Hosted proof-pack route smoke')?.browser_smoke_required).toBe(true);
    expect(operatorRowsByGate.get('Current-source hosted parity claim')?.execution_gate).toBe('parity_claim_after_all_live_gates_pass');
    expect(operatorRowsByGate.get('Current-source hosted parity claim')?.live_account_required).toBe(true);
    for (const row of operatorHandoffPacket.items) {
      const sourceRow = payload.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === row.gate);
      expect(row.proof_command).toBe(sourceRow.proof_command);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not grant owner approval|run deploys|mutate Netlify|access live accounts|run browser smoke|hosted\/live parity/i);
      expect(row.stop_gate).toMatch(/Do not execute deploy or live-proof work|claim hosted\/live parity|mark this row ready/i);
    }
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
    expect(stdout).toContain('operator handoff packet');
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

    const ready = json.post_deploy_live_proof.status === 'pass'
      && json.post_deploy_live_proof.current_source_live_proven === true
      && json.post_deploy_live_proof.operator_handoff_packet.status === 'ready';
    expect(result.status).toBe(ready ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Post-Deploy Live Proof Readiness Report');
    if (!ready) {
      expect(result.stderr).toContain('Post-deploy live proof remains blocked');
      expect(result.stderr).toContain('does not deploy or prove hosted/live parity');
    }
  });
});
