import { describe, expect, it } from 'vitest';
import { DEPLOYMENT_APPROVAL_CHECKLIST, RELEASE_POSTURE } from '../../src/lib/releasePosture';

describe('status page release posture', () => {
  it('does not mark production live parity verified before the post-deploy live gate passes', () => {
    const deployPosture = RELEASE_POSTURE.find((item) => item.title.includes('live parity'));

    expect(deployPosture).toBeTruthy();
    expect(deployPosture?.status).toBe('watch');
    expect(deployPosture?.evidence).toMatch(/check:post-deploy-live/);
    expect(deployPosture?.evidence).toMatch(/after the explicit production deploy/i);
    expect(deployPosture?.nextAction).toMatch(/report:production-approval-packet/);
    expect(deployPosture?.nextAction).toMatch(/owner approval phrase/i);
  });

  it('reports Supabase lint status without treating extension-owned findings as app-owned blockers', () => {
    const supabasePosture = RELEASE_POSTURE.find((item) => item.title.includes('database lint'));

    expect(supabasePosture).toBeTruthy();
    expect(supabasePosture?.status).toBe('watch');
    expect(supabasePosture?.evidence).toMatch(/zero app-owned lint findings/i);
    expect(supabasePosture?.evidence).toMatch(/extension-owned/i);
    expect(supabasePosture?.nextAction).toMatch(/check:supabase-app-lint/);
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
