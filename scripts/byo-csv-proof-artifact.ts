#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateWritableArtifactPathInsideRoot } from './lib/evidence-path-safety.mjs';
import {
  buildByoCsvProofReport,
  buildByoCsvRetainedEvidenceExtract,
  type ByoCsvRetainedEvidenceExtractParams,
} from '../src/lib/byoCsvProofGenerator';

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
  'csv-file',
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

const allowedRoutes = new Set(['/byo-csv-proof', '/utility-demand-forecast', '/forecast-benchmarking', '/ga-ici-5cp']);
const allowedSourceLabels = new Set(['buyer_supplied_anonymized', 'buyer_supplied_confidential']);
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

const route = values.get('route') ?? '/byo-csv-proof';
const sourceLabel = values.get('source-label') ?? 'buyer_supplied_anonymized';
const recordDate = values.get('record-date') ?? '';
const coverage = parseNumber('buyer-data-coverage-pct');
const turnaroundHours = parseNumber('time-to-artifact-hours');
const reviewerAcceptance = normalizeText(values.get('reviewer-acceptance') ?? '');
const reviewerFeedbackStatus = normalizeText(values.get('reviewer-feedback-status') ?? '');
const day14Decision = normalizeText(values.get('day-14-decision') ?? '');
const commercialCommitmentStatus = normalizeText(values.get('commercial-commitment-status') ?? '');

if (!allowedRoutes.has(route)) failures.push(`--route must be one of ${Array.from(allowedRoutes).join(', ')}.`);
if (!allowedSourceLabels.has(sourceLabel)) failures.push(`--source-label must be one of ${Array.from(allowedSourceLabels).join(', ')}.`);
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');
if (coverage !== null && (coverage < 0 || coverage > 100)) failures.push('--buyer-data-coverage-pct must be between 0 and 100.');
if (turnaroundHours !== null && turnaroundHours < 0) failures.push('--time-to-artifact-hours cannot be negative.');
if (!allowedReviewerAcceptance.has(reviewerAcceptance)) failures.push('--reviewer-acceptance must be accepted, approved, or signed.');
if (!allowedFeedbackStatus.has(reviewerFeedbackStatus)) failures.push('--reviewer-feedback-status must be complete, accepted, approved, or signed.');
if (!allowedDay14Decision.has(day14Decision)) failures.push('--day-14-decision must be proceed, park, pivot, reject, or pending.');
if (!allowedCommercialCommitmentStatus.has(commercialCommitmentStatus)) {
  failures.push('--commercial-commitment-status must be none, design_partner_signed, paid_pilot, purchase_order, or letter_of_intent.');
}

const csvFile = values.has('csv-file') ? path.resolve(repoRoot, values.get('csv-file') ?? '') : null;
const evidenceRoot = values.has('evidence-root') ? path.resolve(repoRoot, values.get('evidence-root') ?? '') : null;
const artifactFile = values.get('artifact-file') ?? '';
const artifactPath = evidenceRoot ? path.resolve(evidenceRoot, artifactFile) : null;

if (csvFile && !existsSync(csvFile)) failures.push(`--csv-file not found: ${path.relative(repoRoot, csvFile)}`);
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
  console.error('BYO-CSV proof artifact preparation failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const report = buildByoCsvProofReport({
  csvText: readFileSync(csvFile as string, 'utf8'),
  sourceLabel,
  route,
  generatedAt: values.get('generated-at') ?? new Date().toISOString(),
});

if (report.direct_identifier_findings.length > 0) {
  console.error('BYO-CSV proof artifact preparation failed:\n');
  console.error('- Direct identifiers were detected. Create a redacted CSV extract first; this helper only writes confidence-ready retained extracts when direct-identifier findings are zero.');
  for (const finding of report.direct_identifier_findings) {
    console.error(`- ${finding.column}: ${finding.labels.join(', ')}`);
  }
  process.exit(1);
}

if (report.spreadsheet_formula_findings.length > 0) {
  console.error('BYO-CSV proof artifact preparation failed:\n');
  console.error('- Spreadsheet formula risk was detected. Neutralize or remove formula-like cells first; this helper only writes confidence-ready retained extracts when formula-risk findings are zero.');
  for (const finding of report.spreadsheet_formula_findings) {
    console.error(`- ${finding.column}: ${finding.labels.join(', ')}`);
  }
  process.exit(1);
}

const extractParams: ByoCsvRetainedEvidenceExtractParams = {
  recordDate,
  buyerDataCoveragePct: coverage as number,
  timeToArtifactHours: turnaroundHours as number,
  reviewerRole: values.get('reviewer-role') ?? '',
  reviewerAcceptance: reviewerAcceptance as ByoCsvRetainedEvidenceExtractParams['reviewerAcceptance'],
  reviewerFeedbackStatus: reviewerFeedbackStatus as ByoCsvRetainedEvidenceExtractParams['reviewerFeedbackStatus'],
  day14Decision: day14Decision as ByoCsvRetainedEvidenceExtractParams['day14Decision'],
  commercialCommitmentStatus: commercialCommitmentStatus as ByoCsvRetainedEvidenceExtractParams['commercialCommitmentStatus'],
  proofPackId: values.get('proof-pack-id') ?? 'byo_csv_privacy_proof_pack',
};
if (values.has('artifact-title')) extractParams.artifactTitle = values.get('artifact-title') as string;
if (values.has('claim-boundary')) extractParams.claimBoundary = values.get('claim-boundary') as string;
if (values.has('do-not-claim')) extractParams.doNotClaim = values.get('do-not-claim') as string;

const artifactText = buildByoCsvRetainedEvidenceExtract(report, extractParams);

mkdirSync(path.dirname(artifactPath as string), { recursive: true });
writeFileSync(artifactPath as string, artifactText, 'utf8');

const sha256 = createHash('sha256').update(readFileSync(artifactPath as string)).digest('hex');
const normalizedArtifactReference = artifactFile.split(path.sep).join('/');
const relativeEvidenceRoot = path.relative(repoRoot, evidenceRoot as string).split(path.sep).join('/');

console.log('BYO-CSV proof artifact prepared.');
console.log(`Evidence root: ${relativeEvidenceRoot && !relativeEvidenceRoot.startsWith('..') ? relativeEvidenceRoot : evidenceRoot}`);
console.log(`Artifact: ${normalizedArtifactReference}`);
console.log(`SHA-256: ${sha256}`);
console.log(`evidence_file_reference: ${normalizedArtifactReference}#sha256=${sha256}`);
console.log('');
console.log('Next validation command:');
console.log(`pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --evidence-root ${relativeEvidenceRoot || evidenceRoot}`);
