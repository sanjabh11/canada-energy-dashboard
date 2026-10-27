import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (relativePath: string) => readFileSync(path.resolve(ROOT, relativePath), 'utf8');

const cronWorkflows = [
  '.github/workflows/cron-data-purge.yml',
  '.github/workflows/cron-gas-basis-series.yml',
  '.github/workflows/cron-ieso-ingestion.yml',
  '.github/workflows/cron-market-spike-series.yml',
  '.github/workflows/cron-retailer-rate-offers.yml',
  '.github/workflows/cron-storage-dispatch.yml',
  '.github/workflows/cron-tier-market-rates.yml',
  '.github/workflows/cron-weather-ingestion.yml',
];

const privilegedFunctions = [
  'supabase/functions/weather-ingestion-cron/index.ts',
  'supabase/functions/data-purge-cron/index.ts',
  'supabase/functions/storage-dispatch-engine/index.ts',
  'supabase/functions/stream-ontario-demand/index.ts',
  'supabase/functions/stream-ontario-prices/index.ts',
  'supabase/functions/ops-heartbeat/index.ts',
];

describe('scheduled mutation security contract', () => {
  it('never sends an anon key to a scheduled mutation endpoint', () => {
    for (const relativePath of cronWorkflows) {
      const source = read(relativePath);
      expect(source, relativePath).not.toMatch(/SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY/);
      expect(source, relativePath).toContain('secrets.CRON_SECRET');
      expect(source, relativePath).not.toContain('x-supabase-cron: true');
    }
  });

  it('requires service-role credentials for local mutation seeders', () => {
    for (const relativePath of ['scripts/seed-curtailment-data.ts', 'scripts/seed-forecast-performance.ts']) {
      const source = read(relativePath);
      expect(source, relativePath).not.toContain('VITE_SUPABASE_ANON_KEY');
      expect(source, relativePath).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(source, relativePath).not.toContain('.env.local');
    }
  });

  it('requires a dedicated cron secret in the end-to-end cron smoke script', () => {
    const source = read('scripts/test-all-crons.sh');
    expect(source).not.toMatch(/SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY/);
    expect(source).toContain('CRON_SECRET');
    expect(source).toContain('Bearer ${CRON_SECRET}');
  });

  it('guards every service-role-backed scheduled function in source', () => {
    for (const relativePath of privilegedFunctions) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('../_shared/cronAuth.ts');
      expect(source, relativePath).toContain('isCronAuthorized');
      expect(source, relativePath).toContain('401');
    }
  });

  it('disables platform JWT verification so the handler owns cron-secret validation', () => {
    const config = read('supabase/config.toml');
    for (const functionName of [
      'weather-ingestion-cron',
      'data-purge-cron',
      'storage-dispatch-engine',
      'stream-ontario-demand',
      'stream-ontario-prices',
      'ops-heartbeat',
    ]) {
      const block = config.match(new RegExp(`\\[functions\\.${functionName}\\][\\s\\S]*?(?=\\n\\[functions\\.|$)`))?.[0] ?? '';
      expect(block, functionName).toContain('verify_jwt = false');
    }
  });
});
