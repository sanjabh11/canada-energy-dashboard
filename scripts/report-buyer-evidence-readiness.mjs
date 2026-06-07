#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { proofPackRouteConfigs } from './lib/proof-pack-routes.mjs';
import {
  phaseFDefaultMinimumRoutes,
  phaseFGlobalGateChecks,
  phaseFMinimumLaneGroups,
} from './lib/phase-f-minimum-evidence.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];
const roots = [];
let evidenceRoot = null;
let failWhenEmpty = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--') continue;
  if (arg === '--root') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) failures.push('--root requires a directory path.');
    else roots.push(path.resolve(repoRoot, value));
    continue;
  }
  if (arg.startsWith('--root=')) {
    const value = arg.slice('--root='.length);
    if (!value) failures.push('--root requires a directory path.');
    else roots.push(path.resolve(repoRoot, value));
    continue;
  }
  if (arg === '--evidence-root') {
    const value = args[index + 1] ?? '';
    index += 1;
    if (!value || value.startsWith('--')) failures.push('--evidence-root requires a directory path.');
    else evidenceRoot = path.resolve(repoRoot, value);
    continue;
  }
  if (arg.startsWith('--evidence-root=')) {
    const value = arg.slice('--evidence-root='.length);
    if (!value) failures.push('--evidence-root requires a directory path.');
    else evidenceRoot = path.resolve(repoRoot, value);
    continue;
  }
  if (arg === '--fail-when-empty') {
    failWhenEmpty = true;
    continue;
  }
  failures.push(`Unknown option: ${arg}`);
}

if (roots.length === 0) {
  roots.push(path.join(repoRoot, 'docs/growth'));
}

const pilotRegisterColumns = [
  'record_date',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'evidence_file_reference',
  'commercial_commitment_status',
  'reviewer_acceptance',
  'confidence_delta',
];

const outreachLogColumns = [
  'activity_date',
  'channel',
  'target_label',
  'buyer_lane',
  'proof_pack_id',
  'route',
  'reply_status',
  'pilot_evidence_register_action',
];

const ignoredPathSegments = new Set([
  '.git',
  'node_modules',
  'dist',
  'playwright-report',
  'test-results',
  'coverage',
  'templates',
  'fixtures',
]);

const ignoredPathPatterns = [
  /(?:^|\/)tests?\//,
  /(?:^|\/)__snapshots__(?:\/|$)/,
  /(?:^|\/)archive(?:\/|$)/,
  /(?:^|\/)docs\/archive(?:\/|$)/,
];

function displayPath(filePath) {
  const relative = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative;
  return filePath.split(path.sep).join('/');
}

function normalizeColumn(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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
      if (row.some((cell) => String(cell).trim().length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => String(cell).trim().length > 0)) rows.push(row);
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map(normalizeColumn);
  return rows.slice(1).map((row) => {
    const entry = {};
    for (let index = 0; index < header.length; index += 1) {
      entry[header[index]] = row[index] ?? '';
    }
    return entry;
  });
}

function hasColumns(columns, requiredColumns) {
  return requiredColumns.every((column) => columns.has(column));
}

function shouldIgnore(filePath) {
  const normalized = displayPath(filePath);
  if (ignoredPathPatterns.some((pattern) => pattern.test(normalized))) return true;
  return normalized.split('/').some((segment) => ignoredPathSegments.has(segment));
}

function validateDirectoryInput(label, dirPath) {
  if (!existsSync(dirPath)) {
    failures.push(`${label} directory not found: ${displayPath(dirPath)}`);
    return;
  }
  if (!statSync(dirPath).isDirectory()) {
    failures.push(`${label} must be a directory: ${displayPath(dirPath)}`);
  }
}

function scanCsvFiles(root) {
  const files = [];
  let ignored = 0;

  function walk(currentPath) {
    if (!existsSync(currentPath)) return;
    const stats = statSync(currentPath);
    if (stats.isDirectory()) {
      if (shouldIgnore(currentPath)) {
        ignored += 1;
        return;
      }
      for (const entry of readdirSync(currentPath)) walk(path.join(currentPath, entry));
      return;
    }
    if (!stats.isFile() || !currentPath.toLowerCase().endsWith('.csv')) return;
    if (shouldIgnore(currentPath)) {
      ignored += 1;
      return;
    }
    files.push(currentPath);
  }

  walk(root);
  return { files, ignored };
}

function runNodeScript(scriptPath, scriptArgs) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function firstOutputLines(output, limit = 8) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function indentedOutputLines(output, limit = 28) {
  return firstOutputLines(output, limit).map((line) => `    ${line}`);
}

function routeWithProofPack(route) {
  const config = proofPackRouteConfigs.get(route);
  return config ? `${route} (${config.proofPackId})` : route;
}

function pnpmRunCommand(scriptName, args = '') {
  return `corepack pnpm run ${scriptName}${args ? ` ${args}` : ''}`;
}

function phaseFMinimumBundleCommand(outputDir = '/tmp/ceip-phase-f-minimum-intake') {
  return pnpmRunCommand('create:phase-f-minimum-intake-bundle', `-- --output-dir ${outputDir}`);
}

function phaseFEvidenceWorkspaceCommand(outputDir = '/tmp/ceip-phase-f-evidence') {
  return pnpmRunCommand('create:phase-f-evidence-workspace', `-- --output-dir ${outputDir}`);
}

function phaseFEvidenceWorkspaceReportCommand(workspaceDir = '/tmp/ceip-phase-f-evidence') {
  return pnpmRunCommand('report:phase-f-evidence-workspace', `-- --workspace-dir ${workspaceDir}`);
}

function phaseFEvidenceWorkspaceUpdatedRegisterReportCommand(
  workspaceDir = '/tmp/ceip-phase-f-evidence',
  registerFile = '/tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv',
) {
  return `${phaseFEvidenceWorkspaceReportCommand(workspaceDir)} --register-file ${registerFile}`;
}

const packageScriptHandles = [
  ['report_buyer_evidence_readiness', pnpmRunCommand('report:buyer-evidence-readiness'), 'Readiness scan only; does not create buyer proof.'],
  ['check_buyer_evidence_readiness_report', pnpmRunCommand('check:buyer-evidence-readiness-report'), 'Report contract check only; does not require buyer evidence to pass.'],
  ['report_buyer_evidence_gate_readiness', pnpmRunCommand('report:buyer-evidence-gate-readiness'), 'Focused hard-gate report only; does not move confidence.'],
  ['check_buyer_evidence_gate_report', pnpmRunCommand('check:buyer-evidence-gate-report'), 'Focused hard-gate contract check only.'],
  ['create_phase_f_minimum_intake_bundle', phaseFMinimumBundleCommand(), 'Starter bundle generation only; generated rows remain zero-evidence.'],
  ['check_phase_f_minimum_intake_bundle', pnpmRunCommand('check:phase-f-minimum-intake-bundle'), 'Template/bundle contract check only.'],
  ['create_phase_f_evidence_workspace', phaseFEvidenceWorkspaceCommand(), 'Workspace scaffold only; does not contact buyers.'],
  ['report_phase_f_evidence_workspace', phaseFEvidenceWorkspaceReportCommand(), 'Workspace validation report only.'],
  ['report_phase_f_evidence_workspace_updated_register', phaseFEvidenceWorkspaceUpdatedRegisterReportCommand(), 'Candidate updated-register validation only.'],
  ['check_phase_f_evidence_workspace', pnpmRunCommand('check:phase-f-evidence-workspace'), 'Workspace template contract check only.'],
  ['validate_pilot_evidence_require_95', pnpmRunCommand('validate:pilot-evidence', '-- --require-95'), 'Final retained-artifact validator; requires real accepted buyer rows and evidence root.'],
  ['report_pilot_evidence_95', pnpmRunCommand('report:pilot-evidence-95'), '95% validator report form; requires real register inputs to pass.'],
  ['check_pilot_evidence_template', pnpmRunCommand('check:pilot-evidence-template'), 'Template check only; not buyer proof.'],
  ['check_pilot_evidence_95_fixture_gate', pnpmRunCommand('check:pilot-evidence-95-fixture-gate'), 'Fixture boundary check only; not production evidence.'],
  ['check_outreach_response_log_template', pnpmRunCommand('check:outreach-response-log-template'), 'Outreach template contract check only.'],
  ['check_outreach_intake_plan_template', pnpmRunCommand('check:outreach-intake-plan-template'), 'Outreach plan template contract check only.'],
  ['plan_outreach_intake', pnpmRunCommand('plan:outreach-intake'), 'Plans from real outreach logs only; does not send outreach.'],
  ['append_outreach_response_log_row', pnpmRunCommand('append:outreach-response-log-row', '-- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv ...'), 'Operator-owned append command for real anonymized buyer activity only.'],
];

const acceptedReviewStatuses = new Set(['accepted', 'approved', 'signed']);
const completeFeedbackStatuses = new Set(['accepted', 'approved', 'complete', 'signed']);
const buyerSourceLabels = new Set(['buyer_supplied_anonymized', 'buyer_supplied_confidential']);
const strongCommercialStatuses = new Set([
  'design_partner_signed',
  'paid_pilot',
  'purchase_order',
  'letter_of_intent',
]);
const forecastDiagnosticPatterns = [
  /mae/i,
  /mape/i,
  /rmse/i,
  /persistence/i,
  /seasonal[- ]?naive/i,
  /rolling[- ]?(?:origin|split)|rolling split/i,
  /interval coverage|conformal/i,
  /champion|challenger/i,
];
const hashReferencePattern = /\bsha256[:=]([a-f0-9]{64})\b/i;

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function numericValue(value) {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function isAcceptedConfidenceMovingBuyerRow(row) {
  return numericValue(row.confidence_delta) > 0
    && buyerSourceLabels.has(normalizeText(row.source_label))
    && completeFeedbackStatuses.has(normalizeText(row.reviewer_feedback_status))
    && acceptedReviewStatuses.has(normalizeText(row.reviewer_acceptance))
    && normalizeText(row.day_14_decision) === 'proceed';
}

function hasForecastDiagnosticSet(row) {
  return forecastDiagnosticPatterns.every((pattern) => pattern.test(String(row.benchmark_lift_or_diagnostic ?? '')));
}

function hashReference(row) {
  return String(row.evidence_file_reference ?? '').match(hashReferencePattern)?.[1]?.toLowerCase() ?? '';
}

function statusText(condition) {
  return condition ? 'pass' : 'blocked';
}

function hardGateDeficitRows(pilotRegisters, { gate95Ran, passing95Gates }) {
  const registerRows = pilotRegisters.flatMap((register) => register.rowObjects);
  const acceptedRows = registerRows.filter(isAcceptedConfidenceMovingBuyerRow);
  const utilityForecastRows = acceptedRows.filter((row) => {
    const route = normalizeText(row.route);
    return (route === '/utility-demand-forecast' || route === '/forecast-benchmarking') && hasForecastDiagnosticSet(row);
  });
  const tierOrCreditRows = acceptedRows.filter((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'tier_cfo_savings_pack' || proofPackId === 'tier_credit_banking_audit_pack';
  });
  const billingOrSecurityRows = acceptedRows.filter((row) => {
    const proofPackId = normalizeText(row.proof_pack_id);
    return proofPackId === 'shadow_billing_invoice_pack' || proofPackId === 'utility_security_procurement_pack';
  });
  const acceptedProofPacks = new Set(acceptedRows.map((row) => normalizeText(row.proof_pack_id)).filter(Boolean));
  const totalAcceptedConfidenceDelta = acceptedRows.reduce((total, row) => total + numericValue(row.confidence_delta), 0);
  const hashReferences = acceptedRows.map(hashReference).filter(Boolean);
  const distinctHashReferences = new Set(hashReferences);
  const coverageFailures = acceptedRows.filter((row) => numericValue(row.buyer_data_coverage_pct) < 70);
  const artifactHours = acceptedRows.map((row) => numericValue(row.time_to_artifact_hours));
  const validArtifactHours = artifactHours.filter((hours) => Number.isFinite(hours) && hours > 0);
  const hasFastArtifact = validArtifactHours.some((hours) => hours <= 48);
  const hasOnlyTimelyArtifacts = acceptedRows.length > 0
    && validArtifactHours.length === acceptedRows.length
    && validArtifactHours.every((hours) => hours <= 120);
  const hasCommercialSignal = acceptedRows.some((row) => strongCommercialStatuses.has(normalizeText(row.commercial_commitment_status)));

  return [
    {
      requirement: 'Utility forecast lane',
      current: `${utilityForecastRows.length} accepted diagnostic row(s)`,
      needed: '>=1 buyer-supplied accepted utility forecast row with full diagnostics',
      status: statusText(utilityForecastRows.length > 0),
      nextAction: 'Attach accepted utility forecast or forecast-trust evidence with MAE, MAPE, RMSE, baselines, rolling-origin, interval coverage, and champion/challenger diagnostics.',
    },
    {
      requirement: 'TIER or credit lane',
      current: `${tierOrCreditRows.length} accepted row(s)`,
      needed: '>=1 buyer-supplied accepted TIER CFO or credit-banking row',
      status: statusText(tierOrCreditRows.length > 0),
      nextAction: 'Collect accepted TIER CFO or credit-banking evidence with reviewer feedback and day-14 proceed status.',
    },
    {
      requirement: 'Billing or security lane',
      current: `${billingOrSecurityRows.length} accepted row(s)`,
      needed: '>=1 buyer-supplied accepted shadow-billing or utility-security row',
      status: statusText(billingOrSecurityRows.length > 0),
      nextAction: 'Collect accepted shadow-billing or utility-security evidence with reviewer feedback and day-14 proceed status.',
    },
    {
      requirement: 'Distinct accepted proof packs',
      current: `${acceptedProofPacks.size}/3`,
      needed: '>=3 distinct proof_pack_id values with day_14_decision=proceed',
      status: statusText(acceptedProofPacks.size >= 3),
      nextAction: 'Move at least three different proof packs through accepted buyer review; generated starter rows remain zero-evidence.',
    },
    {
      requirement: 'Accepted confidence_delta',
      current: `${formatNumber(totalAcceptedConfidenceDelta)}/0.9`,
      needed: '>=0.9 total accepted buyer-supplied confidence_delta',
      status: statusText(totalAcceptedConfidenceDelta >= 0.9 && acceptedRows.length > 0),
      nextAction: 'Keep rehearsal rows at 0 and increase confidence only for accepted buyer-supplied rows.',
    },
    {
      requirement: 'Retained SHA-256 references',
      current: `${distinctHashReferences.size}/${acceptedRows.length} distinct hash reference(s)`,
      needed: 'one distinct sha256 reference for every accepted confidence-moving row',
      status: statusText(acceptedRows.length > 0 && distinctHashReferences.size === acceptedRows.length),
      nextAction: 'Prepare retained redacted text artifacts and update register rows through update:pilot-evidence-register-row.',
    },
    {
      requirement: 'Buyer data coverage',
      current: acceptedRows.length > 0 ? `${coverageFailures.length} accepted row(s) below 70%` : '0 accepted row(s)',
      needed: 'every accepted confidence-moving row has buyer_data_coverage_pct >= 70',
      status: statusText(acceptedRows.length > 0 && coverageFailures.length === 0),
      nextAction: 'Record buyer-data coverage for every accepted row and keep sub-70% rows from moving confidence.',
    },
    {
      requirement: 'Artifact turnaround',
      current: acceptedRows.length > 0 ? `fast<=48h=${hasFastArtifact ? 'yes' : 'no'}; all<=120h=${hasOnlyTimelyArtifacts ? 'yes' : 'no'}` : '0 accepted row(s)',
      needed: 'at least one accepted row <=48h and every accepted row <=120h',
      status: statusText(hasFastArtifact && hasOnlyTimelyArtifacts),
      nextAction: 'Record time_to_artifact_hours for each accepted row and keep one accepted proof pack at or below 48 hours.',
    },
    {
      requirement: 'Strong commercial signal',
      current: hasCommercialSignal ? 'present' : 'missing',
      needed: 'design partner, paid pilot, purchase order, or letter of intent',
      status: statusText(hasCommercialSignal),
      nextAction: 'Attach retained redacted text proving a strong commercial commitment; status-only labels do not count.',
    },
    {
      requirement: 'Retained-artifact 95% validation',
      current: gate95Ran ? `${passing95Gates} passing register(s)` : 'not run',
      needed: 'validate:pilot-evidence --require-95 passes with --evidence-root',
      status: statusText(passing95Gates > 0),
      nextAction: gate95Ran
        ? 'Fix retained-artifact gate failures before raising market-confidence claims.'
        : 'Rerun with --evidence-root after accepted rows and retained artifacts exist.',
    },
  ];
}

function printHardGateDeficitLedger(pilotRegisters, options) {
  const rows = hardGateDeficitRows(pilotRegisters, options);
  const openCount = rows.filter((row) => row.status !== 'pass').length;

  console.log('\n## Hard 95% Gate Deficit Ledger');
  console.log(`Open hard-gate deficits: ${openCount}/${rows.length}. Generated scaffolding, outreach headers, and starter registers do not close any deficit.`);
  console.log('');
  console.log('| Requirement | Current | Needed | Status | Next action |');
  console.log('|---|---|---|---|---|');
  for (const row of rows) {
    console.log(`| ${row.requirement} | ${row.current} | ${row.needed} | ${row.status} | ${row.nextAction} |`);
  }
}

function printPhaseFMinimumEvidenceMap() {
  console.log('\n## Minimum Phase F 95% Evidence Map');
  console.log('The hard 95% gate is intentionally stricter than finding any one buyer reply or demo artifact. Minimum accepted buyer-evidence coverage:');
  for (const group of phaseFMinimumLaneGroups) {
    console.log(`- ${group.label}: ${group.routes.map(routeWithProofPack).join(' or ')}. ${group.reason}`);
  }
  console.log('- Global gate checks:');
  for (const check of phaseFGlobalGateChecks) console.log(`  - ${check}`);

  console.log('\nStarter intake bundle for the default minimum lane mix:');
  console.log(`- ${phaseFMinimumBundleCommand()}`);
  console.log(`- Default bundle routes: ${phaseFDefaultMinimumRoutes.map(routeWithProofPack).join(', ')}.`);
  console.log('- Override the finance or billing/security lane with `--tier-route /credit-banking` or `--billing-security-route /shadow-billing` when the buyer evidence points there.');
  console.log('\nAll-in-one Phase F collection workspace for operators:');
  console.log(`- ${phaseFEvidenceWorkspaceCommand()}`);
  console.log(`- ${phaseFEvidenceWorkspaceReportCommand()}`);
  console.log(`- After updating a candidate register: ${phaseFEvidenceWorkspaceUpdatedRegisterReportCommand()}`);
  console.log('- The workspace wraps the outreach log, default minimum starter bundle, readiness report, and hard-gate blocker check without creating buyer proof.');
}

function printPackageScriptHandles() {
  console.log('\n## Package Script Handles');
  console.log('These package handles are operator handoffs only. They do not contact buyers, create accepted evidence, attach retained artifacts, move confidence, validate the 95% gate, approve production, deploy, or prove hosted/live parity by themselves.');
  console.log('');
  console.log('| Handle | Command | Boundary |');
  console.log('|---|---|---|');
  for (const [handle, command, boundary] of packageScriptHandles) {
    console.log(`| ${handle} | ${command} | ${boundary} |`);
  }
}

function summarizePilotRegister(filePath, rows) {
  const rowObjects = rowsToObjects(rows);
  const confidenceRows = rowObjects.filter((row) => Number(row.confidence_delta) > 0);
  const acceptedRows = rowObjects.filter((row) => /^(accepted|approved|signed)$/i.test(String(row.reviewer_acceptance ?? '').trim()));
  const hashedRows = rowObjects.filter((row) => /\bsha256[:=][a-f0-9]{64}\b/i.test(row.evidence_file_reference ?? ''));
  const strongCommercialRows = rowObjects.filter((row) => /^(design_partner_signed|paid_pilot|purchase_order|letter_of_intent)$/i.test(String(row.commercial_commitment_status ?? '').trim()));
  const starterRows = rowObjects.filter((row) => /starter row|starter register|starter .*not buyer proof|not buyer proof|not market-confidence evidence/i.test([
    row.notes,
    row.follow_up_action,
    row.evidence_file_reference,
  ].join(' ')));
  const starterOnly = rowObjects.length > 0
    && confidenceRows.length === 0
    && acceptedRows.length === 0
    && starterRows.length === rowObjects.length;
  const validation = runNodeScript(path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs'), [filePath]);
  const gateArgs = [filePath, '--require-95', '--report-95'];
  if (evidenceRoot) gateArgs.push('--evidence-root', evidenceRoot);
  const gate95 = evidenceRoot ? runNodeScript(path.join(repoRoot, 'scripts/validate-pilot-evidence-register.mjs'), gateArgs) : null;

  return {
    path: filePath,
    rowObjects,
    rows: rowObjects.length,
    confidenceRows: confidenceRows.length,
    acceptedRows: acceptedRows.length,
    hashedRows: hashedRows.length,
    strongCommercialRows: strongCommercialRows.length,
    starterOnly,
    validation,
    gate95,
  };
}

function summarizeOutreachLog(filePath, rows) {
  const rowObjects = rowsToObjects(rows);
  const actionableRows = rowObjects.filter((row) => String(row.pilot_evidence_register_action ?? '').trim() !== 'none');
  const batchableRows = rowObjects.filter((row) => String(row.pilot_evidence_register_action ?? '').trim() === 'create_intake_packet');
  const validation = runNodeScript(path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'), [filePath, '--report']);
  const actionPlan = runNodeScript(path.join(repoRoot, 'scripts/validate-outreach-response-log.mjs'), [filePath, '--action-plan']);

  return {
    path: filePath,
    rows: rowObjects.length,
    actionableRows: actionableRows.length,
    batchableRows: batchableRows.length,
    validation,
    actionPlan,
  };
}

if (failures.length > 0) {
  console.error('Buyer evidence readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const root of roots) validateDirectoryInput('Root', root);
if (evidenceRoot) validateDirectoryInput('Evidence root', evidenceRoot);

if (failures.length > 0) {
  console.error('Buyer evidence readiness report failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const pilotRegisters = [];
const outreachLogs = [];
let csvFilesSeen = 0;
let ignoredCsvFiles = 0;

for (const root of roots) {
  const { files, ignored } = scanCsvFiles(root);
  ignoredCsvFiles += ignored;
  for (const filePath of files) {
    csvFilesSeen += 1;
    const text = readFileSync(filePath, 'utf8');
    const rows = parseCsv(text);
    if (rows.length === 0) continue;
    const columns = new Set(rows[0].map(normalizeColumn));
    if (hasColumns(columns, pilotRegisterColumns)) {
      pilotRegisters.push(summarizePilotRegister(filePath, rows));
    } else if (hasColumns(columns, outreachLogColumns)) {
      outreachLogs.push(summarizeOutreachLog(filePath, rows));
    }
  }
}

const totalActionableOutreachRows = outreachLogs.reduce((sum, log) => sum + log.actionableRows, 0);
const totalBatchableOutreachRows = outreachLogs.reduce((sum, log) => sum + log.batchableRows, 0);
const totalConfidenceRows = pilotRegisters.reduce((sum, register) => sum + register.confidenceRows, 0);
const starterOnlyRegisters = pilotRegisters.filter((register) => register.starterOnly).length;
const passing95Gates = pilotRegisters.filter((register) => register.gate95?.status === 0).length;
const allValid = [...pilotRegisters, ...outreachLogs].every((item) => item.validation.status === 0);
const hasProductionEvidenceInputs = pilotRegisters.length > 0 || outreachLogs.length > 0;

console.log('# CEIP Buyer Evidence Readiness Report');
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Roots: ${roots.map(displayPath).join(', ')}`);
console.log(`CSV files scanned: ${csvFilesSeen}`);
console.log(`Ignored template/fixture/generated paths: ${ignoredCsvFiles}`);
console.log(`Production pilot evidence registers: ${pilotRegisters.length}`);
console.log(`Starter-only pilot evidence registers: ${starterOnlyRegisters}`);
console.log(`Production outreach response logs: ${outreachLogs.length}`);
console.log(`Confidence-moving register rows: ${totalConfidenceRows}`);
console.log(`Actionable outreach rows: ${totalActionableOutreachRows}`);
console.log(`Batchable intake-packet outreach rows: ${totalBatchableOutreachRows}`);
console.log(`Evidence root: ${evidenceRoot ? displayPath(evidenceRoot) : 'not provided'}`);

if (passing95Gates > 0) {
  console.log(`Phase F 95% gate: ready (${passing95Gates} register(s) passed with retained evidence).`);
} else if (pilotRegisters.length === 0) {
  console.log('Phase F 95% gate: not ready (no production pilot evidence register found outside templates/fixtures).');
} else if (!evidenceRoot) {
  console.log('Phase F 95% gate: not run (provide --evidence-root with retained redacted artifacts).');
} else {
  console.log('Phase F 95% gate: not ready (no production register passed --require-95).');
}

printPhaseFMinimumEvidenceMap();
printHardGateDeficitLedger(pilotRegisters, {
  gate95Ran: Boolean(evidenceRoot && pilotRegisters.length > 0),
  passing95Gates,
});
printPackageScriptHandles();

if (pilotRegisters.length > 0) {
  console.log('\n## Pilot Evidence Registers');
  for (const register of pilotRegisters) {
    console.log(`- ${displayPath(register.path)}`);
    console.log(`  Rows: ${register.rows}; confidence-moving: ${register.confidenceRows}; accepted: ${register.acceptedRows}; hashed: ${register.hashedRows}; strong commercial: ${register.strongCommercialRows}; starter-only: ${register.starterOnly ? 'yes' : 'no'}.`);
    console.log(`  Base validation: ${register.validation.status === 0 ? 'pass' : 'fail'}.`);
    if (register.validation.status !== 0) {
      for (const line of firstOutputLines(`${register.validation.stderr}\n${register.validation.stdout}`)) console.log(`    ${line}`);
    }
    if (register.gate95) {
      console.log(`  95% retained-evidence gate: ${register.gate95.status === 0 ? 'pass' : 'fail'}.`);
      if (register.gate95.status !== 0) {
        for (const line of firstOutputLines(`${register.gate95.stderr}\n${register.gate95.stdout}`)) console.log(`    ${line}`);
      }
    }
  }
}

if (outreachLogs.length > 0) {
  console.log('\n## Outreach Response Logs');
  for (const log of outreachLogs) {
    console.log(`- ${displayPath(log.path)}`);
    console.log(`  Rows: ${log.rows}; actionable evidence rows: ${log.actionableRows}; batchable intake-packet rows: ${log.batchableRows}.`);
    console.log(`  Validation: ${log.validation.status === 0 ? 'pass' : 'fail'}.`);
    console.log(`  Action plan: ${log.actionPlan.status === 0 ? 'available' : 'blocked'}.`);
    if (log.batchableRows > 0 && log.validation.status === 0) {
      console.log(`  Batch packet command: ${pnpmRunCommand('create:outreach-intake-packets', `-- --log-file ${displayPath(log.path)} --output-dir /tmp/ceip-outreach-intake-packets`)}`);
    }
    if (log.actionableRows > 0 && log.actionPlan.status === 0) {
      console.log('  Action plan excerpt:');
      for (const line of indentedOutputLines(log.actionPlan.stdout)) console.log(line);
    }
    if (log.validation.status !== 0 || log.actionPlan.status !== 0) {
      for (const line of firstOutputLines(`${log.validation.stderr}\n${log.validation.stdout}\n${log.actionPlan.stderr}\n${log.actionPlan.stdout}`)) console.log(`    ${line}`);
    }
  }
}

console.log('\n## Next Actions');
if (!hasProductionEvidenceInputs) {
  console.log(`- Start the all-in-one Phase F evidence workspace with \`${phaseFEvidenceWorkspaceCommand()}\`.`);
  console.log(`- Run \`${phaseFEvidenceWorkspaceReportCommand()}\` before resuming collection; it validates the workspace, shows hard-gate blockers, and prints next operator commands.`);
  console.log(`- After \`update:pilot-evidence-register-row\` writes an updated candidate register inside the workspace, rerun \`${phaseFEvidenceWorkspaceUpdatedRegisterReportCommand()}\` so the selected register is validated and hard-gated.`);
  console.log(`- Append only real, anonymized buyer activity rows with \`${pnpmRunCommand('append:outreach-response-log-row', '-- --log-file /tmp/ceip-phase-f-evidence/outreach/outreach-response-log.csv ...')}\`.`);
  console.log('- Store retained redacted buyer artifacts outside templates/fixtures and rerun this report with `--root` and `--evidence-root`.');
} else if (outreachLogs.length > 0 && totalActionableOutreachRows === 0 && pilotRegisters.length === 0) {
  console.log('- Record real buyer replies in the existing anonymized outreach response log; header-only, drafted, sent-no-reply, not-now, not-fit, and unsubscribe rows do not create evidence actions.');
  console.log(`- When a row becomes interested, requested_info, data_offered, or meeting_booked with a valid pilot_evidence_register_action, rerun \`${pnpmRunCommand('plan:outreach-intake', '-- path/to/outreach-response-log.csv')}\`.`);
  console.log('- Keep Phase F blocked until an actionable row creates intake or retained-artifact work and a production pilot evidence register exists.');
} else if (totalActionableOutreachRows > 0 && pilotRegisters.length === 0) {
  if (totalBatchableOutreachRows > 0) {
    console.log('- Use the batch packet command above for `create_intake_packet` rows so the starter register folders are created consistently.');
  }
  console.log('- Use the outreach action plan excerpt above for any retained-artifact, register-update, or hard-gate rows that are not batch packet creation.');
} else if (pilotRegisters.length > 0 && totalConfidenceRows === 0) {
  console.log('- Replace starter rows with real buyer-supplied, accepted, confidence-moving evidence before running the 95% retained-artifact gate.');
  console.log('- Keep `confidence_delta=0` until buyer evidence includes reviewer acceptance, complete feedback, day_14_decision=proceed, and route-specific diagnostics.');
  console.log(`- If this is a Phase F workspace register, rerun \`${phaseFEvidenceWorkspaceUpdatedRegisterReportCommand()}\` after writing a candidate updated register so the selected CSV, not only the starter register, is validated and hard-gated.`);
  console.log('- After accepted buyer rows exist, attach retained redacted artifact hashes and rerun with `--evidence-root path/to/redacted-artifacts`.');
} else if (pilotRegisters.length > 0 && !evidenceRoot) {
  console.log('- Re-run with `--evidence-root path/to/redacted-artifacts` to test the retained-artifact 95% gate.');
} else if (passing95Gates === 0) {
  console.log('- Fix the failing retained-evidence gate output before raising market-confidence claims.');
} else {
  console.log('- A retained-evidence register passed the hard gate; review claim boundaries before changing confidence language.');
}

if (!allValid) process.exit(1);
if (failWhenEmpty && !hasProductionEvidenceInputs) process.exit(1);
