#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const failures = [];

const forbiddenTrackedPaths = [
  '.DS_Store',
  'Actions',
  'COMMIT_MESSAGE.txt',
  'FETCH_HEAD',
  'New',
  'Secrets',
  'dev.log',
  'docs.zip',
  'supabase.zip',
];

const forbiddenTrackedBasenames = [
  '.DS_Store',
];

const forbiddenTrackedPrefixes = [
  'playwright-report/',
  'test-results/',
];

const expectedPublicTopics = [
  'analytics',
  'canada',
  'energy',
  'esg',
  'forecasting',
  'react',
  'supabase',
  'typescript',
];

const expectedRepositoryUrl = 'https://github.com/sanjabh11/canada-energy-dashboard.git';
const expectedHomepage = 'https://canada-energy.netlify.app';

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function requireText(relativePath, needle, reason) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing; ${reason}.`);
    return;
  }

  const text = readFileSync(absolutePath, 'utf8');
  if (!text.includes(needle)) failures.push(`${relativePath} must include \`${needle}\`; ${reason}.`);
}

const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean);

for (const forbiddenPath of forbiddenTrackedPaths) {
  if (trackedFiles.includes(forbiddenPath)) {
    failures.push(`${forbiddenPath} must not be tracked; it is a local/generated artifact.`);
  }
}

for (const forbiddenBasename of forbiddenTrackedBasenames) {
  const matches = trackedFiles.filter((trackedFile) => path.basename(trackedFile) === forbiddenBasename);
  if (matches.length > 0) {
    failures.push(`${forbiddenBasename} must not be tracked anywhere; found ${matches.slice(0, 3).join(', ')}.`);
  }
}

for (const forbiddenPrefix of forbiddenTrackedPrefixes) {
  const matches = trackedFiles.filter((trackedFile) => trackedFile.startsWith(forbiddenPrefix));
  if (matches.length > 0) {
    failures.push(`${forbiddenPrefix} must not be tracked; found ${matches.slice(0, 3).join(', ')}.`);
  }
}

const packageJson = readJson('package.json');
if (packageJson.name !== 'canada-energy-dashboard') {
  failures.push('package.json name must be `canada-energy-dashboard`.');
}
if (packageJson.private === true) {
  failures.push('package.json must not use the scaffold/internal `private: true` signal for this public repo.');
}
if (packageJson.license !== 'MIT') {
  failures.push('package.json license must be `MIT`.');
}
if (!packageJson.description?.includes('Canadian energy intelligence dashboard')) {
  failures.push('package.json must include the public repository description.');
}
if (packageJson.homepage !== expectedHomepage) {
  failures.push(`package.json homepage must be \`${expectedHomepage}\`.`);
}
if (packageJson.repository?.url !== expectedRepositoryUrl) {
  failures.push(`package.json repository.url must be \`${expectedRepositoryUrl}\`.`);
}
if (packageJson.bugs?.url !== 'https://github.com/sanjabh11/canada-energy-dashboard/issues') {
  failures.push('package.json bugs.url must point to the public GitHub issue tracker.');
}

const packageKeywords = new Set((packageJson.keywords ?? []).map((keyword) => String(keyword).toLowerCase()));
const missingKeywords = expectedPublicTopics.filter((topic) => !packageKeywords.has(topic));
if (missingKeywords.length > 0) {
  failures.push(`package.json keywords missing public-discovery topics: ${missingKeywords.join(', ')}.`);
}

requireText('LICENSE', 'MIT License', 'GitHub should detect a visible open-source license');
requireText('README.md', 'Repository Snapshot', 'external reviewers need the CI, workflow, and proof-boundary summary near the top');
requireText('README.md', '20 workflow files', 'README should surface workflow depth rather than relying on stars or forks');

const gitignore = readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
for (const forbiddenPath of [...forbiddenTrackedPaths, 'test-results/']) {
  if (!gitignore.includes(forbiddenPath)) {
    failures.push(`.gitignore must include \`${forbiddenPath}\`.`);
  }
}

if (failures.length > 0) {
  console.error('Repository hygiene check failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Repository hygiene check passed.');
