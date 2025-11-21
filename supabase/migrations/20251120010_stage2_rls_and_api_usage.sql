-- Stage 2: RLS + read-only posture for AI, Carbon, IESO, and CER tables
-- Stage 3 (partial): api_usage table for rate limiting logs

-- ================================
-- AI DATA CENTRES / AESO TABLES
-- ================================

ALTER TABLE ai_data_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_data_centres FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_data_centres_read_only ON ai_data_centres;

CREATE POLICY ai_data_centres_read_only
  ON ai_data_centres
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE ai_dc_power_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dc_power_consumption FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_dc_power_consumption_read_only ON ai_dc_power_consumption;

CREATE POLICY ai_dc_power_consumption_read_only
  ON ai_dc_power_consumption
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE aeso_interconnection_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE aeso_interconnection_queue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aeso_interconnection_queue_read_only ON aeso_interconnection_queue;

CREATE POLICY aeso_interconnection_queue_read_only
  ON aeso_interconnection_queue
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE alberta_grid_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE alberta_grid_capacity FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alberta_grid_capacity_read_only ON alberta_grid_capacity;

CREATE POLICY alberta_grid_capacity_read_only
  ON alberta_grid_capacity
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE ai_dc_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dc_emissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_dc_emissions_read_only ON ai_dc_emissions;

CREATE POLICY ai_dc_emissions_read_only
  ON ai_dc_emissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ================================
-- CARBON EMISSIONS TABLES
-- ================================

ALTER TABLE provincial_ghg_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincial_ghg_emissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provincial_ghg_emissions_read_only ON provincial_ghg_emissions;

CREATE POLICY provincial_ghg_emissions_read_only
  ON provincial_ghg_emissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE generation_source_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_source_emissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS generation_source_emissions_read_only ON generation_source_emissions;

CREATE POLICY generation_source_emissions_read_only
  ON generation_source_emissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE carbon_reduction_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_reduction_targets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carbon_reduction_targets_read_only ON carbon_reduction_targets;

CREATE POLICY carbon_reduction_targets_read_only
  ON carbon_reduction_targets
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE avoided_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoided_emissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avoided_emissions_read_only ON avoided_emissions;

CREATE POLICY avoided_emissions_read_only
  ON avoided_emissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON provincial_emissions_summary TO anon, authenticated;

-- ================================
-- IESO QUEUE / PROCUREMENT TABLES
-- ================================

ALTER TABLE ieso_interconnection_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ieso_interconnection_queue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ieso_interconnection_queue_read_only ON ieso_interconnection_queue;

CREATE POLICY ieso_interconnection_queue_read_only
  ON ieso_interconnection_queue
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE ieso_procurement_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ieso_procurement_programs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ieso_procurement_programs_read_only ON ieso_procurement_programs;

CREATE POLICY ieso_procurement_programs_read_only
  ON ieso_procurement_programs
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE provincial_interconnection_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincial_interconnection_queues FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provincial_interconnection_queues_read_only ON provincial_interconnection_queues;

CREATE POLICY provincial_interconnection_queues_read_only
  ON provincial_interconnection_queues
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON ieso_queue_summary TO anon, authenticated;
GRANT SELECT ON ieso_procurement_summary TO anon, authenticated;

-- ================================
-- CER / CLIMATE POLICY TABLES
-- ================================

ALTER TABLE cer_compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cer_compliance_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cer_compliance_records_read_only ON cer_compliance_records;

CREATE POLICY cer_compliance_records_read_only
  ON cer_compliance_records
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE climate_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS climate_policies_read_only ON climate_policies;

CREATE POLICY climate_policies_read_only
  ON climate_policies
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_cache_public_read ON api_cache;

-- No public policies on api_cache; only elevated roles (service_role, postgres) should use it.

-- ================================
-- STAGE 3 SCAFFOLD: API USAGE TABLE
-- ================================

CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  user_id uuid,
  api_key TEXT,
  ip_address TEXT,
  method TEXT,
  status_code INTEGER,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  extra JSONB
);

CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_time
  ON api_usage (endpoint, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_time
  ON api_usage (user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_ip_time
  ON api_usage (ip_address, requested_at DESC);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON api_usage FROM PUBLIC;
REVOKE ALL ON api_usage FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON api_usage TO service_role;
