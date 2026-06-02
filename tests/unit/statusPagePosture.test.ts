import { describe, expect, it } from 'vitest';
import { RELEASE_POSTURE } from '../../src/lib/releasePosture';

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
});
