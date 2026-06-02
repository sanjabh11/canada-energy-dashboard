#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { proofPackRouteConfigs } from './lib/proof-pack-routes.mjs';
import {
  phaseFBillingSecurityRoutes,
  phaseFDefaultMinimumRoutes,
  phaseFGlobalGateChecks,
  phaseFMinimumLaneGroups,
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
  pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake

Options:
  --output-dir <dir>                 Required. Destination for the bundle.
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

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

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
      cells.push(value);
      value = '';
      continue;
    }
    value += char;
  }

  cells.push(value);
  return cells;
}

function routeSlug(route) {
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

function displayPath(filePath) {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) return relativePath;
  return filePath.split(path.sep).join('/');
}

function markdownList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function routeWithProofPack(route) {
  const config = proofPackRouteConfigs.get(route);
  return config ? `${route} (${config.proofPackId})` : route;
}

function runPacketGenerator(route, outputDir, recordDate) {
  const commandArgs = [
    path.join(repoRoot, 'scripts/create-pilot-evidence-intake-packet.mjs'),
    '--route',
    route,
    '--output-dir',
    outputDir,
    '--record-date',
    recordDate,
    ...(force ? ['--force'] : []),
  ];
  return spawnSync(process.execPath, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function readStarterRow(packetDir, slug) {
  const registerPath = path.join(packetDir, 'pilot-evidence-register-starter.csv');
  const lines = readFileSync(registerPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0] ?? '');
  const cells = parseCsvLine(lines[1] ?? '');
  const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  row.evidence_file_reference = `${slug}/redacted-artifacts/README.md (replace with retained extract sha256 after artifact preparation)`;
  row.follow_up_action = 'Replace this starter row after the buyer supplies redacted evidence, reviewer acceptance, and a commercial signal where applicable.';
  row.notes = 'Phase F bundle starter row only; not buyer proof and not market-confidence evidence.';
  return { headers, row };
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
  if (!proofPackRouteConfigs.has(route)) failures.push(`Unsupported route in Phase F bundle: ${route}`);
}

if (failures.length > 0) {
  console.error('Phase F minimum intake bundle generation failed:\n');
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
    console.error('Use --force to overwrite generated bundle files.');
    process.exit(1);
  }
}

mkdirSync(outputDir, { recursive: true });

const bundleRows = [];
let bundleHeaders = null;
for (const route of selectedRoutes) {
  const slug = routeSlug(route);
  const packetDir = path.join(outputDir, slug);
  const result = runPacketGenerator(route, packetDir, recordDate);
  if (result.status !== 0) {
    console.error(`Failed to create route packet for ${route}.`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
  const { headers, row } = readStarterRow(packetDir, slug);
  if (!bundleHeaders) bundleHeaders = headers;
  bundleRows.push({ route, slug, row });
}

const bundleRegisterPath = path.join(outputDir, 'phase-f-minimum-register-starter.csv');
const readmePath = path.join(outputDir, 'README.md');
const csvText = [
  bundleHeaders.join(','),
  ...bundleRows.map(({ row }) => bundleHeaders.map((header) => csvEscape(row[header])).join(',')),
  '',
].join('\n');

const readme = `# CEIP Phase F Minimum Intake Bundle

Record date: \`${recordDate}\`

This bundle is intake scaffolding only. It does not create buyer proof, move confidence, satisfy the 95% market-confidence gate, or approve any public claim change.

## Minimum Evidence Lane Map

${phaseFMinimumLaneGroups.map((group) => `- ${group.label}: ${group.routes.map(routeWithProofPack).join(' or ')}. ${group.reason}`).join('\n')}

## Selected Starter Packets

${markdownList(bundleRows.map(({ route, slug }) => `\`${slug}/\` for ${routeWithProofPack(route)}`))}

## Global 95% Gate Checks

${markdownList(phaseFGlobalGateChecks)}

## Files

${markdownList([
  '`phase-f-minimum-register-starter.csv` combines the three starter rows with `confidence_delta=0`.',
  'Each route folder contains its own `pilot-evidence-register-starter.csv`, README, and `redacted-artifacts/` folder.',
  'Use the top-level bundle directory as `--evidence-root`; when a retained extract is prepared inside a route folder, pass that route folder as `--artifact-root` to the register updater so it writes the top-level relative SHA-256 reference.',
])}

## First Commands

\`\`\`bash
pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)}
pnpm run report:buyer-evidence-readiness -- --root ${displayPath(outputDir)}
pnpm run report:pilot-evidence-95 -- ${displayPath(bundleRegisterPath)} --evidence-root ${displayPath(outputDir)}
pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)} --require-95 --evidence-root ${displayPath(outputDir)}
\`\`\`

The two 95% commands are expected to fail for this starter bundle until real buyer-supplied redacted artifacts, independent reviewer acceptance, and at least one strong commercial commitment are attached.

## Retained Artifact References

When a route-specific helper prints \`artifact.md#sha256=...\`, do not hand-prefix it into the top-level register. Use \`update:pilot-evidence-register-row\` with the top-level bundle as \`--evidence-root\` and the route-local artifact folder as \`--artifact-root\`:

\`\`\`bash
pnpm run update:pilot-evidence-register-row -- \\
  --register-file ${displayPath(bundleRegisterPath)} \\
  --evidence-root ${displayPath(outputDir)} \\
  --artifact-root ${displayPath(path.join(outputDir, 'utility-demand-forecast/redacted-artifacts'))} \\
  --evidence-file-reference utility-demand-forecast-retained.md#sha256=<hash-from-helper> \\
  --confidence-delta "<explicit 0..0.4, or 0 for staging>" \\
  --output-file path/to/phase-f-minimum-register-updated.csv
\`\`\`
`;

writeFileSync(bundleRegisterPath, csvText, 'utf8');
writeFileSync(readmePath, readme, 'utf8');

console.log('Phase F minimum intake bundle created.');
console.log(`Output directory: ${outputDir}`);
console.log(`Starter register: ${bundleRegisterPath}`);
console.log('Selected routes:');
for (const route of selectedRoutes) console.log(`- ${routeWithProofPack(route)}`);
console.log('');
console.log('Next checks:');
console.log(`pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)}`);
console.log(`pnpm run report:buyer-evidence-readiness -- --root ${displayPath(outputDir)}`);
console.log(`pnpm run validate:pilot-evidence -- ${displayPath(bundleRegisterPath)} --require-95 --evidence-root ${displayPath(outputDir)}`);
