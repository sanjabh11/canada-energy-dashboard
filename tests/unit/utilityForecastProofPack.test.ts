import { describe, expect, it } from 'vitest';
import {
  buildUtilityForecastPackage,
  generateOntarioPublicUtilitySampleRows,
  generateUtilityLoadSampleRows,
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
} from '../../src/lib/utilityForecasting';
import {
  buildUtilityBenchmarkAppendixMarkdown,
  buildUtilityForecastProofBundle,
  buildUtilityGenericCsv,
  buildUtilityPlanningDescriptor,
} from '../../src/lib/utilityForecastProofPack';

function buildScenario(jurisdiction: 'Ontario' | 'Alberta') {
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median' as const,
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.4 : 1.7,
    committed_load_mw: 4,
    ev_growth_mw: 3,
    heat_pump_growth_mw: 2,
    der_offset_mw: 1.5,
    demand_response_reduction_mw: 1,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
  };
}

describe('utilityForecastProofPack', () => {
  it('keeps starter planning packs advisory when fallback starter data is active', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'hourly'),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'Ontario starter utility load dataset',
      isSampleData: true,
    });

    const bundle = buildUtilityForecastProofBundle(forecastPackage);

    expect(bundle.artifacts[0].claimLabel).toBe('advisory');
    expect(bundle.artifacts[0].isFallback).toBe(true);
    expect(bundle.artifacts[0].sourceManifestId).toBe(forecastPackage.source_manifest.id);
    expect(bundle.artifacts[0].verificationStatus).toBe('needs_buyer_data');
    expect(bundle.artifacts[0].doNotClaim).toContain('Enterprise AI/GPU superiority');
  });

  it('builds an estimated non-fallback planning pack for a connector-grade history import', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Ontario', 'hourly'),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'Ontario CMD interval history',
      isSampleData: false,
      sourceKind: 'green_button_cmd',
      liveSurfaces: [],
    });

    const bundle = buildUtilityForecastProofBundle(forecastPackage);
    const descriptor = buildUtilityPlanningDescriptor(forecastPackage);
    const appendix = buildUtilityBenchmarkAppendixMarkdown(forecastPackage);

    expect(bundle.artifacts[0].claimLabel).toBe('estimated');
    expect(bundle.artifacts[0].isFallback).toBe(false);
    expect(descriptor.sections[3].body).toContain('Attach the benchmark appendix and utility security statement to keep the proof path bounded and explicit.');
    expect(appendix).toContain('- Claim label: estimated');
    expect(appendix).toContain('- Source manifest:');
    expect(appendix).toContain('- Rolling-origin splits:');
    expect(appendix).toContain('- Champion model: transparent_trend_seasonal');
    expect(appendix).toContain('- MAE:');
    expect(appendix).toContain('- MAPE:');
    expect(appendix).toContain('- RMSE:');
    expect(appendix).toContain('- Persistence MAE:');
    expect(appendix).toContain('- Seasonal-naive MAE:');
    expect(appendix).toContain('## Source and fallback labels');
    expect(appendix).toContain('- Fallback: no');
  });

  it('keeps public Ontario sample packs advisory while still exporting benchmark and provenance metadata', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateOntarioPublicUtilitySampleRows(),
      scenario: buildScenario('Ontario'),
      sourceLabel: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.label,
      isSampleData: false,
      sourceKind: 'public_system_sample',
    });

    const bundle = buildUtilityForecastProofBundle(forecastPackage);
    const descriptor = buildUtilityPlanningDescriptor(forecastPackage);
    const appendix = buildUtilityBenchmarkAppendixMarkdown(forecastPackage);
    const csv = buildUtilityGenericCsv(forecastPackage);

    expect(bundle.artifacts[0].claimLabel).toBe('advisory');
    expect(bundle.artifacts[0].isFallback).toBe(false);
    expect(descriptor.sections[0].body).toContain('Source kind: public_system_sample');
    expect(appendix).toContain(ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.disclaimer);
    expect(csv).toContain('# Source Kind: public_system_sample');
    expect(csv).toContain('# Source Manifest:');
    expect(csv).toContain('skill_score_vs_persistence_pct');
  });

  it('marks constructed planning packs explicitly when using a semi-real commercial case', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: generateUtilityLoadSampleRows('Alberta', 'monthly'),
      scenario: buildScenario('Alberta'),
      sourceLabel: 'Constructed Alberta municipal utility planning case',
      isSampleData: false,
      sourceKind: 'uploaded_historical',
      liveSurfaces: [],
    });

    const bundle = buildUtilityForecastProofBundle(forecastPackage, 'constructed_commercial_scenario');
    const appendix = buildUtilityBenchmarkAppendixMarkdown(forecastPackage, 'constructed_commercial_scenario');

    expect(bundle.artifacts[0].claimLabel).toBe('constructed-scenario');
    expect(bundle.artifacts[0].commercialProofState).toBe('constructed_commercial_scenario');
    expect(appendix).toContain('constructed commercial scenario');
  });
});
