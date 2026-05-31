#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();
const diagnostics = [];
let force = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg === '--diagnostic') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) {
      failures.push('--diagnostic requires text.');
    } else {
      diagnostics.push(value);
    }
    continue;
  }
  if (arg.startsWith('--diagnostic=')) {
    const value = arg.slice('--diagnostic='.length);
    if (!value) failures.push('--diagnostic requires text.');
    else diagnostics.push(value);
    continue;
  }
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) {
      failures.push(`${arg} requires a value.`);
    } else if (values.has(key)) {
      failures.push(`Duplicate option: ${arg}`);
    } else {
      values.set(key, value);
    }
    continue;
  }
  failures.push(`Unexpected positional argument: ${arg}`);
}

const requiredOptions = [
  'evidence-root',
  'artifact-file',
  'route',
  'record-date',
  'pii-screen-result',
  'buyer-data-coverage-pct',
  'time-to-artifact-hours',
  'reviewer-role',
  'reviewer-acceptance',
  'reviewer-feedback-status',
  'day-14-decision',
  'commercial-commitment-status',
  'claim-boundary',
  'do-not-claim',
];

for (const option of requiredOptions) {
  if (!values.has(option)) failures.push(`Missing required option: --${option}`);
}

const evidenceRoot = values.has('evidence-root')
  ? path.resolve(repoRoot, values.get('evidence-root'))
  : null;
const artifactFile = values.get('artifact-file') ?? '';
const artifactPath = evidenceRoot ? path.resolve(evidenceRoot, artifactFile) : null;
const relativeEvidenceRoot = evidenceRoot
  ? path.relative(repoRoot, evidenceRoot).split(path.sep).join('/')
  : '';
const normalizedArtifactReference = artifactFile.split(path.sep).join('/');
const displayEvidenceRoot = evidenceRoot && relativeEvidenceRoot && !relativeEvidenceRoot.startsWith('..')
  ? relativeEvidenceRoot
  : evidenceRoot;

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
]);
const allowedExtensions = new Set(['.csv', '.tsv', '.json', '.jsonl', '.md', '.txt', '.html', '.htm', '.yaml', '.yml']);
const acceptedReviewerStatuses = new Set(['accepted', 'approved', 'signed']);
const completeFeedbackStatuses = new Set(['complete', 'accepted', 'approved', 'signed']);
const allowedDecisions = new Set(['proceed', 'park', 'pivot', 'reject', 'pending']);
const allowedCommercialCommitmentStatuses = new Set(['none', 'design_partner_signed', 'paid_pilot', 'purchase_order', 'letter_of_intent']);
const allowedPiiScreenResults = new Set([
  'no personal data',
  'no personal data or meter identifiers found',
  'redacted',
  'screened',
]);

const routeDiagnosticRules = new Map([
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
]);

const forecastEvidenceRoutes = new Set(['/utility-demand-forecast', '/forecast-benchmarking']);
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

const directIdentifierPatterns = [
  { label: 'email address', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { label: 'North American phone number', pattern: /(?<![A-Za-z0-9])(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?![A-Za-z0-9])/ },
  { label: 'Canadian postal code', pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i },
  { label: 'account, meter, service address, postal code, phone, or customer-name label', pattern: /\b(?:customer[_ -]?name|customer[_ -]?email|account[_ -]?(?:number|no|id)|meter[_ -]?(?:id|identifier|number)|service[_ -]?address|postal[_ -]?code|phone(?:[_ -]?number)?)\b\s*[,;:=]/i },
  { label: 'secret or credential assignment', pattern: /\b(?:api[_ -]?key|secret|password|token)\b\s*[:=]\s*\S+/i },
  { label: 'street address', pattern: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Crescent|Cres)\b/i },
];

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseFiniteNumber(option) {
  const value = values.get(option) ?? '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    failures.push(`--${option} must be numeric.`);
    return null;
  }
  return numeric;
}

function scanForDirectIdentifiers(label, text) {
  const matchedPattern = directIdentifierPatterns.find(({ pattern }) => pattern.test(text));
  if (matchedPattern) {
    failures.push(`${label} appears to contain ${matchedPattern.label}; prepare only redacted evidence extracts.`);
  }
}

if (evidenceRoot && artifactPath) {
  if (!artifactFile || artifactFile.startsWith('/') || path.isAbsolute(artifactFile)) {
    failures.push('--artifact-file must be a relative file path inside --evidence-root.');
  }
  const relativePath = path.relative(evidenceRoot, artifactPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    failures.push('--artifact-file must stay inside --evidence-root.');
  }
  const extension = path.extname(artifactPath).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    failures.push(`--artifact-file must use a text-inspectable extension: ${Array.from(allowedExtensions).join(', ')}.`);
  }
  if (existsSync(artifactPath) && !force) {
    failures.push(`Artifact already exists: ${path.relative(repoRoot, artifactPath).split(path.sep).join('/')} (rerun with --force to overwrite).`);
  }
}

const route = values.get('route') ?? '';
const recordDate = values.get('record-date') ?? '';
const piiScreenResult = normalizeText(values.get('pii-screen-result') ?? '');
const coverage = parseFiniteNumber('buyer-data-coverage-pct');
const turnaroundHours = parseFiniteNumber('time-to-artifact-hours');
const reviewerAcceptance = normalizeText(values.get('reviewer-acceptance') ?? '');
const reviewerFeedbackStatus = normalizeText(values.get('reviewer-feedback-status') ?? '');
const day14Decision = normalizeText(values.get('day-14-decision') ?? '');
const commercialCommitmentStatus = normalizeText(values.get('commercial-commitment-status') ?? '');
const diagnosticText = diagnostics.join('\n');

if (!allowedRoutes.has(route)) failures.push(`--route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');
if (!allowedPiiScreenResults.has(piiScreenResult)) {
  failures.push('--pii-screen-result must be no personal data, no personal data or meter identifiers found, redacted, or screened.');
}
if (coverage !== null && (coverage < 0 || coverage > 100)) failures.push('--buyer-data-coverage-pct must be between 0 and 100.');
if (turnaroundHours !== null && turnaroundHours < 0) failures.push('--time-to-artifact-hours cannot be negative.');
if (!acceptedReviewerStatuses.has(reviewerAcceptance)) failures.push('--reviewer-acceptance must be accepted, approved, or signed.');
if (!completeFeedbackStatuses.has(reviewerFeedbackStatus)) failures.push('--reviewer-feedback-status must be complete, accepted, approved, or signed.');
if (!allowedDecisions.has(day14Decision)) failures.push('--day-14-decision must be proceed, park, pivot, reject, or pending.');
if (!allowedCommercialCommitmentStatuses.has(commercialCommitmentStatus)) {
  failures.push('--commercial-commitment-status must be none, design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
}
if (diagnostics.length === 0) failures.push('At least one --diagnostic value is required.');

const diagnosticRule = routeDiagnosticRules.get(route);
if (diagnosticRule && !diagnosticRule.patterns.every((pattern) => pattern.test(diagnosticText))) {
  failures.push(`--diagnostic text for ${route} must include ${diagnosticRule.label}.`);
}

if (forecastEvidenceRoutes.has(route)) {
  const missingForecastEvidence = missingNumericForecastEvidence(diagnosticText);
  if (missingForecastEvidence.length > 0) {
    failures.push(`--diagnostic text for ${route} must include numeric forecast evidence: ${missingForecastEvidence.join(', ')}.`);
  }
}

for (const [key, value] of values.entries()) {
  scanForDirectIdentifiers(`--${key}`, value);
}
diagnostics.forEach((diagnostic, index) => scanForDirectIdentifiers(`--diagnostic #${index + 1}`, diagnostic));

if (failures.length > 0) {
  console.error('Pilot evidence artifact preparation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const artifactTitle = values.get('artifact-title') ?? 'CEIP redacted pilot evidence extract';
const reviewerRole = values.get('reviewer-role');
const claimBoundary = values.get('claim-boundary');
const doNotClaim = values.get('do-not-claim');
const sourceLabel = values.get('source-label') ?? 'buyer_supplied_anonymized';
const proofPackId = values.get('proof-pack-id') ?? '(fill matching proof_pack_id in register)';
const commercialCommitmentEvidence = commercialCommitmentStatus === 'none'
  ? 'none'
  : commercialCommitmentStatus;

const artifactText = [
  `# ${artifactTitle}`,
  '',
  'This retained artifact is a redacted text-inspectable extract. Sensitive originals stay outside the repository.',
  '',
  `record_date: ${recordDate}`,
  `route: ${route}`,
  `proof_pack_id: ${proofPackId}`,
  `source_label: ${sourceLabel}`,
  `pii_screen_result: ${piiScreenResult}`,
  `buyer_data_coverage_pct: ${coverage}`,
  `time_to_artifact_hours: ${turnaroundHours}`,
  `reviewer_role: ${reviewerRole}`,
  `reviewer_acceptance: ${reviewerAcceptance}`,
  `reviewer_feedback_status: ${reviewerFeedbackStatus}`,
  `day_14_decision: ${day14Decision}`,
  `commercial_commitment_status: ${commercialCommitmentStatus}`,
  `commercial_commitment_evidence: ${commercialCommitmentEvidence}`,
  `claim_boundary: ${claimBoundary}`,
  `do_not_claim: ${doNotClaim}`,
  '',
  '## Diagnostic Summary',
  ...diagnostics.map((diagnostic) => `- ${diagnostic}`),
  '',
].join('\n');

scanForDirectIdentifiers('generated artifact', artifactText);
if (failures.length > 0) {
  console.error('Pilot evidence artifact preparation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

mkdirSync(path.dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, artifactText, 'utf8');
const sha256 = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
const evidenceReference = `${normalizedArtifactReference}#sha256=${sha256}`;

console.log('Pilot evidence artifact prepared.');
console.log(`Evidence root: ${displayEvidenceRoot}`);
console.log(`Artifact: ${normalizedArtifactReference}`);
console.log(`SHA-256: ${sha256}`);
console.log(`evidence_file_reference: ${evidenceReference}`);
console.log('');
console.log('Next validation commands:');
console.log(`pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root ${displayEvidenceRoot}`);
console.log(`pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root ${displayEvidenceRoot}`);
