import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20261026001_harden_readonly_sql_privileges.sql',
  ),
  'utf8',
);

describe('execute_readonly_sql privilege hardening migration', () => {
  it('removes direct client execution for both overloads', () => {
    for (const signature of ['text', 'text, integer']) {
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.execute_readonly_sql(${signature}) FROM PUBLIC;`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.execute_readonly_sql(${signature}) FROM anon, authenticated;`,
      );
      expect(migration).toContain(
        `GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(${signature}) TO service_role;`,
      );
    }
  });

  it('pins both SECURITY DEFINER functions to the reviewed search path', () => {
    expect(migration.match(/SET search_path = pg_catalog, public;/g)).toHaveLength(2);
  });

  it('enforces the privilege boundary in an embedded Postgres catalog', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN;
        CREATE FUNCTION public.execute_readonly_sql(text)
          RETURNS jsonb LANGUAGE sql AS $$ SELECT '[]'::jsonb $$;
        CREATE FUNCTION public.execute_readonly_sql(text, integer)
          RETURNS jsonb LANGUAGE sql AS $$ SELECT '[]'::jsonb $$;
        GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO PUBLIC;
        GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text, integer) TO PUBLIC;
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
          AND p.proname = 'execute_readonly_sql'
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
