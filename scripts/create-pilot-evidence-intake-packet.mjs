#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { proofPackRouteConfigs as routeConfigs } from './lib/proof-pack-routes.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const values = new Map();
let force = false;
let listRoutes = false;

const registerColumns = [
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

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--force') {
    force = true;
    continue;
  }
  if (arg === '--list-routes') {
    listRoutes = true;
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

function printUsage() {
  console.log(`Usage:
  pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake

Options:
  --route <route>              Required. One of the supported proof-pack routes.
  --output-dir <dir>           Required. Destination for the intake packet.
  --record-date <YYYY-MM-DD>   Optional. Defaults to today's UTC date.
  --buyer-lane <lane>          Optional. Defaults from the route.
  --buyer-segment <segment>    Optional. Defaults from the route.
  --evidence-owner <owner>     Optional. Defaults to CEIP pilot owner.
  --force                      Overwrite generated files in a non-empty output directory.
  --list-routes                Print supported routes.
`);
}

function printRoutes() {
  console.log('Supported pilot evidence routes:');
  for (const [route, config] of routeConfigs) {
    console.log(`- ${route} (${config.proofPackId})`);
  }
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function routeSlug(route) {
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return filePath.split(path.sep).join('/');
}

function markdownList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function routeSpecificRetainedArtifactCommand() {
  if (route === '/forecast-benchmarking') {
    return [
      'pnpm run prepare:forecast-trust-report-artifact -- \\',
      '  --benchmark-pack-file path/to/redacted-utility-forecast-benchmark-pack.json \\',
      `  --evidence-root ${redactedArtifactDirDisplay} \\`,
      `  --artifact-file ${packetSlug}-retained.md \\`,
      `  --route ${route} \\`,
      `  --proof-pack-id ${config.proofPackId} \\`,
      `  --record-date ${recordDate} \\`,
      '  --buyer-data-coverage-pct "<replace with buyer data coverage percentage>" \\',
      '  --time-to-artifact-hours "<replace with elapsed artifact hours>" \\',
      '  --reviewer-role "<replace with independent buyer/reviewer role>" \\',
      '  --reviewer-acceptance "<accepted|approved|signed>" \\',
      '  --reviewer-feedback-status "<complete|accepted|approved|signed>" \\',
      '  --day-14-decision proceed \\',
      '  --commercial-commitment-status "<none|design_partner_signed|paid_pilot|purchase_order|letter_of_intent>" \\',
      '  --commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>"',
    ].join('\n');
  }

  if (route === '/byo-csv-proof') {
    return [
      'pnpm run prepare:byo-csv-proof-artifact -- \\',
      '  --csv-file path/to/redacted-local.csv \\',
      `  --evidence-root ${redactedArtifactDirDisplay} \\`,
      `  --artifact-file ${packetSlug}-retained.md \\`,
      `  --route ${route} \\`,
      `  --proof-pack-id ${config.proofPackId} \\`,
      `  --record-date ${recordDate} \\`,
      '  --buyer-data-coverage-pct "<replace with buyer data coverage percentage>" \\',
      '  --time-to-artifact-hours "<replace with elapsed artifact hours>" \\',
      '  --reviewer-role "<replace with independent buyer/reviewer role>" \\',
      '  --reviewer-acceptance "<accepted|approved|signed>" \\',
      '  --reviewer-feedback-status "<complete|accepted|approved|signed>" \\',
      '  --day-14-decision proceed \\',
      '  --commercial-commitment-status "<none|design_partner_signed|paid_pilot|purchase_order|letter_of_intent>" \\',
      '  --commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>"',
    ].join('\n');
  }

  if (route === '/ga-ici-5cp') {
    return [
      'pnpm run prepare:ga-ici-5cp-artifact -- \\',
      '  --peak-tracker-file path/to/ieso-peak-tracker-snapshot.md \\',
      '  --historical-actuals-file public/data/ga_ici_5cp_public_historical_actuals.csv \\',
      '  --customer-load-file path/to/redacted-ontario-interval-load.csv \\',
      `  --evidence-root ${redactedArtifactDirDisplay} \\`,
      `  --artifact-file ${packetSlug}-retained.md \\`,
      `  --route ${route} \\`,
      `  --proof-pack-id ${config.proofPackId} \\`,
      '  --base-period-start "<replace with YYYY-MM-DD>" \\',
      '  --base-period-end "<replace with YYYY-MM-DD>" \\',
      `  --record-date ${recordDate} \\`,
      '  --buyer-data-coverage-pct "<replace with buyer data coverage percentage>" \\',
      '  --time-to-artifact-hours "<replace with elapsed artifact hours>" \\',
      '  --reviewer-role "<replace with independent buyer/reviewer role>" \\',
      '  --reviewer-acceptance "<accepted|approved|signed>" \\',
      '  --reviewer-feedback-status "<complete|accepted|approved|signed>" \\',
      '  --day-14-decision proceed \\',
      '  --commercial-commitment-status "<none|design_partner_signed|paid_pilot|purchase_order|letter_of_intent>" \\',
      '  --commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>"',
    ].join('\n');
  }

  return '';
}

if (listRoutes) {
  printRoutes();
  process.exit(0);
}

const route = values.get('route') ?? '';
const config = routeConfigs.get(route);
if (!route) failures.push('Missing required option: --route');
if (route && !config) failures.push(`Unsupported route: ${route}. Run with --list-routes to see allowed routes.`);
if (!values.has('output-dir')) failures.push('Missing required option: --output-dir');

const recordDate = values.get('record-date') ?? new Date().toISOString().slice(0, 10);
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');

if (failures.length > 0) {
  console.error('Pilot evidence intake packet generation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const outputDir = path.resolve(repoRoot, values.get('output-dir'));
if (existsSync(outputDir) && readdirSync(outputDir).length > 0 && !force) {
  console.error(`Output directory is not empty: ${outputDir}`);
  console.error('Use --force to overwrite generated packet files.');
  process.exit(1);
}

const buyerLane = values.get('buyer-lane') ?? config.buyerLane;
const buyerSegment = values.get('buyer-segment') ?? config.buyerSegment;
const evidenceOwner = values.get('evidence-owner') ?? 'CEIP pilot owner';
const packetSlug = routeSlug(route);
const redactedArtifactDir = path.join(outputDir, 'redacted-artifacts');
const starterRegisterPath = path.join(outputDir, 'pilot-evidence-register-starter.csv');
const packetReadmePath = path.join(outputDir, 'README.md');
const artifactReadmePath = path.join(redactedArtifactDir, 'README.md');
const redactedArtifactDirDisplay = displayPath(redactedArtifactDir);
const starterRegisterDisplay = displayPath(starterRegisterPath);

mkdirSync(redactedArtifactDir, { recursive: true });

const starterRow = {
  record_date: recordDate,
  buyer_lane: buyerLane,
  buyer_segment: buyerSegment,
  proof_pack_id: config.proofPackId,
  route,
  evidence_owner: evidenceOwner,
  input_data_type: config.inputDataType,
  source_label: 'buyer_supplied_anonymized',
  evidence_file_reference: 'redacted-artifacts/README.md (replace with retained extract sha256 after artifact preparation)',
  pii_screen_result: 'redacted',
  commercial_commitment_status: 'none',
  artifact_generated: config.artifactGenerated,
  time_to_artifact_hours: '0',
  buyer_data_coverage_pct: '0',
  benchmark_lift_or_diagnostic: config.diagnosticPrompt,
  reviewer_role: '',
  reviewer_feedback_status: 'pending',
  reviewer_acceptance: 'pending',
  claim_boundary: config.claimBoundary,
  do_not_claim: config.doNotClaim,
  day_14_decision: 'pending',
  confidence_delta: '0',
  follow_up_action: 'Replace this starter row after the buyer supplies redacted evidence and a reviewer decision.',
  notes: 'Starter row only; not buyer proof and not market-confidence evidence.',
};

const csvText = [
  registerColumns.join(','),
  registerColumns.map((column) => csvEscape(starterRow[column])).join(','),
  '',
].join('\n');

const readme = `# CEIP Pilot Evidence Intake Packet

Route: \`${route}\`
Proof pack: \`${config.proofPackId}\`
Record date: \`${recordDate}\`

This packet is a starter workspace for real buyer evidence. It does not create buyer proof, move confidence, or satisfy the 95% market-confidence gate.

## Required Buyer Input

${markdownList([
  config.requiredInput,
  `Accepted formats: ${config.acceptedFormats}.`,
  'Only retain redacted, buyer-approved extracts in this packet.',
  'Keep raw originals, sensitive source files, credentials, account identifiers, meter identifiers, names, addresses, phone numbers, and emails outside this repository.',
])}

## Files

${markdownList([
  '`pilot-evidence-register-starter.csv` is a validator-compatible starter row with `confidence_delta=0`.',
  '`redacted-artifacts/` is where retained text-inspectable extracts should be placed after redaction.',
  '`redacted-artifacts/README.md` explains how to prepare the first hashable retained artifact.',
])}

## First Commands

Run the starter validation immediately. The retained-artifact command is a template to fill only after buyer-supplied redacted evidence, reviewer status, timing, coverage, and commercial-commitment evidence are known.

\`\`\`bash
pnpm run validate:pilot-evidence -- ${starterRegisterDisplay}
${routeSpecificRetainedArtifactCommand() ? `\n# Preferred route-specific retained-artifact helper\n${routeSpecificRetainedArtifactCommand()}\n\n# Generic fallback retained-artifact helper` : '# Generic retained-artifact helper'}
pnpm run prepare:pilot-evidence-artifact -- --evidence-root ${redactedArtifactDirDisplay} --artifact-file ${packetSlug}-retained.md --route ${route} --proof-pack-id ${config.proofPackId} --record-date ${recordDate} --pii-screen-result redacted --buyer-data-coverage-pct "<replace with buyer data coverage percentage>" --time-to-artifact-hours "<replace with elapsed artifact hours>" --reviewer-role "<replace with independent buyer/reviewer role>" --reviewer-acceptance "<accepted|approved|signed>" --reviewer-feedback-status "<complete|accepted|approved|signed>" --day-14-decision proceed --commercial-commitment-status "<none|design_partner_signed|paid_pilot|purchase_order|letter_of_intent>" --commercial-commitment-evidence "<replace with retained commercial-commitment evidence text when status is stronger than none>" --claim-boundary "${config.claimBoundary}" --do-not-claim "${config.doNotClaim}" --diagnostic "<replace with retained route-specific diagnostic evidence>"
pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root ${redactedArtifactDirDisplay}
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root ${redactedArtifactDirDisplay}
\`\`\`

After preparing a retained artifact, replace the starter row's \`evidence_file_reference\` with the printed \`sha256\` reference and replace pending reviewer fields with buyer-side evidence.

## Claim Boundary

${markdownList([
  config.claimBoundary,
  config.doNotClaim,
  'A filled register can change market confidence only after buyer-supplied evidence, independent reviewer acceptance, and retained artifact hashes pass validation.',
])}
`;

const artifactReadme = `# Retained Redacted Artifacts

Store text-inspectable retained extracts here after redaction. Do not store raw buyer files or sensitive originals in this packet.

Accepted retained formats:

${markdownList(['CSV', 'TSV', 'JSON', 'JSONL', 'Markdown', 'text', 'HTML', 'YAML'])}

For PDFs, spreadsheets, screenshots, or scans, create a redacted Markdown or text extract, then hash that retained extract.

The retained artifact should support these register fields exactly:

${markdownList([
  'record_date',
  'pii_screen_result',
  'buyer_data_coverage_pct',
  'time_to_artifact_hours',
  'reviewer_acceptance',
  'reviewer_feedback_status',
  'day_14_decision',
  'commercial_commitment_status when it is stronger than none',
  'route-specific diagnostic evidence',
])}
`;

writeFileSync(starterRegisterPath, csvText, 'utf8');
writeFileSync(packetReadmePath, readme, 'utf8');
writeFileSync(artifactReadmePath, artifactReadme, 'utf8');

console.log('Pilot evidence intake packet created.');
console.log(`Route: ${route}`);
console.log(`Proof pack: ${config.proofPackId}`);
console.log(`Output directory: ${outputDir}`);
console.log(`Starter register: ${starterRegisterPath}`);
console.log('');
console.log('Next checks:');
console.log(`pnpm run validate:pilot-evidence -- ${starterRegisterDisplay}`);
console.log(`pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root ${redactedArtifactDirDisplay}`);
console.log(`pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root ${redactedArtifactDirDisplay}`);
