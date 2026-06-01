#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
let allowTemplate = false;
let report = false;
let fileArg = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--allow-template') {
    allowTemplate = true;
    continue;
  }
  if (arg === '--report') {
    report = true;
    continue;
  }
  if (arg.startsWith('--')) {
    failures.push(`Unknown option: ${arg}`);
    continue;
  }
  if (fileArg) {
    failures.push(`Unexpected extra positional argument: ${arg}`);
    continue;
  }
  fileArg = arg;
}

const logPath = fileArg
  ? path.resolve(repoRoot, fileArg)
  : path.join(repoRoot, 'docs/growth/templates/OUTREACH_RESPONSE_LOG_TEMPLATE.csv');
const relativeLogPath = path.relative(repoRoot, logPath).split(path.sep).join('/');

const requiredColumns = [
  'activity_date',
  'channel',
  'target_label',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'rating',
  'variant_id',
  'caveat_used',
  'artifact_promised',
  'reply_status',
  'response_summary',
  'pain_signal',
  'requested_input',
  'reviewer_role',
  'commercial_commitment_status',
  'next_action',
  'pilot_evidence_register_action',
  'notes',
];

const forbiddenColumns = new Set([
  'target',
  'full_name',
  'first_name',
  'last_name',
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
  '/ga-ici-5cp',
  '/byo-csv-proof',
]);

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
  ['/ga-ici-5cp', new Set(['ga_ici_5cp_decision_support_pack'])],
  ['/byo-csv-proof', new Set(['byo_csv_privacy_proof_pack'])],
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

const allowedChannels = new Set([
  'linkedin',
  'email',
  'referral',
  'conference',
  'manual',
  'partner',
]);

const allowedReplyStatuses = new Set([
  'drafted',
  'sent_no_reply',
  'interested',
  'requested_info',
  'data_offered',
  'meeting_booked',
  'not_now',
  'not_fit',
  'unsubscribe',
]);

const allowedEvidenceActions = new Set([
  'none',
  'create_intake_packet',
  'prepare_retained_artifact',
  'update_register',
  'run_95_gate',
]);

const allowedCommercialCommitmentStatuses = new Set([
  'none',
  'design_partner_signed',
  'paid_pilot',
  'purchase_order',
  'letter_of_intent',
]);

const positiveOverclaimRules = [
  {
    label: 'production utility or telemetry claim',
    pattern: /\b(production utility onboarding|production utility bridge|production utility telemetry|native [`'"]?15-minute[`'"]? telemetry|customer LDC history)\b/i,
  },
  {
    label: 'certification or sovereignty claim',
    pattern: /\b(SOC[- ]?2(?: Type II)? (?:certified|compliant)|NERC CIP compliance|Green Button Alliance certification|certified Indigenous data sovereignty|OCAP(?:®)?[- ]compliant|OCAP(?:®)?[- ]ready)\b/i,
  },
  {
    label: 'TIER price, trading, or savings claim',
    pattern: /\b(live TIER market pricing|real-time credit price|live market price|live market pricing|broker quote|trade execution|guaranteed savings)\b/i,
  },
  {
    label: 'AI/GPU superiority claim',
    pattern: /\b(AI beats|GPU forecasting|Enterprise AI\/GPU superiority|AI\/GPU superiority)\b/i,
  },
  {
    label: 'engineering or regulator approval claim',
    pattern: /\b(engineering approval|regulator submission automation|filing counsel approval|legal compliance opinion)\b/i,
  },
];

const overclaimFields = [
  'artifact_promised',
  'response_summary',
  'pain_signal',
  'requested_input',
  'next_action',
  'notes',
];

const directIdentifierPatterns = [
  {
    label: 'email address',
    pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  },
  {
    label: 'North American phone number',
    pattern: /(?<![A-Za-z0-9])(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?![A-Za-z0-9])/,
  },
  {
    label: 'Canadian postal code',
    pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i,
  },
  {
    label: 'direct identifier column or label',
    pattern: /\b(?:customer[_ -]?name|customer[_ -]?email|account[_ -]?(?:number|no|id)|meter[_ -]?(?:id|identifier|number)|service[_ -]?address|postal[_ -]?code|phone(?:[_ -]?number)?)\b\s*[,;:=]/i,
  },
  {
    label: 'secret or credential assignment',
    pattern: /\b(?:api[_ -]?key|secret|password|token)\b\s*[:=]\s*\S+/i,
  },
  {
    label: 'street address',
    pattern: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Crescent|Cres)\b/i,
  },
];

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

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeColumnName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isBlank(value) {
  return String(value ?? '').trim().length === 0;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseRating(value, rowNumber) {
  const rating = Number(String(value ?? '').replace('/5', '').trim());
  if (!Number.isFinite(rating)) {
    failures.push(`Row ${rowNumber}: rating must be numeric, such as 4.5 or 4.5/5.`);
    return null;
  }
  if (rating < 0 || rating > 4.6) {
    failures.push(`Row ${rowNumber}: rating must stay between 0 and the current pre-buyer-evidence ceiling of 4.6/5.`);
  }
  return rating;
}

function scanDirectIdentifiers(row, rowNumber) {
  for (const [field, value] of Object.entries(row)) {
    if (isBlank(value)) continue;
    const matchedPattern = directIdentifierPatterns.find(({ pattern }) => pattern.test(value));
    if (matchedPattern) {
      failures.push(`Row ${rowNumber}: ${field} appears to contain ${matchedPattern.label}; keep repo outreach response logs anonymized and store direct contact details outside this repo.`);
    }
  }
}

function scanOverclaims(row, rowNumber) {
  for (const field of overclaimFields) {
    const value = row[field] ?? '';
    if (isBlank(value)) continue;
    for (const rule of positiveOverclaimRules) {
      if (rule.pattern.test(value)) {
        failures.push(`Row ${rowNumber}: ${field} contains a positive ${rule.label}; keep it only in caveat_used or do-not-claim wording.`);
      }
    }
  }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printReport(rows) {
  const byProofPack = new Map();
  const byReplyStatus = new Map();
  const byEvidenceAction = new Map();
  let evidenceActionCount = 0;

  for (const row of rows) {
    increment(byProofPack, row.proof_pack_id);
    increment(byReplyStatus, row.reply_status);
    increment(byEvidenceAction, row.pilot_evidence_register_action);
    if (row.pilot_evidence_register_action !== 'none') evidenceActionCount += 1;
  }

  console.log('\nCEIP Outreach Response Log Report');
  console.log(`Log: ${relativeLogPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Rows requiring evidence action: ${evidenceActionCount}`);
  console.log('Confidence movement: none; this report is outreach-response evidence only.');

  console.log('\nBy proof_pack_id:');
  for (const [key, count] of byProofPack) console.log(`- ${key}: ${count}`);

  console.log('\nBy reply_status:');
  for (const [key, count] of byReplyStatus) console.log(`- ${key}: ${count}`);

  console.log('\nBy pilot_evidence_register_action:');
  for (const [key, count] of byEvidenceAction) console.log(`- ${key}: ${count}`);
}

if (!existsSync(logPath)) {
  console.error(`Outreach response log not found: ${relativeLogPath}`);
  process.exit(1);
}

const csvText = readFileSync(logPath, 'utf8');
const rows = parseCsv(csvText);
const responseRows = [];

if (rows.length < 2) {
  failures.push('Outreach response log must include a header and at least one response row.');
} else {
  const headers = rows[0].map((header) => header.trim());
  const headerSet = new Set(headers);

  for (const column of requiredColumns) {
    if (!headerSet.has(column)) failures.push(`Missing required column: ${column}`);
  }

  for (const column of headers) {
    const normalizedColumn = normalizeColumnName(column);
    if (forbiddenColumns.has(normalizedColumn)) {
      failures.push(`Forbidden direct-identifier column present: ${column}; use target_label instead.`);
    }
  }

  rows.slice(1).forEach((cells, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const row = Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()]));
    const isTemplateRow = row.activity_date === 'YYYY-MM-DD';
    if (isTemplateRow && allowTemplate) return;
    if (isTemplateRow) failures.push(`Row ${rowNumber}: template placeholder row must be replaced before validation.`);

    for (const column of requiredColumns) {
      if (column === 'notes') continue;
      if (isBlank(row[column])) failures.push(`Row ${rowNumber}: ${column} is required.`);
    }

    if (!isValidIsoDate(row.activity_date ?? '')) {
      failures.push(`Row ${rowNumber}: activity_date must use a valid YYYY-MM-DD calendar date.`);
    }

    if (!allowedChannels.has(normalizeText(row.channel))) {
      failures.push(`Row ${rowNumber}: channel must be one of ${Array.from(allowedChannels).join(', ')}.`);
    }

    if (!allowedBuyerLanes.has(normalizeText(row.buyer_lane))) {
      failures.push(`Row ${rowNumber}: buyer_lane must be one of ${Array.from(allowedBuyerLanes).join(', ')}.`);
    }

    if (!allowedRoutes.has(row.route)) {
      failures.push(`Row ${rowNumber}: route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
    }

    const allowedProofPackIds = allowedProofPackIdsByRoute.get(row.route);
    if (allowedProofPackIds && !allowedProofPackIds.has(row.proof_pack_id)) {
      failures.push(`Row ${rowNumber}: proof_pack_id ${row.proof_pack_id} is not valid for route ${row.route}; expected one of ${Array.from(allowedProofPackIds).join(', ')}.`);
    }

    parseRating(row.rating, rowNumber);

    if (!allowedReplyStatuses.has(normalizeText(row.reply_status))) {
      failures.push(`Row ${rowNumber}: reply_status must be one of ${Array.from(allowedReplyStatuses).join(', ')}.`);
    }

    if (!allowedCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status))) {
      failures.push(`Row ${rowNumber}: commercial_commitment_status must be one of ${Array.from(allowedCommercialCommitmentStatuses).join(', ')}.`);
    }

    if (!allowedEvidenceActions.has(normalizeText(row.pilot_evidence_register_action))) {
      failures.push(`Row ${rowNumber}: pilot_evidence_register_action must be one of ${Array.from(allowedEvidenceActions).join(', ')}.`);
    }

    if (normalizeText(row.commercial_commitment_status) !== 'none'
      && normalizeText(row.pilot_evidence_register_action) === 'none') {
      failures.push(`Row ${rowNumber}: commercial commitment replies must set pilot_evidence_register_action to create_intake_packet, prepare_retained_artifact, update_register, or run_95_gate.`);
    }

    if (['data_offered', 'meeting_booked'].includes(normalizeText(row.reply_status))
      && normalizeText(row.pilot_evidence_register_action) === 'none') {
      failures.push(`Row ${rowNumber}: ${row.reply_status} replies must identify the next pilot evidence register action.`);
    }

    if (!/(do not|no |not |without|bounded|support only|decision-support|planning support|caveat|guardrail|boundary)/i.test(row.caveat_used ?? '')) {
      failures.push(`Row ${rowNumber}: caveat_used must include bounded or do-not-claim wording.`);
    }

    scanDirectIdentifiers(row, rowNumber);
    scanOverclaims(row, rowNumber);
    responseRows.push(row);
  });
}

if (failures.length > 0) {
  console.error('Outreach response log validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (report) printReport(responseRows);

console.log(`Outreach response log validation passed for ${responseRows.length} row(s): ${relativeLogPath}`);
