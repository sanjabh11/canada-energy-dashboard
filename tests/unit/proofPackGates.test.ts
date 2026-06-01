import { describe, expect, it } from 'vitest';
import { buildAssetProofBundle } from '../../src/lib/assetHealthProofPack';
import { buildConsultantProofBundle } from '../../src/lib/consultantProofPack';
import { buildCreditBankingProofBundle } from '../../src/lib/creditBankingProofPack';
import { buildLargeLoadProofBundle } from '../../src/lib/largeLoadReadinessProofPack';
import type { ProofArtifactDefinition } from '../../src/lib/proofPack';
import { buildRegulatoryProofBundle } from '../../src/lib/regulatoryProofPack';
import { buildShadowBillingProofBundle } from '../../src/lib/shadowBillingProofPack';
import { DEFAULT_TIER_PRICING } from '../../src/lib/tierPricing';
import { buildTierProofBundle, type TierProofSnapshot } from '../../src/lib/tierProofPack';
import { buildUtilitySecurityProofBundle } from '../../src/lib/utilitySecurityProofPack';
import {
  buildUtilityForecastPackage,
  generateUtilityLoadSampleRows,
  type UtilityPlanningScenario,
} from '../../src/lib/utilityForecasting';
import { buildUtilityForecastProofBundle } from '../../src/lib/utilityForecastProofPack';

function utilityScenario(): UtilityPlanningScenario {
  return {
    jurisdiction: 'Ontario',
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: 1.4,
    committed_load_mw: 4,
    ev_growth_mw: 3,
    heat_pump_growth_mw: 2,
    der_offset_mw: 1.5,
    demand_response_reduction_mw: 1,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
  };
}

function tierSnapshot(): TierProofSnapshot {
  return {
    annualEmissions: 162000,
    benchmarkExceedance: 24000,
    directInvestCapex: 650000,
    pricing: DEFAULT_TIER_PRICING,
    marketPrice: 27,
    results: {
      fundPayment: 2280000,
      marketCredits: 648000,
      directInvestment: 910000,
      ceipFee: 120000,
      netSavings: 1250000,
      roiPercent: 1041,
      bestOption: 'market_credits',
    },
    simulatorResult: null,
    simulatorSource: 'local_fallback',
    liveTierMarketRateSource: null,
  };
}

function assertProofGates(artifact: ProofArtifactDefinition): void {
  expect(artifact.sourceManifestId, artifact.id).toBeTruthy();
  expect(artifact.verificationStatus, artifact.id).toBeTruthy();
  expect(artifact.doNotClaim.length, artifact.id).toBeGreaterThan(0);
  expect(artifact.boundedClaimsDisclaimer, artifact.id).toBeTruthy();
}

describe('proof-pack metadata gates', () => {
  it('requires manifest, verification, and do-not-claim metadata on sellable proof packs', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'monthly'),
      scenario: utilityScenario(),
      sourceLabel: 'monthly-utility-sample.csv',
      isSampleData: true,
    });

    const artifacts = [
      ...buildUtilityForecastProofBundle(forecastPackage).artifacts,
      ...buildRegulatoryProofBundle('Ontario').artifacts,
      ...buildTierProofBundle(tierSnapshot()).artifacts,
      ...buildCreditBankingProofBundle('starter_ledger', DEFAULT_TIER_PRICING).artifacts,
      ...buildAssetProofBundle(true).artifacts,
      ...buildShadowBillingProofBundle('starter_bills').artifacts,
      ...buildUtilitySecurityProofBundle().artifacts,
      ...buildConsultantProofBundle().artifacts,
      ...buildLargeLoadProofBundle().artifacts,
    ];

    expect(artifacts.length).toBeGreaterThan(20);
    artifacts.forEach(assertProofGates);
  });
});
