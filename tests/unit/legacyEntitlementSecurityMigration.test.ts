import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20261026003_restrict_legacy_entitlement_helpers.sql',
  ),
  'utf8',
);

const helpers = [
  'get_user_tier(uuid)',
  'can_access_feature(uuid, text)',
  'increment_ai_queries(uuid)',
  'award_badge_if_eligible(uuid, text)',
] as const;

describe('legacy entitlement helper privilege boundary', () => {
  it('restricts every arbitrary-user helper to service_role', () => {
    for (const signature of helpers) {
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC;`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.${signature} FROM anon, authenticated;`,
      );
      expect(migration).toContain(
        `GRANT EXECUTE ON FUNCTION public.${signature} TO service_role;`,
      );
    }
    expect(migration.match(/SET search_path = pg_catalog, public;/g)).toHaveLength(4);
  });

  it('enforces the boundary in an embedded Postgres catalog', async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN;
        CREATE FUNCTION public.get_user_tier(uuid)
          RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'free'::text $$;
        CREATE FUNCTION public.can_access_feature(uuid, text)
          RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
        CREATE FUNCTION public.increment_ai_queries(uuid)
          RETURNS TABLE(queries_today integer, limit_reached boolean, tier text)
          LANGUAGE sql SECURITY DEFINER AS $$ SELECT 0, false, 'free'::text $$;
        CREATE FUNCTION public.award_badge_if_eligible(uuid, text)
          RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
        GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO PUBLIC;
        GRANT EXECUTE ON FUNCTION public.can_access_feature(uuid, text) TO PUBLIC;
        GRANT EXECUTE ON FUNCTION public.increment_ai_queries(uuid) TO PUBLIC;
        GRANT EXECUTE ON FUNCTION public.award_badge_if_eligible(uuid, text) TO PUBLIC;
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
          AND p.proname IN (
            'get_user_tier', 'can_access_feature',
            'increment_ai_queries', 'award_badge_if_eligible'
          )
        ORDER BY p.oid::regprocedure::text
      `);

      expect(rows).toHaveLength(4);
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
