-- Restrict legacy Edubiz entitlement/usage helpers until a reviewed caller exists.
-- Repository search found no application or Edge Function caller for these RPCs.
-- They accept arbitrary user IDs or mutate usage/badge state, so direct client
-- execution would permit cross-user reads or writes. Keep service_role access
-- for an explicitly reviewed server-side migration/repair path only.

BEGIN;

REVOKE ALL ON FUNCTION public.get_user_tier(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_tier(uuid) FROM anon, authenticated;
ALTER FUNCTION public.get_user_tier(uuid)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.can_access_feature(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_feature(uuid, text) FROM anon, authenticated;
ALTER FUNCTION public.can_access_feature(uuid, text)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.can_access_feature(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.increment_ai_queries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_queries(uuid) FROM anon, authenticated;
ALTER FUNCTION public.increment_ai_queries(uuid)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.increment_ai_queries(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.award_badge_if_eligible(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_badge_if_eligible(uuid) FROM anon, authenticated;
ALTER FUNCTION public.award_badge_if_eligible(uuid)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.award_badge_if_eligible(uuid, text) TO service_role;

COMMIT;
