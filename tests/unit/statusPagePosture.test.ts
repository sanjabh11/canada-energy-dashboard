import { describe, expect, it } from 'vitest';
import { DEPLOYMENT_APPROVAL_CHECKLIST, RELEASE_POSTURE } from '../../src/lib/releasePosture';

describe('status page release posture', () => {
  it('marks production live parity verified only for the current post-deploy live gate evidence', () => {
    const deployPosture = RELEASE_POSTURE.find((item) => item.title.includes('live parity'));

    expect(deployPosture).toBeTruthy();
    expect(deployPosture?.status).toBe('verified');
    expect(deployPosture?.rating).toBe('5.0/5');
    expect(deployPosture?.evidence).toMatch(/6a1fc17dad273f241f9ba768/);
    expect(deployPosture?.evidence).toMatch(/check:post-deploy-live/);
    expect(deployPosture?.evidence).toMatch(/hosted proof-pack route smoke/i);
    expect(deployPosture?.nextAction).toMatch(/current deployed artifact/i);
    expect(deployPosture?.nextAction).toMatch(/after any source or deploy change/i);
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
});
