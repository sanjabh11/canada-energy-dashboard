import { describe, expect, it } from 'vitest';
import {
  reserveWedges,
  supportSurfaces,
  topCommercialWedges,
} from '../../src/lib/commercialPositioning';

describe('commercial positioning realignment', () => {
  it('leads with the top ten sellable CEIP proof packs in priority order', () => {
    expect(topCommercialWedges.map((wedge) => wedge.id)).toEqual([
      'utility-demand-forecast',
      'forecast-benchmarking',
      'regulatory-filing',
      'tier-compliance',
      'tier-credit-banking',
      'asset-health',
      'utility-security',
      'shadow-billing',
      'large-load-readiness',
      'consultant-api-data-pack',
    ]);
    expect(topCommercialWedges.slice(0, 3).every((wedge) => wedge.score === 5)).toBe(true);
    expect(topCommercialWedges[0].currentState).toContain('public-sample manifest');
    expect(topCommercialWedges[1].proofLabel).toContain('MAE');
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('indigenous-reporting');
  });

  it('keeps UtilityAPI and broad dashboards behind the proof-pack USP', () => {
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('utilityapi-sandbox');
    expect(reserveWedges.find((wedge) => wedge.id === 'utilityapi-sandbox')?.currentState).toContain('Support surface only');
    expect(supportSurfaces.find((surface) => surface.id === 'utilityapi-sandbox')?.role).toContain('Sandbox-only');
  });
});
