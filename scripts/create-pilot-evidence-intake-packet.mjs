#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

const routeConfigs = new Map([
  ['/utility-demand-forecast', {
    proofPackId: 'utility_forecast_planning_pack',
    buyerLane: 'utility',
    buyerSegment: 'LDC or utility-planning reviewer',
    inputDataType: 'anonymized utility load history',
    requiredInput: '12-36 months of monthly or hourly load, geography or customer-class labels when available, and no direct identifiers.',
    acceptedFormats: 'CSV or XLSX exported to CSV',
    artifactGenerated: 'forecast planning pack',
    diagnosticPrompt: 'Pending buyer evidence; add numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics.',
    claimBoundary: 'Buyer-supplied redacted planning support only; no production utility onboarding claim.',
    doNotClaim: 'Do not claim utility approval, live telemetry, customer LDC history, or control-room use.',
  }],
  ['/forecast-benchmarking', {
    proofPackId: 'forecast_benchmark_provenance',
    buyerLane: 'utility',
    buyerSegment: 'forecast reviewer or utility consultant',
    inputDataType: 'buyer forecast baseline or reviewer notes',
    requiredInput: 'Existing buyer forecast, accepted baseline method, planning assumption, or reviewer note.',
    acceptedFormats: 'CSV, PDF notes, or Markdown memo extract',
    artifactGenerated: 'forecast trust report',
    diagnosticPrompt: 'Pending buyer evidence; add numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics.',
    claimBoundary: 'Buyer-supplied redacted benchmark support only; no guaranteed accuracy claim.',
    doNotClaim: 'Do not claim guaranteed accuracy, forecast superiority, AI/GPU superiority, or enterprise superiority.',
  }],
  ['/regulatory-filing', {
    proofPackId: 'regulatory_filing_pack',
    buyerLane: 'utility',
    buyerSegment: 'regulatory reviewer or utility consultant',
    inputDataType: 'anonymized filing schedule or checklist',
    requiredInput: 'One anonymized prior filing schedule, reviewer comment, or consultant checklist.',
    acceptedFormats: 'PDF, DOCX, CSV, or Markdown notes',
    artifactGenerated: 'filing-prep checklist',
    diagnosticPrompt: 'Pending buyer evidence; add OEB or AUC mapping plus reviewer checklist or schedule evidence.',
    claimBoundary: 'Buyer-supplied filing-prep support only; no legal, counsel, or regulator-submission claim.',
    doNotClaim: 'Do not claim regulator approval, submission automation, filing counsel approval, or legal opinion.',
  }],
  ['/roi-calculator', {
    proofPackId: 'tier_cfo_savings_pack',
    buyerLane: 'industrial',
    buyerSegment: 'Alberta industrial compliance or finance reviewer',
    inputDataType: 'TIER facility assumptions',
    requiredInput: 'Annual emissions, benchmark exceedance, compliance year, direct-investment assumptions, and approval owner.',
    acceptedFormats: 'CSV, spreadsheet, or signed assumptions note',
    artifactGenerated: 'TIER planning memo',
    diagnosticPrompt: 'Pending buyer evidence; add pricing source, direct-investment sensitivity, and compliance diagnostic evidence.',
    claimBoundary: 'Buyer-supplied planning support only; no trading, tax, legal, or guaranteed-savings advice.',
    doNotClaim: 'Do not claim guaranteed savings, live market price, broker execution, tax advice, or legal advice.',
  }],
  ['/credit-banking', {
    proofPackId: 'tier_credit_banking_audit_pack',
    buyerLane: 'industrial',
    buyerSegment: 'Alberta industrial compliance or finance reviewer',
    inputDataType: 'TIER credit ledger and liability file',
    requiredInput: 'Credit lots, vintage, quantity, purchase price, status, expiry, and compliance-year liability.',
    acceptedFormats: 'CSV',
    artifactGenerated: 'credit banking audit pack',
    diagnosticPrompt: 'Pending buyer evidence; add credit lot or vintage, expiry risk, allocation, and liability evidence.',
    claimBoundary: 'Buyer-supplied ledger-planning support only; no broker, trade, registry, certification, or legal claim.',
    doNotClaim: 'Do not claim broker execution, trade execution, registry certification, legal advice, or live market price.',
  }],
  ['/shadow-billing', {
    proofPackId: 'shadow_billing_invoice_pack',
    buyerLane: 'municipal/public sector',
    buyerSegment: 'municipal energy manager or billing reviewer',
    inputDataType: 'redacted invoice comparison sample',
    requiredInput: 'At least 6-12 months of bills or exported supply-cost rows.',
    acceptedFormats: 'PDF plus extracted CSV, or CSV',
    artifactGenerated: 'shadow billing field map',
    diagnosticPrompt: 'Pending buyer evidence; add field map, monthly delta, and excluded rider or tariff evidence.',
    claimBoundary: 'Buyer-supplied field-level billing support only; no full-bill reconstruction claim.',
    doNotClaim: 'Do not claim verified savings, guaranteed savings, beyond-supplied-field coverage, or full tariff reconstruction.',
  }],
  ['/asset-health', {
    proofPackId: 'asset_health_capex_pack',
    buyerLane: 'utility',
    buyerSegment: 'asset manager or utility planning reviewer',
    inputDataType: 'asset fleet subset',
    requiredInput: 'Asset id, type, age or install year, loading, maintenance, criticality, and replacement-cost override when available.',
    acceptedFormats: 'CSV',
    artifactGenerated: 'asset capex triage pack',
    diagnosticPrompt: 'Pending buyer evidence; add replace/defer, replacement-cost, and weight sensitivity evidence.',
    claimBoundary: 'Buyer-supplied capex planning support only; no engineering approval or replacement mandate claim.',
    doNotClaim: 'Do not claim predictive maintenance, SCADA or ADMS integration, engineering approval, or replacement mandate.',
  }],
  ['/utility-security', {
    proofPackId: 'utility_security_procurement_pack',
    buyerLane: 'security',
    buyerSegment: 'utility security or procurement reviewer',
    inputDataType: 'security questionnaire or review checklist',
    requiredInput: 'Buyer questionnaire or review checklist with owner-approved redacted review notes.',
    acceptedFormats: 'XLSX, DOCX, PDF extract, or Markdown notes',
    artifactGenerated: 'security procurement evidence matrix',
    diagnosticPrompt: 'Pending buyer evidence; add control matrix, evidence boundary, and owner/deployed evidence split.',
    claimBoundary: 'Buyer-supplied security review support only; no certification or production approval claim.',
    doNotClaim: 'Do not claim SOC certification, NERC certification, production utility approval, or legal/privacy approval.',
  }],
  ['/ai-datacentres', {
    proofPackId: 'large_load_readiness_overlay',
    buyerLane: 'large load',
    buyerSegment: 'large-load planner or data-centre energy reviewer',
    inputDataType: 'large-load assumptions memo',
    requiredInput: 'Load size, timing, location class, connection context, storage or BYOP options, and buyer constraints.',
    acceptedFormats: 'Markdown, CSV, or memo',
    artifactGenerated: 'large-load planning overlay',
    diagnosticPrompt: 'Pending buyer evidence; add assumptions, constraint, and storage or BYOP sensitivity evidence.',
    claimBoundary: 'Buyer-supplied assumptions-only planning support; no engineering, interconnection, capacity, or dispatch approval claim.',
    doNotClaim: 'Do not claim engineering approval, interconnection approval, available capacity, dispatch support, or control-room use.',
  }],
  ['/api-docs', {
    proofPackId: 'consultant_api_data_pack',
    buyerLane: 'consultant/api',
    buyerSegment: 'energy analyst or consultant reviewer',
    inputDataType: 'endpoint freshness matrix and sample export',
    requiredInput: 'Selected 5-10 endpoint workflow, sample payload/export, endpoint freshness matrix, and OpenAPI parity notes.',
    acceptedFormats: 'CSV, JSON, Markdown, or notebook outline',
    artifactGenerated: 'consultant API data pack',
    diagnosticPrompt: 'Pending buyer evidence; add endpoint, freshness, and OpenAPI diagnostic evidence.',
    claimBoundary: 'Buyer workflow support only; no production integration, live-data SLA, or full OpenAPI parity claim.',
    doNotClaim: 'Do not claim production API integration, live-data SLA, or full OpenAPI parity.',
  }],
  ['/ga-ici-5cp', {
    proofPackId: 'ga_ici_5cp_decision_support_pack',
    buyerLane: 'utility',
    buyerSegment: 'Ontario Class A energy manager or advisor',
    inputDataType: 'Ontario interval load and IESO peak-window notes',
    requiredInput: 'Buyer-supplied Ontario interval load for candidate peak windows plus IESO peak tracker or top-five peak-hour notes.',
    acceptedFormats: 'CSV and Markdown notes',
    artifactGenerated: 'GA/ICI 5CP decision-support pack',
    diagnosticPrompt: 'Pending buyer evidence; add top-five peak hours, peak demand factor, IESO source, and decision-support boundary evidence.',
    claimBoundary: 'Buyer-supplied decision-support only; no final IESO settlement, eligibility, savings, or operational-instruction claim.',
    doNotClaim: 'Do not claim guaranteed savings, final IESO settlement, eligibility decision, or curtailment instruction.',
  }],
  ['/byo-csv-proof', {
    proofPackId: 'byo_csv_privacy_proof_pack',
    buyerLane: 'security',
    buyerSegment: 'privacy, security, procurement, or planning reviewer',
    inputDataType: 'redacted CSV retained proof extract',
    requiredInput: 'Redacted CSV sample or owner-approved local CSV with retained extract containing schema, completeness, direct-identifier screen, formula screen, and linkage-warning results only.',
    acceptedFormats: 'CSV input with Markdown retained extract',
    artifactGenerated: 'BYO-CSV privacy proof pack',
    diagnosticPrompt: 'Pending buyer evidence; add schema, completeness, direct-identifier screen, spreadsheet formula screen, retained raw values flag, quasi-identifier linkage warning, and confidence-gate readiness evidence.',
    claimBoundary: 'Buyer-supplied redacted privacy-screen support only; no certification, no buyer acceptance, and no production connector approval claim.',
    doNotClaim: 'Do not claim PII-free certification, no privacy risk, buyer acceptance, or production connector approval.',
  }],
]);

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

\`\`\`bash
pnpm run validate:pilot-evidence -- ${starterRegisterDisplay}
pnpm run prepare:pilot-evidence-artifact -- --evidence-root ${redactedArtifactDirDisplay} --artifact-file ${packetSlug}-retained.md --route ${route} --record-date ${recordDate} --pii-screen-result redacted --buyer-data-coverage-pct 0 --time-to-artifact-hours 0 --reviewer-role "buyer reviewer role" --reviewer-acceptance accepted --reviewer-feedback-status complete --day-14-decision proceed --commercial-commitment-status none --claim-boundary "${config.claimBoundary}" --do-not-claim "${config.doNotClaim}" --diagnostic "${config.diagnosticPrompt}"
pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root ${redactedArtifactDirDisplay}
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
