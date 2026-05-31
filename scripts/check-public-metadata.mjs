#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const baseUrlArgIndex = args.indexOf('--base-url');
const baseUrl = baseUrlArgIndex >= 0 ? args[baseUrlArgIndex + 1] : null;
const checkDist = args.includes('--dist');

if (baseUrl && checkDist) {
  console.error('Use either --base-url for remote metadata or --dist for built local metadata, not both.');
  process.exit(1);
}

const stalePatterns = [
  {
    name: 'old real-time platform positioning',
    pattern: /Real-time (?:Canadian energy intelligence|energy data analytics) platform/i,
  },
  {
    name: 'dashboard-count positioning',
    pattern: /25\+ (?:energy )?dashboards/i,
  },
  {
    name: 'unsupported TIER savings/arbitrage claim',
    pattern: /TIER (?:arbitrage|compliance)[^"'<>]*\$70\/t savings/i,
  },
  {
    name: 'unsupported Indigenous OCAP claim',
    pattern: /Indigenous OCAP (?:data sovereignty|compliance)/i,
  },
  {
    name: 'market-leadership AI claim',
    pattern: /The only AI-powered Canadian energy analytics platform/i,
  },
  {
    name: 'generic AI-powered analytics positioning',
    pattern: /AI-powered (?:Canadian energy analytics|recommendations)/i,
  },
  {
    name: 'old dashboard shortcut positioning',
    pattern: /View real-time energy dashboard/i,
  },
  {
    name: 'unsupported sovereignty shortcut positioning',
    pattern: /Indigenous energy sovereignty dashboard/i,
  },
];

const requiredProofPackPatterns = [
  /proof-pack/i,
  /buyer-ready artifacts/i,
];

const localTargets = [
  { label: 'index.html', path: 'index.html' },
  { label: 'public/manifest.json', path: 'public/manifest.json' },
  { label: 'public/schema-webapp.jsonld', path: 'public/schema-webapp.jsonld' },
];

const distTargets = [
  { label: 'dist/index.html', path: 'index.html' },
  { label: 'dist/manifest.json', path: 'manifest.json' },
  { label: 'dist/schema-webapp.jsonld', path: 'schema-webapp.jsonld' },
];

const remoteTargets = [
  { label: '/', path: '/' },
  { label: '/manifest.json', path: '/manifest.json' },
  { label: '/schema-webapp.jsonld', path: '/schema-webapp.jsonld' },
];

function checkContent(label, content) {
  const failures = [];
  for (const rule of stalePatterns) {
    if (rule.pattern.test(content)) {
      failures.push(`${label}: stale metadata phrase found (${rule.name})`);
    }
  }

  if (!requiredProofPackPatterns.some((pattern) => pattern.test(content))) {
    failures.push(`${label}: missing proof-pack or buyer-ready artifact positioning`);
  }

  return failures;
}

async function readRemote(target) {
  if (!baseUrl) return null;
  const url = new URL(target.path, baseUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url.toString()} returned ${response.status}`);
  }
  return response.text();
}

const failures = [];

if (baseUrl) {
  for (const target of remoteTargets) {
    const content = await readRemote(target);
    failures.push(...checkContent(`${baseUrl}${target.path}`, content));
  }
} else if (checkDist) {
  const distRoot = path.join(repoRoot, 'dist');
  if (!existsSync(distRoot)) {
    console.error('Public metadata check failed:\n\n- dist directory not found; run pnpm run build:prod first.');
    process.exit(1);
  }

  for (const target of distTargets) {
    const targetPath = path.join(distRoot, target.path);
    if (!existsSync(targetPath)) {
      failures.push(`${target.label}: built metadata file is missing`);
      continue;
    }

    const content = readFileSync(targetPath, 'utf8');
    failures.push(...checkContent(target.label, content));
  }
} else {
  for (const target of localTargets) {
    const content = readFileSync(path.join(repoRoot, target.path), 'utf8');
    failures.push(...checkContent(target.label, content));
  }
}

if (failures.length > 0) {
  console.error('Public metadata check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const checkedSurface = baseUrl ? 'remote deployment' : checkDist ? 'built dist' : 'local source';
console.log(`Public metadata check passed for ${checkedSurface} metadata.`);
