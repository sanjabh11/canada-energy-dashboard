import { describe, expect, it } from 'vitest';
import {
  DEPLOYMENT_APPROVAL_CHECKLIST,
  RELEASE_HEALTH_EVIDENCE,
  RELEASE_POSTURE,
  SUPABASE_ADVISOR_STATUS_CARD,
} from '../../src/lib/releasePosture';
import { PUBLIC_RELEASE_STATUS_MANIFEST } from '../../src/lib/publicReleaseStatusManifest';

describe('status page release posture', () => {
  it('separates last approved artifact parity from current source live parity', () => {
    const deployPosture = RELEASE_POSTURE.find((item) => item.title === 'Last approved production artifact parity');
    const currentSourceParity = RELEASE_POSTURE.find((item) => item.title === 'Current source live parity');

    expect(deployPosture).toBeTruthy();
    expect(deployPosture?.status).toBe('verified');
    expect(deployPosture?.rating).toBe('5.0/5');
    expect(deployPosture?.evidence).toMatch(/last approved production artifact/i);
    expect(deployPosture?.evidence).toMatch(/hosted proof-pack smoke/i);
    expect(deployPosture?.nextAction).toMatch(/check:post-deploy-live/);
    expect(deployPosture?.nextAction).toMatch(/future source commit/i);
    expect(currentSourceParity?.status).toBe('external_gate');
    expect(currentSourceParity?.rating).toBe('2.0/5');
    expect(currentSourceParity?.evidence).toMatch(/not live-proven/i);
    expect(currentSourceParity?.evidence).toMatch(/explicit owner approval/i);
  });

  it('reports Supabase lint status without treating extension-owned findings as app-owned blockers', () => {
    const supabasePosture = RELEASE_POSTURE.find((item) => item.title.includes('database lint'));

    expect(supabasePosture).toBeTruthy();
    expect(supabasePosture?.status).toBe('watch');
    expect(supabasePosture?.evidence).toMatch(/last recorded/i);
    expect(supabasePosture?.evidence).toMatch(/zero app-owned lint findings/i);
    expect(supabasePosture?.evidence).toMatch(/fresh run must complete/i);
    expect(supabasePosture?.nextAction).toMatch(/check:supabase-app-lint/);
  });

  it('keeps Supabase connector advisor permission separate from CLI lint evidence', () => {
    const advisorPosture = RELEASE_POSTURE.find((item) => item.title.includes('advisor connector'));

    expect(advisorPosture).toBeTruthy();
    expect(advisorPosture?.status).toBe('needs_remediation');
    expect(advisorPosture?.evidence).toMatch(/permission denied/i);
    expect(advisorPosture?.evidence).toMatch(/qnymbecjgeaoxsfphrti/);
    expect(advisorPosture?.evidence).toMatch(/CLI lint works/i);
    expect(advisorPosture?.nextAction).toMatch(/Fix Supabase connector/i);
  });

  it('keeps current source CI as a watch gate rather than production proof', () => {
    const sourcePosture = RELEASE_POSTURE.find((item) => item.title.includes('GitHub release'));
    const sourceEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source CI gate');
    const branchReviewPosture = RELEASE_POSTURE.find((item) => item.title === 'Unmerged branch review queue');

    expect(sourcePosture).toBeTruthy();
    expect(sourcePosture?.status).toBe('watch');
    expect(sourcePosture?.evidence).toMatch(/local source can be ahead of origin or dirty/i);
    expect(sourcePosture?.evidence).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(sourcePosture?.evidence).toMatch(/does not prove production deploy parity/i);
    expect(sourcePosture?.nextAction).toMatch(/report:production-approval-packet/);
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.evidenceBoundary).toMatch(/staged-only, or unstaged source blockers must be checked separately/i);
    expect(branchReviewPosture?.status).toBe('external_gate');
    expect(branchReviewPosture?.evidence).toMatch(/4 high-risk, 3 medium-risk, and 1 low-risk/i);
    expect(branchReviewPosture?.evidence).toMatch(/three review-first branch packets/i);
    expect(branchReviewPosture?.evidence).toMatch(/do not create launch evidence/i);
    expect(branchReviewPosture?.nextAction).toMatch(/review-first packets/i);
  });

  it('exposes public-safe release health evidence without turning source CI into production deploy proof', () => {
    const deployEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Last verified production artifact');
    const latestApprovedParityEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Latest approved production parity');
    const currentSourceParityEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source live parity');
    const sourceEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source CI gate');
    const sourceResolutionQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Source provenance resolution queue');
    const releasePreflightQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Release preflight remediation queue');
    const branchReviewEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Unmerged branch review queue');
    const launchQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Launch blocker action queue');
    const productionApprovalQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Production approval prerequisite queue');
    const postDeployQueueEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Post-deploy live proof gate queue');
    const buyerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence scan');
    const supabaseAdvisorEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase MCP advisors');

    expect(RELEASE_HEALTH_EVIDENCE).toHaveLength(13);
    expect(deployEvidence?.status).toBe('verified');
    expect(deployEvidence?.publicReference?.url).toContain('/deploys');
    expect(deployEvidence?.evidenceBoundary).toMatch(/passed hosted metadata, exact static dist parity, and hosted proof-pack smoke/i);
    expect(latestApprovedParityEvidence?.status).toBe('verified');
    expect(latestApprovedParityEvidence?.command).toContain('check:post-deploy-live');
    expect(latestApprovedParityEvidence?.evidenceBoundary).toMatch(/does not prove future source commits/i);
    expect(currentSourceParityEvidence?.status).toBe('external_gate');
    expect(currentSourceParityEvidence?.command).toContain('report:production-approval-packet');
    expect(currentSourceParityEvidence?.evidenceBoundary).toMatch(/owner approval is explicit/i);
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.command).toContain('gh run list');
    expect(sourceEvidence?.publicReference).toBeUndefined();
    expect(sourceEvidence?.evidenceBoundary).toMatch(/does not prove that production has been redeployed/i);
    expect(sourceEvidence?.evidenceBoundary).toMatch(/staged-only, or unstaged source blockers/i);
    expect(sourceResolutionQueueEvidence?.status).toBe('external_gate');
    expect(sourceResolutionQueueEvidence?.command).toContain('report:production-approval-packet');
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceResolutionQueueEvidence?.evidenceBoundary).toMatch(/prove current local cleanliness/i);
    expect(releasePreflightQueueEvidence?.status).toBe('external_gate');
    expect(releasePreflightQueueEvidence?.command).toContain('report:commercial-launch-readiness');
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/Corepack pnpm resolver, release-readiness execution/i);
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/Git LFS push-path proof/i);
    expect(releasePreflightQueueEvidence?.evidenceBoundary).toMatch(/does not install tools, clear source provenance, run release-readiness/i);
    expect(branchReviewEvidence?.status).toBe('external_gate');
    expect(branchReviewEvidence?.command).toContain('report:unmerged-branch-readiness');
    expect(branchReviewEvidence?.command).toContain('report:launch-evidence-manifest');
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/does not create launch evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/review-first packet evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/merges, checkouts, migrations, or deploys/i);
    expect(launchQueueEvidence?.status).toBe('external_gate');
    expect(launchQueueEvidence?.command).toContain('report:commercial-launch-readiness');
    expect(launchQueueEvidence?.command).toContain('report:launch-evidence-manifest');
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/sequences source provenance, release toolchain, branch review/i);
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/does not deploy, merge, contact buyers/i);
    expect(launchQueueEvidence?.evidenceBoundary).toMatch(/create launch readiness/i);
    expect(productionApprovalQueueEvidence?.status).toBe('external_gate');
    expect(productionApprovalQueueEvidence?.command).toContain('report:commercial-launch-readiness');
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/clean source provenance, Corepack release-readiness/i);
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalQueueEvidence?.evidenceBoundary).toMatch(/claim post-deploy live parity/i);
    expect(postDeployQueueEvidence?.status).toBe('external_gate');
    expect(postDeployQueueEvidence?.command).toContain('report:launch-evidence-manifest');
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/live public metadata, live static dist parity, hosted proof-pack route smoke/i);
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/does not prove current hosted\/live parity/i);
    expect(postDeployQueueEvidence?.evidenceBoundary).toMatch(/mutate Netlify/i);
    expect(buyerEvidence?.status).toBe('external_gate');
    expect(buyerEvidence?.evidenceBoundary).toMatch(/no production buyer-evidence register/i);
    expect(supabaseAdvisorEvidence?.status).toBe('needs_remediation');
    expect(supabaseAdvisorEvidence?.evidenceBoundary).toMatch(/permission denied/i);
    expect(RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase CLI app lint')?.evidenceBoundary).toMatch(/credential\/connectivity-gated/i);
  });

  it('defines a public-safe Supabase advisor status card that separates CLI lint from advisor clearance', () => {
    const cliLint = SUPABASE_ADVISOR_STATUS_CARD.checks.find((check) => check.id === 'cli_app_lint');
    const advisors = SUPABASE_ADVISOR_STATUS_CARD.checks.find((check) => check.id === 'security_performance_advisors');

    expect(SUPABASE_ADVISOR_STATUS_CARD.status).toBe('needs_remediation');
    expect(SUPABASE_ADVISOR_STATUS_CARD.projectRef).toBe('qnymbecjgeaoxsfphrti');
    expect(SUPABASE_ADVISOR_STATUS_CARD.decisionBoundary).toMatch(/separates Supabase CLI database lint/i);
    expect(SUPABASE_ADVISOR_STATUS_CARD.decisionBoundary).toMatch(/does not claim advisor clearance/i);
    expect(SUPABASE_ADVISOR_STATUS_CARD.docsReference.url).toContain('database-advisors');
    expect(SUPABASE_ADVISOR_STATUS_CARD.checks).toHaveLength(2);
    expect(cliLint?.status).toBe('watch');
    expect(cliLint?.evidenceBoundary).toMatch(/does not substitute/i);
    expect(advisors?.status).toBe('needs_remediation');
    expect(advisors?.evidenceBoundary).toMatch(/authorization is fixed/i);
    expect(advisors?.nextAction).toMatch(/rerun security and performance advisors/i);
  });

  it('surfaces the deployment approval checklist without treating deployment as buyer proof', () => {
    const commands = DEPLOYMENT_APPROVAL_CHECKLIST.map((item) => item.command).join('\n');
    const boundaries = DEPLOYMENT_APPROVAL_CHECKLIST.map((item) => item.evidenceBoundary).join('\n');

    expect(DEPLOYMENT_APPROVAL_CHECKLIST).toHaveLength(4);
    expect(commands).toContain('check:production-deploy-request');
    expect(commands).toContain('DEPLOY CEIP PRODUCTION');
    expect(commands).toContain('check:post-deploy-live');
    expect(commands).toContain('validate:pilot-evidence');
    expect(boundaries).toMatch(/not production approval|manual production stop/i);
    expect(boundaries).toMatch(/Deployment never raises market confidence/i);
  });

  it('defines a public-safe release status manifest for the status page', () => {
    const itemIds = PUBLIC_RELEASE_STATUS_MANIFEST.items.map((item) => item.id);
    const currentSourceParityGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'current_source_live_parity');
    const sourceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'current_source_release_gate');
    const provenanceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance');
    const sourceResolutionQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance_resolution_queue');
    const releasePreflightQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'release_preflight_remediation_queue');
    const launchQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'launch_blocker_action_queue');
    const productionApprovalQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'production_approval_prerequisite_queue');
    const postDeployQueueGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'post_deploy_live_proof_gate_queue');
    const branchReviewGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'unmerged_branch_review_queue');
    const buyerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_gate');
    const advisorGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_access');

    expect(PUBLIC_RELEASE_STATUS_MANIFEST.schemaVersion).toBe('ceip.public-release-status.v1');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.publicPath).toBe('/status/release-health.json');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decision).toBe('blocked');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decisionBoundary).toMatch(/does not create buyer evidence/i);
    expect(itemIds).toEqual([
      'deployed_artifact_live_parity',
      'current_source_live_parity',
      'current_source_release_gate',
      'source_provenance',
      'source_provenance_resolution_queue',
      'release_preflight_remediation_queue',
      'launch_blocker_action_queue',
      'production_approval_prerequisite_queue',
      'post_deploy_live_proof_gate_queue',
      'unmerged_branch_review_queue',
      'buyer_evidence_gate',
      'supabase_advisor_access',
    ]);
    expect(currentSourceParityGate?.status).toBe('external_gate');
    expect(currentSourceParityGate?.command).toContain('report:production-approval-packet');
    expect(currentSourceParityGate?.evidenceBoundary).toMatch(/does not prove production parity/i);
    expect(currentSourceParityGate?.nextAction).toMatch(/post-deploy live checks/i);
    expect(sourceGate?.status).toBe('watch');
    expect(sourceGate?.evidenceBoundary).toMatch(/does not prove production deploy parity/i);
    expect(provenanceGate?.command).toContain('report:production-approval-packet');
    expect(provenanceGate?.evidenceBoundary).toMatch(/staged-only, unstaged-only, mixed/i);
    expect(provenanceGate?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(sourceResolutionQueueGate?.status).toBe('external_gate');
    expect(sourceResolutionQueueGate?.command).toContain('report:launch-evidence-manifest');
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/renamed source decisions/i);
    expect(sourceResolutionQueueGate?.evidenceBoundary).toMatch(/does not commit, unstage, stash, revert/i);
    expect(sourceResolutionQueueGate?.nextAction).toMatch(/explicit owner intent/i);
    expect(releasePreflightQueueGate?.status).toBe('external_gate');
    expect(releasePreflightQueueGate?.evidenceBoundary).toMatch(/Corepack pnpm resolver/i);
    expect(releasePreflightQueueGate?.evidenceBoundary).toMatch(/does not install tools/i);
    expect(releasePreflightQueueGate?.nextAction).toMatch(/guarded release-readiness path/i);
    expect(launchQueueGate?.status).toBe('external_gate');
    expect(launchQueueGate?.command).toContain('report:commercial-launch-readiness');
    expect(launchQueueGate?.command).toContain('report:launch-evidence-manifest');
    expect(launchQueueGate?.evidenceBoundary).toMatch(/sequences source provenance, release toolchain, branch review/i);
    expect(launchQueueGate?.evidenceBoundary).toMatch(/does not deploy, merge, contact buyers/i);
    expect(launchQueueGate?.nextAction).toMatch(/Work the queue in order/i);
    expect(productionApprovalQueueGate?.status).toBe('external_gate');
    expect(productionApprovalQueueGate?.evidenceBoundary).toMatch(/Corepack release-readiness/i);
    expect(productionApprovalQueueGate?.evidenceBoundary).toMatch(/does not prove production approval/i);
    expect(productionApprovalQueueGate?.nextAction).toMatch(/Clear every prerequisite row/i);
    expect(postDeployQueueGate?.status).toBe('external_gate');
    expect(postDeployQueueGate?.proofBucket).toBe('hosted/live');
    expect(postDeployQueueGate?.evidenceBoundary).toMatch(/hosted proof-pack route smoke/i);
    expect(postDeployQueueGate?.evidenceBoundary).toMatch(/does not prove current hosted\/live parity/i);
    expect(postDeployQueueGate?.nextAction).toMatch(/check:post-deploy-live passes/i);
    expect(branchReviewGate?.status).toBe('external_gate');
    expect(branchReviewGate?.command).toContain('report:unmerged-branch-readiness');
    expect(branchReviewGate?.command).toContain('report:launch-evidence-manifest');
    expect(branchReviewGate?.evidenceBoundary).toMatch(/does not create launch evidence/i);
    expect(branchReviewGate?.evidenceBoundary).toMatch(/review-first packet summaries/i);
    expect(buyerGate?.status).toBe('external_gate');
    expect(buyerGate?.evidenceBoundary).toMatch(/No buyer-proven market confidence/i);
    expect(advisorGate?.status).toBe('needs_remediation');
    expect(advisorGate?.evidenceBoundary).toMatch(/does not substitute for connector-backed advisors/i);
  });
});
