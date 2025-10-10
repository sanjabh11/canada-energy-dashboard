-- Province Configurations Table
-- Stores province-specific parameters for curtailment detection and economics

BEGIN;

-- Create province_configs table
CREATE TABLE IF NOT EXISTS public.province_configs (
  province text PRIMARY KEY,
  reserve_margin_percent double precision NOT NULL DEFAULT 15.0,
  avg_wholesale_price_cad_per_mwh double precision NOT NULL DEFAULT 50.0,
  curtailment_threshold_mw double precision NOT NULL DEFAULT 100.0,
  peak_demand_mw double precision NOT NULL,
  installed_renewable_capacity_mw double precision NOT NULL,
  indicative_price_curve_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.province_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Province configs are viewable by everyone"
  ON public.province_configs FOR SELECT
  USING (true);

-- Seed with realistic Canadian province data
INSERT INTO public.province_configs (
  province,
  reserve_margin_percent,
  avg_wholesale_price_cad_per_mwh,
  curtailment_threshold_mw,
  peak_demand_mw,
  installed_renewable_capacity_mw,
  indicative_price_curve_json
) VALUES
  -- Ontario (IESO)
  (
    'ON',
    18.5,
    45.20,
    150.0,
    26000,
    8500,
    '{
      "off_peak": 20.5,
      "mid_peak": 45.2,
      "on_peak": 85.3,
      "negative_pricing_threshold": -10.0
    }'::jsonb
  ),
  -- Alberta (AESO)
  (
    'AB',
    12.0,
    65.80,
    200.0,
    12000,
    5200,
    '{
      "off_peak": 35.0,
      "mid_peak": 65.8,
      "on_peak": 120.5,
      "negative_pricing_threshold": -5.0
    }'::jsonb
  ),
  -- British Columbia (BC Hydro)
  (
    'BC',
    25.0,
    35.50,
    100.0,
    11000,
    3100,
    '{
      "off_peak": 25.0,
      "mid_peak": 35.5,
      "on_peak": 55.0,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  ),
  -- Quebec (Hydro-Quebec)
  (
    'QC',
    30.0,
    28.90,
    120.0,
    42000,
    4800,
    '{
      "off_peak": 18.0,
      "mid_peak": 28.9,
      "on_peak": 48.5,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  ),
  -- Manitoba (Manitoba Hydro)
  (
    'MB',
    22.0,
    32.00,
    80.0,
    5500,
    1200,
    '{
      "off_peak": 22.0,
      "mid_peak": 32.0,
      "on_peak": 52.0,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  ),
  -- Saskatchewan (SaskPower)
  (
    'SK',
    15.0,
    55.00,
    100.0,
    4000,
    1800,
    '{
      "off_peak": 38.0,
      "mid_peak": 55.0,
      "on_peak": 85.0,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  ),
  -- Nova Scotia (Nova Scotia Power)
  (
    'NS',
    18.0,
    72.00,
    50.0,
    2500,
    900,
    '{
      "off_peak": 52.0,
      "mid_peak": 72.0,
      "on_peak": 105.0,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  ),
  -- New Brunswick (NB Power)
  (
    'NB',
    20.0,
    68.00,
    60.0,
    3200,
    750,
    '{
      "off_peak": 48.0,
      "mid_peak": 68.0,
      "on_peak": 95.0,
      "negative_pricing_threshold": 0.0
    }'::jsonb
  )
ON CONFLICT (province) DO UPDATE SET
  reserve_margin_percent = EXCLUDED.reserve_margin_percent,
  avg_wholesale_price_cad_per_mwh = EXCLUDED.avg_wholesale_price_cad_per_mwh,
  curtailment_threshold_mw = EXCLUDED.curtailment_threshold_mw,
  peak_demand_mw = EXCLUDED.peak_demand_mw,
  installed_renewable_capacity_mw = EXCLUDED.installed_renewable_capacity_mw,
  indicative_price_curve_json = EXCLUDED.indicative_price_curve_json,
  updated_at = now();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_province_configs_province ON public.province_configs(province);

-- Add helpful comment
COMMENT ON TABLE public.province_configs IS 'Province-specific configuration for curtailment detection and economic calculations. Sources: IESO, AESO, BC Hydro, Hydro-Quebec annual reports 2024.';

COMMIT;
