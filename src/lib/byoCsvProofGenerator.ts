export const BYO_CSV_PROOF_VERSION = 'byo-csv-proof-generator-v1';

export interface ByoCsvColumnProfile {
  column: string;
  inferred_type: 'numeric' | 'date' | 'boolean' | 'text' | 'empty';
  non_empty_count: number;
  empty_count: number;
  direct_identifier_risk: boolean;
  risk_labels: string[];
  spreadsheet_formula_risk: boolean;
  spreadsheet_formula_count: number;
  spreadsheet_formula_labels: string[];
  quasi_identifier_risk: boolean;
  quasi_identifier_labels: string[];
  distinct_non_empty_count: number;
}

export interface ByoCsvProofReport {
  version: string;
  generated_at: string;
  source_label: string;
  route: string;
  row_count: number;
  column_count: number;
  retained_raw_values: false;
  direct_identifier_findings: Array<{
    column: string;
    labels: string[];
    sample_count: number;
  }>;
  spreadsheet_formula_findings: Array<{
    column: string;
    labels: string[];
    sample_count: number;
  }>;
  quasi_identifier_findings: Array<{
    column: string;
    labels: string[];
    distinct_count: number;
    non_empty_count: number;
  }>;
  privacy_review_warnings: string[];
  column_profiles: ByoCsvColumnProfile[];
  proof_boundary: string;
  do_not_claim: string[];
  confidence_gate_ready: boolean;
}

export interface ByoCsvRetainedEvidenceExtractParams {
  recordDate: string;
  buyerDataCoveragePct: number;
  timeToArtifactHours: number;
  reviewerRole: string;
  reviewerAcceptance: 'accepted' | 'approved' | 'signed';
  reviewerFeedbackStatus: 'complete' | 'accepted' | 'approved' | 'signed';
  day14Decision: 'proceed' | 'park' | 'pivot' | 'reject' | 'pending';
  commercialCommitmentStatus: 'none' | 'design_partner_signed' | 'paid_pilot' | 'purchase_order' | 'letter_of_intent';
  proofPackId?: string;
  artifactTitle?: string;
  claimBoundary?: string;
  doNotClaim?: string;
}

const DIRECT_IDENTIFIER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'phone', pattern: /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/ },
  { label: 'canadian postal code', pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i },
  { label: 'account or meter identifier', pattern: /\b(?:account|acct|meter|premise|service)[-_ ]?(?:id|number|no)?[:#= ]+[A-Z0-9-]{4,}\b/i },
  { label: 'street address', pattern: /\b\d{1,6}\s+[A-Z0-9.'-]+(?:\s+[A-Z0-9.'-]+){0,4}\s+(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd|way|court|ct)\b/i },
];

const QUASI_IDENTIFIER_HEADER_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'time or interval quasi-identifier', pattern: /\b(timestamp|date|time|interval|hour|month|year)\b/i },
  { label: 'location quasi-identifier', pattern: /(^|[_\s-])(postal|fsa|city|location|latitude|longitude|lat|lon|geocode)([_\s-]|$)/i },
  { label: 'demographic quasi-identifier', pattern: /(^|[_\s-])(age|birth|dob|gender|sex)([_\s-]|$)/i },
  { label: 'operational asset or site identifier', pattern: /(^|[_\s-])(feeder|meter|premise|account|service|site|facility|asset|substation|transformer)([_\s-]|$)/i },
];

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return {
    headers,
    rows: lines.slice(1).map(splitCsvLine),
  };
}

function inferType(values: string[]): ByoCsvColumnProfile['inferred_type'] {
  const nonEmpty = values.filter((value) => value.trim().length > 0);
  if (nonEmpty.length === 0) return 'empty';
  const numericCount = nonEmpty.filter((value) => Number.isFinite(Number(value.replace(/,/g, '')))).length;
  if (numericCount / nonEmpty.length >= 0.9) return 'numeric';
  const booleanCount = nonEmpty.filter((value) => /^(true|false|yes|no)$/i.test(value)).length;
  if (booleanCount / nonEmpty.length >= 0.9) return 'boolean';
  const dateCount = nonEmpty.filter((value) => (
    /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})?/.test(value.trim())
    || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value.trim())
  ) && !Number.isNaN(new Date(value).getTime())).length;
  if (dateCount / nonEmpty.length >= 0.9) return 'date';
  return 'text';
}

function findDirectIdentifierLabels(values: string[], header: string): string[] {
  const headerLabels = DIRECT_IDENTIFIER_PATTERNS
    .filter(({ pattern }) => pattern.test(header))
    .map(({ label }) => label);
  const valueLabels = DIRECT_IDENTIFIER_PATTERNS
    .filter(({ pattern }) => values.some((value) => pattern.test(value)))
    .map(({ label }) => label);
  return Array.from(new Set([...headerLabels, ...valueLabels])).sort();
}

function isSignedNumericLiteral(value: string): boolean {
  return /^[-+]?(?:\d+(?:,\d{3})*|\d*)(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(value.trim())
    && /\d/.test(value);
}

function findSpreadsheetFormulaLabel(value: string): string | null {
  const leftTrimmed = value.trimStart();
  if (leftTrimmed.length === 0) return null;
  if (/^[\t\r\n]/.test(value)) return 'control-character formula prefix';
  const first = leftTrimmed[0];
  if (first === '=') return 'equals formula prefix';
  if (first === '@') return 'at-sign formula prefix';
  if (/^[\uFF1D\uFF0B\uFF0D\uFF20]/.test(first)) return 'full-width formula prefix';
  if ((first === '+' || first === '-') && !isSignedNumericLiteral(leftTrimmed)) {
    return `${first} formula prefix`;
  }
  return null;
}

function findSpreadsheetFormulaLabels(values: string[]): string[] {
  const labels = values
    .map(findSpreadsheetFormulaLabel)
    .filter((label): label is string => Boolean(label));
  return Array.from(new Set(labels)).sort();
}

function countSpreadsheetFormulaValues(values: string[]): number {
  return values.filter((value) => findSpreadsheetFormulaLabel(value)).length;
}

function findQuasiIdentifierLabels(header: string): string[] {
  return QUASI_IDENTIFIER_HEADER_PATTERNS
    .filter(({ pattern }) => pattern.test(header))
    .map(({ label }) => label)
    .sort();
}

function buildPrivacyReviewWarnings(params: {
  rowCount: number;
  directIdentifierFindingCount: number;
  spreadsheetFormulaFindingCount: number;
  quasiIdentifierFindingCount: number;
}): string[] {
  const warnings: string[] = [
    'De-identification carries residual re-identification risk; this report is a screening artifact, not privacy certification.',
  ];
  if (params.directIdentifierFindingCount > 0) {
    warnings.push('Direct identifiers were detected; create a redacted extract before using this as confidence-moving evidence.');
  }
  if (params.spreadsheetFormulaFindingCount > 0) {
    warnings.push('Spreadsheet formula risk was detected; neutralize or remove formula-like cells before reviewer use.');
  }
  if (params.quasiIdentifierFindingCount > 0) {
    warnings.push('Quasi-identifiers or operational identifiers need buyer privacy review for linkage risk before outbound sharing.');
  }
  if (params.rowCount > 0 && params.rowCount < 5) {
    warnings.push('Small row-count samples are useful for smoke tests but do not prove low re-identification risk.');
  }
  return warnings;
}

export function buildByoCsvProofReport(params: {
  csvText: string;
  sourceLabel: string;
  route: string;
  generatedAt?: string;
}): ByoCsvProofReport {
  const parsed = parseCsv(params.csvText);
  const columnProfiles = parsed.headers.map((header, columnIndex) => {
    const normalizedHeader = header.trim();
    const values = parsed.rows.map((row) => row[columnIndex] ?? '');
    const riskLabels = findDirectIdentifierLabels(values, normalizedHeader);
    const formulaLabels = findSpreadsheetFormulaLabels(values);
    const quasiIdentifierLabels = findQuasiIdentifierLabels(normalizedHeader);
    const nonEmptyCount = values.filter((value) => value.trim().length > 0).length;
    const distinctNonEmptyCount = new Set(values
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)).size;
    return {
      column: normalizedHeader || `column_${columnIndex + 1}`,
      inferred_type: inferType(values),
      non_empty_count: nonEmptyCount,
      empty_count: Math.max(parsed.rows.length - nonEmptyCount, 0),
      direct_identifier_risk: riskLabels.length > 0,
      risk_labels: riskLabels,
      spreadsheet_formula_risk: formulaLabels.length > 0,
      spreadsheet_formula_count: countSpreadsheetFormulaValues(values),
      spreadsheet_formula_labels: formulaLabels,
      quasi_identifier_risk: quasiIdentifierLabels.length > 0,
      quasi_identifier_labels: quasiIdentifierLabels,
      distinct_non_empty_count: distinctNonEmptyCount,
    };
  });

  const directIdentifierFindings = columnProfiles
    .filter((profile) => profile.direct_identifier_risk)
    .map((profile) => ({
      column: profile.column,
      labels: profile.risk_labels,
      sample_count: profile.non_empty_count,
    }));

  const spreadsheetFormulaFindings = columnProfiles
    .filter((profile) => profile.spreadsheet_formula_risk)
    .map((profile) => ({
      column: profile.column,
      labels: profile.spreadsheet_formula_labels,
      sample_count: profile.spreadsheet_formula_count,
    }));

  const quasiIdentifierFindings = columnProfiles
    .filter((profile) => profile.quasi_identifier_risk)
    .map((profile) => ({
      column: profile.column,
      labels: profile.quasi_identifier_labels,
      distinct_count: profile.distinct_non_empty_count,
      non_empty_count: profile.non_empty_count,
    }));

  const privacyReviewWarnings = buildPrivacyReviewWarnings({
    rowCount: parsed.rows.length,
    directIdentifierFindingCount: directIdentifierFindings.length,
    spreadsheetFormulaFindingCount: spreadsheetFormulaFindings.length,
    quasiIdentifierFindingCount: quasiIdentifierFindings.length,
  });

  return {
    version: BYO_CSV_PROOF_VERSION,
    generated_at: params.generatedAt ?? new Date().toISOString(),
    source_label: params.sourceLabel,
    route: params.route,
    row_count: parsed.rows.length,
    column_count: parsed.headers.length,
    retained_raw_values: false,
    direct_identifier_findings: directIdentifierFindings,
    spreadsheet_formula_findings: spreadsheetFormulaFindings,
    quasi_identifier_findings: quasiIdentifierFindings,
    privacy_review_warnings: privacyReviewWarnings,
    column_profiles: columnProfiles,
    proof_boundary: 'BYO-CSV proof records schema, completeness, direct-identifier screening, spreadsheet formula screening, and quasi-identifier linkage warnings only. Raw values are not retained in this report.',
    do_not_claim: [
      'No privacy risk',
      'PII-free certification',
      'No re-identification risk',
      'Buyer acceptance',
      'Production connector approval',
      '95% confidence evidence without retained redacted artifacts and reviewer acceptance',
    ],
    confidence_gate_ready: directIdentifierFindings.length === 0
      && spreadsheetFormulaFindings.length === 0
      && parsed.rows.length > 0,
  };
}

export function byoCsvProofReportToMarkdown(report: ByoCsvProofReport): string {
  return [
    '# BYO-CSV privacy proof report',
    '',
    `- Version: ${report.version}`,
    `- Generated: ${report.generated_at}`,
    `- Source label: ${report.source_label}`,
    `- Route: ${report.route}`,
    `- Rows: ${report.row_count}`,
    `- Columns: ${report.column_count}`,
    `- Retained raw values: ${report.retained_raw_values ? 'yes' : 'no'}`,
    `- Spreadsheet formula findings: ${report.spreadsheet_formula_findings.length}`,
    `- Quasi-identifier warnings: ${report.quasi_identifier_findings.length}`,
    `- Privacy review warnings: ${report.privacy_review_warnings.length}`,
    `- Confidence gate ready: ${report.confidence_gate_ready ? 'yes' : 'no'}`,
    `- Proof boundary: ${report.proof_boundary}`,
    '',
    '| Column | Type | Non-empty | Empty | Distinct | Direct identifier risk | Formula risk | Quasi-identifier warning | Labels |',
    '|---|---|---:|---:|---:|---|---|---|---|',
    ...report.column_profiles.map((profile) => [
      profile.column,
      profile.inferred_type,
      profile.non_empty_count,
      profile.empty_count,
      profile.distinct_non_empty_count,
      profile.direct_identifier_risk ? 'yes' : 'no',
      profile.spreadsheet_formula_risk ? 'yes' : 'no',
      profile.quasi_identifier_risk ? 'yes' : 'no',
      [...profile.risk_labels, ...profile.spreadsheet_formula_labels, ...profile.quasi_identifier_labels].join('; ') || 'none',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Spreadsheet Formula Findings',
    ...(report.spreadsheet_formula_findings.length > 0
      ? report.spreadsheet_formula_findings.map((finding) => (
        `- ${finding.column}: ${finding.labels.join('; ')} (${finding.sample_count} sample rows screened)`
      ))
      : ['- none']),
    '',
    '## Quasi-Identifier Linkage Warnings',
    ...(report.quasi_identifier_findings.length > 0
      ? report.quasi_identifier_findings.map((finding) => (
        `- ${finding.column}: ${finding.labels.join('; ')} (${finding.distinct_count}/${finding.non_empty_count} distinct non-empty values)`
      ))
      : ['- none']),
    '',
    '## Privacy Review Warnings',
    ...report.privacy_review_warnings.map((warning) => `- ${warning}`),
    '',
    '## Do Not Claim',
    ...report.do_not_claim.map((claim) => `- ${claim}`),
  ].join('\n');
}

export function buildByoCsvRetainedEvidenceExtract(
  report: ByoCsvProofReport,
  params: ByoCsvRetainedEvidenceExtractParams,
): string {
  const piiScreenResult = report.direct_identifier_findings.length === 0 && report.spreadsheet_formula_findings.length === 0
    ? 'no personal data or meter identifiers found'
    : 'screened';
  const claimBoundary = params.claimBoundary
    ?? 'Buyer supplied redacted CSV privacy-screen workflow only; no raw values retained in this extract; linkage risk still requires buyer privacy review.';
  const doNotClaim = params.doNotClaim
    ?? 'Do not claim PII-free certification, no privacy risk, no re-identification risk, buyer acceptance, or production connector approval.';

  return [
    `# ${params.artifactTitle ?? 'CEIP BYO-CSV retained evidence extract'}`,
    '',
    'This retained artifact is a redacted text-inspectable extract. Sensitive originals stay outside the repository.',
    'Raw CSV cell values are not retained in this extract.',
    '',
    `record_date: ${params.recordDate}`,
    `route: ${report.route}`,
    `proof_pack_id: ${params.proofPackId ?? 'byo_csv_privacy_proof_pack'}`,
    `source_label: ${report.source_label}`,
    `pii_screen_result: ${piiScreenResult}`,
    `buyer_data_coverage_pct: ${params.buyerDataCoveragePct}`,
    `time_to_artifact_hours: ${params.timeToArtifactHours}`,
    `reviewer_role: ${params.reviewerRole}`,
    `reviewer_acceptance: ${params.reviewerAcceptance}`,
    `reviewer_feedback_status: ${params.reviewerFeedbackStatus}`,
    `day_14_decision: ${params.day14Decision}`,
    `commercial_commitment_status: ${params.commercialCommitmentStatus}`,
    `commercial_commitment_evidence: ${params.commercialCommitmentStatus}`,
    `claim_boundary: ${claimBoundary}`,
    `do_not_claim: ${doNotClaim}`,
    '',
    '## BYO-CSV Diagnostic Summary',
    `- schema column_count: ${report.column_count}`,
    `- completeness row_count: ${report.row_count}; profiled columns: ${report.column_profiles.length}`,
    `- direct identifier findings: ${report.direct_identifier_findings.length}`,
    `- spreadsheet formula findings: ${report.spreadsheet_formula_findings.length}`,
    `- quasi-identifier warnings: ${report.quasi_identifier_findings.length}`,
    `- retained raw values: ${report.retained_raw_values ? 'yes' : 'no'}`,
    `- confidence gate ready: ${report.confidence_gate_ready ? 'yes' : 'no'}`,
    `- proof boundary: ${report.proof_boundary}`,
    '',
    '## Column Profiles',
    '| Column | Type | Non-empty | Empty | Distinct | Direct identifier risk | Formula risk | Quasi-identifier warning | Labels |',
    '|---|---|---:|---:|---:|---|---|---|---|',
    ...report.column_profiles.map((profile) => [
      profile.column,
      profile.inferred_type,
      profile.non_empty_count,
      profile.empty_count,
      profile.distinct_non_empty_count,
      profile.direct_identifier_risk ? 'yes' : 'no',
      profile.spreadsheet_formula_risk ? 'yes' : 'no',
      profile.quasi_identifier_risk ? 'yes' : 'no',
      [...profile.risk_labels, ...profile.spreadsheet_formula_labels, ...profile.quasi_identifier_labels].join('; ') || 'none',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Direct Identifier Findings',
    ...(report.direct_identifier_findings.length > 0
      ? report.direct_identifier_findings.map((finding) => (
        `- ${finding.column}: ${finding.labels.join('; ')} (${finding.sample_count} non-empty sample rows screened)`
      ))
      : ['- none']),
    '',
    '## Spreadsheet Formula Findings',
    ...(report.spreadsheet_formula_findings.length > 0
      ? report.spreadsheet_formula_findings.map((finding) => (
        `- ${finding.column}: ${finding.labels.join('; ')} (${finding.sample_count} sample rows screened)`
      ))
      : ['- none']),
    '',
    '## Quasi-Identifier Linkage Warnings',
    ...(report.quasi_identifier_findings.length > 0
      ? report.quasi_identifier_findings.map((finding) => (
        `- ${finding.column}: ${finding.labels.join('; ')} (${finding.distinct_count}/${finding.non_empty_count} distinct non-empty values)`
      ))
      : ['- none']),
    '',
    '## Privacy Review Warnings',
    ...report.privacy_review_warnings.map((warning) => `- ${warning}`),
    '',
  ].join('\n');
}
