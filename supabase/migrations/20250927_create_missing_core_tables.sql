-- Create missing core tables for Phase 4 implementation
-- Addresses 404 errors for: provincial_generation, ontario_hourly_demand, alberta_supply_demand, weather_data

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Ontario hourly demand (front-end queries order=hour.desc)
CREATE TABLE IF NOT EXISTS public.ontario_hourly_demand (
  hour timestamptz PRIMARY KEY,
  market_demand_mw double precision,
  ontario_demand_mw double precision,
  created_at timestamptz DEFAULT now()
);

-- 2) Provincial generation (front-end expects date column)
CREATE TABLE IF NOT EXISTS public.provincial_generation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date,
  province_code text,
  source text,
  generation_gwh double precision,
  created_at timestamptz DEFAULT now()
);

-- Clean up duplicates before creating unique index
DELETE FROM public.provincial_generation
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY date, province_code, source ORDER BY created_at DESC) AS rn
    FROM public.provincial_generation
  ) t
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provincial_generation_unique
  ON public.provincial_generation (date, province_code, source);
CREATE INDEX IF NOT EXISTS idx_provincial_generation_date_province ON public.provincial_generation (date, province_code);

-- 3) Alberta supply/demand (front-end ordered by timestamp)
CREATE TABLE IF NOT EXISTS public.alberta_supply_demand (
  timestamp timestamptz PRIMARY KEY,
  total_gen_mw double precision,
  total_demand_mw double precision,
  pool_price_cad double precision,
  created_at timestamptz DEFAULT now()
);

-- 4) Weather data (front-end queries weather_data)
CREATE TABLE IF NOT EXISTS public.weather_data (
  timestamp timestamptz,
  station_id text,
  temperature_c double precision,
  wind_speed_m_s double precision,
  precipitation_mm double precision,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.weather_data
  ADD CONSTRAINT weather_data_pkey PRIMARY KEY (timestamp, station_id);

-- Enable RLS and create permissive read policies for development
ALTER TABLE public.ontario_hourly_demand ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.ontario_hourly_demand
  FOR SELECT USING (true);

ALTER TABLE public.provincial_generation ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.provincial_generation
  FOR SELECT USING (true);

ALTER TABLE public.alberta_supply_demand ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.alberta_supply_demand
  FOR SELECT USING (true);

ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.weather_data
  FOR SELECT USING (true);

-- Also fix resilience tables RLS policies
ALTER TABLE public.resilience_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.resilience_assets
  FOR SELECT USING (true);

ALTER TABLE public.resilience_hazard_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read access" ON public.resilience_hazard_assessments
  FOR SELECT USING (true);

-- Seed some sample data for testing
INSERT INTO public.ontario_hourly_demand (hour, market_demand_mw, ontario_demand_mw) VALUES
  (now() - interval '1 hour', 15234.5, 14987.2),
  (now() - interval '2 hours', 14876.3, 14632.1),
  (now() - interval '3 hours', 14523.7, 14298.4)
ON CONFLICT (hour) DO NOTHING;

INSERT INTO public.provincial_generation (date, province_code, source, generation_gwh) VALUES
  (current_date, 'ON', 'nuclear', 234.5),
  (current_date, 'ON', 'hydro', 156.7),
  (current_date, 'QC', 'hydro', 445.2),
  (current_date, 'AB', 'gas', 123.4)
ON CONFLICT (date, province_code, source) DO UPDATE
  SET generation_gwh = EXCLUDED.generation_gwh,
      created_at = now();

INSERT INTO public.alberta_supply_demand (timestamp, total_gen_mw, total_demand_mw, pool_price_cad) VALUES
  (now() - interval '1 hour', 8234.5, 8187.2, 45.67),
  (now() - interval '2 hours', 8176.3, 8132.1, 42.34),
  (now() - interval '3 hours', 8023.7, 7998.4, 38.91)
ON CONFLICT (timestamp) DO NOTHING;

INSERT INTO public.weather_data (timestamp, station_id, temperature_c, wind_speed_m_s, precipitation_mm) VALUES
  (now() - interval '1 hour', 'YYZ', 12.5, 4.2, 0.0),
  (now() - interval '2 hours', 'YYZ', 11.8, 3.9, 0.2),
  (now() - interval '3 hours', 'YYZ', 11.2, 3.5, 0.1)
ON CONFLICT (timestamp, station_id) DO UPDATE
  SET temperature_c = EXCLUDED.temperature_c,
      wind_speed_m_s = EXCLUDED.wind_speed_m_s,
      precipitation_mm = EXCLUDED.precipitation_mm,
      created_at = now();

COMMIT;
