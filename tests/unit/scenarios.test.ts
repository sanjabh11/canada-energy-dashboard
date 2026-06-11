import { describe, expect, it } from 'vitest';
import {
  ScenarioSchema,
  calculateConfigHash,
} from '../../src/lib/validators/scenarios';

describe('Scenario Core Validation and Hashing', () => {
  const validScenario = {
    id: 'd8c728e8-d652-40dc-ba55-6b6f00db12f6',
    name: 'Ontario Net-Zero 2050',
    description: 'Decarbonizing Ontario electricity grid by 2050 with nuclear buildout.',
    jurisdiction: 'Ontario',
    horizonYears: [2026, 2030, 2040, 2050],
    sectors: ['electricity', 'transportation'],
    technologies: ['nuclear', 'wind', 'solar', 'storage'],
    policyLevers: {
      carbonTaxPerTonne: 170,
      cleanElectricityStandardYear: 2035,
    },
    macroAssumptions: {
      gdpGrowthPct: 1.8,
      populationMillions: 16.5,
    },
    demandAssumptions: {
      evAdoptionPct: 80,
      heatPumpAdoptionPct: 60,
    },
    reliabilityAssumptions: {
      capacityReserveMarginPct: 15,
    },
    affordabilityAssumptions: {
      maximumRateIncreasePct: 5,
    },
    createdAt: new Date().toISOString(),
  };

  it('validates a correct scenario successfully', () => {
    const result = ScenarioSchema.safeParse(validScenario);
    expect(result.success).toBe(true);
  });

  it('fails validation on invalid scenario parameters', () => {
    const invalidScenario = {
      ...validScenario,
      name: '', // should fail (empty)
      horizonYears: [1999], // should fail (below 2020)
    };
    const result = ScenarioSchema.safeParse(invalidScenario);
    expect(result.success).toBe(false);
  });

  it('calculates deterministic hashes irrespective of key order', async () => {
    const objA = {
      carbonTax: 170,
      horizon: [2030, 2040],
      meta: { author: 'sanjay', version: 'v1' },
    };

    const objB = {
      meta: { version: 'v1', author: 'sanjay' },
      horizon: [2030, 2040],
      carbonTax: 170,
    };

    const hashA = await calculateConfigHash(objA);
    const hashB = await calculateConfigHash(objB);

    expect(hashA).toBe(hashB);
    expect(hashA.length).toBe(64); // SHA-256 hex length
  });
});
