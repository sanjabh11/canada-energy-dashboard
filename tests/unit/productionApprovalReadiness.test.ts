import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-production-approval-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-production-approval-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

type ProductionApprovalRequestRow = {
  prerequisite: string;
  request_phase: string;
  blocks_request: boolean;
  proof_command: string;
};

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-production-approval-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('production approval readiness report', () => {
  it('renders a focused production approval report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'production-approval.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Production Approval Readiness Report');
    expect(stdout).toContain('Production approval status:');
    expect(stdout).toContain('Explicit owner approval:');
    expect(stdout).toContain('Request packet status:');
    expect(stdout).toContain('Request eligible:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not grant owner approval, request owner approval, run deploys');
    expect(stdout).toContain('Production Approval Prerequisite Queue');
    expect(stdout).toContain('| Clean source provenance |');
    expect(stdout).toContain('| Launch evidence validation |');
    expect(stdout).toContain('| Corepack release-readiness |');
    expect(stdout).toContain('| Canonical branch review |');
    expect(stdout).toContain('| Supabase advisor clearance |');
    expect(stdout).toContain('| Buyer evidence hard gate |');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('| Post-deploy live proof boundary |');
    expect(stdout).toContain('Production Approval Request Packet');
    expect(stdout).toContain('pre_request');
    expect(stdout).toContain('owner_decision');
    expect(stdout).toContain('post_deploy_boundary');
    expect(stdout).toContain('Launch Action Production Approval Row');
    expect(stdout).toContain('Release Preflight Owner Approval Row');
    expect(stdout).toContain('corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('corepack pnpm run report:production-approval-packet');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with approval prerequisite and request rows', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.production_approval.status).toBe('blocked');
    expect(payload.production_approval.explicit_owner_approval).toBe(false);
    expect(payload.production_approval.prerequisite_queue.item_count).toBe(8);
    expect(payload.production_approval.prerequisite_queue.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual([
      'Clean source provenance',
      'Launch evidence validation',
      'Corepack release-readiness',
      'Canonical branch review',
      'Supabase advisor clearance',
      'Buyer evidence hard gate',
      'Explicit owner production approval',
      'Post-deploy live proof boundary',
    ]);
    const prerequisiteRows = new Map<string, { prerequisite: string; proof_command: string }>(payload.production_approval.prerequisite_queue.items.map((item: { prerequisite: string; proof_command: string }) => [
      item.prerequisite,
      item,
    ]));
    const requestRows = new Map<string, ProductionApprovalRequestRow>(payload.production_approval.request_packet.items.map((item: ProductionApprovalRequestRow) => [
      item.prerequisite,
      item,
    ]));
    expect(payload.production_approval.request_packet.proof_type).toBe('production_approval_request_packet');
    expect(payload.production_approval.request_packet.status).toBe('blocked');
    expect(payload.production_approval.request_packet.request_eligible).toBe(false);
    expect(requestRows.get('Clean source provenance').request_phase).toBe('pre_request');
    expect(prerequisiteRows.get('Corepack release-readiness').proof_command).toContain('report:release-preflight');
    expect(prerequisiteRows.get('Corepack release-readiness').proof_command).toContain('check:release-preflight-report');
    expect(prerequisiteRows.get('Corepack release-readiness').proof_command).toContain('check:release-readiness');
    expect(requestRows.get('Corepack release-readiness').proof_command).toContain('report:release-preflight');
    expect(requestRows.get('Corepack release-readiness').proof_command).toContain('check:release-preflight-report');
    expect(requestRows.get('Corepack release-readiness').proof_command).toContain('check:release-readiness');
    expect(prerequisiteRows.get('Canonical branch review').proof_command).toContain('report:branch-review-readiness');
    expect(prerequisiteRows.get('Canonical branch review').proof_command).toContain('check:branch-review-report');
    expect(requestRows.get('Canonical branch review').proof_command).toContain('report:branch-review-readiness');
    expect(requestRows.get('Canonical branch review').proof_command).toContain('check:branch-review-report');
    expect(prerequisiteRows.get('Supabase advisor clearance').proof_command).toContain('report:supabase-advisor-readiness');
    expect(prerequisiteRows.get('Supabase advisor clearance').proof_command).toContain('check:supabase-advisor-report');
    expect(requestRows.get('Supabase advisor clearance').proof_command).toContain('report:supabase-advisor-readiness');
    expect(requestRows.get('Supabase advisor clearance').proof_command).toContain('check:supabase-advisor-report');
    expect(prerequisiteRows.get('Buyer evidence hard gate').proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(prerequisiteRows.get('Buyer evidence hard gate').proof_command).toContain('check:buyer-evidence-gate-report');
    expect(requestRows.get('Buyer evidence hard gate').proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(requestRows.get('Buyer evidence hard gate').proof_command).toContain('check:buyer-evidence-gate-report');
    expect(requestRows.get('Buyer evidence hard gate').request_phase).toBe('pre_request');
    expect(requestRows.get('Explicit owner production approval').request_phase).toBe('owner_decision');
    expect(requestRows.get('Post-deploy live proof boundary').request_phase).toBe('post_deploy_boundary');
    expect(requestRows.get('Explicit owner production approval').blocks_request).toBe(false);
    expect(requestRows.get('Post-deploy live proof boundary').blocks_request).toBe(false);
    expect(payload.launch_action_production_approval_row.phase).toBe('production_approval');
    expect(payload.release_preflight_owner_approval_row.requirement).toBe('Explicit owner production approval');
    expect(payload.package_script_handles.check_production_deploy_request).toBe('corepack pnpm run check:production-deploy-request');
    expect(payload.proof_boundary).toMatch(/does not grant owner approval|run deploys|clear source provenance|hosted\/live parity/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|deploy authorization|commercial-ready status/i);
  });

  it('validates the focused report contract without requiring production approval to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Production approval readiness report check passed');
  });

  it('can fail as a machine approval gate while request blockers remain', () => {
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

    expect(result.status).toBe(json.production_approval.request_packet.request_eligible === true ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Production Approval Readiness Report');
    if (json.production_approval.request_packet.request_eligible !== true) {
      expect(result.stderr).toContain('Production approval remains blocked');
      expect(result.stderr).toContain('does not grant approval, deploy, or prove hosted/live parity');
    }
  });
});
