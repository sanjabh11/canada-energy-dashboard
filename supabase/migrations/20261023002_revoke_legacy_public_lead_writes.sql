-- Revoke direct public-role writes on remaining lead/credential tables.
--
-- 20261006001_revoke_public_lead_writes.sql closed the public INSERT
-- path on lead_intake_submissions. The hosted migration additionally
-- revoked direct client writes on the wider lead/credential table set
-- (target-only migration `20261023_revoke_legacy_public_lead_writes`).
-- This ports that hardening: any INSERT/ALL policy scoped entirely to
-- anon/authenticated is dropped and INSERT is revoked at the privilege
-- layer for defense in depth.
--
-- Policies that include service_role (or other roles) are preserved —
-- server functions writing via the service role are unaffected.
-- Guarded per-table so absent tables are skipped.
DO $$
DECLARE
  t text;
  pol record;
  targets text[] := ARRAY[
    'api_keys', 'api_usage', 'contact_leads', 'leads', 'lead_intent',
    'lead_lifecycle', 'lead_intake_submissions', 'payments',
    'webhook_events', 'llm_call_log', 'edge_invocation_log'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = t
          AND cmd IN ('INSERT', 'ALL')
          AND roles <@ ARRAY['anon', 'authenticated']::name[]
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format('REVOKE INSERT ON public.%I FROM anon', t);
      EXECUTE format('REVOKE INSERT ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
