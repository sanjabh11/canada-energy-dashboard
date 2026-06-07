import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(process.cwd(), 'scripts/report-launch-evidence-manifest.mjs');
const checkScriptPath = path.join(process.cwd(), 'scripts/check-launch-evidence-manifest.mjs');
const checkMarkdownReportScriptPath = path.join(process.cwd(), 'scripts/check-commercial-launch-readiness-report.mjs');
const markdownReportScriptPath = path.join(process.cwd(), 'scripts/report-commercial-launch-readiness.mjs');
const validatorPath = '/Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py';
const LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS = 180_000;
const tempRoots: string[] = [];

type ProgressTargetMatrixRow = {
  lane: string;
  target_percent?: number;
  current_percent?: number;
  status?: string;
  evidence?: string[];
  confidence?: number;
};

function mapBy<Value, Key>(items: readonly Value[], keyFor: (value: Value) => Key): Map<Key, Value> {
  const result = new Map<Key, Value>();
  for (const item of items) {
    result.set(keyFor(item), item);
  }
  return result;
}

function targetMatrixByLane(update: { target_matrix: ProgressTargetMatrixRow[] }) {
  return mapBy(update.target_matrix, (row) => row.lane);
}

function makeTempRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'ceip-launch-evidence-'));
  tempRoots.push(root);
  return root;
}

function runManifest(args: string[] = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 30 * 1024 * 1024,
    timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
  });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe('launch evidence manifest report', () => {
  it('accepts --json as an explicit alias for the structured launch evidence manifest output', () => {
    const stdout = runManifest(['--skip-probes', '--json']);
    const manifest = JSON.parse(stdout);

    expect(manifest.schema_version).toBe(1);
    expect(manifest.launch_decision).toBe('blocked');
    expect(manifest.repo.name).toBe('canada-energy-dashboard');
    expect(manifest.fix_report.safe_fix_boundary).toContain('read-only unless --output is used');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('emits a conservative blocked launch-evidence manifest that passes the orchestrator schema validator', () => {
    const stdout = runManifest(['--skip-probes']);
    const manifest = JSON.parse(stdout);

    expect(manifest.schema_version).toBe(1);
    expect(manifest.repo.name).toBe('canada-energy-dashboard');
    expect(manifest.repo.path).toBe(process.cwd());
    expect(manifest.launch_decision).toBe('blocked');
    expect(manifest.scores.evidence).toBe(1);
    expect(Object.keys(manifest.proof_buckets).sort()).toEqual([
      'candidate_shadow',
      'hosted_live',
      'local',
      'repo_artifact',
      'roadmap',
    ]);
    expect(manifest.proof_buckets.repo_artifact).toContain('scripts/check-focused-launch-readiness-reports.mjs');
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P0' && gap.gap.includes('Phase F evidence'))).toBe(true);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P1' && gap.gap.includes('stale/aging unmerged branches'))).toBe(true);
    const gapsByProofType = mapBy(
      manifest.gaps,
      (gap: {
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => gap.proof_type,
    );
    expect(Array.from(gapsByProofType.keys()).sort()).toEqual([
      'branch_review_clearance_gap',
      'buyer_evidence_hard_gate',
      'external_advisor_clearance_gap',
      'release_toolchain_approval_gap',
      'source_provenance_approval_gate',
    ]);
    expect(gapsByProofType.get('buyer_evidence_hard_gate')?.proof_boundary).toMatch(/does not prove buyer acceptance|95% confidence|commercial-ready status/i);
    expect(gapsByProofType.get('buyer_evidence_hard_gate')?.stop_gate).toMatch(/Do not claim buyer-proven 95% confidence|accepted proof packs/i);
    expect(gapsByProofType.get('source_provenance_approval_gate')?.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|deploy/i);
    expect(gapsByProofType.get('source_provenance_approval_gate')?.stop_gate).toMatch(/Do not commit|production approval/i);
    expect(gapsByProofType.get('branch_review_clearance_gap')?.proof_boundary).toMatch(/read-only unmerged-branch|does not checkout|merge|push/i);
    expect(gapsByProofType.get('branch_review_clearance_gap')?.stop_gate).toMatch(/Do not checkout|canonical heads/i);
    expect(gapsByProofType.get('external_advisor_clearance_gap')?.proof_boundary).toMatch(/repo-visible Supabase advisor|does not access dashboards|clear advisor findings/i);
    expect(gapsByProofType.get('external_advisor_clearance_gap')?.stop_gate).toMatch(/Do not claim Supabase advisor clearance|RLS\/performance clearance/i);
    expect(gapsByProofType.get('release_toolchain_approval_gap')?.proof_boundary).toMatch(/does not resolve Corepack|Git LFS|run full release-readiness|grant owner approval/i);
    expect(gapsByProofType.get('release_toolchain_approval_gap')?.stop_gate).toMatch(/Do not treat local pnpm checks|release-readiness|owner approval/i);
    expect(manifest.completion_audit.status).toBe('blocked');
    expect(manifest.completion_audit.proof_type).toBe('completion_audit_current_state');
    expect(manifest.completion_audit.total_count).toBeGreaterThanOrEqual(15);
    expect(manifest.completion_audit.completed_count).toBeGreaterThanOrEqual(8);
    expect(manifest.completion_audit.blocked_count).toBeGreaterThanOrEqual(4);
    expect(manifest.completion_audit.manual_stop_count).toBeGreaterThanOrEqual(1);
    expect(manifest.completion_audit.goal_completion_blocked_count).toBe(
      manifest.completion_audit.blocked_count + manifest.completion_audit.manual_stop_count,
    );
    expect(manifest.completion_audit.proof_boundary).toMatch(/maps current manifest\/report evidence only|does not prove commercial-ready status|buyer acceptance|production approval|hosted\/live parity/i);
    expect(manifest.completion_audit.stop_gate).toMatch(/Do not mark the launch goal complete|P0\/P1 blockers|post-deploy live proof/i);
    const completionItemsByRequirement = mapBy(
      manifest.completion_audit.items,
      (item: {
        requirement: string;
        status: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
        next_proof_command?: string;
        blocks_goal_completion?: boolean;
      }) => item.requirement,
    );
    expect(completionItemsByRequirement.get('Launch score table')?.proof_type).toBe('required_score_table');
    expect(completionItemsByRequirement.get('Gap analysis')?.proof_type).toBe('required_gap_analysis_table');
    expect(completionItemsByRequirement.get('Launch blocker action queue')?.proof_type).toBe('sequenced_launch_action_queue');
    expect(completionItemsByRequirement.get('Market pain research table')?.proof_type).toBe('market_pain_source_table');
    expect(completionItemsByRequirement.get('Target customer table')?.proof_type).toBe('target_segment_table');
    expect(completionItemsByRequirement.get('Structured evidence manifest')?.proof_type).toBe('schema_validation');
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.status).toBe('blocked');
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.blocks_goal_completion).toBe(true);
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.stop_gate).toMatch(/validate:pilot-evidence --require-95|retained artifacts/i);
    expect(completionItemsByRequirement.get('Buyer evidence hard gate')?.next_proof_command).toBe('corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report');
    expect(completionItemsByRequirement.get('Source provenance release gate')?.proof_type).toBe('source_provenance_approval_gate');
    expect(completionItemsByRequirement.get('Source provenance release gate')?.next_proof_command).toBe('corepack pnpm run report:source-provenance-readiness && corepack pnpm run check:source-provenance-report');
    expect(completionItemsByRequirement.get('Branch canonical review gate')?.proof_type).toBe('read_only_branch_review');
    expect(completionItemsByRequirement.get('Branch canonical review gate')?.next_proof_command).toBe('corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report');
    expect(completionItemsByRequirement.get('Supabase advisor clearance gate')?.status).toBe('blocked');
    expect(completionItemsByRequirement.get('Supabase advisor clearance gate')?.next_proof_command).toBe('corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report');
    expect(completionItemsByRequirement.get('Release toolchain approval gate')?.proof_type).toBe('release_toolchain_approval');
    expect(completionItemsByRequirement.get('Release toolchain approval gate')?.next_proof_command).toBe('corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness');
    expect(completionItemsByRequirement.get('Production approval and live proof gate')?.status).toBe('manual_stop');
    expect(completionItemsByRequirement.get('Production approval and live proof gate')?.proof_boundary).toMatch(/does not run deploys|prove live parity|mutate Netlify/i);
    expect(completionItemsByRequirement.get('Production approval and live proof gate')?.next_proof_command).toBe('corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report && corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    expect(manifest.branch_review.clearance_matrix.status).toBe('skipped');
    expect(manifest.branch_review.clearance_matrix.proof_type).toBe('read_only_branch_clearance_matrix');
    expect(manifest.branch_review.clearance_matrix.evidence).toContain('Branch clearance matrix skipped');
    expect(manifest.branch_review.clearance_matrix.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
    expect(manifest.branch_review.clearance_matrix.rows).toEqual([]);
    expect(manifest.branch_review.operator_handoff_packet.status).toBe('skipped');
    expect(manifest.branch_review.operator_handoff_packet.proof_type).toBe('branch_operator_handoff_packet');
    expect(manifest.branch_review.operator_handoff_packet.source).toBe('branch_review.clearance_matrix.rows');
    expect(manifest.branch_review.operator_handoff_packet.item_count).toBe(0);
    expect(manifest.branch_review.operator_handoff_packet.blocked_count).toBe(0);
    expect(manifest.branch_review.operator_handoff_packet.items).toEqual([]);
    expect(manifest.branch_review.operator_handoff_packet.evidence).toContain('Branch operator handoff packet skipped');
    expect(manifest.branch_review.operator_handoff_packet.proof_boundary).toMatch(/read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity/i);
    expect(manifest.branch_review.operator_handoff_packet.stop_gate).toMatch(/Do not mark branch review clear|select canonical heads|merge|push|discard|delete|deploy|request production approval/i);
    expect(manifest.progress_updates).toHaveLength(2);
    expect(manifest.progress_updates[0].phase).toBe('CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-SUITE-PACKAGE-HANDLES');
    expect(manifest.progress_updates[0].accomplished).toContain('Completed safe-fix phase');
    const currentProgressMatrix = targetMatrixByLane(manifest.progress_updates[0]);
    expect(currentProgressMatrix.get('Safe Fix Lane')).toMatchObject({
      target_percent: 10,
      current_percent: 100,
      status: 'pass',
      confidence: 4,
    });
    expect(currentProgressMatrix.get('Safe Fix Lane')?.evidence).toEqual(expect.arrayContaining([
      expect.stringMatching(/implementation|code optimization review/i),
    ]));
    expect(currentProgressMatrix.get('Synthesis + Validation')).toMatchObject({
      target_percent: 5,
      current_percent: 45,
      status: 'running',
      confidence: 3,
    });
    expect(currentProgressMatrix.get('Synthesis + Validation')?.evidence).toEqual(expect.arrayContaining([
      expect.stringMatching(/structured evidence manifest|commercial readiness report|progress digest/i),
    ]));
    expect(manifest.progress_updates.map((item: { phase: string }) => item.phase)).toEqual(expect.arrayContaining([
      'objective completion audit',
    ]));
    expect(manifest.progress_updates[0].bottleneck).toMatch(/retained buyer artifacts|guarded deploy\/live proof/i);
    const objectiveCompletionProgressUpdate = manifest.progress_updates.find(
      (item: { phase?: string }) => item.phase === 'objective completion audit',
    );
    expect(objectiveCompletionProgressUpdate).toBeTruthy();
    const objectiveCompletionProgressMatrix = targetMatrixByLane(objectiveCompletionProgressUpdate);
    expect(objectiveCompletionProgressMatrix.get('Synthesis + Validation')?.evidence).toEqual(expect.arrayContaining([
      'ECC ledger',
      'structured evidence manifest',
      'blocked launch decision',
    ]));
    expect(objectiveCompletionProgressUpdate.bottleneck).toMatch(/retained buyer artifacts|guarded deploy\/live proof/i);
    expect(manifest.bottleneck_log[0].root_cause).toBe('evidence gap');
    expect(manifest.bottleneck_log[0].affected_lane).toBe('Synthesis + Validation');
    expect(manifest.bottleneck_log[0].top_unblock_options).toHaveLength(3);
    expect(manifest.bottleneck_log[0].top_unblock_options[0]).toMatchObject({
      action: expect.stringMatching(/buyer rows|retained redacted artifacts/i),
      tradeoff: expect.stringMatching(/buyer participation|repo-only phase/i),
      expected_time_saved: expect.stringMatching(/hard buyer evidence gate/i),
      risk: expect.stringMatching(/Cannot be synthesized|rehearsal-only artifacts/i),
    });
    expect(manifest.bottleneck_log[0].top_unblock_options[1].action).toMatch(/source provenance|release-readiness/i);
    expect(manifest.bottleneck_log[0].top_unblock_options[2].action).toMatch(/branch review|Supabase advisor/i);
    expect(manifest.market_evidence_mode).toBe('mixed');
    expect(manifest.synthetic_data_points).toEqual([]);
    const adversarialReviewsByLane = mapBy(
      manifest.adversarial_reviews,
      (review: {
        lane: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => review.lane,
    );
    expect(adversarialReviewsByLane.get('buyer evidence')?.proof_type).toBe('buyer_evidence_adversarial_review');
    expect(adversarialReviewsByLane.get('buyer evidence')?.proof_boundary).toMatch(/does not create buyer acceptance|95% confidence|commercial-ready status/i);
    expect(adversarialReviewsByLane.get('buyer evidence')?.stop_gate).toMatch(/Do not override buyer evidence blockers/i);
    expect(adversarialReviewsByLane.get('production approval')?.proof_type).toBe('production_approval_adversarial_review');
    expect(adversarialReviewsByLane.get('production approval')?.proof_boundary).toMatch(/does not grant production approval|run deploys|prove live parity/i);
    expect(adversarialReviewsByLane.get('release toolchain')?.proof_type).toBe('release_toolchain_adversarial_review');
    expect(adversarialReviewsByLane.get('release toolchain')?.proof_boundary).toMatch(/does not install tools|run release-readiness|clear provenance|approve release/i);
    expect(adversarialReviewsByLane.get('Supabase advisor clearance')?.proof_type).toBe('external_advisor_adversarial_review');
    expect(adversarialReviewsByLane.get('Supabase advisor clearance')?.proof_boundary).toMatch(/does not access dashboards|run migrations|alter secrets|prove RLS\/performance clearance/i);
    expect(adversarialReviewsByLane.get('branch risk')?.proof_type).toBe('branch_risk_adversarial_review');
    expect(adversarialReviewsByLane.get('branch risk')?.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|deploy/i);
    expect(manifest.buyer_evidence.status).toBe('skipped');
    expect(manifest.buyer_evidence.production_registers).toBeNull();
    expect(manifest.buyer_evidence.starter_only_registers).toBeNull();
    expect(manifest.buyer_evidence.outreach_logs).toBeNull();
    expect(manifest.buyer_evidence.confidence_moving_rows).toBeNull();
    expect(manifest.buyer_evidence.actionable_outreach_rows).toBeNull();
    expect(manifest.buyer_evidence.batchable_intake_packet_rows).toBeNull();
    expect(manifest.buyer_evidence.phase_f_gate).toBe('unknown');
    expect(manifest.buyer_evidence.evidence).toContain('Buyer evidence review');
    expect(manifest.buyer_evidence.workspace_next_step).toContain('report:buyer-evidence-readiness');
    expect(manifest.buyer_evidence.hard_gate_deficits.status).toBe('skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.open_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.total_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.items).toEqual([]);
    expect(manifest.buyer_evidence.hard_gate_deficits.evidence).toContain('Buyer hard-gate deficit ledger skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.status).toBe('skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.evidence).toContain('Buyer evidence remediation queue skipped');
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.open_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.total_count).toBeNull();
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.item_count).toBe(0);
    expect(manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items).toEqual([]);
    expect(manifest.buyer_evidence.acquisition_matrix.status).toBe('blocked');
    expect(manifest.buyer_evidence.acquisition_matrix.proof_type).toBe('buyer_evidence_acquisition_matrix');
    expect(manifest.buyer_evidence.acquisition_matrix.evidence).toContain('Buyer evidence acquisition matrix');
    expect(manifest.buyer_evidence.acquisition_matrix.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|claim buyer acceptance/i);
    expect(manifest.buyer_evidence.acquisition_matrix.stop_gate).toMatch(/Do not mark buyer evidence ready|validate:pilot-evidence --require-95/i);
    expect(manifest.buyer_evidence.acquisition_matrix.row_count).toBeGreaterThanOrEqual(10);
    expect(manifest.buyer_evidence.acquisition_matrix.blocked_count).toBe(manifest.buyer_evidence.acquisition_matrix.row_count);
    const acquisitionRowsByLane = mapBy(
      manifest.buyer_evidence.acquisition_matrix.rows,
      (item: {
        lane: string;
        proof_type?: string;
        validation_command?: string;
        blocks_buyer_gate?: boolean;
      }) => item.lane,
    );
    expect(acquisitionRowsByLane.get('Outreach response log intake')?.proof_type).toBe('outreach_intake_acquisition');
    expect(acquisitionRowsByLane.get('Outreach response log intake')?.validation_command).toContain('plan:outreach-intake');
    expect(acquisitionRowsByLane.get('Production pilot evidence register')?.proof_type).toBe('production_register_acquisition');
    expect(acquisitionRowsByLane.get('Utility forecast lane')?.validation_command).toContain('prepare:forecast-trust-report-artifact');
    expect(acquisitionRowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(acquisitionRowsByLane.get('Retained-artifact 95% validation')?.blocks_buyer_gate).toBe(true);
    expect(manifest.buyer_evidence.minimum_evidence_packet.status).toBe('blocked');
    expect(manifest.buyer_evidence.minimum_evidence_packet.proof_type).toBe('buyer_evidence_minimum_packet_handoff');
    expect(manifest.buyer_evidence.minimum_evidence_packet.source).toBe('buyer_evidence.acquisition_matrix.rows');
    expect(manifest.buyer_evidence.minimum_evidence_packet.item_count).toBe(manifest.buyer_evidence.acquisition_matrix.row_count);
    expect(manifest.buyer_evidence.minimum_evidence_packet.blocked_count).toBe(manifest.buyer_evidence.acquisition_matrix.blocked_count);
    expect(manifest.buyer_evidence.minimum_evidence_packet.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|validate 95%|grant production approval/i);
    expect(manifest.buyer_evidence.minimum_evidence_packet.stop_gate).toMatch(/Do not mark buyer evidence ready|validate:pilot-evidence --require-95/i);
    const minimumPacketRowsByLane = mapBy(
      manifest.buyer_evidence.minimum_evidence_packet.items,
      (item: {
        lane: string;
        validation_command?: string;
        blocks_95_gate?: boolean;
      }) => item.lane,
    );
    expect(minimumPacketRowsByLane.get('Outreach response log intake')?.validation_command).toContain('plan:outreach-intake');
    expect(minimumPacketRowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(minimumPacketRowsByLane.get('Retained-artifact 95% validation')?.blocks_95_gate).toBe(true);
    expect(manifest.supabase_advisor.status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.project_ref).toBe('qnymbecjgeaoxsfphrti');
    expect(manifest.supabase_advisor.cli_app_lint_status).toBe('watch');
    expect(manifest.supabase_advisor.security_performance_advisors_status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.connector_permission).toBe('permission_denied');
    expect(manifest.supabase_advisor.evidence).toContain('Supabase advisor review');
    expect(manifest.supabase_advisor.evidence_boundary).toMatch(/does not substitute|permission denied/i);
    expect(manifest.supabase_advisor.clearance_deficits.status).toBe('needs_remediation');
    expect(manifest.supabase_advisor.clearance_deficits.open_count).toBeGreaterThanOrEqual(3);
    expect(manifest.supabase_advisor.clearance_deficits.total_count).toBe(6);
    expect(manifest.supabase_advisor.clearance_deficits.evidence).toContain('Supabase advisor clearance deficit ledger');
    expect(manifest.supabase_advisor.clearance_deficits.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'CLI app lint freshness',
      'Connector project authorization',
      'Security advisor evidence',
      'Performance advisor evidence',
      'Public-safe findings record',
      'Advisor clearance claim',
    ]);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.status).toMatch(/needs_remediation|pass/);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.evidence).toContain('Supabase advisor remediation queue');
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.open_count).toBe(manifest.supabase_advisor.clearance_deficits.open_count);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.total_count).toBe(manifest.supabase_advisor.clearance_deficits.total_count);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.item_count).toBe(manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length);
    expect(manifest.supabase_advisor.clearance_deficits.remediation_queue.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.supabase_advisor.clearance_deficits.items
        .filter((item: { status: string }) => item.status !== 'pass')
        .map((item: { requirement: string }) => item.requirement),
    );
    if (manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length > 0) {
      const firstSupabaseAction = manifest.supabase_advisor.clearance_deficits.remediation_queue.items[0];
      expect(firstSupabaseAction.owner).toBeTruthy();
      expect(firstSupabaseAction.action).toBeTruthy();
      expect(firstSupabaseAction.proof_command).toBeTruthy();
      expect(firstSupabaseAction.stop_gate).toMatch(/Do not/i);
      expect(firstSupabaseAction.status).not.toBe('ready');
    }
    const supabaseDeficitsByRequirement = mapBy(
      manifest.supabase_advisor.clearance_deficits.items,
      (item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    const supabaseActionsByRequirement = mapBy(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        external_account_required?: boolean;
        proof_boundary?: string;
      }) => item.requirement,
    );
    expect(supabaseDeficitsByRequirement.get('CLI app lint freshness')?.proof_type).toBe('repo_command');
    expect(supabaseDeficitsByRequirement.get('CLI app lint freshness')?.external_account_required).toBe(false);
    expect(supabaseActionsByRequirement.get('CLI app lint freshness')?.proof_type).toBe('repo_command');
    expect(supabaseActionsByRequirement.get('CLI app lint freshness')?.external_account_required).toBe(false);
    for (const requirement of ['Connector project authorization', 'Security advisor evidence', 'Performance advisor evidence']) {
      const deficit = supabaseDeficitsByRequirement.get(requirement);
      const item = supabaseActionsByRequirement.get(requirement);
      expect(deficit?.proof_type).toBe('external_account_evidence');
      expect(deficit?.external_account_required).toBe(true);
      expect(deficit?.proof_boundary).toMatch(/authorized|dashboard|connector|Advisor/i);
      expect(deficit?.stop_gate).toMatch(/Do not|permission-denied|advisor evidence/i);
      expect(item?.proof_type).toBe('external_account_evidence');
      expect(item?.external_account_required).toBe(true);
      expect(item?.proof_boundary).toMatch(/authorized|dashboard|connector|Advisor/i);
    }
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.proof_type).toBe('retained_redacted_record');
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Public-safe findings record')?.proof_boundary).toMatch(/retained redacted advisor summary|no secrets/i);
    expect(supabaseActionsByRequirement.get('Public-safe findings record')?.proof_type).toBe('retained_redacted_record');
    expect(supabaseActionsByRequirement.get('Public-safe findings record')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.proof_type).toBe('repo_command');
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.external_account_required).toBe(false);
    expect(supabaseDeficitsByRequirement.get('Advisor clearance claim')?.proof_boundary).toMatch(/only after every|public-safe evidence row passes/i);
    expect(supabaseActionsByRequirement.get('Advisor clearance claim')?.proof_type).toBe('repo_command');
    expect(supabaseActionsByRequirement.get('Advisor clearance claim')?.external_account_required).toBe(false);
    const supabaseOperatorHandoffPacket = manifest.supabase_advisor.operator_handoff_packet;
    expect(supabaseOperatorHandoffPacket).toEqual(manifest.supabase_advisor.clearance_deficits.operator_handoff_packet);
    expect(supabaseOperatorHandoffPacket.status).toBe('blocked');
    expect(supabaseOperatorHandoffPacket.proof_type).toBe('supabase_advisor_operator_handoff_packet');
    expect(supabaseOperatorHandoffPacket.source).toBe('supabase_advisor.clearance_deficits.remediation_queue.items');
    expect(supabaseOperatorHandoffPacket.evidence).toContain('Supabase advisor operator handoff packet');
    expect(supabaseOperatorHandoffPacket.proof_boundary).toMatch(/planning evidence only|does not authorize connectors|access dashboards|rerun advisors|mutate the database|record secrets|request approval|deploy|hosted\/live parity/i);
    expect(supabaseOperatorHandoffPacket.stop_gate).toMatch(/Do not mark Supabase advisor clear|request production approval|deploy|hosted\/live parity/i);
    expect(supabaseOperatorHandoffPacket.item_count).toBe(manifest.supabase_advisor.clearance_deficits.remediation_queue.items.length);
    expect(supabaseOperatorHandoffPacket.blocked_count).toBe(
      supabaseOperatorHandoffPacket.items.filter((item: { blocks_advisor_gate: boolean }) => item.blocks_advisor_gate).length,
    );
    expect(supabaseOperatorHandoffPacket.external_account_count).toBe(
      supabaseOperatorHandoffPacket.items.filter((item: { external_account_required: boolean }) => item.external_account_required).length,
    );
    expect(supabaseOperatorHandoffPacket.repo_command_count).toBe(
      supabaseOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'repo_command').length,
    );
    expect(supabaseOperatorHandoffPacket.retained_record_count).toBe(
      supabaseOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'retained_redacted_record').length,
    );
    expect(supabaseOperatorHandoffPacket.account_admin_count).toBe(
      supabaseOperatorHandoffPacket.items.filter((item: { owner: string }) => item.owner === 'account_admin').length,
    );
    expect(supabaseOperatorHandoffPacket.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.supabase_advisor.clearance_deficits.remediation_queue.items.map((item: { requirement: string }) => item.requirement),
    );
    expect(supabaseOperatorHandoffPacket.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const supabaseOperatorRowsByRequirement = mapBy(
      supabaseOperatorHandoffPacket.items,
      (item: {
        requirement: string;
        execution_gate?: string;
        proof_type?: string;
        external_account_required?: boolean;
        public_safe_record_required?: boolean;
        secret_safe?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    expect(supabaseOperatorRowsByRequirement.get('CLI app lint freshness')?.execution_gate).toBe('repo_lint_freshness_first');
    expect(supabaseOperatorRowsByRequirement.get('Connector project authorization')?.execution_gate).toBe('authorized_connector_or_dashboard_access_first');
    expect(supabaseOperatorRowsByRequirement.get('Security advisor evidence')?.execution_gate).toBe('security_advisor_after_authorization');
    expect(supabaseOperatorRowsByRequirement.get('Performance advisor evidence')?.execution_gate).toBe('performance_advisor_after_authorization');
    expect(supabaseOperatorRowsByRequirement.get('Public-safe findings record')?.execution_gate).toBe('public_safe_record_after_advisor_review');
    expect(supabaseOperatorRowsByRequirement.get('Advisor clearance claim')?.execution_gate).toBe('clearance_claim_after_all_rows_pass');
    for (const requirement of ['Connector project authorization', 'Security advisor evidence', 'Performance advisor evidence']) {
      const item = supabaseOperatorRowsByRequirement.get(requirement);
      expect(item?.proof_type).toBe('external_account_evidence');
      expect(item?.external_account_required).toBe(true);
      expect(item?.proof_boundary).toMatch(/authorized|dashboard|connector|Advisor/i);
      expect(item?.stop_gate).toMatch(/Do not|permission-denied|advisor evidence/i);
    }
    expect(supabaseOperatorRowsByRequirement.get('Public-safe findings record')?.proof_type).toBe('retained_redacted_record');
    expect(supabaseOperatorRowsByRequirement.get('Public-safe findings record')?.public_safe_record_required).toBe(true);
    expect(supabaseOperatorRowsByRequirement.get('Public-safe findings record')?.secret_safe).toBe(true);
    expect(supabaseOperatorRowsByRequirement.get('Public-safe findings record')?.proof_boundary).toMatch(/retained redacted advisor summary|no secrets/i);
    expect(manifest.release_preflight.status).toBe('blocked');
    expect(manifest.release_preflight.package_manager).toBe('pnpm@10.23.0');
    expect(manifest.release_preflight.expected_pnpm_version).toBe('10.23.0');
    expect(manifest.release_preflight.corepack_probe).toBe('skipped');
    expect(manifest.release_preflight.bare_pnpm_diagnostic).toBe('skipped');
    expect(manifest.release_preflight.git_lfs_probe).toBe('skipped');
    expect(manifest.release_preflight.git_lfs_hook_diagnostic).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.status).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.evidence).toContain('Release toolchain probe ledger skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items.map((item: { id: string }) => item.id)).toEqual([
      'corepack_pnpm_resolver',
      'git_lfs_push_path',
    ]);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].command).toBe('corepack pnpm --version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].diagnostic_command).toBe('pnpm --version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].diagnostic_current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].diagnostic_boundary).toMatch(/Bare pnpm diagnostics are local-shell context only|does not satisfy the Corepack pnpm resolver gate|deploy|production approval/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].proof_type).toBe('corepack_pnpm_toolchain_probe');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].proof_boundary).toMatch(/release-shell evidence only|does not install tools|run release-readiness|push|deploy/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].stop_gate).toMatch(/bare pnpm|local shims|skipped probes/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].command).toBe('git lfs version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].diagnostic_command).toContain('git config --get core.hookspath');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].diagnostic_current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].diagnostic_boundary).toMatch(/Git LFS hook-path diagnostics are current-shell context only|future commit or push hook PATH|production approval/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].proof_type).toBe('git_lfs_push_path_probe');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].proof_boundary).toMatch(/release-shell evidence only|does not install Git LFS|push|deploy/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].stop_gate).toMatch(/commit hook warnings|previous pushes|skipped probes|missing git-lfs binary/i);
    expect(manifest.release_preflight.evidence).toContain('Release toolchain and approval deficit ledger');
    expect(manifest.release_preflight.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'Pinned package manager',
      'Corepack pnpm resolver',
      'Release-readiness execution',
      'Git LFS push-path proof',
      'Clean source provenance',
      'Explicit owner production approval',
    ]);
    const releaseDeficitsByRequirement = mapBy(
      manifest.release_preflight.items,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.proof_type).toBe('package_manager_pin');
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.proof_boundary).toMatch(/does not prove Corepack resolution|release-readiness execution|Git LFS push-path availability/i);
    expect(releaseDeficitsByRequirement.get('Pinned package manager')?.stop_gate).toMatch(/pin alone|Corepack resolution|deploy readiness/i);
    expect(releaseDeficitsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseDeficitsByRequirement.get('Corepack pnpm resolver')?.proof_boundary).toMatch(/does not install tools/i);
    expect(releaseDeficitsByRequirement.get('Git LFS push-path proof')?.proof_type).toBe('toolchain_probe');
    expect(releaseDeficitsByRequirement.get('Git LFS push-path proof')?.proof_boundary).toMatch(/does not install Git LFS/i);
    expect(releaseDeficitsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseDeficitsByRequirement.get('Release-readiness execution')?.proof_boundary).toMatch(/does not grant owner approval|hosted\/live parity/i);
    expect(releaseDeficitsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseDeficitsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(releaseDeficitsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseDeficitsByRequirement.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve|deploy|live parity/i);
    expect(manifest.release_preflight.clearance_matrix.status).toBe('blocked');
    expect(manifest.release_preflight.clearance_matrix.proof_type).toBe('release_preflight_clearance_matrix');
    expect(manifest.release_preflight.clearance_matrix.evidence).toContain('Release preflight clearance matrix');
    expect(manifest.release_preflight.clearance_matrix.proof_boundary).toMatch(/does not install tools|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|grant owner approval/i);
    expect(manifest.release_preflight.clearance_matrix.stop_gate).toMatch(/Do not mark release approval ready|Corepack-pinned release-readiness|Git LFS push-path proof|owner approval/i);
    expect(manifest.release_preflight.clearance_matrix.row_count).toBe(manifest.release_preflight.items.length);
    expect(manifest.release_preflight.clearance_matrix.blocked_count).toBeGreaterThanOrEqual(1);
    expect(manifest.release_preflight.clearance_matrix.rows.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.release_preflight.items.map((item: { requirement: string }) => item.requirement),
    );
    const releaseClearanceRowsByRequirement = mapBy(
      manifest.release_preflight.clearance_matrix.rows,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
        proof_command?: string;
        release_impact?: string;
        blocks_release_gate?: boolean;
        status?: string;
      }) => item.requirement,
    );
    expect(releaseClearanceRowsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseClearanceRowsByRequirement.get('Corepack pnpm resolver')?.proof_command).toBe('corepack pnpm --version');
    expect(releaseClearanceRowsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseClearanceRowsByRequirement.get('Release-readiness execution')?.proof_command).toBe('corepack pnpm run check:release-readiness');
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    expect(releaseClearanceRowsByRequirement.get('Clean source provenance')?.blocks_release_gate).toBe(true);
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.proof_command).toBe('corepack pnpm run check:production-deploy-request');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(releaseClearanceRowsByRequirement.get('Explicit owner production approval')?.release_impact).toMatch(/production deploy|hosted-live claim|owner approval/i);
    expect(manifest.release_preflight.remediation_queue.status).toMatch(/blocked|pass/);
    expect(manifest.release_preflight.remediation_queue.evidence).toContain('Release preflight remediation queue');
    const releaseActionsByRequirement = mapBy(
      manifest.release_preflight.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.requirement,
    );
    expect(releaseActionsByRequirement.get('Corepack pnpm resolver')?.proof_type).toBe('toolchain_probe');
    expect(releaseActionsByRequirement.get('Corepack pnpm resolver')?.proof_boundary).toMatch(/does not install tools/i);
    expect(releaseActionsByRequirement.get('Git LFS push-path proof')?.proof_type).toBe('toolchain_probe');
    expect(releaseActionsByRequirement.get('Git LFS push-path proof')?.proof_boundary).toMatch(/does not install Git LFS/i);
    expect(releaseActionsByRequirement.get('Release-readiness execution')?.proof_type).toBe('gated_release_command');
    expect(releaseActionsByRequirement.get('Release-readiness execution')?.proof_boundary).toMatch(/does not grant owner approval/i);
    expect(releaseActionsByRequirement.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(releaseActionsByRequirement.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit/i);
    expect(releaseActionsByRequirement.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(releaseActionsByRequirement.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve/i);
    expect(manifest.release_preflight.remediation_queue.open_count).toBe(manifest.release_preflight.open_count);
    expect(manifest.release_preflight.remediation_queue.total_count).toBe(manifest.release_preflight.total_count);
    expect(manifest.release_preflight.remediation_queue.item_count).toBe(manifest.release_preflight.remediation_queue.items.length);
    expect(manifest.release_preflight.remediation_queue.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.release_preflight.items
        .filter((item: { status: string }) => item.status !== 'pass')
        .map((item: { requirement: string }) => item.requirement),
    );
    if (manifest.release_preflight.remediation_queue.items.length > 0) {
      const firstReleaseAction = manifest.release_preflight.remediation_queue.items[0];
      expect(firstReleaseAction.owner).toBeTruthy();
      expect(firstReleaseAction.action).toBeTruthy();
      expect(firstReleaseAction.proof_command).toBeTruthy();
      expect(firstReleaseAction.stop_gate).toMatch(/Do not/i);
      expect(firstReleaseAction.status).not.toBe('ready');
    }
    expect(manifest.release_preflight.operator_handoff_packet.status).toBe('blocked');
    expect(manifest.release_preflight.operator_handoff_packet.proof_type).toBe('release_operator_handoff_packet');
    expect(manifest.release_preflight.operator_handoff_packet.source).toBe('release_preflight.remediation_queue.items');
    expect(manifest.release_preflight.operator_handoff_packet.evidence).toContain('Release operator handoff packet');
    expect(manifest.release_preflight.operator_handoff_packet.proof_boundary).toMatch(/does not install Corepack|install Git LFS|run release-readiness|clear source provenance|push|deploy|hosted\/live parity/i);
    expect(manifest.release_preflight.operator_handoff_packet.stop_gate).toMatch(/Do not mark release preflight ready|request production approval|push|deploy|hosted\/live parity/i);
    expect(manifest.release_preflight.operator_handoff_packet.item_count).toBe(manifest.release_preflight.remediation_queue.items.length);
    expect(manifest.release_preflight.operator_handoff_packet.blocked_count).toBe(
      manifest.release_preflight.operator_handoff_packet.items.filter((item: { blocks_release_gate: boolean }) => item.blocks_release_gate).length,
    );
    expect(manifest.release_preflight.operator_handoff_packet.toolchain_probe_count).toBe(
      manifest.release_preflight.operator_handoff_packet.items.filter((item: { proof_type: string }) => item.proof_type === 'toolchain_probe').length,
    );
    expect(manifest.release_preflight.operator_handoff_packet.gated_release_count).toBe(
      manifest.release_preflight.operator_handoff_packet.items.filter((item: { proof_type: string }) => item.proof_type === 'gated_release_command').length,
    );
    expect(manifest.release_preflight.operator_handoff_packet.source_decision_count).toBe(
      manifest.release_preflight.operator_handoff_packet.items.filter((item: { proof_type: string }) => item.proof_type === 'source_provenance_decision').length,
    );
    expect(manifest.release_preflight.operator_handoff_packet.manual_stop_count).toBe(
      manifest.release_preflight.operator_handoff_packet.items.filter((item: { proof_type: string; status: string }) => item.proof_type === 'manual_approval' || item.status === 'manual_stop').length,
    );
    expect(manifest.release_preflight.operator_handoff_packet.items.map((item: { requirement: string }) => item.requirement)).toEqual(
      manifest.release_preflight.remediation_queue.items.map((item: { requirement: string }) => item.requirement),
    );
    expect(manifest.release_preflight.operator_handoff_packet.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const releaseOperatorRowsByRequirement = mapBy(
      manifest.release_preflight.operator_handoff_packet.items,
      (item: {
        requirement: string;
        execution_gate?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    expect(releaseOperatorRowsByRequirement.get('Corepack pnpm resolver')?.execution_gate).toBe('toolchain_probe_first');
    expect(releaseOperatorRowsByRequirement.get('Git LFS push-path proof')?.execution_gate).toBe('toolchain_probe_first');
    expect(releaseOperatorRowsByRequirement.get('Release-readiness execution')?.execution_gate).toBe('after_corepack_git_lfs_and_clean_source');
    expect(releaseOperatorRowsByRequirement.get('Clean source provenance')?.execution_gate).toBe('owner_source_decision_first');
    expect(releaseOperatorRowsByRequirement.get('Explicit owner production approval')?.execution_gate).toBe('manual_stop_after_all_prerequisites');
    expect(releaseOperatorRowsByRequirement.get('Release-readiness execution')?.stop_gate).toMatch(/Do not execute or mark this row ready from the handoff packet itself/i);
    expect(manifest.launch_action_queue.status).toBe('blocked');
    expect(manifest.launch_action_queue.evidence).toContain('Launch blocker action queue');
    expect(manifest.launch_action_queue.items.map((item: { phase: string }) => item.phase)).toEqual([
      'source_provenance',
      'launch_evidence_validation',
      'release_toolchain',
      'branch_review',
      'supabase_advisor',
      'buyer_evidence',
      'production_approval',
      'post_deploy_live_proof',
    ]);
    const launchActionsByPhase = mapBy(
      manifest.launch_action_queue.items,
      (item: {
        phase: string;
        blocker?: string;
        proof_command?: string;
        proof_type?: string;
        proof_boundary?: string;
        status?: string;
      }) => item.phase,
    );
    expect(launchActionsByPhase.get('source_provenance')?.proof_type).toBe('source_provenance_decision');
    expect(launchActionsByPhase.get('source_provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    const renameDirtyPath = manifest.source_provenance.dirty_paths.find((item: { old_path?: string }) => item.old_path);
    if (renameDirtyPath) {
      const renameSummary = `${renameDirtyPath.old_path} -> ${renameDirtyPath.file_path}`;
      expect(launchActionsByPhase.get('source_provenance')?.blocker).toContain(renameSummary);
      expect(launchActionsByPhase.get('source_provenance')?.blocker).toContain(renameDirtyPath.proof_type);
      expect(launchActionsByPhase.get('source_provenance')?.blocker).toContain(renameDirtyPath.staging_state);
      const releaseSourceRow = manifest.release_preflight.items.find((item: { requirement?: string }) => item.requirement === 'Clean source provenance');
      expect(releaseSourceRow?.current).toContain(renameSummary);
      expect(releaseSourceRow?.current).toContain(renameDirtyPath.proof_type);
    }
    expect(launchActionsByPhase.get('launch_evidence_validation')?.proof_type).toBe('manifest_validation_and_approval_packet');
    expect(launchActionsByPhase.get('launch_evidence_validation')?.proof_boundary).toMatch(/structure and readiness reporting only|does not grant production approval/i);
    expect(launchActionsByPhase.get('release_toolchain')?.proof_type).toBe('release_toolchain_and_gated_release');
    expect(launchActionsByPhase.get('release_toolchain')?.proof_boundary).toMatch(/local release-shell checks|hosted\/live parity/i);
    expect(launchActionsByPhase.get('branch_review')?.proof_type).toBe('read_only_branch_review');
    expect(launchActionsByPhase.get('branch_review')?.proof_boundary).toMatch(/read-only|does not checkout/i);
    expect(launchActionsByPhase.get('supabase_advisor')?.proof_type).toBe('external_account_evidence');
    expect(launchActionsByPhase.get('supabase_advisor')?.proof_command).toBe('corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report');
    expect(launchActionsByPhase.get('supabase_advisor')?.proof_boundary).toMatch(/authorized Supabase dashboard or connector/i);
    expect(launchActionsByPhase.get('buyer_evidence')?.proof_type).toBe('retained_buyer_evidence_validation');
    expect(launchActionsByPhase.get('buyer_evidence')?.proof_command).toBe('corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report');
    expect(launchActionsByPhase.get('buyer_evidence')?.proof_boundary).toMatch(/real anonymized accepted buyer rows|retained redacted artifacts/i);
    expect(launchActionsByPhase.get('production_approval')?.proof_type).toBe('manual_approval_gate');
    expect(launchActionsByPhase.get('production_approval')?.proof_command).toBe('corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report');
    expect(launchActionsByPhase.get('production_approval')?.proof_boundary).toMatch(/does not approve|deploy/i);
    expect(launchActionsByPhase.get('post_deploy_live_proof')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(launchActionsByPhase.get('post_deploy_live_proof')?.proof_command).toBe('corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    expect(launchActionsByPhase.get('post_deploy_live_proof')?.proof_boundary).toMatch(/guarded deploy completion|does not deploy/i);
    const branchReviewAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'branch_review');
    expect(branchReviewAction?.proof_command).toBe('corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report');
    expect(branchReviewAction?.stop_gate).toMatch(/No checkout, merge, push/i);
    const launchEvidenceValidationAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'launch_evidence_validation');
    expect(launchEvidenceValidationAction.proof_command).toBe('corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report');
    expect(launchEvidenceValidationAction.status).toBe('ready');
    expect(launchEvidenceValidationAction.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseToolchainAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'release_toolchain');
    expect(releaseToolchainAction.blocker).toMatch(/release-toolchain probe/i);
    expect(releaseToolchainAction.action).toMatch(/Refresh the release toolchain probe ledger/i);
    expect(releaseToolchainAction.proof_command).toBe('corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness');
    expect(releaseToolchainAction.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').stop_gate).toMatch(/Do not count templates/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').status).toBe('blocked');
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'post_deploy_live_proof').proof_command).toBe('corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    const launchActionOperatorHandoffPacket = manifest.launch_action_queue.operator_handoff_packet;
    expect(launchActionOperatorHandoffPacket.status).toBe('blocked');
    expect(launchActionOperatorHandoffPacket.proof_type).toBe('launch_action_operator_handoff_packet');
    expect(launchActionOperatorHandoffPacket.source).toBe('launch_action_queue.items');
    expect(launchActionOperatorHandoffPacket.evidence).toContain('Launch action operator handoff packet');
    expect(launchActionOperatorHandoffPacket.proof_boundary).toMatch(/planning evidence only|does not execute queue rows|clear source provenance|contact buyers|authorize Supabase|request owner approval|deploy|hosted\/live parity|raise launch status/i);
    expect(launchActionOperatorHandoffPacket.stop_gate).toMatch(/Do not execute launch actions|mark blockers ready|request production approval|deploy-production|netlify deploy|contact buyers|access Supabase|commercial-ready status/i);
    expect(launchActionOperatorHandoffPacket.item_count).toBe(manifest.launch_action_queue.items.length);
    expect(launchActionOperatorHandoffPacket.blocked_count).toBe(
      launchActionOperatorHandoffPacket.items.filter((item: { blocks_launch_clearance: boolean }) => item.blocks_launch_clearance).length,
    );
    expect(launchActionOperatorHandoffPacket.ready_count).toBe(
      launchActionOperatorHandoffPacket.items.filter((item: { status: string }) => item.status === 'ready').length,
    );
    expect(launchActionOperatorHandoffPacket.manual_stop_count).toBe(
      launchActionOperatorHandoffPacket.items.filter((item: { status: string }) => item.status === 'manual_stop').length,
    );
    expect(launchActionOperatorHandoffPacket.owner_approval_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.external_account_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.buyer_evidence_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.read_only_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.source_provenance_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.release_gate_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.post_deploy_boundary_count).toBe(1);
    expect(launchActionOperatorHandoffPacket.items.map((item: { phase: string }) => item.phase)).toEqual(
      manifest.launch_action_queue.items.map((item: { phase: string }) => item.phase),
    );
    const launchOperatorRowsByPhase = mapBy(
      launchActionOperatorHandoffPacket.items,
      (item: {
        phase: string;
        execution_gate?: string;
        proof_command?: string;
        proof_type?: string;
        status?: string;
        blocks_launch_clearance?: boolean;
        owner_approval_required?: boolean;
        external_account_required?: boolean;
        buyer_evidence_required?: boolean;
        read_only_required?: boolean;
        source_provenance_required?: boolean;
        release_gate_required?: boolean;
        post_deploy_boundary?: boolean;
        can_execute_from_packet?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.phase,
    );
    expect(launchOperatorRowsByPhase.get('source_provenance')?.execution_gate).toBe('resolve_source_provenance_first');
    expect(launchOperatorRowsByPhase.get('source_provenance')?.source_provenance_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('launch_evidence_validation')?.execution_gate).toBe('attach_launch_validation_evidence');
    expect(launchOperatorRowsByPhase.get('release_toolchain')?.execution_gate).toBe('release_toolchain_after_clean_source');
    expect(launchOperatorRowsByPhase.get('release_toolchain')?.release_gate_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('branch_review')?.execution_gate).toBe('read_only_branch_review_before_approval');
    expect(launchOperatorRowsByPhase.get('branch_review')?.read_only_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('supabase_advisor')?.execution_gate).toBe('supabase_advisor_after_authorization');
    expect(launchOperatorRowsByPhase.get('supabase_advisor')?.external_account_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('buyer_evidence')?.execution_gate).toBe('buyer_evidence_before_approval');
    expect(launchOperatorRowsByPhase.get('buyer_evidence')?.buyer_evidence_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('production_approval')?.execution_gate).toBe('owner_approval_after_all_prelaunch_gates');
    expect(launchOperatorRowsByPhase.get('production_approval')?.owner_approval_required).toBe(true);
    expect(launchOperatorRowsByPhase.get('post_deploy_live_proof')?.execution_gate).toBe('post_deploy_proof_after_approved_deploy');
    expect(launchOperatorRowsByPhase.get('post_deploy_live_proof')?.post_deploy_boundary).toBe(true);
    for (const row of launchActionOperatorHandoffPacket.items) {
      const queueRow = launchActionsByPhase.get(row.phase);
      expect(row.proof_command).toBe(queueRow?.proof_command);
      expect(row.proof_type).toBe(queueRow?.proof_type);
      expect(row.status).toBe(queueRow?.status);
      expect(row.blocks_launch_clearance).toBe(queueRow?.status !== 'ready');
      expect(row.can_execute_from_packet).toBe(false);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not execute the row|clear blockers|contact buyers|access Supabase|request owner approval|deploy|live proof|launch readiness/i);
      expect(row.stop_gate).toMatch(/Do not execute this launch action|mark it ready|clear blockers|claim launch readiness/i);
    }
    expect(manifest.production_approval.status).toBe('blocked');
    expect(manifest.production_approval.explicit_owner_approval).toBe(false);
    expect(manifest.production_approval.evidence).toContain('Production approval prerequisite queue');
    expect(manifest.production_approval.stop_gate).toMatch(/does not grant production approval/i);
    expect(manifest.production_approval.prerequisite_queue.status).toBe('blocked');
    expect(manifest.production_approval.prerequisite_queue.evidence).toContain('Production approval prerequisite queue');
    expect(manifest.production_approval.prerequisite_queue.item_count).toBe(8);
    expect(manifest.production_approval.prerequisite_queue.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual([
      'Clean source provenance',
      'Launch evidence validation',
      'Corepack release-readiness',
      'Canonical branch review',
      'Supabase advisor clearance',
      'Buyer evidence hard gate',
      'Explicit owner production approval',
      'Post-deploy live proof boundary',
    ]);
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Explicit owner production approval').status).toBe('manual_stop');
    const launchEvidenceValidationPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Launch evidence validation');
    expect(launchEvidenceValidationPrerequisite.current).toMatch(/external to manifest generation|attach passing check:launch-evidence-manifest output/i);
    expect(launchEvidenceValidationPrerequisite.needed).toMatch(/underlying check:launch-evidence-manifest/i);
    expect(launchEvidenceValidationPrerequisite.status).toBe('ready');
    expect(launchEvidenceValidationPrerequisite.proof_command).toBe('corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report');
    expect(launchEvidenceValidationPrerequisite.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseReadinessPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Corepack release-readiness');
    expect(releaseReadinessPrerequisite.current).toMatch(/release-toolchain probe/i);
    expect(releaseReadinessPrerequisite.needed).toMatch(/Corepack\/Git LFS probe ledger/i);
    expect(releaseReadinessPrerequisite.proof_command).toBe('corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness');
    expect(releaseReadinessPrerequisite.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Explicit owner production approval').current).toBe('not granted by this manifest or report');
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary').status).toBe('blocked');
    const postDeployLiveProofPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary');
    expect(postDeployLiveProofPrerequisite.proof_command).toBe('corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    expect(postDeployLiveProofPrerequisite.needed).toMatch(/underlying check:post-deploy-live/i);
    const productionPrerequisitesByName = mapBy(
      manifest.production_approval.prerequisite_queue.items,
      (item: {
        prerequisite: string;
        current?: string;
        proof_command?: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.prerequisite,
    );
    expect(productionPrerequisitesByName.get('Clean source provenance')?.proof_type).toBe('source_provenance_decision');
    expect(productionPrerequisitesByName.get('Clean source provenance')?.proof_boundary).toMatch(/does not commit|clear provenance/i);
    if (renameDirtyPath) {
      const renameSummary = `${renameDirtyPath.old_path} -> ${renameDirtyPath.file_path}`;
      expect(productionPrerequisitesByName.get('Clean source provenance')?.current).toContain(renameSummary);
      expect(productionPrerequisitesByName.get('Clean source provenance')?.current).toContain(renameDirtyPath.proof_type);
      expect(productionPrerequisitesByName.get('Clean source provenance')?.current).toContain(renameDirtyPath.staging_state);
    }
    expect(productionPrerequisitesByName.get('Launch evidence validation')?.proof_type).toBe('manifest_validation');
    expect(productionPrerequisitesByName.get('Launch evidence validation')?.proof_boundary).toMatch(/structure only|does not grant production approval/i);
    expect(productionPrerequisitesByName.get('Corepack release-readiness')?.proof_type).toBe('gated_release_command');
    expect(productionPrerequisitesByName.get('Corepack release-readiness')?.proof_boundary).toMatch(/does not grant owner approval|hosted\/live parity/i);
    expect(productionPrerequisitesByName.get('Canonical branch review')?.proof_type).toBe('read_only_branch_review');
    expect(productionPrerequisitesByName.get('Canonical branch review')?.proof_boundary).toMatch(/read-only|does not checkout/i);
    expect(productionPrerequisitesByName.get('Canonical branch review')?.proof_command).toBe('corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report');
    expect(productionPrerequisitesByName.get('Supabase advisor clearance')?.proof_type).toBe('external_account_evidence');
    expect(productionPrerequisitesByName.get('Supabase advisor clearance')?.proof_command).toBe('corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report');
    expect(productionPrerequisitesByName.get('Supabase advisor clearance')?.proof_boundary).toMatch(/authorized Supabase dashboard or connector/i);
    expect(productionPrerequisitesByName.get('Buyer evidence hard gate')?.proof_type).toBe('retained_buyer_evidence_validation');
    expect(productionPrerequisitesByName.get('Buyer evidence hard gate')?.proof_command).toBe('corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report');
    expect(productionPrerequisitesByName.get('Buyer evidence hard gate')?.proof_boundary).toMatch(/real anonymized accepted buyer rows|retained redacted artifacts/i);
    expect(productionPrerequisitesByName.get('Explicit owner production approval')?.proof_type).toBe('manual_approval');
    expect(productionPrerequisitesByName.get('Explicit owner production approval')?.proof_boundary).toMatch(/does not approve|deploy/i);
    expect(productionPrerequisitesByName.get('Post-deploy live proof boundary')?.proof_type).toBe('post_deploy_live_proof_gate');
    expect(productionPrerequisitesByName.get('Post-deploy live proof boundary')?.proof_boundary).toMatch(/guarded deploy completion|does not deploy/i);
    const productionRequestPacket = manifest.production_approval.request_packet;
    expect(productionRequestPacket.status).toBe('blocked');
    expect(productionRequestPacket.proof_type).toBe('production_approval_request_packet');
    expect(productionRequestPacket.evidence).toContain('Production approval request packet');
    expect(productionRequestPacket.request_eligible).toBe(false);
    expect(productionRequestPacket.item_count).toBe(manifest.production_approval.prerequisite_queue.items.length);
    expect(productionRequestPacket.request_blocking_count).toBeGreaterThanOrEqual(1);
    expect(productionRequestPacket.proof_boundary).toMatch(/organizes evidence for owner review only|does not grant owner approval|run deploys|hosted\/live parity/i);
    expect(productionRequestPacket.stop_gate).toMatch(/Do not request or claim production approval|deploy-production|netlify deploy/i);
    const productionRequestRowsByName = mapBy(
      productionRequestPacket.items,
      (item: {
        prerequisite: string;
        current?: string;
        request_phase?: string;
        evidence_to_attach?: string;
        blocks_request?: boolean;
        proof_command?: string;
        proof_type?: string;
        status?: string;
        source_status?: string;
      }) => item.prerequisite,
    );
    expect(productionRequestPacket.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual(
      manifest.production_approval.prerequisite_queue.items.map((item: { prerequisite: string }) => item.prerequisite),
    );
    expect(productionRequestRowsByName.get('Launch evidence validation')?.request_phase).toBe('pre_request');
    expect(productionRequestRowsByName.get('Launch evidence validation')?.source_status).toBe('ready');
    expect(productionRequestRowsByName.get('Launch evidence validation')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Launch evidence validation')?.proof_command).toBe('corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report');
    expect(productionRequestRowsByName.get('Launch evidence validation')?.evidence_to_attach).toMatch(/focused launch evidence validation report\/check|underlying check:launch-evidence-manifest result/i);
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.request_phase).toBe('owner_decision');
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Explicit owner production approval')?.status).toBe('manual_stop');
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.request_phase).toBe('post_deploy_boundary');
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.blocks_request).toBe(false);
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.proof_command).toBe('corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    expect(productionRequestRowsByName.get('Post-deploy live proof boundary')?.evidence_to_attach).toMatch(/focused post-deploy live-proof report\/check|underlying check:post-deploy-live result/i);
    expect(productionRequestRowsByName.get('Clean source provenance')?.evidence_to_attach).toMatch(/source-provenance/i);
    if (renameDirtyPath) {
      const renameSummary = `${renameDirtyPath.old_path} -> ${renameDirtyPath.file_path}`;
      expect(productionRequestRowsByName.get('Clean source provenance')?.current).toContain(renameSummary);
      expect(productionRequestRowsByName.get('Clean source provenance')?.current).toContain(renameDirtyPath.proof_type);
      expect(productionRequestRowsByName.get('Clean source provenance')?.current).toContain(renameDirtyPath.staging_state);
    }
    expect(productionRequestRowsByName.get('Supabase advisor clearance')?.evidence_to_attach).toMatch(/focused Supabase advisor report\/check/i);
    expect(productionRequestRowsByName.get('Supabase advisor clearance')?.proof_command).toBe('corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report');
    expect(productionRequestRowsByName.get('Buyer evidence hard gate')?.evidence_to_attach).toMatch(/focused buyer-evidence hard-gate report\/check/i);
    expect(productionRequestRowsByName.get('Buyer evidence hard gate')?.evidence_to_attach).toMatch(/validate:pilot-evidence/i);
    expect(productionRequestRowsByName.get('Buyer evidence hard gate')?.proof_command).toBe('corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report');
    const productionOperatorHandoffPacket = manifest.production_approval.operator_handoff_packet;
    expect(productionOperatorHandoffPacket.status).toBe('blocked');
    expect(productionOperatorHandoffPacket.proof_type).toBe('production_approval_operator_handoff_packet');
    expect(productionOperatorHandoffPacket.source).toBe('production_approval.request_packet.items');
    expect(productionOperatorHandoffPacket.source_request_status).toBe(productionRequestPacket.status);
    expect(productionOperatorHandoffPacket.request_eligible).toBe(productionRequestPacket.request_eligible);
    expect(productionOperatorHandoffPacket.evidence).toContain('Production approval operator handoff packet');
    expect(productionOperatorHandoffPacket.proof_boundary).toMatch(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|hosted\/live parity/i);
    expect(productionOperatorHandoffPacket.stop_gate).toMatch(/Do not request or claim production approval|deploy-production|netlify deploy|contact buyers|access Supabase|hosted\/live parity/i);
    expect(productionOperatorHandoffPacket.item_count).toBe(productionRequestPacket.items.length);
    expect(productionOperatorHandoffPacket.request_blocking_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { blocks_approval_request: boolean }) => item.blocks_approval_request).length,
    );
    expect(productionOperatorHandoffPacket.owner_decision_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { owner_decision_required: boolean }) => item.owner_decision_required).length,
    );
    expect(productionOperatorHandoffPacket.post_deploy_boundary_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { post_deploy_boundary: boolean }) => item.post_deploy_boundary).length,
    );
    expect(productionOperatorHandoffPacket.pre_request_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { request_phase: string }) => item.request_phase === 'pre_request').length,
    );
    expect(productionOperatorHandoffPacket.ready_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { status: string }) => item.status === 'ready').length,
    );
    expect(productionOperatorHandoffPacket.manual_stop_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { status: string }) => item.status === 'manual_stop').length,
    );
    expect(productionOperatorHandoffPacket.blocked_count).toBe(
      productionOperatorHandoffPacket.items.filter((item: { status: string }) => item.status !== 'ready').length,
    );
    expect(productionOperatorHandoffPacket.items.map((item: { prerequisite: string }) => item.prerequisite)).toEqual(
      productionRequestPacket.items.map((item: { prerequisite: string }) => item.prerequisite),
    );
    const productionOperatorRowsByName = mapBy(
      productionOperatorHandoffPacket.items,
      (item: {
        prerequisite: string;
        execution_gate?: string;
        proof_command?: string;
        proof_type?: string;
        source_status?: string;
        blocks_approval_request?: boolean;
        owner_decision_required?: boolean;
        post_deploy_boundary?: boolean;
        can_execute_from_packet?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.prerequisite,
    );
    expect(productionOperatorRowsByName.get('Clean source provenance')?.execution_gate).toBe('clean_source_provenance_first');
    expect(productionOperatorRowsByName.get('Launch evidence validation')?.execution_gate).toBe('attach_manifest_validation_evidence');
    expect(productionOperatorRowsByName.get('Corepack release-readiness')?.execution_gate).toBe('release_readiness_after_clean_source');
    expect(productionOperatorRowsByName.get('Canonical branch review')?.execution_gate).toBe('branch_review_before_owner_request');
    expect(productionOperatorRowsByName.get('Supabase advisor clearance')?.execution_gate).toBe('supabase_advisor_after_authorization');
    expect(productionOperatorRowsByName.get('Buyer evidence hard gate')?.execution_gate).toBe('buyer_evidence_validation_before_approval');
    expect(productionOperatorRowsByName.get('Explicit owner production approval')?.execution_gate).toBe('owner_approval_after_pre_request_gates');
    expect(productionOperatorRowsByName.get('Explicit owner production approval')?.owner_decision_required).toBe(true);
    expect(productionOperatorRowsByName.get('Post-deploy live proof boundary')?.execution_gate).toBe('post_deploy_proof_after_approved_deploy');
    expect(productionOperatorRowsByName.get('Post-deploy live proof boundary')?.post_deploy_boundary).toBe(true);
    for (const row of productionOperatorHandoffPacket.items) {
      const requestRow = productionRequestRowsByName.get(row.prerequisite);
      expect(row.proof_command).toBe(requestRow?.proof_command);
      expect(row.proof_type).toBe(requestRow?.proof_type);
      expect(row.source_status).toBe(requestRow?.source_status);
      expect(row.blocks_approval_request).toBe(requestRow?.blocks_request);
      expect(row.can_execute_from_packet).toBe(false);
      expect(row.proof_boundary).toMatch(/planning evidence only|does not request owner approval|grant approval|run deploys|contact buyers|access Supabase|hosted\/live parity/i);
      expect(row.stop_gate).toMatch(/Do not execute approval, deploy, or external-account work|claim readiness|mark this row ready/i);
    }
    expect(manifest.post_deploy_live_proof.status).toBe('blocked');
    expect(manifest.post_deploy_live_proof.current_source_live_proven).toBe(false);
    expect(manifest.post_deploy_live_proof.evidence).toContain('Post-deploy live proof gate queue');
    expect(manifest.post_deploy_live_proof.stop_gate).toMatch(/does not prove hosted\/live parity/i);
    expect(manifest.post_deploy_live_proof.gate_queue.status).toBe('blocked');
    expect(manifest.post_deploy_live_proof.gate_queue.evidence).toContain('Post-deploy live proof gate queue');
    expect(manifest.post_deploy_live_proof.gate_queue.item_count).toBe(6);
    expect(manifest.post_deploy_live_proof.gate_queue.items.map((item: { gate: string }) => item.gate)).toEqual([
      'Production approval clearance',
      'Guarded production deploy completion',
      'Live public metadata',
      'Live static dist parity',
      'Hosted proof-pack route smoke',
      'Current-source hosted parity claim',
    ]);
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Live public metadata').proof_command).toBe('corepack pnpm run check:live-public-metadata');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Live static dist parity').proof_command).toBe('corepack pnpm run check:live-static-parity');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Hosted proof-pack route smoke').proof_command).toBe('corepack pnpm run test:browser:hosted:proof-packs');
    const deployCompletionGate = manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Guarded production deploy completion');
    expect(deployCompletionGate.proof_command).toBe('corepack pnpm run check:production-deploy-request && scripts/deploy-production.sh');
    expect(deployCompletionGate.proof_command).not.toBe('scripts/deploy-production.sh');
    expect(deployCompletionGate.approval_required).toBe(true);
    expect(deployCompletionGate.approval_command).toBe('corepack pnpm run check:production-deploy-request');
    expect(deployCompletionGate.execution_command).toBe('scripts/deploy-production.sh');
    expect(deployCompletionGate.approval_phrase).toBe('DEPLOY CEIP PRODUCTION');
    expect(deployCompletionGate.stop_gate).toContain('DEPLOY CEIP PRODUCTION');
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Current-source hosted parity claim').status).toBe('blocked');
    const postDeployProofTypesByGate = mapBy(
      manifest.post_deploy_live_proof.gate_queue.items,
      (item: {
        gate: string;
        proof_type?: string;
        proof_boundary?: string;
      }) => item.gate,
    );
    expect(postDeployProofTypesByGate.get('Production approval clearance')?.proof_type).toBe('manual_approval_gate');
    expect(postDeployProofTypesByGate.get('Production approval clearance')?.proof_boundary).toMatch(/does not grant owner approval|does not.*deploy/i);
    expect(postDeployProofTypesByGate.get('Guarded production deploy completion')?.proof_type).toBe('approved_deploy_execution');
    expect(postDeployProofTypesByGate.get('Guarded production deploy completion')?.proof_boundary).toMatch(/explicit owner approval|typed deploy phrase/i);
    expect(postDeployProofTypesByGate.get('Live public metadata')?.proof_type).toBe('hosted_metadata_probe');
    expect(postDeployProofTypesByGate.get('Live public metadata')?.proof_boundary).toMatch(/metadata evidence alone does not prove static parity/i);
    expect(postDeployProofTypesByGate.get('Live static dist parity')?.proof_type).toBe('hosted_static_parity_probe');
    expect(postDeployProofTypesByGate.get('Live static dist parity')?.proof_boundary).toMatch(/does not rebuild dist/i);
    expect(postDeployProofTypesByGate.get('Hosted proof-pack route smoke')?.proof_type).toBe('hosted_browser_smoke');
    expect(postDeployProofTypesByGate.get('Hosted proof-pack route smoke')?.proof_boundary).toMatch(/local smoke|constructed demos|skipped smoke/i);
    expect(postDeployProofTypesByGate.get('Current-source hosted parity claim')?.proof_type).toBe('post_deploy_parity_claim');
    expect(postDeployProofTypesByGate.get('Current-source hosted parity claim')?.proof_boundary).toMatch(/does not create live proof/i);
    const postDeployOperatorHandoffPacket = manifest.post_deploy_live_proof.operator_handoff_packet;
    expect(postDeployOperatorHandoffPacket).toEqual(manifest.post_deploy_live_proof.gate_queue.operator_handoff_packet);
    expect(postDeployOperatorHandoffPacket.status).toBe('blocked');
    expect(postDeployOperatorHandoffPacket.proof_type).toBe('post_deploy_live_proof_operator_handoff_packet');
    expect(postDeployOperatorHandoffPacket.source).toBe('post_deploy_live_proof.gate_queue.items');
    expect(postDeployOperatorHandoffPacket.evidence).toContain('Post-deploy live proof operator handoff packet');
    expect(postDeployOperatorHandoffPacket.proof_boundary).toMatch(/planning evidence only|does not grant owner approval|run deploys|mutate Netlify|access live accounts|run browser smoke|hosted\/live parity/i);
    expect(postDeployOperatorHandoffPacket.stop_gate).toMatch(/Do not claim post-deploy live proof|run deploy-production\.sh|netlify deploy|hosted\/live parity/i);
    expect(postDeployOperatorHandoffPacket.item_count).toBe(manifest.post_deploy_live_proof.gate_queue.items.length);
    expect(postDeployOperatorHandoffPacket.blocked_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { blocks_live_proof_gate: boolean }) => item.blocks_live_proof_gate).length,
    );
    expect(postDeployOperatorHandoffPacket.manual_approval_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'manual_approval_gate').length,
    );
    expect(postDeployOperatorHandoffPacket.approved_deploy_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'approved_deploy_execution').length,
    );
    expect(postDeployOperatorHandoffPacket.hosted_probe_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { proof_type: string }) => ['hosted_metadata_probe', 'hosted_static_parity_probe'].includes(item.proof_type)).length,
    );
    expect(postDeployOperatorHandoffPacket.browser_smoke_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'hosted_browser_smoke').length,
    );
    expect(postDeployOperatorHandoffPacket.parity_claim_count).toBe(
      postDeployOperatorHandoffPacket.items.filter((item: { proof_type: string }) => item.proof_type === 'post_deploy_parity_claim').length,
    );
    expect(postDeployOperatorHandoffPacket.items.map((item: { gate: string }) => item.gate)).toEqual(
      manifest.post_deploy_live_proof.gate_queue.items.map((item: { gate: string }) => item.gate),
    );
    expect(postDeployOperatorHandoffPacket.items.every((item: { can_execute_from_packet: boolean }) => item.can_execute_from_packet === false)).toBe(true);
    const postDeployOperatorRowsByGate = mapBy(
      postDeployOperatorHandoffPacket.items,
      (item: {
        gate: string;
        execution_gate?: string;
        approval_required?: boolean;
        approval_phrase?: string | null;
        deploy_required?: boolean;
        live_account_required?: boolean;
        browser_smoke_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.gate,
    );
    expect(postDeployOperatorRowsByGate.get('Production approval clearance')?.execution_gate).toBe('production_approval_clearance_first');
    expect(postDeployOperatorRowsByGate.get('Guarded production deploy completion')?.execution_gate).toBe('approved_deploy_after_owner_phrase');
    expect(postDeployOperatorRowsByGate.get('Guarded production deploy completion')?.approval_required).toBe(true);
    expect(postDeployOperatorRowsByGate.get('Guarded production deploy completion')?.approval_phrase).toBe('DEPLOY CEIP PRODUCTION');
    expect(postDeployOperatorRowsByGate.get('Guarded production deploy completion')?.deploy_required).toBe(true);
    expect(postDeployOperatorRowsByGate.get('Live public metadata')?.execution_gate).toBe('live_metadata_after_approved_deploy');
    expect(postDeployOperatorRowsByGate.get('Live static dist parity')?.execution_gate).toBe('static_parity_after_metadata_and_build');
    expect(postDeployOperatorRowsByGate.get('Hosted proof-pack route smoke')?.execution_gate).toBe('hosted_smoke_after_deploy');
    expect(postDeployOperatorRowsByGate.get('Hosted proof-pack route smoke')?.browser_smoke_required).toBe(true);
    expect(postDeployOperatorRowsByGate.get('Current-source hosted parity claim')?.execution_gate).toBe('parity_claim_after_all_live_gates_pass');
    expect(postDeployOperatorRowsByGate.get('Current-source hosted parity claim')?.live_account_required).toBe(true);
    for (const item of postDeployOperatorHandoffPacket.items) {
      expect(item.proof_boundary).toMatch(/planning evidence only|does not grant owner approval|run deploys|mutate Netlify|access live accounts|run browser smoke|hosted\/live parity/i);
      expect(item.stop_gate).toMatch(/Do not execute deploy or live-proof work|claim hosted\/live parity|mark this row ready/i);
    }
    expect(manifest.source_provenance.branch).toBeTruthy();
    expect(manifest.source_provenance.commit).toBeTruthy();
    expect(Number.isInteger(manifest.source_provenance.dirty_path_count)).toBe(true);
    expect(manifest.source_provenance.evidence).toContain('Source provenance:');
    if (manifest.source_provenance.dirty_paths.length > 0) {
      expect(manifest.source_provenance.dirty_paths[0].index_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].worktree_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].staging_state).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].proof_type).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].owner_decision_required).toBe(true);
      expect(manifest.source_provenance.dirty_paths[0].proof_boundary).toMatch(/Raw source-provenance classification|does not.*commit|clear provenance|deploy|grant approval/i);
      expect(manifest.source_provenance.dirty_paths[0].stop_gate).toMatch(/explicit owner intent|classification evidence only|production approval/i);
      if (manifest.source_provenance.dirty_paths[0].old_path) {
        expect(manifest.source_provenance.dirty_paths[0].proof_type).toBe('source_rename_decision');
      }
      expect(manifest.source_provenance.evidence).toContain('staging_state=');
    }
    expect(manifest.source_provenance.deploy_gate).toContain('deploy');
    expect(manifest.source_provenance.isolation_ledger.status).toMatch(/blocked|pass/);
    expect(manifest.source_provenance.isolation_ledger.proof_type).toBe('source_provenance_isolation_ledger');
    expect(manifest.source_provenance.isolation_ledger.evidence).toContain('Source provenance isolation ledger');
    expect(manifest.source_provenance.isolation_ledger.proof_boundary).toMatch(/dirty-source release impact only|does not mutate source|clear provenance|deploy|grant production approval/i);
    expect(manifest.source_provenance.isolation_ledger.stop_gate).toMatch(/Do not request deploy approval|clean source provenance/i);
    expect(manifest.source_provenance.isolation_ledger.dirty_path_count).toBe(manifest.source_provenance.dirty_path_count);
    expect(manifest.source_provenance.isolation_ledger.rows.length).toBe(manifest.source_provenance.dirty_paths.length);
    if (manifest.source_provenance.isolation_ledger.rows.length > 0) {
      const firstIsolationRow = manifest.source_provenance.isolation_ledger.rows[0];
      expect(firstIsolationRow.release_impact).toMatch(/blocks clean source provenance|does not enter source by default|blocks release provenance/i);
      expect(firstIsolationRow.isolation_status).toBe('owner_decision_required');
      expect(firstIsolationRow.proof_command).toContain('git status --porcelain=v1');
      expect(firstIsolationRow.proof_command).toContain('report:source-provenance-readiness');
      expect(firstIsolationRow.proof_command).toContain('check:source-provenance-report');
      expect(firstIsolationRow.proof_boundary).toMatch(/release-impact classification only|does not clear source provenance/i);
      expect(firstIsolationRow.stop_gate).toMatch(/explicit owner intent|release-readiness|production approval/i);
      expect(firstIsolationRow.blocks_release_source_gate).toBe(true);
      if (firstIsolationRow.old_path) {
        expect(firstIsolationRow.proof_type).toBe('source_rename_decision');
        expect(firstIsolationRow.release_impact).toMatch(/staged rename or move|owner decides/i);
      }
    }
    expect(manifest.source_provenance.resolution_queue.status).toMatch(/blocked|pass/);
    expect(manifest.source_provenance.resolution_queue.evidence).toContain('Source provenance resolution queue');
    expect(manifest.source_provenance.resolution_queue.dirty_path_count).toBe(manifest.source_provenance.dirty_path_count);
    expect(manifest.source_provenance.resolution_queue.item_count).toBe(manifest.source_provenance.resolution_queue.items.length);
    if (manifest.source_provenance.resolution_queue.items.length > 0) {
      const firstSourceDecision = manifest.source_provenance.resolution_queue.items[0];
      expect(firstSourceDecision.source_status).toBeTruthy();
      expect(firstSourceDecision.decision_required).toMatch(/Decide|Confirm/i);
      expect(firstSourceDecision.proof_command).toContain('report:source-provenance-readiness');
      expect(firstSourceDecision.proof_command).toContain('check:source-provenance-report');
      expect(firstSourceDecision.proof_type).toBeTruthy();
      expect(firstSourceDecision.owner_decision_required).toBe(true);
      expect(firstSourceDecision.proof_boundary).toMatch(/does not.*(commit|rename|add|delete|mutate)|grant approval|clear provenance/i);
      expect(firstSourceDecision.stop_gate).toContain('explicit owner intent');
      expect(firstSourceDecision.status).toBe('blocked');
      if (firstSourceDecision.old_path) {
        expect(firstSourceDecision.proof_type).toBe('source_rename_decision');
        expect(firstSourceDecision.proof_boundary).toMatch(/staged rename or move|does not rename/i);
      }
    }
    expect(manifest.source_provenance.owner_decision_packet.status).toBe(manifest.source_provenance.is_dirty ? 'blocked' : 'ready');
    expect(manifest.source_provenance.owner_decision_packet.proof_type).toBe('source_owner_decision_packet');
    expect(manifest.source_provenance.owner_decision_packet.source).toBe('source_provenance.resolution_queue.items');
    expect(manifest.source_provenance.owner_decision_packet.evidence).toContain('Source owner decision packet');
    expect(manifest.source_provenance.owner_decision_packet.item_count).toBe(manifest.source_provenance.resolution_queue.item_count);
    expect(manifest.source_provenance.owner_decision_packet.blocked_count).toBe(manifest.source_provenance.resolution_queue.blocked_count);
    expect(manifest.source_provenance.owner_decision_packet.owner_decision_count).toBe(manifest.source_provenance.resolution_queue.blocked_count);
    expect(manifest.source_provenance.owner_decision_packet.proof_boundary).toMatch(/decision support only|does not commit|request production approval|deploy|grant owner approval/i);
    expect(manifest.source_provenance.owner_decision_packet.stop_gate).toMatch(/Do not mutate source paths|explicit owner intent|clean source-provenance rerun/i);
    if (manifest.source_provenance.owner_decision_packet.items.length > 0) {
      const firstOwnerDecision = manifest.source_provenance.owner_decision_packet.items[0];
      const firstResolutionDecision = manifest.source_provenance.resolution_queue.items[0];
      expect(firstOwnerDecision.file_path).toBe(firstResolutionDecision.file_path);
      expect(firstOwnerDecision.old_path).toBe(firstResolutionDecision.old_path);
      expect(firstOwnerDecision.proof_type).toBe(firstResolutionDecision.proof_type);
      expect(firstOwnerDecision.owner_decision_required).toBe(true);
      expect(firstOwnerDecision.recommended_owner_options.length).toBeGreaterThanOrEqual(2);
      const ownerOptionNames = firstOwnerDecision.recommended_owner_options.map((option: { option?: string }) => option.option);
      if (firstOwnerDecision.old_path || firstOwnerDecision.staging_state === 'staged_only') {
        expect(ownerOptionNames).toEqual(expect.arrayContaining([
          'commit_as_intentional_change',
        ]));
        expect(ownerOptionNames).toEqual(expect.arrayContaining([
          expect.stringMatching(/unstage_for_later_review|stash_or_revert_with_owner_approval/),
        ]));
      }
      expect(firstOwnerDecision.proof_command).toContain('report:source-provenance-readiness');
      expect(firstOwnerDecision.proof_command).toContain('check:source-provenance-report');
      expect(firstOwnerDecision.proof_boundary).toMatch(/decision support only|does not mutate source|request production approval|deploy/i);
      expect(firstOwnerDecision.stop_gate).toMatch(/Do not treat this packet item as approval|clear source provenance/i);
      expect(firstOwnerDecision.blocks_release_source_gate).toBe(true);
    }
    expect(manifest.branch_review.status).toBe('skipped');
    expect(manifest.branch_review.probe_status).toBe('skipped');
    expect(manifest.branch_review.evidence_boundary).toMatch(/does not clear review-first branch families/i);
    expect(manifest.branch_review.risk_counts.high).toBeNull();
    expect(manifest.branch_review.family_counts.local_only).toBeNull();
    expect(manifest.branch_review.family_evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.freshness_counts.stale).toBeNull();
    expect(manifest.branch_review.freshness_evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.review_queue.status).toBe('skipped');
    expect(manifest.branch_review.review_queue.item_count).toBeNull();
    expect(manifest.branch_review.review_queue.review_first_count).toBeNull();
    expect(manifest.branch_review.review_queue.blocked_count).toBeNull();
    expect(manifest.branch_review.review_queue.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.review_queue.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_decisions.open_count).toBeNull();
    expect(manifest.branch_review.canonical_head_decisions.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.evidence).toContain('Canonical head decision ledger skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.proof_type).toBe('canonical_head_resolution_queue');
    expect(manifest.branch_review.canonical_head_resolution_queue.evidence).toContain('Canonical head resolution queue skipped');
    expect(manifest.branch_review.canonical_head_resolution_queue.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
    expect(manifest.branch_review.canonical_head_resolution_queue.items).toEqual([]);
    expect(manifest.branch_review.review_first_packets.status).toBe('skipped');
    expect(manifest.branch_review.review_first_packets.item_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.queue_review_first_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.pass_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.fail_count).toBeNull();
    expect(manifest.branch_review.review_first_packets.packets).toEqual([]);
    expect(manifest.branch_review.review_first_packets.evidence).toContain('Review-first branch packets skipped');
    expect(manifest.branch_review.top_review_packet.status).toBe('skipped');
    expect(manifest.branch_review.top_review_packet.branch).toBeNull();
    expect(manifest.branch_review.top_review_packet.changed_supabase_function_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.changed_supabase_functions).toEqual([]);
    expect(manifest.branch_review.top_review_packet.changed_supabase_function_rows).toEqual([]);
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.status).toBe('skipped');
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.local_ref).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.origin_ref).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.local_only_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.origin_only_count).toBeNull();
    expect(manifest.branch_review.top_review_packet.canonical_head_comparison.evidence).toContain('Canonical head comparison skipped');
    expect(manifest.branch_review.top_review_packet.evidence).toContain('Top branch review packet skipped');
    expect(manifest.branch_review.top_review_packet.evidence).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(manifest.branch_review.evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.evidence).toContain('Branch operator handoff packet skipped');
    expect(manifest.branch_review.evidence).toContain('Review-first branch packets skipped');
    expect(manifest.branch_review.evidence).toContain('Top branch review packet skipped');
    expect(manifest.branch_review.evidence).toContain('Canonical head comparison skipped');
    expect(manifest.pain_points).toHaveLength(10);
    expect(manifest.pain_points[0].source_evidence.every((source: string) => source.startsWith('https://'))).toBe(true);
    expect(manifest.pain_points.every((item: {
      source_evidence: string[];
      proof_type?: string;
      proof_boundary?: string;
      stop_gate?: string;
    }) => item.source_evidence.every((source) => source.startsWith('https://')))).toBe(true);
    expect(manifest.pain_points.every((item: { proof_type?: string }) => item.proof_type === 'market_pain_source_research')).toBe(true);
    expect(manifest.pain_points[0].proof_boundary).toMatch(/source-backed market pain hypothesis|does not prove buyer acceptance|commercial-ready status/i);
    expect(manifest.pain_points[0].stop_gate).toMatch(/Do not treat source links|buyer proof|permission to contact buyers/i);
    expect(manifest.target_customers).toHaveLength(10);
    expect(manifest.target_customers.every((item: { proof_type?: string }) => item.proof_type === 'target_segment_ranking_hypothesis')).toBe(true);
    expect(manifest.target_customers[0].proof_boundary).toMatch(/Target segment ranking|does not prove named-account validation|outreach permission|commercial-ready status/i);
    expect(manifest.target_customers[0].stop_gate).toMatch(/Do not treat target ranking|permission to contact buyers|buyer-proven evidence/i);
    expect(manifest.outreach_plan.email_script_boundary).toContain('Do not claim buyer-proven 95% confidence');
    expect(manifest.fix_report.files_changed).toContain('tests/unit/launchEvidenceManifest.test.ts');
    expect(manifest.fix_report.tests_run).toEqual(expect.arrayContaining([
      'pnpm exec tsc -b --pretty false',
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(manifest.fix_report.current_required_checks).toEqual(expect.arrayContaining([
      'corepack pnpm run report:source-provenance-readiness && corepack pnpm run check:source-provenance-report',
      'corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report',
      'corepack pnpm run report:launch-action-readiness && corepack pnpm run check:launch-action-report',
      'corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness',
      'corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report',
      'corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report',
      'corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report',
      'corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report',
      'corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report',
	      'corepack pnpm run check:focused-launch-readiness-reports -- --skip-probes',
	      'corepack pnpm run check:buyer-evidence-readiness-report',
	      'corepack pnpm run check:commercial-launch-readiness-report',
      'corepack pnpm run check:release-readiness',
      'corepack pnpm run check:production-deploy-request',
      'corepack pnpm run check:post-deploy-live',
    ]));
    expect(manifest.implementation_decisions).toHaveLength(75);
    expect(manifest.rejected_variants.length).toBeGreaterThanOrEqual(3);
    expect(manifest.code_optimization_reviews).toHaveLength(75);
    const safeFixDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    );
    expect(safeFixDecision).toBeTruthy();
    expect(safeFixDecision.task_id).toBe('CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    expect(safeFixDecision.chosen_variant).toBe('minimal manifest/report evidence patch');
    expect(safeFixDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-commercial-launch-readiness.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(safeFixDecision.tests_run).toEqual(expect.arrayContaining([
      'pnpm exec tsc -b --pretty false',
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(safeFixDecision.proof_boundary).toMatch(/does not clear buyer evidence|production approval|hosted\/live parity/i);
    const safeFixReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES',
    );
    expect(safeFixReview).toBeTruthy();
    expect(safeFixReview.target_task).toBe('CEIP-SAFE-FIX-PREVIEW-MANIFEST-TYPES');
    expect(safeFixReview.policy).toBe('strict');
    expect(safeFixReview.verdict).toBe('pass');
    expect(safeFixReview.minimality_score).toBeGreaterThanOrEqual(4);
    expect(safeFixReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run test:e2e:preview',
      'pnpm run test:strategy-audit-slice',
    ]));
    expect(manifest.rejected_variants.map((item: { variant: string }) => item.variant)).toEqual(expect.arrayContaining([
      'Leave implementation_decisions, rejected_variants, and code_optimization_reviews empty.',
      'Reconstruct every historical safe-fix commit in the manifest.',
      'Add a separate new proof artifact for the preview TypeScript gate fix.',
      'Leave Launch evidence validation blocked inside the request packet.',
      'Run check-launch-evidence-manifest from report-launch-evidence-manifest.',
      'Patch report-production-approval-packet to hide or rewrite the manifest request rows after validation.',
      'Leave branch_review.review_queue.status as pass while review_first_count is nonzero.',
      'Attempt to retire, merge, delete, checkout, or push branch heads to clear the blocker.',
      'Add a separate branch-review artifact for queue status.',
      'Leave starter registers counted only as production pilot evidence registers.',
      'Ignore all starter registers during readiness scanning.',
      'Treat any base-valid register as ready acquisition evidence.',
      'Leave buyer evidence hard-gate details only inside the broad launch manifest and commercial launch report.',
      'Duplicate buyer evidence readiness scanning in a standalone hard-gate implementation.',
      'Contact buyers, create evidence workspaces, or update pilot evidence registers from the focused report.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad buyer evidence handles.',
      'Leave launch action and production approval buyer rows pointing only at raw validate:pilot-evidence placeholders.',
      'Run validate:pilot-evidence or create/update buyer evidence artifacts to clear the buyer blocker.',
      'Treat focused buyer gate report/check success as accepted buyer evidence or 95% validation.',
      'Duplicate buyer evidence readiness or remediation parsing in launch action or production approval rows.',
      'Leave release preflight only inside the large launch manifest and commercial launch report.',
      'Duplicate release preflight probing logic in a new standalone implementation.',
      'Make the focused checker pass the release gate or install Corepack/Git LFS automatically.',
      'Leave source-of-truth docs and public handles pointing only at broad launch manifest and commercial readiness reports.',
      'Update only COMMERCIAL_SOURCE_OF_TRUTH and leave public status/release posture commands unchanged.',
      'Fold focused release-preflight report logic into release-readiness or production deploy scripts.',
      'Leave the lower per-file timeout caps and continue treating the broad strategy-audit slice timeout as residual noise.',
      'Remove or skip the slow production approval and strategy completion audit cases from the strategy-audit slice.',
      'Rewrite the subprocess fixture harnesses and report scripts to reduce runtime.',
      'Leave source provenance only inside release preflight, production approval packet, and commercial launch reports.',
      'Duplicate git status parsing and dirty-path classification in a standalone source-provenance implementation.',
      'Automatically commit, unstage, stash, revert, or rename paths to clear source provenance.',
      'Add package scripts only and leave docs, public status, release posture, and validators on broad source-provenance handles.',
      'Leave source-provenance action and release rows pointing at the broad production approval packet.',
      'Replace the production approval packet as an approval-request artifact.',
      'Automatically commit, unstage, stash, revert, delete, rename, or move the staged workflow rename.',
      'Add a new source-provenance command instead of reusing the focused source-provenance report/check.',
      'Leave release operator actions implicit in release_preflight.remediation_queue rows.',
      'Install or enable Corepack, install Git LFS, or run release-readiness from the handoff phase.',
      'Create a separate release runbook artifact or file.',
      'Leave branch operator actions implicit in branch_review.clearance_matrix rows.',
      'Checkout, merge, push, discard, delete, or select canonical heads from the handoff phase.',
      'Create a separate branch runbook artifact or file.',
      'Leave Supabase advisor operator actions implicit in clearance_deficits.remediation_queue rows.',
      'Call Supabase connector, access the dashboard, rerun advisors, mutate database state, or record advisor findings from the handoff phase.',
      'Create a separate Supabase advisor runbook artifact or file.',
      'Leave post-deploy operator actions implicit in post_deploy_live_proof.gate_queue rows.',
      'Run production deploy, live metadata, static parity, hosted smoke, or hosted parity checks from the handoff phase.',
      'Create a separate post-deploy live-proof runbook artifact or file.',
      'Leave production approval operator actions implicit in production_approval.request_packet rows.',
      'Request owner approval, run production deploy request, deploy, or mutate production from the handoff phase.',
      'Create a separate production approval runbook artifact or file.',
      'Leave launch action operator sequencing implicit in launch_action_queue rows.',
      'Execute source cleanup, release-readiness, branch operations, buyer outreach, Supabase advisor access, owner approval request, deploy, or live proof from the handoff phase.',
      'Create a separate launch action runbook artifact or file.',
      'Leave launch action and production approval release rows pointing at broad launch manifest plus release-readiness only.',
      'Remove the guarded check:release-readiness command from release-toolchain proof rows.',
      'Install or shim Corepack/Git LFS, fall back to bare pnpm, or run release-readiness despite dirty source.',
      'Duplicate release preflight probing logic in launch action or production approval rows.',
      'Treat bare pnpm 10.23.0 as satisfying Corepack release evidence.',
      'Install or enable Corepack globally from the safe-fix report phase.',
      'Leave Corepack ENOENT without local pnpm diagnostic context.',
      'Rewrite the configured Git hooks or global hook PATH to include /opt/homebrew/bin.',
      'Treat git lfs version success in a PATH-injected report as full commit and push hook clearance.',
      'Add a third release-toolchain ledger item for Git LFS hook PATH.',
      'Leave Supabase advisor clearance only inside the broad launch manifest and commercial launch report.',
      'Call Supabase connector or dashboard advisors from the focused report.',
      'Duplicate Supabase advisor clearance parsing in a standalone implementation.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad Supabase advisor handles.',
      'Leave launch action and production approval Supabase rows pointing only at dashboard or connector advisor review commands.',
      'Call Supabase connector or dashboard advisors to clear the Supabase advisor blocker.',
      'Treat CLI app lint, permission-denied connector output, or focused report/check success as Supabase advisor clearance.',
      'Duplicate Supabase advisor clearance and remediation parsing in launch action or production approval rows.',
      'Leave branch review only inside the broad launch manifest, commercial launch report, and unmerged branch inventory.',
      'Duplicate branch inventory, family grouping, freshness, and focused packet parsing in a standalone implementation.',
      'Checkout, merge, push, discard, delete, or select canonical branch heads to clear the branch review blocker.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad branch handles.',
      'Leave launch action and production approval branch rows pointing only at unmerged-branch readiness commands.',
      'Replace or remove branch-specific unmerged-branch packet evidence from the branch_review object.',
      'Checkout, merge, push, discard, delete, or select canonical branch heads to clear branch review.',
      'Duplicate branch scanning and canonical-head parsing in launch action or production approval rows.',
      'Leave launch evidence validation only as check:launch-evidence-manifest plus the production approval packet.',
      'Teach report-launch-evidence-manifest to self-certify launch evidence validation status.',
      'Duplicate validate_launch_evidence.py and manifest structural assertions in a new checker.',
      'Run release-readiness, request owner approval, contact buyers, authorize Supabase, deploy, or mutate source from the validation report.',
      'Leave the launch action validation row blocked even after focused validation evidence is externalized.',
      'Run check:launch-evidence-manifest inside report-launch-evidence-manifest to derive the row status dynamically.',
      'Remove the launch_evidence_validation row from the launch action queue.',
      'Mark the entire launch action queue ready when launch evidence validation passes.',
      'Leave launch action planning only inside the broad launch manifest and commercial launch report.',
      'Duplicate launch action queue construction in a standalone implementation.',
      'Commit source changes, run release-readiness, checkout branches, contact buyers, authorize Supabase, request approval, or deploy from the focused report.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad launch action handles.',
      'Leave buyer_evidence lane_status_summary as the broad buyer evidence scan status.',
      'Mark the buyer evidence lane ready from manifest.buyer_evidence.status alone.',
      'Contact buyers, create retained artifacts, or run validate:pilot-evidence from the launch action report.',
      'Rewrite the global buyer_evidence.status semantics for the manifest.',
      'Keep running live static parity even when local release-readiness fails.',
      'Fall back to bare pnpm or build dist directly when Corepack is unavailable.',
      'Skip every live check when any pre-deploy gate is blocked.',
      'Leave production approval readiness only inside the broad launch manifest, commercial launch report, and production approval packet.',
      'Duplicate production approval prerequisite and request-packet construction in a standalone implementation.',
      'Run deploy-production.sh, request owner approval, or run live proof checks from the focused report.',
      'Add package scripts only and leave public status, release posture, docs, and validators on broad production approval handles.',
      'Leave completion audit blocker rows pointing directly at raw validation, dashboard, release, deploy, and live-proof commands.',
      'Run buyer validation, Supabase advisors, release-readiness, approval request, deploy, or post-deploy live proof from the completion audit phase.',
      'Duplicate gate parsing or remediation logic inside the completion audit checker.',
      'Remove or flatten unresolved blocker rows from the objective completion audit.',
      'Leave final launch action rows pointing directly at check:production-deploy-request and check:post-deploy-live.',
      'Run production deploy request or post-deploy live proof from the launch action report.',
      'Remove the raw deploy-request and post-deploy live commands from downstream gate queues.',
      'Duplicate production approval or post-deploy gate construction in the launch action checker.',
      'Leave the local proof-pack smoke command discoverable only in package.json.',
      'Classify local proof-pack smoke as release readiness, hosted proof, or current hosted/live parity.',
      'Run hosted proof-pack smoke, deployment, or production approval checks from this public-handle phase.',
    ]));
    const approvalCircularityDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    );
    expect(approvalCircularityDecision).toBeTruthy();
    expect(approvalCircularityDecision.chosen_variant).toBe('minimal prerequisite status and evidence-text patch');
    expect(approvalCircularityDecision.proof_boundary).toMatch(/does not clear source provenance|owner approval|hosted\/live parity/i);
    const approvalCircularityReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-VALIDATION-CIRCULARITY',
    );
    expect(approvalCircularityReview).toBeTruthy();
    expect(approvalCircularityReview.policy).toBe('strict');
    expect(approvalCircularityReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ]));
    const branchQueueDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    );
    expect(branchQueueDecision).toBeTruthy();
    expect(branchQueueDecision.chosen_variant).toBe('minimal branch review queue status patch');
    expect(branchQueueDecision.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|deploy/i);
    const branchQueueReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-QUEUE-STATUS',
    );
    expect(branchQueueReview).toBeTruthy();
    expect(branchQueueReview.policy).toBe('strict');
    expect(branchQueueReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
    ]));
    const starterBoundaryDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    );
    expect(starterBoundaryDecision).toBeTruthy();
    expect(starterBoundaryDecision.chosen_variant).toBe('minimal starter-register classification patch');
    expect(starterBoundaryDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95%/i);
    const starterBoundaryReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-STARTER-REGISTER-BOUNDARY',
    );
    expect(starterBoundaryReview).toBeTruthy();
    expect(starterBoundaryReview.policy).toBe('strict');
    expect(starterBoundaryReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:phase-f-evidence-workspace',
    ]));
    const buyerEvidenceGateReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    );
    expect(buyerEvidenceGateReportDecision).toBeTruthy();
    expect(buyerEvidenceGateReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(buyerEvidenceGateReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-buyer-evidence-gate-readiness.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'tests/unit/buyerEvidenceGateReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(buyerEvidenceGateReportDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95|grant production approval|hosted\/live parity/i);
    const buyerEvidenceGateReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-GATE-FOCUSED-REPORT',
    );
    expect(buyerEvidenceGateReportReview).toBeTruthy();
    expect(buyerEvidenceGateReportReview.policy).toBe('strict');
    expect(buyerEvidenceGateReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:buyer-evidence-gate-readiness',
      'pnpm run check:buyer-evidence-gate-report',
    ]));
    const buyerEvidenceProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    );
    expect(buyerEvidenceProofHandleDecision).toBeTruthy();
    expect(buyerEvidenceProofHandleDecision.chosen_variant).toBe('minimal focused buyer evidence proof-handle derivation');
    expect(buyerEvidenceProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'tests/unit/buyerEvidenceGateReadiness.test.ts',
    ]));
    expect(buyerEvidenceProofHandleDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|run retained-artifact validation as clearance|validate 95%|grant production approval|hosted\/live parity/i);
    const buyerEvidenceProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PROOF-HANDLES',
    );
    expect(buyerEvidenceProofHandleReview).toBeTruthy();
    expect(buyerEvidenceProofHandleReview.policy).toBe('strict');
    expect(buyerEvidenceProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:buyer-evidence-gate-readiness',
      'pnpm run check:buyer-evidence-gate-report',
      'pnpm run check:production-approval-report -- --skip-probes',
    ]));
    const buyerEvidencePublicGateHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    );
    expect(buyerEvidencePublicGateHandleDecision).toBeTruthy();
    expect(buyerEvidencePublicGateHandleDecision.chosen_variant).toBe('minimal public buyer evidence gate handle alignment');
    expect(buyerEvidencePublicGateHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'scripts/generate-public-release-status.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(buyerEvidencePublicGateHandleDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95%|buyer proof|buyer acceptance|production approval|hosted\/live parity|raise launch status/i);
    const buyerEvidencePublicGateHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-GATE-HANDLE',
    );
    expect(buyerEvidencePublicGateHandleReview).toBeTruthy();
    expect(buyerEvidencePublicGateHandleReview.policy).toBe('strict');
    expect(buyerEvidencePublicGateHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run generate:public-release-status',
      'pnpm run check:public-release-status',
      'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes',
      'pnpm run check:buyer-evidence-gate-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const releasePreflightDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    );
    expect(releasePreflightDecision).toBeTruthy();
    expect(releasePreflightDecision.chosen_variant).toBe('minimal focused manifest wrapper');
    expect(releasePreflightDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'package.json',
    ]));
    expect(releasePreflightDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|deploy|hosted\/live parity/i);
    const releasePreflightReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-FOCUSED-REPORT',
    );
    expect(releasePreflightReview).toBeTruthy();
    expect(releasePreflightReview.policy).toBe('strict');
    expect(releasePreflightReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:release-preflight',
      'pnpm run check:release-preflight-report',
    ]));
    const releasePreflightSourceOfTruthDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    );
    expect(releasePreflightSourceOfTruthDecision).toBeTruthy();
    expect(releasePreflightSourceOfTruthDecision.chosen_variant).toBe('minimal docs and public handle alignment');
    expect(releasePreflightSourceOfTruthDecision.files_changed).toEqual(expect.arrayContaining([
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'src/lib/publicReleaseStatusManifest.json',
      'src/lib/releasePosture.ts',
      'scripts/generate-public-release-status.mjs',
      'scripts/check-commercial-source-docs.mjs',
      'tests/unit/statusPagePosture.test.ts',
    ]));
    expect(releasePreflightSourceOfTruthDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|deploy|hosted\/live parity/i);
    const releasePreflightSourceOfTruthReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-SOURCE-OF-TRUTH-HANDLES',
    );
    expect(releasePreflightSourceOfTruthReview).toBeTruthy();
    expect(releasePreflightSourceOfTruthReview.policy).toBe('strict');
    expect(releasePreflightSourceOfTruthReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:commercial-source',
      'pnpm run check:public-release-status',
      'pnpm run check:release-preflight-report',
    ]));
    const strategyAuditTimeoutDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    );
    expect(strategyAuditTimeoutDecision).toBeTruthy();
    expect(strategyAuditTimeoutDecision.chosen_variant).toBe('minimal Vitest timeout budget alignment');
    expect(strategyAuditTimeoutDecision.files_changed).toEqual(expect.arrayContaining([
      'tests/unit/productionApprovalPacket.test.ts',
      'tests/unit/strategyCompletionAudit.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(strategyAuditTimeoutDecision.proof_boundary).toMatch(/does not clear source provenance|install Corepack|owner approval|deploy|hosted\/live parity/i);
    const strategyAuditTimeoutReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-STRATEGY-AUDIT-SLICE-TIMEOUT-BUDGET',
    );
    expect(strategyAuditTimeoutReview).toBeTruthy();
    expect(strategyAuditTimeoutReview.policy).toBe('strict');
    expect(strategyAuditTimeoutReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run test:strategy-audit-slice',
      'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts -t "keeps full blocker gates failing when live parity is stale" --no-file-parallelism --maxWorkers=1',
      'pnpm exec vitest run tests/unit/strategyCompletionAudit.test.ts -t "exits nonzero when a required local source gate fails|keeps live metadata failure as an external gate when local checks pass" --no-file-parallelism --maxWorkers=1',
    ]));
    const sourceProvenanceReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    );
    expect(sourceProvenanceReportDecision).toBeTruthy();
    expect(sourceProvenanceReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(sourceProvenanceReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/check-source-provenance-readiness-report.mjs',
      'tests/unit/sourceProvenanceReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(sourceProvenanceReportDecision.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|deploy|hosted\/live parity/i);
    const sourceProvenanceReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-FOCUSED-REPORT',
    );
    expect(sourceProvenanceReportReview).toBeTruthy();
    expect(sourceProvenanceReportReview.policy).toBe('strict');
    expect(sourceProvenanceReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:source-provenance-readiness',
      'pnpm run check:source-provenance-report',
    ]));
    const sourceProvenanceProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    );
    expect(sourceProvenanceProofHandleDecision).toBeTruthy();
    expect(sourceProvenanceProofHandleDecision.chosen_variant).toBe('minimal focused source proof-handle derivation');
    expect(sourceProvenanceProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-source-provenance-readiness-report.mjs',
      'tests/unit/sourceProvenanceReadiness.test.ts',
    ]));
    expect(sourceProvenanceProofHandleDecision.proof_boundary).toMatch(/does not commit|clear source provenance|replace production approval request artifacts|run release-readiness|deploy|hosted\/live parity/i);
    const sourceProvenanceProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PROOF-HANDLES',
    );
    expect(sourceProvenanceProofHandleReview).toBeTruthy();
    expect(sourceProvenanceProofHandleReview.policy).toBe('strict');
    expect(sourceProvenanceProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:source-provenance-report -- --skip-probes',
      'pnpm run check:release-preflight-report -- --skip-probes',
    ]));
    const sourceProvenanceRenameSummaryDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    );
    expect(sourceProvenanceRenameSummaryDecision).toBeTruthy();
    expect(sourceProvenanceRenameSummaryDecision.chosen_variant).toBe('minimal source decision summary helper');
    expect(sourceProvenanceRenameSummaryDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(sourceProvenanceRenameSummaryDecision.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|deploy|hosted\/live parity/i);
    const sourceProvenanceRenameSummaryReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-RENAME-SUMMARY',
    );
    expect(sourceProvenanceRenameSummaryReview).toBeTruthy();
    expect(sourceProvenanceRenameSummaryReview.policy).toBe('strict');
    expect(sourceProvenanceRenameSummaryReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:source-provenance-readiness -- --skip-probes',
      'pnpm run check:source-provenance-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const releaseToolchainProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    );
    expect(releaseToolchainProofHandleDecision).toBeTruthy();
    expect(releaseToolchainProofHandleDecision.chosen_variant).toBe('minimal focused release proof-handle derivation');
    expect(releaseToolchainProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'tests/unit/productionApprovalReadiness.test.ts',
    ]));
    expect(releaseToolchainProofHandleDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|deploy|hosted\/live parity/i);
    const releaseToolchainProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PROOF-HANDLES',
    );
    expect(releaseToolchainProofHandleReview).toBeTruthy();
    expect(releaseToolchainProofHandleReview.policy).toBe('strict');
    expect(releaseToolchainProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:release-preflight -- --skip-probes',
      'pnpm run check:release-preflight-report -- --skip-probes',
      'pnpm run check:production-approval-report -- --skip-probes',
    ]));
    const supabaseAdvisorReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    );
    expect(supabaseAdvisorReportDecision).toBeTruthy();
    expect(supabaseAdvisorReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(supabaseAdvisorReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-supabase-advisor-readiness.mjs',
      'scripts/check-supabase-advisor-readiness-report.mjs',
      'tests/unit/supabaseAdvisorReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(supabaseAdvisorReportDecision.proof_boundary).toMatch(/does not authorize connectors|rerun Security Advisor|record secrets|grant production approval|hosted\/live parity/i);
    const supabaseAdvisorReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-FOCUSED-REPORT',
    );
    expect(supabaseAdvisorReportReview).toBeTruthy();
    expect(supabaseAdvisorReportReview.policy).toBe('strict');
    expect(supabaseAdvisorReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:supabase-advisor-readiness',
      'pnpm run check:supabase-advisor-report',
    ]));
    const branchReviewReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    );
    expect(branchReviewReportDecision).toBeTruthy();
    expect(branchReviewReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(branchReviewReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-branch-review-readiness.mjs',
      'scripts/check-branch-review-readiness-report.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
      'src/lib/publicReleaseStatusManifest.json',
    ]));
    expect(branchReviewReportDecision.proof_boundary).toMatch(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|grant production approval|hosted\/live parity/i);
    const branchReviewReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-FOCUSED-REPORT',
    );
    expect(branchReviewReportReview).toBeTruthy();
    expect(branchReviewReportReview.policy).toBe('strict');
    expect(branchReviewReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:branch-review-readiness',
      'pnpm run check:branch-review-report',
    ]));
    const branchReviewFunctionImpactDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    );
    expect(branchReviewFunctionImpactDecision).toBeTruthy();
    expect(branchReviewFunctionImpactDecision.chosen_variant).toBe('minimal branch checker hardening');
    expect(branchReviewFunctionImpactDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/check-branch-review-readiness-report.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(branchReviewFunctionImpactDecision.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|run migrations|deploy Supabase functions|alter secrets|change policies|production approval|hosted\/live parity|raise launch status/i);
    const branchReviewFunctionImpactReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-SUPABASE-FUNCTION-IMPACT-CHECK',
    );
    expect(branchReviewFunctionImpactReview).toBeTruthy();
    expect(branchReviewFunctionImpactReview.policy).toBe('strict');
    expect(branchReviewFunctionImpactReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/branchReviewReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:branch-review-readiness',
      'pnpm run check:branch-review-report',
    ]));
    const launchManifestBranchFunctionImpactDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    );
    expect(launchManifestBranchFunctionImpactDecision).toBeTruthy();
    expect(launchManifestBranchFunctionImpactDecision.chosen_variant).toBe('minimal launch manifest checker hardening');
    expect(launchManifestBranchFunctionImpactDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchManifestBranchFunctionImpactDecision.proof_boundary).toMatch(/does not checkout|merge|push|select canonical heads|run migrations|deploy Supabase functions|alter secrets|change policies|production approval|hosted\/live parity|raise launch status/i);
    const launchManifestBranchFunctionImpactReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-BRANCH-FUNCTION-IMPACT-CHECK',
    );
    expect(launchManifestBranchFunctionImpactReview).toBeTruthy();
    expect(launchManifestBranchFunctionImpactReview.policy).toBe('strict');
    expect(launchManifestBranchFunctionImpactReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'node scripts/check-launch-evidence-manifest.mjs',
      'node scripts/check-launch-evidence-manifest.mjs --skip-probes',
    ]));
    const branchReviewProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    );
    expect(branchReviewProofHandleDecision).toBeTruthy();
    expect(branchReviewProofHandleDecision.chosen_variant).toBe('minimal focused branch proof-handle derivation');
    expect(branchReviewProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
    ]));
    expect(branchReviewProofHandleDecision.proof_boundary).toMatch(/does not checkout|merge|push|discard|select canonical heads|run migrations|mutate Supabase|grant production approval|hosted\/live parity/i);
    const branchReviewProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-PROOF-HANDLES',
    );
    expect(branchReviewProofHandleReview).toBeTruthy();
    expect(branchReviewProofHandleReview.policy).toBe('strict');
    expect(branchReviewProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:branch-review-readiness',
      'pnpm run check:branch-review-report',
      'pnpm run check:production-approval-report -- --skip-probes',
    ]));
    const supabaseAdvisorProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    );
    expect(supabaseAdvisorProofHandleDecision).toBeTruthy();
    expect(supabaseAdvisorProofHandleDecision.chosen_variant).toBe('minimal focused Supabase advisor proof-handle derivation');
    expect(supabaseAdvisorProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-supabase-advisor-readiness-report.mjs',
      'tests/unit/supabaseAdvisorReadiness.test.ts',
    ]));
    expect(supabaseAdvisorProofHandleDecision.proof_boundary).toMatch(/does not authorize connectors|access dashboards|rerun Security Advisor|record secrets|grant production approval|hosted\/live parity/i);
    const supabaseAdvisorProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PROOF-HANDLES',
    );
    expect(supabaseAdvisorProofHandleReview).toBeTruthy();
    expect(supabaseAdvisorProofHandleReview.policy).toBe('strict');
    expect(supabaseAdvisorProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:supabase-advisor-readiness',
      'pnpm run check:supabase-advisor-report',
      'pnpm run check:production-approval-report -- --skip-probes',
    ]));
    const launchEvidenceValidationReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    );
    expect(launchEvidenceValidationReportDecision).toBeTruthy();
    expect(launchEvidenceValidationReportDecision.chosen_variant).toBe('minimal focused validation wrapper and public handle alignment');
    expect(launchEvidenceValidationReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-validation-readiness.mjs',
      'scripts/check-launch-evidence-validation-readiness-report.mjs',
      'tests/unit/launchEvidenceValidationReadiness.test.ts',
    ]));
    expect(launchEvidenceValidationReportDecision.proof_boundary).toMatch(/does not self-certify|clear source provenance|run release-readiness|request owner approval|contact buyers|authorize Supabase|deploy|hosted\/live parity|raise launch status/i);
    const launchEvidenceValidationReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-FOCUSED-REPORT',
    );
    expect(launchEvidenceValidationReportReview).toBeTruthy();
    expect(launchEvidenceValidationReportReview.policy).toBe('strict');
    expect(launchEvidenceValidationReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:launch-evidence-validation-readiness',
      'pnpm run check:launch-evidence-validation-report',
    ]));
    const launchValidationProductionApprovalProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    );
    expect(launchValidationProductionApprovalProofHandleDecision).toBeTruthy();
    expect(launchValidationProductionApprovalProofHandleDecision.chosen_variant).toBe('minimal production approval validation proof-handle alignment');
    expect(launchValidationProductionApprovalProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/report-launch-evidence-validation-readiness.mjs',
      'scripts/check-launch-evidence-validation-readiness-report.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/launchEvidenceValidationReadiness.test.ts',
      'tests/unit/productionApprovalReadiness.test.ts',
    ]));
    expect(launchValidationProductionApprovalProofHandleDecision.proof_boundary).toMatch(/does not self-certify|clear source provenance|run release-readiness|request owner approval|contact buyers|authorize Supabase|deploy|hosted\/live parity|raise launch status/i);
    const launchValidationProductionApprovalProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-VALIDATION-PRODUCTION-APPROVAL-PROOF-HANDLES',
    );
    expect(launchValidationProductionApprovalProofHandleReview).toBeTruthy();
    expect(launchValidationProductionApprovalProofHandleReview.policy).toBe('strict');
    expect(launchValidationProductionApprovalProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/launchEvidenceValidationReadiness.test.ts tests/unit/productionApprovalReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:launch-evidence-validation-report -- --skip-probes',
      'pnpm run check:production-approval-report -- --skip-probes',
    ]));
    const launchActionValidationStatusDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    );
    expect(launchActionValidationStatusDecision).toBeTruthy();
    expect(launchActionValidationStatusDecision.chosen_variant).toBe('minimal launch action row status alignment');
    expect(launchActionValidationStatusDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
    ]));
    expect(launchActionValidationStatusDecision.proof_boundary).toMatch(/does not self-certify|clear source provenance|run release-readiness|request owner approval|contact buyers|authorize Supabase|deploy|hosted\/live parity|raise launch status/i);
    const launchActionValidationStatusReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-VALIDATION-STATUS',
    );
    expect(launchActionValidationStatusReview).toBeTruthy();
    expect(launchActionValidationStatusReview.policy).toBe('strict');
    expect(launchActionValidationStatusReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:launch-action-report -- --skip-probes',
      'pnpm run check:launch-evidence-validation-report -- --skip-probes',
    ]));
    const launchActionReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    );
    expect(launchActionReportDecision).toBeTruthy();
    expect(launchActionReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(launchActionReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-action-readiness.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
    ]));
    expect(launchActionReportDecision.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|checkout branches|merge|push|contact buyers|authorize Supabase|request owner approval|deploy|hosted\/live parity|raise launch status/i);
    const launchActionReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-FOCUSED-REPORT',
    );
    expect(launchActionReportReview).toBeTruthy();
    expect(launchActionReportReview.policy).toBe('strict');
    expect(launchActionReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:launch-action-readiness',
      'pnpm run check:launch-action-report',
    ]));
    const launchActionBuyerLaneStatusDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    );
    expect(launchActionBuyerLaneStatusDecision).toBeTruthy();
    expect(launchActionBuyerLaneStatusDecision.chosen_variant).toBe('minimal launch action buyer lane status derivation');
    expect(launchActionBuyerLaneStatusDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-action-readiness.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
    ]));
    expect(launchActionBuyerLaneStatusDecision.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|validate 95%|clear buyer evidence|production approval|hosted\/live parity/i);
    const launchActionBuyerLaneStatusReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-BUYER-LANE-STATUS',
    );
    expect(launchActionBuyerLaneStatusReview).toBeTruthy();
    expect(launchActionBuyerLaneStatusReview.policy).toBe('strict');
    expect(launchActionBuyerLaneStatusReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:launch-action-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const productionPacketSequencingDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    );
    expect(productionPacketSequencingDecision).toBeTruthy();
    expect(productionPacketSequencingDecision.chosen_variant).toBe('minimal prerequisite sequencing patch');
    expect(productionPacketSequencingDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-production-approval-packet.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'tests/unit/productionApprovalPacket.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(productionPacketSequencingDecision.proof_boundary).toMatch(/does not install Corepack|run release-readiness successfully|build dist|approve production|deploy|hosted\/live parity/i);
    const productionPacketSequencingReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PACKET-SEQUENCING',
    );
    expect(productionPacketSequencingReview).toBeTruthy();
    expect(productionPacketSequencingReview.policy).toBe('strict');
    expect(productionPacketSequencingReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/productionApprovalPacket.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:production-approval-packet',
      'pnpm run report:production-approval-packet -- --skip-release-readiness',
    ]));
    const productionApprovalReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    );
    expect(productionApprovalReportDecision).toBeTruthy();
    expect(productionApprovalReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(productionApprovalReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-production-approval-readiness.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'tests/unit/productionApprovalReadiness.test.ts',
    ]));
    expect(productionApprovalReportDecision.proof_boundary).toMatch(/does not grant owner approval|request approval|clear source provenance|run release-readiness successfully|deploy|post-deploy live proof/i);
    const productionApprovalReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-FOCUSED-REPORT',
    );
    expect(productionApprovalReportReview).toBeTruthy();
    expect(productionApprovalReportReview.policy).toBe('strict');
    expect(productionApprovalReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:production-approval-readiness',
      'pnpm run check:production-approval-report',
    ]));
    const postDeployLiveProofReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    );
    expect(postDeployLiveProofReportDecision).toBeTruthy();
    expect(postDeployLiveProofReportDecision.chosen_variant).toBe('minimal focused manifest wrapper and public handle alignment');
    expect(postDeployLiveProofReportDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-post-deploy-live-proof-readiness.mjs',
      'scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'tests/unit/postDeployLiveProofReadiness.test.ts',
    ]));
    expect(postDeployLiveProofReportDecision.proof_boundary).toMatch(/does not grant owner approval|run deploys|mutate Netlify|run browser smoke|prove hosted\/live parity/i);
    const postDeployLiveProofReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-FOCUSED-REPORT',
    );
    expect(postDeployLiveProofReportReview).toBeTruthy();
    expect(postDeployLiveProofReportReview.policy).toBe('strict');
    expect(postDeployLiveProofReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:post-deploy-live-proof-readiness',
      'pnpm run check:post-deploy-live-proof-report',
    ]));
    const postDeployProductionApprovalProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-POST-DEPLOY-PRODUCTION-APPROVAL-PROOF-HANDLES',
    );
    expect(postDeployProductionApprovalProofHandleDecision).toBeTruthy();
    expect(postDeployProductionApprovalProofHandleDecision.chosen_variant).toBe('minimal post-deploy production approval proof-handle alignment');
    expect(postDeployProductionApprovalProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/productionApprovalReadiness.test.ts',
      'tests/unit/postDeployLiveProofReadiness.test.ts',
    ]));
    expect(postDeployProductionApprovalProofHandleDecision.proof_boundary).toMatch(/does not grant owner approval|run deploys|push|rebuild|mutate Netlify|access live accounts|run browser smoke|prove hosted\/live parity|raise launch status/i);
    const postDeployProductionApprovalProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-POST-DEPLOY-PRODUCTION-APPROVAL-PROOF-HANDLES',
    );
    expect(postDeployProductionApprovalProofHandleReview).toBeTruthy();
    expect(postDeployProductionApprovalProofHandleReview.policy).toBe('strict');
    expect(postDeployProductionApprovalProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:post-deploy-live-proof-report -- --skip-probes',
      'pnpm run check:production-approval-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const completionAuditProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    );
    expect(completionAuditProofHandleDecision).toBeTruthy();
    expect(completionAuditProofHandleDecision.chosen_variant).toBe('minimal focused completion audit proof-handle derivation');
    expect(completionAuditProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(completionAuditProofHandleDecision.proof_boundary).toMatch(/does not contact buyers|authorize Supabase|checkout branches|install tools|run release-readiness as clearance|request owner approval|deploy|run live proof|hosted\/live parity|raise launch status/i);
    const completionAuditProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-COMPLETION-AUDIT-PROOF-HANDLES',
    );
    expect(completionAuditProofHandleReview).toBeTruthy();
    expect(completionAuditProofHandleReview.policy).toBe('strict');
    expect(completionAuditProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:commercial-launch-readiness -- --skip-probes',
    ]));
    const launchActionFinalProofHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    );
    expect(launchActionFinalProofHandleDecision).toBeTruthy();
    expect(launchActionFinalProofHandleDecision.chosen_variant).toBe('minimal focused final launch-action proof-handle derivation');
    expect(launchActionFinalProofHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchActionFinalProofHandleDecision.proof_boundary).toMatch(/does not request owner approval|grant approval|run deploy-production\.sh|run netlify deploy|push|mutate branches|clear source provenance|run post-deploy live proof|run browser smoke|hosted\/live parity|raise launch status/i);
    const launchActionFinalProofHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-FINAL-PROOF-HANDLES',
    );
    expect(launchActionFinalProofHandleReview).toBeTruthy();
    expect(launchActionFinalProofHandleReview.policy).toBe('strict');
    expect(launchActionFinalProofHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:launch-action-readiness -- --skip-probes',
      'pnpm run check:launch-action-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const fixReportFocusedChecksDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    );
    expect(fixReportFocusedChecksDecision).toBeTruthy();
    expect(fixReportFocusedChecksDecision.chosen_variant).toBe('minimal focused fix-report check-list alignment');
    expect(fixReportFocusedChecksDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(fixReportFocusedChecksDecision.proof_boundary).toMatch(/does not run focused reports as clearance|contact buyers|authorize Supabase|mutate branches|resolve source provenance|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const fixReportFocusedChecksReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-FIX-REPORT-FOCUSED-CHECKS',
    );
    expect(fixReportFocusedChecksReview).toBeTruthy();
    expect(fixReportFocusedChecksReview.policy).toBe('strict');
    expect(fixReportFocusedChecksReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm run report:commercial-launch-readiness -- --skip-probes',
    ]));
    const publicFixReportCommandDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    );
    expect(publicFixReportCommandDecision).toBeTruthy();
    expect(publicFixReportCommandDecision.chosen_variant).toBe('minimal public Fix Report command-handle alignment');
    expect(publicFixReportCommandDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/generate-public-release-status.mjs',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'tests/unit/statusPagePosture.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(publicFixReportCommandDecision.proof_boundary).toMatch(/does not run missing checks as clearance|contact buyers|authorize Supabase|mutate branches|resolve source provenance|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const publicFixReportCommandReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PUBLIC-FIX-REPORT-COMMAND-HANDLES',
    );
    expect(publicFixReportCommandReview).toBeTruthy();
    expect(publicFixReportCommandReview.policy).toBe('strict');
    expect(publicFixReportCommandReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run generate:public-release-status',
      'pnpm run check:public-release-status',
      'pnpm run check:commercial-source',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const progressDigestReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    );
    expect(progressDigestReportDecision).toBeTruthy();
    expect(progressDigestReportDecision.chosen_variant).toBe('minimal focused progress and bottleneck digest wrapper');
    expect(progressDigestReportDecision.files_changed).toEqual(expect.arrayContaining([
      'package.json',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/generate-public-release-status.mjs',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'scripts/check-commercial-source-docs.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressDigestReportDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|run missing checks as clearance|contact buyers|approve branches|authorize Supabase|resolve evidence gaps|request owner approval|deploy|hosted\/live parity|raise launch status/i);
    const progressDigestReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-FOCUSED-REPORT',
    );
    expect(progressDigestReportReview).toBeTruthy();
    expect(progressDigestReportReview.policy).toBe('strict');
    expect(progressDigestReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:public-release-status',
      'pnpm run check:commercial-source',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const progressDigestUnitContractDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-UNIT-CONTRACT',
    );
    expect(progressDigestUnitContractDecision).toBeTruthy();
    expect(progressDigestUnitContractDecision.chosen_variant).toBe('minimal focused progress digest unit contract');
    expect(progressDigestUnitContractDecision.files_changed).toEqual(expect.arrayContaining([
      'tests/unit/progressDigestReadiness.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressDigestUnitContractDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|run missing checks as clearance|contact buyers|create accepted evidence|approve branches|authorize Supabase|resolve evidence gaps|request owner approval|deploy|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const progressDigestUnitContractReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-UNIT-CONTRACT',
    );
    expect(progressDigestUnitContractReview).toBeTruthy();
    expect(progressDigestUnitContractReview.policy).toBe('strict');
    expect(progressDigestUnitContractReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run report:progress-digest-readiness -- --skip-probes --json',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const localProofPackBrowserSmokeDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LOCAL-PROOF-PACK-BROWSER-SMOKE',
    );
    expect(localProofPackBrowserSmokeDecision).toBeTruthy();
    expect(localProofPackBrowserSmokeDecision.chosen_variant).toBe('minimal local Playwright webServer override and proof-pack smoke handle');
    expect(localProofPackBrowserSmokeDecision.files_changed).toEqual(expect.arrayContaining([
      'package.json',
      'playwright.config.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
    ]));
    expect(localProofPackBrowserSmokeDecision.proof_boundary).toMatch(/does not install Corepack|satisfy Corepack-pinned release-readiness|clear source provenance|select canonical branches|authorize Supabase|contact buyers|create accepted buyer evidence|request owner approval|deploy|mutate Netlify|run hosted proof-pack smoke|prove post-deploy live parity|mark the launch goal complete|raise launch status/i);
    const localProofPackBrowserSmokeReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LOCAL-PROOF-PACK-BROWSER-SMOKE',
    );
    expect(localProofPackBrowserSmokeReview).toBeTruthy();
    expect(localProofPackBrowserSmokeReview.policy).toBe('strict');
    expect(localProofPackBrowserSmokeReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/progressDigestReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run test:browser:local:proof-packs',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const localProofPackSmokePublicHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LOCAL-PROOF-PACK-SMOKE-PUBLIC-HANDLE',
    );
    expect(localProofPackSmokePublicHandleDecision).toBeTruthy();
    expect(localProofPackSmokePublicHandleDecision.chosen_variant).toBe('minimal public local proof-pack smoke handle');
    expect(localProofPackSmokePublicHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'src/lib/publicReleaseStatusManifest.json',
      'src/lib/releasePosture.ts',
      'public/status/release-health.json',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'scripts/generate-public-release-status.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
    ]));
    expect(localProofPackSmokePublicHandleDecision.proof_boundary).toMatch(/does not satisfy Corepack-pinned release-readiness|run hosted proof-pack smoke|deploy|mutate Netlify|prove post-deploy live parity|clear source provenance|select canonical branches|authorize Supabase|contact buyers|create accepted buyer evidence|grant production approval|mark the launch goal complete|raise launch status/i);
    const localProofPackSmokePublicHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LOCAL-PROOF-PACK-SMOKE-PUBLIC-HANDLE',
    );
    expect(localProofPackSmokePublicHandleReview).toBeTruthy();
    expect(localProofPackSmokePublicHandleReview.policy).toBe('strict');
    expect(localProofPackSmokePublicHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run generate:public-release-status',
      'pnpm run check:public-release-status',
      'pnpm run check:commercial-source',
      'pnpm exec vitest run tests/unit/statusPagePosture.test.ts tests/unit/launchEvidenceManifest.test.ts tests/unit/progressDigestReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run test:browser:local:proof-packs',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const focusedLaunchReadinessReportSuiteDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-REPORT-SUITE',
    );
    expect(focusedLaunchReadinessReportSuiteDecision).toBeTruthy();
    expect(focusedLaunchReadinessReportSuiteDecision.chosen_variant).toBe('minimal aggregate focused-report contract checker');
    expect(focusedLaunchReadinessReportSuiteDecision.acceptance_check).toMatch(/check:focused-launch-readiness-reports|launch action|adversarial review|--skip-probes/i);
    expect(focusedLaunchReadinessReportSuiteDecision.files_changed).toEqual(expect.arrayContaining([
      'package.json',
      'scripts/check-focused-launch-readiness-reports.mjs',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'tests/unit/focusedLaunchReadinessReports.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
    ]));
    expect(focusedLaunchReadinessReportSuiteDecision.proof_boundary).toMatch(/does not clear source provenance|run release-readiness|choose canonical branch heads|authorize Supabase|contact buyers|request or grant owner approval|push|deploy|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const focusedLaunchReadinessReportSuiteReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-REPORT-SUITE',
    );
    expect(focusedLaunchReadinessReportSuiteReview).toBeTruthy();
    expect(focusedLaunchReadinessReportSuiteReview.policy).toBe('strict');
    expect(focusedLaunchReadinessReportSuiteReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/check-focused-launch-readiness-reports.mjs',
      'pnpm exec vitest run tests/unit/focusedLaunchReadinessReports.test.ts tests/unit/launchEvidenceManifest.test.ts tests/unit/progressDigestReadiness.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:commercial-source',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const focusedLaunchReadinessSuiteHandoffDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-SUITE-HANDOFF-SURFACES',
    );
    expect(focusedLaunchReadinessSuiteHandoffDecision).toBeTruthy();
    expect(focusedLaunchReadinessSuiteHandoffDecision.chosen_variant).toBe('minimal manifest handoff-surface alignment');
    expect(focusedLaunchReadinessSuiteHandoffDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
    ]));
    expect(focusedLaunchReadinessSuiteHandoffDecision.proof_boundary).toMatch(/handoff discoverability only|does not run focused reports as clearance|clear source provenance|run release-readiness|choose canonical branch heads|authorize Supabase|contact buyers|request or grant owner approval|push|deploy|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const focusedLaunchReadinessSuiteHandoffReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-SUITE-HANDOFF-SURFACES',
    );
    expect(focusedLaunchReadinessSuiteHandoffReview).toBeTruthy();
    expect(focusedLaunchReadinessSuiteHandoffReview.policy).toBe('strict');
    expect(focusedLaunchReadinessSuiteHandoffReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-launch-evidence-manifest.mjs',
      'node --check scripts/check-launch-evidence-manifest.mjs',
      'node --check scripts/check-progress-digest-readiness-report.mjs',
      'node --check scripts/check-commercial-launch-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const sourceProvenancePublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PUBLIC-HANDLE-DIGEST',
    );
    expect(sourceProvenancePublicHandleDigestDecision).toBeTruthy();
    expect(sourceProvenancePublicHandleDigestDecision.chosen_variant).toBe('minimal focused source handle digest');
    expect(sourceProvenancePublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/check-source-provenance-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/sourceProvenanceReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(sourceProvenancePublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not commit|unstage|stash|revert|delete|rename|move|choose owner intent|clear source provenance|run release-readiness|push|deploy|request production approval|grant owner approval|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const sourceProvenancePublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-PROVENANCE-PUBLIC-HANDLE-DIGEST',
    );
    expect(sourceProvenancePublicHandleDigestReview).toBeTruthy();
    expect(sourceProvenancePublicHandleDigestReview.policy).toBe('strict');
    expect(sourceProvenancePublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-source-provenance-readiness.mjs',
      'node --check scripts/check-source-provenance-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/sourceProvenanceReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:source-provenance-readiness -- --skip-probes --json',
      'pnpm run check:source-provenance-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const releasePreflightPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-HANDLE-DIGEST',
    );
    expect(releasePreflightPublicHandleDigestDecision).toBeTruthy();
    expect(releasePreflightPublicHandleDigestDecision.chosen_variant).toBe('minimal focused release handle digest');
    expect(releasePreflightPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releasePreflightPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not install Corepack|enable Corepack|install Git LFS|run release-readiness|clear source provenance|push|deploy|request production approval|grant owner approval|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const releasePreflightPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-HANDLE-DIGEST',
    );
    expect(releasePreflightPublicHandleDigestReview).toBeTruthy();
    expect(releasePreflightPublicHandleDigestReview.policy).toBe('strict');
    expect(releasePreflightPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-release-preflight-readiness.mjs',
      'node --check scripts/check-release-preflight-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/releasePreflightReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:release-preflight -- --skip-probes --json',
      'pnpm run check:release-preflight-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const branchReviewPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-REVIEW-PUBLIC-HANDLE-DIGEST',
    );
    expect(branchReviewPublicHandleDigestDecision).toBeTruthy();
    expect(branchReviewPublicHandleDigestDecision.chosen_variant).toBe('minimal focused branch handle digest');
    expect(branchReviewPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-branch-review-readiness.mjs',
      'scripts/check-branch-review-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(branchReviewPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|request production approval|grant owner approval|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const branchReviewPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-REVIEW-PUBLIC-HANDLE-DIGEST',
    );
    expect(branchReviewPublicHandleDigestReview).toBeTruthy();
    expect(branchReviewPublicHandleDigestReview.policy).toBe('strict');
    expect(branchReviewPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-branch-review-readiness.mjs',
      'node --check scripts/check-branch-review-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/branchReviewReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:branch-review-readiness -- --skip-probes --json',
      'pnpm run check:branch-review-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const supabaseAdvisorPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST',
    );
    expect(supabaseAdvisorPublicHandleDigestDecision).toBeTruthy();
    expect(supabaseAdvisorPublicHandleDigestDecision.chosen_variant).toBe('minimal focused Supabase advisor handle digest');
    expect(supabaseAdvisorPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-supabase-advisor-readiness.mjs',
      'scripts/check-supabase-advisor-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/supabaseAdvisorReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(supabaseAdvisorPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not authorize connectors|access dashboards|rerun Security Advisor or Performance Advisor|mutate the database|run migrations|record secrets|clear advisor findings|request production approval|grant owner approval|deploy|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const supabaseAdvisorPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-PUBLIC-HANDLE-DIGEST',
    );
    expect(supabaseAdvisorPublicHandleDigestReview).toBeTruthy();
    expect(supabaseAdvisorPublicHandleDigestReview.policy).toBe('strict');
    expect(supabaseAdvisorPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-supabase-advisor-readiness.mjs',
      'node --check scripts/check-supabase-advisor-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/supabaseAdvisorReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:supabase-advisor-readiness -- --skip-probes --json',
      'pnpm run check:supabase-advisor-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const buyerEvidencePublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-HANDLE-DIGEST',
    );
    expect(buyerEvidencePublicHandleDigestDecision).toBeTruthy();
    expect(buyerEvidencePublicHandleDigestDecision.chosen_variant).toBe('minimal focused buyer evidence handle digest');
    expect(buyerEvidencePublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-buyer-evidence-gate-readiness.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/buyerEvidenceGateReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(buyerEvidencePublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not contact buyers|send outreach|create accepted evidence|move confidence|attach retained artifacts|validate 95%|create buyer proof|claim buyer acceptance|request production approval|grant owner approval|deploy|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const buyerEvidencePublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-PUBLIC-HANDLE-DIGEST',
    );
    expect(buyerEvidencePublicHandleDigestReview).toBeTruthy();
    expect(buyerEvidencePublicHandleDigestReview.policy).toBe('strict');
    expect(buyerEvidencePublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-buyer-evidence-gate-readiness.mjs',
      'node --check scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/buyerEvidenceGateReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes --json',
      'pnpm run check:buyer-evidence-gate-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const productionApprovalPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PUBLIC-HANDLE-DIGEST',
    );
    expect(productionApprovalPublicHandleDigestDecision).toBeTruthy();
    expect(productionApprovalPublicHandleDigestDecision.chosen_variant).toBe('minimal focused production approval handle digest');
    expect(productionApprovalPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-production-approval-readiness.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/productionApprovalReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(productionApprovalPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not request owner approval|grant owner approval|run deploy-production|run Netlify deploy|push|merge|mutate branches|contact buyers|access Supabase|clear source provenance|run release-readiness|run check:production-deploy-request as clearance|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const productionApprovalPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-PUBLIC-HANDLE-DIGEST',
    );
    expect(productionApprovalPublicHandleDigestReview).toBeTruthy();
    expect(productionApprovalPublicHandleDigestReview.policy).toBe('strict');
    expect(productionApprovalPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-production-approval-readiness.mjs',
      'node --check scripts/check-production-approval-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/productionApprovalReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:production-approval-readiness -- --skip-probes --json',
      'pnpm run check:production-approval-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const postDeployLiveProofPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-PUBLIC-HANDLE-DIGEST',
    );
    expect(postDeployLiveProofPublicHandleDigestDecision).toBeTruthy();
    expect(postDeployLiveProofPublicHandleDigestDecision.chosen_variant).toBe('minimal focused post-deploy live-proof handle digest');
    expect(postDeployLiveProofPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-post-deploy-live-proof-readiness.mjs',
      'scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/postDeployLiveProofReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(postDeployLiveProofPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not request owner approval|grant owner approval|run deploy-production|run Netlify deploy|push|rebuild|mutate Netlify|access live accounts|run live metadata checks as clearance|run live static parity as clearance|run hosted browser smoke|prove current-source hosted parity|mark the launch goal complete|raise launch status/i);
    const postDeployLiveProofPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-PUBLIC-HANDLE-DIGEST',
    );
    expect(postDeployLiveProofPublicHandleDigestReview).toBeTruthy();
    expect(postDeployLiveProofPublicHandleDigestReview.policy).toBe('strict');
    expect(postDeployLiveProofPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-post-deploy-live-proof-readiness.mjs',
      'node --check scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/postDeployLiveProofReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:post-deploy-live-proof-readiness -- --skip-probes --json',
      'pnpm run check:post-deploy-live-proof-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const launchActionPublicHandleDigestDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-PUBLIC-HANDLE-DIGEST',
    );
    expect(launchActionPublicHandleDigestDecision).toBeTruthy();
    expect(launchActionPublicHandleDigestDecision.chosen_variant).toBe('minimal focused launch-action handle digest');
    expect(launchActionPublicHandleDigestDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-action-readiness.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchActionPublicHandleDigestDecision.proof_boundary).toMatch(/handle discoverability only|does not execute launch actions|commit|unstage|stash|revert|clear source provenance|run release-readiness|checkout branches|merge|push|select canonical heads|contact buyers|authorize Supabase|request owner approval|grant owner approval|deploy|mutate live services|browser smoke|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const launchActionPublicHandleDigestReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-PUBLIC-HANDLE-DIGEST',
    );
    expect(launchActionPublicHandleDigestReview).toBeTruthy();
    expect(launchActionPublicHandleDigestReview.policy).toBe('strict');
    expect(launchActionPublicHandleDigestReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-launch-action-readiness.mjs',
      'node --check scripts/check-launch-action-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/launchActionReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:launch-action-readiness -- --skip-probes --json',
      'pnpm run check:launch-action-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const launchEvidenceValidationLineageDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-PUBLIC-HANDLE-LINEAGE',
    );
    expect(launchEvidenceValidationLineageDecision).toBeTruthy();
    expect(launchEvidenceValidationLineageDecision.chosen_variant).toBe('minimal focused validation public-handle lineage');
    expect(launchEvidenceValidationLineageDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-validation-readiness.mjs',
      'scripts/check-launch-evidence-validation-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/launchEvidenceValidationReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchEvidenceValidationLineageDecision.proof_boundary).toMatch(/lineage discoverability only|does not self-certify|clear source provenance|run release-readiness|request owner approval|contact buyers|authorize Supabase|deploy|mutate live services|buyer acceptance|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const launchEvidenceValidationLineageReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-EVIDENCE-VALIDATION-PUBLIC-HANDLE-LINEAGE',
    );
    expect(launchEvidenceValidationLineageReview).toBeTruthy();
    expect(launchEvidenceValidationLineageReview.policy).toBe('strict');
    expect(launchEvidenceValidationLineageReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-launch-evidence-validation-readiness.mjs',
      'node --check scripts/check-launch-evidence-validation-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/launchEvidenceValidationReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:launch-evidence-validation-readiness -- --skip-probes --json',
      'pnpm run check:launch-evidence-validation-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const objectiveCompletionAuditLineageDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-PUBLIC-HANDLE-LINEAGE',
    );
    expect(objectiveCompletionAuditLineageDecision).toBeTruthy();
    expect(objectiveCompletionAuditLineageDecision.chosen_variant).toBe('minimal focused objective completion public-handle lineage');
    expect(objectiveCompletionAuditLineageDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-objective-completion-audit-readiness.mjs',
      'scripts/check-objective-completion-audit-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/objectiveCompletionAuditReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(objectiveCompletionAuditLineageDecision.proof_boundary).toMatch(/lineage discoverability only|does not mark the launch goal complete|clear P0\/P1 blockers|collect buyer evidence|contact buyers|authorize Supabase|approve branches|resolve source provenance|run release-readiness as clearance|request owner approval|deploy|mutate live services|buyer acceptance|hosted\/live parity|raise launch status/i);
    const objectiveCompletionAuditLineageReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-PUBLIC-HANDLE-LINEAGE',
    );
    expect(objectiveCompletionAuditLineageReview).toBeTruthy();
    expect(objectiveCompletionAuditLineageReview.policy).toBe('strict');
    expect(objectiveCompletionAuditLineageReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-objective-completion-audit-readiness.mjs',
      'node --check scripts/check-objective-completion-audit-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/objectiveCompletionAuditReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:objective-completion-audit-readiness -- --skip-probes --json',
      'pnpm run check:objective-completion-audit-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const adversarialReviewLineageDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-PUBLIC-HANDLE-LINEAGE',
    );
    expect(adversarialReviewLineageDecision).toBeTruthy();
    expect(adversarialReviewLineageDecision.chosen_variant).toBe('minimal focused adversarial review public-handle lineage');
    expect(adversarialReviewLineageDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-adversarial-review-readiness.mjs',
      'scripts/check-adversarial-review-readiness-report.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'tests/unit/adversarialReviewReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(adversarialReviewLineageDecision.proof_boundary).toMatch(/lineage discoverability only|does not generate new review findings|clear launch blockers|create buyer evidence|contact buyers|buyer acceptance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|run release-readiness as clearance|request owner approval|deploy|mutate live services|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const adversarialReviewLineageReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-PUBLIC-HANDLE-LINEAGE',
    );
    expect(adversarialReviewLineageReview).toBeTruthy();
    expect(adversarialReviewLineageReview.policy).toBe('strict');
    expect(adversarialReviewLineageReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-adversarial-review-readiness.mjs',
      'node --check scripts/check-adversarial-review-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/adversarialReviewReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:adversarial-review-readiness -- --skip-probes --json',
      'pnpm run check:adversarial-review-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const progressDigestLineageDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-PUBLIC-HANDLE-LINEAGE',
    );
    expect(progressDigestLineageDecision).toBeTruthy();
    expect(progressDigestLineageDecision.chosen_variant).toBe('minimal focused progress digest public-handle lineage');
    expect(progressDigestLineageDecision.files_changed).toEqual(expect.arrayContaining([
      '.dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation/backlog.jsonl',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressDigestLineageDecision.proof_boundary).toMatch(/lineage discoverability only|does not complete pending work|clear launch blockers|run missing checks as clearance|collect buyer evidence|contact buyers|buyer acceptance|authorize Supabase|approve branches|resolve source provenance|run release-readiness as clearance|request owner approval|deploy|mutate live services|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const progressDigestLineageReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-PUBLIC-HANDLE-LINEAGE',
    );
    expect(progressDigestLineageReview).toBeTruthy();
    expect(progressDigestLineageReview.policy).toBe('strict');
    expect(progressDigestLineageReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/report-progress-digest-readiness.mjs',
      'node --check scripts/check-progress-digest-readiness-report.mjs',
      'node /Users/sanjayb/.codex/plugins/cache/local-codex-marketplace/everything-claude-code/1.9.0/skills/dynamic-workflow-backlog/scripts/dynamic-workflow-backlog.js status --run .dynamic-workflows/ceip-launch-readiness-proof-lineage-continuation',
      'pnpm exec vitest run tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:progress-digest-readiness -- --skip-probes --json',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
      'pnpm exec tsc -b --pretty false',
    ]));
    const unmergedBranchPackageHandlesDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-UNMERGED-BRANCH-PACKAGE-HANDLES',
    );
    expect(unmergedBranchPackageHandlesDecision).toBeTruthy();
    expect(unmergedBranchPackageHandlesDecision.chosen_variant).toBe('minimal unmerged branch package-handle digest');
    expect(unmergedBranchPackageHandlesDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-unmerged-branch-readiness.mjs',
      'scripts/check-unmerged-branch-readiness-report.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/unmergedBranchReadiness.test.ts',
      'tests/unit/progressDigestReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(unmergedBranchPackageHandlesDecision.proof_boundary).toMatch(/package-handle discoverability only|does not checkout branches|merge branches|push branches|discard refs|select canonical heads|clear branch review|clear source provenance|run release-readiness as clearance|collect buyer evidence|contact buyers|authorize Supabase|request owner approval|deploy|mutate live services|hosted\/live parity|mark the launch goal complete|raise launch status/i);
    const unmergedBranchPackageHandlesReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-UNMERGED-BRANCH-PACKAGE-HANDLES',
    );
    expect(unmergedBranchPackageHandlesReview).toBeTruthy();
    expect(unmergedBranchPackageHandlesReview.policy).toBe('strict');
	    expect(unmergedBranchPackageHandlesReview.tests_or_checks).toEqual(expect.arrayContaining([
	      'node --check scripts/report-unmerged-branch-readiness.mjs',
      'node --check scripts/check-unmerged-branch-readiness-report.mjs',
      'pnpm exec vitest run tests/unit/unmergedBranchReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:unmerged-branch-readiness -- --focus-risk high',
      'pnpm run check:unmerged-branch-readiness-report',
      'pnpm run check:branch-review-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
	      'pnpm exec tsc -b --pretty false',
	    ]));
	    const buyerEvidenceReadinessReportContractDecision = manifest.implementation_decisions.find(
	      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-READINESS-REPORT-CONTRACT',
	    );
	    expect(buyerEvidenceReadinessReportContractDecision).toBeTruthy();
	    expect(buyerEvidenceReadinessReportContractDecision.chosen_variant).toBe('minimal buyer evidence readiness report/check contract');
	    expect(buyerEvidenceReadinessReportContractDecision.files_changed).toEqual(expect.arrayContaining([
	      'package.json',
	      'scripts/report-buyer-evidence-readiness.mjs',
	      'scripts/check-buyer-evidence-readiness-report.mjs',
	      'scripts/report-buyer-evidence-gate-readiness.mjs',
	      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
	      'scripts/report-launch-evidence-manifest.mjs',
	      'scripts/check-launch-evidence-manifest.mjs',
	      'scripts/check-progress-digest-readiness-report.mjs',
	      'scripts/check-commercial-launch-readiness-report.mjs',
	      'tests/unit/buyerEvidenceReadiness.test.ts',
	      'tests/unit/buyerEvidenceGateReadiness.test.ts',
	      'tests/unit/progressDigestReadiness.test.ts',
	      'tests/unit/launchEvidenceManifest.test.ts',
	    ]));
	    expect(buyerEvidenceReadinessReportContractDecision.proof_boundary).toMatch(/readiness report\/check discoverability only|does not contact buyers|send outreach|create accepted evidence|create buyer proof|move confidence|attach retained artifacts|validate 95%|clear the buyer hard gate|request production approval|deploy|mutate live services|hosted\/live parity|mark the launch goal complete|raise launch status/i);
	    const buyerEvidenceReadinessReportContractReview = manifest.code_optimization_reviews.find(
	      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-READINESS-REPORT-CONTRACT',
	    );
	    expect(buyerEvidenceReadinessReportContractReview).toBeTruthy();
	    expect(buyerEvidenceReadinessReportContractReview.policy).toBe('strict');
	    expect(buyerEvidenceReadinessReportContractReview.tests_or_checks).toEqual(expect.arrayContaining([
	      'node --check scripts/report-buyer-evidence-readiness.mjs',
	      'node --check scripts/check-buyer-evidence-readiness-report.mjs',
	      'pnpm exec vitest run tests/unit/buyerEvidenceReadiness.test.ts tests/unit/buyerEvidenceGateReadiness.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
	      'pnpm run report:buyer-evidence-readiness',
	      'pnpm run check:buyer-evidence-readiness-report',
	      'pnpm run check:buyer-evidence-gate-report -- --skip-probes',
	      'pnpm run check:progress-digest-report -- --skip-probes',
	      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
	      'pnpm run check:launch-evidence-manifest -- --skip-probes',
	      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
	      'pnpm exec tsc -b --pretty false',
	    ]));
	    const focusedSuitePackageHandlesDecision = manifest.implementation_decisions.find(
	      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-SUITE-PACKAGE-HANDLES',
	    );
	    expect(focusedSuitePackageHandlesDecision).toBeTruthy();
	    expect(focusedSuitePackageHandlesDecision.chosen_variant).toBe('minimal aggregate suite package-handle digest');
	    expect(focusedSuitePackageHandlesDecision.files_changed).toEqual(expect.arrayContaining([
	      'scripts/check-focused-launch-readiness-reports.mjs',
	      'scripts/report-launch-evidence-manifest.mjs',
	      'scripts/check-launch-evidence-manifest.mjs',
	      'scripts/check-progress-digest-readiness-report.mjs',
	      'scripts/check-commercial-launch-readiness-report.mjs',
	      'tests/unit/focusedLaunchReadinessReports.test.ts',
	      'tests/unit/progressDigestReadiness.test.ts',
	      'tests/unit/launchEvidenceManifest.test.ts',
	    ]));
	    expect(focusedSuitePackageHandlesDecision.proof_boundary).toMatch(/package-handle discoverability only|does not run focused reports as clearance|clear source provenance|run release-readiness|choose canonical branch heads|authorize Supabase|contact buyers|create buyer proof|request or grant owner approval|push|deploy|mutate live services|hosted\/live parity|mark the launch goal complete|raise launch status/i);
	    const focusedSuitePackageHandlesReview = manifest.code_optimization_reviews.find(
	      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-FOCUSED-LAUNCH-READINESS-SUITE-PACKAGE-HANDLES',
	    );
	    expect(focusedSuitePackageHandlesReview).toBeTruthy();
	    expect(focusedSuitePackageHandlesReview.policy).toBe('strict');
	    expect(focusedSuitePackageHandlesReview.tests_or_checks).toEqual(expect.arrayContaining([
	      'node --check scripts/check-focused-launch-readiness-reports.mjs',
	      'pnpm exec vitest run tests/unit/focusedLaunchReadinessReports.test.ts tests/unit/progressDigestReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=300000 --no-file-parallelism --maxWorkers=1',
	      'pnpm run check:focused-launch-readiness-reports -- --skip-probes',
	      'pnpm run check:focused-launch-readiness-reports -- --skip-probes --json',
	      'pnpm run check:progress-digest-report -- --skip-probes',
	      'pnpm run check:launch-evidence-manifest -- --skip-probes',
	      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
	      'pnpm exec tsc -b --pretty false',
	    ]));
	    const objectiveCompletionAuditFocusedReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    );
    expect(objectiveCompletionAuditFocusedReportDecision).toBeTruthy();
    expect(objectiveCompletionAuditFocusedReportDecision.chosen_variant).toBe('minimal focused objective completion audit wrapper');
    expect(objectiveCompletionAuditFocusedReportDecision.files_changed).toEqual(expect.arrayContaining([
      'package.json',
      'scripts/report-objective-completion-audit-readiness.mjs',
      'scripts/check-objective-completion-audit-readiness-report.mjs',
      'scripts/generate-public-release-status.mjs',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'scripts/check-commercial-source-docs.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(objectiveCompletionAuditFocusedReportDecision.proof_boundary).toMatch(/does not mark the launch goal complete|clear P0\/P1 blockers|collect buyer evidence|contact buyers|approve branches|authorize Supabase|resolve source provenance|request owner approval|deploy|hosted\/live parity|production approval|buyer acceptance|raise launch status/i);
    const objectiveCompletionAuditFocusedReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-FOCUSED-REPORT',
    );
    expect(objectiveCompletionAuditFocusedReportReview).toBeTruthy();
    expect(objectiveCompletionAuditFocusedReportReview.policy).toBe('strict');
    expect(objectiveCompletionAuditFocusedReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:objective-completion-audit-readiness -- --skip-probes',
      'pnpm run check:objective-completion-audit-report -- --skip-probes',
      'pnpm run check:public-release-status',
      'pnpm run check:commercial-source',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const adversarialReviewFocusedReportDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    );
    expect(adversarialReviewFocusedReportDecision).toBeTruthy();
    expect(adversarialReviewFocusedReportDecision.chosen_variant).toBe('minimal focused adversarial review wrapper');
    expect(adversarialReviewFocusedReportDecision.files_changed).toEqual(expect.arrayContaining([
      'package.json',
      'scripts/report-adversarial-review-readiness.mjs',
      'scripts/check-adversarial-review-readiness-report.mjs',
      'scripts/generate-public-release-status.mjs',
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'docs/COMMERCIAL_SOURCE_OF_TRUTH.md',
      'scripts/check-commercial-source-docs.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(adversarialReviewFocusedReportDecision.proof_boundary).toMatch(/does not prove production approval|create buyer evidence|contact buyers|prove buyer acceptance|run release-readiness as clearance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|clear launch blockers|raise launch status/i);
    const adversarialReviewFocusedReportReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-FOCUSED-REPORT',
    );
    expect(adversarialReviewFocusedReportReview).toBeTruthy();
    expect(adversarialReviewFocusedReportReview.policy).toBe('strict');
    expect(adversarialReviewFocusedReportReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:adversarial-review-readiness -- --skip-probes',
      'pnpm run check:adversarial-review-report -- --skip-probes',
      'pnpm run check:public-release-status',
      'pnpm run check:commercial-source',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const launchManifestJsonAliasDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-JSON-ALIAS',
    );
    expect(launchManifestJsonAliasDecision).toBeTruthy();
    expect(launchManifestJsonAliasDecision.chosen_variant).toBe('minimal parser-only JSON alias');
    expect(launchManifestJsonAliasDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchManifestJsonAliasDecision.proof_boundary).toMatch(/does not run missing checks as clearance|contact buyers|create accepted evidence|authorize Supabase|mutate branches|resolve source provenance|install tools|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const launchManifestJsonAliasReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-MANIFEST-JSON-ALIAS',
    );
    expect(launchManifestJsonAliasReview).toBeTruthy();
    expect(launchManifestJsonAliasReview.policy).toBe('strict');
    expect(launchManifestJsonAliasReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:launch-evidence-manifest -- --skip-probes --json',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const releasePreflightPublicCheckHandleDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    );
    expect(releasePreflightPublicCheckHandleDecision).toBeTruthy();
    expect(releasePreflightPublicCheckHandleDecision.chosen_variant).toBe('minimal public release-preflight checker alignment');
    expect(releasePreflightPublicCheckHandleDecision.files_changed).toEqual(expect.arrayContaining([
      'src/lib/releasePosture.ts',
      'src/lib/publicReleaseStatusManifest.json',
      'public/status/release-health.json',
      'scripts/generate-public-release-status.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/statusPagePosture.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releasePreflightPublicCheckHandleDecision.proof_boundary).toMatch(/does not install Corepack|run full release-readiness|clear source provenance|push|deploy|hosted\/live parity|production approval|raise launch status/i);
    const releasePreflightPublicCheckHandleReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-PREFLIGHT-PUBLIC-CHECK-HANDLES',
    );
    expect(releasePreflightPublicCheckHandleReview).toBeTruthy();
    expect(releasePreflightPublicCheckHandleReview.policy).toBe('strict');
    expect(releasePreflightPublicCheckHandleReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run generate:public-release-status',
      'pnpm run check:public-release-status',
      'pnpm run report:release-preflight -- --skip-probes',
      'pnpm run check:release-preflight-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const releaseToolchainPnpmDiagnosticDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    );
    expect(releaseToolchainPnpmDiagnosticDecision).toBeTruthy();
    expect(releaseToolchainPnpmDiagnosticDecision.chosen_variant).toBe('minimal non-clearance bare pnpm diagnostic');
    expect(releaseToolchainPnpmDiagnosticDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/report-commercial-launch-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releaseToolchainPnpmDiagnosticDecision.proof_boundary).toMatch(/does not install Corepack|treat bare pnpm as Corepack evidence|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|production approval|raise launch status/i);
    const releaseToolchainPnpmDiagnosticReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-PNPM-DIAGNOSTIC',
    );
    expect(releaseToolchainPnpmDiagnosticReview).toBeTruthy();
    expect(releaseToolchainPnpmDiagnosticReview.policy).toBe('strict');
    expect(releaseToolchainPnpmDiagnosticReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:release-preflight -- --json',
      'pnpm run check:release-preflight-report',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const releaseToolchainGitLfsHookDiagnosticDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    );
    expect(releaseToolchainGitLfsHookDiagnosticDecision).toBeTruthy();
    expect(releaseToolchainGitLfsHookDiagnosticDecision.chosen_variant).toBe('minimal Git LFS hook-path diagnostic');
    expect(releaseToolchainGitLfsHookDiagnosticDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releaseToolchainGitLfsHookDiagnosticDecision.proof_boundary).toMatch(/does not rewrite hooks|install Git LFS|future commit or push hook PATH|clear source provenance|push|deploy|hosted\/live parity|production approval|raise launch status/i);
    const releaseToolchainGitLfsHookDiagnosticReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-GIT-LFS-HOOK-DIAGNOSTIC',
    );
    expect(releaseToolchainGitLfsHookDiagnosticReview).toBeTruthy();
    expect(releaseToolchainGitLfsHookDiagnosticReview.policy).toBe('strict');
    expect(releaseToolchainGitLfsHookDiagnosticReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node scripts/report-launch-evidence-manifest.mjs',
      'pnpm run check:release-preflight-report',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    const releaseToolchainCorepackEnvDiagnosticDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    );
    expect(releaseToolchainCorepackEnvDiagnosticDecision).toBeTruthy();
    expect(releaseToolchainCorepackEnvDiagnosticDecision.chosen_variant).toBe('minimal Corepack candidate diagnostic');
    expect(releaseToolchainCorepackEnvDiagnosticDecision.acceptance_check).toMatch(/installed Corepack candidates outside PATH|PATH-only.*retry examples/i);
    expect(releaseToolchainCorepackEnvDiagnosticDecision.proof).toMatch(/Homebrew Node locations|executable Corepack candidates|pinned pnpm version/i);
    expect(releaseToolchainCorepackEnvDiagnosticDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/check-corepack-toolchain.mjs',
      'scripts/report-launch-evidence-manifest.mjs',
      'tests/unit/corepackToolchain.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releaseToolchainCorepackEnvDiagnosticDecision.proof_boundary).toMatch(/does not install Corepack|enable Corepack globally|create a shim|rewrite PATH|treat bare pnpm as Corepack evidence|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|production approval|raise launch status/i);
    expect(releaseToolchainCorepackEnvDiagnosticDecision.stop_gate).toMatch(/candidate Corepack paths|PATH-only.*retry examples/i);
    const releaseToolchainCorepackEnvDiagnosticReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-TOOLCHAIN-COREPACK-ENV-DIAGNOSTIC',
    );
    expect(releaseToolchainCorepackEnvDiagnosticReview).toBeTruthy();
    expect(releaseToolchainCorepackEnvDiagnosticReview.policy).toBe('strict');
    expect(releaseToolchainCorepackEnvDiagnosticReview.tests_or_checks).toEqual(expect.arrayContaining([
      'node --check scripts/check-corepack-toolchain.mjs',
      'pnpm exec vitest run tests/unit/corepackToolchain.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm exec vitest run tests/unit/launchEvidenceManifest.test.ts tests/unit/releasePreflightReadiness.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'node scripts/check-corepack-toolchain.mjs',
      'PATH="/opt/homebrew/Cellar/node@22/22.22.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH" pnpm run check:corepack-toolchain',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
    ]));
    expect(releaseToolchainCorepackEnvDiagnosticReview.evidence).toMatch(/installed Corepack candidate discovery|PATH-only retry examples|no shim creation/i);
    const progressDigestLatestRatchetDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-LATEST-RATCHET',
    );
    expect(progressDigestLatestRatchetDecision).toBeTruthy();
    expect(progressDigestLatestRatchetDecision.chosen_variant).toBe('minimal latest-progress manifest row derivation');
    expect(progressDigestLatestRatchetDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressDigestLatestRatchetDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|contact buyers|create accepted evidence|authorize Supabase|mutate branches|resolve source provenance|install tools|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const progressDigestLatestRatchetReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-DIGEST-LATEST-RATCHET',
    );
    expect(progressDigestLatestRatchetReview).toBeTruthy();
    expect(progressDigestLatestRatchetReview.policy).toBe('strict');
    expect(progressDigestLatestRatchetReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const progressTargetMatrixStructureDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-TARGET-MATRIX-STRUCTURE',
    );
    expect(progressTargetMatrixStructureDecision).toBeTruthy();
    expect(progressTargetMatrixStructureDecision.chosen_variant).toBe('minimal structured target-matrix manifest patch');
    expect(progressTargetMatrixStructureDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressTargetMatrixStructureDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|contact buyers|create accepted evidence|authorize Supabase|mutate branches|resolve source provenance|install tools|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const progressTargetMatrixStructureReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-TARGET-MATRIX-STRUCTURE',
    );
    expect(progressTargetMatrixStructureReview).toBeTruthy();
    expect(progressTargetMatrixStructureReview.policy).toBe('strict');
    expect(progressTargetMatrixStructureReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const progressActivitiesRemainingDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-ACTIVITIES-REMAINING',
    );
    expect(progressActivitiesRemainingDecision).toBeTruthy();
    expect(progressActivitiesRemainingDecision.chosen_variant).toBe('minimal focused activities-remaining digest derivation');
    expect(progressActivitiesRemainingDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressActivitiesRemainingDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|contact buyers|create accepted evidence|authorize Supabase|mutate branches|resolve source provenance|install tools|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const progressActivitiesRemainingReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-ACTIVITIES-REMAINING',
    );
    expect(progressActivitiesRemainingReview).toBeTruthy();
    expect(progressActivitiesRemainingReview.policy).toBe('strict');
    expect(progressActivitiesRemainingReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const progressBottleneckDetailDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PROGRESS-BOTTLENECK-DETAIL',
    );
    expect(progressBottleneckDetailDecision).toBeTruthy();
    expect(progressBottleneckDetailDecision.chosen_variant).toBe('minimal structured bottleneck detail patch');
    expect(progressBottleneckDetailDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-progress-digest-readiness.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(progressBottleneckDetailDecision.proof_boundary).toMatch(/does not complete pending work|clear blockers|contact buyers|create accepted evidence|authorize Supabase|mutate branches|resolve source provenance|install tools|request owner approval|deploy|post-deploy live proof|hosted\/live parity|raise launch status/i);
    const progressBottleneckDetailReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PROGRESS-BOTTLENECK-DETAIL',
    );
    expect(progressBottleneckDetailReview).toBeTruthy();
    expect(progressBottleneckDetailReview.policy).toBe('strict');
    expect(progressBottleneckDetailReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:progress-digest-readiness -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const buyerEvidenceMinimumPacketHandoffDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-MINIMUM-PACKET-HANDOFF',
    );
    expect(buyerEvidenceMinimumPacketHandoffDecision).toBeTruthy();
    expect(buyerEvidenceMinimumPacketHandoffDecision.chosen_variant).toBe('minimal derived buyer evidence packet handoff');
    expect(buyerEvidenceMinimumPacketHandoffDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-buyer-evidence-gate-readiness.mjs',
      'scripts/check-buyer-evidence-gate-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'tests/unit/buyerEvidenceGateReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(buyerEvidenceMinimumPacketHandoffDecision.proof_boundary).toMatch(/does not contact buyers|send outreach|create accepted evidence|attach retained artifacts|move confidence|validate 95%|production approval|hosted\/live parity|raise launch status/i);
    const buyerEvidenceMinimumPacketHandoffReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BUYER-EVIDENCE-MINIMUM-PACKET-HANDOFF',
    );
    expect(buyerEvidenceMinimumPacketHandoffReview).toBeTruthy();
    expect(buyerEvidenceMinimumPacketHandoffReview.policy).toBe('strict');
    expect(buyerEvidenceMinimumPacketHandoffReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:buyer-evidence-gate-readiness -- --skip-probes',
      'pnpm run check:buyer-evidence-gate-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const sourceOwnerDecisionPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SOURCE-OWNER-DECISION-PACKET',
    );
    expect(sourceOwnerDecisionPacketDecision).toBeTruthy();
    expect(sourceOwnerDecisionPacketDecision.chosen_variant).toBe('minimal derived source owner-decision packet');
    expect(sourceOwnerDecisionPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-source-provenance-readiness.mjs',
      'scripts/check-source-provenance-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/sourceProvenanceReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(sourceOwnerDecisionPacketDecision.proof_boundary).toMatch(/does not commit|clear source provenance|run release-readiness|request production approval|deploy|hosted\/live parity|grant owner approval|raise launch status/i);
    const sourceOwnerDecisionPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SOURCE-OWNER-DECISION-PACKET',
    );
    expect(sourceOwnerDecisionPacketReview).toBeTruthy();
    expect(sourceOwnerDecisionPacketReview.policy).toBe('strict');
    expect(sourceOwnerDecisionPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:source-provenance-readiness -- --skip-probes',
      'pnpm run check:source-provenance-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const releaseOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-RELEASE-OPERATOR-HANDOFF-PACKET',
    );
    expect(releaseOperatorHandoffPacketDecision).toBeTruthy();
    expect(releaseOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived release operator handoff packet');
    expect(releaseOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-release-preflight-readiness.mjs',
      'scripts/check-release-preflight-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/releasePreflightReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(releaseOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not install Corepack|install Git LFS|run release-readiness|clear source provenance|push|deploy|hosted\/live parity|grant owner approval|raise launch status/i);
    const releaseOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-RELEASE-OPERATOR-HANDOFF-PACKET',
    );
    expect(releaseOperatorHandoffPacketReview).toBeTruthy();
    expect(releaseOperatorHandoffPacketReview.policy).toBe('strict');
    expect(releaseOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:release-preflight -- --skip-probes',
      'pnpm run check:release-preflight-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const branchOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-BRANCH-OPERATOR-HANDOFF-PACKET',
    );
    expect(branchOperatorHandoffPacketDecision).toBeTruthy();
    expect(branchOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived branch operator handoff packet');
    expect(branchOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-branch-review-readiness.mjs',
      'scripts/check-branch-review-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/branchReviewReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(branchOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity|grant owner approval|raise launch status/i);
    const branchOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-BRANCH-OPERATOR-HANDOFF-PACKET',
    );
    expect(branchOperatorHandoffPacketReview).toBeTruthy();
    expect(branchOperatorHandoffPacketReview.policy).toBe('strict');
    expect(branchOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:branch-review-readiness -- --skip-probes',
      'pnpm run check:branch-review-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const supabaseAdvisorOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-OPERATOR-HANDOFF-PACKET',
    );
    expect(supabaseAdvisorOperatorHandoffPacketDecision).toBeTruthy();
    expect(supabaseAdvisorOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived Supabase advisor operator handoff packet');
    expect(supabaseAdvisorOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-supabase-advisor-readiness.mjs',
      'scripts/check-supabase-advisor-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/supabaseAdvisorReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(supabaseAdvisorOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not authorize connectors|access dashboards|rerun advisors|mutate database state|record secrets|grant owner approval|deploy|hosted\/live parity|raise launch status/i);
    const supabaseAdvisorOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-SUPABASE-ADVISOR-OPERATOR-HANDOFF-PACKET',
    );
    expect(supabaseAdvisorOperatorHandoffPacketReview).toBeTruthy();
    expect(supabaseAdvisorOperatorHandoffPacketReview.policy).toBe('strict');
    expect(supabaseAdvisorOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:supabase-advisor-readiness -- --skip-probes',
      'pnpm run check:supabase-advisor-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const postDeployLiveProofOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-OPERATOR-HANDOFF-PACKET',
    );
    expect(postDeployLiveProofOperatorHandoffPacketDecision).toBeTruthy();
    expect(postDeployLiveProofOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived post-deploy live-proof operator handoff packet');
    expect(postDeployLiveProofOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-post-deploy-live-proof-readiness.mjs',
      'scripts/check-post-deploy-live-proof-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/postDeployLiveProofReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(postDeployLiveProofOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not grant owner approval|run deploys|deploy-production\.sh|netlify deploy|push|rebuild|mutate Netlify|access live accounts|run browser smoke|request production approval|hosted\/live parity|raise launch status/i);
    const postDeployLiveProofOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-POST-DEPLOY-LIVE-PROOF-OPERATOR-HANDOFF-PACKET',
    );
    expect(postDeployLiveProofOperatorHandoffPacketReview).toBeTruthy();
    expect(postDeployLiveProofOperatorHandoffPacketReview.policy).toBe('strict');
    expect(postDeployLiveProofOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:post-deploy-live-proof-readiness -- --skip-probes',
      'pnpm run check:post-deploy-live-proof-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const productionApprovalOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-OPERATOR-HANDOFF-PACKET',
    );
    expect(productionApprovalOperatorHandoffPacketDecision).toBeTruthy();
    expect(productionApprovalOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived production approval operator handoff packet');
    expect(productionApprovalOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-production-approval-readiness.mjs',
      'scripts/check-production-approval-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/productionApprovalReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(productionApprovalOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not request owner approval|grant approval|run deploys|push|merge|mutate branches|contact buyers|access Supabase|clear source provenance|release-readiness as clearance|hosted\/live parity|raise launch status/i);
    const productionApprovalOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-PRODUCTION-APPROVAL-OPERATOR-HANDOFF-PACKET',
    );
    expect(productionApprovalOperatorHandoffPacketReview).toBeTruthy();
    expect(productionApprovalOperatorHandoffPacketReview.policy).toBe('strict');
    expect(productionApprovalOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:production-approval-readiness -- --skip-probes',
      'pnpm run check:production-approval-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const launchActionOperatorHandoffPacketDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-LAUNCH-ACTION-OPERATOR-HANDOFF-PACKET',
    );
    expect(launchActionOperatorHandoffPacketDecision).toBeTruthy();
    expect(launchActionOperatorHandoffPacketDecision.chosen_variant).toBe('minimal derived launch action operator handoff packet');
    expect(launchActionOperatorHandoffPacketDecision.files_changed).toEqual(expect.arrayContaining([
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/report-launch-action-readiness.mjs',
      'scripts/check-launch-action-readiness-report.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchActionReadiness.test.ts',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(launchActionOperatorHandoffPacketDecision.proof_boundary).toMatch(/does not execute launch actions|commit|unstage|clear source provenance|run release-readiness|checkout branches|merge|push|contact buyers|authorize Supabase|request owner approval|deploy|mutate live services|browser smoke|hosted\/live parity|raise launch status/i);
    const launchActionOperatorHandoffPacketReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-LAUNCH-ACTION-OPERATOR-HANDOFF-PACKET',
    );
    expect(launchActionOperatorHandoffPacketReview).toBeTruthy();
    expect(launchActionOperatorHandoffPacketReview.policy).toBe('strict');
    expect(launchActionOperatorHandoffPacketReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm run report:launch-action-readiness -- --skip-probes',
      'pnpm run check:launch-action-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const objectiveCompletionAuditUnitContractDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-UNIT-CONTRACT',
    );
    expect(objectiveCompletionAuditUnitContractDecision).toBeTruthy();
    expect(objectiveCompletionAuditUnitContractDecision.chosen_variant).toBe('minimal focused objective completion audit unit contract');
    expect(objectiveCompletionAuditUnitContractDecision.files_changed).toEqual(expect.arrayContaining([
      'tests/unit/objectiveCompletionAuditReadiness.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(objectiveCompletionAuditUnitContractDecision.proof_boundary).toMatch(/does not mark the launch goal complete|clear P0\/P1 blockers|collect buyer evidence|contact buyers|authorize Supabase|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|production approval|buyer acceptance|raise launch status/i);
    const objectiveCompletionAuditUnitContractReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-OBJECTIVE-COMPLETION-AUDIT-UNIT-CONTRACT',
    );
    expect(objectiveCompletionAuditUnitContractReview).toBeTruthy();
    expect(objectiveCompletionAuditUnitContractReview.policy).toBe('strict');
    expect(objectiveCompletionAuditUnitContractReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/objectiveCompletionAuditReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:objective-completion-audit-readiness -- --skip-probes',
      'pnpm run report:objective-completion-audit-readiness -- --skip-probes --json',
      'pnpm run check:objective-completion-audit-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    const adversarialReviewUnitContractDecision = manifest.implementation_decisions.find(
      (item: { task_id?: string }) => item.task_id === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-UNIT-CONTRACT',
    );
    expect(adversarialReviewUnitContractDecision).toBeTruthy();
    expect(adversarialReviewUnitContractDecision.chosen_variant).toBe('minimal focused adversarial review unit contract');
    expect(adversarialReviewUnitContractDecision.files_changed).toEqual(expect.arrayContaining([
      'tests/unit/adversarialReviewReadiness.test.ts',
      'scripts/report-launch-evidence-manifest.mjs',
      'scripts/check-launch-evidence-manifest.mjs',
      'scripts/check-progress-digest-readiness-report.mjs',
      'scripts/check-commercial-launch-readiness-report.mjs',
      'tests/unit/launchEvidenceManifest.test.ts',
    ]));
    expect(adversarialReviewUnitContractDecision.proof_boundary).toMatch(/does not prove production approval|create buyer evidence|contact buyers|prove buyer acceptance|run release-readiness as clearance|authorize Supabase|clear Supabase advisor findings|approve branches|resolve source provenance|request owner approval|deploy|hosted\/live parity|clear launch blockers|mark the launch goal complete|raise launch status/i);
    const adversarialReviewUnitContractReview = manifest.code_optimization_reviews.find(
      (item: { target_task?: string }) => item.target_task === 'CEIP-SAFE-FIX-ADVERSARIAL-REVIEW-UNIT-CONTRACT',
    );
    expect(adversarialReviewUnitContractReview).toBeTruthy();
    expect(adversarialReviewUnitContractReview.policy).toBe('strict');
    expect(adversarialReviewUnitContractReview.tests_or_checks).toEqual(expect.arrayContaining([
      'pnpm exec vitest run tests/unit/adversarialReviewReadiness.test.ts tests/unit/launchEvidenceManifest.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1',
      'pnpm run report:adversarial-review-readiness -- --skip-probes',
      'pnpm run report:adversarial-review-readiness -- --skip-probes --json',
      'pnpm run check:adversarial-review-report -- --skip-probes',
      'pnpm run check:progress-digest-report -- --skip-probes',
      'pnpm run check:launch-evidence-manifest -- --skip-probes',
      'pnpm run check:commercial-launch-readiness-report -- --skip-probes',
    ]));
    expect(manifest.ecc_ledger.decision).toBe('blocked');

    const tempRoot = makeTempRoot();
    const manifestPath = path.join(tempRoot, 'launch-evidence.json');
    writeFileSync(manifestPath, stdout, 'utf8');

    const validation = execFileSync('python3', [validatorPath, manifestPath, '--require-repo-exists'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
    });
    expect(validation).toContain('VALID');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('separates branch review clearance from read-only probe execution', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const reviewFirstOpen = (manifest.branch_review.review_queue.review_first_count ?? 0) > 0;
    const canonicalHeadOpen = (manifest.branch_review.canonical_head_decisions.open_count ?? 0) > 0;
    const branchAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'branch_review');
    const branchPrerequisite = manifest.production_approval.prerequisite_queue.items.find(
      (item: { prerequisite: string }) => item.prerequisite === 'Canonical branch review',
    );
    const firstReviewItem = manifest.branch_review.review_queue.items[0];
    const firstCanonicalHeadDecision = manifest.branch_review.canonical_head_decisions.items[0];
    const branchCanonicalResolutionQueue = manifest.branch_review.canonical_head_resolution_queue;
    const firstCanonicalHeadResolution = branchCanonicalResolutionQueue.items[0];
    const branchClearanceMatrix = manifest.branch_review.clearance_matrix;
    const firstClearanceRow = branchClearanceMatrix.rows[0];
    const branchOperatorHandoffPacket = manifest.branch_review.operator_handoff_packet;
    const firstOperatorHandoffItem = branchOperatorHandoffPacket.items[0];
    const firstReviewFirstPacket = manifest.branch_review.review_first_packets.packets[0];
    const firstChangedFunctionRow = firstReviewFirstPacket?.changed_supabase_function_rows?.[0]
      ?? manifest.branch_review.top_review_packet.changed_supabase_function_rows?.[0];

    expect(manifest.branch_review.probe_status).toBe('pass');
    expect(branchAction?.proof_command).toContain('report:branch-review-readiness');
    expect(branchAction?.proof_command).toContain('check:branch-review-report');
    expect(branchPrerequisite?.proof_command).toContain('report:branch-review-readiness');
    expect(branchPrerequisite?.proof_command).toContain('check:branch-review-report');
    expect(manifest.branch_review.evidence).toContain('Branch review clearance');
    expect(manifest.branch_review.evidence).toContain('probe_status=pass');
    expect(manifest.branch_review.evidence_boundary).toMatch(/read-only branch probe execution does not clear/i);
    expect(manifest.branch_review.review_queue.status).toBe(reviewFirstOpen ? 'blocked' : 'pass');
    expect(manifest.branch_review.review_queue.blocked_count).toBe(manifest.branch_review.review_queue.review_first_count);
    expect(manifest.branch_review.review_queue.evidence).toContain(`status=${manifest.branch_review.review_queue.status}`);
    expect(manifest.branch_review.review_queue.evidence).toContain(`blocked=${manifest.branch_review.review_queue.blocked_count}`);
    expect(manifest.branch_review.top_review_packet.read_only).toBe(true);
    expect(manifest.branch_review.top_review_packet.proof_type).toBeTruthy();
    expect(manifest.branch_review.top_review_packet.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
    expect(manifest.branch_review.top_review_packet.changed_supabase_function_rows).toHaveLength(
      manifest.branch_review.top_review_packet.changed_supabase_function_count,
    );
    if (manifest.branch_review.top_review_packet.changed_supabase_function_count > 0) {
      expect(manifest.branch_review.top_review_packet.categories).toContain('supabase/database');
    }
    expect(branchClearanceMatrix.status).toBe(manifest.branch_review.status);
    expect(branchClearanceMatrix.proof_type).toBe('read_only_branch_clearance_matrix');
    expect(branchClearanceMatrix.family_count).toBe(manifest.branch_review.review_queue.item_count);
    expect(branchClearanceMatrix.rows).toHaveLength(manifest.branch_review.review_queue.item_count);
    expect(branchClearanceMatrix.evidence).toContain('Branch clearance matrix');
    expect(branchClearanceMatrix.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
    expect(firstClearanceRow).toBeTruthy();
    if (firstClearanceRow) {
      expect(firstClearanceRow.read_only).toBe(true);
      expect(firstClearanceRow.blocks_launch_clearance).toBe(true);
      expect(firstClearanceRow.required_proof_command).toContain('report:unmerged-branch-readiness');
      expect(firstClearanceRow.proof_type).toBeTruthy();
      expect(firstClearanceRow.proof_boundary).toMatch(/read-only branch-review evidence only|does not checkout|merge|push/i);
      expect(firstClearanceRow.stop_gate).toMatch(/Do not checkout, merge, push/i);
      expect(['blocked', 'review_required']).toContain(firstClearanceRow.clearance_status);
      if (firstClearanceRow.highest_risk === 'high') {
        expect(firstClearanceRow.proof_type).toBe('high_risk_branch_clearance_row');
      }
    }
    expect(branchOperatorHandoffPacket.status).toBe(
      branchClearanceMatrix.rows.some((row: { blocks_launch_clearance?: boolean; clearance_status?: string }) => row.blocks_launch_clearance === true || row.clearance_status !== 'pass')
        ? 'blocked'
        : 'ready',
    );
    expect(branchOperatorHandoffPacket.proof_type).toBe('branch_operator_handoff_packet');
    expect(branchOperatorHandoffPacket.source).toBe('branch_review.clearance_matrix.rows');
    expect(branchOperatorHandoffPacket.item_count).toBe(branchClearanceMatrix.rows.length);
    expect(branchOperatorHandoffPacket.blocked_count).toBe(
      branchOperatorHandoffPacket.items.filter((item: { blocks_branch_gate?: boolean }) => item.blocks_branch_gate).length,
    );
    expect(branchOperatorHandoffPacket.items.map((item: { family?: string }) => item.family)).toEqual(
      branchClearanceMatrix.rows.map((item: { family?: string }) => item.family),
    );
    expect(branchOperatorHandoffPacket.evidence).toContain('Branch operator handoff packet');
    expect(branchOperatorHandoffPacket.proof_boundary).toMatch(/read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity/i);
    expect(branchOperatorHandoffPacket.stop_gate).toMatch(/Do not mark branch review clear|select canonical heads|merge|push|discard|delete|deploy|request production approval/i);
    expect(firstOperatorHandoffItem).toBeTruthy();
    if (firstOperatorHandoffItem && firstClearanceRow) {
      expect(firstOperatorHandoffItem.family).toBe(firstClearanceRow.family);
      expect(firstOperatorHandoffItem.review_ref).toBe(firstClearanceRow.review_ref);
      expect(firstOperatorHandoffItem.read_only).toBe(true);
      expect(firstOperatorHandoffItem.can_execute_from_packet).toBe(false);
      expect(firstOperatorHandoffItem.blocks_branch_gate).toBe(firstClearanceRow.blocks_launch_clearance === true || firstClearanceRow.clearance_status !== 'pass');
      expect(firstOperatorHandoffItem.proof_command).toContain('report:unmerged-branch-readiness');
      expect(firstOperatorHandoffItem.proof_boundary).toMatch(/read-only planning evidence only|does not checkout|merge|push|discard|delete|select canonical heads|run migrations|mutate Supabase|deploy|hosted\/live parity/i);
      expect(firstOperatorHandoffItem.stop_gate).toMatch(/Do not execute|mutate branch state|select canonical heads|request production approval|mark this row ready/i);
      if (firstOperatorHandoffItem.blocker_class === 'review_first') {
        expect(firstOperatorHandoffItem.execution_gate).toBe('read_only_focused_review_first');
      }
      if (firstOperatorHandoffItem.blocker_class === 'canonical_head_decision') {
        expect(firstOperatorHandoffItem.owner).toBe('owner');
        expect(firstOperatorHandoffItem.execution_gate).toBe('owner_canonical_head_decision_first');
      }
    }
    expect(firstReviewItem).toBeTruthy();
    if (firstReviewItem) {
      expect(firstReviewItem.read_only).toBe(true);
      expect(firstReviewItem.proof_type).toBeTruthy();
      expect(firstReviewItem.proof_boundary).toMatch(/read-only|does not checkout|merge|push/i);
      if (firstReviewItem.highest_risk === 'high') {
        expect(firstReviewItem.proof_type).toBe('high_risk_read_only_branch_review');
      }
    }

    if (firstCanonicalHeadDecision) {
      expect(firstCanonicalHeadDecision.read_only).toBe(true);
      expect(firstCanonicalHeadDecision.owner_decision_required).toBe(true);
      expect(firstCanonicalHeadDecision.proof_type).toBeTruthy();
      expect(firstCanonicalHeadDecision.proof_boundary).toMatch(/owner decision record only|does not checkout|merge|push/i);
      if (['local_ahead', 'origin_ahead', 'diverged'].includes(firstCanonicalHeadDecision.state_key)) {
        expect(firstCanonicalHeadDecision.proof_type).toBe('split_canonical_head_decision');
      }
      if (firstCanonicalHeadDecision.state_key === 'local_only') {
        expect(firstCanonicalHeadDecision.proof_type).toBe('local_only_canonical_head_decision');
      }
      if (firstCanonicalHeadDecision.state_key === 'origin_only') {
        expect(firstCanonicalHeadDecision.proof_type).toBe('origin_only_canonical_head_decision');
      }
    }

    expect(branchCanonicalResolutionQueue.source_decision_status).toBe(manifest.branch_review.canonical_head_decisions.status);
    expect(branchCanonicalResolutionQueue.item_count).toBe(manifest.branch_review.canonical_head_decisions.items.length);
    expect(branchCanonicalResolutionQueue.blocked_count).toBe(manifest.branch_review.canonical_head_decisions.open_count);
    expect(branchCanonicalResolutionQueue.proof_type).toBe('canonical_head_resolution_queue');
    expect(branchCanonicalResolutionQueue.evidence).toContain('Canonical head resolution queue');
    expect(branchCanonicalResolutionQueue.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
    if (firstCanonicalHeadResolution) {
      expect(firstCanonicalHeadResolution.read_only).toBe(true);
      expect(firstCanonicalHeadResolution.owner_decision_required).toBe(true);
      expect(firstCanonicalHeadResolution.owner).toBe('owner');
      expect(firstCanonicalHeadResolution.proof_command).toContain('report:unmerged-branch-readiness');
      expect(firstCanonicalHeadResolution.proof_boundary).toMatch(/owner-decision action list only|does not checkout|select canonical heads/i);
      expect(firstCanonicalHeadResolution.stop_gate).toMatch(/Do not checkout|select a canonical head|production approval/i);
      expect(firstCanonicalHeadResolution.blocks_branch_gate).toBe(true);
      expect(firstCanonicalHeadResolution.status).toBe('blocked');
      expect(firstCanonicalHeadResolution.family).toBe(firstCanonicalHeadDecision?.family);
    }

    if (firstReviewFirstPacket) {
      expect(firstReviewFirstPacket.read_only).toBe(true);
      expect(firstReviewFirstPacket.proof_type).toBeTruthy();
      expect(firstReviewFirstPacket.proof_boundary).toMatch(/read-only branch evidence|does not checkout|merge|push/i);
      if (firstReviewFirstPacket.risk === 'high') {
        expect(firstReviewFirstPacket.proof_type).toBe('high_risk_read_only_branch_packet');
      }
    }

    if (firstChangedFunctionRow) {
      expect(firstChangedFunctionRow.read_only).toBe(true);
      expect(firstChangedFunctionRow.proof_type).toBe('read_only_supabase_function_branch_review');
      expect(firstChangedFunctionRow.changed_paths).toMatch(/supabase\/functions\//);
      expect(firstChangedFunctionRow.review_focus).toMatch(/secret|auth|entitlement|database writes|observability|import-impact/i);
      expect(firstChangedFunctionRow.suggested_checks).toMatch(/git diff/);
      expect(firstChangedFunctionRow.proof_boundary).toMatch(/review-target evidence|does not deploy functions|run migrations|alter secrets/i);
      expect(firstChangedFunctionRow.stop_gate).toMatch(/No production function deploy|service-role|live data write/i);
    }

    if (reviewFirstOpen || canonicalHeadOpen) {
      expect(manifest.branch_review.status).toBe('blocked');
      expect(branchAction.status).toBe('blocked');
      expect(branchPrerequisite.status).toBe('blocked');
    } else {
      expect(manifest.branch_review.status).toBe('pass');
    }
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer commercial-signal remediation tied to retained non-status-only evidence', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerQueue = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items;
    const strongSignalItem = buyerQueue.find((item: { requirement: string }) => item.requirement === 'Strong commercial signal');

    expect(strongSignalItem).toBeTruthy();
    expect(strongSignalItem.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(strongSignalItem.proof_command).toContain('--commercial-commitment-evidence');
    expect(strongSignalItem.proof_command).toContain('update:pilot-evidence-register-row');
    expect(strongSignalItem.proof_command).toContain('validate:pilot-evidence');
    expect(strongSignalItem.stop_gate).toMatch(/status labels/i);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer evidence acquisition rows blocked and acquisition-only', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const matrix = manifest.buyer_evidence.acquisition_matrix;
    const rowsByLane = mapBy(
      matrix.rows,
      (item: {
        lane: string;
        status: string;
        current?: string;
        proof_boundary?: string;
        stop_gate?: string;
        validation_command?: string;
        proof_type?: string;
      }) => item.lane,
    );

    expect(matrix.status).toBe('blocked');
    expect(matrix.proof_type).toBe('buyer_evidence_acquisition_matrix');
    expect(matrix.evidence).toContain('Buyer evidence acquisition matrix');
    expect(matrix.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|move confidence|validate 95%|claim buyer acceptance/i);
    expect(matrix.stop_gate).toMatch(/Do not mark buyer evidence ready|real anonymized buyer rows/i);
    expect(matrix.row_count).toBeGreaterThanOrEqual(10);
    expect(matrix.blocked_count).toBeGreaterThan(0);
    expect(rowsByLane.get('Outreach response log intake')?.status).toBe('blocked');
    expect(rowsByLane.get('Outreach response log intake')?.current).toMatch(/0 actionable outreach row/);
    expect(rowsByLane.get('Outreach response log intake')?.proof_boundary).toMatch(/does not contact buyers|create acceptance/i);
    expect(rowsByLane.get('Production pilot evidence register')?.status).toBe('blocked');
    expect(rowsByLane.get('Production pilot evidence register')?.current).toMatch(/starter-only register/);
    expect(rowsByLane.get('Production pilot evidence register')?.proof_boundary).toMatch(/outside templates|starter rows/i);
    expect(rowsByLane.get('Utility forecast lane')?.proof_type).toBe('forecast_trust_artifact_preparation');
    expect(rowsByLane.get('Utility forecast lane')?.validation_command).toContain('prepare:forecast-trust-report-artifact');
    expect(rowsByLane.get('TIER or credit lane')?.validation_command).toContain('prepare:pilot-evidence-artifact');
    expect(rowsByLane.get('Billing or security lane')?.validation_command).toContain('prepare:pilot-evidence-artifact');
    expect(rowsByLane.get('Confidence movement and coverage')?.stop_gate).toMatch(/Do not move confidence/i);
    expect(rowsByLane.get('Strong commercial commitment')?.proof_boundary).toMatch(/signed agreement|paid pilot|invoice|PO|LOI|status-only labels/i);
    expect(rowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(rowsByLane.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
    const minimumPacket = manifest.buyer_evidence.minimum_evidence_packet;
    expect(minimumPacket.proof_type).toBe('buyer_evidence_minimum_packet_handoff');
    expect(minimumPacket.source).toBe('buyer_evidence.acquisition_matrix.rows');
    expect(minimumPacket.item_count).toBe(matrix.row_count);
    expect(minimumPacket.blocked_count).toBe(matrix.blocked_count);
    expect(minimumPacket.proof_boundary).toMatch(/does not contact buyers|create accepted evidence|attach retained artifacts|validate 95%|grant production approval/i);
    expect(minimumPacket.stop_gate).toMatch(/Do not mark buyer evidence ready|validate:pilot-evidence --require-95/i);
    const packetRowsByLane = mapBy(
      minimumPacket.items,
      (item: {
        lane: string;
        validation_command?: string;
        blocks_95_gate?: boolean;
        proof_type?: string;
      }) => item.lane,
    );
    expect(packetRowsByLane.get('Outreach response log intake')?.validation_command).toContain('plan:outreach-intake');
    expect(packetRowsByLane.get('Retained-artifact 95% validation')?.validation_command).toContain('validate:pilot-evidence');
    expect(packetRowsByLane.get('Retained-artifact 95% validation')?.proof_type).toBe('retained_artifact_validation');
    expect(packetRowsByLane.get('Retained-artifact 95% validation')?.blocks_95_gate).toBe(true);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('classifies buyer evidence remediation proof rows with explicit boundaries', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerDeficitsByRequirement = mapBy(
      manifest.buyer_evidence.hard_gate_deficits.items,
      (item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        stop_gate?: string;
      }) => item.requirement,
    );
    const buyerActionsByRequirement = mapBy(
      manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items,
      (item: {
        requirement: string;
        proof_type?: string;
        buyer_accepted_evidence_required?: boolean;
        retained_artifact_required?: boolean;
        proof_boundary?: string;
        proof_command: string;
      }) => item.requirement,
    );
    const expectedProofTypes: Record<string, string> = {
      'Utility forecast lane': 'forecast_trust_artifact_preparation',
      'TIER or credit lane': 'retained_artifact_preparation',
      'Billing or security lane': 'retained_artifact_preparation',
      'Distinct accepted proof packs': 'buyer_acceptance_report',
      'Accepted confidence_delta': 'register_update',
      'Retained SHA-256 references': 'retained_artifact_and_register_update',
      'Buyer data coverage': 'register_update',
      'Artifact turnaround': 'register_update',
      'Strong commercial signal': 'commercial_commitment_artifact',
      'Retained-artifact 95% validation': 'retained_artifact_validation',
    };

    for (const [requirement, proofType] of Object.entries(expectedProofTypes)) {
      const deficit = buyerDeficitsByRequirement.get(requirement);
      const item = buyerActionsByRequirement.get(requirement);
      expect(deficit).toBeTruthy();
      expect(deficit?.proof_type).toBe(proofType);
      expect(deficit?.buyer_accepted_evidence_required).toBe(true);
      expect(deficit?.retained_artifact_required).toBe(true);
      expect(deficit?.proof_boundary).toBeTruthy();
      expect(deficit?.stop_gate).toMatch(/Do not/i);
      expect(item).toBeTruthy();
      expect(item?.proof_type).toBe(proofType);
      expect(item?.buyer_accepted_evidence_required).toBe(true);
      expect(item?.retained_artifact_required).toBe(true);
      expect(item?.proof_boundary).toBeTruthy();
    }
    expect(buyerActionsByRequirement.get('Utility forecast lane')?.proof_command).toContain('prepare:forecast-trust-report-artifact');
    expect(buyerActionsByRequirement.get('TIER or credit lane')?.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(buyerActionsByRequirement.get('Billing or security lane')?.proof_command).toContain('prepare:pilot-evidence-artifact');
    expect(buyerDeficitsByRequirement.get('Strong commercial signal')?.proof_boundary).toMatch(/signed agreement|paid pilot|invoice|PO|LOI|status-only labels/i);
    expect(buyerDeficitsByRequirement.get('Strong commercial signal')?.stop_gate).toMatch(/status labels|informal interest|unretained claims/i);
    expect(buyerDeficitsByRequirement.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
    expect(buyerDeficitsByRequirement.get('Retained-artifact 95% validation')?.stop_gate).toMatch(/validate:pilot-evidence --require-95/i);
    expect(buyerActionsByRequirement.get('Strong commercial signal')?.proof_boundary).toMatch(/status-only labels|informal interest|unretained claims/i);
    expect(buyerActionsByRequirement.get('Retained-artifact 95% validation')?.proof_boundary).toMatch(/validation does not create buyer acceptance/i);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps buyer artifact-preparation remediation commands complete and shell-safe', () => {
    const stdout = runManifest();
    const manifest = JSON.parse(stdout);
    const buyerQueue = manifest.buyer_evidence.hard_gate_deficits.remediation_queue.items;
    const pilotArtifactOptions = [
      '--evidence-root',
      '--artifact-file',
      '--route',
      '--proof-pack-id',
      '--record-date',
      '--pii-screen-result',
      '--buyer-data-coverage-pct',
      '--time-to-artifact-hours',
      '--reviewer-role',
      '--reviewer-acceptance',
      '--reviewer-feedback-status',
      '--day-14-decision',
      '--commercial-commitment-status',
      '--claim-boundary',
      '--do-not-claim',
      '--diagnostic',
    ];
    const forecastArtifactOptions = [
      '--benchmark-pack-file',
      '--evidence-root',
      '--artifact-file',
      '--proof-pack-id',
      '--record-date',
      '--buyer-data-coverage-pct',
      '--time-to-artifact-hours',
      '--reviewer-role',
      '--reviewer-acceptance',
      '--reviewer-feedback-status',
      '--day-14-decision',
      '--commercial-commitment-status',
    ];

    for (const item of buyerQueue) {
      expect(item.proof_command).not.toMatch(/[<>]/);
      if (item.proof_command.includes('prepare:pilot-evidence-artifact')) {
        for (const option of pilotArtifactOptions) expect(item.proof_command).toContain(option);
      }
      if (item.proof_command.includes('prepare:forecast-trust-report-artifact')) {
        for (const option of forecastArtifactOptions) expect(item.proof_command).toContain(option);
      }
    }
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the release check wired to the blocked manifest contract', () => {
    const result = execFileSync(process.execPath, [checkScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Launch evidence manifest check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator for the launch evidence manifest check', () => {
    const result = execFileSync(process.execPath, [checkScriptPath, '--', '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Launch evidence manifest check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('renders the orchestrator final-report tables from the validated manifest', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');
    const stdout = execFileSync(process.execPath, [markdownReportScriptPath, '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(stdout).toContain('# CEIP Commercial Launch Readiness Report');
    expect(stdout).toContain('Decision: `blocked`');
    expect(stdout).toContain('## Launch Decision');
    expect(stdout).toContain('## Gap Analysis');
    expect(stdout).toContain('## Launch Blocker Action Queue');
    expect(stdout).toContain('## Source Provenance Resolution Queue');
    expect(stdout).toContain('## Branch Canonical Head Decision Deficits');
    expect(stdout).toContain('## Branch Canonical Head Resolution Queue');
    expect(stdout).toContain('## Branch Clearance Matrix');
    expect(stdout).toContain('## Buyer Evidence Hard Gate Deficits');
    expect(stdout).toContain('## Buyer Evidence Acquisition Matrix');
    expect(stdout).toContain('## Buyer Evidence Remediation Queue');
    expect(stdout).toContain('## Supabase Advisor Clearance Deficits');
    expect(stdout).toContain('## Supabase Advisor Remediation Queue');
    expect(stdout).toContain('## Release Toolchain And Approval Deficits');
    expect(stdout).toContain('## Release Preflight Remediation Queue');
    expect(stdout).toContain('## Production Approval Prerequisite Queue');
    expect(stdout).toContain('## Production Approval Request Packet');
    expect(stdout).toContain('## Post-Deploy Live Proof Gate Queue');
    expect(stdout).toContain('## Proof Buckets');
    expect(stdout).toContain('## Top 10 Pain Points');
    expect(stdout).toContain('## Top 10 Target Customers Or Segments');
    expect(stdout).toContain('## Outreach Plan');
    expect(stdout).toContain('## Fix Report');
    expect(stdout).toContain('## Objective Completion Audit');
    expect(stdout).toContain('## Adversarial Review');
    expect(stdout).toContain('## Evidence Validation');
    expect(stdout).toContain('## ECC Ledger');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Launch blocker action queue');
    expect(stdout).toContain('Source provenance resolution queue');
    expect(stdout).toContain('Source provenance isolation ledger');
    expect(stdout).toContain('source_provenance_isolation_ledger');
    expect(stdout).toContain('dirty-source release impact only');
    expect(stdout).toContain('git status --porcelain=v1');
    expect(stdout).toContain('Do not request deploy approval');
    expect(stdout).toContain('This queue is a decision aid only');
    expect(stdout).toContain('corepack pnpm run report:source-provenance-readiness && corepack pnpm run check:source-provenance-report');
    expect(stdout).toContain('explicit owner intent');
    expect(stdout).toContain('| source_provenance |');
    expect(stdout).toContain('| launch_evidence_validation |');
    expect(stdout).toContain('| release_toolchain |');
    expect(stdout).toContain('| branch_review |');
    expect(stdout).toContain('| supabase_advisor |');
    expect(stdout).toContain('| buyer_evidence |');
    expect(stdout).toContain('| production_approval |');
    expect(stdout).toContain('| post_deploy_live_proof |');
    expect(stdout).toContain('release-toolchain probe(s) open');
    expect(stdout).toContain('focused launch evidence validation must stay attached before a deploy approval request');
    expect(stdout).toContain('Refresh the release toolchain probe ledger');
    expect(stdout).toMatch(/\| 6 \| buyer_evidence \| (?:[1-9]\d*|unknown) buyer hard-gate deficit\(s\) remain \| buyer_operator \|[^|\n]+\| corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report \|[^|\n]+\| blocked \|/);
    expect(stdout).toContain('corepack pnpm run check:post-deploy-live');
    expect(stdout).toContain('Do not claim buyer-proven 95% confidence');
    expect(stdout).toContain('Buyer evidence review');
    expect(stdout).toContain('Batchable intake-packet outreach rows');
    expect(stdout).toContain('Buyer hard-gate deficit ledger skipped');
    expect(stdout).toContain('Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.');
    expect(stdout).toContain('Buyer evidence acquisition matrix');
    expect(stdout).toContain('buyer_evidence_acquisition_matrix');
    expect(stdout).toContain('| Outreach response log intake |');
    expect(stdout).toContain('| Production pilot evidence register |');
    expect(stdout).toContain('does not contact buyers, create accepted evidence, move confidence');
    expect(stdout).toContain('Do not mark buyer evidence ready');
    expect(stdout).toContain('Buyer evidence remediation queue skipped');
    expect(stdout).toContain('does not contact buyers');
    expect(stdout).toContain('create accepted evidence, move confidence');
    expect(stdout).toContain('Supabase advisor review');
    expect(stdout).toContain('Supabase security/performance advisor clearance remains unavailable');
    expect(stdout).toContain('Supabase advisor clearance deficit ledger');
    expect(stdout).toContain('| Security advisor evidence |');
    expect(stdout).toContain('| Performance advisor evidence |');
    expect(stdout).toContain('| Advisor clearance claim |');
    expect(stdout).toContain('Supabase advisor remediation queue');
    expect(stdout).toContain('does not authorize connectors');
    expect(stdout).toContain('mutate the database');
    expect(stdout).toContain('Supabase Dashboard > Database > Security Advisor');
    expect(stdout).toContain('Supabase Dashboard > Database > Performance Advisor');
    expect(stdout).toContain('Release toolchain and approval deficit ledger');
    expect(stdout).toContain('| Corepack pnpm resolver |');
    expect(stdout).toContain('| Release-readiness execution |');
    expect(stdout).toContain('| Git LFS push-path proof |');
    expect(stdout).toContain('Release Toolchain Probe Ledger');
    expect(stdout).toContain('| Corepack pnpm resolver | corepack pnpm --version |');
    expect(stdout).toContain('| Git LFS push-path proof | git lfs version |');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('Release Preflight Clearance Matrix');
    expect(stdout).toContain('Release preflight clearance matrix');
    expect(stdout).toContain('release_preflight_clearance_matrix');
    expect(stdout).toContain('Open release clearance rows');
    expect(stdout).toContain('Do not mark release approval ready');
    expect(stdout).toContain('Blocks Release Gate');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('Release preflight remediation queue');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('Production approval prerequisite queue');
    expect(stdout).toContain('| Launch evidence validation |');
    expect(stdout).toContain('focused launch evidence validation report/check is external to manifest generation and must attach passing check:launch-evidence-manifest output');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-validation-readiness && corepack pnpm run check:launch-evidence-validation-report');
    expect(stdout).toContain('underlying check:launch-evidence-manifest');
    expect(stdout).toContain('does not grant owner approval');
    expect(stdout).toContain('Corepack/Git LFS probe ledger');
    expect(stdout).toContain('corepack pnpm run report:release-preflight && corepack pnpm run check:release-preflight-report && corepack pnpm run check:release-readiness');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('not granted by this manifest or report');
    expect(stdout).toContain('| Post-deploy live proof boundary |');
    expect(stdout).toContain('not eligible before explicit approved deploy');
    expect(stdout).toContain('Production approval request packet');
    expect(stdout).toContain('production_approval_request_packet');
    expect(stdout).toContain('Request eligible: `no`');
    expect(stdout).toContain('Evidence To Attach');
    expect(stdout).toContain('Blocks Request');
    expect(stdout).toContain('organizes request evidence only');
    expect(stdout).toContain('Do not request or claim production approval');
    expect(stdout).toContain('Post-deploy live proof gate queue');
    expect(stdout).toContain('does not deploy, push, rebuild, mutate Netlify');
    expect(stdout).toContain('| Live public metadata |');
    expect(stdout).toContain('| Live static dist parity |');
    expect(stdout).toContain('| Hosted proof-pack route smoke |');
    expect(stdout).toContain('| Current-source hosted parity claim |');
    expect(stdout).toContain('corepack pnpm run check:live-public-metadata');
    expect(stdout).toContain('corepack pnpm run check:live-static-parity');
    expect(stdout).toContain('corepack pnpm run test:browser:hosted:proof-packs');
    expect(stdout).toContain('Branch family review skipped');
    expect(stdout).toContain('Branch freshness review skipped');
    expect(stdout).toContain('Branch review queue skipped');
    expect(stdout).toContain('Canonical head decision ledger skipped');
    expect(stdout).toContain('Canonical head resolution queue skipped');
    expect(stdout).toContain('canonical_head_resolution_queue');
    expect(stdout).toContain('This ledger is read-only');
    expect(stdout).toContain('corepack pnpm run report:unmerged-branch-readiness');
    expect(stdout).toContain('Branch clearance matrix skipped');
    expect(stdout).toContain('read_only_branch_clearance_matrix');
    expect(stdout).toContain('Review-first branch packets skipped');
    expect(stdout).toContain('Top branch review packet skipped');
    expect(stdout).toContain('Canonical head comparison skipped');
    expect(stdout).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(stdout).toContain('High-risk, local/origin split, or stale/aging unmerged branches');
    expect(stdout).toContain('completion_audit_current_state');
    expect(stdout).toContain('| Buyer evidence hard gate | blocked | yes |');
    expect(stdout).toContain('| Production approval and live proof gate | manual_stop | yes |');
    expect(stdout).toContain('corepack pnpm run report:buyer-evidence-gate-readiness && corepack pnpm run check:buyer-evidence-gate-report');
    expect(stdout).toContain('corepack pnpm run report:branch-review-readiness && corepack pnpm run check:branch-review-report');
    expect(stdout).toContain('corepack pnpm run report:supabase-advisor-readiness && corepack pnpm run check:supabase-advisor-report');
    expect(stdout).toContain('corepack pnpm run report:production-approval-readiness && corepack pnpm run check:production-approval-report && corepack pnpm run report:post-deploy-live-proof-readiness && corepack pnpm run check:post-deploy-live-proof-report');
    expect(stdout).toContain('This audit maps current manifest/report evidence only');
    expect(stdout).toContain('Do not mark the launch goal complete or claim readiness');
    expect(stdout).toContain('validate_launch_evidence.py');
    expect(stdout).toContain('VALID');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator documented for the Markdown launch readiness report', () => {
    const tempRoot = makeTempRoot();
    const reportPath = path.join(tempRoot, 'commercial-launch-readiness.md');
    const stdout = execFileSync(process.execPath, [markdownReportScriptPath, '--', '--skip-probes', '--output', reportPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(stdout).toContain('# CEIP Commercial Launch Readiness Report');
    expect(stdout).toContain('Decision: `blocked`');
    expect(readFileSync(reportPath, 'utf8')).toBe(stdout);
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('keeps the Markdown launch readiness report wired to the blocked proof-boundary contract', () => {
    const result = execFileSync(process.execPath, [checkMarkdownReportScriptPath, '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Commercial launch readiness report check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);

  it('accepts the pnpm option separator for the Markdown launch readiness report check', () => {
    const result = execFileSync(process.execPath, [checkMarkdownReportScriptPath, '--', '--skip-probes'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: process.env,
      timeout: LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS,
    });

    expect(result).toContain('Commercial launch readiness report check passed');
  }, LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS);
});
