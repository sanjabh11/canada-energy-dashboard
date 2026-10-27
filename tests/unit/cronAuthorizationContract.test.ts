import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.resolve(ROOT, rel), 'utf8');

// Functions that perform scheduled privileged writes behind CRON_SECRET.
const CRON_FUNCTIONS = [
  'ingest-gas-basis-series',
  'ingest-market-spike-series',
  'ingest-retailer-rate-offers',
  'ingest-tier-market-rates',
  'energy-rag-ingest',
  'model-monitor',
  'groundsource-miner',
  'calibration-cron',
  'aeso-ingestion-cron',
  'alert-export-health',
  'process-export-jobs',
  'data-purge-cron',
  'weather-ingestion-cron',
  'storage-dispatch-engine',
  'ops-heartbeat',
  'stream-ontario-demand',
  'stream-ontario-prices',
];

const cronWorkflows = readdirSync(path.resolve(ROOT, '.github/workflows'))
  .filter((f) => f.startsWith('cron-') && f.endsWith('.yml'));

describe('Cron authorization contract', () => {
  it('every privileged cron function uses the shared isCronAuthorized guard', () => {
    for (const fn of CRON_FUNCTIONS) {
      const rel = `supabase/functions/${fn}/index.ts`;
      const src = read(rel);
      expect(src, `${fn} missing cronAuth import`).toContain('cronAuth.ts');
      expect(src, `${fn} missing isCronAuthorized call`).toContain('isCronAuthorized(req)');
    }
  });

  it('no function trusts the forgeable x-supabase-cron header', () => {
    for (const fn of CRON_FUNCTIONS) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(src, fn).not.toContain('x-supabase-cron');
    }
  });

  it('no cron workflow sends the public anon key to a function endpoint', () => {
    for (const wf of cronWorkflows) {
      const src = read(`.github/workflows/${wf}`);
      for (const line of src.split('\n')) {
        if (/Authorization: Bearer/.test(line)) {
          expect(line, `${wf} sends anon key`).not.toContain('SUPABASE_ANON_KEY');
        }
      }
    }
  });

  it('no cron workflow relies on the forgeable x-supabase-cron header', () => {
    for (const wf of cronWorkflows) {
      expect(read(`.github/workflows/${wf}`), wf).not.toContain('x-supabase-cron');
    }
  });

  it('every cron-secret function disables the platform JWT check', () => {
    const toml = read('supabase/config.toml');
    for (const fn of CRON_FUNCTIONS) {
      const section = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?(?=\\n\\[functions\\.|$)`);
      const block = toml.match(section)?.[0] ?? '';
      expect(block, `${fn} missing config entry`).toContain('verify_jwt = false');
    }
  });

  it('the shared guard fails closed on missing secret and never accepts anon JWTs', () => {
    const helper = read('supabase/functions/_shared/cronAuth.ts');
    expect(helper).toContain('constantTimeEqual');
    expect(helper).toContain('CRON_SECRET');
    expect(helper).toContain('SUPABASE_SERVICE_ROLE_KEY');
    // must return false for missing/empty presented token
    expect(helper).toMatch(/if \(!left \|\| !right/);
  });
});
