#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { proofPackRouteConfigs } from './lib/proof-pack-routes.mjs';
import {
  phaseFBillingSecurityRoutes,
  phaseFDefaultMinimumRoutes,
  phaseFGlobalGateChecks,
  phaseFTierRoutes,
} from './lib/phase-f-minimum-evidence.mjs';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const values = new Map();
const failures = [];
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

function printUsage() {
  console.log(`Usage:
  pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence

Options:
  --output-dir <dir>                 Required. Destination for the evidence workspace.
  --record-date <YYYY-MM-DD>         Optional. Defaults to today's UTC date.
  --tier-route <route>               Optional. /roi-calculator or /credit-banking. Defaults to /roi-calculator.
  --billing-security-route <route>   Optional. /utility-security or /shadow-billing. Defaults to /utility-security.
  --force                            Overwrite generated files in a non-empty output directory.
`);
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function routeWithProofPack(route) {
  const config = proofPackRouteConfigs.get(route);
  return config ? `${route} (${config.proofPackId})` : route;
}

function routeSlug(route) {
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

function markdownList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function runScript(scriptName, scriptArgs) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName), ...scriptArgs], {
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

function requireCommandSuccess(label, result) {
  if (result.status === 0) return;
  console.error(`Phase F evidence workspace generation failed while ${label}.`);
  if (result.stderr.trim()) console.error(result.stderr.trim());
  if (result.stdout.trim()) console.error(result.stdout.trim());
  process.exit(result.status ?? 1);
}

function requireCommandFailure(label, result, expectedText) {
  const output = `${result.stderr}\n${result.stdout}`;
  if (result.status !== 0 && output.includes(expectedText)) return;
  console.error(`Phase F evidence workspace generation failed while ${label}.`);
  console.error(`Expected a nonzero result containing: ${expectedText}`);
  if (result.stderr.trim()) console.error(result.stderr.trim());
  if (result.stdout.trim()) console.error(result.stdout.trim());
  process.exit(1);
}

if (!values.has('output-dir')) failures.push('Missing required option: --output-dir');

const recordDate = values.get('record-date') ?? new Date().toISOString().slice(0, 10);
if (!isValidIsoDate(recordDate)) failures.push('--record-date must be a valid YYYY-MM-DD date.');

const tierRoute = values.get('tier-route') ?? phaseFDefaultMinimumRoutes[1];
const billingSecurityRoute = values.get('billing-security-route') ?? phaseFDefaultMinimumRoutes[2];
if (!phaseFTierRoutes.has(tierRoute)) {
  failures.push(`--tier-route must be one of ${Array.from(phaseFTierRoutes).join(', ')}.`);
}
if (!phaseFBillingSecurityRoutes.has(billingSecurityRoute)) {
  failures.push(`--billing-security-route must be one of ${Array.from(phaseFBillingSecurityRoutes).join(', ')}.`);
}

const selectedRoutes = ['/utility-demand-forecast', tierRoute, billingSecurityRoute];
for (const route of selectedRoutes) {
  if (!proofPackRouteConfigs.has(route)) failures.push(`Unsupported route in Phase F workspace: ${route}`);
}

if (failures.length > 0) {
  console.error('Phase F evidence workspace generation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  printUsage();
  process.exit(1);
}

const outputDir = path.resolve(repoRoot, values.get('output-dir'));
if (existsSync(outputDir)) {
  if (!statSync(outputDir).isDirectory()) {
    console.error(`Output path must be a directory: ${displayPath(outputDir)}`);
    process.exit(1);
  }
  if (readdirSync(outputDir).length > 0 && !force) {
    console.error(`Output directory is not empty: ${displayPath(outputDir)}`);
    console.error('Use --force to overwrite generated workspace files.');
    process.exit(1);
  }
}

mkdirSync(outputDir, { recursive: true });

const outreachDir = path.join(outputDir, 'outreach');
const bundleDir = path.join(outputDir, 'phase-f-minimum-intake');
const outreachLogPath = path.join(outreachDir, 'outreach-response-log.csv');
const bundleRegisterPath = path.join(bundleDir, 'phase-f-minimum-register-starter.csv');
const manifestPath = path.join(outputDir, 'phase-f-evidence-workspace-manifest.json');
const readmePath = path.join(outputDir, 'README.md');

requireCommandSuccess('creating the outreach response log', runScript('create-outreach-response-log.mjs', [
  '--output-dir',
  outreachDir,
  ...(force ? ['--force'] : []),
]));

requireCommandSuccess('creating the Phase F minimum intake bundle', runScript('create-phase-f-minimum-intake-bundle.mjs', [
  '--output-dir',
  bundleDir,
  '--record-date',
  recordDate,
  '--tier-route',
  tierRoute,
  '--billing-security-route',
  billingSecurityRoute,
  ...(force ? ['--force'] : []),
]));

requireCommandSuccess('validating the outreach response log', runScript('validate-outreach-response-log.mjs', [outreachLogPath]));
requireCommandSuccess('validating the starter register', runScript('validate-pilot-evidence-register.mjs', [bundleRegisterPath]));
requireCommandSuccess('reporting buyer-evidence readiness', runScript('report-buyer-evidence-readiness.mjs', [
  '--root',
  outputDir,
  '--evidence-root',
  bundleDir,
]));
requireCommandFailure('checking the hard 95% gate remains blocked', runScript('validate-pilot-evidence-register.mjs', [
  bundleRegisterPath,
  '--require-95',
  '--evidence-root',
  bundleDir,
]), '95% confidence gate requires total accepted buyer-supplied confidence_delta of at least 0.9');

const routeSummaries = selectedRoutes.map((route) => {
  const config = proofPackRouteConfigs.get(route);
  const slug = routeSlug(route);
  return {
    route,
    slug,
    proof_pack_id: config?.proofPackId ?? null,
    packet_dir: displayPath(path.join(bundleDir, slug)),
    artifact_root: displayPath(path.join(bundleDir, slug, 'redacted-artifacts')),
  };
});

writeFileSync(manifestPath, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  confidence_movement: 'none',
  buyer_proof_created: false,
  record_date: recordDate,
  selected_routes: routeSummaries,
  outreach_log: displayPath(outreachLogPath),
  starter_register: displayPath(bundleRegisterPath),
  evidence_root: displayPath(bundleDir),
  hard_gate_expected_state: 'fail until real retained buyer artifacts and accepted rows exist',
}, null, 2)}\n`, 'utf8');

const readme = `# CEIP Phase F Evidence Workspace

Record date: \`${recordDate}\`

Confidence movement: none

Buyer proof created: no

This workspace is collection scaffolding only. It creates no buyer proof, moves no confidence, and does not satisfy the 95% market-confidence gate.

## Files

${markdownList([
  `\`${displayPath(outreachLogPath)}\` is the anonymized outreach response log.`,
  `\`${displayPath(bundleRegisterPath)}\` is the combined three-lane starter register with \`confidence_delta=0\`.`,
  `\`${displayPath(bundleDir)}\` is the retained-artifact evidence root for the top-level Phase F register.`,
  `\`${displayPath(manifestPath)}\` records generated paths and the selected lane mix.`,
])}

## Selected Minimum Lanes

${markdownList(routeSummaries.map(({ route }) => routeWithProofPack(route)))}

## Global 95% Gate Checks

${markdownList(phaseFGlobalGateChecks)}

## First Commands

\`\`\`bash
pnpm run validate:outreach-response-log -- ${displayPath(outreachLogPath)}
pnpm run plan:outreach-intake -- ${displayPath(outreachLogPath)}
pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)}
pnpm run report:buyer-evidence-readiness -- --root ${displayPath(outputDir)} --evidence-root ${displayPath(bundleDir)}
pnpm run report:pilot-evidence-95 -- ${displayPath(bundleRegisterPath)} --evidence-root ${displayPath(bundleDir)}
pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)} --require-95 --evidence-root ${displayPath(bundleDir)}
\`\`\`

The last two commands are expected to fail until real buyer-supplied retained artifacts, independent reviewer acceptance, complete feedback, day-14 proceed decisions, and at least one strong commercial commitment are attached.

## Updating A Route Row

After a retained artifact helper prints \`artifact.md#sha256=...\`, update the top-level register through the updater rather than editing CSV by hand:

\`\`\`bash
pnpm run update:pilot-evidence-register-row -- \\
  --register-file ${displayPath(bundleRegisterPath)} \\
  --evidence-root ${displayPath(bundleDir)} \\
  --artifact-root ${displayPath(path.join(bundleDir, routeSummaries[0].slug, 'redacted-artifacts'))} \\
  --evidence-file-reference retained-artifact.md#sha256=<hash-from-helper> \\
  --confidence-delta "<explicit 0..0.4, or 0 for staging>" \\
  --output-file path/to/phase-f-minimum-register-updated.csv
\`\`\`
`;

writeFileSync(readmePath, readme, 'utf8');

console.log('Phase F evidence workspace created.');
console.log(`Output directory: ${displayPath(outputDir)}`);
console.log(`Outreach log: ${displayPath(outreachLogPath)}`);
console.log(`Starter register: ${displayPath(bundleRegisterPath)}`);
console.log(`Evidence root: ${displayPath(bundleDir)}`);
console.log('Confidence movement: none');
console.log('Buyer proof created: no');
console.log('');
console.log('Next checks:');
console.log(`pnpm run report:buyer-evidence-readiness -- --root ${displayPath(outputDir)} --evidence-root ${displayPath(bundleDir)}`);
console.log(`pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)} --require-95 --evidence-root ${displayPath(bundleDir)}`);
