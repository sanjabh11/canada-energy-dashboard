#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const baseUrl = readArg('--base-url', 'https://canada-energy.netlify.app');
const distDir = path.resolve(repoRoot, readArg('--dist-dir', 'dist'));

const targets = [
  { path: '/', localPath: 'index.html' },
  { path: '/manifest.json', localPath: 'manifest.json' },
  { path: '/schema-webapp.jsonld', localPath: 'schema-webapp.jsonld' },
];

function normalizeText(value) {
  return value.replace(/\r\n/g, '\n').trimEnd();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fetchRemote(targetPath) {
  const url = new URL(targetPath, baseUrl);
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  const text = await response.text();
  return {
    url: url.toString(),
    ok: response.ok,
    status: response.status,
    text,
  };
}

function firstDifference(left, right) {
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return left.length === right.length ? -1 : max;
}

function snippet(value, index) {
  if (index < 0) return '';
  const start = Math.max(0, index - 60);
  const end = Math.min(value.length, index + 120);
  return value.slice(start, end).replace(/\s+/g, ' ').trim();
}

if (!existsSync(distDir)) {
  console.error('Live static parity check failed:\n');
  console.error(`- dist directory not found at ${distDir}; run pnpm run build:prod first.`);
  process.exit(1);
}

const failures = [];
const rows = [];

for (const target of targets) {
  const localPath = path.join(distDir, target.localPath);
  if (!existsSync(localPath)) {
    failures.push(`${target.localPath}: built file is missing from ${distDir}`);
    continue;
  }

  const localText = normalizeText(readFileSync(localPath, 'utf8'));
  let remote;
  try {
    remote = await fetchRemote(target.path);
  } catch (error) {
    failures.push(`${target.path}: remote fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  if (!remote.ok) {
    failures.push(`${remote.url}: remote returned HTTP ${remote.status}`);
    continue;
  }

  const remoteText = normalizeText(remote.text);
  const localHash = sha256(localText);
  const remoteHash = sha256(remoteText);
  const match = localHash === remoteHash;
  rows.push({
    target: target.path,
    localPath: target.localPath,
    localHash,
    remoteHash,
    localBytes: Buffer.byteLength(localText),
    remoteBytes: Buffer.byteLength(remoteText),
    match,
  });

  if (!match) {
    const diffIndex = firstDifference(localText, remoteText);
    failures.push(
      `${target.path}: remote static content does not match dist/${target.localPath} (local ${localHash.slice(
        0,
        12,
      )}, remote ${remoteHash.slice(0, 12)}, first diff ${diffIndex}; remote snippet: "${snippet(remoteText, diffIndex)}")`,
    );
  }
}

if (failures.length > 0) {
  console.error('Live static parity check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Live static parity check passed for ${baseUrl}`);
for (const row of rows) {
  console.log(
    `- ${row.target} matches dist/${row.localPath} (${row.localHash.slice(0, 12)}, ${row.localBytes} bytes)`,
  );
}
