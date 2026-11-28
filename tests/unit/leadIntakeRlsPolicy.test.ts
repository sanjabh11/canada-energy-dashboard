import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

/**
 * Local allow/deny proof for 20261006001_revoke_public_lead_writes.sql.
 *
 * PGlite runs a real embedded Postgres, so RLS + privilege behavior is genuine
 * (not a string assertion). Supabase's `auth.role()` is emulated as a GUC-backed
 * function: `SET request.jwt.claim.role` simulates the caller's role exactly as
 * PostgREST sets it per request.
 *
 * Hosted verification remains owner-gated: this proves the migration's SQL
 * semantics, not that the hosted project applied it.
 */

const BASE_SQL = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE FUNCTION auth.role() RETURNS text AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')::text;
  $$ LANGUAGE sql STABLE;

  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;

  CREATE TABLE IF NOT EXISTS public.lead_intake_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    team_size TEXT,
    industry TEXT,
    message TEXT,
    source_route TEXT NOT NULL DEFAULT '/enterprise',
    channel TEXT NOT NULL DEFAULT 'direct',
    segment TEXT NOT NULL DEFAULT 'consultancy',
    campaign_id TEXT NOT NULL DEFAULT 'enterprise_2026q1',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'qualified', 'disqualified', 'contacted')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.lead_intake_submissions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "service role manage lead_intake_submissions"
    ON public.lead_intake_submissions FOR ALL
    USING (auth.role() = 'service_role');

  -- Reproduce the pre-remediation grant the migration revokes.
  GRANT INSERT ON public.lead_intake_submissions TO anon, authenticated;

  CREATE POLICY "anon and authenticated can insert lead_intake_submissions"
    ON public.lead_intake_submissions FOR INSERT
    WITH CHECK (auth.role() IN ('anon', 'authenticated', 'service_role'));

  GRANT ALL ON public.lead_intake_submissions TO service_role;
`;

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261006001_revoke_public_lead_writes.sql'),
  'utf8',
);

const INSERT_PROBE = `INSERT INTO public.lead_intake_submissions (contact_name, email) VALUES ('Probe', 'probe@example.com')`;

async function tryInsertAs(db: PGlite, role: string) {
  await db.query(`SET request.jwt.claim.role = '${role}'`);
  await db.query(`SET ROLE ${role === 'service_role' ? 'service_role' : role === 'authenticated' ? 'authenticated' : 'anon'}`);
  try {
    await db.query(INSERT_PROBE);
    return { allowed: true, error: '' };
  } catch (error) {
    return { allowed: false, error: String(error) };
  } finally {
    await db.query('RESET ROLE');
    await db.query(`RESET request.jwt.claim.role`);
  }
}

describe('lead_intake_submissions RLS — real Postgres allow/deny (PGlite)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE_SQL);
  });

  it('pre-migration: anon and authenticated direct inserts succeed (the original hole)', async () => {
    expect((await tryInsertAs(db, 'anon')).allowed).toBe(true);
    expect((await tryInsertAs(db, 'authenticated')).allowed).toBe(true);
  });

  it('post-migration: anon and authenticated direct inserts are denied', async () => {
    await db.exec(MIGRATION_SQL);
    const anon = await tryInsertAs(db, 'anon');
    const authed = await tryInsertAs(db, 'authenticated');
    expect(anon.allowed).toBe(false);
    expect(authed.allowed).toBe(false);
    expect(anon.error).toMatch(/permission denied|row-level security|violates/i);
  });

  it('post-migration: service_role writes still work (the function path survives)', async () => {
    const res = await tryInsertAs(db, 'service_role');
    expect(res.allowed).toBe(true);
    const count = await db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM public.lead_intake_submissions`,
    );
    // 1 service_role row + the 2 pre-migration anon/authenticated probe rows.
    expect(Number(count.rows[0]?.n)).toBe(3);
  });
});
