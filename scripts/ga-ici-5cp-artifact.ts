#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  IESO_PEAK_TRACKER_SOURCE_URL,
  buildIciFiveCpHistoricalBacktestReport,
  buildIciFiveCpDecisionSupportReport,
  buildIciFiveCpRetainedEvidenceExtract,
  parseIesoPeakTrackerSnapshot,
  type IciCustomerLoadHour,
  type IciFiveCpRetainedEvidenceExtractParams,
  type IciSystemPeakHour,
} from '../src/lib/gaIciPeakPredictor';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map<string, string>();
const failures: string[] = [];
let force = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
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
  'customer-load-file',
  'evidence-root',
  'artifact-file',
  'base-period-start',
  'base-period-end',
  'record-date',
  'buyer-data-coverage-pct',
  'time-to-artifact-hours',
  'reviewer-role',
  'reviewer-acceptance',
  'reviewer-feedback-status',
  'day-14-decision',
  'commercial-commitment-status',
];

for (const option of requiredOptions) {
  if (!values.has(option)) failures.push(`Missing required option: --${option}`);
}

const allowedRoutes = new Set(['/ga-ici-5cp']);
const allowedSourceLabels = new Set(['buyer_supplied_anonymized', 'buyer_supplied_confidential']);
const allowedReviewerAcceptance = new Set(['accepted', 'approved', 'signed']);
const allowedFeedbackStatus = new Set(['complete', 'accepted', 'approved', 'signed']);
const allowedDay14Decision = new Set(['proceed', 'park', 'pivot', 'reject', 'pending']);
const allowedCommercialCommitmentStatus = new Set(['none', 'design_partner_signed', 'paid_pilot', 'purchase_order', 'letter_of_intent']);
const allowedArtifactExtensions = new Set(['.md', '.txt']);
const allowedInputExtensions = new Set(['.csv', '.tsv']);
const allowedPeakTrackerExtensions = new Set(['.csv', '.tsv', '.txt', '.md', '.html', '.htm']);
const allowedPeakStatuses = new Set(['initial', 'prelim', 'final', 'forecast', 'candidate']);
const directIdentifierColumns = new Set([
  'customer_name',
  'customer_email',
  'account_number',
  'account_no',
  'account_id',
  'meter_id',
  'meter_identifier',
  'meter_number',
  'service_address',
  'postal_code',
  'phone',
  'phone_number',
]);
const directIdentifierPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: 'email address', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { label: 'North American phone number', pattern: /(?<![A-Za-z0-9])(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?![A-Za-z0-9])/ },
  { label: 'Canadian postal code', pattern: /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i },
  { label: 'direct identifier column or label', pattern: /\b(?:customer[_ -]?name|customer[_ -]?email|account[_ -]?(?:number|no|id)|meter[_ -]?(?:id|identifier|number)|service[_ -]?address|postal[_ -]?code|phone(?:[_ -]?number)?)\b\s*[,;:=]/i },
  { label: 'secret or credential assignment', pattern: /\b(?:api[_ -]?key|secret|password|token)\b\s*[:=]\s*\S+/i },
  { label: 'street address', pattern: /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Crescent|Cres)\b/i },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeColumn(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseNumber(option: string): number | null {
  const raw = values.get(option) ?? '';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    failures.push(`--${option} must be numeric.`);
    return null;
  }
  return parsed;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function parseDelimitedRows(text: string, delimiter: ',' | '\t') {
  const rows: string[][] = [];
  let row: string[] = [];
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

    if (char === delimiter && !inQuotes) {
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

function parseTable(text: string, label: string) {
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ',';
  const rows = parseDelimitedRows(text, delimiter);
  if (rows.length < 2) {
    failures.push(`${label} must contain a header row and at least one data row.`);
    return [];
  }

  const headers = rows[0].map(normalizeColumn);
  const directIdentifierHeader = headers.find((header) => directIdentifierColumns.has(header));
  if (directIdentifierHeader) {
    failures.push(`${label} contains direct identifier column "${directIdentifierHeader}"; retain only redacted planning extracts.`);
  }
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ''])));
}

function findDirectIdentifier(text: string) {
  return directIdentifierPatterns.find(({ pattern }) => pattern.test(text));
}

function parseSystemPeaks(text: string, label = '--system-peaks-file'): IciSystemPeakHour[] {
  const directIdentifier = findDirectIdentifier(text);
  if (directIdentifier) failures.push(`${label} appears to contain ${directIdentifier.label}; retain only redacted planning extracts.`);

  return parseTable(text, label).map((row, index) => {
    const timestamp = row.timestamp ?? row.hour ?? row.datetime ?? '';
    const demandText = row.ontario_demand_mw ?? row.ontario_demand ?? row.demand_mw ?? row.system_demand_mw ?? '';
    const demand = Number(demandText);
    const statusText = normalizeText(row.status ?? 'candidate');

    if (!timestamp) failures.push(`${label} row ${index + 2} is missing timestamp.`);
    if (!Number.isFinite(demand) || demand <= 0) failures.push(`${label} row ${index + 2} has invalid ontario_demand_mw.`);
    if (!allowedPeakStatuses.has(statusText)) failures.push(`${label} row ${index + 2} has invalid status.`);

    return {
      timestamp,
      ontario_demand_mw: demand,
      status: statusText as IciSystemPeakHour['status'],
      source: row.source || undefined,
    };
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'accept': 'text/html,text/plain,text/csv,*/*',
      'user-agent': 'CEIP-peak-tracker-ingestion/1.0',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function parseCustomerLoad(text: string): IciCustomerLoadHour[] {
  const directIdentifier = findDirectIdentifier(text);
  if (directIdentifier) failures.push(`--customer-load-file appears to contain ${directIdentifier.label}; retain only redacted planning extracts.`);

  return parseTable(text, '--customer-load-file').map((row, index) => {
    const timestamp = row.timestamp ?? row.hour ?? row.datetime ?? '';
    const loadText = row.load_mw ?? row.customer_load_mw ?? row.demand_mw ?? '';
    const load = Number(loadText);

    if (!timestamp) failures.push(`--customer-load-file row ${index + 2} is missing timestamp.`);
    if (!Number.isFinite(load) || load < 0) failures.push(`--customer-load-file row ${index + 2} has invalid load_mw.`);

    return {
      timestamp,
      load_mw: load,
    };
  });
}

const route = values.get('route') ?? '/ga-ici-5cp';
const sourceLabel = values.get('source-label') ?? 'buyer_supplied_anonymized';
const recordDate = values.get('record-date') ?? '';
const basePeriodStart = values.get('base-period-start') ?? '';
const basePeriodEnd = values.get('base-period-end') ?? '';
const coverage = parseNumber('buyer-data-coverage-pct');
const turnaroundHours = parseNumber('time-to-artifact-hours');
const reviewerAcceptance = normalizeText(values.get('reviewer-acceptance') ?? '');
const reviewerFeedbackStatus = normalizeText(values.get('reviewer-feedback-status') ?? '');
const day14Decision = normalizeText(values.get('day-14-decision') ?? '');
const commercialCommitmentStatus = normalizeText(values.get('commercial-commitment-status') ?? '');
const peakTrackerUrl = values.get('peak-tracker-url') ?? '';

if (!allowedRoutes.has(route)) failures.push(`--route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
if (!allowedSourceLabels.has(sourceLabel)) failures.push(`--source-label must be one of ${Array.from(allowedSourceLabels).join(', ')}.`);
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');
if (!isValidIsoDate(basePeriodStart)) failures.push('--base-period-start must be a valid YYYY-MM-DD date.');
if (!isValidIsoDate(basePeriodEnd)) failures.push('--base-period-end must be a valid YYYY-MM-DD date.');
if (coverage !== null && (coverage < 0 || coverage > 100)) failures.push('--buyer-data-coverage-pct must be between 0 and 100.');
if (turnaroundHours !== null && turnaroundHours < 0) failures.push('--time-to-artifact-hours cannot be negative.');
if (!allowedReviewerAcceptance.has(reviewerAcceptance)) failures.push('--reviewer-acceptance must be accepted, approved, or signed.');
if (!allowedFeedbackStatus.has(reviewerFeedbackStatus)) failures.push('--reviewer-feedback-status must be complete, accepted, approved, or signed.');
if (!allowedDay14Decision.has(day14Decision)) failures.push('--day-14-decision must be proceed, park, pivot, reject, or pending.');
if (!allowedCommercialCommitmentStatus.has(commercialCommitmentStatus)) {
  failures.push('--commercial-commitment-status must be none, design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
}
if (!values.has('system-peaks-file') && !values.has('peak-tracker-file') && !values.has('peak-tracker-url')) {
  failures.push('Provide one of --system-peaks-file, --peak-tracker-file, or --peak-tracker-url.');
}
if (peakTrackerUrl && !/^https?:\/\//i.test(peakTrackerUrl)) {
  failures.push('--peak-tracker-url must be an http(s) URL.');
}

const systemPeaksFile = values.has('system-peaks-file') ? path.resolve(repoRoot, values.get('system-peaks-file') ?? '') : null;
const peakTrackerFile = values.has('peak-tracker-file') ? path.resolve(repoRoot, values.get('peak-tracker-file') ?? '') : null;
const historicalActualsFile = values.has('historical-actuals-file') ? path.resolve(repoRoot, values.get('historical-actuals-file') ?? '') : null;
const customerLoadFile = values.has('customer-load-file') ? path.resolve(repoRoot, values.get('customer-load-file') ?? '') : null;
const evidenceRoot = values.has('evidence-root') ? path.resolve(repoRoot, values.get('evidence-root') ?? '') : null;
const artifactFile = values.get('artifact-file') ?? '';
const artifactPath = evidenceRoot ? path.resolve(evidenceRoot, artifactFile) : null;

for (const [label, filePath] of [['--system-peaks-file', systemPeaksFile], ['--customer-load-file', customerLoadFile]] as const) {
  if (!filePath) continue;
  if (!existsSync(filePath)) failures.push(`${label} not found: ${path.relative(repoRoot, filePath)}`);
  if (!allowedInputExtensions.has(path.extname(filePath).toLowerCase())) failures.push(`${label} must be a .csv or .tsv file.`);
}
if (peakTrackerFile) {
  if (!existsSync(peakTrackerFile)) failures.push(`--peak-tracker-file not found: ${path.relative(repoRoot, peakTrackerFile)}`);
  if (!allowedPeakTrackerExtensions.has(path.extname(peakTrackerFile).toLowerCase())) {
    failures.push('--peak-tracker-file must be a .csv, .tsv, .txt, .md, .html, or .htm file.');
  }
}
if (historicalActualsFile) {
  if (!existsSync(historicalActualsFile)) failures.push(`--historical-actuals-file not found: ${path.relative(repoRoot, historicalActualsFile)}`);
  if (!allowedPeakTrackerExtensions.has(path.extname(historicalActualsFile).toLowerCase())) {
    failures.push('--historical-actuals-file must be a .csv, .tsv, .txt, .md, .html, or .htm file.');
  }
}

if (artifactFile.startsWith('/') || path.isAbsolute(artifactFile)) failures.push('--artifact-file must be relative to --evidence-root.');
if (artifactPath && evidenceRoot) {
  const relativeArtifactPath = path.relative(evidenceRoot, artifactPath);
  if (relativeArtifactPath.startsWith('..') || path.isAbsolute(relativeArtifactPath)) {
    failures.push('--artifact-file must stay inside --evidence-root.');
  }
  const extension = path.extname(artifactPath).toLowerCase();
  if (!allowedArtifactExtensions.has(extension)) failures.push('--artifact-file must be a .md or .txt retained extract.');
  if (existsSync(artifactPath) && !force) failures.push(`Artifact already exists: ${relativeArtifactPath} (rerun with --force to overwrite).`);
}

let systemPeaks: IciSystemPeakHour[] = [];
let historicalActualPeaks: IciSystemPeakHour[] = [];
let customerLoad: IciCustomerLoadHour[] = [];
if (systemPeaksFile && existsSync(systemPeaksFile)) systemPeaks = parseSystemPeaks(readFileSync(systemPeaksFile, 'utf8'));
if (peakTrackerFile && existsSync(peakTrackerFile)) {
  const directIdentifier = findDirectIdentifier(readFileSync(peakTrackerFile, 'utf8'));
  if (directIdentifier) failures.push(`--peak-tracker-file appears to contain ${directIdentifier.label}; retain only public IESO peak rows or redacted planning extracts.`);
  try {
    systemPeaks.push(...parseIesoPeakTrackerSnapshot(readFileSync(peakTrackerFile, 'utf8')));
  } catch (error) {
    failures.push(`--peak-tracker-file could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (peakTrackerUrl && /^https?:\/\//i.test(peakTrackerUrl)) {
  try {
    systemPeaks.push(...parseIesoPeakTrackerSnapshot(await fetchText(peakTrackerUrl), { sourceUrl: peakTrackerUrl }));
  } catch (error) {
    failures.push(`--peak-tracker-url could not be fetched or parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (historicalActualsFile && existsSync(historicalActualsFile)) {
  const historicalActualsText = readFileSync(historicalActualsFile, 'utf8');
  const directIdentifier = findDirectIdentifier(historicalActualsText);
  if (directIdentifier) failures.push(`--historical-actuals-file appears to contain ${directIdentifier.label}; retain only public IESO top-five rows or redacted planning extracts.`);
  try {
    historicalActualPeaks = parseIesoPeakTrackerSnapshot(historicalActualsText, { sourceUrl: IESO_PEAK_TRACKER_SOURCE_URL });
  } catch (error) {
    const failureCountBeforeFallback = failures.length;
    historicalActualPeaks = parseSystemPeaks(historicalActualsText, '--historical-actuals-file');
    if (historicalActualPeaks.length === 0 && failures.length === failureCountBeforeFallback) {
      failures.push(`--historical-actuals-file could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
if (customerLoadFile && existsSync(customerLoadFile)) customerLoad = parseCustomerLoad(readFileSync(customerLoadFile, 'utf8'));

if (failures.length > 0) {
  console.error('GA/ICI 5CP artifact preparation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const explicitSourceUrls = (values.get('source-urls') ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const sourceUrlsFromRows = systemPeaks
  .map((row) => row.source)
  .filter((source): source is string => Boolean(source && /^https?:\/\//i.test(source)));
const sourceUrls = Array.from(new Set([
  ...explicitSourceUrls,
  ...sourceUrlsFromRows,
  ...(values.has('peak-tracker-file') ? [IESO_PEAK_TRACKER_SOURCE_URL] : []),
  ...(peakTrackerUrl ? [peakTrackerUrl] : []),
]));

const report = buildIciFiveCpDecisionSupportReport({
  systemPeaks,
  customerLoad,
  basePeriodStart,
  basePeriodEnd,
  generatedAt: values.get('generated-at') ?? new Date().toISOString(),
  sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
});
const historicalBacktest = historicalActualPeaks.length > 0
  ? buildIciFiveCpHistoricalBacktestReport({
    candidatePeaks: systemPeaks,
    actualTopFivePeaks: historicalActualPeaks,
    basePeriodStart,
    basePeriodEnd,
    generatedAt: values.get('generated-at') ?? new Date().toISOString(),
  })
  : undefined;

const topFiveLoadCoverage = report.top_five_peak_hours.filter((peak) => peak.customer_load_mw !== null).length;
const reportFailures: string[] = [];
if (report.top_five_peak_hours.length < 5) reportFailures.push('At least five valid system peak rows are required.');
if (topFiveLoadCoverage < report.top_five_peak_hours.length) {
  reportFailures.push('Customer load must be present for every retained top-five peak window.');
}
if (report.estimated_peak_demand_factor === null) reportFailures.push('Estimated peak demand factor was not available.');
if (historicalActualsFile && historicalActualPeaks.length < 5) {
  reportFailures.push('Historical actuals backtest requires at least five valid actual top-five peak rows.');
}

if (reportFailures.length > 0) {
  console.error('GA/ICI 5CP artifact preparation failed:\n');
  reportFailures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const extractParams: IciFiveCpRetainedEvidenceExtractParams = {
  recordDate,
  sourceLabel,
  buyerDataCoveragePct: coverage as number,
  timeToArtifactHours: turnaroundHours as number,
  reviewerRole: values.get('reviewer-role') ?? '',
  reviewerAcceptance: reviewerAcceptance as IciFiveCpRetainedEvidenceExtractParams['reviewerAcceptance'],
  reviewerFeedbackStatus: reviewerFeedbackStatus as IciFiveCpRetainedEvidenceExtractParams['reviewerFeedbackStatus'],
  day14Decision: day14Decision as IciFiveCpRetainedEvidenceExtractParams['day14Decision'],
  commercialCommitmentStatus: commercialCommitmentStatus as IciFiveCpRetainedEvidenceExtractParams['commercialCommitmentStatus'],
  route,
  proofPackId: values.get('proof-pack-id') ?? 'ga_ici_5cp_decision_support_pack',
  piiScreenResult: (values.get('pii-screen-result') ?? 'redacted') as IciFiveCpRetainedEvidenceExtractParams['piiScreenResult'],
  historicalBacktest,
};
if (values.has('artifact-title')) extractParams.artifactTitle = values.get('artifact-title') as string;
if (values.has('claim-boundary')) extractParams.claimBoundary = values.get('claim-boundary') as string;
if (values.has('do-not-claim')) extractParams.doNotClaim = values.get('do-not-claim') as string;

const artifactText = buildIciFiveCpRetainedEvidenceExtract(report, extractParams);

mkdirSync(path.dirname(artifactPath as string), { recursive: true });
writeFileSync(artifactPath as string, artifactText, 'utf8');

const sha256 = createHash('sha256').update(readFileSync(artifactPath as string)).digest('hex');
const normalizedArtifactReference = artifactFile.split(path.sep).join('/');
const relativeEvidenceRoot = path.relative(repoRoot, evidenceRoot as string).split(path.sep).join('/');

console.log('GA/ICI 5CP proof artifact prepared.');
console.log(`Evidence root: ${relativeEvidenceRoot && !relativeEvidenceRoot.startsWith('..') ? relativeEvidenceRoot : evidenceRoot}`);
console.log(`Artifact: ${normalizedArtifactReference}`);
console.log(`SHA-256: ${sha256}`);
console.log(`evidence_file_reference: ${normalizedArtifactReference}#sha256=${sha256}`);
if (historicalBacktest) {
  console.log(`historical_backtest_watchlist_capture_rate: ${historicalBacktest.watchlist_capture_rate ?? 'not available'}`);
}
console.log('');
console.log('Next validation command:');
console.log(`pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --evidence-root ${relativeEvidenceRoot || evidenceRoot}`);
