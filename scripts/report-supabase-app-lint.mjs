#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const failOnApp = args.includes('--fail-on-app');

const extensionFunctionPatterns = [
  /^public\.st_/i,
  /^public\.postgis_/i,
  /^public\.populate_geometry_columns$/i,
  /^public\.addgeometrycolumn$/i,
  /^public\.dropgeometrycolumn$/i,
  /^public\.dropgeometrytable$/i,
  /^public\.updategeometrysrid$/i,
  /^public\.lockrow$/i,
  /^public\.addauth$/i,
  /^public\.enablelongtransactions$/i,
  /^public\.longtransactionsenabled$/i,
];

function isExtensionOwned(functionName = '') {
  return extensionFunctionPatterns.some((pattern) => pattern.test(functionName));
}

function extractJsonArray(rawText) {
  const start = rawText.indexOf('[');
  const end = rawText.lastIndexOf(']');
  if (start < 0 || end < start) {
    throw new Error('Supabase lint output did not include a JSON array.');
  }
  return JSON.parse(rawText.slice(start, end + 1));
}

function loadLintRows() {
  if (inputIndex >= 0) {
    const inputPath = args[inputIndex + 1];
    if (!inputPath) throw new Error('--input requires a file path.');
    return extractJsonArray(readFileSync(inputPath, 'utf8'));
  }

  const result = spawnSync('supabase', ['db', 'lint', '--linked', '--fail-on', 'none', '-o', 'json'], {
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`supabase db lint failed before classification.${detail ? `\n${detail}` : ''}`);
  }

  return extractJsonArray(result.stdout);
}

function issueCount(row) {
  return Array.isArray(row.issues) ? row.issues.length : 0;
}

try {
  const rows = loadLintRows();
  const extensionRows = rows.filter((row) => isExtensionOwned(String(row.function ?? '')));
  const appRows = rows.filter((row) => !isExtensionOwned(String(row.function ?? '')));
  const extensionIssues = extensionRows.reduce((sum, row) => sum + issueCount(row), 0);
  const appIssues = appRows.reduce((sum, row) => sum + issueCount(row), 0);

  console.log('Supabase app lint classification');
  console.log(`- Total lint rows: ${rows.length}`);
  console.log(`- Extension-owned rows: ${extensionRows.length} (${extensionIssues} issues)`);
  console.log(`- App-owned rows: ${appRows.length} (${appIssues} issues)`);

  if (extensionRows.length > 0) {
    const extensionNames = [...new Set(extensionRows.map((row) => row.function).filter(Boolean))].sort();
    console.log(`- Extension-owned functions: ${extensionNames.join(', ')}`);
  }

  if (appRows.length > 0) {
    console.log('\nApp-owned lint findings:');
    for (const row of appRows) {
      const messages = (row.issues ?? []).map((issue) => issue.message).filter(Boolean);
      console.log(`- ${row.function}: ${messages.join('; ') || 'lint finding present'}`);
    }
  }

  if (failOnApp && appRows.length > 0) {
    console.error('\nSupabase app lint check failed: app-owned lint findings remain.');
    process.exit(1);
  }

  if (appRows.length === 0) {
    console.log('\nSupabase app lint check passed: no app-owned lint findings remain.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
