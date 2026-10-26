import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20261026002_harden_api_key_rate_functions.sql',
  ),
  'utf8',
);

describe('API-key rate-function privilege boundary', () => {
  it('restricts both credential-bearing functions to service_role', () => {
    for (const signature of ['check_api_rate_limit(text)', 'record_api_usage(text, text)']) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC;`);
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.${signature} FROM anon, authenticated;`,
      );
      expect(migration).toContain(
        `GRANT EXECUTE ON FUNCTION public.${signature} TO service_role;`,
      );
    }
    expect(migration.match(/SET search_path = pg_catalog, public;/g)).toHaveLength(2);
  });

  it('enforces the privilege boundary in embedded Postgres', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN;
        CREATE FUNCTION public.check_api_rate_limit(text)
          RETURNS TABLE(allowed boolean, remaining integer, daily_limit integer, tier text)
          LANGUAGE sql AS $$ SELECT true, 1, 1, 'test'::text $$;
        CREATE FUNCTION public.record_api_usage(text, text)
          RETURNS void LANGUAGE sql AS $$ SELECT NULL::void $$;
        GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text) TO PUBLIC;
        GRANT EXECUTE ON FUNCTION public.record_api_usage(text, text) TO PUBLIC;
      `);

      await db.exec(migration);
      const { rows } = await db.query<{
        signature: string;
        anon_exec: boolean;
        authenticated_exec: boolean;
        service_exec: boolean;
        proconfig: string[] | null;
      }>(`
        SELECT p.oid::regprocedure::text AS signature,
          has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
          has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec,
          p.proconfig
        FROM pg_proc p
        WHERE p.pronamespace = 'public'::regnamespace
          AND p.proname IN ('check_api_rate_limit', 'record_api_usage')
        ORDER BY p.oid::regprocedure::text
      `);

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.anon_exec).toBe(false);
        expect(row.authenticated_exec).toBe(false);
        expect(row.service_exec).toBe(true);
        expect(row.proconfig).toContain('search_path=pg_catalog, public');
      }
    } finally {
      await db.close();
    }
  });
});
