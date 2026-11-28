import { describe, expect, it } from 'vitest';
import {
  calculateLandGEMMethane,
  formatLandGEMResults,
  LANDGEM_SCREENING_LABEL,
} from '../../src/lib/landfillMethaneCalculations';

const SCREENING_TEXT = 'screening estimate — not a compliance or credit-issuance assessment';

describe('landfill methane screening boundary (audit G16)', () => {
  it('labels every calculation result as a screening estimate', () => {
    const result = calculateLandGEMMethane({
      startYear: 2018,
      currentYear: 2026,
      closeYear: 2026,
      annualAcceptanceRate: 25_000,
      wasteInPlace: 250_000,
      captureEfficiency: 0.6,
    });
    expect(result.screeningLabel).toBe(LANDGEM_SCREENING_LABEL);
    expect(result.screeningLabel).toBe(SCREENING_TEXT);
    // No issued credits, revenue certainty, or conformance claims.
    expect(result.tierCreditPotentialTonnes).toBeNull();
    expect(result.tierCreditValueCAD).toBeNull();
    expect(result.potentialRevenue).toBeNull();
  });

  it('carries the screening label into formatted/exported output', () => {
    const result = calculateLandGEMMethane({
      startYear: 2020,
      currentYear: 2026,
      captureEfficiency: 0.5,
    });
    const formatted = formatLandGEMResults(result);
    expect(formatted.screeningLabel).toBe(LANDGEM_SCREENING_LABEL);
    expect(Object.values(formatted).join('\n')).toContain(SCREENING_TEXT);
  });
});
