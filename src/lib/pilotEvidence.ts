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

export interface PilotNinetyFiveGate {
  id: string;
  label: string;
  evidence: string;
}

export interface PilotMinimumEvidenceLane {
  id: string;
  label: string;
  routeOptions: string[];
  proofPackOptions: string[];
  requiredManualInput: string;
  acceptanceSignal: string;
}

export interface PilotOperatorCommand {
  id: string;
  label: string;
  command: string;
  whenToUse: string;
}

export interface PilotIntakeRoutePlan {
  route: string;
  label: string;
  buyerLane: string;
  proofPackId: string;
  rating: string;
  variantId: string;
  requiredInput: string;
  artifactPromised: string;
  reviewerRole: string;
  painSignal: string;
  claimBoundary: string;
  doNotClaim: string;
  outreachCommand: string;
  intakePacketCommand: string;
  registerUpdateCommand: string;
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
    id: 'ga-ici-5cp-load-window',
    lane: 'Utility',
    title: 'Ontario GA/ICI 5CP load window',
    requiredFor: 'Ontario GA/ICI 5CP decision-support pack',
    minimumInput: 'Buyer-supplied Ontario interval load for candidate peak windows plus IESO peak tracker or top-five peak-hour source notes.',
    acceptedFormats: ['CSV', 'Markdown notes'],
    artifact: '5CP watchlist, peak-demand-factor estimate, and decision-support boundary memo',
    blockedClaim: 'Guaranteed GA savings, final IESO settlement result, eligibility decision, or operational curtailment instruction.',
    route: '/ga-ici-5cp',
    acceptance: [
      'Top-five or candidate 5CP windows are tied to IESO source notes.',
      'Peak demand factor is marked as an estimate until buyer and settlement review.',
      'Do-not-claim metadata blocks savings, eligibility, settlement, and curtailment-instruction claims.',
    ],
  },
  {
    id: 'byo-csv-privacy-proof',
    lane: 'Security',
    title: 'BYO-CSV retained proof extract',
    requiredFor: 'Privacy-preserving BYO-CSV proof generator',
    minimumInput: 'Redacted CSV sample or local-only owner-approved CSV whose retained extract contains schema, completeness, direct-identifier screen, spreadsheet formula screen, and linkage-warning results only.',
    acceptedFormats: ['CSV input with Markdown retained extract'],
    artifact: 'Hashable retained evidence extract with no raw cell values',
    blockedClaim: 'PII-free certification, no privacy risk, buyer acceptance, or production connector approval.',
    route: '/byo-csv-proof',
    acceptance: [
      'Retained artifact records schema, completeness, direct-identifier findings, spreadsheet formula findings, quasi-identifier warnings, and no retained raw values.',
      'Confidence-gate readiness is false when direct identifiers or spreadsheet formula risks are found.',
      'SHA-256 evidence reference is computed from the retained extract, not from sensitive originals.',
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
    confidenceMovement: 'Buyer-proven market confidence can move toward 95% if claim checks remain clean.',
  },
  {
    id: 'paid-pilot',
    evidenceState: 'Paid pilot or signed design-partner letter',
    confidenceMovement: 'Market confidence can be upgraded only with route-specific evidence attached.',
  },
];

export const pilotNinetyFiveGateCommand = 'pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts';
export const pilotBuyerEvidenceReadinessCommand = 'pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers --evidence-root path/to/redacted-artifacts';

export const pilotNinetyFiveGates: PilotNinetyFiveGate[] = [
  {
    id: 'utility-forecast-benchmark',
    label: 'Accepted utility forecast evidence',
    evidence: 'Buyer-supplied utility forecast or forecast-trust row with numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics.',
  },
  {
    id: 'tier-or-credit',
    label: 'Accepted TIER or credit evidence',
    evidence: 'Buyer-supplied TIER CFO memo or credit-banking row with accepted reviewer feedback.',
  },
  {
    id: 'billing-or-security',
    label: 'Accepted billing or security evidence',
    evidence: 'Buyer-supplied shadow-billing or utility-security row with accepted reviewer feedback.',
  },
  {
    id: 'three-proof-packs',
    label: 'Three proceeding proof packs',
    evidence: 'At least three distinct proof_pack_id values with buyer evidence and day_14_decision=proceed.',
  },
  {
    id: 'coverage-and-delta',
    label: 'Coverage and confidence movement',
    evidence: 'Total accepted confidence_delta is at least 0.9, every confidence-moving row has at least 70% buyer-data coverage, and time-to-artifact is recorded.',
  },
  {
    id: 'fast-pilot-artifact',
    label: 'Fast pilot artifact loop',
    evidence: 'At least one accepted buyer proof pack is delivered in 48 hours or less, and every accepted confidence-moving row is delivered within 120 hours.',
  },
  {
    id: 'redacted-artifact-hashes',
    label: 'Retained redacted artifact hashes',
    evidence: 'Every accepted confidence-moving row has a local redacted artifact under --evidence-root with a matching SHA-256 hash.',
  },
  {
    id: 'commercial-commitment',
    label: 'Commercial commitment signal',
    evidence: 'At least one accepted confidence-moving buyer row records a paid pilot, purchase order, letter of intent, or signed design-partner status with retained redacted artifact text proving the commitment beyond status-only wording.',
  },
];

export const pilotMinimumEvidenceLanes: PilotMinimumEvidenceLane[] = [
  {
    id: 'minimum-utility-forecast',
    label: 'Utility forecast lane',
    routeOptions: ['/utility-demand-forecast'],
    proofPackOptions: ['utility_forecast_planning_pack'],
    requiredManualInput: 'Anonymized buyer utility load history plus numeric forecast benchmark evidence.',
    acceptanceSignal: 'Accepted reviewer feedback with day_14_decision=proceed.',
  },
  {
    id: 'minimum-tier-credit',
    label: 'TIER or credit lane',
    routeOptions: ['/roi-calculator', '/credit-banking'],
    proofPackOptions: ['tier_cfo_savings_pack', 'tier_credit_banking_audit_pack'],
    requiredManualInput: 'Buyer facility assumptions or credit ledger plus reviewer-approved planning output.',
    acceptanceSignal: 'Accepted reviewer feedback with buyer-specific coverage and retained hash evidence.',
  },
  {
    id: 'minimum-billing-security',
    label: 'Billing or security lane',
    routeOptions: ['/shadow-billing', '/utility-security'],
    proofPackOptions: ['shadow_billing_invoice_pack', 'utility_security_procurement_pack'],
    requiredManualInput: 'Buyer invoice sample or security questionnaire with redacted retained artifact text.',
    acceptanceSignal: 'Accepted reviewer feedback plus one strong commercial signal across the buyer rows.',
  },
];

export const pilotOperatorCommands: PilotOperatorCommand[] = [
  {
    id: 'create-workspace',
    label: 'Create collection workspace',
    command: 'pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence',
    whenToUse: 'Start here before real outreach or Comet-assisted collection. This creates scaffolding only and keeps confidence_delta=0.',
  },
  {
    id: 'report-workspace',
    label: 'Report current readiness',
    command: 'pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence',
    whenToUse: 'Run after workspace creation and after each real buyer-evidence update to see which gates remain blocked.',
  },
  {
    id: 'append-outreach',
    label: 'Append real anonymized outreach row',
    command: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --route /utility-demand-forecast --activity-date YYYY-MM-DD --target-label anonymized_target --reply-status data_offered --pilot-evidence-register-action create_intake_packet',
    whenToUse: 'Use only after a real anonymized buyer reply. Rehearsal rows must not move confidence.',
  },
  {
    id: 'update-register',
    label: 'Attach retained artifact to register',
    command: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --evidence-file-reference route/artifact.md#sha256=<hash> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
    whenToUse: 'Use after a text-inspectable redacted artifact is prepared and reviewer acceptance can be supported by retained text.',
  },
  {
    id: 'hard-gate',
    label: 'Run 95% retained-evidence gate',
    command: 'pnpm run validate:pilot-evidence -- /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv --require-95 --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts',
    whenToUse: 'Run only after the three minimum lanes, hashes, reviewer acceptance, fast delivery, and commercial signal are real.',
  },
];

export const pilotIntakeRoutePlans: PilotIntakeRoutePlan[] = [
  {
    route: '/utility-demand-forecast',
    label: 'Utility forecast planning pack',
    buyerLane: 'utility',
    proofPackId: 'utility_forecast_planning_pack',
    rating: '4.5',
    variantId: 'utility_forecast',
    requiredInput: '12-36 months of anonymized utility load history plus benchmarkable forecast evidence.',
    artifactPromised: 'forecast planning pack with retained benchmark appendix',
    reviewerRole: 'utility planning reviewer',
    painSignal: 'Load growth planning, electrification scenario, or regulator-ready forecast appendix.',
    claimBoundary: 'Buyer-supplied redacted planning support only; no production utility onboarding claim.',
    doNotClaim: 'Do not claim live telemetry, customer LDC history, utility approval, or control-room use.',
    outreachCommand: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --activity-date YYYY-MM-DD --channel linkedin --target-label anonymized_utility_target --route /utility-demand-forecast --rating 4.5 --variant-id utility_forecast --reply-status data_offered --response-summary "Buyer offered a redacted load-history sample for planning review." --pain-signal "Load growth planning question" --requested-input "redacted utility load history" --reviewer-role "utility planning reviewer" --next-action "create intake packet and request retained benchmark artifact" --pilot-evidence-register-action create_intake_packet',
    intakePacketCommand: 'pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets --target-label anonymized_utility_target',
    registerUpdateCommand: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/utility-demand-forecast --evidence-file-reference utility-demand-forecast/retained-forecast-artifact.md#sha256=<64-hex> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
  },
  {
    route: '/roi-calculator',
    label: 'TIER CFO compliance memo',
    buyerLane: 'industrial',
    proofPackId: 'tier_cfo_savings_pack',
    rating: '4.0',
    variantId: 'tier_cfo',
    requiredInput: 'Annual emissions, benchmark exceedance, compliance year, direct-investment assumptions, and approval owner.',
    artifactPromised: 'source-dated TIER planning memo with separated pricing assumptions',
    reviewerRole: 'industrial compliance or finance reviewer',
    painSignal: 'TIER pathway decision, fund contribution comparison, or direct-investment sensitivity.',
    claimBoundary: 'Buyer-supplied planning support only; no trading, tax, legal, or guaranteed-savings advice.',
    doNotClaim: 'Do not claim guaranteed savings, live market price, broker execution, tax advice, or legal advice.',
    outreachCommand: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --activity-date YYYY-MM-DD --channel email --target-label anonymized_industrial_target --route /roi-calculator --rating 4.0 --variant-id tier_cfo --reply-status data_offered --response-summary "Buyer offered redacted TIER assumptions for planning review." --pain-signal "TIER compliance pathway decision" --requested-input "redacted facility assumptions" --reviewer-role "industrial compliance reviewer" --next-action "create intake packet and request retained TIER memo artifact" --pilot-evidence-register-action create_intake_packet',
    intakePacketCommand: 'pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets --target-label anonymized_industrial_target',
    registerUpdateCommand: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/roi-calculator --evidence-file-reference roi-calculator/retained-tier-artifact.md#sha256=<64-hex> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
  },
  {
    route: '/credit-banking',
    label: 'TIER credit banking audit pack',
    buyerLane: 'industrial',
    proofPackId: 'tier_credit_banking_audit_pack',
    rating: '3.9',
    variantId: 'tier_credit_banking',
    requiredInput: 'Credit lots, vintage, quantity, purchase price, status, expiry, and compliance-year liability.',
    artifactPromised: 'credit banking allocation schedule and expiry-risk register',
    reviewerRole: 'industrial compliance or finance reviewer',
    painSignal: 'Credit expiry, compliance-year liability, or credit-use policy review.',
    claimBoundary: 'Buyer-supplied ledger-planning support only; no broker, trade, registry, certification, or legal claim.',
    doNotClaim: 'Do not claim broker execution, trade execution, registry certification, legal advice, or live market price.',
    outreachCommand: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --activity-date YYYY-MM-DD --channel email --target-label anonymized_credit_target --route /credit-banking --rating 3.9 --variant-id tier_credit_banking --reply-status data_offered --response-summary "Buyer offered a redacted credit ledger for expiry-risk review." --pain-signal "TIER credit expiry planning" --requested-input "redacted credit ledger and liability file" --reviewer-role "industrial compliance reviewer" --next-action "create intake packet and request retained credit-banking artifact" --pilot-evidence-register-action create_intake_packet',
    intakePacketCommand: 'pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets --target-label anonymized_credit_target',
    registerUpdateCommand: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/credit-banking --evidence-file-reference credit-banking/retained-credit-artifact.md#sha256=<64-hex> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
  },
  {
    route: '/shadow-billing',
    label: 'Shadow billing invoice proof pack',
    buyerLane: 'municipal/public sector',
    proofPackId: 'shadow_billing_invoice_pack',
    rating: '3.8',
    variantId: 'shadow_billing',
    requiredInput: 'At least 6-12 months of redacted bills or exported supply-cost rows.',
    artifactPromised: 'monthly delta CSV, field map, and audit note',
    reviewerRole: 'municipal energy or billing reviewer',
    painSignal: 'Invoice accuracy, rate selection, or switching-outcome review.',
    claimBoundary: 'Buyer-supplied field-level billing support only; no full-bill reconstruction claim.',
    doNotClaim: 'Do not claim verified savings, guaranteed savings, beyond-supplied-field coverage, or full tariff reconstruction.',
    outreachCommand: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --activity-date YYYY-MM-DD --channel email --target-label anonymized_billing_target --route /shadow-billing --rating 3.8 --variant-id shadow_billing --reply-status data_offered --response-summary "Buyer offered a redacted invoice sample for field-level review." --pain-signal "Invoice accuracy or rate-selection question" --requested-input "redacted invoice sample or extracted supply-cost rows" --reviewer-role "billing reviewer" --next-action "create intake packet and request retained billing artifact" --pilot-evidence-register-action create_intake_packet',
    intakePacketCommand: 'pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets --target-label anonymized_billing_target',
    registerUpdateCommand: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/shadow-billing --evidence-file-reference shadow-billing/retained-billing-artifact.md#sha256=<64-hex> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
  },
  {
    route: '/utility-security',
    label: 'Utility security procurement pack',
    buyerLane: 'security',
    proofPackId: 'utility_security_procurement_pack',
    rating: '4.0',
    variantId: 'utility_security',
    requiredInput: 'Buyer security questionnaire or review checklist with owner-approved redacted review notes.',
    artifactPromised: 'security procurement evidence matrix',
    reviewerRole: 'utility security or procurement reviewer',
    painSignal: 'Security questionnaire, data-handling review, or pilot procurement blocker.',
    claimBoundary: 'Buyer-supplied security review support only; no certification or production approval claim.',
    doNotClaim: 'Do not claim SOC certification, NERC certification, production utility approval, or legal/privacy approval.',
    outreachCommand: 'pnpm run append:outreach-response-log-row -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --activity-date YYYY-MM-DD --channel linkedin --target-label anonymized_security_target --route /utility-security --rating 4.0 --variant-id utility_security --reply-status data_offered --response-summary "Buyer offered a redacted security questionnaire for procurement review." --pain-signal "Utility security review blocker" --requested-input "redacted security questionnaire or review checklist" --reviewer-role "utility security reviewer" --next-action "create intake packet and request retained security artifact" --pilot-evidence-register-action create_intake_packet',
    intakePacketCommand: 'pnpm run create:outreach-intake-packets -- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv --output-dir /tmp/ceip-phase-f-evidence/outreach-intake-packets --target-label anonymized_security_target',
    registerUpdateCommand: 'pnpm run update:pilot-evidence-register-row -- --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv --evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts --artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/utility-security --evidence-file-reference utility-security/retained-security-artifact.md#sha256=<64-hex> --confidence-delta 0.3 --output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
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
    requiredEvidence: 'Benchmark appendix or forecast trust retained extract with numeric persistence, seasonal-naive, buyer baseline when supplied, rolling-origin splits, interval coverage, champion/challenger decision, and failure notes.',
    howToMeasure: 'Record MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and whether CEIP beats or explains the baseline.',
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
  'The 95% market-confidence claim is requested before a paid pilot, purchase order, letter of intent, or signed design-partner signal is captured.',
  'Forecast metrics are weaker than baseline and the buyer cannot accept a diagnostic artifact.',
  'TIER pricing, legal, tax, or trading advice is required instead of planning support.',
];

export function getPilotEvidenceCoverageSummary() {
  const uniqueLanes = new Set(pilotEvidenceRequirements.map((item) => item.lane));
  return {
    requirementCount: pilotEvidenceRequirements.length,
    laneCount: uniqueLanes.size,
    confidenceRuleCount: pilotConfidenceRules.length,
    ninetyFiveGateCount: pilotNinetyFiveGates.length,
    minimumLaneCount: pilotMinimumEvidenceLanes.length,
    operatorCommandCount: pilotOperatorCommands.length,
    intakeRoutePlanCount: pilotIntakeRoutePlans.length,
    outcomeMetricCount: pilotOutcomeMetrics.length,
    stopConditionCount: pilotStopConditions.length,
  };
}
