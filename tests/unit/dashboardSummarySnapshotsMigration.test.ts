import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  __dirname,
  '../../supabase/migrations/20260404155100_dashboard_summary_snapshots.sql',
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

describe('dashboard_summary_snapshots migration', () => {
  it('creates the required columns and primary key', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.dashboard_summary_snapshots');
    expect(migrationSql).toContain('dashboard_key TEXT NOT NULL');
    expect(migrationSql).toContain('variant_key TEXT NOT NULL');
    expect(migrationSql).toContain('summary_payload JSONB NOT NULL');
    expect(migrationSql).toContain('source_label TEXT');
    expect(migrationSql).toContain('source_updated_at TIMESTAMPTZ');
    expect(migrationSql).toContain('snapshot_stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(migrationSql).toContain('is_partial BOOLEAN NOT NULL DEFAULT FALSE');
    expect(migrationSql).toContain('notes TEXT');
    expect(migrationSql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(migrationSql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    expect(migrationSql).toContain('PRIMARY KEY (dashboard_key, variant_key)');
  });

  it('creates the snapshot indexes and updated_at trigger', () => {
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS idx_dashboard_summary_snapshots_dashboard_key');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS idx_dashboard_summary_snapshots_snapshot_stored_at');
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.set_dashboard_summary_snapshots_updated_at()');
    expect(migrationSql).toContain('CREATE TRIGGER trg_dashboard_summary_snapshots_updated_at');
    expect(migrationSql).toContain('BEFORE UPDATE ON public.dashboard_summary_snapshots');
  });

  it('enables RLS and exposes read-only access to anon and authenticated clients', () => {
    expect(migrationSql).toContain('ALTER TABLE public.dashboard_summary_snapshots ENABLE ROW LEVEL SECURITY;');
    expect(migrationSql).toContain('FOR SELECT');
    expect(migrationSql).toContain('TO anon, authenticated');
    expect(migrationSql).toContain('USING (true);');
    expect(migrationSql).not.toMatch(/FOR INSERT|FOR UPDATE|FOR DELETE/);
  });
});
