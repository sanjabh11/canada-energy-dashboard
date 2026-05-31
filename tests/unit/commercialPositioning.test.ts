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
      'ga-ici-5cp',
      'byo-csv-proof',
      'tier-compliance',
      'tier-credit-banking',
      'asset-health',
      'utility-security',
      'shadow-billing',
    ]);
    expect(topCommercialWedges.map((wedge) => [wedge.id, wedge.score])).toEqual([
      ['utility-demand-forecast', 4.5],
      ['forecast-benchmarking', 4.6],
      ['regulatory-filing', 4.3],
      ['ga-ici-5cp', 4.2],
      ['byo-csv-proof', 4.1],
      ['tier-compliance', 4.0],
      ['tier-credit-banking', 3.9],
      ['asset-health', 4.1],
      ['utility-security', 4.0],
      ['shadow-billing', 3.8],
    ]);
    expect(Math.max(...topCommercialWedges.map((wedge) => wedge.score))).toBeLessThanOrEqual(4.6);
    expect(topCommercialWedges[0].currentState).toContain('public-sample manifest');
    expect(topCommercialWedges[1].proofLabel).toContain('MAE');
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('indigenous-reporting');
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('large-load-readiness');
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('consultant-api-data-pack');
  });

  it('keeps UtilityAPI and broad dashboards behind the proof-pack USP', () => {
    expect(reserveWedges.map((wedge) => wedge.id)).toContain('utilityapi-sandbox');
    expect(reserveWedges.find((wedge) => wedge.id === 'utilityapi-sandbox')?.currentState).toContain('Support surface only');
    expect(supportSurfaces.find((surface) => surface.id === 'utilityapi-sandbox')?.role).toContain('Sandbox-only');
  });
});
