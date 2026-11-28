-- Harden the NL2SQL SECURITY DEFINER functions.
-- The only reviewed caller is the server-side nl2sql Edge Function, which uses
-- the service role. Direct client execution is not part of the pilot contract.

BEGIN;

REVOKE ALL ON FUNCTION public.execute_readonly_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_readonly_sql(text, integer) FROM anon, authenticated;

ALTER FUNCTION public.execute_readonly_sql(text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.execute_readonly_sql(text, integer)
  SET search_path = pg_catalog, public;

GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text, integer) TO service_role;

COMMIT;
