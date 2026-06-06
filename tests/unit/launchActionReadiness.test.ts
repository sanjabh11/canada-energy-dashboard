import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const reportScriptPath = path.join(process.cwd(), 'scripts/report-launch-action-readiness.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-launch-action-readiness-report.mjs');
const timeout = 180_000;
const tempRoots: string[] = [];

type LaunchActionRow = {
  phase: string;
  proof_command: string;
  proof_type: string;
  status: string;
};

type LaneStatusRow = {
  lane: string;
  status: string;
  current: string;
  proof_command: string;
};

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-launch-action-'));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('launch action readiness report', () => {
  it('renders a focused launch action report from the launch manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'launch-action.md');
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('# CEIP Launch Action Readiness Report');
    expect(stdout).toContain('Launch action queue status:');
    expect(stdout).toContain('Open action rows:');
    expect(stdout).toContain('First open action:');
    expect(stdout).toContain('Decision Boundary');
    expect(stdout).toContain('does not commit, unstage, stash, revert, clear source provenance');
    expect(stdout).toMatch(/contact buyers[\s\S]*authorize Supabase[\s\S]*request owner approval[\s\S]*deploy/i);
    expect(stdout).toContain('Launch Blocker Action Queue');
    for (const phase of [
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]) {
      expect(stdout).toContain(`| ${phase} |`);
    }
    expect(stdout).toContain('Lane Status Summary');
    expect(stdout).toContain('corepack pnpm run report:source-provenance-readiness');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-validation-readiness');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-validation-report');
    expect(stdout).toContain('corepack pnpm run report:production-approval-readiness');
    expect(stdout).toContain('corepack pnpm run report:post-deploy-live-proof-readiness');
    expect(stdout).toContain('| buyer_evidence | blocked |');
    expect(stdout).toContain('hard_gate_status=skipped');
    expect(stdout).toContain('acquisition_status=blocked');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  });

  it('emits a focused JSON payload with all launch action phases and lane summaries', () => {
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);
    const items: LaunchActionRow[] = payload.launch_action_queue.items;
    const rowsByPhase = new Map<string, LaunchActionRow>(items.map((item) => [
      item.phase,
      item,
    ]));
    const laneRows: LaneStatusRow[] = payload.lane_status_summary;
    const lanes = laneRows.map((item) => item.lane);
    const lanesByName = new Map<string, LaneStatusRow>(laneRows.map((item) => [
      item.lane,
      item,
    ]));
    const buyerLane = lanesByName.get('buyer_evidence');

    expect(payload.schema_version).toBe(1);
    expect(payload.launch_decision).toBe('blocked');
    expect(payload.launch_action_queue.status).toBe('blocked');
    expect(payload.launch_action_queue.item_count).toBe(8);
    expect(payload.launch_action_queue.blocked_count).toBeGreaterThanOrEqual(1);
    expect(items.map((item) => item.phase)).toEqual([
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]);
    expect(payload.first_open_action.status).not.toBe('ready');
    expect(rowsByPhase.get('source_provenance')?.proof_type).toBe('source_provenance_decision');
    expect(rowsByPhase.get('source_provenance')?.proof_command).toContain('report:source-provenance-readiness');
    expect(rowsByPhase.get('source_provenance')?.proof_command).toContain('check:source-provenance-report');
    expect(rowsByPhase.get('launch_evidence_validation')?.status).toBe('ready');
    expect(rowsByPhase.get('release_toolchain')?.proof_type).toBe('release_toolchain_and_gated_release');
    expect(rowsByPhase.get('release_toolchain')?.proof_command).toContain('report:release-preflight');
    expect(rowsByPhase.get('release_toolchain')?.proof_command).toContain('check:release-preflight-report');
    expect(rowsByPhase.get('release_toolchain')?.proof_command).toContain('check:release-readiness');
    expect(rowsByPhase.get('branch_review')?.proof_type).toBe('read_only_branch_review');
    expect(rowsByPhase.get('branch_review')?.proof_command).toContain('report:branch-review-readiness');
    expect(rowsByPhase.get('branch_review')?.proof_command).toContain('check:branch-review-report');
    expect(rowsByPhase.get('supabase_advisor')?.proof_type).toBe('external_account_evidence');
    expect(rowsByPhase.get('supabase_advisor')?.proof_command).toContain('report:supabase-advisor-readiness');
    expect(rowsByPhase.get('supabase_advisor')?.proof_command).toContain('check:supabase-advisor-report');
    expect(rowsByPhase.get('buyer_evidence')?.proof_type).toBe('retained_buyer_evidence_validation');
    expect(rowsByPhase.get('buyer_evidence')?.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(rowsByPhase.get('buyer_evidence')?.proof_command).toContain('check:buyer-evidence-gate-report');
    expect(rowsByPhase.get('production_approval')?.proof_type).toBe('manual_approval_gate');
    expect(rowsByPhase.get('post_deploy_live_proof')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(lanes).toEqual(expect.arrayContaining([
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]));
    expect(buyerLane?.status).toBe('blocked');
    expect(buyerLane?.current).toContain('open_hard_gate_rows=');
    expect(buyerLane?.current).toContain('hard_gate_status=skipped');
    expect(buyerLane?.current).toContain('acquisition_status=blocked');
    expect(buyerLane?.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.package_script_handles.check_launch_action_report).toBe('corepack pnpm run check:launch-action-report');
    expect(payload.package_script_handles.check_launch_evidence_validation_report).toBe('corepack pnpm run check:launch-evidence-validation-report');
    expect(payload.proof_boundary).toMatch(/does not commit|clear source provenance|contact buyers|authorize Supabase|deploy|commercial launch readiness/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|commercial-ready status/i);
  });

  it('validates the focused report contract without requiring the action queue to pass', () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Launch action readiness report check passed');
  });

  it('can fail as a machine gate while launch action blockers remain', () => {
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

    expect(result.status).toBe(json.launch_action_queue.status === 'ready' ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Launch Action Readiness Report');
    if (json.launch_action_queue.status !== 'ready') {
      expect(result.stderr).toContain('Launch action queue remains blocked');
      expect(result.stderr).toContain('does not clear blockers, deploy, or create launch readiness');
    }
  });
});
