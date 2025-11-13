-- Province Configuration Table
-- Stores per-province settings for curtailment analysis and dispatch optimization

CREATE TABLE IF NOT EXISTS province_configs (
  province TEXT PRIMARY KEY,
  reserve_margin_pct NUMERIC DEFAULT 10,
  price_curve_profile TEXT DEFAULT 'default',
  timezone TEXT DEFAULT 'America/Toronto',
  curtailment_threshold_mw NUMERIC DEFAULT 50,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE province_configs IS 'Province-specific configuration for energy optimization';
COMMENT ON COLUMN province_configs.reserve_margin_pct IS 'Reserve margin percentage for curtailment detection';
COMMENT ON COLUMN province_configs.price_curve_profile IS 'Price curve profile identifier';

-- Seed initial province configs
INSERT INTO province_configs (province, reserve_margin_pct, price_curve_profile, timezone)
VALUES 
  ('ON', 10, 'default', 'America/Toronto'),
  ('AB', 12, 'default', 'America/Edmonton'),
  ('BC', 8, 'default', 'America/Vancouver'),
  ('QC', 10, 'default', 'America/Montreal'),
  ('MB', 10, 'default', 'America/Winnipeg'),
  ('SK', 12, 'default', 'America/Regina'),
  ('NS', 10, 'default', 'America/Halifax'),
  ('NB', 10, 'default', 'America/Moncton')
ON CONFLICT (province) DO UPDATE 
SET updated_at = now();

-- Battery Registry Table
-- Tracks battery storage assets across provinces

CREATE TABLE IF NOT EXISTS batteries (
  id TEXT PRIMARY KEY,
  province TEXT NOT NULL,
  facility_name TEXT,
  capacity_mwh NUMERIC NOT NULL,
  max_charge_mw NUMERIC NOT NULL,
  max_discharge_mw NUMERIC NOT NULL,
  round_trip_efficiency NUMERIC NOT NULL DEFAULT 0.88,
  latitude NUMERIC,
  longitude NUMERIC,
  operational_status TEXT DEFAULT 'operational' CHECK (operational_status IN ('operational', 'under_construction', 'planned', 'decommissioned')),
  commissioned_date DATE,
  owner_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE batteries IS 'Battery storage asset registry';
COMMENT ON COLUMN batteries.round_trip_efficiency IS 'Round-trip efficiency (0-1), typically 0.85-0.92';

-- Battery State Table
-- Tracks current state of charge for each battery
-- Note: Table already exists with different schema (id UUID, province TEXT)
-- Skip creation if exists, only add missing columns if needed

-- Add battery_id column if it doesn't exist (for future foreign key relationship)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'batteries_state' AND column_name = 'battery_id'
  ) THEN
    ALTER TABLE batteries_state ADD COLUMN battery_id TEXT;
  END IF;
END $$;

COMMENT ON TABLE batteries_state IS 'Current state of charge for batteries';
COMMENT ON COLUMN batteries_state.soc_percent IS 'State of charge percentage (0-100)';
COMMENT ON COLUMN batteries_state.soc_mwh IS 'State of charge in MWh';

-- Storage Dispatch Log Table
-- Records all dispatch decisions and actions

CREATE TABLE IF NOT EXISTS storage_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id TEXT REFERENCES batteries(id) ON DELETE CASCADE,
  province TEXT NOT NULL,
  decision_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('charge','discharge','hold')),
  power_mw NUMERIC,
  duration_hours NUMERIC,
  soc_before_percent NUMERIC,
  soc_after_percent NUMERIC,
  soc_before_mwh NUMERIC,
  soc_after_mwh NUMERIC,
  renewable_absorption BOOLEAN DEFAULT false,
  curtailment_mitigation BOOLEAN DEFAULT false,
  grid_price_cad_per_mwh NUMERIC,
  expected_revenue_cad NUMERIC,
  actual_revenue_cad NUMERIC,
  reasoning TEXT,
  model_version TEXT DEFAULT 'rule_based_v1',
  created_by TEXT DEFAULT 'dispatch_engine',
  dispatched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE storage_dispatch_logs IS 'Historical log of all battery dispatch decisions';
COMMENT ON COLUMN storage_dispatch_logs.renewable_absorption IS 'Whether action absorbed renewable curtailment';
COMMENT ON COLUMN storage_dispatch_logs.curtailment_mitigation IS 'Whether action mitigated curtailment event';

-- Add battery_id column to storage_dispatch_logs if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'storage_dispatch_logs' AND column_name = 'battery_id'
  ) THEN
    ALTER TABLE storage_dispatch_logs ADD COLUMN battery_id TEXT REFERENCES batteries(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_battery_id ON storage_dispatch_logs(battery_id);
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_province ON storage_dispatch_logs(province);
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_dispatched_at ON storage_dispatch_logs(dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_renewable_absorption ON storage_dispatch_logs(renewable_absorption) WHERE renewable_absorption = true;

-- Seed demo battery for Ontario
INSERT INTO batteries (id, province, facility_name, capacity_mwh, max_charge_mw, max_discharge_mw, round_trip_efficiency)
VALUES ('ON_demo_batt', 'ON', 'Ontario Demo Battery', 250, 50, 50, 0.88)
ON CONFLICT (id) DO UPDATE 
SET updated_at = now();

-- Update existing Ontario battery state with battery_id reference
UPDATE batteries_state 
SET battery_id = 'ON_demo_batt',
    soc_percent = 85.2,
    soc_mwh = 213.0,
    capacity_mwh = 250,
    power_rating_mw = 100,
    efficiency_percent = 88,
    last_updated = now()
WHERE province = 'ON';

-- Add RLS policies (if RLS is enabled)
ALTER TABLE province_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_dispatch_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'province_configs' AND policyname = 'Allow public read on province_configs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read on province_configs" ON province_configs FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'batteries' AND policyname = 'Allow public read on batteries'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read on batteries" ON batteries FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'batteries_state' AND policyname = 'Allow public read on batteries_state'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read on batteries_state" ON batteries_state FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'storage_dispatch_logs' AND policyname = 'Allow public read on storage_dispatch_logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read on storage_dispatch_logs" ON storage_dispatch_logs FOR SELECT USING (true)';
  END IF;
END $$;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'province_configs' AND policyname = 'Allow service role all on province_configs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role all on province_configs" ON province_configs FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'batteries' AND policyname = 'Allow service role all on batteries'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role all on batteries" ON batteries FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'batteries_state' AND policyname = 'Allow service role all on batteries_state'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role all on batteries_state" ON batteries_state FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'storage_dispatch_logs' AND policyname = 'Allow service role all on storage_dispatch_logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow service role all on storage_dispatch_logs" ON storage_dispatch_logs FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END $$;
