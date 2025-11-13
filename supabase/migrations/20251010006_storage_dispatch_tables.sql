-- Storage Dispatch Tables - Phase 5
-- Minimal battery storage tracking and dispatch logging

-- Battery state tracking table
CREATE TABLE IF NOT EXISTS batteries_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  soc_percent NUMERIC NOT NULL CHECK (soc_percent >= 0 AND soc_percent <= 100),
  soc_mwh NUMERIC NOT NULL CHECK (soc_mwh >= 0),
  capacity_mwh NUMERIC NOT NULL CHECK (capacity_mwh > 0),
  power_rating_mw NUMERIC NOT NULL CHECK (power_rating_mw > 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(province)
);

-- Storage dispatch decision logs
CREATE TABLE IF NOT EXISTS storage_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('charge', 'discharge', 'hold')),
  power_mw NUMERIC NOT NULL CHECK (power_mw >= 0),
  duration_hours NUMERIC NOT NULL CHECK (duration_hours > 0),
  soc_before_percent NUMERIC NOT NULL,
  soc_after_percent NUMERIC NOT NULL,
  soc_before_mwh NUMERIC NOT NULL,
  soc_after_mwh NUMERIC NOT NULL,
  reason TEXT,
  expected_revenue_cad NUMERIC DEFAULT 0,
  actual_revenue_cad NUMERIC,
  renewable_absorption BOOLEAN DEFAULT FALSE,
  curtailment_mitigation BOOLEAN DEFAULT FALSE,
  price_at_dispatch_cad_per_mwh NUMERIC,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batteries_state_province ON batteries_state(province);
CREATE INDEX IF NOT EXISTS idx_batteries_state_updated ON batteries_state(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_province ON storage_dispatch_logs(province);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_dispatched ON storage_dispatch_logs(dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_action ON storage_dispatch_logs(action);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_renewable ON storage_dispatch_logs(renewable_absorption) WHERE renewable_absorption = TRUE;

-- RLS policies
ALTER TABLE batteries_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access to batteries_state"
  ON batteries_state FOR SELECT
  USING (true);

CREATE POLICY "Allow read access to dispatch_logs"
  ON storage_dispatch_logs FOR SELECT
  USING (true);

-- Allow service role full access
CREATE POLICY "Service role full access to batteries_state"
  ON batteries_state FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to dispatch_logs"
  ON storage_dispatch_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add provenance columns to existing tables
ALTER TABLE renewable_forecasts 
  ADD COLUMN IF NOT EXISTS data_provenance TEXT DEFAULT 'simulated',
  ADD COLUMN IF NOT EXISTS completeness_percent NUMERIC;

ALTER TABLE curtailment_events
  ADD COLUMN IF NOT EXISTS data_provenance TEXT DEFAULT 'real_stream',
  ADD COLUMN IF NOT EXISTS price_provenance TEXT DEFAULT 'proxy_indicative';

-- Baseline forecast columns
ALTER TABLE renewable_forecasts
  ADD COLUMN IF NOT EXISTS baseline_persistence_mw NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_seasonal_mw NUMERIC,
  ADD COLUMN IF NOT EXISTS improvement_vs_baseline_percent NUMERIC;

COMMENT ON TABLE batteries_state IS 'Current state of charge for battery storage systems by province';
COMMENT ON TABLE storage_dispatch_logs IS 'Historical log of storage dispatch decisions and actions';
COMMENT ON COLUMN storage_dispatch_logs.renewable_absorption IS 'True if dispatch was triggered by renewable curtailment mitigation';
COMMENT ON COLUMN storage_dispatch_logs.curtailment_mitigation IS 'True if dispatch helped reduce curtailment';
