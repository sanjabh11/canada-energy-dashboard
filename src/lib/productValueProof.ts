import { buildByoCsvProofReport, type ByoCsvProofReport } from './byoCsvProofGenerator';
import {
  buildUtilityForecastPackage,
  type UtilityForecastPackage,
  type UtilityPlanningScenario,
} from './utilityForecasting';
import {
  buildUtilityBenchmarkAppendixMarkdown,
  buildUtilityGenericCsv,
  buildUtilityPlanningDescriptor,
} from './utilityForecastProofPack';
import { parseUtilityHistoricalLoadCsv, type ParsedUtilityCsv } from './utilityCsvParser';
import type { ProofDocumentDescriptor } from './proofPack';
import { generateUtilityLoadSampleRows } from './utilitySampleData';
import { utilityRowsToCsv } from './utilityCsvSerializer';

export const PRODUCT_VALUE_PROOF_VERSION = 'ceip-product-value-proof-v1';
export const PRODUCT_VALUE_SAMPLE_LABEL = 'CEIP synthetic region-neutral starter fixture';
const REGION_NEUTRAL_SAMPLE_NOTE =
  'Region context: synthetic demo only; no Ontario or Alberta measurements are represented.';

export interface ProductValueCheck {
  id: 'privacy' | 'schema' | 'formula' | 'linkage' | 'source' | 'freshness';
  label: string;
  status: 'pass' | 'review' | 'blocked';
  detail: string;
}

export interface ProductValueProof {
  generatedAt: string;
  sourceLabel: string;
  parsed: ParsedUtilityCsv;
  report: ByoCsvProofReport;
  forecastPackage: UtilityForecastPackage | null;
  descriptor: ProofDocumentDescriptor | null;
  benchmarkAppendix: string | null;
  forecastCsv: string | null;
  checks: ProductValueCheck[];
  reviewerChecklist: string[];
}

export function createProductValueScenario(): UtilityPlanningScenario {
  return {
    jurisdiction: 'Ontario',
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: 1.45,
    committed_load_mw: 4,
    ev_growth_mw: 3.5,
    heat_pump_growth_mw: 2.8,
    der_offset_mw: 1.6,
    demand_response_reduction_mw: 1.2,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
    stress_test_mode: 'none',
    hosting_capacity_limit_mw: 3.5,
    large_point_loads: [
      {
        name: 'Committed large point-load',
        geography_id: 'ON-FEEDER-1',
        geography_level: 'feeder',
        mw: 0,
        load_factor_pct: 72,
      },
    ],
    industrial_opt_outs: [
      {
        name: 'Industrial self-supply',
        geography_id: 'ON-FEEDER-1',
        geography_level: 'feeder',
        mw: 0,
      },
    ],
    tou_shift_rules: [
      {
        name: 'Evening EV shift',
        from_hour_start: 17,
        from_hour_end: 21,
        to_hour_start: 0,
        to_hour_end: 5,
        shift_pct: 0,
      },
    ],
  };
}

export function buildProductValueSampleCsv(): string {
  const rows = generateUtilityLoadSampleRows('Ontario', 'hourly').map((row) => ({
    ...row,
    geography_id: row.geography_id.replace(/^ON-/, 'DEMO-'),
    feeder_id: row.feeder_id?.replace(/^ON-/, 'DEMO-'),
    substation_id: row.substation_id?.replace(/^ON-/, 'DEMO-'),
    weather_zone: 'synthetic',
  }));
  return utilityRowsToCsv(rows);
}

function buildChecks(
  parsed: ParsedUtilityCsv,
  report: ByoCsvProofReport,
  forecastPackage: UtilityForecastPackage | null,
): ProductValueCheck[] {
  const formulaCount = report.spreadsheet_formula_findings.length;
  const linkageCount = report.quasi_identifier_findings.length;
  const sourceReady = parsed.rows.length > 0 && parsed.errors.length === 0;
  const schemaStatus = sourceReady ? (parsed.warnings.length > 0 ? 'review' : 'pass') : 'blocked';
  const freshnessState = forecastPackage?.input_provenance_summary.live_surfaces.some(
    (surface) => surface.freshness_status === 'stale' || surface.is_fallback,
  )
    ? 'sample or fallback source; replace with buyer-attested history'
    : 'source freshness is not independently verified';

  return [
    {
      id: 'privacy',
      label: 'Privacy boundary',
      status: 'pass',
      detail:
        'Raw CSV remains in this browser session; exports retain findings and aggregates, not raw values.',
    },
    {
      id: 'schema',
      label: 'Schema and completeness',
      status: schemaStatus,
      detail: sourceReady
        ? `${parsed.rows.length.toLocaleString()} parsed load rows with no parser errors.${
            parsed.warnings.length > 0 ? ` ${parsed.warnings.join(' ')}` : ''
          }`
        : parsed.errors.join(' ') ||
          'CSV needs timestamp/datetime and exactly one demand_mw/load_mw, kwh/interval_kwh/usage_kwh, or kw column.',
    },
    {
      id: 'formula',
      label: 'Formula risk',
      status: formulaCount === 0 ? 'pass' : 'review',
      detail:
        formulaCount === 0
          ? 'No spreadsheet-formula prefixes were detected.'
          : `${formulaCount} column(s) contain formula-like cells; neutralize before sharing.`,
    },
    {
      id: 'linkage',
      label: 'Linkage risk',
      status: linkageCount === 0 ? 'pass' : 'review',
      detail:
        linkageCount === 0
          ? 'No quasi-identifier columns were detected by the screening rules.'
          : `${linkageCount} quasi-identifier column(s) need buyer privacy review.`,
    },
    {
      id: 'source',
      label: 'Source and custody',
      status: forecastPackage ? 'review' : 'blocked',
      detail: forecastPackage
        ? `${forecastPackage.input_provenance_summary.source_kind}; custody and redistribution rights remain owner-attested.`
        : 'A valid utility load CSV is required before a forecast package can be built.',
    },
    {
      id: 'freshness',
      label: 'Freshness',
      status: forecastPackage ? 'review' : 'blocked',
      detail: forecastPackage ? freshnessState : 'No forecast source is available to assess.',
    },
  ];
}

function inputProvenanceLines(parsed: ParsedUtilityCsv): string[] {
  return [
    `Source unit: ${parsed.source_unit}`,
    `Inferred interval (minutes): ${parsed.inferred_interval_minutes ?? 'not available'}`,
    `Conversion method: ${parsed.conversion_method}`,
    ...parsed.warnings.map((warning) => `Warning: ${warning}`),
  ];
}

function makeProductValueDescriptor(
  descriptor: ProofDocumentDescriptor,
  parsed: ParsedUtilityCsv,
  isSample: boolean,
): ProofDocumentDescriptor {
  const provenanceSection = {
    heading: 'Input unit provenance',
    kind: 'bullet_list' as const,
    body: inputProvenanceLines(parsed),
  };

  if (!isSample) {
    return { ...descriptor, sections: [...descriptor.sections, provenanceSection] };
  }

  return {
    ...descriptor,
    title: 'Synthetic utility planning pack (region-neutral)',
    definition: {
      ...descriptor.definition,
      jurisdiction: 'Region-neutral synthetic demo',
      sourceSummary:
        'Deterministic synthetic workflow proof only; not Ontario or Alberta utility evidence.',
      assumptions: descriptor.definition.assumptions.map((assumption) =>
        assumption.startsWith('Ontario and Alberta exports')
          ? 'The synthetic demo does not produce jurisdiction-specific filing exports.'
          : assumption,
      ),
    },
    sections: [
      ...descriptor.sections.map((section) =>
        section.heading === 'Current planning run'
          ? {
              ...section,
              body: [
                ...(Array.isArray(section.body) ? section.body : [section.body]),
                REGION_NEUTRAL_SAMPLE_NOTE,
              ],
            }
          : section.heading === 'Export path'
            ? {
                ...section,
                body: [
                  'Synthetic demo exports only; no Ontario or Alberta filing schedule is produced by this browser-local workflow.',
                  'Use the generic forecast CSV and benchmark appendix only after reviewer validation.',
                ],
              }
            : section,
      ),
      provenanceSection,
    ],
  };
}

function buildJsonSidecar(proof: ProductValueProof): string {
  const isSample = proof.sourceLabel === PRODUCT_VALUE_SAMPLE_LABEL;
  const packageSummary = proof.forecastPackage
    ? {
        jurisdiction: isSample
          ? 'Region-neutral synthetic demo'
          : proof.forecastPackage.jurisdiction,
        region_context: isSample ? REGION_NEUTRAL_SAMPLE_NOTE : undefined,
        generated_at: proof.forecastPackage.generated_at,
        source_kind: proof.forecastPackage.input_provenance_summary.source_kind,
        source_manifest: proof.forecastPackage.source_manifest,
        summary: proof.forecastPackage.summary,
        benchmark: proof.forecastPackage.benchmark,
        warnings: proof.forecastPackage.warnings,
      }
    : null;

  return JSON.stringify(
    {
      version: PRODUCT_VALUE_PROOF_VERSION,
      generated_at: proof.generatedAt,
      source_label: proof.sourceLabel,
      ...(isSample ? { region_context: REGION_NEUTRAL_SAMPLE_NOTE } : {}),
      input_provenance: {
        source_unit: proof.parsed.source_unit,
        inferred_interval_minutes: proof.parsed.inferred_interval_minutes,
        conversion_method: proof.parsed.conversion_method,
        warnings: proof.parsed.warnings,
      },
      retained_raw_values: false,
      checks: proof.checks,
      privacy_report: {
        row_count: proof.report.row_count,
        column_count: proof.report.column_count,
        direct_identifier_findings: proof.report.direct_identifier_findings,
        spreadsheet_formula_findings: proof.report.spreadsheet_formula_findings,
        quasi_identifier_findings: proof.report.quasi_identifier_findings,
        privacy_review_warnings: proof.report.privacy_review_warnings,
        proof_boundary: proof.report.proof_boundary,
        do_not_claim: proof.report.do_not_claim,
      },
      forecast: packageSummary,
      reviewer_acceptance_checklist: proof.reviewerChecklist,
    },
    null,
    2,
  );
}

function buildProductValueForecastCsv(
  forecastPackage: UtilityForecastPackage,
  formatEvidence: ParsedUtilityCsv['format_evidence'],
  isSample: boolean,
): string {
  const csv = buildUtilityGenericCsv(forecastPackage, formatEvidence);
  if (!isSample) return csv;

  const regionNeutralHeader = [
    '# Jurisdiction: Region-neutral synthetic demo',
    `# ${REGION_NEUTRAL_SAMPLE_NOTE}`,
    '# Filing export: not generated for this browser-local synthetic workflow.',
  ].join('\n');
  return csv.replace('# Jurisdiction: Ontario', regionNeutralHeader);
}

export function buildProductValueProof(params: {
  csvText: string;
  sourceLabel: string;
  generatedAt?: string;
}): ProductValueProof {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const parsed = parseUtilityHistoricalLoadCsv(params.csvText);
  const isSample = params.sourceLabel === PRODUCT_VALUE_SAMPLE_LABEL;
  const report = buildByoCsvProofReport({
    csvText: params.csvText,
    sourceLabel: params.sourceLabel,
    route: '/',
    generatedAt,
  });

  let forecastPackage: UtilityForecastPackage | null = null;
  if (parsed.rows.length > 0 && parsed.errors.length === 0) {
    try {
      forecastPackage = buildUtilityForecastPackage({
        rows: parsed.rows,
        scenario: createProductValueScenario(),
        sourceLabel: params.sourceLabel,
        isSampleData: isSample,
        sourceKind: isSample ? 'fallback_starter' : 'uploaded_historical',
        formatEvidence: parsed.format_evidence,
      });
    } catch {
      forecastPackage = null;
    }
  }

  const descriptor = forecastPackage
    ? makeProductValueDescriptor(
        buildUtilityPlanningDescriptor(forecastPackage, 'standard', parsed.format_evidence),
        parsed,
        isSample,
      )
    : null;
  const baseBenchmarkAppendix = forecastPackage
    ? buildUtilityBenchmarkAppendixMarkdown(forecastPackage, 'standard', parsed.format_evidence)
    : null;
  const benchmarkAppendix = baseBenchmarkAppendix
    ? [
        isSample
          ? baseBenchmarkAppendix.replace(
              /^# .*$/m,
              '# Synthetic utility benchmark appendix (region-neutral)',
            )
          : baseBenchmarkAppendix,
        '',
        '## Input unit provenance',
        ...inputProvenanceLines(parsed).map((line) => `- ${line}`),
        ...(isSample ? [`- ${REGION_NEUTRAL_SAMPLE_NOTE}`] : []),
      ].join('\n')
    : null;
  const proof: ProductValueProof = {
    generatedAt,
    sourceLabel: params.sourceLabel,
    parsed,
    report,
    forecastPackage,
    descriptor,
    benchmarkAppendix,
    forecastCsv: forecastPackage
      ? buildProductValueForecastCsv(forecastPackage, parsed.format_evidence, isSample)
      : null,
    checks: buildChecks(parsed, report, forecastPackage),
    reviewerChecklist: [
      'Confirm source ownership, consent/basis, and redistribution rights before external sharing.',
      'Confirm the source unit, inferred interval, and conversion method before interpreting demand values.',
      'Review privacy, formula, linkage, source, and freshness checks above.',
      'Confirm forecast assumptions and benchmark windows with a utility reviewer.',
      'Treat sample/fallback results as workflow proof, not buyer or regulator evidence.',
      'Record reviewer name, date, decision, and objections outside this browser-only demo.',
    ],
  };

  return proof;
}

export function productValueProofJson(proof: ProductValueProof): string {
  return buildJsonSidecar(proof);
}
