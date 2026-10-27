-- Harden platform helper public.rls_auto_enable() API-surface ACL.
--
-- Supabase provisions an event-trigger function public.rls_auto_enable()
-- that is executable by anon/authenticated by default (security advisor
-- lint). The function is trigger-owned; API roles never need to call it
-- directly. Revoking EXECUTE closes the lint without touching the
-- platform trigger (ensure_rls).
--
-- Ported from target-only migration
-- `20261023_harden_rls_auto_enable_api_acl` (deviation ledger entry).
-- Guarded: no-op on installs where the platform function is absent.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  SELECT p.oid::regprocedure INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
  END IF;
END $$;
