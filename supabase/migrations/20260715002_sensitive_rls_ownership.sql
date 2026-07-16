-- Correct the broad authenticated policies introduced by 20260715001.
-- Sensitive operational tables are server-only (service_role).
-- Tables with a user_id column are readable by their matching authenticated user.

BEGIN;

-- Server-only tables: no anon or authenticated access
REVOKE ALL ON TABLE
  public.data_purge_log,
  public.error_logs,
  public.job_execution_log,
  public.llm_feedback,
  public.llm_reports
FROM anon, authenticated;

-- User-scoped tables: revoke anon, grant authenticated SELECT
REVOKE ALL ON TABLE
  public.consent_logs,
  public.governance_requests
FROM anon;

GRANT SELECT ON TABLE
  public.consent_logs,
  public.governance_requests
TO authenticated;

-- Drop broad policies from 20260715001
DROP POLICY IF EXISTS "allow read consent_logs" ON public.consent_logs;
DROP POLICY IF EXISTS "allow read error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "allow read job_execution_log" ON public.job_execution_log;
DROP POLICY IF EXISTS "allow read data_purge_log" ON public.data_purge_log;
DROP POLICY IF EXISTS "governance_requests_read_policy" ON public.governance_requests;
DROP POLICY IF EXISTS "job_execution_log_insert_all" ON public.job_execution_log;
DROP POLICY IF EXISTS "llm_feedback_authenticated_insert" ON public.llm_feedback;
DROP POLICY IF EXISTS "llm_feedback_service_role" ON public.llm_feedback;
DROP POLICY IF EXISTS "llm_reports_read_policy" ON public.llm_reports;
DROP POLICY IF EXISTS "llm_reports_insert_policy" ON public.llm_reports;

-- Owner-scoped policies for tables that have a user_id column
CREATE POLICY "consent_logs_owner_read"
  ON public.consent_logs FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "governance_requests_owner_read"
  ON public.governance_requests FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid()::text);

-- Server-only policies for operational tables (no user_id column)
CREATE POLICY "error_logs_service_only"
  ON public.error_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "job_execution_log_service_only"
  ON public.job_execution_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "data_purge_log_service_only"
  ON public.data_purge_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "llm_reports_service_only"
  ON public.llm_reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "llm_feedback_service_only"
  ON public.llm_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
