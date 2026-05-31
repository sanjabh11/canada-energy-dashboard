import { REGULATORY_TEMPLATES, templateToCSV } from './regulatoryTemplates';
import {
  utilityForecastPackageToAlbertaCsv,
  utilityForecastPackageToCsv,
  type UtilityForecastPackage,
} from './utilityForecasting';
import type {
  CommercialProofState,
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
  ProofVerificationStatus,
} from './proofPack';

function buildUtilityClaimLabel(forecastPackage: UtilityForecastPackage): 'advisory' | 'estimated' {
  const sourceKind = forecastPackage.input_provenance_summary.source_kind;
  const hasFallbackSurface = forecastPackage.input_provenance_summary.live_surfaces.some((surface) => surface.is_fallback);
  return sourceKind.includes('fallback') || sourceKind === 'public_system_sample' || hasFallbackSurface ? 'advisory' : 'estimated';
}

function buildUtilityVerificationStatus(
  forecastPackage: UtilityForecastPackage,
  commercialProofState: CommercialProofState,
): ProofVerificationStatus {
  const sourceKind = forecastPackage.input_provenance_summary.source_kind;
  const hasFallbackSurface = forecastPackage.input_provenance_summary.live_surfaces.some((surface) => surface.is_fallback);
  if (commercialProofState === 'constructed_commercial_scenario') return 'constructed_scenario';
  if (sourceKind === 'public_system_sample' || sourceKind === 'fallback_starter' || hasFallbackSurface) return 'needs_buyer_data';
  if (sourceKind === 'uploaded_historical') return 'owner_supplied_required';
  return 'verified_source';
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
  forecastPackage: UtilityForecastPackage,
  commercialProofState: CommercialProofState = 'standard',
): ProofArtifactDefinition {
  const sourceKind = forecastPackage.input_provenance_summary.source_kind;
  const isFallback = sourceKind.includes('fallback') || forecastPackage.input_provenance_summary.live_surfaces.some((surface) => surface.is_fallback);
  return {
    id,
    label,
    format,
    filename,
    audience: 'Utility planner, consultant, or board reviewer',
    generatedAt: forecastPackage.generated_at,
    jurisdiction: forecastPackage.jurisdiction,
    sourceSummary: commercialProofState === 'constructed_commercial_scenario'
      ? `${forecastPackage.source_label} • constructed commercial scenario`
      : `${forecastPackage.source_label} • ${sourceKind}`,
    sourceManifestId: forecastPackage.source_manifest.id,
    verificationStatus: buildUtilityVerificationStatus(forecastPackage, commercialProofState),
    doNotClaim: [
      'Production utility bridge approval',
      'Native 15-minute telemetry unless present in the uploaded source',
      'Control-room or dispatch-grade forecast accuracy',
      'Enterprise AI/GPU superiority',
    ],
    assumptions: [
      'Planning packs are statistical scenario outputs, not operator-grade control-room forecasts.',
      'Live-connected claims remain blocked unless a persisted non-fallback connector path exists.',
      'Ontario and Alberta exports reuse current regulatory schedule structures without promising regulator submission automation.',
    ],
    claimLabel: commercialProofState === 'constructed_commercial_scenario' ? 'constructed-scenario' : buildUtilityClaimLabel(forecastPackage),
    isFallback,
    freshnessState: forecastPackage.summary.date_range.end,
    commercialProofState,
    boundedClaimsDisclaimer: 'This planning pack supports board and regulatory planning review only. It does not imply production onboarding or unsupported connector status.',
    description,
  };
}

export function buildUtilityForecastProofBundle(
  forecastPackage: UtilityForecastPackage,
  commercialProofState: CommercialProofState = 'standard',
): ProofPackBundle {
  return {
    title: 'Utility planning proof pack',
    summary: 'Export a board-facing planning pack plus the supporting benchmark and jurisdiction-specific schedules without making unsupported live-data claims.',
    artifacts: [
      buildArtifact(
        'utility-planning-pack-pdf',
        'Planning memo PDF',
        'pdf',
        `${forecastPackage.jurisdiction.toLowerCase()}_utility_planning_pack.pdf`,
        'PDF planning memo for buyer or board review.',
        forecastPackage,
        commercialProofState,
      ),
      buildArtifact(
        'utility-planning-pack',
        'Planning pack',
        'html',
        `${forecastPackage.jurisdiction.toLowerCase()}_utility_planning_pack.html`,
        'Board/regulator-facing planning narrative with scenarios, provenance, and benchmark proof.',
        forecastPackage,
        commercialProofState,
      ),
      buildArtifact(
        'utility-benchmark-appendix',
        'Benchmark appendix',
        'md',
        `${forecastPackage.jurisdiction.toLowerCase()}_utility_benchmark_appendix.md`,
        'Appendix covering benchmark metrics, source truth, and scenario assumptions.',
        forecastPackage,
        commercialProofState,
      ),
      buildArtifact(
        'utility-forecast-csv',
        'Utility forecast CSV',
        'csv',
        `${forecastPackage.jurisdiction.toLowerCase()}_utility_forecast_pack.csv`,
        'Generic forecast package with low, expected, and high scenario outputs.',
        forecastPackage,
        commercialProofState,
      ),
      buildArtifact(
        'utility-jurisdiction-csv',
        forecastPackage.jurisdiction === 'Ontario' ? 'OEB scenario matrix' : 'AUC DSP data schedule',
        'csv',
        forecastPackage.jurisdiction === 'Ontario' ? 'oeb_chapter5_scenario_matrix.csv' : 'auc_dsp_data_schedule.csv',
        'Jurisdiction-specific schedule export for the active forecast package.',
        forecastPackage,
        commercialProofState,
      ),
    ],
  };
}

export function buildUtilityPlanningDescriptor(
  forecastPackage: UtilityForecastPackage,
  commercialProofState: CommercialProofState = 'standard',
): ProofDocumentDescriptor {
  return {
    definition: buildArtifact(
      'utility-planning-pack',
      'Planning pack',
      'html',
      `${forecastPackage.jurisdiction.toLowerCase()}_utility_planning_pack.html`,
      'Primary planning narrative for the current utility scenario.',
      forecastPackage,
      commercialProofState,
    ),
    title: `${forecastPackage.jurisdiction} utility planning pack`,
    summary: 'Scenario-to-export planning pack that keeps benchmark evidence, warnings, and connector truth visible for buyer review.',
    sections: [
      {
        heading: 'Current planning run',
        kind: 'bullet_list',
        body: [
          `Source label: ${forecastPackage.source_label}`,
          `Source kind: ${forecastPackage.input_provenance_summary.source_kind}`,
          `Source manifest: ${forecastPackage.source_manifest.id}`,
          `Source hash: ${forecastPackage.source_manifest.hash}`,
          `Fallback surfaces: ${forecastPackage.input_provenance_summary.live_surfaces.some((surface) => surface.is_fallback) ? 'yes' : 'no'}`,
          `Historical range: ${forecastPackage.summary.date_range.start} to ${forecastPackage.summary.date_range.end}`,
          `Benchmark MAE/MAPE/RMSE: ${forecastPackage.benchmark.mae.toFixed(2)} MW / ${forecastPackage.benchmark.mape.toFixed(2)}% / ${forecastPackage.benchmark.rmse.toFixed(2)} MW`,
          `Rolling evidence splits: ${forecastPackage.evidence_report.rolling_origin_splits.length}`,
          `Conformal interval coverage: ${forecastPackage.evidence_report.conformal_interval_coverage_pct.toFixed(1)}%`,
          `Hierarchy reconciliation error: ${forecastPackage.evidence_report.hierarchy_reconciliation.max_reconciliation_error_mw.toFixed(3)} MW`,
          `Benchmark skill vs persistence: ${forecastPackage.benchmark.skill_score_vs_persistence.toFixed(1)}%`,
          `Benchmark skill vs seasonal-naive: ${forecastPackage.benchmark.skill_score_vs_seasonal.toFixed(1)}%`,
          `Benchmark failure notes: ${forecastPackage.evidence_report.benchmark_failure_notes.length}`,
          `Weather case: ${forecastPackage.scenario.weather_case}`,
        ],
      },
      {
        heading: 'Highlighted scenarios',
        kind: 'bullet_list',
        body: forecastPackage.highlighted_years.map((year) => {
          const expected = forecastPackage.cases.expected.yearly.find((row) => row.year === year);
          return `${year} year: peak ${expected?.peak_demand_mw.toFixed(2) ?? 'NA'} MW, annual energy ${expected?.annual_energy_gwh.toFixed(2) ?? 'NA'} GWh`;
        }),
      },
      {
        heading: 'Warnings and trust boundaries',
        kind: 'bullet_list',
        body: forecastPackage.warnings.length > 0
          ? forecastPackage.warnings
          : ['No additional forecast warnings were emitted for the current package.'],
      },
      {
        heading: 'Export path',
        kind: 'bullet_list',
        body: [
          'Use the generic forecast CSV for low/base/high planning comparisons.',
          `Use the ${forecastPackage.jurisdiction === 'Ontario' ? 'OEB scenario matrix' : 'AUC DSP data schedule'} for filing-oriented workflows.`,
          'Attach the benchmark appendix and utility security statement to keep the proof path bounded and explicit.',
        ],
      },
    ],
    nextStep: 'Run one buyer-specific scenario, validate the assumptions with the utility team, and export the planning pack plus jurisdiction schedule for pilot review.',
  };
}

export function buildUtilityBenchmarkAppendixMarkdown(
  forecastPackage: UtilityForecastPackage,
  commercialProofState: CommercialProofState = 'standard',
): string {
  return [
    `# ${forecastPackage.jurisdiction} utility benchmark appendix`,
    '',
    `- Source label: ${forecastPackage.source_label}`,
    `- Source kind: ${forecastPackage.input_provenance_summary.source_kind}`,
    `- Source manifest: ${forecastPackage.source_manifest.id}`,
    `- Source file: ${forecastPackage.source_manifest.sourceFile}`,
    `- Source hash: ${forecastPackage.source_manifest.hash}`,
    `- Source transform: ${forecastPackage.source_manifest.transformVersion}`,
    `- Claim label: ${commercialProofState === 'constructed_commercial_scenario' ? 'constructed-scenario' : buildUtilityClaimLabel(forecastPackage)}`,
    `- Commercial proof state: ${commercialProofState === 'constructed_commercial_scenario' ? 'constructed commercial scenario' : 'standard'}`,
    `- Benchmark sample size: ${forecastPackage.benchmark.sample_size}`,
    `- MAE: ${forecastPackage.benchmark.mae.toFixed(2)} MW`,
    `- MAPE: ${forecastPackage.benchmark.mape.toFixed(2)}%`,
    `- RMSE: ${forecastPackage.benchmark.rmse.toFixed(2)} MW`,
    `- Persistence MAE: ${forecastPackage.benchmark.persistence_mae.toFixed(2)} MW`,
    `- Seasonal-naive MAE: ${forecastPackage.benchmark.seasonal_naive_mae.toFixed(2)} MW`,
    `- Skill vs persistence: ${forecastPackage.benchmark.skill_score_vs_persistence.toFixed(1)}%`,
    `- Skill vs seasonal naive: ${forecastPackage.benchmark.skill_score_vs_seasonal.toFixed(1)}%`,
    `- Rolling-origin splits: ${forecastPackage.evidence_report.rolling_origin_splits.length}`,
    `- Conformal interval coverage: ${forecastPackage.evidence_report.conformal_interval_coverage_pct.toFixed(1)}%`,
    `- Champion model: ${forecastPackage.evidence_report.champion_challenger.champion}`,
    `- Challenger model: ${forecastPackage.evidence_report.champion_challenger.challenger}`,
    `- Champion decision: ${forecastPackage.evidence_report.champion_challenger.decision_reason}`,
    `- Benchmark failure notes: ${forecastPackage.evidence_report.benchmark_failure_notes.length}`,
    `- Hierarchy reconciliation status: ${forecastPackage.evidence_report.hierarchy_reconciliation.status}`,
    '',
    '## Benchmark failure notes',
    ...(forecastPackage.evidence_report.benchmark_failure_notes.length > 0
      ? forecastPackage.evidence_report.benchmark_failure_notes.map((note) => `- ${note}`)
      : ['- No baseline-win failure note was emitted for this package.']),
    '',
    '## Source and fallback labels',
    ...forecastPackage.input_provenance_summary.live_surfaces.map((surface) => [
      `- ${surface.source}: ${surface.source_kind}`,
      `  - Observed at: ${surface.observed_at ?? 'none'}`,
      `  - Freshness: ${surface.freshness_status}`,
      `  - Fallback: ${surface.is_fallback ? 'yes' : 'no'}`,
      `  - Quality flags: ${surface.quality_flags.length > 0 ? surface.quality_flags.join(', ') : 'none'}`,
      surface.notes ? `  - Notes: ${surface.notes}` : null,
    ].filter(Boolean).join('\n')),
    '',
    '## Warnings',
    ...(forecastPackage.warnings.length > 0
      ? forecastPackage.warnings.map((warning) => `- ${warning}`)
      : ['- No additional warnings were emitted for this package.']),
    '',
    '## Assumptions',
    ...forecastPackage.assumptions.map((assumption) => `- ${assumption}`),
  ].join('\n');
}

export function buildUtilityJurisdictionCsv(forecastPackage: UtilityForecastPackage): string {
  if (forecastPackage.jurisdiction === 'Ontario') {
    return templateToCSV(
      REGULATORY_TEMPLATES.oeb_dsp_scenario_matrix,
      forecastPackage.regulatory_exports.ontario.scenario_matrix_rows as unknown as Record<string, unknown>[],
    );
  }

  return utilityForecastPackageToAlbertaCsv(forecastPackage);
}

export function buildUtilityGenericCsv(forecastPackage: UtilityForecastPackage): string {
  return utilityForecastPackageToCsv(forecastPackage);
}
