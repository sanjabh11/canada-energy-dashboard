import { describe, expect, it } from 'vitest';
import { DEPLOYMENT_APPROVAL_CHECKLIST, RELEASE_HEALTH_EVIDENCE, RELEASE_POSTURE } from '../../src/lib/releasePosture';
import { PUBLIC_RELEASE_STATUS_MANIFEST } from '../../src/lib/publicReleaseStatusManifest';

describe('status page release posture', () => {
  it('marks production live parity as verified only after post-deploy live checks pass', () => {
    const deployPosture = RELEASE_POSTURE.find((item) => item.title.includes('live parity'));

    expect(deployPosture).toBeTruthy();
    expect(deployPosture?.status).toBe('verified');
    expect(deployPosture?.rating).toBe('5.0/5');
    expect(deployPosture?.evidence).toMatch(/Production live parity is verified/i);
    expect(deployPosture?.evidence).toMatch(/hosted proof-pack smoke passed/i);
    expect(deployPosture?.nextAction).toMatch(/check:post-deploy-live/);
    expect(deployPosture?.nextAction).toMatch(/future source commit/i);
  });

  it('reports Supabase lint status without treating extension-owned findings as app-owned blockers', () => {
    const supabasePosture = RELEASE_POSTURE.find((item) => item.title.includes('database lint'));

    expect(supabasePosture).toBeTruthy();
    expect(supabasePosture?.status).toBe('watch');
    expect(supabasePosture?.evidence).toMatch(/zero app-owned lint findings/i);
    expect(supabasePosture?.evidence).toMatch(/extension-owned/i);
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

    expect(sourcePosture).toBeTruthy();
    expect(sourcePosture?.status).toBe('watch');
    expect(sourcePosture?.evidence).toMatch(/local source can be ahead of origin or dirty/i);
    expect(sourcePosture?.evidence).toMatch(/does not prove production deploy parity/i);
    expect(sourcePosture?.nextAction).toMatch(/git status --porcelain=v1 --branch/);
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.evidenceBoundary).toMatch(/local ahead-of-origin work must be checked separately/i);
  });

  it('exposes public-safe release health evidence without turning source CI into production deploy proof', () => {
    const deployEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Last verified production artifact');
    const productionParityEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current production parity gate');
    const sourceEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Current source CI gate');
    const buyerEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Buyer evidence scan');
    const supabaseAdvisorEvidence = RELEASE_HEALTH_EVIDENCE.find((item) => item.label === 'Supabase MCP advisors');

    expect(RELEASE_HEALTH_EVIDENCE).toHaveLength(6);
    expect(deployEvidence?.status).toBe('verified');
    expect(deployEvidence?.publicReference?.url).toContain('/deploys');
    expect(deployEvidence?.evidenceBoundary).toMatch(/passed hosted metadata, exact static dist parity, and hosted proof-pack smoke/i);
    expect(productionParityEvidence?.status).toBe('verified');
    expect(productionParityEvidence?.command).toContain('check:post-deploy-live');
    expect(productionParityEvidence?.evidenceBoundary).toMatch(/exact static dist parity/i);
    expect(sourceEvidence?.status).toBe('watch');
    expect(sourceEvidence?.command).toContain('gh run list');
    expect(sourceEvidence?.publicReference).toBeUndefined();
    expect(sourceEvidence?.evidenceBoundary).toMatch(/does not prove that production has been redeployed/i);
    expect(buyerEvidence?.status).toBe('external_gate');
    expect(buyerEvidence?.evidenceBoundary).toMatch(/no production buyer-evidence register/i);
    expect(supabaseAdvisorEvidence?.status).toBe('needs_remediation');
    expect(supabaseAdvisorEvidence?.evidenceBoundary).toMatch(/permission denied/i);
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
    const sourceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'current_source_release_gate');
    const provenanceGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'source_provenance');
    const buyerGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'buyer_evidence_gate');
    const advisorGate = PUBLIC_RELEASE_STATUS_MANIFEST.items.find((item) => item.id === 'supabase_advisor_access');

    expect(PUBLIC_RELEASE_STATUS_MANIFEST.schemaVersion).toBe('ceip.public-release-status.v1');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.publicPath).toBe('/status/release-health.json');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decision).toBe('blocked');
    expect(PUBLIC_RELEASE_STATUS_MANIFEST.decisionBoundary).toMatch(/does not create buyer evidence/i);
    expect(itemIds).toEqual([
      'deployed_artifact_live_parity',
      'current_source_release_gate',
      'source_provenance',
      'buyer_evidence_gate',
      'supabase_advisor_access',
    ]);
    expect(sourceGate?.status).toBe('watch');
    expect(sourceGate?.evidenceBoundary).toMatch(/does not prove production deploy parity/i);
    expect(provenanceGate?.command).toContain('git status --porcelain=v1 --branch');
    expect(provenanceGate?.evidenceBoundary).toMatch(/does not prove current local cleanliness/i);
    expect(buyerGate?.status).toBe('external_gate');
    expect(buyerGate?.evidenceBoundary).toMatch(/No buyer-proven market confidence/i);
    expect(advisorGate?.status).toBe('needs_remediation');
    expect(advisorGate?.evidenceBoundary).toMatch(/does not substitute for connector-backed advisors/i);
  });
});
