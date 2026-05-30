#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const allowTemplate = args.includes('--allow-template');
const fileArg = args.find((arg) => !arg.startsWith('--'));
const registerPath = fileArg
  ? path.resolve(repoRoot, fileArg)
  : path.join(repoRoot, 'docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv');

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

const allowedDecisions = new Set(['pending', 'proceed', 'park', 'pivot', 'reject']);
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

const failures = [];

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

if (!existsSync(registerPath)) {
  console.error(`Pilot evidence register not found: ${path.relative(repoRoot, registerPath)}`);
  process.exit(1);
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.record_date ?? '')) {
      failures.push(`Row ${rowNumber}: record_date must use YYYY-MM-DD.`);
    }

    if (!allowedRoutes.has(row.route)) {
      failures.push(`Row ${rowNumber}: route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
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

    if (!/no personal data|redacted|screened|not applicable/i.test(row.pii_screen_result ?? '')) {
      failures.push(`Row ${rowNumber}: pii_screen_result must state no personal data, redacted, screened, or not applicable.`);
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

      if (confidenceDelta > 0.2 && !/accepted|approved|signed/i.test(row.reviewer_acceptance ?? '')) {
        failures.push(`Row ${rowNumber}: confidence_delta above 0.2 requires accepted/approved/signed reviewer_acceptance.`);
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
  });
}

if (failures.length > 0) {
  console.error('Pilot evidence register validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pilot evidence register validation passed for ${Math.max(0, rows.length - 1)} row(s): ${path.relative(repoRoot, registerPath)}`);
