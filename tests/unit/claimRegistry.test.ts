import { describe, expect, it } from 'vitest';
import { PROOF_PACK_REGISTRY, getClaimForRoute } from '../../src/lib/claimRegistry';

describe('claim registry metadata checks', () => {
  it('contains exactly the top 10 sellable proof packs', () => {
    const keys = Object.keys(PROOF_PACK_REGISTRY);
    expect(keys.length).toBe(10);
    expect(keys).toContain('utility-demand-forecast');
    expect(keys).toContain('forecast-benchmarking');
    expect(keys).toContain('regulatory-filing');
    expect(keys).toContain('ga-ici-5cp');
    expect(keys).toContain('byo-csv-proof');
    expect(keys).toContain('roi-calculator');
    expect(keys).toContain('credit-banking');
    expect(keys).toContain('asset-health');
    expect(keys).toContain('utility-security');
    expect(keys).toContain('shadow-billing');
  });

  it('correctly maps routes to registry values', () => {
    const forecastClaim = getClaimForRoute('/utility-demand-forecast');
    expect(forecastClaim).toBeDefined();
    expect(forecastClaim?.id).toBe('utility-demand-forecast');
    expect(forecastClaim?.claimStatus).toBe('hybrid');
    expect(forecastClaim?.primaryBuyer).toContain('LDCs');

    const invalidClaim = getClaimForRoute('/non-existent-route');
    expect(invalidClaim).toBeUndefined();
  });

  it('enforces claim boundaries and do-not-claim lists', () => {
    for (const key of Object.keys(PROOF_PACK_REGISTRY)) {
      const claim = PROOF_PACK_REGISTRY[key];
      expect(claim.boundary).toBeTruthy();
      expect(claim.doNotClaim.length).toBeGreaterThan(0);
      expect(claim.sources.length).toBeGreaterThan(0);
      expect(claim.freshnessSLA).toBeTruthy();
    }
  });
});
