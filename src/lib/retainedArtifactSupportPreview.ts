import {
  detectRetainedArtifactWarnings,
  normalizeRetainedArtifactFileName,
} from './retainedArtifactHash';

export type RetainedArtifactSupportStatus = 'pass' | 'blocked' | 'warning';

export interface RetainedArtifactSupportCheck {
  id: string;
  label: string;
  status: RetainedArtifactSupportStatus;
  evidence: string;
  nextAction: string;
}

export interface RetainedArtifactSupportPreview {
  status: RetainedArtifactSupportStatus;
  summary: string;
  supportChecks: RetainedArtifactSupportCheck[];
  diagnosticChecks: RetainedArtifactSupportCheck[];
  updateCommand: string;
  evidenceReference: string;
}

export interface RetainedArtifactSupportInput {
  fileName: string;
  text: string;
  route: string;
  proofPackId: string;
  artifactReference?: string;
}

const COMPLETE_FEEDBACK_STATUSES = new Set(['accepted', 'approved', 'complete', 'signed']);
const ACCEPTED_REVIEW_STATUSES = new Set(['accepted', 'approved', 'signed']);
const STRONG_COMMERCIAL_STATUSES = new Set(['design_partner_signed', 'letter_of_intent', 'paid_pilot', 'purchase_order']);

const FORECAST_DIAGNOSTIC_CHECKS = [
  { id: 'mae', label: 'numeric MAE', pattern: /\bmae\b[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i },
  { id: 'mape', label: 'numeric MAPE', pattern: /\bmape\b[\s:=,|-]*\d+(?:\.\d+)?\s*%?/i },
  { id: 'rmse', label: 'numeric RMSE', pattern: /\brmse\b[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i },
  { id: 'persistence', label: 'numeric persistence baseline', pattern: /\bpersistence\b(?:[-_ ]?(?:baseline|mae|mape|rmse))?[\s:=,|-]*(?:mae|mape|rmse|baseline)?[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i },
  { id: 'seasonal-naive', label: 'numeric seasonal-naive baseline', pattern: /\bseasonal[-_ ]?naive\b(?:[-_ ]?(?:baseline|mae|mape|rmse))?[\s:=,|-]*(?:mae|mape|rmse|baseline)?[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i },
  { id: 'rolling-origin', label: 'rolling-origin split count', pattern: /\brolling[-_ ]?(?:origin[-_ ]?)?(?:(?:split|splits|window|windows)(?:[-_ ]?(?:count|n))?)?\b[\s:=,|-]*(?:count)?[\s:=,|-]*\d+\b/i },
  { id: 'interval-coverage', label: 'numeric interval coverage', pattern: /\b(?:interval[-_ ]?coverage|conformal[-_ ]?(?:interval[-_ ]?)?coverage)\b[\s:=,|-]*\d+(?:\.\d+)?\s*%?/i },
  { id: 'champion-challenger', label: 'champion/challenger status', pattern: /\bchampion\b[\s\S]{0,80}\bchallenger\b|\bchallenger\b[\s\S]{0,80}\bchampion\b/i },
];

const ROUTE_DIAGNOSTIC_RULES = new Map<string, { label: string; checks: Array<{ id: string; label: string; pattern: RegExp }> }>([
  ['/utility-demand-forecast', {
    label: 'numeric forecast benchmark diagnostics',
    checks: FORECAST_DIAGNOSTIC_CHECKS,
  }],
  ['/forecast-benchmarking', {
    label: 'numeric forecast benchmark diagnostics',
    checks: FORECAST_DIAGNOSTIC_CHECKS,
  }],
  ['/regulatory-filing', {
    label: 'OEB/AUC filing diagnostic evidence',
    checks: [
      { id: 'jurisdiction', label: 'OEB or AUC', pattern: /oeb|auc/i },
      { id: 'mapping', label: 'mapping evidence', pattern: /mapping|mapped/i },
      { id: 'checklist', label: 'checklist or schedule', pattern: /checklist|schedule|chapter 5|rule 005/i },
    ],
  }],
  ['/roi-calculator', {
    label: 'TIER CFO diagnostic evidence',
    checks: [
      { id: 'pricing-source', label: 'pricing source', pattern: /pricing|price/i },
      { id: 'direct-investment', label: 'direct-investment sensitivity', pattern: /direct[- ]?investment/i },
      { id: 'compliance', label: 'compliance diagnostic', pattern: /compliance/i },
    ],
  }],
  ['/credit-banking', {
    label: 'credit banking diagnostic evidence',
    checks: [
      { id: 'credit-lot', label: 'credit lot or vintage', pattern: /credit|lot|vintage/i },
      { id: 'expiry', label: 'expiry risk', pattern: /expiry|expiration/i },
      { id: 'allocation', label: 'allocation', pattern: /allocation|allocated/i },
      { id: 'liability', label: 'liability', pattern: /liability|obligation/i },
    ],
  }],
  ['/shadow-billing', {
    label: 'shadow-billing diagnostic evidence',
    checks: [
      { id: 'field-map', label: 'field map', pattern: /field[- ]?map|mapped field/i },
      { id: 'monthly-delta', label: 'monthly delta', pattern: /monthly[- ]?delta|delta/i },
      { id: 'excluded-rider', label: 'excluded rider or tariff evidence', pattern: /excluded|rider|tariff/i },
    ],
  }],
  ['/utility-security', {
    label: 'utility-security diagnostic evidence',
    checks: [
      { id: 'control-matrix', label: 'control matrix', pattern: /control/i },
      { id: 'evidence-boundary', label: 'evidence boundary', pattern: /evidence|boundary|sbom|header/i },
      { id: 'owner-deployed-split', label: 'owner/deployed evidence split', pattern: /owner[- ]?supplied|deployed|hosting|subprocessor/i },
    ],
  }],
  ['/ga-ici-5cp', {
    label: 'GA/ICI diagnostic evidence',
    checks: [
      { id: 'top-five', label: 'top-five or 5CP window', pattern: /top[- ]?five|5cp|coincident peak/i },
      { id: 'peak-demand-factor', label: 'peak demand factor', pattern: /peak[- ]?demand[- ]?factor|pdf/i },
      { id: 'ieso-source', label: 'IESO or Peak Tracker source', pattern: /ieso|peak tracker/i },
      { id: 'decision-boundary', label: 'decision-support boundary', pattern: /decision[- ]?support|settlement boundary/i },
    ],
  }],
  ['/byo-csv-proof', {
    label: 'BYO-CSV retained proof diagnostics',
    checks: [
      { id: 'schema', label: 'schema', pattern: /schema|column/i },
      { id: 'completeness', label: 'completeness', pattern: /completeness|row_count|row count/i },
      { id: 'identifier-screen', label: 'direct-identifier screen', pattern: /direct[- ]?identifier|privacy[- ]?screen/i },
      { id: 'formula-screen', label: 'spreadsheet formula screen', pattern: /formula|spreadsheet|csv[- ]?injection/i },
      { id: 'raw-values', label: 'retained raw values result', pattern: /retained raw values/i },
      { id: 'linkage-warning', label: 'quasi-identifier linkage warning', pattern: /quasi[- ]?identifier|linkage|re-identification/i },
      { id: 'confidence-gate', label: 'confidence-gate readiness', pattern: /confidence[- ]?gate/i },
    ],
  }],
]);

export function previewRetainedArtifactSupport({
  fileName,
  text,
  route,
  proofPackId,
  artifactReference,
}: RetainedArtifactSupportInput): RetainedArtifactSupportPreview {
  const normalizedFileName = normalizeRetainedArtifactFileName(fileName);
  const routeSlug = route.replace(/^\//, '') || 'pilot-evidence';
  const reference = artifactReference ?? `${normalizedFileName}#sha256=<hash-from-helper>`;
  const evidenceReference = reference.includes('/') ? reference : `${routeSlug}/${reference}`;
  const normalizedText = text.trim();
  const warnings = detectRetainedArtifactWarnings(normalizedFileName, text);
  const diagnosticRule = ROUTE_DIAGNOSTIC_RULES.get(route);
  const diagnosticChecks = diagnosticRule
    ? diagnosticRule.checks.map((check) => ({
      id: `diagnostic-${check.id}`,
      label: check.label,
      status: check.pattern.test(text) ? 'pass' : 'blocked',
      evidence: check.pattern.test(text)
        ? `Retained extract includes ${check.label}.`
        : `Missing ${check.label} required for ${diagnosticRule.label}.`,
      nextAction: `Add redacted ${check.label} evidence to the retained extract before updating the register.`,
    } satisfies RetainedArtifactSupportCheck))
    : [];

  const supportChecks: RetainedArtifactSupportCheck[] = [
    fieldCheck('record-date', 'Record date', /^record_date\s*:\s*\d{4}-\d{2}-\d{2}\s*$/im, text, 'Add `record_date: YYYY-MM-DD`.'),
    exactFieldCheck('route', 'Selected route', 'route', route, text, `Add \`route: ${route}\`.`),
    exactFieldCheck('proof-pack', 'Proof pack ID', 'proof_pack_id', proofPackId, text, `Add \`proof_pack_id: ${proofPackId}\`.`),
    fieldCheck('source-label', 'Buyer source label', /^source_label\s*:\s*buyer_supplied_(?:anonymized|confidential)\s*$/im, text, 'Use buyer_supplied_anonymized or buyer_supplied_confidential only after real buyer evidence exists.'),
    fieldCheck('pii-screen', 'Privacy-screen result', /^pii_screen_result\s*:\s*(?:no personal data|no personal data or meter identifiers found|redacted|screened)\s*$/im, text, 'Add the exact privacy-screen result supported by the retained extract.'),
    numericThresholdCheck('buyer-data-coverage', 'Buyer data coverage', 'buyer_data_coverage_pct', text, 70, 'Record buyer_data_coverage_pct and keep confidence-moving rows at 70 or higher.'),
    numericMaxCheck('time-to-artifact', 'Time to artifact', 'time_to_artifact_hours', text, 120, 'Record time_to_artifact_hours and keep accepted rows at 120 hours or less.'),
    setFieldCheck('reviewer-acceptance', 'Reviewer acceptance', 'reviewer_acceptance', ACCEPTED_REVIEW_STATUSES, text, 'Use accepted, approved, or signed only when reviewer evidence exists.'),
    setFieldCheck('reviewer-feedback', 'Reviewer feedback status', 'reviewer_feedback_status', COMPLETE_FEEDBACK_STATUSES, text, 'Use complete, accepted, approved, or signed only when retained text supports it.'),
    exactFieldCheck('day-14-decision', 'Day-14 decision', 'day_14_decision', 'proceed', text, 'Add `day_14_decision: proceed` only after the buyer/reviewer decision exists.'),
    fieldCheck('claim-boundary', 'Claim boundary', /^claim_boundary\s*:\s*.+$/im, text, 'Add the buyer/source claim boundary.'),
    fieldCheck('do-not-claim', 'Do-not-claim boundary', /^do_not_claim\s*:\s*.+$/im, text, 'Add the route-specific do-not-claim boundary.'),
    commercialCommitmentCheck(text),
    {
      id: 'sha-reference',
      label: 'SHA-256 evidence reference',
      status: artifactReference ? 'pass' : normalizedText.length > 0 ? 'warning' : 'blocked',
      evidence: artifactReference ? evidenceReference : 'Generate the SHA-256 reference after the retained text is final.',
      nextAction: 'Generate the SHA-256 reference only after editing is complete, then update the register through the CLI updater.',
    },
    {
      id: 'redaction-risk',
      label: 'Redaction and format screen',
      status: warnings.length > 0 ? 'warning' : normalizedText.length > 0 ? 'pass' : 'blocked',
      evidence: warnings.length > 0 ? warnings.join(' ') : 'No local format, identifier-wording, or formula-prefix warnings detected.',
      nextAction: 'Use a text-inspectable redacted extract and remove direct identifiers or spreadsheet formula risks before attaching.',
    },
  ];

  const allChecks = [...supportChecks, ...diagnosticChecks];
  const blockedCount = allChecks.filter((check) => check.status === 'blocked').length;
  const warningCount = allChecks.filter((check) => check.status === 'warning').length;
  const status: RetainedArtifactSupportStatus = blockedCount > 0 ? 'blocked' : warningCount > 0 ? 'warning' : 'pass';
  const passedCount = allChecks.filter((check) => check.status === 'pass').length;

  return {
    status,
    summary: `${passedCount}/${allChecks.length} retained-artifact support checks pass.`,
    supportChecks,
    diagnosticChecks,
    evidenceReference,
    updateCommand: [
      'pnpm run update:pilot-evidence-register-row --',
      '--register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-starter.csv',
      '--evidence-root /tmp/ceip-phase-f-evidence/redacted-artifacts',
      `--artifact-root /tmp/ceip-phase-f-evidence/redacted-artifacts/${routeSlug}`,
      `--evidence-file-reference ${evidenceReference}`,
      '--confidence-delta "<explicit 0..0.4, or 0 for staging>"',
      '--output-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
    ].join(' '),
  };
}

function fieldCheck(
  id: string,
  label: string,
  pattern: RegExp,
  text: string,
  nextAction: string,
): RetainedArtifactSupportCheck {
  const passed = pattern.test(text);
  return {
    id,
    label,
    status: passed ? 'pass' : 'blocked',
    evidence: passed ? `${label} is present in the retained extract.` : `${label} is missing or not in the expected retained-extract form.`,
    nextAction,
  };
}

function exactFieldCheck(
  id: string,
  label: string,
  field: string,
  expected: string,
  text: string,
  nextAction: string,
): RetainedArtifactSupportCheck {
  const value = extractFieldValue(text, field);
  const passed = normalizeValue(value) === normalizeValue(expected);
  return {
    id,
    label,
    status: passed ? 'pass' : 'blocked',
    evidence: passed ? `${field} matches ${expected}.` : `${field} must match ${expected}; current value is ${value || 'missing'}.`,
    nextAction,
  };
}

function setFieldCheck(
  id: string,
  label: string,
  field: string,
  allowedValues: Set<string>,
  text: string,
  nextAction: string,
): RetainedArtifactSupportCheck {
  const value = normalizeValue(extractFieldValue(text, field));
  return {
    id,
    label,
    status: allowedValues.has(value) ? 'pass' : 'blocked',
    evidence: allowedValues.has(value) ? `${field} is ${value}.` : `${field} is ${value || 'missing'}, not an accepted value.`,
    nextAction,
  };
}

function numericThresholdCheck(
  id: string,
  label: string,
  field: string,
  text: string,
  minimum: number,
  nextAction: string,
): RetainedArtifactSupportCheck {
  const numeric = Number(extractFieldValue(text, field));
  const present = Number.isFinite(numeric);
  return {
    id,
    label,
    status: present && numeric >= minimum ? 'pass' : 'blocked',
    evidence: present ? `${field} is ${numeric}; minimum is ${minimum}.` : `${field} is missing or non-numeric.`,
    nextAction,
  };
}

function numericMaxCheck(
  id: string,
  label: string,
  field: string,
  text: string,
  maximum: number,
  nextAction: string,
): RetainedArtifactSupportCheck {
  const numeric = Number(extractFieldValue(text, field));
  const present = Number.isFinite(numeric);
  return {
    id,
    label,
    status: present && numeric <= maximum ? 'pass' : 'blocked',
    evidence: present ? `${field} is ${numeric}; maximum is ${maximum}.` : `${field} is missing or non-numeric.`,
    nextAction,
  };
}

function commercialCommitmentCheck(text: string): RetainedArtifactSupportCheck {
  const status = normalizeValue(extractFieldValue(text, 'commercial_commitment_status'));
  const evidence = extractFieldValue(text, 'commercial_commitment_evidence');
  const hasStrongStatus = STRONG_COMMERCIAL_STATUSES.has(status);
  const hasEvidence = evidence.length > 0 && normalizeValue(evidence) !== status;

  if (hasStrongStatus && hasEvidence) {
    return {
      id: 'commercial-commitment',
      label: 'Commercial commitment evidence',
      status: 'pass',
      evidence: `${status} has retained supporting text.`,
      nextAction: 'Keep the retained text redacted and non-status-only.',
    };
  }

  if (status === 'none') {
    return {
      id: 'commercial-commitment',
      label: 'Commercial commitment evidence',
      status: 'warning',
      evidence: 'commercial_commitment_status is none. This can be acceptable for a staging row, but the 95% gate needs at least one strong commitment row.',
      nextAction: 'Attach one real paid pilot, purchase order, letter of intent, or signed design-partner artifact before raising market confidence.',
    };
  }

  return {
    id: 'commercial-commitment',
    label: 'Commercial commitment evidence',
    status: 'blocked',
    evidence: `commercial_commitment_status is ${status || 'missing'} without retained non-status-only evidence.`,
    nextAction: 'Add commercial_commitment_status plus retained agreement, invoice, payment, purchase-order, or LOI evidence, or use none for staging.',
  };
}

function extractFieldValue(text: string, field: string): string {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^${escapedField}\\s*:\\s*(.+?)\\s*$`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
