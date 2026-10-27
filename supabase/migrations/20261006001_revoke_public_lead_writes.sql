-- ============================================================================
-- REVOKE PUBLIC DIRECT WRITES ON lead_intake_submissions (audit G6)
-- ============================================================================
-- Purpose: Migration 20260303001_gtm_pipeline_entities.sql created the policy
-- "anon and authenticated can insert lead_intake_submissions", which allows
-- any holder of the public anon key (or any authenticated session) to INSERT
-- rows directly through PostgREST — bypassing every abuse control in the
-- hardened netlify/functions/leads.ts intake handler (16 KB body bound,
-- schema allowlist, per-IP + global token buckets, honeypot, HMAC dedup
-- token, metadata minimization).
--
-- leads.ts persists with SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
-- entirely, so this direct-write policy is NOT required by any legitimate
-- path. This migration removes it. The "service role manage
-- lead_intake_submissions" FOR ALL policy from 20260303001 is intentionally
-- left in place — it is the function's access grant.
--
-- APPLY ORDER:
--   1. Apply this migration BEFORE relying on the deployed leads.ts handler
--      as the sole write path for public lead intake (it can land any time;
--      the function does not depend on the public policy).
--   2. It is independent of 20261005001_lead_intake_dedup_token.sql but is
--      ordered after it; both should land before the function deploy that
--      relies on them.
--
-- HOSTED VERIFICATION IS OWNER-GATED: confirming on the hosted project that
-- `anon`/`authenticated` INSERTs are now denied (PostgREST 401/403) requires
-- the owner's Supabase credentials and is deliberately out of repo scope.
--
-- NOTE: the sibling policy "anon and authenticated can insert
-- attribution_events" on public.attribution_events is intentionally retained
-- — attribution events are low-sensitivity telemetry designed for direct
-- anon inserts; contact PII is not.

DROP POLICY IF EXISTS "anon and authenticated can insert lead_intake_submissions"
  ON public.lead_intake_submissions;

-- Defense in depth: even if a future migration re-adds a permissive policy,
-- the table-level INSERT privilege stays revoked from the public roles so a
-- permissive-policy regression alone cannot reopen direct writes.
REVOKE INSERT ON public.lead_intake_submissions FROM anon;
REVOKE INSERT ON public.lead_intake_submissions FROM authenticated;
