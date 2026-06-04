import { pilotIntakeRoutePlans } from './pilotEvidence';

export type PilotEvidencePreviewStatus = 'pass' | 'blocked' | 'warning';

export interface PilotEvidencePreviewGate {
  id: string;
  label: string;
  status: PilotEvidencePreviewStatus;
  evidence: string;
  nextAction: string;
}

export interface PilotEvidenceReadinessMetric {
  id: string;
  label: string;
  status: PilotEvidencePreviewStatus;
  value: string;
  evidence: string;
  nextAction: string;
}

export interface PilotEvidenceLaneCoverage {
  id: string;
  label: string;
  status: PilotEvidencePreviewStatus;
  acceptedRowCount: number;
  proofPackIds: string[];
  evidence: string;
  nextAction: string;
}

export interface PilotEvidenceRegisterPreview {
  rowCount: number;
  columnCount: number;
  missingRequiredColumns: string[];
  forbiddenColumnsFound: string[];
  warnings: string[];
  acceptedConfidenceRowCount: number;
  distinctAcceptedProofPackCount: number;
  totalAcceptedConfidenceDelta: number;
  readinessMetrics: PilotEvidenceReadinessMetric[];
  laneCoverage: PilotEvidenceLaneCoverage[];
  gates: PilotEvidencePreviewGate[];
  cliCommand: string;
}

export const PILOT_EVIDENCE_REQUIRED_COLUMNS = [
  'record_date',
  'buyer_lane',
  'buyer_segment',
  'proof_pack_id',
  'route',
  'evidence_owner',
  'input_data_type',
  'source_label',
  'evidence_file_reference',
  'pii_screen_result',
  'commercial_commitment_status',
  'artifact_generated',
  'time_to_artifact_hours',
  'buyer_data_coverage_pct',
  'benchmark_lift_or_diagnostic',
  'reviewer_role',
  'reviewer_feedback_status',
  'reviewer_acceptance',
  'claim_boundary',
  'do_not_claim',
  'day_14_decision',
  'confidence_delta',
  'follow_up_action',
  'notes',
] as const;

const FORBIDDEN_COLUMNS = new Set([
  'account_number',
  'address',
  'customer_email',
  'customer_name',
  'email',
  'meter_id',
  'meter_identifier',
  'password',
  'phone',
  'phone_number',
  'postal_code',
  'secret',
  'service_address',
  'token',
]);

const STRONG_COMMERCIAL_STATUSES = new Set([
  'design_partner_signed',
  'letter_of_intent',
  'paid_pilot',
  'purchase_order',
]);
const CONFIDENCE_DELTA_EPSILON = 0.000001;

const ACCEPTED_REVIEW_STATUSES = new Set(['accepted', 'approved', 'signed']);
const COMPLETE_FEEDBACK_STATUSES = new Set(['accepted', 'approved', 'complete', 'signed']);
const BUYER_SOURCE_LABELS = new Set(['buyer_supplied_anonymized', 'buyer_supplied_confidential']);
const HASH_REFERENCE_PATTERN = /sha256[=:][a-f0-9]{64}/i;
const FORECAST_DIAGNOSTIC_PATTERNS = [
  /mae/i,
  /mape/i,
  /rmse/i,
  /persistence/i,
  /seasonal[- ]?naive/i,
  /rolling[- ]?(?:origin|split)|rolling split/i,
  /interval coverage|conformal/i,
  /champion|challenger/i,
];

const PROOF_PACK_BY_ROUTE = new Map(pilotIntakeRoutePlans.map((plan) => [plan.route, plan.proofPackId]));

type CsvRecord = Record<string, string>;

export function parsePilotEvidenceCsv(text: string): { headers: string[]; rows: CsvRecord[]; warnings: string[] } {
  const records = parseCsvRecords(text);
  const warnings: string[] = [];

  if (records.length === 0) {
    return { headers: [], rows: [], warnings: ['Register CSV is empty.'] };
  }

  const headers = records[0].map((header) => normalizeColumnName(header));
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) {
    warnings.push(`Duplicate columns detected: ${Array.from(new Set(duplicateHeaders)).join(', ')}.`);
  }

  const rows = records.slice(1)
    .filter((record) => record.some((cell) => cell.trim().length > 0))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ''])));

  return { headers, rows, warnings };
}

export function previewPilotEvidenceRegister(text: string): PilotEvidenceRegisterPreview {
  const { headers, rows, warnings } = parsePilotEvidenceCsv(text);
  const headerSet = new Set(headers);
  const missingRequiredColumns = PILOT_EVIDENCE_REQUIRED_COLUMNS.filter((column) => !headerSet.has(column));
  const forbiddenColumnsFound = headers.filter((header) => FORBIDDEN_COLUMNS.has(header));
  const acceptedConfidenceRows = missingRequiredColumns.length === 0
    ? rows.filter(isAcceptedConfidenceMovingBuyerRow)
    : [];
  const confidenceMovingBuyerRows = missingRequiredColumns.length === 0
    ? rows.filter((row) => parseNumber(row.confidence_delta) > 0 && BUYER_SOURCE_LABELS.has(normalizeText(row.source_label)))
    : [];
  const distinctAcceptedProofPackIds = new Set(acceptedConfidenceRows.map((row) => normalizeText(row.proof_pack_id)));
  const totalAcceptedConfidenceDelta = acceptedConfidenceRows.reduce(
    (total, row) => total + parseNumber(row.confidence_delta),
    0,
  );

  const utilityForecastRows = acceptedConfidenceRows.filter((row) => {
    const route = normalizeText(row.route);
    return route === '/utility-demand-forecast' || route === '/forecast-benchmarking';
  });
  const hasUtilityForecastEvidence = utilityForecastRows.some((row) => FORECAST_DIAGNOSTIC_PATTERNS.every((pattern) => pattern.test(row.benchmark_lift_or_diagnostic ?? '')));
  const hasTierOrCreditEvidence = acceptedConfidenceRows.some((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'tier_cfo_savings_pack' || proofPackId === 'tier_credit_banking_audit_pack';
  });
  const hasBillingOrSecurityEvidence = acceptedConfidenceRows.some((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'shadow_billing_invoice_pack' || proofPackId === 'utility_security_procurement_pack';
  });
  const hasCommercialSignal = acceptedConfidenceRows.some((row) => STRONG_COMMERCIAL_STATUSES.has(normalizeText(row.commercial_commitment_status)));
  const hashRows = acceptedConfidenceRows.filter((row) => HASH_REFERENCE_PATTERN.test(row.evidence_file_reference ?? ''));
  const coverageFailures = acceptedConfidenceRows.filter((row) => parseNumber(row.buyer_data_coverage_pct) < 70);
  const artifactHours = acceptedConfidenceRows.map((row) => parseNumber(row.time_to_artifact_hours));
  const validArtifactHours = artifactHours.filter((hours) => Number.isFinite(hours));
  const hasFastArtifact = validArtifactHours.some((hours) => hours <= 48);
  const hasOnlyTimelyArtifacts = acceptedConfidenceRows.length > 0
    && validArtifactHours.length === acceptedConfidenceRows.length
    && validArtifactHours.every((hours) => hours <= 120);
  const routeProofPackMismatches = rows.filter((row) => {
    const route = normalizeText(row.route);
    const expectedProofPackId = PROOF_PACK_BY_ROUTE.get(route);
    return expectedProofPackId && normalizeText(row.proof_pack_id) && expectedProofPackId !== normalizeText(row.proof_pack_id);
  });
  const tierOrCreditRows = acceptedConfidenceRows.filter((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'tier_cfo_savings_pack' || proofPackId === 'tier_credit_banking_audit_pack';
  });
  const billingOrSecurityRows = acceptedConfidenceRows.filter((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'shadow_billing_invoice_pack' || proofPackId === 'utility_security_procurement_pack';
  });
  const laneCoverage: PilotEvidenceLaneCoverage[] = [
    {
      id: 'utility-forecast',
      label: 'Utility forecast lane',
      status: hasUtilityForecastEvidence ? 'pass' : 'blocked',
      acceptedRowCount: utilityForecastRows.length,
      proofPackIds: uniqueProofPackIds(utilityForecastRows),
      evidence: hasUtilityForecastEvidence
        ? 'Accepted utility forecast evidence includes the required forecast diagnostic set.'
        : 'No accepted utility forecast row has the full forecast diagnostic set.',
      nextAction: 'Attach accepted utility forecast or forecast-trust evidence with numeric benchmark diagnostics.',
    },
    {
      id: 'tier-or-credit',
      label: 'TIER or credit lane',
      status: hasTierOrCreditEvidence ? 'pass' : 'blocked',
      acceptedRowCount: tierOrCreditRows.length,
      proofPackIds: uniqueProofPackIds(tierOrCreditRows),
      evidence: hasTierOrCreditEvidence
        ? 'Accepted TIER or credit-banking evidence is present.'
        : 'No accepted TIER CFO or credit-banking proof-pack row is present.',
      nextAction: 'Add accepted TIER CFO or credit-banking evidence with reviewer feedback.',
    },
    {
      id: 'billing-or-security',
      label: 'Billing or security lane',
      status: hasBillingOrSecurityEvidence ? 'pass' : 'blocked',
      acceptedRowCount: billingOrSecurityRows.length,
      proofPackIds: uniqueProofPackIds(billingOrSecurityRows),
      evidence: hasBillingOrSecurityEvidence
        ? 'Accepted shadow-billing or utility-security evidence is present.'
        : 'No accepted shadow-billing or utility-security proof-pack row is present.',
      nextAction: 'Add accepted shadow-billing or utility-security evidence with reviewer feedback.',
    },
  ];
  const passedLaneCount = laneCoverage.filter((lane) => lane.status === 'pass').length;
  const reviewerStatus = acceptedConfidenceRows.length > 0 && acceptedConfidenceRows.length === confidenceMovingBuyerRows.length
    ? 'pass'
    : confidenceMovingBuyerRows.length > 0
      ? 'warning'
      : 'blocked';
  const readinessMetrics: PilotEvidenceReadinessMetric[] = [
    {
      id: 'lane-coverage',
      label: 'Lane coverage',
      status: passedLaneCount === 3 ? 'pass' : 'blocked',
      value: `${passedLaneCount}/3 lanes`,
      evidence: 'Minimum Phase F coverage requires accepted utility forecast, TIER/credit, and billing/security evidence.',
      nextAction: 'Fill the missing minimum evidence lanes before claiming 95% market confidence.',
    },
    {
      id: 'reviewer-status',
      label: 'Reviewer status',
      status: reviewerStatus,
      value: `${acceptedConfidenceRows.length}/${Math.max(confidenceMovingBuyerRows.length, acceptedConfidenceRows.length)} accepted`,
      evidence: 'Rows count only when reviewer feedback is complete, reviewer acceptance is accepted/approved/signed, and day_14_decision=proceed.',
      nextAction: 'Capture reviewer role, feedback status, acceptance, and day-14 decision for each confidence-moving row.',
    },
    {
      id: 'confidence-delta',
      label: 'Confidence delta',
      status: totalAcceptedConfidenceDelta + CONFIDENCE_DELTA_EPSILON >= 0.9 && acceptedConfidenceRows.length > 0 ? 'pass' : 'blocked',
      value: formatNumber(totalAcceptedConfidenceDelta),
      evidence: 'Accepted buyer-supplied rows must total confidence_delta >= 0.9.',
      nextAction: 'Keep rehearsal rows at 0.0 and move confidence only after accepted buyer evidence exists.',
    },
    {
      id: 'fast-artifact-loop',
      label: 'Fast artifact loop',
      status: hasFastArtifact && hasOnlyTimelyArtifacts ? 'pass' : 'blocked',
      value: hasFastArtifact ? '<=48h present' : 'No <=48h row',
      evidence: 'At least one accepted proof pack must be delivered in 48 hours or less and all accepted rows must stay within 120 hours.',
      nextAction: 'Record time_to_artifact_hours for every accepted row and keep one accepted proof pack at or below 48 hours.',
    },
    {
      id: 'retained-hashes',
      label: 'Retained hashes',
      status: acceptedConfidenceRows.length > 0 && hashRows.length === acceptedConfidenceRows.length ? 'pass' : 'blocked',
      value: `${hashRows.length}/${acceptedConfidenceRows.length}`,
      evidence: 'Every accepted confidence-moving row needs a distinct retained redacted artifact SHA-256 reference.',
      nextAction: 'Attach text-inspectable retained artifacts and hash references for every accepted row.',
    },
    {
      id: 'commercial-signal',
      label: 'Commercial signal',
      status: hasCommercialSignal ? 'pass' : 'blocked',
      value: hasCommercialSignal ? 'Present' : 'Missing',
      evidence: 'At least one accepted row must prove design partner, paid pilot, purchase order, or letter of intent status.',
      nextAction: 'Attach retained text proving a strong commercial commitment before raising sellability confidence.',
    },
  ];

  return {
    rowCount: rows.length,
    columnCount: headers.filter(Boolean).length,
    missingRequiredColumns,
    forbiddenColumnsFound,
    warnings: [
      ...warnings,
      ...(routeProofPackMismatches.length > 0 ? [`${routeProofPackMismatches.length} row(s) have route/proof_pack_id mismatches.`] : []),
    ],
    acceptedConfidenceRowCount: acceptedConfidenceRows.length,
    distinctAcceptedProofPackCount: distinctAcceptedProofPackIds.size,
    totalAcceptedConfidenceDelta,
    readinessMetrics,
    laneCoverage,
    cliCommand: 'pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts',
    gates: [
      {
        id: 'required-schema',
        label: 'Required register schema',
        status: missingRequiredColumns.length === 0 && forbiddenColumnsFound.length === 0 ? 'pass' : 'blocked',
        evidence: `${headers.filter(Boolean).length} column(s); ${missingRequiredColumns.length} missing required; ${forbiddenColumnsFound.length} forbidden.`,
        nextAction: missingRequiredColumns.length === 0 && forbiddenColumnsFound.length === 0
          ? 'Keep the canonical 24-column register shape.'
          : 'Use the template columns and remove personal-data or secret columns.',
      },
      {
        id: 'utility-forecast-evidence',
        label: 'Accepted utility forecast evidence',
        status: hasUtilityForecastEvidence ? 'pass' : 'blocked',
        evidence: hasUtilityForecastEvidence ? 'Forecast diagnostics include MAE, MAPE, RMSE, baselines, rolling-origin, interval coverage, and champion/challenger language.' : 'No accepted confidence-moving forecast row with the full diagnostic set.',
        nextAction: 'Attach accepted utility forecast or forecast-trust evidence with numeric benchmark diagnostics.',
      },
      {
        id: 'tier-or-credit-evidence',
        label: 'Accepted TIER or credit evidence',
        status: hasTierOrCreditEvidence ? 'pass' : 'blocked',
        evidence: hasTierOrCreditEvidence ? 'At least one accepted TIER or credit-banking proof-pack row is present.' : 'No accepted TIER or credit-banking proof-pack row found.',
        nextAction: 'Add accepted TIER CFO or credit-banking evidence with reviewer feedback.',
      },
      {
        id: 'billing-or-security-evidence',
        label: 'Accepted billing or security evidence',
        status: hasBillingOrSecurityEvidence ? 'pass' : 'blocked',
        evidence: hasBillingOrSecurityEvidence ? 'At least one accepted billing or security proof-pack row is present.' : 'No accepted shadow-billing or utility-security proof-pack row found.',
        nextAction: 'Add accepted shadow-billing or utility-security evidence with reviewer feedback.',
      },
      {
        id: 'three-proof-packs',
        label: 'Three proceeding proof packs',
        status: distinctAcceptedProofPackIds.size >= 3 ? 'pass' : 'blocked',
        evidence: `${distinctAcceptedProofPackIds.size} distinct accepted confidence-moving proof_pack_id value(s).`,
        nextAction: 'Reach at least three distinct accepted proof packs with day_14_decision=proceed.',
      },
      {
        id: 'coverage-and-delta',
        label: 'Coverage and confidence movement',
        status: totalAcceptedConfidenceDelta + CONFIDENCE_DELTA_EPSILON >= 0.9 && coverageFailures.length === 0 && acceptedConfidenceRows.length > 0 ? 'pass' : 'blocked',
        evidence: `${formatNumber(totalAcceptedConfidenceDelta)} total accepted confidence_delta; ${coverageFailures.length} accepted row(s) below 70% buyer-data coverage.`,
        nextAction: 'Reach total accepted confidence_delta >= 0.9 and keep every confidence-moving row at 70%+ buyer-data coverage.',
      },
      {
        id: 'fast-artifact-loop',
        label: 'Fast pilot artifact loop',
        status: hasFastArtifact && hasOnlyTimelyArtifacts ? 'pass' : 'blocked',
        evidence: hasFastArtifact ? 'At least one accepted row is at or below 48 hours.' : 'No accepted row is at or below 48 hours.',
        nextAction: 'Record one accepted proof pack delivered within 48 hours and all accepted rows within 120 hours.',
      },
      {
        id: 'retained-artifact-hashes',
        label: 'Retained redacted artifact hashes',
        status: acceptedConfidenceRows.length > 0 && hashRows.length === acceptedConfidenceRows.length ? 'pass' : 'blocked',
        evidence: `${hashRows.length}/${acceptedConfidenceRows.length} accepted confidence-moving row(s) include sha256 references.`,
        nextAction: 'Attach a retained local redacted artifact with a matching SHA-256 reference for every accepted row.',
      },
      {
        id: 'commercial-signal',
        label: 'Commercial commitment signal',
        status: hasCommercialSignal ? 'pass' : 'blocked',
        evidence: hasCommercialSignal ? 'At least one accepted row has design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.' : 'No strong commercial commitment status found in accepted rows.',
        nextAction: 'Attach retained text proving paid pilot, PO, LOI, or signed design-partner status.',
      },
    ],
  };
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      record.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      if (char === '\r' && nextChar === '\n') index += 1;
      continue;
    }

    field += char;
  }

  record.push(field);
  if (record.some((cell) => cell.trim().length > 0)) {
    records.push(record);
  }

  return records;
}

function isAcceptedConfidenceMovingBuyerRow(row: CsvRecord): boolean {
  return parseNumber(row.confidence_delta) > 0
    && BUYER_SOURCE_LABELS.has(normalizeText(row.source_label))
    && COMPLETE_FEEDBACK_STATUSES.has(normalizeText(row.reviewer_feedback_status))
    && ACCEPTED_REVIEW_STATUSES.has(normalizeText(row.reviewer_acceptance))
    && normalizeText(row.day_14_decision) === 'proceed';
}

function uniqueProofPackIds(rows: CsvRecord[]): string[] {
  return Array.from(new Set(rows.map((row) => normalizeText(row.proof_pack_id)).filter(Boolean)));
}

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function parseNumber(value: string | undefined): number {
  const parsed = Number((value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
