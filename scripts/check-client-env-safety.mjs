#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf('--root');
const repoRoot = rootArgIndex >= 0 ? path.resolve(args[rootArgIndex + 1] ?? '') : process.cwd();

const checkedSources = [];
const failures = [];

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

scanPackageJson();

if (failures.length > 0) {
  console.error('Client env safety check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Client env safety check passed for ${checkedSources.length} source surfaces.`);
