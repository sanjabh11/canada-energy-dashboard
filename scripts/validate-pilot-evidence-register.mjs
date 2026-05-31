#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateExistingEvidencePathInsideRoot } from './lib/evidence-path-safety.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const argFailures = [];
let allowTemplate = false;
let allowFixture95 = false;
let require95 = false;
let report95 = false;
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
  if (arg === '--report-95') {
    report95 = true;
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
const testTodayOverride = process.env.CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS ?? '';
if (testTodayOverride && !fixture95OverrideEnabled) {
  argFailures.push('CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS is test-only and requires --allow-fixture-95 with CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1.');
}
if (testTodayOverride && !isValidIsoDate(testTodayOverride)) {
  argFailures.push('CEIP_PILOT_EVIDENCE_TODAY_FOR_TESTS must be a valid YYYY-MM-DD date.');
}
const todayIsoDate = testTodayOverride && fixture95OverrideEnabled && isValidIsoDate(testTodayOverride)
  ? testTodayOverride
  : new Date().toISOString().slice(0, 10);

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
  '/ga-ici-5cp',
  '/byo-csv-proof',
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
  ['/ga-ici-5cp', new Set(['ga_ici_5cp_decision_support_pack'])],
  ['/byo-csv-proof', new Set(['byo_csv_privacy_proof_pack'])],
]);
const evidenceGateOnlyRoutes = new Set(['/pilot-readiness', '/pilot-evidence']);
const confidenceDiagnosticRulesByRoute = new Map([
  ['/utility-demand-forecast', {
    label: 'MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics',
    patterns: [/mae/i, /mape/i, /rmse/i, /persistence/i, /seasonal[- ]?naive/i, /rolling[- ]?(?:origin|split)|rolling split/i, /interval coverage|conformal/i, /champion|challenger/i],
  }],
  ['/forecast-benchmarking', {
    label: 'MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics',
    patterns: [/mae/i, /mape/i, /rmse/i, /persistence/i, /seasonal[- ]?naive/i, /rolling[- ]?(?:origin|split)|rolling split/i, /interval coverage|conformal/i, /champion|challenger/i],
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
  ['/ga-ici-5cp', {
    label: 'top five peak hours, peak demand factor, IESO source, and decision-support boundary evidence',
    patterns: [/top[- ]?five|5cp|coincident peak/i, /peak[- ]?demand[- ]?factor|pdf/i, /ieso|peak tracker/i, /decision[- ]?support|settlement boundary/i],
  }],
  ['/byo-csv-proof', {
    label: 'schema, completeness, direct-identifier screen, spreadsheet formula screen, retained raw values, quasi-identifier linkage warning, and confidence-gate readiness evidence',
    patterns: [
      /schema|column/i,
      /completeness|row_count|row count/i,
      /direct[- ]?identifier|privacy[- ]?screen/i,
      /formula|spreadsheet|csv[- ]?injection/i,
      /retained raw values/i,
      /quasi[- ]?identifier|linkage|re-identification/i,
      /confidence[- ]?gate/i,
    ],
  }],
]);
const confidenceClaimBoundaryRulesByRoute = new Map([
  ['/utility-demand-forecast', {
    label: 'buyer/source boundary plus no production utility, telemetry, or control-room claim',
    doNotClaimPatterns: [/production/i, /utility approval/i, /live|native/i, /telemetry/i, /control[- ]?room/i],
  }],
  ['/forecast-benchmarking', {
    label: 'benchmark boundary plus no guaranteed accuracy or AI/GPU superiority claim',
    doNotClaimPatterns: [/guaranteed accuracy/i, /forecast superiority/i, /ai\/gpu|gpu|ai beats/i, /enterprise superiority/i],
  }],
  ['/regulatory-filing', {
    label: 'filing-prep boundary plus no regulator submission, counsel approval, or legal opinion claim',
    doNotClaimPatterns: [/regulator/i, /submission automation|approval/i, /filing counsel/i, /legal/i],
  }],
  ['/roi-calculator', {
    label: 'planning boundary plus no guaranteed savings, live market price, broker, trade, tax, or legal claim',
    doNotClaimPatterns: [/guaranteed savings/i, /live market price|live pricing/i, /broker|trade/i, /tax|legal/i],
  }],
  ['/credit-banking', {
    label: 'ledger-planning boundary plus no broker, trade, registry certification, legal, or live-price claim',
    doNotClaimPatterns: [/broker|trade/i, /registry/i, /certification/i, /legal/i, /live market price|live pricing/i],
  }],
  ['/shadow-billing', {
    label: 'supplied-field boundary plus no guaranteed or fully verified savings/tariff claim',
    doNotClaimPatterns: [/verified savings|guaranteed savings/i, /beyond supplied/i, /tariff|rider/i, /full bill/i],
  }],
  ['/asset-health', {
    label: 'planning boundary plus no predictive-maintenance, SCADA/ADMS, engineering approval, or replacement mandate claim',
    doNotClaimPatterns: [/predictive/i, /scada|adms/i, /engineering approval/i, /replacement mandate|guaranteed replacement/i],
  }],
  ['/utility-security', {
    label: 'evidence-boundary split plus no SOC/NERC certification or production approval claim',
    doNotClaimPatterns: [/soc/i, /nerc/i, /certification|certified/i, /production approval|production utility/i],
  }],
  ['/ai-datacentres', {
    label: 'assumptions-only boundary plus no engineering, interconnection, capacity, or dispatch approval claim',
    doNotClaimPatterns: [/engineering approval/i, /interconnection approval|connection approval/i, /available capacity/i, /dispatch|control[- ]?room/i],
  }],
  ['/api-docs', {
    label: 'consultant workflow boundary plus no production integration, live-data SLA, or full OpenAPI parity claim',
    doNotClaimPatterns: [/production integration|production api/i, /live[- ]?data sla|sla/i, /full openapi parity/i],
  }],
  ['/ga-ici-5cp', {
    label: 'decision-support boundary plus no guaranteed savings, final IESO settlement, eligibility, or operational instruction claim',
    doNotClaimPatterns: [/guaranteed savings/i, /final ieso|settlement/i, /eligibility/i, /operational|curtailment instruction/i],
  }],
  ['/byo-csv-proof', {
    label: 'privacy-screen boundary plus no PII-free certification, no privacy risk, buyer acceptance, or connector approval claim',
    doNotClaimPatterns: [/pii[- ]?free|privacy/i, /certification|certified/i, /buyer acceptance/i, /connector approval|production connector/i],
  }],
]);
const confidenceBoundaryPatterns = [
  /buyer[- ]?supplied/i,
  /owner[- ]?supplied/i,
  /uploaded/i,
  /redacted/i,
  /planning support/i,
  /workflow only/i,
  /fields only/i,
  /energy supply/i,
  /source[- ]?labeled/i,
  /buyer workflow/i,
];
const positiveOverclaimRules = [
  {
    label: 'cross-repo avalanche prediction claim',
    pattern: /\b(accurate avalanche prediction|accurate avalanche predictions|avalanche prediction product|avalanche forecasting)\b/i,
  },
  {
    label: 'world-class or best-of-class claim',
    pattern: /\b(world[- ]class|best[- ]of[- ]class|best[- ]in[- ]class)\b/i,
  },
  {
    label: 'production utility or telemetry claim',
    pattern: /\b(production utility onboarding|production utility bridge|production utility telemetry|native [`'"]?15-minute[`'"]? telemetry|customer LDC history)\b/i,
  },
  {
    label: 'certification or sovereignty claim',
    pattern: /\b(SOC[- ]?2(?: Type II)? (?:certified|compliant)|NERC CIP compliance|Green Button Alliance certification|hardened Indigenous sovereignty|OCAP(?:®)?[- ]compliant|OCAP(?:®)?[- ]ready)\b/i,
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
const positiveOverclaimFields = [
  'buyer_segment',
  'input_data_type',
  'artifact_generated',
  'benchmark_lift_or_diagnostic',
  'reviewer_role',
  'reviewer_feedback_status',
  'reviewer_acceptance',
  'day_14_decision',
  'follow_up_action',
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
const inspectableEvidenceExtensions = new Set([
  '.csv',
  '.tsv',
  '.json',
  '.jsonl',
  '.md',
  '.txt',
  '.html',
  '.htm',
  '.yaml',
  '.yml',
]);
const internalReviewerRolePatterns = [
  /\bceip\b/i,
  /\binternal\b/i,
  /\bself(?:[- ]review)?\b/i,
  /\bfounder\b/i,
  /\bdemo\b/i,
  /\bpilot owner\b/i,
];

const allowedDecisions = new Set(['pending', 'proceed', 'park', 'pivot', 'reject']);
const acceptedReviewerStatuses = new Set(['accepted', 'approved', 'signed']);
const completeFeedbackStatuses = new Set(['complete', 'accepted', 'approved', 'signed']);
const fastArtifactTargetHours = 48;
const maxAcceptedArtifactHours95 = 120;
const maxAcceptedEvidenceAgeDays95 = 365;
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const allowedPiiScreenResults = new Set([
  'no personal data',
  'no personal data or meter identifiers found',
  'redacted',
  'screened',
  'not applicable',
]);
const allowedCommercialCommitmentStatuses = new Set([
  'none',
  'design_partner_signed',
  'paid_pilot',
  'purchase_order',
  'letter_of_intent',
]);
const strongCommercialCommitmentStatuses = new Set([
  'design_partner_signed',
  'paid_pilot',
  'purchase_order',
  'letter_of_intent',
]);
const commercialCommitmentEvidenceRules = new Map([
  ['design_partner_signed', {
    label: 'design partner signed agreement evidence',
    pattern: /design[-_ ]?partner.*(?:signed|agreement|letter)|(?:signed|agreement|letter).*design[-_ ]?partner/i,
  }],
  ['paid_pilot', {
    label: 'paid pilot evidence',
    pattern: /paid[-_ ]?pilot|pilot payment|paid invoice|invoice paid/i,
  }],
  ['purchase_order', {
    label: 'purchase order evidence',
    pattern: /purchase[-_ ]?order|\bpo[-_ ]?(?:number|reference|issued)?\b/i,
  }],
  ['letter_of_intent', {
    label: 'letter of intent evidence',
    pattern: /letter[-_ ]?of[-_ ]?intent|\bloi\b/i,
  }],
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
const buyerEvidencePiiScreenResults = new Set([
  'no personal data',
  'no personal data or meter identifiers found',
  'redacted',
  'screened',
]);
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
const localEvidenceTextByRowNumber = new Map();
let readiness95Report = null;

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    && /seasonal[- ]?naive/i.test(text)
    && /rolling[- ]?(?:origin|split)|rolling split/i.test(text)
    && /interval coverage|conformal/i.test(text)
    && /champion|challenger/i.test(text);
}

const numericForecastEvidenceRules = [
  {
    label: 'numeric MAE value',
    pattern: /\bmae\b[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i,
  },
  {
    label: 'numeric MAPE value',
    pattern: /\bmape\b[\s:=,|-]*\d+(?:\.\d+)?\s*%?/i,
  },
  {
    label: 'numeric RMSE value',
    pattern: /\brmse\b[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i,
  },
  {
    label: 'numeric persistence baseline value',
    pattern: /\bpersistence\b(?:[-_ ]?(?:baseline|mae|mape|rmse))?[\s:=,|-]*(?:mae|mape|rmse|baseline)?[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i,
  },
  {
    label: 'numeric seasonal-naive baseline value',
    pattern: /\bseasonal[-_ ]?naive\b(?:[-_ ]?(?:baseline|mae|mape|rmse))?[\s:=,|-]*(?:mae|mape|rmse|baseline)?[\s:=,|-]*\d+(?:\.\d+)?\s*(?:mw|%)?/i,
  },
  {
    label: 'numeric rolling split count',
    pattern: /\brolling[-_ ]?(?:origin[-_ ]?)?(?:(?:split|splits|window|windows)(?:[-_ ]?(?:count|n))?)?\b[\s:=,|-]*(?:count)?[\s:=,|-]*\d+\b/i,
  },
  {
    label: 'numeric interval coverage percentage',
    pattern: /\b(?:interval[-_ ]?coverage|conformal[-_ ]?(?:interval[-_ ]?)?coverage)\b[\s:=,|-]*\d+(?:\.\d+)?\s*%?/i,
  },
  {
    label: 'champion/challenger status',
    pattern: /\bchampion\b[\s\S]{0,80}\bchallenger\b|\bchallenger\b[\s\S]{0,80}\bchampion\b/i,
  },
];

function missingNumericForecastEvidence(value) {
  const text = value ?? '';
  return numericForecastEvidenceRules
    .filter(({ pattern }) => !pattern.test(text))
    .map(({ label }) => label);
}

function hasNumericForecastEvidence(value) {
  return missingNumericForecastEvidence(value).length === 0;
}

function formatMissingNumericForecastEvidence(value) {
  return missingNumericForecastEvidence(value).join(', ');
}

function hasRequiredConfidenceDiagnostic(route, value) {
  const rule = confidenceDiagnosticRulesByRoute.get(route);
  if (!rule) return true;
  const text = value ?? '';
  return rule.patterns.every((pattern) => pattern.test(text));
}

function hasConfidenceClaimBoundary(value) {
  const text = value ?? '';
  return confidenceBoundaryPatterns.some((pattern) => pattern.test(text));
}

function hasRouteDoNotClaimBoundary(route, value) {
  const rule = confidenceClaimBoundaryRulesByRoute.get(route);
  if (!rule) return true;
  const text = value ?? '';
  return rule.doNotClaimPatterns.some((pattern) => pattern.test(text));
}

function hasImmutableEvidenceReference(value) {
  return /sha256[=:][a-f0-9]{64}/i.test(value ?? '');
}

function scanPositiveOverclaimText(value, label, rowNumber) {
  if (isBlank(value)) return;

  for (const rule of positiveOverclaimRules) {
    if (rule.pattern.test(value)) {
      failures.push(`Row ${rowNumber}: ${label} contains a positive ${rule.label}; remove it or place it only in do_not_claim/boundary language.`);
    }
  }
}

function scanPositiveOverclaims(row, rowNumber) {
  for (const field of positiveOverclaimFields) {
    scanPositiveOverclaimText(row[field] ?? '', field, rowNumber);
  }
}

function withIndefiniteArticle(label) {
  return `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}`;
}

function scanRegisterDirectIdentifiers(row, rowNumber) {
  for (const [field, value] of Object.entries(row)) {
    if (isBlank(value ?? '')) continue;

    const matchedPattern = directIdentifierPatterns.find(({ pattern }) => pattern.test(value));
    if (matchedPattern) {
      failures.push(`Row ${rowNumber}: ${field} appears to contain ${withIndefiniteArticle(matchedPattern.label)}; keep the pilot evidence register redacted and store sensitive originals outside this repo.`);
    }
  }
}

function hasIndependentReviewerRole(row) {
  const reviewerRole = normalizeText(row.reviewer_role ?? '');
  const evidenceOwner = normalizeText(row.evidence_owner ?? '');
  if (!reviewerRole) return true;
  if (evidenceOwner && reviewerRole === evidenceOwner) return false;
  return !internalReviewerRolePatterns.some((pattern) => pattern.test(row.reviewer_role ?? ''));
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function daysSinceIsoDate(value) {
  const evidenceDate = new Date(`${value}T00:00:00Z`);
  const todayDate = new Date(`${todayIsoDate}T00:00:00Z`);
  return Math.floor((todayDate.getTime() - evidenceDate.getTime()) / millisecondsPerDay);
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

function verifyLocalEvidenceHash(row, rowNumber) {
  if (!evidenceRoot) return;

  const referenceValue = row.evidence_file_reference ?? '';
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
  if (!existsSync(evidencePath)) {
    failures.push(`Row ${rowNumber}: evidence artifact not found under --evidence-root: ${referencePath}`);
    return;
  }
  const pathSafetyFailure = validateExistingEvidencePathInsideRoot({ evidenceRoot, evidencePath });
  if (pathSafetyFailure) {
    failures.push(`Row ${rowNumber}: ${pathSafetyFailure}`);
    return;
  }

  const actualHash = createHash('sha256').update(readFileSync(evidencePath)).digest('hex');
  if (actualHash !== sha256) {
    failures.push(`Row ${rowNumber}: evidence_file_reference sha256 does not match local artifact ${referencePath}.`);
  }

  scanLocalEvidenceArtifact(evidencePath, referencePath, row, rowNumber);
}

function scanLocalEvidenceArtifact(evidencePath, referencePath, row, rowNumber) {
  const extension = path.extname(evidencePath).toLowerCase();
  if (!inspectableEvidenceExtensions.has(extension)) {
    failures.push(`Row ${rowNumber}: local evidence artifact ${referencePath} has unsupported retained-artifact extension "${extension || '(none)'}"; reference a redacted text, CSV, JSON, Markdown, HTML, YAML, or TSV artifact instead. For PDFs or scans, hash a redacted .txt or .md evidence extract under --evidence-root.`);
    return;
  }

  const text = readFileSync(evidencePath, 'utf8');
  localEvidenceTextByRowNumber.set(rowNumber, text);
  scanPositiveOverclaimText(text, `local evidence artifact ${referencePath}`, rowNumber);

  const matchedPattern = directIdentifierPatterns.find(({ pattern }) => pattern.test(text));
  if (matchedPattern) {
    failures.push(`Row ${rowNumber}: local evidence artifact ${referencePath} appears to contain ${withIndefiniteArticle(matchedPattern.label)}; retain only redacted artifacts under --evidence-root.`);
  }

  const diagnosticRule = confidenceDiagnosticRulesByRoute.get(row.route);
  if (diagnosticRule && !diagnosticRule.patterns.every((pattern) => pattern.test(text))) {
    failures.push(`Row ${rowNumber}: local evidence artifact ${referencePath} must contain retained route-specific diagnostic evidence for ${row.route}: ${diagnosticRule.label}.`);
  }

  if (forecastEvidenceRoutes.has(row.route) && !hasForecastBenchmarkDiagnostic(text)) {
    failures.push(`Row ${rowNumber}: local forecast evidence artifact ${referencePath} must contain MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics.`);
  }

  if (forecastEvidenceRoutes.has(row.route) && !hasNumericForecastEvidence(text)) {
    failures.push(`Row ${rowNumber}: local forecast evidence artifact ${referencePath} must contain numeric forecast evidence: ${formatMissingNumericForecastEvidence(text)}.`);
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

function hasRetainedCommercialCommitmentEvidence(rowNumber, row) {
  const status = normalizeText(row.commercial_commitment_status ?? '');
  const rule = commercialCommitmentEvidenceRules.get(status);
  if (!rule) return true;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  return rule.pattern.test(text);
}

function hasRetainedCoverageEvidence(rowNumber, coverage) {
  if (coverage === null || !Number.isFinite(coverage)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const coverageText = escapeRegExp(String(coverage).replace(/\.0+$/, ''));
  const coveragePattern = new RegExp(`(?:buyer[-_ ]?data[-_ ]?coverage|coverage[-_ ]?(?:pct|percent|percentage)?)[\\s\\S]{0,40}\\b${coverageText}(?:\\.0+)?\\s*%?\\b`, 'i');
  return coveragePattern.test(text);
}

function hasRetainedTimeToArtifactEvidence(rowNumber, timeToArtifact) {
  if (timeToArtifact === null || !Number.isFinite(timeToArtifact)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const timeText = escapeRegExp(String(timeToArtifact).replace(/\.0+$/, ''));
  const timePattern = new RegExp(`(?:time[-_ ]?to[-_ ]?artifact(?:[-_ ]?hours)?|artifact[-_ ]?turnaround|turnaround[-_ ]?hours)[\\s\\S]{0,40}\\b${timeText}(?:\\.0+)?\\s*(?:h|hr|hrs|hour|hours)?\\b`, 'i');
  return timePattern.test(text);
}

function hasRetainedReviewerAcceptanceEvidence(rowNumber, row) {
  const acceptance = normalizeText(row.reviewer_acceptance ?? '');
  if (!isAcceptedEvidence(acceptance)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const acceptanceText = escapeRegExp(acceptance);
  const acceptancePattern = new RegExp(`(?:reviewer[-_ ]?acceptance|buyer[-_ ]?acceptance|reviewer[-_ ]?status|acceptance)[\\s\\S]{0,40}\\b${acceptanceText}\\b`, 'i');
  return acceptancePattern.test(text);
}

function hasRetainedReviewerFeedbackEvidence(rowNumber, row) {
  const feedbackStatus = normalizeText(row.reviewer_feedback_status ?? '');
  if (!isCompleteFeedback(feedbackStatus)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const feedbackText = escapeRegExp(feedbackStatus);
  const feedbackPattern = new RegExp(`(?:reviewer[-_ ]?feedback(?:[-_ ]?status)?|feedback[-_ ]?status|review[-_ ]?loop|correction[-_ ]?log)[\\s\\S]{0,40}\\b${feedbackText}\\b`, 'i');
  return feedbackPattern.test(text);
}

function hasRetainedDay14DecisionEvidence(rowNumber, row) {
  const decision = normalizeText(row.day_14_decision ?? '');
  if (decision !== 'proceed') return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const decisionPattern = /(?:day[-_ ]?14[-_ ]?decision|pilot[-_ ]?decision|decision[-_ ]?memo|proceed[-_ ]?decision)[\s\S]{0,40}\bproceed\b/i;
  return decisionPattern.test(text);
}

function hasRetainedRecordDateEvidence(rowNumber, row) {
  const recordDate = row.record_date ?? '';
  if (!isValidIsoDate(recordDate)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const recordDateText = escapeRegExp(recordDate);
  const datePattern = new RegExp(`(?:record[-_ ]?date|pilot[-_ ]?date|evidence[-_ ]?date|artifact[-_ ]?date|review[-_ ]?date)[\\s\\S]{0,40}\\b${recordDateText}\\b`, 'i');
  return datePattern.test(text);
}

function hasRetainedPiiScreenEvidence(rowNumber, row) {
  const piiScreenResult = normalizeText(row.pii_screen_result ?? '');
  if (!buyerEvidencePiiScreenResults.has(piiScreenResult)) return false;
  const text = localEvidenceTextByRowNumber.get(rowNumber) ?? '';
  const piiScreenText = escapeRegExp(piiScreenResult);
  const piiPattern = new RegExp(`(?:pii[-_ ]?screen(?:[-_ ]?result)?|privacy[-_ ]?screen(?:[-_ ]?result)?|redaction[-_ ]?screen|direct[-_ ]?identifier[-_ ]?screen)[\\s\\S]{0,80}\\b${piiScreenText}\\b`, 'i');
  return piiPattern.test(text);
}

function rowList(items) {
  if (!items.length) return 'none';
  return items.map((item) => item.rowNumber).join(', ');
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function buildReportCheck(label, passed, evidence, nextAction) {
  return { label, passed, evidence, nextAction };
}

function buildBlockedReadiness95Report(validationFailureCount) {
  return {
    summary: {
      registerPath: relativeRegisterPath,
      evidenceRootPath: relativeEvidenceRoot ?? '(not supplied)',
      rowCount: Math.max(0, rows.length - 1),
      acceptedBuyerRowCount: 0,
      acceptedProofPackCount: 0,
      totalConfidenceDelta: 0,
    },
    checks: [
      buildReportCheck(
        'Base register validation',
        false,
        `${validationFailureCount} validation failure(s) found before 95% aggregate checks.`,
        'Fix the listed row-level or argument failures, then rerun the 95% report.',
      ),
    ],
  };
}

function buildReadiness95Evaluation() {
  const aggregateFailures = [];

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
    && hasNumericForecastEvidence(row.benchmark_lift_or_diagnostic ?? '')
  ));
  const hasAcceptedTierEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/roi-calculator' || row.route === '/credit-banking'
  ));
  const hasAcceptedBillingOrSecurityEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/shadow-billing' || row.route === '/utility-security'
  ));
  const lowCoverageRows = acceptedBuyerRows.filter(({ coverage }) => coverage === null || coverage < 70);
  const unsupportedCoverageRows = acceptedBuyerRows.filter(({ rowNumber, coverage }) => (
    coverage !== null && !hasRetainedCoverageEvidence(rowNumber, coverage)
  ));
  const slowArtifactRows = acceptedBuyerRows.filter(({ timeToArtifact }) => (
    timeToArtifact === null || timeToArtifact > maxAcceptedArtifactHours95
  ));
  const unsupportedTimeToArtifactRows = acceptedBuyerRows.filter(({ rowNumber, timeToArtifact }) => (
    timeToArtifact !== null && !hasRetainedTimeToArtifactEvidence(rowNumber, timeToArtifact)
  ));
  const staleEvidenceRows = acceptedBuyerRows.filter(({ row }) => (
    daysSinceIsoDate(row.record_date ?? '') > maxAcceptedEvidenceAgeDays95
  ));
  const unsupportedRecordDateRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedRecordDateEvidence(rowNumber, row)
  ));
  const unsupportedPiiScreenRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedPiiScreenEvidence(rowNumber, row)
  ));
  const unsupportedReviewerAcceptanceRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedReviewerAcceptanceEvidence(rowNumber, row)
  ));
  const unsupportedReviewerFeedbackRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedReviewerFeedbackEvidence(rowNumber, row)
  ));
  const unsupportedDay14DecisionRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedDay14DecisionEvidence(rowNumber, row)
  ));
  const hasFastArtifact = acceptedBuyerRows.some(({ timeToArtifact }) => (
    timeToArtifact !== null && timeToArtifact <= fastArtifactTargetHours
  ));
  const hasCommercialCommitment = acceptedBuyerRows.some(({ row }) => (
    strongCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status ?? ''))
  ));
  const unsupportedCommercialCommitmentRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    strongCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status ?? ''))
    && !hasRetainedCommercialCommitmentEvidence(rowNumber, row)
  ));

  const productionRegisterAllowed = fixture95OverrideEnabled || !isNonProduction95Register(relativeRegisterPath);
  const distinctHashCountMatchesRows = acceptedEvidenceHashes.size >= acceptedBuyerRows.length;
  const hasAcceptedBuyerRows = acceptedBuyerRows.length > 0;

  const checks = [
    buildReportCheck(
      'Retained redacted evidence root supplied',
      Boolean(evidenceRoot),
      relativeEvidenceRoot ?? '(not supplied)',
      'Rerun with --evidence-root path/to/redacted-artifacts so SHA-256 handles are recomputed locally.',
    ),
    buildReportCheck(
      'Production buyer register path',
      productionRegisterAllowed,
      relativeRegisterPath,
      'Use a filled buyer-evidence register path outside tests/fixtures, templates, or sample paths.',
    ),
    buildReportCheck(
      'Accepted buyer evidence rows',
      hasAcceptedBuyerRows,
      `${acceptedBuyerRows.length} accepted confidence-moving row(s)`,
      'Capture accepted buyer-supplied rows with reviewer acceptance, complete feedback, and day_14_decision=proceed.',
    ),
    buildReportCheck(
      'Utility forecast proof pack',
      hasAcceptedUtilityForecast,
      hasAcceptedUtilityForecast ? 'numeric forecast diagnostics present' : 'missing accepted utility forecast row with numeric diagnostics',
      'Add accepted buyer-supplied utility demand forecast evidence with numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage, and champion/challenger diagnostics.',
    ),
    buildReportCheck(
      'TIER CFO or credit-banking proof pack',
      hasAcceptedTierEvidence,
      hasAcceptedTierEvidence ? 'TIER/credit evidence present' : 'missing accepted TIER or credit-banking row',
      'Add accepted buyer-supplied /roi-calculator or /credit-banking evidence.',
    ),
    buildReportCheck(
      'Shadow-billing or utility-security proof pack',
      hasAcceptedBillingOrSecurityEvidence,
      hasAcceptedBillingOrSecurityEvidence ? 'billing/security evidence present' : 'missing accepted billing or security row',
      'Add accepted buyer-supplied /shadow-billing or /utility-security evidence.',
    ),
    buildReportCheck(
      'Three distinct proof packs',
      acceptedProofPackIds.size >= 3,
      `${acceptedProofPackIds.size} distinct accepted proof_pack_id value(s)`,
      'Collect at least three distinct accepted proof-pack rows with day_14_decision=proceed.',
    ),
    buildReportCheck(
      'Distinct SHA-256 artifacts',
      distinctHashCountMatchesRows && hasAcceptedBuyerRows,
      `${acceptedEvidenceHashes.size} distinct SHA-256 handle(s) for ${acceptedBuyerRows.length} accepted row(s)`,
      'Give each accepted confidence-moving row its own retained redacted artifact and sha256 reference.',
    ),
    buildReportCheck(
      'Total accepted confidence delta',
      totalConfidenceDelta >= 0.899999,
      `${formatNumber(totalConfidenceDelta)} total accepted confidence_delta`,
      'Accumulate at least 0.9 confidence_delta across accepted buyer evidence rows.',
    ),
    buildReportCheck(
      'Buyer data coverage >= 70%',
      hasAcceptedBuyerRows && lowCoverageRows.length === 0,
      `low or missing coverage rows: ${rowList(lowCoverageRows)}`,
      'Ensure every accepted confidence-moving row records buyer_data_coverage_pct >= 70.',
    ),
    buildReportCheck(
      'Retained coverage support',
      hasAcceptedBuyerRows && unsupportedCoverageRows.length === 0,
      `unsupported rows: ${rowList(unsupportedCoverageRows)}`,
      'Include exact buyer-data coverage support in each retained artifact.',
    ),
    buildReportCheck(
      'Artifact turnaround <= 120h',
      hasAcceptedBuyerRows && slowArtifactRows.length === 0,
      `slow or missing rows: ${rowList(slowArtifactRows)}`,
      'Record time_to_artifact_hours <= 120 for every accepted confidence-moving row.',
    ),
    buildReportCheck(
      'Fast proof pack <= 48h',
      hasFastArtifact,
      hasFastArtifact ? 'at least one fast artifact present' : 'no accepted artifact at or below 48h',
      `Capture at least one accepted buyer proof pack delivered in ${fastArtifactTargetHours} hours or less.`,
    ),
    buildReportCheck(
      'Evidence recency <= 365 days',
      hasAcceptedBuyerRows && staleEvidenceRows.length === 0,
      `stale rows: ${rowList(staleEvidenceRows)}`,
      'Refresh accepted buyer evidence older than 365 days.',
    ),
    buildReportCheck(
      'Retained record-date support',
      hasAcceptedBuyerRows && unsupportedRecordDateRows.length === 0,
      `unsupported rows: ${rowList(unsupportedRecordDateRows)}`,
      'Include exact record_date support in each retained artifact.',
    ),
    buildReportCheck(
      'Retained privacy-screen support',
      hasAcceptedBuyerRows && unsupportedPiiScreenRows.length === 0,
      `unsupported rows: ${rowList(unsupportedPiiScreenRows)}`,
      'Include exact pii_screen_result support in each retained artifact.',
    ),
    buildReportCheck(
      'Retained reviewer acceptance support',
      hasAcceptedBuyerRows && unsupportedReviewerAcceptanceRows.length === 0,
      `unsupported rows: ${rowList(unsupportedReviewerAcceptanceRows)}`,
      'Include exact reviewer_acceptance support in each retained artifact.',
    ),
    buildReportCheck(
      'Retained reviewer feedback support',
      hasAcceptedBuyerRows && unsupportedReviewerFeedbackRows.length === 0,
      `unsupported rows: ${rowList(unsupportedReviewerFeedbackRows)}`,
      'Include exact reviewer_feedback_status support in each retained artifact.',
    ),
    buildReportCheck(
      'Retained day-14 proceed support',
      hasAcceptedBuyerRows && unsupportedDay14DecisionRows.length === 0,
      `unsupported rows: ${rowList(unsupportedDay14DecisionRows)}`,
      'Include day_14_decision=proceed support in each retained artifact.',
    ),
    buildReportCheck(
      'Commercial commitment signal',
      hasCommercialCommitment,
      hasCommercialCommitment ? 'strong commercial commitment present' : 'no design partner, paid pilot, PO, or LOI row',
      'Attach at least one design_partner_signed, paid_pilot, purchase_order, or letter_of_intent signal.',
    ),
    buildReportCheck(
      'Retained commercial commitment support',
      hasCommercialCommitment && unsupportedCommercialCommitmentRows.length === 0,
      hasCommercialCommitment
        ? `unsupported rows: ${rowList(unsupportedCommercialCommitmentRows)}`
        : 'no strong commercial commitment row to verify',
      'Ensure retained local artifacts support every strong commercial_commitment_status.',
    ),
  ];

  if (!evidenceRoot) {
    aggregateFailures.push('95% confidence gate requires --evidence-root with retained redacted artifacts so every confidence-moving SHA-256 reference is recomputed, not just syntactically present.');
  }

  if (!productionRegisterAllowed) {
    aggregateFailures.push('95% confidence gate cannot be satisfied by fixture, template, or sample registers; use a buyer-evidence register path and reserve --allow-fixture-95 for tests only.');
  }

  if (!hasAcceptedUtilityForecast) {
    aggregateFailures.push('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence with numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage, and champion/challenger diagnostics.');
  }

  if (!hasAcceptedTierEvidence) {
    aggregateFailures.push('95% confidence gate requires accepted buyer-supplied TIER CFO or credit-banking evidence.');
  }

  if (!hasAcceptedBillingOrSecurityEvidence) {
    aggregateFailures.push('95% confidence gate requires accepted buyer-supplied shadow-billing or utility-security evidence.');
  }

  if (acceptedProofPackIds.size < 3) {
    aggregateFailures.push('95% confidence gate requires at least three distinct accepted buyer-supplied proof_pack_id values with day_14_decision=proceed.');
  }

  if (acceptedEvidenceHashes.size < acceptedBuyerRows.length) {
    aggregateFailures.push('95% confidence gate requires each accepted confidence-moving row to reference a distinct SHA-256 evidence artifact.');
  }

  if (totalConfidenceDelta < 0.899999) {
    aggregateFailures.push('95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9 across the strategy evidence rows.');
  }

  if (lowCoverageRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires buyer_data_coverage_pct >= 70 for accepted confidence-moving rows; low rows: ${rowList(lowCoverageRows)}.`);
  }

  if (unsupportedCoverageRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support buyer_data_coverage_pct for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedCoverageRows)}.`);
  }

  if (slowArtifactRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires every accepted confidence-moving row to record time_to_artifact_hours <= ${maxAcceptedArtifactHours95}; slow or missing rows: ${rowList(slowArtifactRows)}.`);
  }

  if (unsupportedTimeToArtifactRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support time_to_artifact_hours for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedTimeToArtifactRows)}.`);
  }

  if (staleEvidenceRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires accepted confidence-moving buyer evidence to be no older than ${maxAcceptedEvidenceAgeDays95} days; stale rows: ${rowList(staleEvidenceRows)}.`);
  }

  if (unsupportedRecordDateRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support record_date for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedRecordDateRows)}.`);
  }

  if (unsupportedPiiScreenRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support pii_screen_result for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedPiiScreenRows)}.`);
  }

  if (unsupportedReviewerAcceptanceRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support reviewer_acceptance for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedReviewerAcceptanceRows)}.`);
  }

  if (unsupportedReviewerFeedbackRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support reviewer_feedback_status for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedReviewerFeedbackRows)}.`);
  }

  if (unsupportedDay14DecisionRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support day_14_decision=proceed for accepted confidence-moving rows; unsupported rows: ${rowList(unsupportedDay14DecisionRows)}.`);
  }

  if (!hasFastArtifact) {
    aggregateFailures.push(`95% confidence gate requires at least one accepted buyer proof pack delivered in ${fastArtifactTargetHours} hours or less to prove the fast solo-developer pilot wedge.`);
  }

  if (!hasCommercialCommitment) {
    aggregateFailures.push('95% confidence gate requires at least one accepted buyer-supplied row with commercial_commitment_status of design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
  }

  if (unsupportedCommercialCommitmentRows.length > 0) {
    aggregateFailures.push(`95% confidence gate requires retained local evidence artifacts to support each strong commercial_commitment_status; unsupported rows: ${rowList(unsupportedCommercialCommitmentRows)}.`);
  }

  return {
    failures: aggregateFailures,
    summary: {
      registerPath: relativeRegisterPath,
      evidenceRootPath: relativeEvidenceRoot ?? '(not supplied)',
      rowCount: Math.max(0, rows.length - 1),
      acceptedBuyerRowCount: acceptedBuyerRows.length,
      acceptedProofPackCount: acceptedProofPackIds.size,
      totalConfidenceDelta,
    },
    checks,
  };
}

function printReadiness95Report(report) {
  console.log('\n95% Evidence Readiness Report');
  console.log(`Register: ${report.summary.registerPath}`);
  console.log(`Evidence root: ${report.summary.evidenceRootPath}`);
  console.log(`Rows: ${report.summary.rowCount}`);
  console.log(`Accepted buyer confidence rows: ${report.summary.acceptedBuyerRowCount}`);
  console.log(`Accepted proof packs: ${report.summary.acceptedProofPackCount}`);
  console.log(`Total accepted confidence_delta: ${formatNumber(report.summary.totalConfidenceDelta)}`);
  console.log('\nChecks:');

  for (const check of report.checks) {
    console.log(`- ${check.passed ? 'PASS' : 'FAIL'} ${check.label}`);
    console.log(`  Evidence: ${check.evidence}`);
    if (!check.passed) console.log(`  Next action: ${check.nextAction}`);
  }
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

    scanPositiveOverclaims(row, rowNumber);
    scanRegisterDirectIdentifiers(row, rowNumber);

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
      'commercial_commitment_status',
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

    if (!allowedCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status ?? ''))) {
      failures.push(`Row ${rowNumber}: commercial_commitment_status must be one of ${Array.from(allowedCommercialCommitmentStatuses).join(', ')}.`);
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

      if (confidenceDelta > 0 && !hasIndependentReviewerRole(row)) {
        failures.push(`Row ${rowNumber}: reviewer_role must identify an independent buyer or reviewer function; it cannot repeat evidence_owner or use CEIP, internal, self-review, founder, demo, or pilot-owner wording.`);
      }

      if (confidenceDelta > 0 && coverage === null) {
        failures.push(`Row ${rowNumber}: buyer_data_coverage_pct is required for confidence-moving evidence.`);
      }

      if (confidenceDelta > 0 && timeToArtifact === null) {
        failures.push(`Row ${rowNumber}: time_to_artifact_hours is required for confidence-moving evidence.`);
      }

      if (confidenceDelta > 0
        && buyerEvidenceLabels.has(row.source_label)
        && !buyerEvidencePiiScreenResults.has(normalizeText(row.pii_screen_result ?? ''))) {
        failures.push(`Row ${rowNumber}: buyer-supplied confidence-moving evidence must have pii_screen_result of no personal data, no personal data or meter identifiers found, redacted, or screened.`);
      }

      if (confidenceDelta > 0 && !hasImmutableEvidenceReference(row.evidence_file_reference ?? '')) {
        failures.push(`Row ${rowNumber}: confidence-moving evidence_file_reference must include sha256=<64 hex chars> or sha256:<64 hex chars>.`);
      }

      if (confidenceDelta > 0 && !hasConfidenceClaimBoundary(row.claim_boundary ?? '')) {
        failures.push(`Row ${rowNumber}: confidence-moving claim_boundary must state a buyer-supplied, owner-supplied, uploaded, redacted, planning-support, workflow-only, fields-only, or source-labeled boundary.`);
      }

      if (confidenceDelta > 0 && !hasRouteDoNotClaimBoundary(row.route, row.do_not_claim ?? '')) {
        const rule = confidenceClaimBoundaryRulesByRoute.get(row.route);
        failures.push(`Row ${rowNumber}: confidence-moving do_not_claim for ${row.route} must include ${rule.label}.`);
      }

      if (confidenceDelta > 0) {
        verifyLocalEvidenceHash(row, rowNumber);
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
      failures.push(`Row ${rowNumber}: confidence-moving forecast evidence must include MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics.`);
    }

    if (forecastEvidenceRoutes.has(row.route)
      && (confidenceDelta ?? 0) > 0
      && !hasNumericForecastEvidence(row.benchmark_lift_or_diagnostic ?? '')) {
      failures.push(`Row ${rowNumber}: confidence-moving forecast evidence must include numeric forecast evidence: ${formatMissingNumericForecastEvidence(row.benchmark_lift_or_diagnostic ?? '')}.`);
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
      timeToArtifact,
    });
  });
}

const pre95FailureCount = failures.length;

if (require95 && failures.length === 0) {
  if (!evidenceRoot) {
    failures.push('95% confidence gate requires --evidence-root with retained redacted artifacts so every confidence-moving SHA-256 reference is recomputed, not just syntactically present.');
  }

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
    && hasNumericForecastEvidence(row.benchmark_lift_or_diagnostic ?? '')
  ));
  const hasAcceptedTierEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/roi-calculator' || row.route === '/credit-banking'
  ));
  const hasAcceptedBillingOrSecurityEvidence = acceptedBuyerRows.some(({ row }) => (
    row.route === '/shadow-billing' || row.route === '/utility-security'
  ));
  const lowCoverageRows = acceptedBuyerRows.filter(({ coverage }) => coverage === null || coverage < 70);
  const unsupportedCoverageRows = acceptedBuyerRows.filter(({ rowNumber, coverage }) => (
    coverage !== null && !hasRetainedCoverageEvidence(rowNumber, coverage)
  ));
  const slowArtifactRows = acceptedBuyerRows.filter(({ timeToArtifact }) => (
    timeToArtifact === null || timeToArtifact > maxAcceptedArtifactHours95
  ));
  const unsupportedTimeToArtifactRows = acceptedBuyerRows.filter(({ rowNumber, timeToArtifact }) => (
    timeToArtifact !== null && !hasRetainedTimeToArtifactEvidence(rowNumber, timeToArtifact)
  ));
  const staleEvidenceRows = acceptedBuyerRows.filter(({ row }) => (
    daysSinceIsoDate(row.record_date ?? '') > maxAcceptedEvidenceAgeDays95
  ));
  const unsupportedRecordDateRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedRecordDateEvidence(rowNumber, row)
  ));
  const unsupportedPiiScreenRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedPiiScreenEvidence(rowNumber, row)
  ));
  const unsupportedReviewerAcceptanceRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedReviewerAcceptanceEvidence(rowNumber, row)
  ));
  const unsupportedReviewerFeedbackRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedReviewerFeedbackEvidence(rowNumber, row)
  ));
  const unsupportedDay14DecisionRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    !hasRetainedDay14DecisionEvidence(rowNumber, row)
  ));
  const hasFastArtifact = acceptedBuyerRows.some(({ timeToArtifact }) => (
    timeToArtifact !== null && timeToArtifact <= fastArtifactTargetHours
  ));
  const hasCommercialCommitment = acceptedBuyerRows.some(({ row }) => (
    strongCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status ?? ''))
  ));
  const unsupportedCommercialCommitmentRows = acceptedBuyerRows.filter(({ row, rowNumber }) => (
    strongCommercialCommitmentStatuses.has(normalizeText(row.commercial_commitment_status ?? ''))
    && !hasRetainedCommercialCommitmentEvidence(rowNumber, row)
  ));

  if (!hasAcceptedUtilityForecast) {
    failures.push('95% confidence gate requires accepted buyer-supplied utility demand forecast evidence with numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage, and champion/challenger diagnostics.');
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

  if (unsupportedCoverageRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support buyer_data_coverage_pct for accepted confidence-moving rows; unsupported rows: ${unsupportedCoverageRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (slowArtifactRows.length > 0) {
    failures.push(`95% confidence gate requires every accepted confidence-moving row to record time_to_artifact_hours <= ${maxAcceptedArtifactHours95}; slow or missing rows: ${slowArtifactRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedTimeToArtifactRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support time_to_artifact_hours for accepted confidence-moving rows; unsupported rows: ${unsupportedTimeToArtifactRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (staleEvidenceRows.length > 0) {
    failures.push(`95% confidence gate requires accepted confidence-moving buyer evidence to be no older than ${maxAcceptedEvidenceAgeDays95} days; stale rows: ${staleEvidenceRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedRecordDateRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support record_date for accepted confidence-moving rows; unsupported rows: ${unsupportedRecordDateRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedPiiScreenRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support pii_screen_result for accepted confidence-moving rows; unsupported rows: ${unsupportedPiiScreenRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedReviewerAcceptanceRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support reviewer_acceptance for accepted confidence-moving rows; unsupported rows: ${unsupportedReviewerAcceptanceRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedReviewerFeedbackRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support reviewer_feedback_status for accepted confidence-moving rows; unsupported rows: ${unsupportedReviewerFeedbackRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (unsupportedDay14DecisionRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support day_14_decision=proceed for accepted confidence-moving rows; unsupported rows: ${unsupportedDay14DecisionRows.map((item) => item.rowNumber).join(', ')}.`);
  }

  if (!hasFastArtifact) {
    failures.push(`95% confidence gate requires at least one accepted buyer proof pack delivered in ${fastArtifactTargetHours} hours or less to prove the fast solo-developer pilot wedge.`);
  }

  if (!hasCommercialCommitment) {
    failures.push('95% confidence gate requires at least one accepted buyer-supplied row with commercial_commitment_status of design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
  }

  if (unsupportedCommercialCommitmentRows.length > 0) {
    failures.push(`95% confidence gate requires retained local evidence artifacts to support each strong commercial_commitment_status; unsupported rows: ${unsupportedCommercialCommitmentRows.map((item) => item.rowNumber).join(', ')}.`);
  }
}

if (report95) {
  readiness95Report = pre95FailureCount > 0
    ? buildBlockedReadiness95Report(failures.length)
    : buildReadiness95Evaluation();
  printReadiness95Report(readiness95Report);
}

if (failures.length > 0) {
  console.error('Pilot evidence register validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pilot evidence register validation passed for ${Math.max(0, rows.length - 1)} row(s): ${relativeRegisterPath}`);
