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
  owner: string;
  blocker: string;
  action: string;
};

type LaunchActionOperatorHandoffRow = {
  phase: string;
  execution_gate: string;
  proof_command: string;
  proof_type: string;
  status: string;
  blocks_launch_clearance: boolean;
  owner_approval_required: boolean;
  external_account_required: boolean;
  buyer_evidence_required: boolean;
  read_only_required: boolean;
  source_provenance_required: boolean;
  release_gate_required: boolean;
  post_deploy_boundary: boolean;
  can_execute_from_packet: boolean;
  proof_boundary: string;
  stop_gate: string;
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
    expect(stdout).toContain('Launch Action Operator Handoff Packet');
    expect(stdout).toContain('launch_action_operator_handoff_packet');
    expect(stdout).toContain('launch_action_queue.items');
    expect(stdout).toContain('Execution Gate');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('Owner Approval Required');
    expect(stdout).toContain('planning evidence only');
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
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('launch_blocker_action_queue');
    expect(stdout).toContain('launch_action_operator_handoff_packet');
    expect(stdout).toContain('launch_action_queue.operator_handoff_packet');
    expect(stdout).toContain('| buyer_evidence | external_gate |');
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
    const operatorItems: LaunchActionOperatorHandoffRow[] = payload.launch_action_queue.operator_handoff_packet.items;
    const operatorRowsByPhase = new Map<string, LaunchActionOperatorHandoffRow>(operatorItems.map((item) => [
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
    expect(rowsByPhase.get('production_approval')?.proof_command).toContain('report:production-approval-readiness');
    expect(rowsByPhase.get('production_approval')?.proof_command).toContain('check:production-approval-report');
    expect(rowsByPhase.get('post_deploy_live_proof')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(rowsByPhase.get('post_deploy_live_proof')?.proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(rowsByPhase.get('post_deploy_live_proof')?.proof_command).toContain('check:post-deploy-live-proof-report');
    expect(payload.launch_action_queue.operator_handoff_packet.proof_type).toBe('launch_action_operator_handoff_packet');
    expect(payload.launch_action_queue.operator_handoff_packet.source).toBe('launch_action_queue.items');
    expect(payload.launch_action_queue.operator_handoff_packet.status).toBe('blocked');
    expect(payload.launch_action_queue.operator_handoff_packet.item_count).toBe(items.length);
    expect(payload.launch_action_queue.operator_handoff_packet.blocked_count).toBe(
      operatorItems.filter((item) => item.blocks_launch_clearance).length,
    );
    expect(payload.launch_action_queue.operator_handoff_packet.ready_count).toBe(
      operatorItems.filter((item) => item.status === 'ready').length,
    );
    expect(payload.launch_action_queue.operator_handoff_packet.manual_stop_count).toBe(
      operatorItems.filter((item) => item.status === 'manual_stop').length,
    );
    expect(payload.launch_action_queue.operator_handoff_packet.external_gate_count).toBe(
      operatorItems.filter((item) => item.status === 'external_gate').length,
    );
    expect(payload.launch_action_queue.operator_handoff_packet.owner_approval_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.external_account_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.buyer_evidence_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.read_only_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.source_provenance_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.release_gate_count).toBe(1);
    expect(payload.launch_action_queue.operator_handoff_packet.post_deploy_boundary_count).toBe(1);
    expect(operatorItems.map((item) => item.phase)).toEqual(items.map((item) => item.phase));
    expect(payload.launch_action_queue.operator_handoff_packet.proof_boundary).toMatch(/planning evidence only|does not execute queue rows|clear blockers|contact buyers|authorize Supabase|request owner approval|deploy|hosted\/live parity|raise launch status/i);
    expect(payload.launch_action_queue.operator_handoff_packet.stop_gate).toMatch(/Do not execute launch actions|mark blockers ready|request production approval|deploy-production|netlify deploy|contact buyers|access Supabase|commercial-ready status/i);
    expect(operatorRowsByPhase.get('source_provenance')?.execution_gate).toBe('resolve_source_provenance_first');
    expect(operatorRowsByPhase.get('source_provenance')?.source_provenance_required).toBe(true);
    expect(operatorRowsByPhase.get('launch_evidence_validation')?.execution_gate).toBe('attach_launch_validation_evidence');
    expect(operatorRowsByPhase.get('release_toolchain')?.execution_gate).toBe('release_toolchain_after_clean_source');
    expect(operatorRowsByPhase.get('release_toolchain')?.release_gate_required).toBe(true);
    expect(operatorRowsByPhase.get('branch_review')?.execution_gate).toBe('read_only_branch_review_before_approval');
    expect(operatorRowsByPhase.get('branch_review')?.read_only_required).toBe(true);
    expect(operatorRowsByPhase.get('supabase_advisor')?.execution_gate).toBe('supabase_advisor_after_authorization');
    expect(operatorRowsByPhase.get('supabase_advisor')?.external_account_required).toBe(true);
    expect(operatorRowsByPhase.get('buyer_evidence')?.execution_gate).toBe('buyer_evidence_before_commercial_ready_claims');
    expect(operatorRowsByPhase.get('buyer_evidence')?.buyer_evidence_required).toBe(true);
    expect(operatorRowsByPhase.get('buyer_evidence')?.status).toBe('external_gate');
    expect(operatorRowsByPhase.get('buyer_evidence')?.blocks_launch_clearance).toBe(false);
    expect(operatorRowsByPhase.get('production_approval')?.execution_gate).toBe('owner_approval_after_all_prelaunch_gates');
    expect(operatorRowsByPhase.get('production_approval')?.owner_approval_required).toBe(true);
    expect(operatorRowsByPhase.get('post_deploy_live_proof')?.execution_gate).toBe('post_deploy_proof_after_approved_deploy');
    expect(operatorRowsByPhase.get('post_deploy_live_proof')?.post_deploy_boundary).toBe(true);
    for (const row of operatorItems) {
      const queueRow = rowsByPhase.get(row.phase);
      expect(row.proof_command).toBe(queueRow?.proof_command);
      expect(row.proof_type).toBe(queueRow?.proof_type);
      expect(row.status).toBe(queueRow?.status);
      expect(row.blocks_launch_clearance).toBe(queueRow?.status !== 'ready' && queueRow?.status !== 'external_gate');
      expect(row.can_execute_from_packet).toBe(false);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not execute the row|clear blockers|contact buyers|access Supabase|request owner approval|deploy|live proof|launch readiness/i);
      expect(row.stop_gate).toMatch(/Do not execute this launch action|mark it ready|clear blockers|claim launch readiness/i);
    }
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
    expect(buyerLane?.status).toBe('external_gate');
    expect(buyerLane?.current).toContain('open_hard_gate_rows=');
    expect(buyerLane?.current).toContain('hard_gate_status=skipped');
    expect(buyerLane?.current).toContain('acquisition_status=blocked');
    expect(buyerLane?.proof_command).toContain('report:buyer-evidence-gate-readiness');
    expect(payload.package_script_handles.check_launch_action_report).toBe('corepack pnpm run check:launch-action-report');
    expect(payload.package_script_handles.check_launch_evidence_validation_report).toBe('corepack pnpm run check:launch-evidence-validation-report');
    expect(payload.public_status_handles.launch_blocker_action_queue.id).toBe('launch_blocker_action_queue');
    expect(payload.public_status_handles.launch_action_operator_handoff_packet.id).toBe('launch_action_operator_handoff_packet');
    expect(payload.public_status_handles.launch_blocker_action_queue.command).toContain('report:launch-action-readiness');
    expect(payload.public_status_handles.launch_blocker_action_queue.command).toContain('check:launch-action-report');
    expect(payload.public_status_handles.launch_blocker_action_queue.sourceManifestPath).toBe('launch_action_queue');
    expect(payload.public_status_handles.launch_action_operator_handoff_packet.sourceManifestPath).toBe('launch_action_queue.operator_handoff_packet');
    expect(payload.public_status_handles.launch_action_operator_handoff_packet.sourceProofTypes).toContain('launch_action_operator_handoff_packet');
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
    expect(stdout).toContain('operator handoff packet');
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

    const actionReady = json.launch_action_queue.status === 'ready'
      && json.launch_action_queue.blocked_count === 0
      && json.launch_action_queue.operator_handoff_packet.status === 'ready';
    expect(result.status).toBe(actionReady ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Launch Action Readiness Report');
    if (!actionReady) {
      expect(result.stderr).toContain('Launch action queue remains blocked');
      expect(result.stderr).toContain('does not clear blockers, deploy, or create launch readiness');
    }
  });
});
