import { describe, expect, it } from 'vitest';
import {
  calculateLandGEMMethane,
  formatLandGEMResults,
} from '../../src/lib/landfillMethaneCalculations';

describe('landfill methane financial evidence gate', () => {
  it('withholds TIER credits, TIER value, offtake revenue, and payback without project evidence', () => {
    const result = calculateLandGEMMethane({
      startYear: 2018,
      currentYear: 2026,
      closeYear: 2026,
      annualAcceptanceRate: 25_000,
      wasteInPlace: 250_000,
      captureEfficiency: 0.6,
    });

    expect(result.tierCreditPotentialTonnes).toBeNull();
    expect(result.tierCreditValueCAD).toBeNull();
    expect(result.potentialRevenue).toBeNull();
    expect(result.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of result.recommendations) {
      expect(recommendation.emissionsReductionTonnesCO2e).toBeNull();
      expect(recommendation.estimatedCostCAD).toBeNull();
      expect(recommendation.tierRevenueCAD).toBeNull();
      expect(recommendation.paybackYears).toBeNull();
    }

    expect(formatLandGEMResults(result).potentialRevenue).toContain('Not calculated');
  });
});
