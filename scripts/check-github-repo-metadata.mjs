#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const failures = [];

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const repo = readArg('--repo', process.env.GITHUB_REPOSITORY || 'sanjabh11/canada-energy-dashboard');
const metadataFile = readArg('--metadata-file');

const expectedDescription =
  'Canadian energy intelligence dashboard for utility demand forecasting, regulatory proof packs, ESG/NPRI data workflows, and buyer-ready energy analytics.';
const expectedHomepage = 'https://canada-energy.netlify.app';
const expectedTopics = [
  'analytics',
  'canada',
  'climate-tech',
  'demand-forecasting',
  'energy',
  'energy-analytics',
  'esg',
  'forecasting',
  'npri',
  'react',
  'regulatory',
  'supabase',
  'typescript',
  'utilities',
];

function normalizeTopic(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function fetchGithubMetadata(repoName) {
  const response = await fetch(`https://api.github.com/repos/${repoName}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ceip-repo-metadata-guard',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${repoName}`);
  }

  return response.json();
}

function readFixtureMetadata(filePath) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`metadata fixture not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(resolvedPath, 'utf8'));
}

function licenseId(metadata) {
  if (typeof metadata.license === 'string') return metadata.license;
  return metadata.license?.spdx_id || metadata.license?.key || '';
}

function validateMetadata(metadata) {
  if (metadata.description !== expectedDescription) {
    failures.push('GitHub repository description must match the approved proof-pack description.');
  }

  if (metadata.homepage !== expectedHomepage) {
    failures.push(`GitHub repository homepage must be ${expectedHomepage}.`);
  }

  if (licenseId(metadata).toLowerCase() !== 'mit') {
    failures.push('GitHub repository license must resolve to MIT.');
  }

  if (metadata.private !== false || metadata.visibility !== 'public') {
    failures.push('GitHub repository must remain public.');
  }

  const topics = new Set((metadata.topics || []).map(normalizeTopic));
  const missingTopics = expectedTopics.filter((topic) => !topics.has(topic));
  if (missingTopics.length > 0) {
    failures.push(`GitHub repository topics missing: ${missingTopics.join(', ')}.`);
  }
}

let metadata;
try {
  metadata = metadataFile ? readFixtureMetadata(metadataFile) : await fetchGithubMetadata(repo);
} catch (error) {
  console.error('GitHub repository metadata check failed:\n');
  console.error(`- ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

validateMetadata(metadata);

if (failures.length > 0) {
  console.error('GitHub repository metadata check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`GitHub repository metadata check passed for ${repo}.`);
