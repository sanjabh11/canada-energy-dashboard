#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260715002_sensitive_rls_ownership.sql');
const migration = readFileSync(migrationPath, 'utf8');
const browserTelemetry = readFileSync(path.join(process.cwd(), 'src/lib/jobExecutionLog.ts'), 'utf8');

const required = [
  'REVOKE ALL ON TABLE',
  'public.data_purge_log',
  'public.error_logs',
  'public.job_execution_log',
  'public.llm_feedback',
  'public.llm_reports',
  '"consent_logs_owner_read"',
  '"error_logs_owner_read"',
  '"governance_requests_owner_read"',
  'user_id = auth.uid()::text',
  '"job_execution_log_insert_all"',
  '"llm_feedback_authenticated_insert"',
];

const missing = required.filter((value) => !migration.includes(value));
const forbidden = [
  'TO anon, authenticated',
  'TO authenticated\n  USING (true)',
  'TO authenticated\n  WITH CHECK (true)',
].filter((value) => migration.includes(value));

if (browserTelemetry.includes(".from('job_execution_log')")) {
  forbidden.push('browser job_execution_log insert');
}

if (missing.length || forbidden.length) {
  console.error(JSON.stringify({ migrationPath, missing, forbidden }, null, 2));
  process.exitCode = 1;
} else {
  console.log('Sensitive RLS migration contract is intact.');
}
