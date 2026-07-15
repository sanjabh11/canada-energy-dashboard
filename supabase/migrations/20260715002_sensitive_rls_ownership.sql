-- Correct the broad authenticated policies introduced by 20260715001.
-- Sensitive operational and LLM tables are server-only; rows with a user_id
-- are readable only by their matching authenticated user.

BEGIN;

REVOKE ALL ON TABLE
  public.data_purge_log,
  public.error_logs,
  public.job_execution_log,
  public.llm_feedback,
  public.llm_reports
FROM anon, authenticated;

REVOKE ALL ON TABLE
  public.consent_logs,
  public.governance_requests
FROM anon;

GRANT SELECT ON TABLE
  public.consent_logs,
  public.error_logs,
  public.governance_requests
TO authenticated;

DROP POLICY IF EXISTS "allow read consent_logs" ON public.consent_logs;
DROP POLICY IF EXISTS "allow read error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "allow read job_execution_log" ON public.job_execution_log;
DROP POLICY IF EXISTS "allow read data_purge_log" ON public.data_purge_log;
DROP POLICY IF EXISTS "governance_requests_read_policy" ON public.governance_requests;
DROP POLICY IF EXISTS "job_execution_log_insert_all" ON public.job_execution_log;
DROP POLICY IF EXISTS "llm_feedback_authenticated_insert" ON public.llm_feedback;
DROP POLICY IF EXISTS "llm_feedback_service_role" ON public.llm_feedback;
DROP POLICY IF EXISTS "llm_reports_read_policy" ON public.llm_reports;

CREATE POLICY "consent_logs_owner_read"
  ON public.consent_logs FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "error_logs_owner_read"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "governance_requests_owner_read"
  ON public.governance_requests FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "llm_feedback_service_only"
  ON public.llm_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
