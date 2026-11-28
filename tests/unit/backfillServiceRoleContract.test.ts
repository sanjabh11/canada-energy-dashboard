import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const script = (rel: string) => readFileSync(path.resolve(ROOT, rel), 'utf8');

const writeScripts = [
  'scripts/backfill-ieso-data.mjs',
  'scripts/backfill-provincial-generation-improved.mjs',
  'scripts/backfill-provincial-generation.mjs',
  'scripts/import_efficiency_projects.py',
  'scripts/import_npri_facilities.py',
  'scripts/import_obps_compliance.py',
  'scripts/import_yahoo_finance_esg.py',
];

describe('Backfill/import scripts service-role contract', () => {
  it('requires an explicit service-role key and never falls back to the public anon key', () => {
    for (const rel of writeScripts) {
      const source = script(rel);
      expect(source, rel).not.toContain('VITE_SUPABASE_ANON_KEY');
      expect(source, rel).toContain('SUPABASE_SERVICE_ROLE_KEY');
    }
  });

  it('does not silently parse .env.local for credentials', () => {
    for (const rel of writeScripts) {
      expect(script(rel), rel).not.toContain('.env.local');
    }
  });

  it('keeps the removed ad-hoc migration runners deleted and unreferenced', () => {
    for (const runner of ['scripts/run-migrations-direct.mjs', 'scripts/run-migrations-via-supabase.mjs']) {
      expect(existsSync(path.resolve(ROOT, runner)), runner).toBe(false);
    }
    const readme = script('scripts/README.md');
    expect(readme).not.toContain('run-migrations-direct.mjs');
    expect(readme).not.toContain('run-migrations-via-supabase.mjs');
  });
});
