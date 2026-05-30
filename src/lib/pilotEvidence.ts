export type PilotEvidenceLane =
  | 'Utility'
  | 'Industrial'
  | 'Municipal/Public Sector'
  | 'Security'
  | 'Large Load'
  | 'Consultant/API';

export interface PilotEvidenceRequirement {
  id: string;
  lane: PilotEvidenceLane;
  title: string;
  requiredFor: string;
  minimumInput: string;
  acceptedFormats: string[];
  artifact: string;
  blockedClaim: string;
  acceptance: string[];
  route: string;
}

export interface PilotConfidenceRule {
  id: string;
  evidenceState: string;
  confidenceMovement: string;
}

export interface PilotOutcomeMetric {
  id: string;
  label: string;
  requiredEvidence: string;
  howToMeasure: string;
  confidenceUse: string;
  route: string;
}

export const pilotEvidenceRequirements: PilotEvidenceRequirement[] = [
  {
    id: 'buyer-load-history',
    lane: 'Utility',
    title: 'Buyer utility load history',
    requiredFor: 'Utility demand forecast planning pack',
    minimumInput: '12-36 months of monthly or hourly load with geography or customer-class labels when available.',
    acceptedFormats: ['CSV', 'XLSX exported to CSV'],
    artifact: 'Planning memo plus benchmark appendix',
    blockedClaim: 'Customer LDC history, buyer-specific forecast validity, or production telemetry.',
    route: '/utility-demand-forecast',
    acceptance: [
      'No customer names, account numbers, meter identifiers, addresses, or personal data.',
      'Benchmark appendix includes persistence, seasonal-naive, MAE, MAPE, RMSE, and interval coverage.',
      'Source label is buyer_supplied_anonymized or buyer_supplied_confidential.',
    ],
  },
  {
    id: 'forecast-reviewer-baseline',
    lane: 'Utility',
    title: 'Forecast reviewer baseline',
    requiredFor: 'Forecast benchmarking and provenance',
    minimumInput: 'Existing buyer forecast, planning assumption, accepted baseline method, or review notes.',
    acceptedFormats: ['CSV', 'PDF notes', 'Memo extract'],
    artifact: 'Champion/challenger benchmark note',
    blockedClaim: 'Forecast improvement over the buyer baseline.',
    route: '/forecast-benchmarking',
    acceptance: [
      'CEIP result is compared against persistence, seasonal-naive, and buyer baseline where supplied.',
      'Export notes when a baseline wins instead of hiding weak performance.',
      'Reviewer comments are captured as pilot evidence, not marketing proof.',
    ],
  },
  {
    id: 'filing-reviewer-sample',
    lane: 'Utility',
    title: 'Filing reviewer sample',
    requiredFor: 'OEB/AUC filing evidence pack',
    minimumInput: 'One anonymized prior filing schedule, reviewer comment, or consultant checklist.',
    acceptedFormats: ['PDF', 'DOCX', 'CSV', 'Markdown notes'],
    artifact: 'Annotated reviewer checklist and schedule mapping',
    blockedClaim: 'Reviewer-ready mapping beyond sample-pack preparation.',
    route: '/regulatory-filing',
    acceptance: [
      'Jurisdiction is tagged as Ontario/OEB or Alberta/AUC.',
      'Sample rows remain marked until replaced by utility source-of-record rows.',
      'No regulator-submission automation is implied.',
    ],
  },
  {
    id: 'tier-facility-assumptions',
    lane: 'Industrial',
    title: 'TIER facility assumptions',
    requiredFor: 'TIER CFO compliance memo',
    minimumInput: 'Annual emissions, benchmark exceedance, compliance year, direct-investment assumptions, and approval owner.',
    acceptedFormats: ['CSV', 'Spreadsheet', 'Signed assumptions note'],
    artifact: 'Source-dated CFO scenario memo',
    blockedClaim: 'Buyer savings, CFO-ready decision support, or facility-specific recommendation.',
    route: '/roi-calculator',
    acceptance: [
      'Pricing source timestamp is recorded before export.',
      'Official fund price, market-credit assumption, and direct-investment uncertainty are separated.',
      'Do-not-claim metadata covers trading, tax, legal, guaranteed savings, and live market price.',
    ],
  },
  {
    id: 'tier-credit-ledger',
    lane: 'Industrial',
    title: 'TIER credit ledger and liability',
    requiredFor: 'Credit banking audit pack',
    minimumInput: 'Credit lots, vintage, quantity, purchase price, status, expiry, and compliance-year liability.',
    acceptedFormats: ['CSV'],
    artifact: 'Allocation schedule and expiry-risk register',
    blockedClaim: 'Registry-backed allocation, buyer credit position, or purchase recommendation.',
    route: '/credit-banking',
    acceptance: [
      'Compliance-year liability file is attached.',
      'Allocation uses earliest-expiry active lots first unless buyer changes policy.',
      'Export remains audit planning, not a broker quote or registry certification.',
    ],
  },
  {
    id: 'invoice-comparison-sample',
    lane: 'Municipal/Public Sector',
    title: 'Invoice comparison sample',
    requiredFor: 'Shadow billing invoice proof pack',
    minimumInput: 'At least 6-12 months of bills or exported supply-cost rows.',
    acceptedFormats: ['PDF plus extracted CSV', 'CSV'],
    artifact: 'Monthly delta CSV, field map, and audit note',
    blockedClaim: 'Verified savings, bill-audit outcome, or tariff reconstruction.',
    route: '/shadow-billing',
    acceptance: [
      'Field map identifies source columns and excluded riders/tariff elements.',
      'Savings claim is limited to included fields.',
      'Audit note explains what was not reconstructed.',
    ],
  },
  {
    id: 'asset-fleet-subset',
    lane: 'Utility',
    title: 'Asset fleet subset',
    requiredFor: 'Asset health capex pack',
    minimumInput: 'Asset id, type, age/install year, loading, maintenance, criticality, and replacement-cost override if known.',
    acceptedFormats: ['CSV'],
    artifact: 'Replace/defer board memo and prioritized replacement CSV',
    blockedClaim: 'Buyer-specific replace/defer recommendation.',
    route: '/asset-health',
    acceptance: [
      'Default cost assumptions are replaced or acknowledged.',
      'Scoring remains CSV-first without SCADA or predictive-maintenance claims.',
      'Decision rationale is deterministic and inspection-ready.',
    ],
  },
  {
    id: 'security-questionnaire',
    lane: 'Security',
    title: 'Utility security questionnaire',
    requiredFor: 'Utility security procurement pack',
    minimumInput: 'Buyer questionnaire or review checklist with named owner/contact.',
    acceptedFormats: ['XLSX', 'DOCX', 'PDF', 'Markdown notes'],
    artifact: 'Evidence matrix, questionnaire, owner checklist, and procurement attachment',
    blockedClaim: 'Procurement approval, SOC certification, or legal/privacy approval.',
    route: '/utility-security',
    acceptance: [
      'Repo-backed design evidence is separated from deployed evidence.',
      'SBOM, security headers, hosting, contact, and subprocessor notes are attached when available.',
      'Certification and production approval remain do-not-claim items.',
    ],
  },
  {
    id: 'large-load-assumptions',
    lane: 'Large Load',
    title: 'Large-load assumptions',
    requiredFor: 'Large-load/data-centre readiness overlay',
    minimumInput: 'Load size, timing, location class, connection context, storage/BYOP options, and buyer constraints.',
    acceptedFormats: ['Markdown', 'CSV', 'Memo'],
    artifact: 'Assumptions checklist and constraint narrative',
    blockedClaim: 'Engineering approval, queue position, or interconnection readiness.',
    route: '/ai-datacentres',
    acceptance: [
      'Scenario stays labelled as planning overlay.',
      'AESO/IESO source assumptions are timestamped.',
      'No power-flow, hosting-capacity, or engineering approval language is used.',
    ],
  },
  {
    id: 'consultant-api-data-pack',
    lane: 'Consultant/API',
    title: 'Consultant/API data-pack evidence',
    requiredFor: 'Consultant/API Canadian energy data pack',
    minimumInput: 'Selected 5-10 endpoint workflow, sample payload/export, endpoint freshness matrix, and OpenAPI parity notes.',
    acceptedFormats: ['CSV', 'JSON', 'Markdown', 'Notebook outline'],
    artifact: 'Endpoint freshness matrix, sample export, and notebook starter',
    blockedClaim: 'Live-data SLA, production buyer integration, or OpenAPI parity across every endpoint.',
    route: '/api-docs',
    acceptance: [
      'Endpoint freshness matrix records source surface, freshness state, fallback status, and best use.',
      'Sample export contains only public, fallback-labelled, or buyer-approved non-sensitive fields.',
      'No live-data SLA, buyer adoption, or production integration claim is made without external evidence.',
    ],
  },
];

export const pilotConfidenceRules: PilotConfidenceRule[] = [
  {
    id: 'constructed-only',
    evidenceState: 'Public-system or constructed sample only',
    confidenceMovement: 'Do not increase market confidence.',
  },
  {
    id: 'buyer-file-only',
    evidenceState: 'One buyer file supplied, no reviewer feedback',
    confidenceMovement: 'Increase only that feature by up to 0.2/5.',
  },
  {
    id: 'accepted-artifact',
    evidenceState: 'One buyer file plus accepted artifact',
    confidenceMovement: 'Increase that feature by up to 0.4/5.',
  },
  {
    id: 'three-artifacts',
    evidenceState: 'Three buyer artifacts across utility, TIER, and billing/security',
    confidenceMovement: 'Strategy confidence can move toward 95% if claim checks remain clean.',
  },
  {
    id: 'paid-pilot',
    evidenceState: 'Paid pilot or signed design-partner letter',
    confidenceMovement: 'Market confidence can be upgraded only with route-specific evidence attached.',
  },
];

export const pilotOutcomeMetrics: PilotOutcomeMetric[] = [
  {
    id: 'time-to-artifact',
    label: 'Time to first reviewable artifact',
    requiredEvidence: 'Timestamped intake file plus exported proof pack or memo.',
    howToMeasure: 'Count business hours from accepted evidence intake to first export shared with the buyer reviewer.',
    confidenceUse: 'Proves the solo-developer wedge is fast to pilot; target is two business days for clean CSV evidence.',
    route: '/pilot-readiness',
  },
  {
    id: 'buyer-data-coverage',
    label: 'Buyer data coverage',
    requiredEvidence: 'Coverage summary showing required columns, date range, missing rows, and source labels.',
    howToMeasure: 'Divide accepted rows/fields by the minimum required schema for the selected proof pack.',
    confidenceUse: 'Prevents constructed or partial samples from being treated as buyer-specific proof.',
    route: '/pilot-evidence',
  },
  {
    id: 'benchmark-lift-or-diagnostic',
    label: 'Benchmark lift or diagnostic value',
    requiredEvidence: 'Benchmark appendix with persistence, seasonal-naive, buyer baseline when supplied, and failure notes.',
    howToMeasure: 'Record MAE, MAPE, RMSE, interval coverage, and whether CEIP beats or explains the baseline.',
    confidenceUse: 'Moves forecasting confidence only when the result is reviewable, even if a baseline wins.',
    route: '/forecast-benchmarking',
  },
  {
    id: 'reviewer-acceptance',
    label: 'Reviewer acceptance',
    requiredEvidence: 'Named reviewer comment, correction log, and day-14 proceed/park/reject decision.',
    howToMeasure: 'Track whether the buyer reviewer can explain and reuse the artifact internally after one revision loop.',
    confidenceUse: 'Converts route readiness into market confidence without relying on broad platform claims.',
    route: '/pilot-readiness',
  },
];

export const pilotStopConditions = [
  'The buyer requires production utility onboarding, engineering approval, broker execution, SOC certification, or regulator submission automation before a pilot.',
  'Source data contains personal data, meter identifiers, account numbers, unapproved customer records, or secrets.',
  'The buyer cannot name a reviewer or decision owner.',
  'Forecast metrics are weaker than baseline and the buyer cannot accept a diagnostic artifact.',
  'TIER pricing, legal, tax, or trading advice is required instead of planning support.',
];

export function getPilotEvidenceCoverageSummary() {
  const uniqueLanes = new Set(pilotEvidenceRequirements.map((item) => item.lane));
  return {
    requirementCount: pilotEvidenceRequirements.length,
    laneCount: uniqueLanes.size,
    confidenceRuleCount: pilotConfidenceRules.length,
    outcomeMetricCount: pilotOutcomeMetrics.length,
    stopConditionCount: pilotStopConditions.length,
  };
}
