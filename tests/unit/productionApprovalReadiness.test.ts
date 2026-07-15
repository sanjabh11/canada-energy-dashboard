import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  status: string;
  proof_command: string;
  source_status: string;
  proof_type: string;
};

type ProductionApprovalOperatorHandoffRow = {
  prerequisite: string;
  request_phase: string;
  execution_gate: string;
  source_status: string;
  status: string;
  blocks_approval_request: boolean;
  owner_decision_required: boolean;
  post_deploy_boundary: boolean;
  can_execute_from_packet: boolean;
  proof_command: string;
  proof_type: string;
  proof_boundary: string;
  stop_gate: string;
};

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-production-approval-'));
  tempRoots.push(root);
  return root;
}

function gitText(args: string[]) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    timeout,
  }).trim();
}

function isWorktreeClean() {
  return gitText(['status', '--porcelain=v1']).length === 0;
}

function writeReleaseReadinessProof(root: string) {
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const proofPath = path.join(root, 'release-readiness-proof.json');
  writeFileSync(proofPath, `${JSON.stringify({
    schema_version: 1,
    generated_by: 'scripts/record-release-readiness-proof.mjs',
    generated_at: '2026-06-08T00:00:00.000Z',
    started_at: '2026-06-08T00:00:00.000Z',
    command: 'corepack pnpm run check:release-readiness',
    status: 'pass',
    exit_code: 0,
    duration_ms: 123,
    repo: {
      name: pkg.name,
      path: process.cwd(),
      branch: gitText(['branch', '--show-current']),
      commit: gitText(['rev-parse', '--short', 'HEAD']),
      package_manager: pkg.packageManager,
    },
    source_clean: true,
    corepack_pnpm_version: '10.23.0',
    git_lfs_version: 'git-lfs/3.6.1',
    stdout_tail: 'Release-readiness proof fixture.',
    stderr_tail: '',
    proof_boundary: 'This fixture records local release-readiness only; it does not grant owner approval or hosted/live parity.',
    stop_gate: 'Do not treat this fixture as production approval.',
  }, null, 2)}\n`);
  return proofPath;
}

function writeSupabaseAppLintProof(root: string) {
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const proofPath = path.join(root, 'supabase-app-lint-proof.json');
  writeFileSync(proofPath, `${JSON.stringify({
    schema_version: 1,
    generated_by: 'scripts/record-supabase-app-lint-proof.mjs',
    generated_at: '2026-06-09T00:00:00.000Z',
    started_at: '2026-06-09T00:00:00.000Z',
    command: 'corepack pnpm run check:supabase-app-lint',
    status: 'pass',
    exit_code: 0,
    duration_ms: 123,
    repo: {
      name: pkg.name,
      path: process.cwd(),
      branch: gitText(['branch', '--show-current']),
      commit: gitText(['rev-parse', '--short', 'HEAD']),
      package_manager: pkg.packageManager,
    },
    source_clean: true,
    total_lint_rows: 14,
    extension_owned_rows: 14,
    extension_owned_issues: 37,
    app_owned_rows: 0,
    app_owned_issues: 0,
    extension_owned_functions: ['public.addauth', 'public.postgis_full_version'],
    stdout_tail: 'Supabase app lint check passed: no app-owned lint findings remain.',
    stderr_tail: '',
    proof_boundary: 'This fixture records local Supabase app lint only; it does not authorize Supabase connectors or production approval.',
    stop_gate: 'Do not treat this fixture as Supabase advisor clearance.',
  }, null, 2)}\n`);
  return proofPath;
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
    expect(stdout).toContain('Production Approval Operator Handoff Packet');
    expect(stdout).toContain('production_approval_operator_handoff_packet');
    expect(stdout).toContain('production_approval.request_packet.items');
    expect(stdout).toContain('Execution Gate');
    expect(stdout).toContain('Can Execute From Packet');
    expect(stdout).toContain('Owner Decision Required');
    expect(stdout).toContain('planning evidence only');
    expect(stdout).toContain('Launch Action Production Approval Row');
    expect(stdout).toContain('Release Preflight Owner Approval Row');
    expect(stdout).toContain('Public Release Status Handles');
    expect(stdout).toContain('production_approval_prerequisite_queue');
    expect(stdout).toContain('production_approval_request_packet');
    expect(stdout).toContain('production_approval_operator_handoff_packet');
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
    const operatorRows = new Map<string, ProductionApprovalOperatorHandoffRow>(payload.production_approval.operator_handoff_packet.items.map((item: ProductionApprovalOperatorHandoffRow) => [
      item.prerequisite,
      item,
    ]));
    expect(payload.production_approval.request_packet.proof_type).toBe('production_approval_request_packet');
    expect(payload.production_approval.request_packet.status).toBe('blocked');
    expect(payload.production_approval.request_packet.request_eligible).toBe(false);
    expect(requestRows.get('Clean source provenance').request_phase).toBe('pre_request');
    expect(prerequisiteRows.get('Launch evidence validation').proof_command).toContain('report:launch-evidence-validation-readiness');
    expect(prerequisiteRows.get('Launch evidence validation').proof_command).toContain('check:launch-evidence-validation-report');
    expect(requestRows.get('Launch evidence validation').proof_command).toContain('report:launch-evidence-validation-readiness');
    expect(requestRows.get('Launch evidence validation').proof_command).toContain('check:launch-evidence-validation-report');
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
    expect(requestRows.get('Buyer evidence hard gate').request_phase).toBe('market_confidence_boundary');
    expect(requestRows.get('Buyer evidence hard gate').status).toBe('external_gate');
    expect(requestRows.get('Buyer evidence hard gate').blocks_request).toBe(false);
    expect(requestRows.get('Explicit owner production approval').request_phase).toBe('owner_decision');
    expect(requestRows.get('Post-deploy live proof boundary').request_phase).toBe('post_deploy_boundary');
    expect(prerequisiteRows.get('Post-deploy live proof boundary').proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(prerequisiteRows.get('Post-deploy live proof boundary').proof_command).toContain('check:post-deploy-live-proof-report');
    expect(requestRows.get('Post-deploy live proof boundary').proof_command).toContain('report:post-deploy-live-proof-readiness');
    expect(requestRows.get('Post-deploy live proof boundary').proof_command).toContain('check:post-deploy-live-proof-report');
    expect(requestRows.get('Explicit owner production approval').blocks_request).toBe(false);
    expect(requestRows.get('Post-deploy live proof boundary').blocks_request).toBe(false);
    expect(payload.production_approval.operator_handoff_packet.proof_type).toBe('production_approval_operator_handoff_packet');
    expect(payload.production_approval.operator_handoff_packet.source).toBe('production_approval.request_packet.items');
    expect(payload.production_approval.operator_handoff_packet.status).toBe('blocked');
    expect(payload.production_approval.operator_handoff_packet.item_count).toBe(payload.production_approval.request_packet.items.length);
    expect(payload.production_approval.operator_handoff_packet.request_blocking_count).toBe(
      payload.production_approval.operator_handoff_packet.items.filter((item: ProductionApprovalOperatorHandoffRow) => item.blocks_approval_request).length,
    );
    expect(payload.production_approval.operator_handoff_packet.external_gate_count).toBe(
      payload.production_approval.operator_handoff_packet.items.filter((item: ProductionApprovalOperatorHandoffRow) => item.status === 'external_gate').length,
    );
    expect(payload.production_approval.operator_handoff_packet.owner_decision_count).toBe(1);
    expect(payload.production_approval.operator_handoff_packet.post_deploy_boundary_count).toBe(1);
    expect(payload.production_approval.operator_handoff_packet.items.map((item: ProductionApprovalOperatorHandoffRow) => item.prerequisite)).toEqual(
      payload.production_approval.request_packet.items.map((item: ProductionApprovalRequestRow) => item.prerequisite),
    );
    expect(payload.production_approval.operator_handoff_packet.proof_boundary).toMatch(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|hosted\/live parity/i);
    expect(payload.production_approval.operator_handoff_packet.stop_gate).toMatch(/Do not request or claim production approval|deploy-production|netlify deploy|contact buyers|access Supabase|hosted\/live parity/i);
    expect(operatorRows.get('Clean source provenance').execution_gate).toBe('clean_source_provenance_first');
    expect(operatorRows.get('Launch evidence validation').execution_gate).toBe('attach_manifest_validation_evidence');
    expect(operatorRows.get('Corepack release-readiness').execution_gate).toBe('release_readiness_after_clean_source');
    expect(operatorRows.get('Canonical branch review').execution_gate).toBe('branch_review_before_owner_request');
    expect(operatorRows.get('Supabase advisor clearance').execution_gate).toBe('supabase_advisor_after_authorization');
    expect(operatorRows.get('Buyer evidence hard gate').execution_gate).toBe('buyer_evidence_before_commercial_ready_claims');
    expect(operatorRows.get('Buyer evidence hard gate').blocks_approval_request).toBe(false);
    expect(operatorRows.get('Explicit owner production approval').execution_gate).toBe('owner_approval_after_pre_request_gates');
    expect(operatorRows.get('Explicit owner production approval').owner_decision_required).toBe(true);
    expect(operatorRows.get('Post-deploy live proof boundary').execution_gate).toBe('post_deploy_proof_after_approved_deploy');
    expect(operatorRows.get('Post-deploy live proof boundary').post_deploy_boundary).toBe(true);
    for (const [prerequisite, row] of operatorRows) {
      expect(row.proof_command).toBe(requestRows.get(prerequisite).proof_command);
      expect(row.proof_type).toBe(requestRows.get(prerequisite).proof_type);
      expect(row.source_status).toBe(requestRows.get(prerequisite).source_status);
      expect(row.blocks_approval_request).toBe(requestRows.get(prerequisite).blocks_request);
      expect(row.can_execute_from_packet).toBe(false);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|hosted\/live parity/i);
      expect(row.stop_gate).toMatch(/Do not execute approval, deploy, or external-account work|claim readiness|mark this row ready/i);
    }
    expect(payload.launch_action_production_approval_row.phase).toBe('production_approval');
    expect(payload.release_preflight_owner_approval_row.requirement).toBe('Explicit owner production approval');
    expect(payload.public_status_handles.production_approval_prerequisite_queue.id).toBe('production_approval_prerequisite_queue');
    expect(payload.public_status_handles.production_approval_request_packet.id).toBe('production_approval_request_packet');
    expect(payload.public_status_handles.production_approval_operator_handoff_packet.id).toBe('production_approval_operator_handoff_packet');
    expect(payload.public_status_handles.production_approval_prerequisite_queue.command).toContain('report:production-approval-readiness');
    expect(payload.public_status_handles.production_approval_prerequisite_queue.command).toContain('check:production-approval-report');
    expect(payload.public_status_handles.production_approval_request_packet.command).toContain('check:production-deploy-request');
    expect(payload.public_status_handles.production_approval_operator_handoff_packet.sourceManifestPath).toBe('production_approval.operator_handoff_packet');
    expect(payload.public_status_handles.production_approval_request_packet.sourceProofTypes).toContain('production_approval_request_packet');
    expect(payload.public_status_handles.production_approval_operator_handoff_packet.sourceProofTypes).toContain('production_approval_operator_handoff_packet');
    expect(payload.package_script_handles.check_production_deploy_request).toBe('corepack pnpm run check:production-deploy-request');
    expect(payload.proof_boundary).toMatch(/does not grant owner approval|run deploys|clear source provenance|hosted\/live parity/i);
    expect(payload.stop_gate).toMatch(/Do not treat this focused report|production approval|deploy authorization|commercial-ready status/i);
  });

  it('accepts a current release-readiness proof without bypassing other production gates', { timeout: 180_000 }, () => {
    const tempRoot = makeTempRoot();
    const proofPath = writeReleaseReadinessProof(tempRoot);
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--release-readiness-proof', proofPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);
    const requestRows = new Map<string, ProductionApprovalRequestRow>(payload.production_approval.request_packet.items.map((item: ProductionApprovalRequestRow) => [
      item.prerequisite,
      item,
    ]));
    const corepackRow = requestRows.get('Corepack release-readiness');

    expect(payload.production_approval.explicit_owner_approval).toBe(false);
    expect(payload.production_approval.status).toBe('blocked');
    expect(payload.production_approval.request_packet.request_eligible).toBe(false);
    expect(payload.package_script_handles.record_release_readiness_proof).toContain('record:release-readiness-proof');
    expect(corepackRow?.proof_command).toContain('check:release-readiness');
    if (isWorktreeClean()) {
      expect(corepackRow?.source_status).toBe('ready');
      expect(corepackRow?.status).toBe('ready');
      expect(corepackRow?.blocks_request).toBe(false);
    } else {
      expect(corepackRow?.status).toBe('blocked');
      expect(corepackRow?.blocks_request).toBe(true);
    }
    expect(requestRows.get('Canonical branch review')?.blocks_request).toBe(
      payload.branch_review?.status === 'blocked',
    );
    expect(requestRows.get('Supabase advisor clearance')?.blocks_request).toBe(true);
    expect(requestRows.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(requestRows.get('Post-deploy live proof boundary')?.status).toBe('blocked');
  });

  it('accepts a current Supabase app-lint proof without clearing production approval', { timeout: 180_000 }, () => {
    const tempRoot = makeTempRoot();
    const proofPath = writeSupabaseAppLintProof(tempRoot);
    const stdout = execFileSync(process.execPath, [reportScriptPath, '--skip-probes', '--supabase-app-lint-proof', proofPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });
    const payload = JSON.parse(stdout);
    const prerequisiteRows = new Map<string, { current: string; status: string }>(
      payload.production_approval.prerequisite_queue.items.map((item: { prerequisite: string; current: string; status: string }) => [item.prerequisite, item]),
    );
    const requestRows = new Map<string, ProductionApprovalRequestRow>(payload.production_approval.request_packet.items.map((item: ProductionApprovalRequestRow) => [
      item.prerequisite,
      item,
    ]));

    expect(payload.production_approval.status).toBe('blocked');
    expect(payload.production_approval.explicit_owner_approval).toBe(false);
    expect(payload.production_approval.request_packet.request_eligible).toBe(false);
    expect(payload.package_script_handles.record_supabase_app_lint_proof).toContain('record:supabase-app-lint-proof');
    expect(prerequisiteRows.get('Supabase advisor clearance')?.current).toContain('5 Supabase advisor clearance deficit(s) remain');
    expect(prerequisiteRows.get('Supabase advisor clearance')?.status).toBe('blocked');
    expect(requestRows.get('Supabase advisor clearance')?.status).toBe('blocked');
    expect(requestRows.get('Supabase advisor clearance')?.blocks_request).toBe(true);
    expect(requestRows.get('Canonical branch review')?.blocks_request).toBe(true);
    expect(requestRows.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(requestRows.get('Post-deploy live proof boundary')?.status).toBe('blocked');
  });

  it('validates the focused report contract without requiring production approval to pass', { timeout: 180_000 }, () => {
    const stdout = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout,
    });

    expect(stdout).toContain('Production approval readiness report check passed');
    expect(stdout).toContain('operator handoff packet');
  });

  it('can fail as a machine approval gate while request blockers remain', { timeout: 180_000 }, () => {
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

    const approvalReady = json.production_approval.request_packet.request_eligible === true
      && json.production_approval.request_packet.status === 'ready_to_request'
      && json.production_approval.operator_handoff_packet.status === 'ready_to_request'
      && json.production_approval.explicit_owner_approval === true;
    expect(result.status).toBe(approvalReady ? 0 : 1);
    expect(result.stdout).toContain('# CEIP Production Approval Readiness Report');
    if (!approvalReady) {
      expect(result.stderr).toContain('Production approval remains blocked');
      expect(result.stderr).toContain('does not grant approval, deploy, or prove hosted/live parity');
    }
  });
});
