import type {
  ProofArtifactDefinition,
  ProofDocumentDescriptor,
  ProofPackBundle,
} from './proofPack';

export type ConsultantVariantId =
  | 'consultant_api_docs'
  | 'consultant_benchmarking'
  | 'consultant_overview';

const VARIANT_URLS: Record<ConsultantVariantId, string> = {
  consultant_api_docs: '/api-docs',
  consultant_benchmarking: '/forecast-benchmarking',
  consultant_overview: '/overview',
};

const VARIANT_LABELS: Record<ConsultantVariantId, string> = {
  consultant_api_docs: 'API docs',
  consultant_benchmarking: 'Forecast benchmarking',
  consultant_overview: 'Executive overview',
};

function nowIso(): string {
  return new Date().toISOString();
}

function buildArtifact(
  id: string,
  label: string,
  format: ProofArtifactDefinition['format'],
  filename: string,
  description: string,
): ProofArtifactDefinition {
  return {
    id,
    label,
    format,
    filename,
    audience: 'Energy consultants and advisory teams',
    generatedAt: nowIso(),
    jurisdiction: 'Canada',
    sourceSummary: 'CEIP consultant trust stack',
    sourceManifestId: 'consultant-api-data-pack-v2',
    verificationStatus: 'needs_buyer_data',
    doNotClaim: [
      'Custom buyer-specific SLA',
      'Production integration already deployed',
      'Regulator-ready filing automation from API access alone',
    ],
    assumptions: [
      'Initial outreach should stay proof-led, concise, and manual-send.',
      'Route claims must remain bounded by current live product surfaces.',
      'Raw code and sample payloads are follow-up material, not the first CTA.',
    ],
    claimLabel: 'bounded',
    isFallback: format === 'json',
    freshnessState: 'route-copy-reviewed',
    boundedClaimsDisclaimer:
      'Use only as a proof-led advisory artifact. Do not imply customer adoption, live buyer integrations, or end-to-end filing automation without additional evidence.',
    description,
  };
}

export function getConsultantVariantHref(variant: ConsultantVariantId): string {
  return VARIANT_URLS[variant];
}

export function buildConsultantProofBundle(): ProofPackBundle {
  return {
    title: 'Consultant proof pack',
    summary:
      'Follow-up artifacts for consultant outreach: buyer-facing memo, bounded sample export, endpoint freshness matrix, and notebook starter.',
    artifacts: [
      buildArtifact(
        'consultant-proof-memo',
        'Consultant proof memo',
        'md',
        'ceip-consultant-proof-memo.md',
        'A concise buyer-facing memo that explains where CEIP replaces manual scraping and where forecast/compliance proof comes from.',
      ),
      buildArtifact(
        'consultant-sample-export',
        'Consultant sample export',
        'json',
        'ceip-consultant-sample-grid-status.json',
        'A bounded sample payload showing the style of structured Canadian energy data a consulting team can request after the first conversation.',
      ),
      buildArtifact(
        'consultant-endpoint-freshness-matrix',
        'Endpoint freshness matrix',
        'csv',
        'ceip-consultant-endpoint-freshness-matrix.csv',
        'Curated endpoint list with source, freshness, and route-fit labels for analyst pilots.',
      ),
      buildArtifact(
        'consultant-notebook-starter',
        'Notebook starter',
        'md',
        'ceip-consultant-notebook-starter.md',
        'Copy-paste notebook outline for a scoped Canadian energy data pilot.',
      ),
    ],
  };
}

export function buildConsultantMemoDescriptor(
  variant: ConsultantVariantId = 'consultant_api_docs',
): ProofDocumentDescriptor {
  return {
    definition: buildConsultantProofBundle().artifacts[0],
    title: 'CEIP consultant proof memo',
    summary:
      'Use this memo after a first-touch response when a consulting team wants a tighter explanation of the CEIP trust stack.',
    sections: [
      {
        heading: 'What CEIP replaces',
        kind: 'bullet_list',
        body: [
          'Manual AESO and IESO scraping for repeated analyst workflows',
          'Ad hoc forecast-quality screenshots without a consistent benchmarking surface',
          'Loose, one-off data pulls that are hard to reuse across client files and board decks',
        ],
      },
      {
        heading: 'Trust stack',
        kind: 'bullet_list',
        body: [
          `Technical proof: ${VARIANT_LABELS.consultant_api_docs} (${VARIANT_URLS.consultant_api_docs})`,
          `Model trust: ${VARIANT_LABELS.consultant_benchmarking} (${VARIANT_URLS.consultant_benchmarking})`,
          `Executive summary: ${VARIANT_LABELS.consultant_overview} (${VARIANT_URLS.consultant_overview})`,
          'Endpoint data pack: 5-10 scoped endpoints, freshness matrix, CSV export, and notebook starter.',
        ],
      },
      {
        heading: 'Suggested first CTA',
        body: [
          `Lead the first outbound message with ${VARIANT_LABELS[variant]}: ${VARIANT_URLS[variant]}.`,
          'Offer the memo and the sample export only after the prospect shows interest in the workflow or asks for a more concrete view.',
        ],
      },
      {
        heading: 'Safe claims',
        kind: 'bullet_list',
        body: [
          'Structured Canadian energy inputs for consultant workflows',
          'Forecast benchmarking and proof surfaces for defensible analysis',
          'Programmatic access that can support repeatable internal and client-facing reporting',
        ],
      },
    ],
    nextStep:
      'If the prospect asks for payload detail, send the sample export and offer a short walkthrough of the proof URLs.',
  };
}

export function buildConsultantEndpointFreshnessCsv(): string {
  const rows = [
    ['/api-docs', 'OpenAPI route catalog', 'route-reviewed', 'API data-pack scoping'],
    ['/forecast-benchmarking', 'Forecast metrics and baseline proof', 'route-reviewed', 'forecast QA'],
    ['/utility-demand-forecast', 'Utility planning export surface', 'route-reviewed', 'forecast planning'],
    ['/regulatory-filing', 'OEB/AUC template exports', 'sample-pack', 'filing evidence'],
    ['/asset-health', 'CSV asset scoring outputs', 'buyer-upload required', 'capex triage'],
    ['/roi-calculator', 'TIER scenario memo', 'source-dated pricing required', 'industrial compliance'],
    ['/credit-banking', 'TIER ledger allocation outputs', 'buyer-upload required', 'credit audit'],
    ['/shadow-billing', 'Invoice delta outputs', 'buyer-upload required', 'billing review'],
    ['/ai-datacentres', 'Large-load readiness overlay', 'dashboard-context', 'constraint narrative'],
  ];
  return [
    'route,source_surface,freshness_state,best_use',
    ...rows.map((row) => row.map((value) => `"${value}"`).join(',')),
  ].join('\n');
}

export function buildConsultantNotebookStarterMarkdown(): string {
  return [
    '# CEIP consultant notebook starter',
    '',
    '1. Select one buyer workflow: forecast QA, filing evidence, asset capex, TIER compliance, billing review, or large-load screening.',
    '2. Export the endpoint freshness matrix and keep route freshness labels in the notebook.',
    '3. Pull only the 5-10 endpoints needed for the workflow; avoid broad platform claims.',
    '4. Attach the benchmark/provenance appendix before sharing forecast outputs.',
    '5. Keep sample, fallback, constructed, and owner-supplied rows visibly labeled in every chart or CSV.',
  ].join('\n');
}

export function buildConsultantSampleExport(variant: ConsultantVariantId = 'consultant_api_docs'): string {
  return JSON.stringify(
    {
      generated_at: nowIso(),
      audience: 'consultant_follow_up',
      proof_variant: variant,
      primary_route: VARIANT_URLS[variant],
      dataset: {
        endpoint: '/api/v2/grid-status',
        province: 'AB',
        observed_at: '2026-04-30T09:00:00Z',
        status: 'sample',
        notes: 'Illustrative sample export for consultant follow-up. Verify live freshness before using in binding client work.',
      },
      payload: {
        demand_mw: 10342,
        pool_price_cad_per_mwh: 84.12,
        generation_mix_pct: {
          natural_gas: 63.4,
          wind: 18.2,
          hydro: 7.4,
          solar: 5.1,
          imports: 5.9,
        },
        forecast_proof_url: VARIANT_URLS.consultant_benchmarking,
        executive_summary_url: VARIANT_URLS.consultant_overview,
      },
      bounded_claims:
        'Sample export only. Do not claim production integration, custom buyer-specific SLAs, or regulator-ready submission output from this file alone.',
    },
    null,
    2,
  );
}
