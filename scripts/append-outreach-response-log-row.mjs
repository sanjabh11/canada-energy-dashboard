#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { proofPackRouteConfigs } from './lib/proof-pack-routes.mjs';
import {
  OUTREACH_RESPONSE_LOG_COLUMNS,
  OUTBOUND_REPLY_STATUSES,
  parseCsv,
} from './lib/outreach-response-log-schema.mjs';
import {
  buildSuppressionRegistryRow,
  loadSuppressionRegistry,
  resolveSuppressionRegistryPath,
} from './lib/suppression-registry.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();

const columns = OUTREACH_RESPONSE_LOG_COLUMNS;

const requiredOptions = [
  'log-file',
  'activity-date',
  'channel',
  'target-label',
  'route',
  'rating',
  'variant-id',
  'reply-status',
  'response-summary',
  'pain-signal',
  'requested-input',
  'reviewer-role',
  'next-action',
];

const optionalOptions = new Set([
  'artifact-promised',
  'caveat-used',
  'commercial-commitment-status',
  'notes',
  'pilot-evidence-register-action',
  'suppression-file',
  'consent-basis',
  'consent-source',
  'consent-date',
  'sender-identification-status',
  'unsubscribe-mechanism-status',
  'casl-owner-approval',
  'casl-approval-date',
  'casl-approval-reference',
  'unsubscribe-status',
]);

const knownOptions = new Set([...requiredOptions, ...optionalOptions]);

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[index + 1] ?? '';
    index += 1;
    if (!knownOptions.has(key)) {
      failures.push(`Unknown option: ${arg}`);
    } else if (!value || value.startsWith('--')) {
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

function printUsage() {
  console.log(`Usage:
  pnpm run append:outreach-response-log-row -- \\
    --log-file /tmp/ceip-outreach-response-log/outreach-response-log.csv \\
    --activity-date 2026-06-01 \\
    --channel linkedin \\
    --target-label ontario_peak_advisor_001 \\
    --route /ga-ici-5cp \\
    --rating 4.2 \\
    --variant-id ga_ici_5cp \\
    --reply-status data_offered \\
    --response-summary "Buyer offered a redacted interval-load sample for peak-window review." \\
    --pain-signal "Ontario peak-risk planning question" \\
    --requested-input "redacted interval load for candidate peak windows" \\
    --reviewer-role "energy manager reviewer" \\
    --next-action "create intake packet and request retained extract" \\
    --pilot-evidence-register-action create_intake_packet \\
    --consent-basis express_consent --consent-source buyer_inquiry --consent-date 2026-05-31 \\
    --sender-identification-status verified --unsubscribe-mechanism-status verified \\
    --casl-owner-approval approved --casl-approval-date 2026-05-31 \\
    --casl-approval-reference CASL-REVIEW-REF

Required options:
  --log-file <csv>               Existing outreach response log to append to.
  --activity-date <YYYY-MM-DD>   Completed outreach activity date.
  --channel <value>              linkedin, email, referral, conference, manual, or partner.
  --target-label <handle>        Anonymized handle; no names, emails, accounts, meters, or addresses.
  --route <route>                Canonical proof-pack route. Derives buyer_lane and proof_pack_id.
  --rating <0-4.6>               Current pre-buyer-evidence feature rating.
  --variant-id <id>              Outreach/message variant identifier.
  --reply-status <status>        drafted, sent_no_reply, interested, requested_info, data_offered, meeting_booked, not_now, not_fit, or unsubscribe.
  --response-summary <text>      Anonymized summary of the completed activity or reply.
  --pain-signal <text>           Anonymized buyer problem signal.
  --requested-input <text>       Redacted input requested or offered.
  --reviewer-role <text>         Role label only; no direct identifier.
  --next-action <text>           Next bounded operator action.
  --suppression-file <csv>       Shared suppression registry. Defaults to the
                               CEIP_SUPPRESSION_REGISTRY env var, then the canonical
                               docs/growth/SUPPRESSION_REGISTRY_LIVE.csv. Required —
                               the file must exist; there is no campaign-local fallback.

Optional options:
  --artifact-promised <text>              Defaults to the route artifact name.
  --caveat-used <text>                    Defaults to the route do-not-claim boundary.
  --commercial-commitment-status <value>  Defaults to none.
  --pilot-evidence-register-action <val>  Defaults to none.
  --notes <text>                          Optional anonymized note.
  --consent-basis <value>                 Consent basis; sent CEM rows require an approved, dated basis.
  --consent-source <value>                Source/proof reference; do not store direct identifiers here.
  --consent-date <YYYY-MM-DD|none>        Date the consent basis was established.
  --sender-identification-status <value>  verified, not_verified, or not_applicable.
  --unsubscribe-mechanism-status <value>  verified, not_verified, or not_applicable.
  --casl-owner-approval <value>           pending, approved, or rejected.
  --casl-approval-date <YYYY-MM-DD|none>  Date of owner review.
  --casl-approval-reference <value>       External review reference; no direct identifiers.
  --unsubscribe-status <value>            none, opted_out, or suppressed.
`);
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

for (const option of requiredOptions) {
  if (!values.has(option)) failures.push(`Missing required option: --${option}`);
}

const route = values.get('route');
const routeConfig = proofPackRouteConfigs.get(route);
if (route && !routeConfig) {
  failures.push(`Unsupported --route ${route}. Expected one of ${Array.from(proofPackRouteConfigs.keys()).join(', ')}.`);
}

const logFile = values.has('log-file') ? path.resolve(repoRoot, values.get('log-file')) : null;
if (logFile && !existsSync(logFile)) {
  failures.push(`Outreach response log not found: ${displayPath(logFile)}. Run create:outreach-response-log first.`);
}
// The shared suppression registry is always required and resolves to the
// canonical workspace registry by default — never a campaign-local file, so an
// opt-out recorded under one campaign applies to every campaign.
const suppressionFile = resolveSuppressionRegistryPath(repoRoot, values.get('suppression-file'));
const suppressionRegistry = loadSuppressionRegistry(repoRoot, suppressionFile);
failures.push(...suppressionRegistry.failures);

if (logFile && existsSync(logFile) && suppressionRegistry.ok) {
  const targetLabel = values.get('target-label') ?? '';
  const replyStatus = values.get('reply-status') ?? '';
  if (OUTBOUND_REPLY_STATUSES.has(replyStatus) && suppressionRegistry.isSuppressed(targetLabel)) {
    failures.push(`Target label ${targetLabel} is suppressed in ${displayPath(suppressionFile)}; no outbound activity may be appended.`);
  }
}

if (failures.length > 0) {
  console.error('Outreach response log append failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const row = {
  activity_date: values.get('activity-date'),
  channel: values.get('channel'),
  target_label: values.get('target-label'),
  buyer_lane: routeConfig.buyerLane,
  proof_pack_id: routeConfig.proofPackId,
  route,
  rating: values.get('rating'),
  variant_id: values.get('variant-id'),
  caveat_used: values.get('caveat-used') ?? routeConfig.doNotClaim,
  artifact_promised: values.get('artifact-promised') ?? routeConfig.artifactGenerated,
  reply_status: values.get('reply-status'),
  response_summary: values.get('response-summary'),
  pain_signal: values.get('pain-signal'),
  requested_input: values.get('requested-input'),
  reviewer_role: values.get('reviewer-role'),
  commercial_commitment_status: values.get('commercial-commitment-status') ?? 'none',
  next_action: values.get('next-action'),
  pilot_evidence_register_action: values.get('pilot-evidence-register-action') ?? 'none',
  notes: values.get('notes') ?? '',
  consent_basis: values.get('consent-basis') ?? 'none',
  consent_source: values.get('consent-source') ?? 'none',
  consent_date: values.get('consent-date') ?? 'none',
  sender_identification_status: values.get('sender-identification-status') ?? 'not_applicable',
  unsubscribe_mechanism_status: values.get('unsubscribe-mechanism-status') ?? 'not_applicable',
  casl_owner_approval: values.get('casl-owner-approval') ?? 'pending',
  casl_approval_date: values.get('casl-approval-date') ?? 'none',
  casl_approval_reference: values.get('casl-approval-reference') ?? 'none',
  unsubscribe_status: values.get('unsubscribe-status') ?? (values.get('reply-status') === 'unsubscribe' ? 'opted_out' : 'none'),
};

const csvRow = columns.map((column) => csvEscape(row[column])).join(',');
const currentText = readFileSync(logFile, 'utf8');
const candidateText = `${currentText.endsWith('\n') ? currentText : `${currentText}\n`}${csvRow}\n`;
const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-outreach-response-log-append-'));
const candidatePath = path.join(tempDir, path.basename(logFile));

try {
  writeFileSync(candidatePath, candidateText, 'utf8');
  execFileSync(process.execPath, [
    path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'),
    candidatePath,
    '--suppression-file',
    suppressionFile,
  ], {
    // The validator reads the same shared suppression registry before any
    // candidate row can be committed to the log.
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (row.unsubscribe_status !== 'none' && !suppressionRegistry.isSuppressed(row.target_label)) {
    const registryText = readFileSync(suppressionFile, 'utf8');
    const registryRow = buildSuppressionRegistryRow(suppressionRegistry.schema, {
      targetLabel: row.target_label,
      suppressionDate: row.activity_date,
      sourceRow: parseCsv(currentText).length + 1,
      reason: row.reply_status === 'unsubscribe' ? 'unsubscribe' : 'owner_suppression',
    }).map(csvEscape).join(',');
    appendFileSync(suppressionFile, `${registryText.endsWith('\n') ? '' : '\n'}${registryRow}\n`, 'utf8');
  }
  writeFileSync(logFile, candidateText, 'utf8');
} catch (error) {
  console.error('Outreach response log append failed validation; original log was not modified.\n');
  const stderr = error?.stderr ? String(error.stderr).trim() : '';
  const stdout = error?.stdout ? String(error.stdout).trim() : '';
  if (stderr) console.error(stderr);
  if (stdout) console.error(stdout);
  if (!stderr && !stdout) console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Outreach response log row appended.');
console.log(`Log: ${displayPath(logFile)}`);
console.log(`Route: ${row.route}`);
console.log(`Proof pack: ${row.proof_pack_id}`);
console.log(`Buyer lane: ${row.buyer_lane}`);
console.log(`Evidence action: ${row.pilot_evidence_register_action}`);
console.log('Confidence movement: none; this outreach log row is not buyer evidence.');
console.log(`Run: pnpm run plan:outreach-intake -- ${displayPath(logFile)}`);
