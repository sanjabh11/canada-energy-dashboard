-- FIX: Add missing columns to province_configs table
-- Run this in Supabase SQL Editor before continuing migrations

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- reserve_margin_percent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'reserve_margin_percent') THEN
    ALTER TABLE public.province_configs ADD COLUMN reserve_margin_percent double precision NOT NULL DEFAULT 15.0;
  END IF;

  -- avg_wholesale_price_cad_per_mwh
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'avg_wholesale_price_cad_per_mwh') THEN
    ALTER TABLE public.province_configs ADD COLUMN avg_wholesale_price_cad_per_mwh double precision NOT NULL DEFAULT 50.0;
  END IF;

  -- curtailment_threshold_mw
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'curtailment_threshold_mw') THEN
    ALTER TABLE public.province_configs ADD COLUMN curtailment_threshold_mw double precision NOT NULL DEFAULT 100.0;
  END IF;

  -- peak_demand_mw
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'peak_demand_mw') THEN
    ALTER TABLE public.province_configs ADD COLUMN peak_demand_mw double precision;
  END IF;

  -- installed_renewable_capacity_mw
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'installed_renewable_capacity_mw') THEN
    ALTER TABLE public.province_configs ADD COLUMN installed_renewable_capacity_mw double precision;
  END IF;

  -- indicative_price_curve_json
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'indicative_price_curve_json') THEN
    ALTER TABLE public.province_configs ADD COLUMN indicative_price_curve_json jsonb;
  END IF;

  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'created_at') THEN
    ALTER TABLE public.province_configs ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'province_configs' AND column_name = 'updated_at') THEN
    ALTER TABLE public.province_configs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Upsert seed data for Canadian provinces
INSERT INTO public.province_configs (
  province, reserve_margin_percent, avg_wholesale_price_cad_per_mwh,
  curtailment_threshold_mw, peak_demand_mw, installed_renewable_capacity_mw,
  indicative_price_curve_json
) VALUES
  ('ON', 18.5, 45.20, 150.0, 26000, 8500, '{"off_peak": 20.5, "mid_peak": 45.2, "on_peak": 85.3, "negative_pricing_threshold": -10.0}'::jsonb),
  ('AB', 12.0, 65.80, 200.0, 12000, 5200, '{"off_peak": 35.0, "mid_peak": 65.8, "on_peak": 120.5, "negative_pricing_threshold": -5.0}'::jsonb),
  ('BC', 25.0, 35.50, 100.0, 11000, 3100, '{"off_peak": 25.0, "mid_peak": 35.5, "on_peak": 55.0, "negative_pricing_threshold": 0.0}'::jsonb),
  ('QC', 30.0, 28.90, 120.0, 42000, 4800, '{"off_peak": 18.0, "mid_peak": 28.9, "on_peak": 48.5, "negative_pricing_threshold": 0.0}'::jsonb),
  ('MB', 22.0, 32.00, 80.0, 5500, 1200, '{"off_peak": 22.0, "mid_peak": 32.0, "on_peak": 52.0, "negative_pricing_threshold": 0.0}'::jsonb),
  ('SK', 15.0, 55.00, 100.0, 4000, 1800, '{"off_peak": 38.0, "mid_peak": 55.0, "on_peak": 85.0, "negative_pricing_threshold": 0.0}'::jsonb),
  ('NS', 18.0, 72.00, 50.0, 2500, 900, '{"off_peak": 52.0, "mid_peak": 72.0, "on_peak": 105.0, "negative_pricing_threshold": 0.0}'::jsonb),
  ('NB', 20.0, 68.00, 60.0, 3200, 750, '{"off_peak": 48.0, "mid_peak": 68.0, "on_peak": 95.0, "negative_pricing_threshold": 0.0}'::jsonb)
ON CONFLICT (province) DO UPDATE SET
  reserve_margin_percent = EXCLUDED.reserve_margin_percent,
  avg_wholesale_price_cad_per_mwh = EXCLUDED.avg_wholesale_price_cad_per_mwh,
  curtailment_threshold_mw = EXCLUDED.curtailment_threshold_mw,
  peak_demand_mw = EXCLUDED.peak_demand_mw,
  installed_renewable_capacity_mw = EXCLUDED.installed_renewable_capacity_mw,
  indicative_price_curve_json = EXCLUDED.indicative_price_curve_json,
  updated_at = now();

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_province_configs_province ON public.province_configs(province);

-- Done
SELECT 'province_configs table fixed and seeded' AS status;
