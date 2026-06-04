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
const githubHtmlFile = readArg('--github-html-file');
const licenseFile = readArg('--license-file');
const forceHtmlFallback = args.includes('--force-html-fallback');

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
    const body = await safeResponseText(response);
    if (shouldUsePublicHtmlFallback(response, body)) {
      return readOrFetchPublicGithubMetadata(repoName);
    }

    throw new Error(formatGithubApiError(response, repoName, body));
  }

  return {
    ...(await response.json()),
    __source: 'rest-api',
  };
}

async function readOrFetchPublicGithubMetadata(repoName) {
  const html = githubHtmlFile
    ? readRequiredTextFile(githubHtmlFile, 'GitHub HTML fixture')
    : await fetchPublicGithubHtml(repoName);
  const licenseText = licenseFile
    ? readRequiredTextFile(licenseFile, 'GitHub license fixture')
    : await fetchPublicGithubLicense(repoName);

  return parsePublicGithubMetadata(repoName, html, licenseText);
}

async function fetchPublicGithubHtml(repoName) {
  const response = await fetch(`https://github.com/${repoName}`, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'ceip-repo-metadata-guard',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub public page fallback returned ${response.status} for ${repoName}`);
  }

  return response.text();
}

async function fetchPublicGithubLicense(repoName) {
  const response = await fetch(`https://raw.githubusercontent.com/${repoName}/main/LICENSE`, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'ceip-repo-metadata-guard',
    },
  });

  if (!response.ok) {
    return '';
  }

  return response.text();
}

function shouldUsePublicHtmlFallback(response, body) {
  const rateRemaining = response.headers.get('x-ratelimit-remaining');
  return response.status === 403 && (rateRemaining === '0' || /rate limit/i.test(body));
}

function formatGithubApiError(response, repoName, body) {
  const rateRemaining = response.headers.get('x-ratelimit-remaining');
  const rateReset = response.headers.get('x-ratelimit-reset');
  const details = body ? `: ${trimForMessage(body)}` : '';
  const rate = rateRemaining === null ? '' : `; rate remaining=${rateRemaining}${rateReset ? ` reset=${rateReset}` : ''}`;
  return `GitHub API returned ${response.status} for ${repoName}${rate}${details}`;
}

async function safeResponseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function readFixtureMetadata(filePath) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`metadata fixture not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(resolvedPath, 'utf8'));
}

function readRequiredTextFile(filePath, label) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  return readFileSync(resolvedPath, 'utf8');
}

function parsePublicGithubMetadata(repoName, html, licenseText) {
  const description = extractDescription(repoName, html);
  const topics = [...html.matchAll(/href="\/topics\/([^"]+)"/g)].map((match) => decodeHtml(match[1]));
  const hasHomepage = html.includes(`href="${expectedHomepage}"`) || html.includes(`>${expectedHomepage.replace(/^https?:\/\//, '')}<`);
  const hasMitLicense = /MIT license/i.test(html) || /^MIT License\b/im.test(licenseText);
  const hasRepoUrl = html.includes(`https://github.com/${repoName}`) || html.includes(`/${repoName}`);

  return {
    description,
    homepage: hasHomepage ? expectedHomepage : '',
    license: hasMitLicense ? { spdx_id: 'MIT' } : null,
    private: hasRepoUrl ? false : null,
    visibility: hasRepoUrl ? 'public' : '',
    topics,
    __source: 'public-html-fallback',
  };
}

function extractDescription(repoName, html) {
  const metaDescription = html.match(/<meta name="description" content="([^"]*)"/i)?.[1];
  const decoded = decodeHtml(metaDescription ?? '');
  return decoded.replace(new RegExp(`\\s+-\\s+${escapeRegExp(repoName)}$`), '').trim();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function trimForMessage(value) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 220);
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
  metadata = metadataFile
    ? readFixtureMetadata(metadataFile)
    : forceHtmlFallback
      ? await readOrFetchPublicGithubMetadata(repo)
      : await fetchGithubMetadata(repo);
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

console.log(`GitHub repository metadata check passed for ${repo}${metadata.__source ? ` via ${metadata.__source}` : ''}.`);
