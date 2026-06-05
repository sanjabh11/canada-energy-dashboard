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
const LAUNCH_READINESS_REPORT_CLI_TIMEOUT_MS = 60000;
const tempRoots: string[] = [];

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
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P0' && gap.gap.includes('Phase F evidence'))).toBe(true);
    expect(manifest.gaps.some((gap: { severity: string; gap: string }) => gap.severity === 'P1' && gap.gap.includes('stale/aging unmerged branches'))).toBe(true);
    expect(manifest.buyer_evidence.status).toBe('skipped');
    expect(manifest.buyer_evidence.production_registers).toBeNull();
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
    expect(manifest.release_preflight.status).toBe('blocked');
    expect(manifest.release_preflight.package_manager).toBe('pnpm@10.23.0');
    expect(manifest.release_preflight.expected_pnpm_version).toBe('10.23.0');
    expect(manifest.release_preflight.corepack_probe).toBe('skipped');
    expect(manifest.release_preflight.git_lfs_probe).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.status).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.evidence).toContain('Release toolchain probe ledger skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items.map((item: { id: string }) => item.id)).toEqual([
      'corepack_pnpm_resolver',
      'git_lfs_push_path',
    ]);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].command).toBe('corepack pnpm --version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[0].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].command).toBe('git lfs version');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].current).toBe('skipped');
    expect(manifest.release_preflight.toolchain_probe_ledger.items[1].evidence_boundary).toMatch(/does not install tools/i);
    expect(manifest.release_preflight.evidence).toContain('Release toolchain and approval deficit ledger');
    expect(manifest.release_preflight.items.map((item: { requirement: string }) => item.requirement)).toEqual([
      'Pinned package manager',
      'Corepack pnpm resolver',
      'Release-readiness execution',
      'Git LFS push-path proof',
      'Clean source provenance',
      'Explicit owner production approval',
    ]);
    expect(manifest.release_preflight.remediation_queue.status).toMatch(/blocked|pass/);
    expect(manifest.release_preflight.remediation_queue.evidence).toContain('Release preflight remediation queue');
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
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'branch_review').stop_gate).toMatch(/No checkout, merge, push/i);
    const launchEvidenceValidationAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'launch_evidence_validation');
    expect(launchEvidenceValidationAction.proof_command).toBe('corepack pnpm run check:launch-evidence-manifest && corepack pnpm run report:production-approval-packet');
    expect(launchEvidenceValidationAction.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseToolchainAction = manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'release_toolchain');
    expect(releaseToolchainAction.blocker).toMatch(/release-toolchain probe/i);
    expect(releaseToolchainAction.action).toMatch(/Refresh the release toolchain probe ledger/i);
    expect(releaseToolchainAction.proof_command).toBe('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(releaseToolchainAction.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').stop_gate).toMatch(/Do not count templates/i);
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'buyer_evidence').status).toBe('blocked');
    expect(manifest.launch_action_queue.items.find((item: { phase: string }) => item.phase === 'post_deploy_live_proof').proof_command).toBe('corepack pnpm run check:post-deploy-live');
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
    expect(launchEvidenceValidationPrerequisite.current).toMatch(/not run by this manifest/i);
    expect(launchEvidenceValidationPrerequisite.proof_command).toBe('corepack pnpm run check:launch-evidence-manifest');
    expect(launchEvidenceValidationPrerequisite.stop_gate).toMatch(/production approval, buyer acceptance, deployment, or current hosted\/live parity/i);
    const releaseReadinessPrerequisite = manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Corepack release-readiness');
    expect(releaseReadinessPrerequisite.current).toMatch(/release-toolchain probe/i);
    expect(releaseReadinessPrerequisite.needed).toMatch(/Corepack\/Git LFS probe ledger/i);
    expect(releaseReadinessPrerequisite.proof_command).toBe('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(releaseReadinessPrerequisite.stop_gate).toMatch(/probe ledger/i);
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Explicit owner production approval').current).toBe('not granted by this manifest or report');
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary').status).toBe('blocked');
    expect(manifest.production_approval.prerequisite_queue.items.find((item: { prerequisite: string }) => item.prerequisite === 'Post-deploy live proof boundary').proof_command).toBe('corepack pnpm run check:post-deploy-live');
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
    expect(manifest.post_deploy_live_proof.gate_queue.items.find((item: { gate: string }) => item.gate === 'Current-source hosted parity claim').status).toBe('blocked');
    expect(manifest.source_provenance.branch).toBeTruthy();
    expect(manifest.source_provenance.commit).toBeTruthy();
    expect(Number.isInteger(manifest.source_provenance.dirty_path_count)).toBe(true);
    expect(manifest.source_provenance.evidence).toContain('Source provenance:');
    if (manifest.source_provenance.dirty_paths.length > 0) {
      expect(manifest.source_provenance.dirty_paths[0].index_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].worktree_status).toBeTruthy();
      expect(manifest.source_provenance.dirty_paths[0].staging_state).toBeTruthy();
      expect(manifest.source_provenance.evidence).toContain('staging_state=');
    }
    expect(manifest.source_provenance.deploy_gate).toContain('deploy');
    expect(manifest.source_provenance.resolution_queue.status).toMatch(/blocked|pass/);
    expect(manifest.source_provenance.resolution_queue.evidence).toContain('Source provenance resolution queue');
    expect(manifest.source_provenance.resolution_queue.dirty_path_count).toBe(manifest.source_provenance.dirty_path_count);
    expect(manifest.source_provenance.resolution_queue.item_count).toBe(manifest.source_provenance.resolution_queue.items.length);
    if (manifest.source_provenance.resolution_queue.items.length > 0) {
      const firstSourceDecision = manifest.source_provenance.resolution_queue.items[0];
      expect(firstSourceDecision.source_status).toBeTruthy();
      expect(firstSourceDecision.decision_required).toMatch(/Decide|Confirm/i);
      expect(firstSourceDecision.proof_command).toContain('report:production-approval-packet');
      expect(firstSourceDecision.stop_gate).toContain('explicit owner intent');
      expect(firstSourceDecision.status).toBe('blocked');
    }
    expect(manifest.branch_review.status).toBe('skipped');
    expect(manifest.branch_review.risk_counts.high).toBeNull();
    expect(manifest.branch_review.family_counts.local_only).toBeNull();
    expect(manifest.branch_review.family_evidence).toContain('Branch family review skipped');
    expect(manifest.branch_review.freshness_counts.stale).toBeNull();
    expect(manifest.branch_review.freshness_evidence).toContain('Branch freshness review skipped');
    expect(manifest.branch_review.review_queue.status).toBe('skipped');
    expect(manifest.branch_review.review_queue.item_count).toBeNull();
    expect(manifest.branch_review.review_queue.review_first_count).toBeNull();
    expect(manifest.branch_review.review_queue.evidence).toContain('Branch review queue skipped');
    expect(manifest.branch_review.review_queue.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.status).toBe('skipped');
    expect(manifest.branch_review.canonical_head_decisions.open_count).toBeNull();
    expect(manifest.branch_review.canonical_head_decisions.items).toEqual([]);
    expect(manifest.branch_review.canonical_head_decisions.evidence).toContain('Canonical head decision ledger skipped');
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
    expect(manifest.branch_review.evidence).toContain('Review-first branch packets skipped');
    expect(manifest.branch_review.evidence).toContain('Top branch review packet skipped');
    expect(manifest.branch_review.evidence).toContain('Canonical head comparison skipped');
    expect(manifest.pain_points).toHaveLength(10);
    expect(manifest.pain_points[0].source_evidence.every((source: string) => source.startsWith('https://'))).toBe(true);
    expect(manifest.target_customers).toHaveLength(10);
    expect(manifest.outreach_plan.email_script_boundary).toContain('Do not claim buyer-proven 95% confidence');
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
    expect(stdout).toContain('## Buyer Evidence Hard Gate Deficits');
    expect(stdout).toContain('## Buyer Evidence Remediation Queue');
    expect(stdout).toContain('## Supabase Advisor Clearance Deficits');
    expect(stdout).toContain('## Supabase Advisor Remediation Queue');
    expect(stdout).toContain('## Release Toolchain And Approval Deficits');
    expect(stdout).toContain('## Release Preflight Remediation Queue');
    expect(stdout).toContain('## Production Approval Prerequisite Queue');
    expect(stdout).toContain('## Post-Deploy Live Proof Gate Queue');
    expect(stdout).toContain('## Proof Buckets');
    expect(stdout).toContain('## Top 10 Pain Points');
    expect(stdout).toContain('## Top 10 Target Customers Or Segments');
    expect(stdout).toContain('## Outreach Plan');
    expect(stdout).toContain('## Fix Report');
    expect(stdout).toContain('## Adversarial Review');
    expect(stdout).toContain('## Evidence Validation');
    expect(stdout).toContain('## ECC Ledger');
    expect(stdout).toContain('Source provenance:');
    expect(stdout).toContain('Launch blocker action queue');
    expect(stdout).toContain('Source provenance resolution queue');
    expect(stdout).toContain('This queue is a decision aid only');
    expect(stdout).toContain('corepack pnpm run report:production-approval-packet -- --skip-release-readiness');
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
    expect(stdout).toContain('launch evidence validation must pass before a deploy approval request');
    expect(stdout).toContain('Refresh the release toolchain probe ledger');
    expect(stdout).toMatch(/\| 6 \| buyer_evidence \| (?:[1-9]\d*|unknown) buyer hard-gate deficit\(s\) remain \| buyer_operator \|[^|\n]+\| corepack pnpm run validate:pilot-evidence -- path\/to\/register\.csv --require-95 --evidence-root path\/to\/redacted-artifacts \|[^|\n]+\| blocked \|/);
    expect(stdout).toContain('corepack pnpm run check:post-deploy-live');
    expect(stdout).toContain('Do not claim buyer-proven 95% confidence');
    expect(stdout).toContain('Buyer evidence review');
    expect(stdout).toContain('Batchable intake-packet outreach rows');
    expect(stdout).toContain('Buyer hard-gate deficit ledger skipped');
    expect(stdout).toContain('Generated scaffolding, outreach headers, and starter registers do not count as buyer proof.');
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
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('Release preflight remediation queue');
    expect(stdout).toContain('does not install tools');
    expect(stdout).toContain('corepack pnpm run check:release-readiness');
    expect(stdout).toContain('corepack pnpm run check:production-deploy-request');
    expect(stdout).toContain('Production approval prerequisite queue');
    expect(stdout).toContain('| Launch evidence validation |');
    expect(stdout).toContain('not run by this manifest; production approval packet must record pass');
    expect(stdout).toContain('corepack pnpm run check:launch-evidence-manifest');
    expect(stdout).toContain('does not grant owner approval');
    expect(stdout).toContain('Corepack/Git LFS probe ledger');
    expect(stdout).toContain('corepack pnpm run report:launch-evidence-manifest && corepack pnpm run check:release-readiness');
    expect(stdout).toContain('| Explicit owner production approval |');
    expect(stdout).toContain('not granted by this manifest or report');
    expect(stdout).toContain('| Post-deploy live proof boundary |');
    expect(stdout).toContain('not eligible before explicit approved deploy');
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
    expect(stdout).toContain('This ledger is read-only');
    expect(stdout).toContain('corepack pnpm run report:unmerged-branch-readiness');
    expect(stdout).toContain('Review-first branch packets skipped');
    expect(stdout).toContain('Top branch review packet skipped');
    expect(stdout).toContain('Canonical head comparison skipped');
    expect(stdout).toContain('approval_gate=no checkout/merge/deploy/migration/push');
    expect(stdout).toContain('High-risk, local/origin split, or stale/aging unmerged branches');
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
