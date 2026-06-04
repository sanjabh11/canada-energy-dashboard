#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);
const sourcePath = path.join(repoRoot, 'src/lib/publicReleaseStatusManifest.json');
const publicPath = path.join(repoRoot, 'public/status/release-health.json');
const validStatuses = new Set(['verified', 'watch', 'external_gate', 'needs_remediation']);
const forbiddenPatterns = [
  { name: 'direct email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { name: 'JWT-like token', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: 'production approval overclaim', pattern: /\bproduction approval achieved\b/i },
  { name: 'commercial-ready overclaim', pattern: /\bcommercial-ready\b/i },
  { name: 'buyer confidence overclaim', pattern: /\bbuyer-proven 95% market confidence achieved\b/i },
];

function normalizeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function validateManifest(manifest) {
  const failures = [];
  if (manifest.schemaVersion !== 'ceip.public-release-status.v1') {
    failures.push('schemaVersion must be ceip.public-release-status.v1.');
  }
  if (manifest.generatedBy !== 'scripts/generate-public-release-status.mjs') {
    failures.push('generatedBy must point to scripts/generate-public-release-status.mjs.');
  }
  if (manifest.publicPath !== '/status/release-health.json') {
    failures.push('publicPath must be /status/release-health.json.');
  }
  if (manifest.decision !== 'blocked') {
    failures.push('decision must remain blocked until buyer evidence and approval gates prove otherwise.');
  }
  if (!/does not create buyer evidence/i.test(manifest.decisionBoundary ?? '')) {
    failures.push('decisionBoundary must explicitly say the manifest does not create buyer evidence.');
  }
  if (!Array.isArray(manifest.refreshCommands) || manifest.refreshCommands.length < 4) {
    failures.push('refreshCommands must list the source, release, deploy, live, and buyer-evidence checks.');
  }
  if (!Array.isArray(manifest.items) || manifest.items.length < 7) {
    failures.push('items must include deployed artifact, current source live parity, source, provenance, branch-review, buyer-evidence, and Supabase advisor records.');
  }

  const ids = new Set();
  for (const item of manifest.items ?? []) {
    if (!item.id || ids.has(item.id)) failures.push(`item id is missing or duplicated: ${item.id ?? '(missing)'}.`);
    ids.add(item.id);
    if (!validStatuses.has(item.status)) failures.push(`${item.id}: unsupported status ${item.status}.`);
    for (const key of ['label', 'proofBucket', 'command', 'evidenceBoundary', 'nextAction']) {
      if (!String(item[key] ?? '').trim()) failures.push(`${item.id}: ${key} is required.`);
    }
    if (!/does not prove production|does not create|No buyer-proven|does not substitute|does not prove current/i.test(item.evidenceBoundary ?? '')) {
      failures.push(`${item.id}: evidenceBoundary must include an explicit proof limitation.`);
    }
  }

  const requiredIds = [
    'deployed_artifact_live_parity',
    'current_source_live_parity',
    'current_source_release_gate',
    'source_provenance',
    'unmerged_branch_review_queue',
    'buyer_evidence_gate',
    'supabase_advisor_access',
  ];
  for (const id of requiredIds) {
    if (!ids.has(id)) failures.push(`missing required item: ${id}.`);
  }

  const itemById = new Map((manifest.items ?? []).map((item) => [item.id, item]));
  const sourceProvenance = itemById.get('source_provenance') ?? {};
  if (!/staged-only|unstaged-only|mixed/i.test(`${sourceProvenance.evidenceBoundary ?? ''}\n${sourceProvenance.nextAction ?? ''}`)) {
    failures.push('source_provenance must describe staged-only, unstaged-only, or mixed source blockers.');
  }
  const branchQueue = itemById.get('unmerged_branch_review_queue') ?? {};
  if (!/review-first packet/i.test(`${branchQueue.evidenceBoundary ?? ''}\n${branchQueue.nextAction ?? ''}`)) {
    failures.push('unmerged_branch_review_queue must describe review-first branch packets.');
  }

  const serialized = JSON.stringify(manifest);
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(serialized)) failures.push(`forbidden ${rule.name} found in manifest.`);
  }

  return failures;
}

if (!existsSync(sourcePath)) {
  fail(`Source manifest not found: ${path.relative(repoRoot, sourcePath)}`);
}

const manifest = JSON.parse(readFileSync(sourcePath, 'utf8'));
const failures = validateManifest(manifest);
if (failures.length > 0) {
  console.error('Public release status manifest validation failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const output = normalizeJson(manifest);
if (args.includes('--check')) {
  if (!existsSync(publicPath)) fail(`Generated public manifest missing: ${path.relative(repoRoot, publicPath)}`);
  const current = readFileSync(publicPath, 'utf8');
  if (current !== output) {
    fail(`Generated public manifest is out of sync. Run: pnpm run generate:public-release-status`);
  }
  console.log('Public release status manifest check passed.');
  process.exit(0);
}

mkdirSync(path.dirname(publicPath), { recursive: true });
writeFileSync(publicPath, output);
console.log(`Public release status manifest written to ${path.relative(repoRoot, publicPath)}`);
