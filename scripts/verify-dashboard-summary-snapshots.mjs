#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20260404155100_dashboard_summary_snapshots.sql');
const docsPath = path.join(root, 'docs/DEPLOY_VERIFICATION_dashboard_summary_snapshots.md');

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key] && value) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
}

loadDotEnvFile(path.join(root, '.env'));

if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}
if (!process.env.SUPABASE_EDGE_BASE && process.env.VITE_SUPABASE_EDGE_BASE) {
  process.env.SUPABASE_EDGE_BASE = process.env.VITE_SUPABASE_EDGE_BASE;
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'].filter((key) => !process.env[key]);
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY before running this script.');
  process.exit(1);
}

if (!existsSync(migrationPath)) {
  console.error(`Missing migration file: ${migrationPath}`);
  process.exit(1);
}

if (!existsSync(docsPath)) {
  console.warn(`Docs checklist not found at ${docsPath}`);
}

const migrationSql = readFileSync(migrationPath, 'utf8');
const dashboardBaseUrl = process.env.SUPABASE_URL.replace(/\/+$/, '');
const edgeBase = process.env.SUPABASE_EDGE_BASE || `${dashboardBaseUrl}/functions/v1`;
const anonKey = process.env.SUPABASE_ANON_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const verificationFallbackToken = process.env.CEIP_VERIFICATION_FALLBACK_TOKEN || '';

const placeholderPatterns = [
  /\.\.\./,
  /<project-ref>/i,
  /postgresql:\/\/\.{3}/i,
  /https:\/\/<project-ref>\.supabase\.co/i,
  /^https:\/\/\.{3}/i,
];

const placeholderEnv = [
  ['SUPABASE_URL', process.env.SUPABASE_URL],
  ['SUPABASE_ANON_KEY', anonKey],
  ['CEIP_VERIFICATION_FALLBACK_TOKEN', verificationFallbackToken],
].filter(([, value]) => placeholderPatterns.some((pattern) => pattern.test(value || '')));

if (placeholderEnv.length > 0) {
  console.error('One or more environment variables still contain placeholders or example values:');
  for (const [name, value] of placeholderEnv) {
    console.error(`- ${name}: ${value}`);
  }
  console.error('\nReplace them with real target-project values before running the verifier.');
  console.error('Required: a real Supabase DB connection string, real project URL, anon key, and verification token.');
  process.exit(1);
}

const hasValidDbUrl = typeof dbUrl === 'string' && /^postgres(?:ql)?:\/\//i.test(dbUrl);

const sqlChecks = [
  {
    name: 'table exists',
    sql: `SELECT to_regclass('public.dashboard_summary_snapshots') AS dashboard_summary_snapshots;`,
  },
  {
    name: 'columns',
    sql: `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dashboard_summary_snapshots'
      ORDER BY ordinal_position;
    `,
  },
  {
    name: 'indexes',
    sql: `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'dashboard_summary_snapshots'
      ORDER BY indexname;
    `,
  },
  {
    name: 'trigger',
    sql: `
      SELECT tgname, pg_get_triggerdef(oid) AS trigger_def
      FROM pg_trigger
      WHERE tgrelid = 'public.dashboard_summary_snapshots'::regclass
        AND NOT tgisinternal;
    `,
  },
  {
    name: 'policies',
    sql: `
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'dashboard_summary_snapshots'
      ORDER BY policyname;
    `,
  },
];

const restHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

function runPsql(sql, title) {
  console.log(`\n[SQL] ${title}`);
  console.log(sql.trim());
  execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-c', sql], {
    stdio: 'inherit',
    env: process.env,
  });
}

function runSupabaseLinkedSql(sql, title) {
  console.log(`\n[SQL via supabase --linked] ${title}`);
  console.log(sql.trim());
  execFileSync('supabase', ['db', 'query', '--linked', '--output', 'json', sql], {
    stdio: 'inherit',
    env: process.env,
  });
}

function hasSnapshotType(payload, expected) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.snapshot_type === expected) return true;
  if (payload.metadata && typeof payload.metadata === 'object' && payload.metadata.snapshot_type === expected) return true;
  return false;
}

async function serviceRoleJson(url, options = {}) {
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for service-role verification');
  }
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { response, parsed, text };
}

async function curlJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { ...restHeaders, ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { response, parsed, text };
}

async function main() {
  console.log('Dashboard Summary Snapshot Verification');
  console.log(`Migration: ${migrationPath}`);
  console.log(`Docs checklist: ${docsPath}`);
  console.log(`Edge base: ${edgeBase}`);
  console.log(`DB url: ${dbUrl ? dbUrl.replace(/:[^:@/]+@/, ':***@') : '(not provided; SQL checks skipped)'}`);
  console.log('\n[STEP] migration file smoke check');
  console.log(`Migration contains ${migrationSql.split('\n').length} lines`);

  if (hasValidDbUrl) {
    for (const check of sqlChecks) {
      runPsql(check.sql, check.name);
    }
  } else {
    console.warn('\n[WARN] SUPABASE_DB_URL is not a usable postgres connection string.');
    console.warn('[WARN] Falling back to `supabase db query --linked` for schema checks.');
    for (const check of sqlChecks) {
      runSupabaseLinkedSql(check.sql, check.name);
    }
  }

  console.log('\n[STEP] REST read check (anon)');
  const readUrl = `${process.env.SUPABASE_URL}/rest/v1/dashboard_summary_snapshots?select=dashboard_key,variant_key,snapshot_stored_at,source_label,source_updated_at,is_partial&limit=1`;
  const readResult = await curlJson(readUrl);
  console.log(readResult.text);
  if (!readResult.response.ok) {
    throw new Error(`Anon REST read failed: HTTP ${readResult.response.status}`);
  }

  console.log('\n[STEP] REST write-block check (anon)');
  const writeResult = await curlJson(`${process.env.SUPABASE_URL}/rest/v1/dashboard_summary_snapshots`, {
    method: 'POST',
    body: [{
      dashboard_key: '__verification_blocked__',
      variant_key: '__verification_blocked__',
      summary_payload: { blocked: true },
      source_label: 'verification',
      source_updated_at: new Date().toISOString(),
      snapshot_stored_at: new Date().toISOString(),
      is_partial: false,
      notes: 'verification',
    }],
  });
  console.log(writeResult.text);
  if (writeResult.response.ok) {
    throw new Error('Anon REST insert unexpectedly succeeded');
  }

  console.log('\n[STEP] REST write check (service role)');
  const serviceRoleInsertPayload = [{
    dashboard_key: '__verification_write__',
    variant_key: '__verification_write__',
    summary_payload: { verification: true, source: 'service_role' },
    source_label: 'verification',
    source_updated_at: new Date().toISOString(),
    snapshot_stored_at: new Date().toISOString(),
    is_partial: false,
    notes: 'verification',
  }];
  const serviceWrite = await serviceRoleJson(`${process.env.SUPABASE_URL}/rest/v1/dashboard_summary_snapshots`, {
    method: 'POST',
    body: serviceRoleInsertPayload,
  });
  console.log(serviceWrite.text);
  if (!serviceWrite.response.ok) {
    throw new Error(`Service-role insert failed: HTTP ${serviceWrite.response.status}`);
  }
  const serviceDelete = await serviceRoleJson(
    `${process.env.SUPABASE_URL}/rest/v1/dashboard_summary_snapshots?dashboard_key=eq.__verification_write__&variant_key=eq.__verification_write__`,
    { method: 'DELETE' },
  );
  console.log(serviceDelete.text);
  if (!serviceDelete.response.ok) {
    throw new Error(`Service-role cleanup delete failed: HTTP ${serviceDelete.response.status}`);
  }

  console.log('\n[STEP] Hydrogen live snapshot save/load');
  const hydrogenLiveUrl = `${edgeBase}/api-v2-hydrogen-hub?province=AB&timeseries=true`;
  const hydrogenLive = await curlJson(hydrogenLiveUrl);
  console.log(hydrogenLive.text);
  if (!hydrogenLive.response.ok) {
    throw new Error(`Hydrogen live call failed: HTTP ${hydrogenLive.response.status}`);
  }
  if (!hasSnapshotType(hydrogenLive.parsed, 'live')) {
    throw new Error('Hydrogen live response missing snapshot_type=live');
  }

  if (verificationFallbackToken) {
    console.log('\n[STEP] Hydrogen persisted snapshot fallback');
    const hydrogenFailure = await curlJson(hydrogenLiveUrl, { headers: { 'x-ceip-verify-fallback': verificationFallbackToken } });
    console.log(hydrogenFailure.text);
    if (!hydrogenFailure.response.ok) {
      throw new Error(`Hydrogen fallback call failed: HTTP ${hydrogenFailure.response.status}`);
    }
    if (!hasSnapshotType(hydrogenFailure.parsed, 'persisted_snapshot')) {
      throw new Error('Hydrogen fallback did not return persisted_snapshot');
    }
  } else {
    console.warn('[WARN] CEIP_VERIFICATION_FALLBACK_TOKEN not provided; skipping forced persisted-snapshot fallback check for Hydrogen.');
  }

  console.log('\n[STEP] Critical Minerals live snapshot save/load');
  const mineralsLiveUrl = `${edgeBase}/api-v2-minerals-supply-chain?priority=true`;
  const mineralsLive = await curlJson(mineralsLiveUrl);
  console.log(mineralsLive.text);
  if (!mineralsLive.response.ok) {
    throw new Error(`Critical minerals live call failed: HTTP ${mineralsLive.response.status}`);
  }
  if (!hasSnapshotType(mineralsLive.parsed, 'live')) {
    throw new Error('Critical minerals live response missing snapshot_type=live');
  }

  if (verificationFallbackToken) {
    console.log('\n[STEP] Critical Minerals persisted snapshot fallback');
    const mineralsFailure = await curlJson(mineralsLiveUrl, { headers: { 'x-ceip-verify-fallback': verificationFallbackToken } });
    console.log(mineralsFailure.text);
    if (!mineralsFailure.response.ok) {
      throw new Error(`Critical minerals fallback call failed: HTTP ${mineralsFailure.response.status}`);
    }
    if (!hasSnapshotType(mineralsFailure.parsed, 'persisted_snapshot')) {
      throw new Error('Critical minerals fallback did not return persisted_snapshot');
    }
  } else {
    console.warn('[WARN] CEIP_VERIFICATION_FALLBACK_TOKEN not provided; skipping forced persisted-snapshot fallback check for Critical Minerals.');
  }

  console.log('\n[STEP] Summary');
  console.log('All local and live checks completed.');
}

main().catch((err) => {
  console.error('\nVerification failed:', err?.stack || err?.message || err);
  process.exit(1);
});
