import { describe, expect, it } from 'vitest';
import { AssetType, ClimateHazard, RESILIENCE_FUSION_METHOD, resilienceEngine } from '../../src/lib/resilienceScoring';

describe('resilience fusion metadata', () => {
  it('exposes limiting factor and fusion method on resilience assessments', () => {
    const assessment = resilienceEngine.assessOverallResilience(
      {
        id: 'asset-1',
        name: 'Demo Substation',
        assetType: AssetType.POWER_GRID,
        currentCondition: 8,
        latitude: 45,
        longitude: -75,
        criticalDependents: 12000,
      },
      {
        [ClimateHazard.FLOODING]: 75,
        [ClimateHazard.WILDFIRE]: 25,
        [ClimateHazard.HURRICANE]: 45,
        [ClimateHazard.SEA_LEVEL_RISE]: 60,
        [ClimateHazard.EXTREME_HEAT]: 80,
        [ClimateHazard.DROUGHT]: 35,
        [ClimateHazard.LANDSLIDE]: 15,
        [ClimateHazard.EROSION]: 50,
      },
    );

    expect(assessment.fusionMethod).toBe(RESILIENCE_FUSION_METHOD);
    expect(assessment.limitingFactor).toBe(ClimateHazard.FLOODING);
    expect(assessment.limitingFactorLabel).toBe('Flooding');
    expect(assessment.overallScore).toBeGreaterThan(0);
  });
});
