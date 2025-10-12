-- =====================================================
-- COMPREHENSIVE DATABASE FIXES
-- Date: 2025-10-12
-- Purpose: Fix all missing tables, columns, and constraints
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'grid_snapshots'
  ) THEN
    EXECUTE 'ALTER TABLE grid_snapshots
      ADD COLUMN IF NOT EXISTS curtailment_risk BOOLEAN DEFAULT FALSE';

    EXECUTE 'UPDATE grid_snapshots
      SET curtailment_risk = (renewable_generation_mw > demand_mw * 0.8)
      WHERE curtailment_risk IS NULL';
  END IF;
END $$;

-- 2. Create forecast_performance_metrics table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS forecast_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('solar', 'wind', 'hydro')),
  horizon_hours INTEGER NOT NULL,
  mae NUMERIC,
  mape NUMERIC,
  rmse NUMERIC,
  sample_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_performance_metrics_timestamp 
ON forecast_performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_forecast_performance_metrics_source 
ON forecast_performance_metrics(source_type, province, horizon_hours);

-- 3. Create error_logs table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  component TEXT,
  user_id TEXT,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
ON error_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
ON error_logs(severity, resolved);

-- 4. Create job_execution_log table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS job_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running', 'pending')),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_job_execution_log_executed 
ON job_execution_log(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_execution_log_status 
ON job_execution_log(status, job_name);

-- 5. Create data_purge_log table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS data_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  records_purged INTEGER DEFAULT 0,
  purged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purge_criteria TEXT,
  initiated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_purge_log_purged 
ON data_purge_log(purged_at DESC);

-- 6. Ensure storage_dispatch_log has all required columns
ALTER TABLE IF EXISTS storage_dispatch_log
ADD COLUMN IF NOT EXISTS grid_service_provided TEXT,
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS execution_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS energy_mwh NUMERIC,
ADD COLUMN IF NOT EXISTS revenue_impact_cad NUMERIC;

-- 7. Add completeness tracking to provincial_generation
ALTER TABLE IF EXISTS provincial_generation
ADD COLUMN IF NOT EXISTS data_completeness_percent NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS provenance TEXT DEFAULT 'historical_archive';

-- 8. Create province_configs table for transparency
CREATE TABLE IF NOT EXISTS province_configs (
  province TEXT PRIMARY KEY,
  reserve_margin_pct NUMERIC DEFAULT 18,
  price_curve_profile TEXT DEFAULT 'peak-valley',
  timezone TEXT DEFAULT 'EST',
  curtailment_threshold_mw NUMERIC,
  renewable_target_pct NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS province_configs
  ADD COLUMN IF NOT EXISTS reserve_margin_pct NUMERIC DEFAULT 18,
  ADD COLUMN IF NOT EXISTS price_curve_profile TEXT DEFAULT 'peak-valley',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'EST',
  ADD COLUMN IF NOT EXISTS curtailment_threshold_mw NUMERIC,
  ADD COLUMN IF NOT EXISTS renewable_target_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Insert default configs
INSERT INTO province_configs (province, reserve_margin_pct, price_curve_profile, timezone, renewable_target_pct)
VALUES 
  ('ON', 18, 'peak-valley', 'EST', 92),
  ('QC', 20, 'hydro-dominant', 'EST', 99),
  ('BC', 19, 'hydro-dominant', 'PST', 98),
  ('AB', 15, 'volatile-market', 'MST', 15),
  ('SK', 16, 'coal-transition', 'CST', 25),
  ('MB', 20, 'hydro-dominant', 'CST', 97),
  ('NS', 17, 'coal-transition', 'AST', 35),
  ('NB', 18, 'mixed-nuclear', 'AST', 40)
ON CONFLICT (province) DO NOTHING;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_renewable_forecasts_generated 
ON renewable_forecasts(generated_at DESC, source_type, province);

CREATE INDEX IF NOT EXISTS idx_storage_dispatch_log_timestamp 
ON storage_dispatch_log(decision_timestamp DESC, province);

CREATE INDEX IF NOT EXISTS idx_curtailment_events_occurred 
ON curtailment_events(occurred_at DESC, province);

-- 10. Create view for ops health metrics (only if ontario_demand exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ontario_demand'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW ops_health_summary AS
    SELECT 
      COUNT(DISTINCT DATE(timestamp)) as active_days,
      AVG(CASE WHEN timestamp > NOW() - INTERVAL ''5 minutes'' THEN 1 ELSE 0 END) * 100 as data_freshness_score,
      COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL ''24 hours'') as records_24h
    FROM ontario_demand';
  END IF;
END $$;

-- 11. Grant necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON storage_dispatch_log TO anon, authenticated;
GRANT INSERT ON error_logs TO anon, authenticated;
GRANT INSERT ON job_execution_log TO anon, authenticated;

-- 12. Add comments for documentation

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
