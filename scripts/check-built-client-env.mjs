#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const distArgIndex = args.indexOf('--dist');
const distRoot = path.resolve(distArgIndex >= 0 ? args[distArgIndex + 1] ?? 'dist' : 'dist');

const scanExtensions = /\.(?:html|js|json|css)$/i;
const forbiddenPatterns = [
  {
    label: 'localhost Supabase/API URL',
    pattern: /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/(?:rest|functions|auth|storage|realtime)\b/i,
  },
  {
    label: 'localhost VITE_SUPABASE_URL',
    pattern: /VITE_SUPABASE_URL["']?\s*:\s*["']https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i,
  },
  {
    label: 'Playwright test Supabase anon key',
    pattern: /VITE_SUPABASE_ANON_KEY["']?\s*:\s*["']test-key["']/i,
  },
  {
    label: 'Playwright test key literal',
    pattern: /["']test-key["']/i,
  },
];

function listFiles(dir) {
  const files = [];

  const visit = (absolutePath) => {
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      for (const child of readdirSync(absolutePath)) visit(path.join(absolutePath, child));
      return;
    }
    if (scanExtensions.test(absolutePath)) files.push(absolutePath);
  };

  visit(dir);
  return files;
}

if (!existsSync(distRoot)) {
  console.error(`Built client env check failed: dist directory not found at ${distRoot}`);
  process.exit(1);
}

const failures = [];
const files = listFiles(distRoot);

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const relativePath = path.relative(process.cwd(), file);

  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(text)) failures.push(`${relativePath}: found ${rule.label}`);
  }
}

if (failures.length > 0) {
  console.error('Built client env check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nRebuild with production Supabase env and ensure local Playwright preview builds do not overwrite dist/.');
  process.exit(1);
}

console.log(`Built client env check passed for ${files.length} built files under ${path.relative(process.cwd(), distRoot) || distRoot}.`);
