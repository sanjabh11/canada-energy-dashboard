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
    const branchReviewEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Unmerged branch review queue');
    const buyerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence scan');
    const supabaseAdvisorEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase MCP advisors');

    expect(RELEASE_HEALTH_EVIDENCE).toHaveLength(8);
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
    expect(branchReviewEvidence?.status).toBe('external_gate');
    expect(branchReviewEvidence?.command).toContain('report:unmerged-branch-readiness');
    expect(branchReviewEvidence?.command).toContain('report:launch-evidence-manifest');
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/does not create launch evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/review-first packet evidence/i);
    expect(branchReviewEvidence?.evidenceBoundary).toMatch(/merges, checkouts, migrations, or deploys/i);
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
