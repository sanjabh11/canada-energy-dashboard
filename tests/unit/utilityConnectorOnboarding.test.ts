import { describe, expect, it } from 'vitest';
import { buildOntarioUtilityOnboardingPacks, getOntarioFastFollowNote } from '../../src/lib/utilityConnectorOnboarding';

describe('utilityConnectorOnboarding', () => {
  it('builds London Hydro and Alectra registration packs with a custom bridge callback host', () => {
    const packs = buildOntarioUtilityOnboardingPacks({
      publicAppUrl: 'https://app.ceip.energy',
      utilityConnectorBaseUrl: 'https://gb.ceip.energy',
      supabaseUrl: 'https://qnymbecjgeaoxsfphrti.supabase.co',
    });

    expect(packs).toHaveLength(2);
    expect(packs[0]?.login_url).toBe('https://app.ceip.energy/utility-demand-forecast');
    expect(packs[0]?.bridge_base_url).toBe('https://gb.ceip.energy');
    expect(packs[0]?.redirect_uri).toBe('https://gb.ceip.energy/cmd/callback?utility_name=London%20Hydro');
    expect(packs[0]?.callback_forward_target).toContain('/functions/v1/utility-connector-green-button?action=callback');
    expect(packs[0]?.bridge_routes).toEqual(['GET /cmd/callback', 'POST /cmd/token', 'GET /cmd/feed', 'POST /cmd/revoke']);
    expect(packs.map((pack) => pack.utility_name)).toEqual(['London Hydro', 'Alectra Utilities']);
    expect(packs.every((pack) => pack.oauth_espi_scope === 'FB=4_5_15_16')).toBe(true);
    expect(packs.every((pack) => pack.registration_form_categories.includes('Usage Information'))).toBe(true);
    expect(packs.every((pack) => pack.revocation_mode === 'portal_redirect')).toBe(true);
    expect(packs.every((pack) => pack.manage_connections_url.length > 0)).toBe(true);
    expect(packs.every((pack) => pack.demo_script.length >= 5)).toBe(true);
  });

  it('keeps the UtilityAPI fast-follow note explicit', () => {
    expect(getOntarioFastFollowNote()).toContain('UtilityAPI-compatible Ontario utilities');
    expect(getOntarioFastFollowNote()).toContain('not a drop-in env swap');
  });
});
