#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { proofPackRouteConfigs } from './lib/proof-pack-routes.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();

const columns = [
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
    --pilot-evidence-register-action create_intake_packet

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

Optional options:
  --artifact-promised <text>              Defaults to the route artifact name.
  --caveat-used <text>                    Defaults to the route do-not-claim boundary.
  --commercial-commitment-status <value>  Defaults to none.
  --pilot-evidence-register-action <val>  Defaults to none.
  --notes <text>                          Optional anonymized note.
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
};

const csvRow = columns.map((column) => csvEscape(row[column])).join(',');
const currentText = readFileSync(logFile, 'utf8');
const candidateText = `${currentText.endsWith('\n') ? currentText : `${currentText}\n`}${csvRow}\n`;
const tempDir = mkdtempSync(path.join(tmpdir(), 'ceip-outreach-response-log-append-'));
const candidatePath = path.join(tempDir, path.basename(logFile));

try {
  writeFileSync(candidatePath, candidateText, 'utf8');
  execFileSync(process.execPath, [path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'), candidatePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
