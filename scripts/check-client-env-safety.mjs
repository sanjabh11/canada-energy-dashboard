#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--root');
const repoRoot = rootArgIndex >= 0 ? path.resolve(args[rootArgIndex + 1] ?? '') : process.cwd();
const scanHistory = args.includes('--history');

const checkedSources = [];
const failures = [];
const secretLiteralPatterns = [
  { label: 'JWT-like literal', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { label: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { label: 'Stripe webhook secret', pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/g },
  { label: 'GitHub credential', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
];
const jwtLiteralScanExtensions = /\.(?:mjs|cjs|js|jsx|ts|tsx|yml|yaml|toml|sql|md|json|sh|html|css|xml|properties)$/i;

const dangerousClientKeyPatterns = [
  { label: 'service-role key', pattern: /SERVICE_?ROLE/i },
  { label: 'secret', pattern: /SECRET/i },
  { label: 'private credential', pattern: /PRIVATE/i },
  { label: 'password', pattern: /PASSWORD/i },
  { label: 'database URL', pattern: /(?:DATABASE|DB)_?URL/i },
  { label: 'connection string', pattern: /CONNECTION/i },
  { label: 'JWT secret', pattern: /JWT/i },
  { label: 'signing credential', pattern: /SIGNING/i },
  { label: 'webhook secret', pattern: /WEBHOOK/i },
  { label: 'admin credential', pattern: /ADMIN/i },
  { label: 'root/master credential', pattern: /(?:ROOT|MASTER)/i },
  { label: 'API key', pattern: /API_?KEY/i },
  { label: 'access/refresh token', pattern: /(?:ACCESS|REFRESH|SESSION)_?TOKEN/i },
];

const approvedPublicClientKeys = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_EDGE_BASE',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_ENABLE_EDGE_FETCH',
  'VITE_ENABLE_LIVE_STREAMING',
  'VITE_USE_STREAMING_DATASETS',
  'VITE_DEBUG_LOGS',
  'VITE_PUBLIC_APP_URL',
  'VITE_OPENWEATHERMAP_API_KEY',
  'VITE_PADDLE_CLIENT_TOKEN',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_WHOP_APP_ID',
  'VITE_WHOP_MODE',
  'VITE_WHOP_CLIENT_ID',
]);

function listFilesRecursively(relativeDir, predicate) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!existsSync(absoluteDir)) return [];

  const files = [];
  const visit = (absolutePath) => {
    const entryStats = statSync(absolutePath);
    if (entryStats.isDirectory()) {
      for (const child of readdirSync(absolutePath)) visit(path.join(absolutePath, child));
      return;
    }

    const relativePath = path.relative(repoRoot, absolutePath);
    if (predicate(relativePath)) files.push(relativePath);
  };

  visit(absoluteDir);
  return files;
}

function existingRootFiles(predicate) {
  if (!existsSync(repoRoot)) return [];
  return readdirSync(repoRoot).filter((fileName) => {
    const absolutePath = path.join(repoRoot, fileName);
    return existsSync(absolutePath) && statSync(absolutePath).isFile() && predicate(fileName);
  });
}

function addFinding(source, key, reason) {
  failures.push(`${source}: ${key} is client-exposed because it starts with VITE_, but its name looks like a ${reason}. Keep privileged Supabase/service credentials in backend-only env vars.`);
}

function inspectClientKey(source, key) {
  if (!key.startsWith('VITE_')) return;
  if (approvedPublicClientKeys.has(key)) return;

  const matchedRule = dangerousClientKeyPatterns.find((rule) => rule.pattern.test(key));
  if (matchedRule) addFinding(source, key, matchedRule.label);
}

function scanTextForViteKeys(source, text) {
  checkedSources.push(source);
  const matches = text.matchAll(/\b(VITE_[A-Z0-9_]+)\b/g);
  for (const match of matches) inspectClientKey(source, match[1]);
}

// Supabase anon-key JWTs are public-by-design (RLS is the guard, not key
// secrecy) — Vite deliberately inlines VITE_SUPABASE_ANON_KEY into the client
// bundle. Decode the payload and exempt only tokens whose role claim is the
// public anon key; service_role/undecodable/other claims still fail.
function isPublicAnonJwt(literal) {
  try {
    const payload = JSON.parse(Buffer.from(literal.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role === 'anon' && payload?.iss === 'supabase';
  } catch {
    return false;
  }
}

function scanTextForJwtLikeLiterals(source, text) {
  checkedSources.push(source);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of secretLiteralPatterns) {
      const matches = line.match(rule.pattern);
      if (!matches) continue;
      const flagged = rule.label === 'JWT-like literal'
        ? matches.filter((literal) => !isPublicAnonJwt(literal))
        : matches;
      if (flagged.length) failures.push(`${source}:${index + 1}: found ${flagged.length} ${rule.label}(s). Keep credentials in a secret manager, not committed source.`);
    }
  });
}

function scanEnvFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const text = readFileSync(absolutePath, 'utf8');
  checkedSources.push(relativePath);

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const key = line.slice(0, line.indexOf('=')).trim();
    inspectClientKey(`${relativePath}:${index + 1}`, key);
  }
}

function scanPackageJson() {
  const relativePath = 'package.json';
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return;
  const packageJson = JSON.parse(readFileSync(absolutePath, 'utf8'));
  checkedSources.push(relativePath);

  for (const [scriptName, scriptValue] of Object.entries(packageJson.scripts ?? {})) {
    scanTextForViteKeys(`${relativePath} script ${scriptName}`, String(scriptValue));
  }
}

const envFiles = existingRootFiles((fileName) => fileName === '.env' || fileName.startsWith('.env.'));
for (const envFile of envFiles) scanEnvFile(envFile);

for (const configFile of ['netlify.toml', 'vite.config.ts', 'vite.config.js']) {
  const absolutePath = path.join(repoRoot, configFile);
  if (existsSync(absolutePath)) scanTextForViteKeys(configFile, readFileSync(absolutePath, 'utf8'));
}

for (const workflowFile of listFilesRecursively('.github', (relativePath) => /\.(ya?ml)$/i.test(relativePath))) {
  scanTextForViteKeys(workflowFile, readFileSync(path.join(repoRoot, workflowFile), 'utf8'));
}

for (const sourceRoot of ['.github', 'scripts', 'src', 'supabase', 'netlify', 'dist']) {
  for (const sourceFile of listFilesRecursively(sourceRoot, (relativePath) => jwtLiteralScanExtensions.test(relativePath))) {
    scanTextForJwtLikeLiterals(sourceFile, readFileSync(path.join(repoRoot, sourceFile), 'utf8'));
  }
}

// Vite bundles every VITE_* import.meta.env read into client JS. Scanning only
// .env/config/CI surfaces misses secrets referenced in source files (audit F-2:
// a leaked VITE_ API key or webhook secret inside src/ went undetected). Scan
// all code under src/ and supabase/ for dangerous VITE_ key names as well.
const viteKeyScanExtensions = /\.(?:mjs|js|jsx|ts|tsx)$/i;
for (const sourceRoot of ['src', 'supabase', 'netlify', 'scripts', 'dist']) {
  for (const sourceFile of listFilesRecursively(sourceRoot, (relativePath) => viteKeyScanExtensions.test(relativePath))) {
    scanTextForViteKeys(sourceFile, readFileSync(path.join(repoRoot, sourceFile), 'utf8'));
  }
}

function scanGitHistory() {
  let stage = 'enumerate reachable objects';
  try {
    const objectRows = execFileSync('git', ['rev-list', '--objects', '--all'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const objects = new Map();
    for (const row of objectRows.split(/\r?\n/)) {
      const match = row.match(/^([a-f0-9]{40,64})\s+(.+)$/i);
      if (!match) continue;
      const [, sha, relativePath] = match;
      if (!jwtLiteralScanExtensions.test(relativePath) && !/^\.env(?:\.|$)/.test(path.basename(relativePath))) continue;
      if (!objects.has(sha)) objects.set(sha, relativePath);
    }

    const objectEntries = [...objects.entries()];
    let scanned = 0;
    const maxBatchBytes = 24 * 1024 * 1024;
    for (let index = 0; index < objectEntries.length;) {
      const batch = [];
      let estimatedBytes = 0;
      while (index < objectEntries.length && batch.length < 128) {
        stage = 'measure historical text blobs';
        const group = objectEntries.slice(index, index + 128).map(([sha]) => sha).join('\n') + '\n';
        const sizeRows = execFileSync('git', ['cat-file', '--batch-check'], {
          cwd: repoRoot,
          input: group,
          encoding: 'utf8',
          maxBuffer: 4 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim().split(/\r?\n/);
        const sized = sizeRows.map((sizeRow, offset) => {
          const sizeMatch = sizeRow.match(/^([a-f0-9]{40,64})\s+blob\s+(\d+)$/i);
          return sizeMatch ? { sha: sizeMatch[1], size: Number(sizeMatch[2]), path: objectEntries[index + offset]?.[1] } : null;
        });
        const next = sized.find((entry) => entry && (batch.length >= 128 || estimatedBytes + entry.size > maxBatchBytes));
        const takeCount = next ? sized.indexOf(next) : sized.length;
        for (const entry of sized.slice(0, Math.max(1, takeCount))) {
          if (!entry || !entry.path) continue;
          if (entry.size > maxBatchBytes) {
            failures.push(`git history:${entry.path}: text-like blob exceeds the ${maxBatchBytes} byte history-scan batch limit and was not scanned.`);
            index += 1;
            continue;
          }
          batch.push(entry);
          estimatedBytes += entry.size;
          index += 1;
        }
        break;
      }
      if (batch.length === 0) continue;
      const input = `${batch.map(({ sha }) => sha).join('\n')}\n`;
      stage = 'read historical text blobs';
      const output = execFileSync('git', ['cat-file', '--batch'], {
        cwd: repoRoot,
        input,
        maxBuffer: maxBatchBytes + 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      stage = 'parse historical text blobs';
      let offset = 0;
      for (const entry of batch) {
        const lineEnd = output.indexOf(0x0a, offset);
        if (lineEnd < 0) break;
        const header = output.subarray(offset, lineEnd).toString('utf8');
        const blobSize = Number(header.split(' ').at(-1));
        const bodyStart = lineEnd + 1;
        const bodyEnd = bodyStart + blobSize;
        if (!Number.isFinite(blobSize) || bodyEnd > output.length) break;
        const body = output.subarray(bodyStart, bodyEnd).toString('utf8');
        scanTextForJwtLikeLiterals(`git history:${entry.path}`, body);
        scanned += 1;
        offset = bodyEnd + 1;
      }
    }
    checkedSources.push(`git history (${scanned} text blobs)`);
  } catch (error) {
    const errorCode = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    failures.push(`git history: scan failed while attempting to ${stage} (${errorCode}).`);
  }
}

scanPackageJson();
if (scanHistory) scanGitHistory();

if (failures.length > 0) {
  console.error('Client env safety check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Client env safety check passed for ${checkedSources.length} source surfaces${scanHistory ? ' including reachable Git history' : ''}.`);
