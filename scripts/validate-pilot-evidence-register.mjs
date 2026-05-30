#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const argFailures = [];
let allowTemplate = false;
let allowFixture95 = false;
let require95 = false;
let evidenceRootArg = null;
let fileArg = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') {
    continue;
  }
  if (arg === '--allow-template') {
    allowTemplate = true;
    continue;
  }
  if (arg === '--allow-fixture-95') {
    allowFixture95 = true;
    continue;
  }
  if (arg === '--require-95') {
    require95 = true;
    continue;
  }
  if (arg === '--evidence-root') {
    evidenceRootArg = args[index + 1] ?? null;
    index += 1;
    if (!evidenceRootArg || evidenceRootArg.startsWith('--')) {
      argFailures.push('--evidence-root requires a directory path.');
    }
    continue;
  }
  if (arg.startsWith('--evidence-root=')) {
    evidenceRootArg = arg.slice('--evidence-root='.length);
    if (!evidenceRootArg) argFailures.push('--evidence-root requires a directory path.');
    continue;
  }
  if (arg.startsWith('--')) {
    argFailures.push(`Unknown option: ${arg}`);
    continue;
  }
  if (fileArg) {
    argFailures.push(`Unexpected extra positional argument: ${arg}`);
    continue;
  }
  fileArg = arg;
}

const registerPath = fileArg
  ? path.resolve(repoRoot, fileArg)
  : path.join(repoRoot, 'docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv');
const relativeRegisterPath = path.relative(repoRoot, registerPath).split(path.sep).join('/');
const evidenceRoot = evidenceRootArg ? path.resolve(repoRoot, evidenceRootArg) : null;
const relativeEvidenceRoot = evidenceRoot
  ? path.relative(repoRoot, evidenceRoot).split(path.sep).join('/')
  : null;
const fixture95OverrideEnabled = allowFixture95 && process.env.CEIP_ALLOW_FIXTURE_95_FOR_TESTS === '1';
const todayIsoDate = new Date().toISOString().slice(0, 10);

const requiredColumns = [
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
];

const forbiddenColumns = new Set([
  'customer_name',
  'customer_email',
  'email',
  'phone',
  'phone_number',
  'account_number',
  'meter_identifier',
  'meter_id',
  'service_address',
  'address',
  'postal_code',
  'secret',
  'token',
  'password',
]);

const allowedRoutes = new Set([
  '/utility-demand-forecast',
  '/forecast-benchmarking',
  '/regulatory-filing',
  '/roi-calculator',
  '/credit-banking',
  '/shadow-billing',
  '/asset-health',
  '/utility-security',
  '/ai-datacentres',
  '/api-docs',
  '/pilot-readiness',
  '/pilot-evidence',
]);
const forecastEvidenceRoutes = new Set(['/utility-demand-forecast', '/forecast-benchmarking']);
const allowedProofPackIdsByRoute = new Map([
  ['/utility-demand-forecast', new Set(['utility_forecast_planning_pack'])],
  ['/forecast-benchmarking', new Set(['forecast_benchmark_provenance'])],
  ['/regulatory-filing', new Set(['regulatory_filing_pack'])],
  ['/roi-calculator', new Set(['tier_cfo_savings_pack'])],
  ['/credit-banking', new Set(['tier_credit_banking_audit_pack'])],
  ['/shadow-billing', new Set(['shadow_billing_invoice_pack'])],
  ['/asset-health', new Set(['asset_health_capex_pack'])],
  ['/utility-security', new Set(['utility_security_procurement_pack'])],
  ['/ai-datacentres', new Set(['large_load_readiness_overlay'])],
  ['/api-docs', new Set(['consultant_api_data_pack'])],
  ['/pilot-readiness', new Set(['pilot_readiness_gate'])],
  ['/pilot-evidence', new Set(['pilot_readiness_gate'])],
]);
const evidenceGateOnlyRoutes = new Set(['/pilot-readiness', '/pilot-evidence']);
const confidenceDiagnosticRulesByRoute = new Map([
  ['/utility-demand-forecast', {
    label: 'MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics',
    patterns: [/mae/i, /mape/i, /rmse/i, /persistence/i, /seasonal[- ]?naive/i],
  }],
  ['/forecast-benchmarking', {
    label: 'MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics',
    patterns: [/mae/i, /mape/i, /rmse/i, /persistence/i, /seasonal[- ]?naive/i],
  }],
  ['/regulatory-filing', {
    label: 'OEB or AUC mapping plus reviewer checklist or schedule evidence',
    patterns: [/oeb|auc/i, /mapping|mapped/i, /checklist|schedule|chapter 5|rule 005/i],
  }],
  ['/roi-calculator', {
    label: 'pricing source, direct-investment sensitivity, and compliance diagnostic evidence',
    patterns: [/pricing|price/i, /direct[- ]?investment/i, /compliance/i],
  }],
  ['/credit-banking', {
    label: 'credit lot or vintage, expiry risk, allocation, and liability evidence',
    patterns: [/credit|lot|vintage/i, /expiry|expiration/i, /allocation|allocated/i, /liability|obligation/i],
  }],
  ['/shadow-billing', {
    label: 'field map, monthly delta, and excluded rider or tariff evidence',
    patterns: [/field[- ]?map|mapped field/i, /monthly[- ]?delta|delta/i, /excluded|rider|tariff/i],
  }],
  ['/asset-health', {
    label: 'replace/defer, replacement-cost, and weight sensitivity evidence',
    patterns: [/replace|defer/i, /replacement[- ]?cost|cost override|capex/i, /weight|sensitivity/i],
  }],
  ['/utility-security', {
    label: 'control matrix, evidence-boundary, and owner/deployed evidence split',
    patterns: [/control/i, /evidence|boundary|sbom|header/i, /owner[- ]?supplied|deployed|hosting|subprocessor/i],
  }],
  ['/ai-datacentres', {
    label: 'assumptions, constraint, and storage or BYOP sensitivity evidence',
    patterns: [/assumption/i, /constraint|capacity|interconnection/i, /storage|byop/i],
  }],
  ['/api-docs', {
    label: 'endpoint, freshness, and OpenAPI diagnostic evidence',
    patterns: [/endpoint/i, /freshness/i, /openapi/i],
  }],
]);

const allowedDecisions = new Set(['pending', 'proceed', 'park', 'pivot', 'reject']);
const acceptedReviewerStatuses = new Set(['accepted', 'approved', 'signed']);
const completeFeedbackStatuses = new Set(['complete', 'accepted', 'approved', 'signed']);
const allowedPiiScreenResults = new Set([
  'no personal data',
  'no personal data or meter identifiers found',
  'redacted',
  'screened',
  'not applicable',
]);
const allowedBuyerLanes = new Set([
  'utility',
  'industrial',
  'municipal/public sector',
  'municipal',
  'security',
  'large load',
  'consultant/api',
]);
const buyerEvidenceLabels = new Set(['buyer_supplied_anonymized', 'buyer_supplied_confidential']);
const nonBuyerEvidenceLabels = new Set([
  'public_system_sample',
  'fallback_starter',
  'constructed_commercial_scenario',
  'public_sample',
  'owner_supplied_workflow',
]);
const allowedSourceLabels = new Set([
  ...buyerEvidenceLabels,
  ...nonBuyerEvidenceLabels,
]);

const failures = [...argFailures];
const evidenceRows = [];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  return rows;
}

function isBlank(value) {
  return value.trim().length === 0;
}

function normalizeColumnName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseNumber(value, label, rowNumber, required = true) {
  if (isBlank(value)) {
    if (required) failures.push(`Row ${rowNumber}: ${label} is required.`);
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    failures.push(`Row ${rowNumber}: ${label} must be numeric.`);
    return null;
  }
  return numeric;
}

function normalizeText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isAcceptedEvidence(value) {
  return acceptedReviewerStatuses.has(normalizeText(value ?? ''));
}

function isCompleteFeedback(value) {
  return completeFeedbackStatuses.has(normalizeText(value ?? ''));
}

function hasForecastBenchmarkDiagnostic(value) {
  const text = value ?? '';
  return /mae/i.test(text)
    && /mape/i.test(text)
    && /rmse/i.test(text)
    && /persistence/i.test(text)
    && /seasonal[- ]?naive/i.test(text);
}

function hasRequiredConfidenceDiagnostic(route, value) {
  const rule = confidenceDiagnosticRulesByRoute.get(route);
  if (!rule) return true;
  const text = value ?? '';
  return rule.patterns.every((pattern) => pattern.test(text));
}

function hasImmutableEvidenceReference(value) {
  return /sha256[=:][a-f0-9]{64}/i.test(value ?? '');
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseEvidenceReference(value) {
  const text = value ?? '';
  const hashMatch = text.match(/sha256[=:]([a-f0-9]{64})/i);
  const referencePath = text
    .replace(/[#?&|;\s]*sha256[=:][a-f0-9]{64}/ig, '')
    .trim();
  return {
    referencePath,
    sha256: hashMatch?.[1]?.toLowerCase() ?? null,
  };
}

function isInsideDirectory(candidatePath, rootPath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function verifyLocalEvidenceHash(referenceValue, rowNumber) {
  if (!evidenceRoot) return;

  const { referencePath, sha256 } = parseEvidenceReference(referenceValue);
  if (!sha256) return;

  if (!existsSync(evidenceRoot)) {
    failures.push(`--evidence-root does not exist: ${relativeEvidenceRoot}`);
    return;
  }

  if (!referencePath) {
    failures.push(`Row ${rowNumber}: evidence_file_reference must include a relative file path before the sha256 hash when --evidence-root is used.`);
    return;
  }

  const evidencePath = path.resolve(evidenceRoot, referencePath);
  if (!isInsideDirectory(evidencePath, evidenceRoot)) {
    failures.push(`Row ${rowNumber}: evidence_file_reference must stay inside --evidence-root.`);
    return;
  }

  if (!existsSync(evidencePath)) {
    failures.push(`Row ${rowNumber}: evidence artifact not found under --evidence-root: ${referencePath}`);
    return;
  }

  const actualHash = createHash('sha256').update(readFileSync(evidencePath)).digest('hex');
  if (actualHash !== sha256) {
    failures.push(`Row ${rowNumber}: evidence_file_reference sha256 does not match local artifact ${referencePath}.`);
  }
}

function isNonProduction95Register(filePath) {
  const normalizedPath = filePath.toLowerCase();
  const basename = path.basename(normalizedPath);
  return normalizedPath.startsWith('tests/fixtures/')
    || normalizedPath.startsWith('docs/growth/templates/')
    || normalizedPath.includes('/fixtures/')
    || /(^|[-_])(fixture|template|sample)([-_.]|$)/i.test(basename);
}

if (!existsSync(registerPath)) {
  console.error(`Pilot evidence register not found: ${relativeRegisterPath}`);
  process.exit(1);
}

if (allowFixture95 && !fixture95OverrideEnabled) {
  failures.push('--allow-fixture-95 is test-only and requires CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1.');
}

const csvText = readFileSync(registerPath, 'utf8');
const rows = parseCsv(csvText);

if (rows.length < 2) {
  failures.push('Pilot evidence register must include a header and at least one evidence row.');
} else {
  const headers = rows[0].map((header) => header.trim());
  const headerSet = new Set(headers);

  for (const column of requiredColumns) {
    if (!headerSet.has(column)) failures.push(`Missing required column: ${column}`);
  }

  for (const column of headers) {
    const normalizedColumn = normalizeColumnName(column);
    if (forbiddenColumns.has(normalizedColumn)) {
      failures.push(`Forbidden direct-identifier column present: ${column}`);
    }
  }

  rows.slice(1).forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const row = Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()]));
    const isTemplateRow = row.record_date === 'YYYY-MM-DD';

    if (isTemplateRow && allowTemplate) return;
    if (isTemplateRow) failures.push(`Row ${rowNumber}: template placeholder row must be replaced before validation.`);

    if (!isValidIsoDate(row.record_date ?? '')) {
      failures.push(`Row ${rowNumber}: record_date must use a valid YYYY-MM-DD calendar date.`);
    } else if ((row.record_date ?? '') > todayIsoDate) {
      failures.push(`Row ${rowNumber}: record_date cannot be in the future.`);
    }

    if (!allowedRoutes.has(row.route)) {
      failures.push(`Row ${rowNumber}: route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
    }

    const allowedProofPackIds = allowedProofPackIdsByRoute.get(row.route);
    if (allowedProofPackIds && !allowedProofPackIds.has(row.proof_pack_id)) {
      failures.push(`Row ${rowNumber}: proof_pack_id ${row.proof_pack_id} is not valid for route ${row.route}; expected one of ${Array.from(allowedProofPackIds).join(', ')}.`);
    }

    if (!allowedBuyerLanes.has(normalizeText(row.buyer_lane ?? ''))) {
      failures.push(`Row ${rowNumber}: buyer_lane must be one of ${Array.from(allowedBuyerLanes).join(', ')}.`);
    }

    if (!allowedSourceLabels.has(row.source_label)) {
      failures.push(`Row ${rowNumber}: source_label must be one of ${Array.from(allowedSourceLabels).join(', ')}.`);
    }

    for (const column of [
      'buyer_lane',
      'buyer_segment',
      'proof_pack_id',
      'evidence_owner',
      'input_data_type',
      'source_label',
      'evidence_file_reference',
      'pii_screen_result',
      'artifact_generated',
      'claim_boundary',
      'do_not_claim',
      'follow_up_action',
    ]) {
      if (isBlank(row[column] ?? '')) failures.push(`Row ${rowNumber}: ${column} is required.`);
    }

    if (!allowedPiiScreenResults.has(normalizeText(row.pii_screen_result ?? ''))) {
      failures.push(`Row ${rowNumber}: pii_screen_result must exactly be no personal data, no personal data or meter identifiers found, redacted, screened, or not applicable.`);
    }

    const timeToArtifact = parseNumber(row.time_to_artifact_hours ?? '', 'time_to_artifact_hours', rowNumber, false);
    if (timeToArtifact !== null && timeToArtifact < 0) {
      failures.push(`Row ${rowNumber}: time_to_artifact_hours cannot be negative.`);
    }

    const coverage = parseNumber(row.buyer_data_coverage_pct ?? '', 'buyer_data_coverage_pct', rowNumber, false);
    if (coverage !== null && (coverage < 0 || coverage > 100)) {
      failures.push(`Row ${rowNumber}: buyer_data_coverage_pct must be between 0 and 100.`);
    }

    const confidenceDelta = parseNumber(row.confidence_delta ?? '', 'confidence_delta', rowNumber);
    if (confidenceDelta !== null) {
      if (confidenceDelta < 0 || confidenceDelta > 0.4) {
        failures.push(`Row ${rowNumber}: confidence_delta must be between 0.0 and 0.4 for one feature evidence row.`);
      }

      if (confidenceDelta > 0 && !buyerEvidenceLabels.has(row.source_label)) {
        failures.push(`Row ${rowNumber}: confidence_delta above 0 requires buyer_supplied_anonymized or buyer_supplied_confidential source_label.`);
      }

      if (confidenceDelta > 0.2 && !isAcceptedEvidence(row.reviewer_acceptance ?? '')) {
        failures.push(`Row ${rowNumber}: confidence_delta above 0.2 requires reviewer_acceptance to be accepted, approved, or signed.`);
      }

      if (confidenceDelta > 0 && !isCompleteFeedback(row.reviewer_feedback_status ?? '')) {
        failures.push(`Row ${rowNumber}: confidence_delta above 0 requires reviewer_feedback_status to be complete, accepted, approved, or signed.`);
      }

      if (confidenceDelta > 0 && isBlank(row.reviewer_role ?? '')) {
        failures.push(`Row ${rowNumber}: reviewer_role is required for confidence-moving evidence.`);
      }

      if (confidenceDelta > 0 && coverage === null) {
        failures.push(`Row ${rowNumber}: buyer_data_coverage_pct is required for confidence-moving evidence.`);
      }

      if (confidenceDelta > 0 && !hasImmutableEvidenceReference(row.evidence_file_reference ?? '')) {
        failures.push(`Row ${rowNumber}: confidence-moving evidence_file_reference must include sha256=<64 hex chars> or sha256:<64 hex chars>.`);
      }

      if (confidenceDelta > 0) {
        verifyLocalEvidenceHash(row.evidence_file_reference ?? '', rowNumber);
      }
    }

    if (nonBuyerEvidenceLabels.has(row.source_label) && confidenceDelta !== null && confidenceDelta > 0) {
      failures.push(`Row ${rowNumber}: ${row.source_label} cannot increase market confidence.`);
    }

    if (!allowedDecisions.has((row.day_14_decision ?? '').toLowerCase())) {
      failures.push(`Row ${rowNumber}: day_14_decision must be pending, proceed, park, pivot, or reject.`);
    }

    if ((row.route === '/forecast-benchmarking' || row.route === '/utility-demand-forecast' || (confidenceDelta ?? 0) > 0)
      && isBlank(row.benchmark_lift_or_diagnostic ?? '')) {
      failures.push(`Row ${rowNumber}: benchmark_lift_or_diagnostic is required for forecast or confidence-moving evidence.`);
    }

    if (forecastEvidenceRoutes.has(row.route)
      && (confidenceDelta ?? 0) > 0
      && !hasForecastBenchmarkDiagnostic(row.benchmark_lift_or_diagnostic ?? '')) {
      failures.push(`Row ${rowNumber}: confidence-moving forecast evidence must include MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics.`);
    }

    if ((confidenceDelta ?? 0) > 0 && evidenceGateOnlyRoutes.has(row.route)) {
      failures.push(`Row ${rowNumber}: ${row.route} is an evidence gate only and cannot increase market confidence directly.`);
    }

    if ((confidenceDelta ?? 0) > 0 && !hasRequiredConfidenceDiagnostic(row.route, row.benchmark_lift_or_diagnostic ?? '')) {
      const rule = confidenceDiagnosticRulesByRoute.get(row.route);
      failures.push(`Row ${rowNumber}: confidence-moving evidence for ${row.route} must include ${rule.label}.`);
    }

    evidenceRows.push({
      rowNumber,
      row,
      confidenceDelta: confidenceDelta ?? 0,
      coverage,
    });
  });
}

if (require95 && failures.length === 0) {
  if (!fixture95OverrideEnabled && isNonProduction95Register(relativeRegisterPath)) {
    failures.push('95% confidence gate cannot be satisfied by fixture, template, or sample registers; use a buyer-evidence register path and reserve --allow-fixture-95 for tests only.');
  }

  const acceptedBuyerRows = evidenceRows.filter(({ row, confidenceDelta }) => (
    confidenceDelta > 0
    && buyerEvidenceLabels.has(row.source_label)
    && isAcceptedEvidence(row.reviewer_acceptance ?? '')
    && isCompleteFeedback(row.reviewer_feedback_status ?? '')
    && normalizeText(row.day_14_decision ?? '') === 'proceed'
  ));
  const acceptedProofPackIds = new Set(acceptedBuyerRows.map(({ row }) => row.proof_pack_id));
  const acceptedEvidenceHashes = new Set(acceptedBuyerRows
    .map(({ row }) => parseEvidenceReference(row.evidence_file_reference ?? '').sha256)
    .filter(Boolean));
  const totalConfidenceDelta = acceptedBuyerRows.reduce((sum, item) => sum + item.confidenceDelta, 0);
  const hasAcceptedUtilityForecast = acceptedBuyerRows.some(({ row }) => (
    row.route === '/utility-demand-forecast'
    && hasForecastBenchmarkDiagnostic(row.benchmark_lift_or_diagnostic ?? '')
  ));
  const hasAcceptedTierEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/roi-calculator' || row.route === '/credit-banking'
  ));
  const hasAcceptedBillingOrSecurityEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/shadow-billing' || row.route === '/utility-security'
  ));
  const lowCoverageRows = acceptedBuyerRows.filter(({ coverage }) => coverage === null || coverage < 70);

  if (!hasAcceptedUtilityForecast) {
    failures.push('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence with MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics.');
  }

  if (!hasAcceptedTierEvidence) {
    failures.push('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence.');
  }

  if (!hasAcceptedBillingOrSecurityEvidence) {
    failures.push('95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence.');
  }

  if (acceptedProofPackIds.size < 3) {
    failures.push('95% confidence gate requires at least three distinct accepted buyer-supplied proof_pack_id values with day_14_decision=proceed.');
  }

  if (acceptedEvidenceHashes.size < acceptedBuyerRows.length) {
    failures.push('95% confidence gate requires each accepted confidence-moving row to reference a distinct SHA-256 evidence artifact.');
  }

  if (totalConfidenceDelta < 0.899999) {
    failures.push('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9 across the strategy evidence rows.');
  }

  if (lowCoverageRows.length > 0) {
    failures.push(`95% confidence gate requires buyer_data_coverage_pct >= 70 for accepted confidence-moving rows; low rows: ${lowCoverageRows.map((item) => item.rowNumber).join(', ')}.`);
  }
}

if (failures.length > 0) {
  console.error('Pilot evidence register validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pilot evidence register validation passed for ${Math.max(0, rows.length - 1)} row(s): ${relativeRegisterPath}`);
