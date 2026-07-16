-- RLS Security Hardening Migration
-- Date: 2026-07-15
-- Purpose: Fix USING(true) policies that lack explicit TO clause
-- Risk: Sensitive tables (consent_logs, error_logs, job_execution_log,
--   data_purge_log, governance_requests, llm_feedback, llm_reports) were
--   publicly readable via the anon key. This migration restricts them to
--   authenticated users only.
-- Public data tables (grid data, forecasts, weather, curtailment, etc.)
--   remain publicly readable but with an explicit TO anon, authenticated
--   clause so the intent is documented.
-- Reference: Supabase Production Checklist 2026, VibeArmor Security Guide

-- =============================================================
-- SENSITIVE TABLES: Restrict to authenticated only
-- =============================================================

-- consent_logs: Contains user consent records (PII)
DROP POLICY IF EXISTS "allow read consent_logs" ON public.consent_logs;
CREATE POLICY "allow read consent_logs"
  ON public.consent_logs FOR SELECT
  TO authenticated
  USING (true);

-- error_logs: Contains internal error details
DROP POLICY IF EXISTS "allow read error_logs" ON public.error_logs;
CREATE POLICY "allow read error_logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (true);

-- job_execution_log: Contains internal job execution details
DROP POLICY IF EXISTS "allow read job_execution_log" ON public.job_execution_log;
CREATE POLICY "allow read job_execution_log"
  ON public.job_execution_log FOR SELECT
  TO authenticated
  USING (true);

-- data_purge_log: Contains purge operation records
DROP POLICY IF EXISTS "allow read data_purge_log" ON public.data_purge_log;
CREATE POLICY "allow read data_purge_log"
  ON public.data_purge_log FOR SELECT
  TO authenticated
  USING (true);

-- governance_requests: Contains user-submitted governance requests (PII)
DROP POLICY IF EXISTS "governance_requests_read_policy" ON public.governance_requests;
CREATE POLICY "governance_requests_read_policy"
  ON public.governance_requests FOR SELECT
  TO authenticated
  USING (true);

-- llm_feedback: Contains user feedback on LLM responses (PII)
DROP POLICY IF EXISTS "llm_feedback_anon_insert" ON public.llm_feedback;
CREATE POLICY "llm_feedback_authenticated_insert"
  ON public.llm_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- llm_reports: Contains LLM-generated reports (may contain user data)
DROP POLICY IF EXISTS "llm_reports_read_policy" ON public.llm_reports;
CREATE POLICY "llm_reports_read_policy"
  ON public.llm_reports FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- PUBLIC DATA TABLES: Explicit TO anon, authenticated
-- (These are grid/forecast/weather data that is intentionally public)
-- =============================================================

-- forecast_actuals
DROP POLICY IF EXISTS "forecast_actuals_read" ON public.forecast_actuals;
CREATE POLICY "forecast_actuals_read"
  ON public.forecast_actuals FOR SELECT
  TO anon, authenticated
  USING (true);

-- forecast_performance
DROP POLICY IF EXISTS "forecast_performance_read" ON public.forecast_performance;
CREATE POLICY "forecast_performance_read"
  ON public.forecast_performance FOR SELECT
  TO anon, authenticated
  USING (true);

-- renewable_forecasts
DROP POLICY IF EXISTS "renewable_forecasts_read" ON public.renewable_forecasts;
CREATE POLICY "renewable_forecasts_read"
  ON public.renewable_forecasts FOR SELECT
  TO anon, authenticated
  USING (true);

-- renewable_capacity_registry
DROP POLICY IF EXISTS "renewable_capacity_registry_read" ON public.renewable_capacity_registry;
CREATE POLICY "renewable_capacity_registry_read"
  ON public.renewable_capacity_registry FOR SELECT
  TO anon, authenticated
  USING (true);

-- weather_observations
DROP POLICY IF EXISTS "weather_observations_read" ON public.weather_observations;
CREATE POLICY "weather_observations_read"
  ON public.weather_observations FOR SELECT
  TO anon, authenticated
  USING (true);

-- curtailment_events
DROP POLICY IF EXISTS "curtailment_events_read" ON public.curtailment_events;
CREATE POLICY "curtailment_events_read"
  ON public.curtailment_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- curtailment_reduction_recommendations
DROP POLICY IF EXISTS "curtailment_reduction_recommendations_read" ON public.curtailment_reduction_recommendations;
CREATE POLICY "curtailment_reduction_recommendations_read"
  ON public.curtailment_reduction_recommendations FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================
-- PUBLIC REFERENCE TABLES: Explicit TO anon, authenticated
-- (Badge definitions, course modules, help text, webinars)
-- =============================================================

-- badges
DROP POLICY IF EXISTS "badges_read" ON public.badges;
CREATE POLICY "badges_read"
  ON public.badges FOR SELECT
  TO anon, authenticated
  USING (true);

-- certificate_modules
DROP POLICY IF EXISTS "certificate_modules_read" ON public.certificate_modules;
CREATE POLICY "certificate_modules_read"
  ON public.certificate_modules FOR SELECT
  TO anon, authenticated
  USING (true);

-- certificate_tracks
DROP POLICY IF EXISTS "certificate_tracks_read" ON public.certificate_tracks;
CREATE POLICY "certificate_tracks_read"
  ON public.certificate_tracks FOR SELECT
  TO anon, authenticated
  USING (true);

-- help_text
DROP POLICY IF EXISTS "help_text_read" ON public.help_text;
CREATE POLICY "help_text_read"
  ON public.help_text FOR SELECT
  TO anon, authenticated
  USING (true);

-- webinars
DROP POLICY IF EXISTS "webinars_read" ON public.webinars;
CREATE POLICY "webinars_read"
  ON public.webinars FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================================
-- BOOTSTRAP TABLES: Fix policies created in bootstrap migration
-- These use IF NOT EXISTS pattern, so we drop and recreate with TO clause
-- =============================================================

-- provincial_generation
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read provincial_generation" ON public.provincial_generation;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read provincial_generation"
  ON public.provincial_generation FOR SELECT
  TO anon, authenticated
  USING (true);

-- ontario_hourly_demand
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read ontario_hourly_demand" ON public.ontario_hourly_demand;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read ontario_hourly_demand"
  ON public.ontario_hourly_demand FOR SELECT
  TO anon, authenticated
  USING (true);

-- ontario_prices
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read ontario_prices" ON public.ontario_prices;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read ontario_prices"
  ON public.ontario_prices FOR SELECT
  TO anon, authenticated
  USING (true);

-- forecast_performance_metrics
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read forecast_performance_metrics" ON public.forecast_performance_metrics;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read forecast_performance_metrics"
  ON public.forecast_performance_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

-- storage_dispatch_log (singular) is a VIEW — RLS policies cannot be applied to views
-- Skip; the plural storage_dispatch_logs table is handled below

-- batteries_state
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read batteries_state" ON public.batteries_state;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read batteries_state"
  ON public.batteries_state FOR SELECT
  TO anon, authenticated
  USING (true);

-- storage_dispatch_logs (plural variant)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access" ON public.storage_dispatch_logs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access"
  ON public.storage_dispatch_logs FOR SELECT
  TO anon, authenticated
  USING (true);

-- data_provenance_types
DO $$ BEGIN
  DROP POLICY IF EXISTS "allow read data_provenance_types" ON public.data_provenance_types;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "allow read data_provenance_types"
  ON public.data_provenance_types FOR SELECT
  TO anon, authenticated
  USING (true);

-- province_configs
DO $$ BEGIN
  DROP POLICY IF EXISTS "Province configs are viewable by everyone" ON public.province_configs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Province configs are viewable by everyone"
  ON public.province_configs FOR SELECT
  TO anon, authenticated
  USING (true);

-- energy_observations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access" ON public.energy_observations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access"
  ON public.energy_observations FOR SELECT
  TO anon, authenticated
  USING (true);

-- demand_observations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access" ON public.demand_observations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access"
  ON public.demand_observations FOR SELECT
  TO anon, authenticated
  USING (true);

-- aeso_queue_history
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access to queue history" ON public.aeso_queue_history;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access to queue history"
  ON public.aeso_queue_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- hydrogen_price_forecasts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access to price forecasts" ON public.hydrogen_price_forecasts;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access to price forecasts"
  ON public.hydrogen_price_forecasts FOR SELECT
  TO anon, authenticated
  USING (true);

-- minerals_geopolitical_risk
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public read access to geopolitical risk" ON public.minerals_geopolitical_risk;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "Allow public read access to geopolitical risk"
  ON public.minerals_geopolitical_risk FOR SELECT
  TO anon, authenticated
  USING (true);
