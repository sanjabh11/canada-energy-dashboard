-- Keep API-key rate accounting callable only by trusted Edge Function clients.
-- The public functions accept credential material and mutate usage state.
BEGIN;

REVOKE ALL ON FUNCTION public.check_api_rate_limit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_api_rate_limit(text) FROM anon, authenticated;
ALTER FUNCTION public.check_api_rate_limit(text)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.check_api_rate_limit(text) TO service_role;

REVOKE ALL ON FUNCTION public.record_api_usage(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_api_usage(text, text) FROM anon, authenticated;
ALTER FUNCTION public.record_api_usage(text, text)
  SET search_path = pg_catalog, public;
GRANT EXECUTE ON FUNCTION public.record_api_usage(text, text) TO service_role;

COMMIT;
