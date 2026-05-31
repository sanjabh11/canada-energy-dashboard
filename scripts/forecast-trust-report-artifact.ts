#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateWritableArtifactPathInsideRoot } from './lib/evidence-path-safety.mjs';
import {
  buildUtilityForecastTrustRetainedEvidenceExtract,
  type UtilityForecastTrustRetainedEvidenceExtractParams,
  type UtilityMultiDatasetBenchmarkPack,
} from '../src/lib/utilityForecastBenchmarkPack';

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
  'benchmark-pack-file',
  'evidence-root',
  'artifact-file',
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

const allowedRoutes = new Set(['/utility-demand-forecast', '/forecast-benchmarking']);
const allowedPiiScreenResults = new Set(['no personal data', 'no personal data or meter identifiers found', 'redacted', 'screened']);
const allowedReviewerAcceptance = new Set(['accepted', 'approved', 'signed']);
const allowedFeedbackStatus = new Set(['complete', 'accepted', 'approved', 'signed']);
const allowedDay14Decision = new Set(['proceed', 'park', 'pivot', 'reject', 'pending']);
const allowedCommercialCommitmentStatus = new Set(['none', 'design_partner_signed', 'paid_pilot', 'purchase_order', 'letter_of_intent']);
const allowedExtensions = new Set(['.md', '.txt']);

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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

const route = values.get('route') ?? '/forecast-benchmarking';
const recordDate = values.get('record-date') ?? '';
const coverage = parseNumber('buyer-data-coverage-pct');
const turnaroundHours = parseNumber('time-to-artifact-hours');
const piiScreenResult = normalizeText(values.get('pii-screen-result') ?? 'redacted');
const reviewerAcceptance = normalizeText(values.get('reviewer-acceptance') ?? '');
const reviewerFeedbackStatus = normalizeText(values.get('reviewer-feedback-status') ?? '');
const day14Decision = normalizeText(values.get('day-14-decision') ?? '');
const commercialCommitmentStatus = normalizeText(values.get('commercial-commitment-status') ?? '');

if (!allowedRoutes.has(route)) failures.push(`--route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
if (!allowedPiiScreenResults.has(piiScreenResult)) {
  failures.push('--pii-screen-result must be no personal data, no personal data or meter identifiers found, redacted, or screened.');
}
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');
if (coverage !== null && (coverage < 0 || coverage > 100)) failures.push('--buyer-data-coverage-pct must be between 0 and 100.');
if (turnaroundHours !== null && turnaroundHours < 0) failures.push('--time-to-artifact-hours cannot be negative.');
if (!allowedReviewerAcceptance.has(reviewerAcceptance)) failures.push('--reviewer-acceptance must be accepted, approved, or signed.');
if (!allowedFeedbackStatus.has(reviewerFeedbackStatus)) failures.push('--reviewer-feedback-status must be complete, accepted, approved, or signed.');
if (!allowedDay14Decision.has(day14Decision)) failures.push('--day-14-decision must be proceed, park, pivot, reject, or pending.');
if (!allowedCommercialCommitmentStatus.has(commercialCommitmentStatus)) {
  failures.push('--commercial-commitment-status must be none, design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
}

const benchmarkPackFile = values.has('benchmark-pack-file')
  ? path.resolve(repoRoot, values.get('benchmark-pack-file') ?? '')
  : null;
const evidenceRoot = values.has('evidence-root') ? path.resolve(repoRoot, values.get('evidence-root') ?? '') : null;
const artifactFile = values.get('artifact-file') ?? '';
const artifactPath = evidenceRoot ? path.resolve(evidenceRoot, artifactFile) : null;

if (benchmarkPackFile && !existsSync(benchmarkPackFile)) {
  failures.push(`--benchmark-pack-file not found: ${path.relative(repoRoot, benchmarkPackFile)}`);
}
if (artifactFile.startsWith('/') || path.isAbsolute(artifactFile)) failures.push('--artifact-file must be relative to --evidence-root.');
if (artifactPath && evidenceRoot) {
  const relativeArtifactPath = path.relative(evidenceRoot, artifactPath);
  const pathSafetyFailure = validateWritableArtifactPathInsideRoot({ evidenceRoot, artifactPath });
  if (pathSafetyFailure) failures.push(pathSafetyFailure);
  const extension = path.extname(artifactPath).toLowerCase();
  if (!allowedExtensions.has(extension)) failures.push('--artifact-file must be a .md or .txt retained extract.');
  if (existsSync(artifactPath) && !force) failures.push(`Artifact already exists: ${relativeArtifactPath} (rerun with --force to overwrite).`);
}

if (failures.length > 0) {
  console.error('Forecast trust report artifact preparation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const pack = JSON.parse(readFileSync(benchmarkPackFile as string, 'utf8')) as UtilityMultiDatasetBenchmarkPack;
const extractParams: UtilityForecastTrustRetainedEvidenceExtractParams = {
  recordDate,
  route: route as UtilityForecastTrustRetainedEvidenceExtractParams['route'],
  piiScreenResult: piiScreenResult as UtilityForecastTrustRetainedEvidenceExtractParams['piiScreenResult'],
  buyerDataCoveragePct: coverage as number,
  timeToArtifactHours: turnaroundHours as number,
  reviewerRole: values.get('reviewer-role') ?? '',
  reviewerAcceptance: reviewerAcceptance as UtilityForecastTrustRetainedEvidenceExtractParams['reviewerAcceptance'],
  reviewerFeedbackStatus: reviewerFeedbackStatus as UtilityForecastTrustRetainedEvidenceExtractParams['reviewerFeedbackStatus'],
  day14Decision: day14Decision as UtilityForecastTrustRetainedEvidenceExtractParams['day14Decision'],
  commercialCommitmentStatus: commercialCommitmentStatus as UtilityForecastTrustRetainedEvidenceExtractParams['commercialCommitmentStatus'],
};
if (values.has('dataset-id')) extractParams.datasetId = values.get('dataset-id') as string;
if (values.has('proof-pack-id')) extractParams.proofPackId = values.get('proof-pack-id') as string;
if (values.has('artifact-title')) extractParams.artifactTitle = values.get('artifact-title') as string;
if (values.has('claim-boundary')) extractParams.claimBoundary = values.get('claim-boundary') as string;
if (values.has('do-not-claim')) extractParams.doNotClaim = values.get('do-not-claim') as string;

let artifactText: string;
try {
  artifactText = buildUtilityForecastTrustRetainedEvidenceExtract(pack, extractParams);
} catch (error) {
  console.error('Forecast trust report artifact preparation failed:\n');
  console.error(`- ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

mkdirSync(path.dirname(artifactPath as string), { recursive: true });
writeFileSync(artifactPath as string, artifactText, 'utf8');

const sha256 = createHash('sha256').update(readFileSync(artifactPath as string)).digest('hex');
const normalizedArtifactReference = artifactFile.split(path.sep).join('/');
const relativeEvidenceRoot = path.relative(repoRoot, evidenceRoot as string).split(path.sep).join('/');

console.log('Forecast trust report artifact prepared.');
console.log(`Evidence root: ${relativeEvidenceRoot && !relativeEvidenceRoot.startsWith('..') ? relativeEvidenceRoot : evidenceRoot}`);
console.log(`Artifact: ${normalizedArtifactReference}`);
console.log(`SHA-256: ${sha256}`);
console.log(`evidence_file_reference: ${normalizedArtifactReference}#sha256=${sha256}`);
console.log('');
console.log('Next validation command:');
console.log(`pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --evidence-root ${relativeEvidenceRoot || evidenceRoot}`);
