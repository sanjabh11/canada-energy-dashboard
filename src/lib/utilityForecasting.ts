import { calculatePersistenceBaseline, calculateSeasonalNaiveBaseline } from './forecastBaselines';
import type { ForecastMetrics } from './demandForecaster';
import {
  buildLiveSurfaceContract,
  type LiveSurfaceContract,
  type LiveSurfaceSourceKind,
  UTILITY_ASSUMPTION_PACK_VERSION,
} from './liveSurfaceContract';
import { createProvenance, type ProvenanceMetadata } from './types/provenance';
import type {
  AUC_DSP_DataSchedule_Row,
  OEB_DSP_LoadForecast_Row,
  OEB_DSP_Reliability_Row,
  OEB_DSP_ScenarioMatrix_Row,
} from './regulatoryTemplates';

import {
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  PUBLIC_SOURCE_TRANSFORM_VERSION,
  sortRows,
  parseUtilityHistoricalLoadCsv,
  parseIesoPublicDemandCsv,
} from './utilityCsvParser';
import {
  utilityRowsToCsv,
  utilityForecastPackageToCsv,
  utilityForecastPackageToAlbertaCsv,
} from './utilityCsvSerializer';
import {
  buildUtilityStarterCsv,
  buildOntarioPublicUtilitySampleCsv,
  buildOntarioPublicUtilitySampleManifestMarkdown,
  generateUtilityLoadSampleRows,
  generateOntarioPublicUtilitySampleRows,
} from './utilitySampleData';

// Re-export all shared types for backward compatibility
export type {
  UtilityJurisdiction,
  UtilityInputGranularity,
  UtilityWeatherCase,
  UtilityGeographyLevel,
  UtilityInputSourceKind,
  UtilityStressTestMode,
  UtilityQualityFlag,
  UtilityHistoricalLoadRow,
  UtilityLargePointLoad,
  UtilityIndustrialOptOut,
  UtilityTouShiftRule,
  UtilityPlanningScenario,
  UtilityDataSummary,
  UtilityForecastYear,
  UtilityForecastCase,
  UtilityScenarioMatrix,
  UtilityGeographyAllocation,
  Utility8760ProfilePoint,
  Utility8760Profile,
  UtilityReliabilityHorizon,
  UtilityReliabilityProxy,
  UtilityHostingCapacityWarning,
  UtilityInputProvenanceSummary,
  UtilityRegulatoryExports,
  PublicSourceManifest,
  ForecastEvidenceSplit,
  ForecastEvidenceReport,
  UtilityForecastPackage,
  PublicUtilitySampleManifest,
} from './types/utilityForecasting';

// Re-export parser and serializer functions for backward compatibility
export {
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  parseUtilityHistoricalLoadCsv,
  parseIesoPublicDemandCsv,
} from './utilityCsvParser';
export {
  utilityRowsToCsv,
  utilityForecastPackageToCsv,
  utilityForecastPackageToAlbertaCsv,
} from './utilityCsvSerializer';
export {
  buildUtilityStarterCsv,
  buildOntarioPublicUtilitySampleCsv,
  buildOntarioPublicUtilitySampleManifestMarkdown,
  generateUtilityLoadSampleRows,
  generateOntarioPublicUtilitySampleRows,
} from './utilitySampleData';

import type {
  UtilityJurisdiction,
  UtilityInputGranularity,
  UtilityWeatherCase,
  UtilityGeographyLevel,
  UtilityInputSourceKind,
  UtilityStressTestMode,
  UtilityQualityFlag,
  UtilityHistoricalLoadRow,
  UtilityPlanningScenario,
  UtilityDataSummary,
  UtilityForecastYear,
  UtilityForecastCase,
  UtilityScenarioMatrix,
  UtilityGeographyAllocation,
  Utility8760ProfilePoint,
  Utility8760Profile,
  UtilityReliabilityHorizon,
  UtilityReliabilityProxy,
  UtilityHostingCapacityWarning,
  UtilityInputProvenanceSummary,
  UtilityRegulatoryExports,
  PublicSourceManifest,
  ForecastEvidenceSplit,
  ForecastEvidenceReport,
  UtilityForecastPackage,
  PublicUtilitySampleManifest,
} from './types/utilityForecasting';

interface AggregatedIntervalPoint {
  timestamp: string;
  demand_mw: number;
  customer_count: number;
  temperature_c: number | null;
  gross_demand_mw: number;
  quality_flags: UtilityQualityFlag[];
}

interface UtilityQualityAssessment {
  qualityCounts: Array<{ flag: UtilityQualityFlag; count: number }>;
  warnings: string[];
  grossReconstitutionApplied: boolean;
  totalFlags: number;
}

const DEFAULT_PLANNING_YEARS = [1, 5, 10];
const DEFAULT_HOSTING_CAPACITY_LIMIT_MW = 3.5;
const UTILITY_FORECAST_MODEL_VERSION = 'transparent-trend-seasonal-v2';

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function buildSourceManifest(params: {
  sourceLabel: string;
  sourceKind: UtilityInputSourceKind;
  rows: UtilityHistoricalLoadRow[];
  summary: UtilityDataSummary;
}): PublicSourceManifest {
  const sampledRows = params.rows.length > 6000
    ? [
        ...params.rows.slice(0, 2000),
        ...params.rows.slice(Math.max(0, Math.floor(params.rows.length / 2) - 1000), Math.floor(params.rows.length / 2) + 1000),
        ...params.rows.slice(-2000),
      ]
    : params.rows;
  const serialized = sampledRows
    .map((row) => [
      row.timestamp,
      row.geography_id,
      row.demand_mw,
      row.net_load_mw ?? '',
      row.gross_load_mw ?? '',
      row.source_system ?? '',
    ].join('|'))
    .join('\n');
  const hashInput = `${params.rows.length}:${params.summary.date_range.start}:${params.summary.date_range.end}\n${serialized}`;
  const isPublicSystemSample = params.sourceKind === 'public_system_sample';
  const isFallbackStarter = params.sourceKind === 'fallback_starter';

  return {
    id: isPublicSystemSample
      ? ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id
      : `utility-source-${params.sourceKind}-${stableHash(`${params.sourceLabel}:${hashInput}`).slice(-8)}`,
    sourceUrl: isPublicSystemSample
      ? ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_url
      : isFallbackStarter
        ? 'local://ceip/starter-utility-load-template'
        : 'owner-supplied://utility-load-history',
    sourceFile: isPublicSystemSample
      ? ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_file
      : params.sourceLabel,
    fetchedAt: params.summary.date_range.end,
    hash: stableHash(hashInput),
    transformVersion: isPublicSystemSample ? PUBLIC_SOURCE_TRANSFORM_VERSION : UTILITY_ASSUMPTION_PACK_VERSION,
    sourceKind: params.sourceKind,
    disclaimer: isPublicSystemSample
      ? ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.disclaimer
      : isFallbackStarter
        ? 'Starter workflow proof only. Replace with buyer utility history before using the pack as customer evidence.'
        : 'Owner-supplied or connector-derived utility history. Validate custody, completeness, and authorization before external use.',
  };
}

export function buildUtilityForecastPackage(params: {
  rows: UtilityHistoricalLoadRow[];
  scenario: UtilityPlanningScenario;
  sourceLabel: string;
  isSampleData?: boolean;
  sourceKind?: UtilityInputSourceKind;
  liveSurfaces?: LiveSurfaceContract[];
}): UtilityForecastPackage {
  const rows = prepareRows(sortRows(params.rows));
  const qualityAssessment = assessInputQuality(rows);
  const highlightedYears = uniqueSortedYears(params.scenario.planning_horizon_years ?? DEFAULT_PLANNING_YEARS);
  const summary = summarizeRows(rows);
  const aggregated = aggregateIntervals(rows);
  const benchmarkResult = buildBenchmarkMetricsWithFallback(aggregated, summary.granularity);
  const benchmark = benchmarkResult.metrics;
  const weatherFactor = estimateWeatherFactor(aggregated, params.scenario.weather_case, params.scenario.stress_test_mode ?? 'none');
  const maxYear = Math.max(...highlightedYears, 10);
  const capacityMw = round(summary.baseline_peak_mw * (1 + params.scenario.capacity_buffer_pct / 100), 2);
  const sourceKind = params.sourceKind ?? (params.isSampleData ? 'fallback_starter' : 'uploaded_historical');
  const isPublicSystemSample = sourceKind === 'public_system_sample';

  const expectedCase = buildForecastCase({
    label: 'expected',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: params.scenario.annual_load_growth_pct,
    weatherFactor,
    maxYear,
    capacityMw,
  });
  const lowCase = buildForecastCase({
    label: 'low',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: Math.max(0, params.scenario.annual_load_growth_pct - 0.75),
    weatherFactor: Math.max(0.98, weatherFactor - 0.02),
    maxYear,
    capacityMw,
  });
  const highCase = buildForecastCase({
    label: 'high',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: params.scenario.annual_load_growth_pct + 0.75,
    weatherFactor: weatherFactor + 0.03,
    maxYear,
    capacityMw,
  });

  const scenarioMatrix: UtilityScenarioMatrix = {
    low: lowCase,
    base: expectedCase,
    high: highCase,
  };
  const deferredPeakLoadMw = computeDeferredPeakLoad(params.scenario);
  const geographyAllocations = reconcileGeographyAllocations(
    rows,
    expectedCase,
    highlightedYears,
    params.scenario,
    params.scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW,
  );
  const reliabilityProxy = buildReliabilityProxy(
    expectedCase,
    capacityMw,
    weatherFactor,
    qualityAssessment,
    params.scenario.stress_test_mode ?? 'none',
  );
  const oebRows = buildOebRows(params.scenario.jurisdiction, expectedCase, capacityMw);
  const reliabilityRows = buildReliabilityRows(reliabilityProxy);
  const scenarioMatrixRows = buildScenarioMatrixRows(scenarioMatrix, reliabilityProxy);
  const albertaDspRows = buildAucDspRows(expectedCase, geographyAllocations, params.scenario, reliabilityProxy);
  const hostingCapacityWarnings = buildHostingCapacityWarnings(
    geographyAllocations,
    params.scenario,
    highlightedYears,
  );
  const profiles8760 = build8760Profiles(
    aggregated,
    summary,
    scenarioMatrix,
    highlightedYears,
    params.scenario,
  );
  const warnings: string[] = [...benchmarkResult.warnings];

  if (summary.granularity === 'monthly') {
    warnings.push('Monthly input runs on a planning-timescale model; 8,760-hour profiles are synthesized from seasonal shape assumptions.');
  }
  if (summary.interval_count < 12) {
    warnings.push('Forecast confidence is limited because fewer than 12 intervals are available.');
  }
  if (params.isSampleData) {
    warnings.push('Starter data is illustrative and should be replaced with utility history for production use.');
  }
  if (isPublicSystemSample) {
    warnings.push('Public-derived Ontario system sample is workflow proof only; it is not customer LDC history or production utility telemetry.');
  }
  if (qualityAssessment.warnings.length > 0) {
    warnings.push(...qualityAssessment.warnings);
  }
  if (hostingCapacityWarnings.length > 0) {
    warnings.push(`Hosting capacity review required for ${hostingCapacityWarnings.length} projected feeder scenario(s).`);
  }

  const assumptions = [
    `${params.scenario.jurisdiction} utility planning lane uses a transparent statistical forecast, not an AI-only model.`,
    `${params.scenario.weather_case === 'extreme' ? 'Extreme' : 'Median'} weather case applies a ${(weatherFactor * 100).toFixed(1)}% peak multiplier based on observed temperature sensitivity${params.scenario.stress_test_mode && params.scenario.stress_test_mode !== 'none' ? ` under ${params.scenario.stress_test_mode.replace(/_/g, ' ')} stress assumptions` : ''}.`,
    `Base case assumes ${params.scenario.annual_load_growth_pct.toFixed(2)}% annual load growth plus explicit overlays for committed load, EVs, heat pumps, DER offsets, demand response, and ToU shifts.`,
    `Geography allocations are reconciled to the top-line forecast using recent interval shares across ${summary.geography_count} ${summary.geography_count === 1 ? 'geography' : 'geographies'}.`,
    `Benchmark proof is derived from a holdout backtest against persistence and seasonal-naive baselines.`,
    `Forecast evidence uses rolling-origin validation and conformal interval coverage when enough intervals are available.`,
    `8,760-hour profile previews are generated for the expected case only; low and high cases remain annual scenario rows unless a full grid-planning export is added.`,
    `Live-surface contract version ${UTILITY_ASSUMPTION_PACK_VERSION} captures source, observed_at, freshness_status, is_fallback, quality_flags, and assumption pack version.`,
  ];
  if (isPublicSystemSample) {
    assumptions.push(`Ontario public sample manifest ${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id} links to ${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_url} and must remain labeled as not customer LDC history.`);
  }
  if ((params.scenario.large_point_loads?.length ?? 0) > 0) {
    assumptions.push(`Large point-load overlay adds ${(params.scenario.large_point_loads ?? []).reduce((sum, item) => sum + item.mw, 0).toFixed(1)} MW of named non-organic demand.`);
  }
  if ((params.scenario.industrial_opt_outs?.length ?? 0) > 0) {
    assumptions.push(`Industrial opt-out overlay removes ${(params.scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0).toFixed(1)} MW from the grid-served planning case.`);
  }

  const inputSurface = buildLiveSurfaceContract({
    source: params.sourceLabel,
    observedAt: summary.date_range.end,
    isFallback: sourceKind === 'fallback_starter' || params.isSampleData,
    qualityFlags: qualityAssessment.qualityCounts.filter((entry) => entry.count > 0).map((entry) => entry.flag),
    sourceKind,
    assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
    staleAfterHours: sourceKind === 'telemetry_gateway'
      ? 24
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch'
        ? 24 * 7
        : sourceKind === 'green_button_cmd'
          ? 24 * 2
          : sourceKind === 'public_system_sample'
            ? 24 * 365
          : 24 * 30,
    notes: sourceKind === 'utility_system_batch'
      ? 'Normalized batch snapshot from utility operational systems.'
      : sourceKind === 'utility_settlement_batch'
        ? 'Settlement or MDM-compatible batch normalized into the utility planning contract.'
        : sourceKind === 'green_button_cmd'
          ? 'Ontario Green Button Connect My Data interval history normalized into the planning contract.'
          : sourceKind === 'public_system_sample'
            ? `${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.label}; ${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.disclaimer}`
          : sourceKind === 'telemetry_gateway'
            ? 'Northbound telemetry gateway snapshot from external SCADA or edge integration.'
            : sourceKind === 'uploaded_historical'
              ? 'User-provided historical utility dataset.'
              : 'Starter dataset for workflow validation.',
  });
  const liveSurfaces = [inputSurface, ...(params.liveSurfaces ?? [])];
  const inputProvenanceSummary: UtilityInputProvenanceSummary = {
    source_kind: sourceKind,
    assumption_pack_version: UTILITY_ASSUMPTION_PACK_VERSION,
    live_surfaces: liveSurfaces,
    quality_counts: qualityAssessment.qualityCounts,
    gross_reconstitution_applied: qualityAssessment.grossReconstitutionApplied,
    source_systems: Array.from(new Set(rows.map((row) => row.source_system).filter(Boolean) as string[])).sort(),
    total_quality_flags: qualityAssessment.totalFlags,
  };
  const sourceManifest = buildSourceManifest({
    sourceLabel: params.sourceLabel,
    sourceKind,
    rows,
    summary,
  });
  const evidenceReport = buildForecastEvidenceReport({
    aggregated,
    rows,
    granularity: summary.granularity,
    benchmark,
    warnings,
  });

  const provenance = createProvenance(
    params.isSampleData
      ? 'mock'
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch' || sourceKind === 'green_button_cmd'
        ? 'calibrated'
        : sourceKind === 'public_system_sample'
          ? 'historical_archive'
        : 'historical_archive',
    params.sourceLabel,
    params.isSampleData
      ? 0.58
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch'
        ? 0.9
        : sourceKind === 'green_button_cmd'
          ? 0.88
          : sourceKind === 'public_system_sample'
            ? 0.72
          : sourceKind === 'telemetry_gateway'
            ? 0.84
            : 0.87,
    {
      completeness: 1,
      notes: params.isSampleData
        ? 'Utility planning starter dataset loaded locally for workflow validation.'
        : sourceKind === 'utility_system_batch'
          ? 'Utility operational batch snapshot normalized into the planning contract.'
          : sourceKind === 'utility_settlement_batch'
            ? 'Settlement or MDM-compatible utility export used to build the planning forecast package.'
            : sourceKind === 'green_button_cmd'
              ? 'Green Button Connect My Data interval history used to build the planning forecast package.'
              : sourceKind === 'public_system_sample'
                ? `${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_derivation_note} ${ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.disclaimer}`
              : sourceKind === 'telemetry_gateway'
                ? 'Telemetry gateway snapshot blended into the planning truth contract for live utility context.'
                : 'Uploaded utility historical load data used to build the planning forecast package.',
    },
  );

  return {
    jurisdiction: params.scenario.jurisdiction,
    generated_at: new Date().toISOString(),
    provenance,
    source_label: params.sourceLabel,
    source_manifest: sourceManifest,
    summary,
    scenario: params.scenario,
    benchmark,
    evidence_report: evidenceReport,
    cases: {
      low: lowCase,
      expected: expectedCase,
      high: highCase,
    },
    scenario_matrix: scenarioMatrix,
    highlighted_years: highlightedYears,
    geography_allocations: geographyAllocations,
    reliability_proxy: reliabilityProxy,
    profiles_8760: profiles8760,
    deferred_peak_load_mw: deferredPeakLoadMw,
    hosting_capacity_warnings: hostingCapacityWarnings,
    input_provenance_summary: inputProvenanceSummary,
    regulatory_exports: {
      ontario: {
        load_forecast_rows: oebRows,
        reliability_rows: reliabilityRows,
        scenario_matrix_rows: scenarioMatrixRows,
      },
      alberta: {
        data_schedule_rows: albertaDspRows,
      },
    },
    assumptions,
    warnings: evidenceReport.warnings,
    oeb_rows: oebRows,
  };
}

function buildOebRows(
  jurisdiction: UtilityJurisdiction,
  expectedCase: UtilityForecastCase,
  capacityMw: number,
): OEB_DSP_LoadForecast_Row[] {
  const rows = expectedCase.yearly
    .filter((year) => year.year <= 5)
    .map((year) => ({
      year: new Date().getUTCFullYear() + year.year,
      zone: jurisdiction === 'Ontario' ? 'Primary planning zone' : 'Distribution planning zone',
      peak_demand_mw: year.peak_demand_mw,
      energy_gwh: year.annual_energy_gwh,
      customer_count: year.customer_count,
      growth_rate_pct: year.growth_rate_pct,
      capacity_mw: capacityMw,
      utilization_pct: year.utilization_pct,
      load_transfer_capability_mw: round(capacityMw * 0.15, 2),
      notes: year.utilization_pct >= 80 ? 'Planning review trigger: utilization exceeds 80%.' : '',
    }));

  return rows;
}

function prepareRows(rows: UtilityHistoricalLoadRow[]): UtilityHistoricalLoadRow[] {
  const merged = new Map<string, UtilityHistoricalLoadRow & { _count: number }>();

  rows.forEach((inputRow) => {
    const normalizedFlags = new Set<UtilityQualityFlag>(inputRow.quality_flags ?? []);
    const effectiveGross = Number.isFinite(inputRow.gross_load_mw ?? Number.NaN)
      ? Number(inputRow.gross_load_mw)
      : null;
    const useGross = effectiveGross !== null && effectiveGross > 0 && effectiveGross >= inputRow.demand_mw;
    const preparedRow: UtilityHistoricalLoadRow = {
      ...inputRow,
      demand_mw: useGross ? round(effectiveGross ?? inputRow.demand_mw, 3) : round(inputRow.demand_mw, 3),
      gross_reconstituted_mw: useGross ? round(effectiveGross ?? inputRow.demand_mw, 3) : inputRow.gross_reconstituted_mw ?? null,
      quality_flags: Array.from(
        useGross ? normalizedFlags.add('gross_reconstituted') : normalizedFlags,
      ),
    };
    const key = `${preparedRow.timestamp}|${preparedRow.geography_level}|${preparedRow.geography_id}|${preparedRow.customer_class}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...preparedRow, _count: 1 });
      return;
    }

    const nextCount = existing._count + 1;
    const mergedFlags = new Set<UtilityQualityFlag>([
      ...(existing.quality_flags ?? []),
      ...(preparedRow.quality_flags ?? []),
      'duplicate_interval',
    ]);
    merged.set(key, {
      ...existing,
      demand_mw: round((existing.demand_mw * existing._count + preparedRow.demand_mw) / nextCount, 3),
      net_load_mw: averageOptional(existing.net_load_mw, preparedRow.net_load_mw, existing._count, nextCount),
      gross_load_mw: averageOptional(existing.gross_load_mw, preparedRow.gross_load_mw, existing._count, nextCount),
      gross_reconstituted_mw: averageOptional(
        existing.gross_reconstituted_mw,
        preparedRow.gross_reconstituted_mw,
        existing._count,
        nextCount,
      ),
      temperature_c: averageOptional(existing.temperature_c, preparedRow.temperature_c, existing._count, nextCount),
      customer_count: Math.max(Number(existing.customer_count ?? 0), Number(preparedRow.customer_count ?? 0)),
      source_system: existing.source_system ?? preparedRow.source_system,
      feeder_id: existing.feeder_id ?? preparedRow.feeder_id,
      substation_id: existing.substation_id ?? preparedRow.substation_id,
      quality_flags: Array.from(mergedFlags),
      _count: nextCount,
    });
  });

  return sortRows(Array.from(merged.values()).map(({ _count: _ignored, ...row }) => row));
}

function assessInputQuality(rows: UtilityHistoricalLoadRow[]): UtilityQualityAssessment {
  const counts = new Map<UtilityQualityFlag, number>();
  const grouped = new Map<string, UtilityHistoricalLoadRow[]>();

  const increment = (flag: UtilityQualityFlag, amount = 1) => {
    counts.set(flag, (counts.get(flag) ?? 0) + amount);
  };

  rows.forEach((row) => {
    (row.quality_flags ?? []).forEach((flag) => increment(flag));
    const groupKey = `${row.geography_level}|${row.geography_id}|${row.customer_class}`;
    const group = grouped.get(groupKey) ?? [];
    group.push(row);
    grouped.set(groupKey, group);
  });

  grouped.forEach((groupRows) => {
    const sorted = sortRows(groupRows);
    let flatlineRun = 1;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousDemand = previous.gross_reconstituted_mw ?? previous.demand_mw;
      const currentDemand = current.gross_reconstituted_mw ?? current.demand_mw;
      const ratio = previousDemand > 0 ? currentDemand / previousDemand : 1;
      const absoluteDelta = Math.abs(currentDemand - previousDemand);
      const temperatureDelta = Math.abs((current.temperature_c ?? 0) - (previous.temperature_c ?? 0));
      const priorCustomers = Number(previous.customer_count ?? 0);
      const currentCustomers = Number(current.customer_count ?? 0);

      if (Math.abs(currentDemand - previousDemand) < 0.02) {
        flatlineRun += 1;
      } else {
        flatlineRun = 1;
      }
      if (flatlineRun === 8) {
        increment('flatline_segment');
      }

      if (previousDemand > 0 && absoluteDelta > Math.max(6, previousDemand * 0.55) && (ratio > 1.75 || ratio < 0.35)) {
        increment('impossible_spike');
      }
      if (previousDemand > 0 && absoluteDelta > Math.max(4, previousDemand * 0.28) && temperatureDelta < 3 && Math.abs(currentCustomers - priorCustomers) < Math.max(25, priorCustomers * 0.02)) {
        increment('load_transfer_jump');
      }
    }
  });

  const qualityCounts = ([
    'duplicate_interval',
    'negative_load',
    'flatline_segment',
    'impossible_spike',
    'load_transfer_jump',
    'customer_count_missing',
    'missing_temperature',
    'net_exceeds_gross',
    'gross_reconstituted',
  ] as UtilityQualityFlag[]).map((flag) => ({ flag, count: counts.get(flag) ?? 0 }));

  const warnings = qualityCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => {
      switch (entry.flag) {
        case 'duplicate_interval':
          return `${entry.count} duplicate interval row(s) were merged before forecasting.`;
        case 'flatline_segment':
          return `${entry.count} flatline segment(s) were detected in historical load data.`;
        case 'impossible_spike':
          return `${entry.count} potential spike anomaly/anomalies exceed expected load-step thresholds.`;
        case 'load_transfer_jump':
          return `${entry.count} potential load-transfer jump(s) were detected with limited weather/customer explanation.`;
        case 'gross_reconstituted':
          return `${entry.count} row(s) used gross-load reconstitution to restore behind-the-meter suppressed baseline demand.`;
        default:
          return `${entry.count} ${entry.flag.replace(/_/g, ' ')} issue(s) detected in the input dataset.`;
      }
    });

  return {
    qualityCounts,
    warnings,
    grossReconstitutionApplied: (counts.get('gross_reconstituted') ?? 0) > 0,
    totalFlags: qualityCounts.reduce((sum, entry) => sum + entry.count, 0),
  };
}

function reconcileGeographyAllocations(
  rows: UtilityHistoricalLoadRow[],
  expectedCase: UtilityForecastCase,
  highlightedYears: number[],
  scenario: UtilityPlanningScenario,
  hostingCapacityLimitMw: number,
): UtilityGeographyAllocation[] {
  const recentRows = rows.slice(-Math.min(rows.length, 24 * 14 * 6));
  const shares = new Map<string, { peak: number; geography_level: UtilityGeographyLevel; customer_class: string }>();
  let totalPeak = 0;

  for (const row of recentRows) {
    const key = `${row.geography_level}|${row.geography_id}|${row.customer_class}`;
    const existing = shares.get(key) ?? {
      peak: 0,
      geography_level: row.geography_level,
      customer_class: row.customer_class,
    };
    existing.peak += row.demand_mw;
    shares.set(key, existing);
    totalPeak += row.demand_mw;
  }

  if (totalPeak <= 0) return [];

  const allocations: UtilityGeographyAllocation[] = [];
  for (const horizonYear of highlightedYears) {
    const target = expectedCase.yearly.find((year) => year.year === horizonYear);
    if (!target) continue;

    const entries = Array.from(shares.entries());
    const rawAllocations = entries.map(([key, value]) => {
      const share = value.peak / totalPeak;
      const [, geographyId, customerClass] = key.split('|');
      const pointLoadMw = (scenario.large_point_loads ?? [])
        .filter((item) => item.geography_id === geographyId && item.geography_level === value.geography_level)
        .reduce((sum, item) => sum + item.mw, 0);
      const industrialOptOutMw = (scenario.industrial_opt_outs ?? [])
        .filter((item) => item.geography_id === geographyId && item.geography_level === value.geography_level)
        .reduce((sum, item) => sum + item.mw, 0);
      const projectedDerMw = Math.max(0, scenario.der_offset_mw * share);

      return {
        geographyId,
        geographyLevel: value.geography_level,
        customerClass,
        sharePct: round(share * 100, 2),
        rawPeakMw: target.peak_demand_mw * share + pointLoadMw - industrialOptOutMw,
        constrained: projectedDerMw > hostingCapacityLimitMw || pointLoadMw > hostingCapacityLimitMw * 3,
      };
    });

    const rawTotal = rawAllocations.reduce((sum, entry) => sum + Math.max(0, entry.rawPeakMw), 0);
    let allocatedMw = 0;
    rawAllocations.forEach((entry, index) => {
      const normalizedPeak = rawTotal > 0 ? target.peak_demand_mw * (Math.max(0, entry.rawPeakMw) / rawTotal) : 0;
      const peakMw = index === rawAllocations.length - 1
        ? round(target.peak_demand_mw - allocatedMw, 3)
        : round(normalizedPeak, 3);
      allocatedMw += peakMw;
      allocations.push({
        horizon_year: horizonYear,
        geography_id: entry.geographyId,
        geography_level: entry.geographyLevel,
        customer_class: entry.customerClass,
        share_pct: entry.sharePct,
        peak_demand_mw: peakMw,
        constrained: entry.constrained,
      });
    });
  }

  return allocations;
}

function buildForecastCase(params: {
  label: UtilityForecastCase['label'];
  aggregated: AggregatedIntervalPoint[];
  summary: UtilityDataSummary;
  scenario: UtilityPlanningScenario;
  annualGrowthPct: number;
  weatherFactor: number;
  maxYear: number;
  capacityMw: number;
}): UtilityForecastCase {
  const pointLoadMw = (params.scenario.large_point_loads ?? []).reduce(
    (sum, item) => sum + item.mw * Math.max(0.25, item.load_factor_pct / 100),
    0,
  );
  const industrialOptOutMw = (params.scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0);
  const touPeakShiftMw = (params.scenario.tou_shift_rules ?? []).reduce((sum, rule) => {
    const fromHours = Math.max(1, rule.from_hour_end - rule.from_hour_start + 1);
    const toHours = Math.max(1, rule.to_hour_end - rule.to_hour_start + 1);
    const shiftableMw = params.scenario.ev_growth_mw * (rule.shift_pct / 100);
    return sum + Math.max(0, shiftableMw * (1 / fromHours - 0.35 / toHours));
  }, 0);
  const additiveMwPerYear = (
    params.scenario.committed_load_mw
    + params.scenario.ev_growth_mw
    + params.scenario.heat_pump_growth_mw
    + pointLoadMw
    - params.scenario.der_offset_mw
    - params.scenario.demand_response_reduction_mw
    - industrialOptOutMw
    - touPeakShiftMw
  ) / Math.max(params.maxYear, 1);
  const customerGrowthFactor = 1 + params.annualGrowthPct * 0.004;
  const drShiftAdjustment = 1 - (params.scenario.demand_response_shift_pct / 400 + touPeakShiftMw / Math.max(params.summary.baseline_peak_mw, 1));
  const weatherStressAdder = params.scenario.stress_test_mode === 'polar_vortex'
    ? 0.035
    : params.scenario.stress_test_mode === 'heat_wave'
      ? 0.02
      : params.scenario.stress_test_mode === 'ice_storm'
        ? 0.025
        : 0;

  const yearly: UtilityForecastYear[] = [];
  for (let year = 1; year <= params.maxYear; year += 1) {
    const growthMultiplier = Math.pow(1 + params.annualGrowthPct / 100, year);
    const additiveMw = additiveMwPerYear * year;
    const peakDemand = round(
      params.summary.baseline_peak_mw * growthMultiplier * (params.weatherFactor + weatherStressAdder) * Math.max(0.76, drShiftAdjustment) + additiveMw,
      2,
    );
    const annualEnergy = round(
      params.summary.baseline_energy_gwh * Math.pow(1 + params.annualGrowthPct / 100, year)
        + additiveMw * 8.76 * 0.44
        + pointLoadMw * 8.76 * 0.52
        - industrialOptOutMw * 8.76 * 0.38,
      2,
    );
    const customerCount = round(
      params.summary.latest_customer_count > 0
        ? params.summary.latest_customer_count * Math.pow(customerGrowthFactor, year)
        : 0,
      0,
    );
    const utilization = params.capacityMw > 0 ? round((peakDemand / params.capacityMw) * 100, 1) : 0;

    yearly.push({
      year,
      peak_demand_mw: peakDemand,
      annual_energy_gwh: annualEnergy,
      customer_count: customerCount,
      growth_rate_pct: round(params.annualGrowthPct, 2),
      scenario_delta_mw: round(additiveMw, 2),
      utilization_pct: utilization,
      weather_factor: round(params.weatherFactor, 4),
    });
  }

  return {
    label: params.label,
    annual_growth_pct: round(params.annualGrowthPct, 2),
    yearly,
  };
}

function estimateWeatherFactor(
  aggregated: AggregatedIntervalPoint[],
  weatherCase: UtilityWeatherCase,
  stressTestMode: UtilityStressTestMode,
): number {
  if (weatherCase === 'median' && stressTestMode === 'none') return 1;

  const withTemperature = aggregated.filter((point) => Number.isFinite(point.temperature_c ?? Number.NaN));
  if (withTemperature.length < 24) {
    return round(1.01 + (weatherCase === 'extreme' ? 0.03 : 0) + stressModeAdder(stressTestMode), 4);
  }

  const meanDemand = withTemperature.reduce((sum, point) => sum + point.demand_mw, 0) / withTemperature.length;
  const weatherDriven = withTemperature.reduce((sum, point) => {
    const delta = Math.abs((point.temperature_c ?? 18) - 18);
    return sum + delta * point.demand_mw;
  }, 0) / withTemperature.length;

  const normalizedStress = meanDemand > 0 ? weatherDriven / meanDemand : 0.04;
  const caseAdder = weatherCase === 'extreme' ? 0.018 : 0;
  return round(1 + Math.min(0.09, normalizedStress * 0.0035) + caseAdder + stressModeAdder(stressTestMode), 4);
}

function summarizeRows(rows: UtilityHistoricalLoadRow[]): UtilityDataSummary {
  if (rows.length === 0) {
    throw new Error('At least one historical load row is required.');
  }

  const aggregated = aggregateIntervals(rows);
  const demandValues = aggregated.map((point) => point.demand_mw);
  const customerClasses = Array.from(new Set(rows.map((row) => row.customer_class))).sort();
  const geographies = Array.from(new Set(rows.map((row) => row.geography_id))).sort();
  const latestCustomerCount = aggregated.at(-1)?.customer_count ?? 0;
  const granularity = detectGranularity(aggregated);
  const hoursPerInterval = granularity === 'monthly' ? 730 : 1;
  const totalEnergyMwh = aggregated.reduce((sum, point) => sum + point.demand_mw * hoursPerInterval, 0);

  return {
    row_count: rows.length,
    interval_count: aggregated.length,
    granularity,
    date_range: {
      start: aggregated[0].timestamp,
      end: aggregated[aggregated.length - 1].timestamp,
    },
    geography_count: geographies.length,
    geographies,
    customer_classes: customerClasses,
    latest_customer_count: round(latestCustomerCount, 0),
    baseline_peak_mw: round(Math.max(...demandValues), 2),
    baseline_energy_gwh: round(totalEnergyMwh / 1000, 2),
    weather_zones: Array.from(new Set(rows.map((row) => row.weather_zone).filter(Boolean) as string[])).sort(),
  };
}

function aggregateIntervals(rows: UtilityHistoricalLoadRow[]): AggregatedIntervalPoint[] {
  const points = new Map<string, AggregatedIntervalPoint>();

  for (const row of rows) {
    const key = row.timestamp;
    const existing = points.get(key) ?? {
      timestamp: row.timestamp,
      demand_mw: 0,
      customer_count: 0,
      temperature_c: null,
      gross_demand_mw: 0,
      quality_flags: [],
    };

    const effectiveDemand = row.gross_reconstituted_mw ?? row.demand_mw;
    existing.demand_mw += effectiveDemand;
    existing.gross_demand_mw += row.gross_load_mw ?? effectiveDemand;
    existing.customer_count += Number(row.customer_count ?? 0);
    if (existing.temperature_c === null && Number.isFinite(row.temperature_c ?? Number.NaN)) {
      existing.temperature_c = row.temperature_c ?? null;
    }
    existing.quality_flags = Array.from(new Set([...existing.quality_flags, ...(row.quality_flags ?? [])]));

    points.set(key, existing);
  }

  return Array.from(points.values()).sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function buildBaseHourlyShape(
  aggregated: AggregatedIntervalPoint[],
  summary: UtilityDataSummary,
): number[] {
  if (summary.granularity === 'hourly' && aggregated.length > 0) {
    const trimmed = aggregated.slice(0, Math.min(aggregated.length, 8760)).map((point) => point.demand_mw);
    if (trimmed.length >= 24) return trimmed;
  }

  const series: number[] = [];
  const seasonalByMonth = [0.9, 0.88, 0.92, 0.97, 1, 1.03, 1.08, 1.06, 1.01, 0.98, 0.95, 0.91];
  for (let day = 0; day < 365; day += 1) {
    const month = Math.min(11, Math.floor(day / 30.5));
    for (let hour = 0; hour < 24; hour += 1) {
      const morningShoulder = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI) * 0.2);
      const eveningPeak = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI) * 0.26);
      const overnightFloor = 0.68;
      series.push(round(summary.baseline_peak_mw * seasonalByMonth[month] * (overnightFloor + morningShoulder + eveningPeak), 3));
    }
  }
  return series;
}

function computeDeferredPeakLoad(scenario: UtilityPlanningScenario): number {
  const touDeferral = (scenario.tou_shift_rules ?? []).reduce(
    (sum, rule) => sum + scenario.ev_growth_mw * (rule.shift_pct / 100) * 0.12,
    0,
  );
  return round(Math.max(0, scenario.demand_response_reduction_mw + touDeferral), 2);
}

function buildReliabilityProxy(
  expectedCase: UtilityForecastCase,
  capacityMw: number,
  weatherFactor: number,
  qualityAssessment: UtilityQualityAssessment,
  stressTestMode: UtilityStressTestMode,
): UtilityReliabilityProxy {
  const baselineSaidiMinutes = expectedCase.label === 'expected' ? 106 : 110;
  const baselineSaifi = 1.14;
  const qualityPenalty = Math.min(18, qualityAssessment.totalFlags * 0.45);
  const stressPenalty = stressModeAdder(stressTestMode) * 100;

  const horizonScores = expectedCase.yearly.map((year) => {
    const reserveHeadroomMw = round(capacityMw - year.peak_demand_mw, 2);
    const utilizationPenalty = Math.max(0, year.utilization_pct - 72) * 0.85;
    const score = clamp(round(91 - utilizationPenalty - qualityPenalty - stressPenalty - Math.max(0, (weatherFactor - 1) * 85), 1), 30, 96);
    const band: UtilityReliabilityHorizon['band'] = score >= 82
      ? 'stable'
      : score >= 68
        ? 'watch'
        : score >= 52
          ? 'strained'
          : 'critical';

    return {
      horizon_year: year.year,
      score,
      band,
      peak_utilization_pct: year.utilization_pct,
      reserve_headroom_mw: reserveHeadroomMw,
      weather_stress_pct: round((weatherFactor - 1 + stressModeAdder(stressTestMode)) * 100, 2),
    };
  });

  return {
    current_score: horizonScores[0]?.score ?? 0,
    horizon_scores: horizonScores,
    baseline_saidi_minutes: baselineSaidiMinutes,
    baseline_saifi: baselineSaifi,
  };
}

function buildReliabilityRows(reliabilityProxy: UtilityReliabilityProxy): OEB_DSP_Reliability_Row[] {
  const first = reliabilityProxy.horizon_scores[0];
  const last = reliabilityProxy.horizon_scores.at(-1);
  const trend: OEB_DSP_Reliability_Row['trend'] = (last?.score ?? 0) >= (first?.score ?? 0)
    ? 'stable'
    : (last?.score ?? 0) >= (first?.score ?? 0) - 6
      ? 'declining'
      : 'declining';

  return [
    {
      metric: 'SAIDI proxy',
      unit: 'minutes/customer',
      current_year: round(reliabilityProxy.baseline_saidi_minutes, 1),
      prior_year_1: round(reliabilityProxy.baseline_saidi_minutes - 4, 1),
      prior_year_2: round(reliabilityProxy.baseline_saidi_minutes - 7, 1),
      prior_year_3: round(reliabilityProxy.baseline_saidi_minutes - 9, 1),
      oeb_target: 90,
      industry_avg: 104,
      trend,
    },
    {
      metric: 'SAIFI proxy',
      unit: 'interruptions/customer',
      current_year: round(reliabilityProxy.baseline_saifi, 2),
      prior_year_1: round(reliabilityProxy.baseline_saifi - 0.04, 2),
      prior_year_2: round(reliabilityProxy.baseline_saifi - 0.08, 2),
      prior_year_3: round(reliabilityProxy.baseline_saifi - 0.1, 2),
      oeb_target: 1,
      industry_avg: 1.12,
      trend,
    },
    {
      metric: 'Peak utilization proxy',
      unit: 'percent',
      current_year: first?.peak_utilization_pct ?? 0,
      prior_year_1: Math.max(0, (first?.peak_utilization_pct ?? 0) - 2),
      prior_year_2: Math.max(0, (first?.peak_utilization_pct ?? 0) - 4),
      prior_year_3: Math.max(0, (first?.peak_utilization_pct ?? 0) - 6),
      oeb_target: 80,
      industry_avg: 76,
      trend,
    },
  ];
}

function buildScenarioMatrixRows(
  scenarioMatrix: UtilityScenarioMatrix,
  reliabilityProxy: UtilityReliabilityProxy,
): OEB_DSP_ScenarioMatrix_Row[] {
  const exportedYears = uniqueSortedYears(
    scenarioMatrix.base.yearly
      .map((row) => row.year)
      .filter((year) => year === 1 || year === 5 || year === 10 || year === scenarioMatrix.base.yearly.at(-1)?.year),
  );
  const cases: Array<{ key: 'low' | 'base' | 'high'; forecast: UtilityForecastCase }> = [
    { key: 'low', forecast: scenarioMatrix.low },
    { key: 'base', forecast: scenarioMatrix.base },
    { key: 'high', forecast: scenarioMatrix.high },
  ];

  return exportedYears.flatMap((horizonYear) => {
    const baseYear = scenarioMatrix.base.yearly.find((row) => row.year === horizonYear);
    const reliability = reliabilityProxy.horizon_scores.find((row) => row.horizon_year === horizonYear);

    return cases.map(({ key, forecast }) => {
      const scenarioYear = forecast.yearly.find((row) => row.year === horizonYear);
      return {
        horizon_year: horizonYear,
        scenario: key,
        peak_demand_mw: scenarioYear?.peak_demand_mw ?? 0,
        annual_energy_gwh: scenarioYear?.annual_energy_gwh ?? 0,
        delta_vs_base_mw: round((scenarioYear?.peak_demand_mw ?? 0) - (baseYear?.peak_demand_mw ?? 0), 2),
        reliability_proxy_score: reliability?.score ?? reliabilityProxy.current_score,
        notes: key === 'base'
          ? 'Primary planning case.'
          : key === 'high'
            ? 'High-electrification / stress planning case.'
            : 'Conservative downside planning case.',
      };
    });
  });
}

function buildAucDspRows(
  expectedCase: UtilityForecastCase,
  allocations: UtilityGeographyAllocation[],
  scenario: UtilityPlanningScenario,
  reliabilityProxy: UtilityReliabilityProxy,
): AUC_DSP_DataSchedule_Row[] {
  return allocations.map((allocation) => {
    const year = expectedCase.yearly.find((entry) => entry.year === allocation.horizon_year);
    const reliability = reliabilityProxy.horizon_scores.find((entry) => entry.horizon_year === allocation.horizon_year);
    const share = allocation.share_pct / 100;
    const largePointLoadMw = (scenario.large_point_loads ?? [])
      .filter((item) => item.geography_id === allocation.geography_id && item.geography_level === allocation.geography_level)
      .reduce((sum, item) => sum + item.mw, 0);
    const industrialOptOutMw = (scenario.industrial_opt_outs ?? [])
      .filter((item) => item.geography_id === allocation.geography_id && item.geography_level === allocation.geography_level)
      .reduce((sum, item) => sum + item.mw, 0);
    const deferredPeakLoadMw = round(computeDeferredPeakLoad(scenario) * share, 2);

    return {
      horizon_year: allocation.horizon_year,
      geography_id: allocation.geography_id,
      geography_level: allocation.geography_level,
      peak_demand_mw: allocation.peak_demand_mw,
      annual_energy_gwh: round((year?.annual_energy_gwh ?? 0) * share, 2),
      customer_count: round((year?.customer_count ?? 0) * share, 0),
      growth_rate_pct: year?.growth_rate_pct ?? 0,
      large_point_load_mw: round(largePointLoadMw, 2),
      industrial_opt_out_mw: round(industrialOptOutMw, 2),
      der_offset_mw: round(scenario.der_offset_mw * share, 2),
      deferred_peak_load_mw: deferredPeakLoadMw,
      reliability_proxy_score: reliability?.score ?? reliabilityProxy.current_score,
      hosting_capacity_limit_mw: round(scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW, 2),
      notes: allocation.constrained
        ? 'Review local constraints before filing the DSP schedule.'
        : 'Allocation reconciled from utility-wide planning case.',
    };
  });
}

function buildHostingCapacityWarnings(
  allocations: UtilityGeographyAllocation[],
  scenario: UtilityPlanningScenario,
  highlightedYears: number[],
): UtilityHostingCapacityWarning[] {
  const limit = scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW;
  return allocations
    .filter((allocation) => highlightedYears.includes(allocation.horizon_year))
    .map((allocation) => {
      const projectedDerMw = round(scenario.der_offset_mw * (allocation.share_pct / 100), 2);
      const severity: UtilityHostingCapacityWarning['severity'] =
        projectedDerMw > limit * 1.25 || allocation.constrained ? 'critical' : 'warning';
      return {
        horizon_year: allocation.horizon_year,
        geography_id: allocation.geography_id,
        geography_level: allocation.geography_level,
        projected_der_mw: projectedDerMw,
        limit_mw: round(limit, 2),
        severity,
        message: projectedDerMw > limit
          ? `Projected DER of ${projectedDerMw.toFixed(2)} MW exceeds the planning hosting-capacity limit of ${limit.toFixed(2)} MW.`
          : '',
      };
    })
    .filter((warning) => warning.projected_der_mw > warning.limit_mw);
}

function build8760Profiles(
  aggregated: AggregatedIntervalPoint[],
  summary: UtilityDataSummary,
  scenarioMatrix: UtilityScenarioMatrix,
  highlightedYears: number[],
  scenario: UtilityPlanningScenario,
): Utility8760Profile[] {
  const profileHours = 8760;
  const baseSeries = buildBaseHourlyShape(aggregated, summary);
  // Keep this scoped to expected-case previews. Low/high annual cases stay in the
  // scenario matrix until the product has a full 8760 grid-planning export.
  const cases: UtilityForecastCase[] = [scenarioMatrix.base];

  return cases.flatMap((forecastCase) =>
    highlightedYears.map((horizonYear) => {
      const year = forecastCase.yearly.find((entry) => entry.year === horizonYear);
      const baselinePeak = Math.max(summary.baseline_peak_mw, 1);
      const scale = (year?.peak_demand_mw ?? baselinePeak) / baselinePeak;
      const yearStartMs = Date.UTC(new Date().getUTCFullYear() + horizonYear, 0, 1, 0, 0, 0);
      const pointLoadMw = (scenario.large_point_loads ?? []).reduce(
        (sum, item) => sum + item.mw * Math.max(0.25, item.load_factor_pct / 100),
        0,
      );
      const industrialOptOutMw = (scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0);
      const points: Utility8760ProfilePoint[] = [];

      for (let hourIndex = 0; hourIndex < profileHours; hourIndex += 1) {
        const baseMw = baseSeries[hourIndex % baseSeries.length] * scale;
        const timestamp = new Date(yearStartMs + hourIndex * 3600_000).toISOString();
        const hour = hourIndex % 24;
        const demandResponseMw = hour >= 16 && hour <= 20 ? scenario.demand_response_reduction_mw : 0;
        const derOffsetMw = hour >= 10 && hour <= 16 ? scenario.der_offset_mw * 0.72 : scenario.der_offset_mw * 0.08;
        const touShiftDeltaMw = (scenario.tou_shift_rules ?? []).reduce((sum, rule) => {
          const shiftMw = scenario.ev_growth_mw * (rule.shift_pct / 100);
          if (hour >= rule.from_hour_start && hour <= rule.from_hour_end) return sum - shiftMw / Math.max(1, rule.from_hour_end - rule.from_hour_start + 1);
          if (hour >= rule.to_hour_start && hour <= rule.to_hour_end) return sum + shiftMw / Math.max(1, rule.to_hour_end - rule.to_hour_start + 1);
          return sum;
        }, 0);
        const forecastMw = round(
          Math.max(0, baseMw + pointLoadMw - industrialOptOutMw - derOffsetMw - demandResponseMw + touShiftDeltaMw),
          3,
        );

        points.push({
          timestamp,
          forecast_mw: forecastMw,
          point_load_mw: round(pointLoadMw, 3),
          industrial_opt_out_mw: round(industrialOptOutMw, 3),
          der_offset_mw: round(derOffsetMw, 3),
          demand_response_mw: round(demandResponseMw, 3),
          tou_shift_delta_mw: round(touShiftDeltaMw, 3),
        });
      }

      return {
        case_label: forecastCase.label,
        horizon_year: horizonYear,
        points,
      };
    }),
  );
}

function buildBenchmarkMetrics(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastMetrics {
  if (granularity === 'hourly' && aggregated.length < 24 * 21) {
    throw new Error('Insufficient data for backtesting');
  }

  return buildSimpleSeriesMetrics(aggregated, granularity);
}

function buildBenchmarkMetricsWithFallback(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): { metrics: ForecastMetrics; warnings: string[] } {
  try {
    return {
      metrics: buildBenchmarkMetrics(aggregated, granularity),
      warnings: [],
    };
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'unknown benchmark failure';
    return {
      metrics: buildSimpleSeriesMetrics(aggregated, granularity),
      warnings: [`Benchmark backtest fallback applied: ${reason}.`],
    };
  }
}

function quantile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentile * sorted.length) - 1));
  return sorted[index];
}

function intervalScore(actual: number, forecast: number, halfWidth: number, alpha = 0.1): number {
  const lower = forecast - halfWidth;
  const upper = forecast + halfWidth;
  const width = upper - lower;
  const lowerMissPenalty = actual < lower ? (2 / alpha) * (lower - actual) : 0;
  const upperMissPenalty = actual > upper ? (2 / alpha) * (actual - upper) : 0;
  return width + lowerMissPenalty + upperMissPenalty;
}

function buildRollingEvidenceSplit(
  splitId: string,
  train: AggregatedIntervalPoint[],
  test: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastEvidenceSplit {
  const maxTrainRows = granularity === 'monthly' ? 60 : 24 * 90;
  const validationTrain = train.slice(-maxTrainRows);
  const trainValues = validationTrain.map((point) => point.demand_mw);
  const { slope, intercept } = linearRegression(trainValues.map((_, index) => index), trainValues);
  const seasonal = buildSeasonalProfile(validationTrain, granularity);
  const predictions = test.map((point, index) => round(
    intercept + slope * (validationTrain.length + index) + lookupSeasonalComponent(point.timestamp, seasonal, granularity),
    2,
  ));
  const actuals = test.map((point) => point.demand_mw);
  const persistenceMetrics = calculatePersistenceBaseline([...trainValues, ...actuals], 1);
  const seasonalMetrics = calculateSeasonalNaiveBaseline(
    [...trainValues, ...actuals],
    1,
    granularity === 'monthly' ? 12 : 24,
  );
  const metrics = computeMetrics(actuals, predictions, persistenceMetrics, seasonalMetrics);
  const errors = actuals.map((actual, index) => Math.abs(actual - predictions[index]));
  const conformalWidth = quantile(errors, 0.9);
  const covered = conformalWidth > 0
    ? actuals.filter((actual, index) => Math.abs(actual - predictions[index]) <= conformalWidth).length
    : actuals.length;
  const meanIntervalScore = actuals.length > 0
    ? actuals.reduce((sum, actual, index) => (
        sum + intervalScore(actual, predictions[index], conformalWidth)
      ), 0) / actuals.length
    : 0;

  return {
    split_id: splitId,
    train_start: validationTrain[0]?.timestamp ?? '',
    train_end: validationTrain[validationTrain.length - 1]?.timestamp ?? '',
    test_start: test[0]?.timestamp ?? '',
    test_end: test[test.length - 1]?.timestamp ?? '',
    train_count: validationTrain.length,
    test_count: test.length,
    mae: metrics.mae,
    mape: metrics.mape,
    rmse: metrics.rmse,
    persistence_mae: metrics.persistence_mae,
    seasonal_naive_mae: metrics.seasonal_naive_mae,
    interval_coverage_pct: actuals.length > 0 ? round((covered / actuals.length) * 100, 2) : 0,
    mean_interval_score_mw: round(meanIntervalScore, 2),
  };
}

function buildRollingOriginSplits(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastEvidenceSplit[] {
  const testSize = granularity === 'monthly' ? 3 : 24;
  const minTrain = granularity === 'monthly' ? 12 : 24 * 14;
  if (aggregated.length < minTrain + testSize) return [];

  const maxSplits = 3;
  const availableSplits = Math.min(maxSplits, Math.floor((aggregated.length - minTrain) / testSize));
  const splits: ForecastEvidenceSplit[] = [];
  for (let index = 0; index < availableSplits; index += 1) {
    const trainEnd = aggregated.length - (availableSplits - index) * testSize;
    const testEnd = trainEnd + testSize;
    const train = aggregated.slice(0, trainEnd);
    const test = aggregated.slice(trainEnd, testEnd);
    if (train.length >= minTrain && test.length > 0) {
      splits.push(buildRollingEvidenceSplit(`rolling-origin-${index + 1}`, train, test, granularity));
    }
  }
  return splits;
}

function buildHierarchyReconciliation(rows: UtilityHistoricalLoadRow[]): ForecastEvidenceReport['hierarchy_reconciliation'] {
  const geographyCount = new Set(rows.map((row) => row.geography_id)).size;
  if (geographyCount <= 1) {
    return {
      status: 'single_geography',
      max_reconciliation_error_mw: 0,
      geography_count: geographyCount,
    };
  }

  const byTimestamp = new Map<string, { system: number; child: number; hasSystem: boolean; hasChild: boolean }>();
  rows.forEach((row) => {
    const current = byTimestamp.get(row.timestamp) ?? { system: 0, child: 0, hasSystem: false, hasChild: false };
    if (row.geography_level === 'system') {
      current.system += row.demand_mw;
      current.hasSystem = true;
    } else {
      current.child += row.demand_mw;
      current.hasChild = true;
    }
    byTimestamp.set(row.timestamp, current);
  });

  const comparable = Array.from(byTimestamp.values()).filter((entry) => entry.hasSystem && entry.hasChild);
  if (comparable.length === 0) {
    return {
      status: 'needs_review',
      max_reconciliation_error_mw: 0,
      geography_count: geographyCount,
    };
  }

  const maxError = Math.max(...comparable.map((entry) => Math.abs(entry.system - entry.child)));
  return {
    status: maxError <= 0.001 ? 'reconciled' : 'needs_review',
    max_reconciliation_error_mw: round(maxError, 3),
    geography_count: geographyCount,
  };
}

export function buildForecastBenchmarkFailureNotes(benchmark: ForecastMetrics): string[] {
  const baselineCandidates = [
    { label: 'persistence baseline', mae: benchmark.persistence_mae },
    { label: 'seasonal-naive baseline', mae: benchmark.seasonal_naive_mae },
  ].filter((candidate) => Number.isFinite(candidate.mae) && candidate.mae > 0);

  if (!Number.isFinite(benchmark.mae) || benchmark.mae <= 0 || benchmark.sample_size <= 0 || baselineCandidates.length === 0) {
    return [];
  }

  const bestBaseline = baselineCandidates.reduce((best, candidate) => (
    candidate.mae < best.mae ? candidate : best
  ));

  if (benchmark.mae <= bestBaseline.mae) {
    return [];
  }

  return [
    `Baseline win: ${bestBaseline.label} MAE ${bestBaseline.mae.toFixed(2)} MW beats transparent trend-seasonal MAE ${benchmark.mae.toFixed(2)} MW; treat accuracy uplift as unproven and review model inputs before making buyer-facing accuracy claims.`,
  ];
}

function buildForecastEvidenceReport(params: {
  aggregated: AggregatedIntervalPoint[];
  rows: UtilityHistoricalLoadRow[];
  granularity: UtilityInputGranularity;
  benchmark: ForecastMetrics;
  warnings: string[];
}): ForecastEvidenceReport {
  const rollingSplits = buildRollingOriginSplits(params.aggregated, params.granularity);
  const averageCoverage = rollingSplits.length > 0
    ? rollingSplits.reduce((sum, split) => sum + split.interval_coverage_pct, 0) / rollingSplits.length
    : 0;
  const conformalWidth = rollingSplits.length > 0
    ? quantile(rollingSplits.map((split) => split.rmse), 0.9)
    : params.benchmark.rmse;
  const challenger = params.benchmark.persistence_mae <= params.benchmark.seasonal_naive_mae
    ? 'persistence'
    : 'seasonal_naive';
  const challengerMae = challenger === 'persistence'
    ? params.benchmark.persistence_mae
    : params.benchmark.seasonal_naive_mae;
  const benchmarkFailureNotes = buildForecastBenchmarkFailureNotes(params.benchmark);
  const decisionReason = params.benchmark.mae > 0 && challengerMae > 0 && params.benchmark.mae <= challengerMae
    ? 'Transparent trend-seasonal model is the current champion because its holdout MAE is no worse than the strongest naive challenger.'
    : 'Transparent trend-seasonal model remains the champion for explainability, but the challenger gap must be reviewed before making accuracy claims.';

  return {
    model_version: UTILITY_FORECAST_MODEL_VERSION,
    validation_method: 'rolling_origin_cv',
    rolling_origin_splits: rollingSplits,
    conformal_interval_coverage_pct: round(averageCoverage, 2),
    conformal_interval_width_mw: round(conformalWidth, 2),
    benchmark_failure_notes: benchmarkFailureNotes,
    champion_challenger: {
      champion: 'transparent_trend_seasonal',
      challenger,
      decision_reason: decisionReason,
    },
    hierarchy_reconciliation: buildHierarchyReconciliation(params.rows),
    warnings: [
      ...params.warnings,
      ...benchmarkFailureNotes,
      ...(rollingSplits.length < 3 ? ['Fewer than three rolling-origin splits are available; treat interval coverage as pilot evidence only.'] : []),
    ],
  };
}

function buildSimpleSeriesMetrics(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastMetrics {
  const series = aggregated.map((point) => point.demand_mw);
  const seasonalPeriod = granularity === 'monthly' ? 12 : 24;
  const testSize = Math.min(
    granularity === 'monthly' ? 12 : 72,
    Math.max(granularity === 'monthly' ? 3 : 24, Math.floor(series.length * 0.25)),
  );

  if (series.length <= testSize + 2) {
    return zeroMetrics();
  }

  const train = aggregated.slice(0, aggregated.length - testSize);
  const test = aggregated.slice(aggregated.length - testSize);
  const trainValues = train.map((point) => point.demand_mw);

  const { slope, intercept } = linearRegression(trainValues.map((_, index) => index), trainValues);
  const seasonal = buildSeasonalProfile(train, granularity);
  const modelPredictions = test.map((point, index) => {
    const trend = intercept + slope * (train.length + index);
    return round(trend + lookupSeasonalComponent(point.timestamp, seasonal, granularity), 2);
  });
  const actuals = test.map((point) => point.demand_mw);
  const persistenceMetrics = calculatePersistenceBaseline(series, 1);
  const seasonalMetrics = calculateSeasonalNaiveBaseline(series, 1, seasonalPeriod);

  return computeMetrics(
    actuals,
    modelPredictions,
    persistenceMetrics,
    seasonalMetrics,
  );
}

function buildSeasonalProfile(
  rows: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): number[] {
  const size = granularity === 'monthly' ? 12 : 24;
  const values = new Array<number>(size).fill(0);
  const counts = new Array<number>(size).fill(0);
  const mean = rows.reduce((sum, row) => sum + row.demand_mw, 0) / Math.max(rows.length, 1);

  rows.forEach((row) => {
    const dt = new Date(row.timestamp);
    const key = granularity === 'monthly' ? dt.getUTCMonth() : dt.getUTCHours();
    values[key] += row.demand_mw - mean;
    counts[key] += 1;
  });

  return values.map((value, index) => (counts[index] > 0 ? value / counts[index] : 0));
}

function lookupSeasonalComponent(
  timestamp: string,
  profile: number[],
  granularity: UtilityInputGranularity,
): number {
  const dt = new Date(timestamp);
  return granularity === 'monthly' ? profile[dt.getUTCMonth()] : profile[dt.getUTCHours()];
}

function detectGranularity(aggregated: AggregatedIntervalPoint[]): UtilityInputGranularity {
  if (aggregated.length < 3) return 'hourly';

  const deltasHours: number[] = [];
  for (let index = 1; index < aggregated.length; index += 1) {
    const hours = (new Date(aggregated[index].timestamp).getTime() - new Date(aggregated[index - 1].timestamp).getTime()) / 3600_000;
    if (hours > 0) deltasHours.push(hours);
  }

  if (deltasHours.length === 0) return 'hourly';
  const median = deltasHours.sort((left, right) => left - right)[Math.floor(deltasHours.length / 2)];
  return median >= 24 * 20 ? 'monthly' : 'hourly';
}

function computeMetrics(
  actuals: number[],
  predictions: number[],
  persistence: { mae: number; mape: number; rmse: number },
  seasonal: { mae: number; mape: number; rmse: number },
): ForecastMetrics {
  if (actuals.length === 0 || predictions.length === 0) {
    return zeroMetrics();
  }

  const mae = meanAbsoluteError(actuals, predictions);
  const mape = meanAbsolutePercentageError(actuals, predictions);
  const rmse = rootMeanSquaredError(actuals, predictions);
  const meanActual = actuals.reduce((sum, value) => sum + value, 0) / actuals.length;
  const ssRes = actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0);
  const ssTot = actuals.reduce((sum, actual) => sum + (actual - meanActual) ** 2, 0);

  return {
    mae: round(mae, 2),
    mape: round(mape, 2),
    rmse: round(rmse, 2),
    persistence_mae: round(persistence.mae, 2),
    persistence_mape: round(persistence.mape, 2),
    persistence_rmse: round(persistence.rmse, 2),
    seasonal_naive_mae: round(seasonal.mae, 2),
    seasonal_naive_mape: round(seasonal.mape, 2),
    seasonal_naive_rmse: round(seasonal.rmse, 2),
    skill_score_vs_persistence: persistence.mae > 0 ? round((1 - mae / persistence.mae) * 100, 2) : 0,
    skill_score_vs_seasonal: seasonal.mae > 0 ? round((1 - mae / seasonal.mae) * 100, 2) : 0,
    r_squared: ssTot > 0 ? round(1 - ssRes / ssTot, 2) : 0,
    sample_size: actuals.length,
  };
}

function zeroMetrics(): ForecastMetrics {
  return {
    mae: 0,
    mape: 0,
    rmse: 0,
    persistence_mae: 0,
    persistence_mape: 0,
    persistence_rmse: 0,
    seasonal_naive_mae: 0,
    seasonal_naive_mape: 0,
    seasonal_naive_rmse: 0,
    skill_score_vs_persistence: 0,
    skill_score_vs_seasonal: 0,
    r_squared: 0,
    sample_size: 0,
  };
}

function meanAbsoluteError(actuals: number[], predictions: number[]): number {
  return actuals.reduce((sum, actual, index) => sum + Math.abs(actual - predictions[index]), 0) / actuals.length;
}

function meanAbsolutePercentageError(actuals: number[], predictions: number[]): number {
  return (
    actuals.reduce((sum, actual, index) => {
      if (actual === 0) return sum;
      return sum + Math.abs((actual - predictions[index]) / actual);
    }, 0) / actuals.length
  ) * 100;
}

function rootMeanSquaredError(actuals: number[], predictions: number[]): number {
  return Math.sqrt(
    actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0) / actuals.length,
  );
}

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return { slope: 0, intercept: 0 };
  }

  const count = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let index = 0; index < count; index += 1) {
    sumX += x[index];
    sumY += y[index];
    sumXY += x[index] * y[index];
    sumXX += x[index] * x[index];
  }

  const denominator = count * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / count };
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  return { slope, intercept };
}

function uniqueSortedYears(years: number[]): number[] {
  return Array.from(new Set(years.filter((year) => year > 0))).sort((left, right) => left - right);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function averageOptional(
  left: number | null | undefined,
  right: number | null | undefined,
  priorCount: number,
  nextCount: number,
): number | null {
  const leftValue = Number.isFinite(left ?? Number.NaN) ? Number(left) : null;
  const rightValue = Number.isFinite(right ?? Number.NaN) ? Number(right) : null;
  if (leftValue === null && rightValue === null) return null;
  if (leftValue === null) return rightValue;
  if (rightValue === null) return leftValue;
  return round((leftValue * priorCount + rightValue) / nextCount, 3);
}

function stressModeAdder(mode: UtilityStressTestMode): number {
  switch (mode) {
    case 'polar_vortex':
      return 0.035;
    case 'heat_wave':
      return 0.02;
    case 'ice_storm':
      return 0.025;
    default:
      return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
