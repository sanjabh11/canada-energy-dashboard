-- Resilience assets enrichment and hazard assessments seed

BEGIN;

-- Ensure uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extend resilience_assets table with geo and lifecycle fields
ALTER TABLE public.resilience_assets
  ADD COLUMN IF NOT EXISTS asset_uuid uuid DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS dependents integer,
  ADD COLUMN IF NOT EXISTS current_condition numeric,
  ADD COLUMN IF NOT EXISTS criticality_score numeric,
  ADD COLUMN IF NOT EXISTS climate_region text,
  ADD COLUMN IF NOT EXISTS population_served integer;

-- Create hazard assessment table capturing scenario metrics
DO $$
DECLARE
  asset_id_type text;
BEGIN
  SELECT format_type(a.atttypid, NULL)
    INTO asset_id_type
  FROM pg_attribute a
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'resilience_assets'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped
  LIMIT 1;

  IF asset_id_type IS NULL THEN
    asset_id_type := 'uuid';
  ELSIF asset_id_type IN ('int4','integer') THEN
    asset_id_type := 'integer';
  ELSIF asset_id_type IN ('int8','bigint') THEN
    asset_id_type := 'bigint';
  ELSIF asset_id_type IN ('int2','smallint') THEN
    asset_id_type := 'smallint';
  ELSIF asset_id_type <> 'uuid' THEN
    RAISE NOTICE 'Unexpected resilience_assets.id type %, defaulting to uuid', asset_id_type;
    asset_id_type := 'uuid';
  END IF;

  EXECUTE format($SQL$
    CREATE TABLE IF NOT EXISTS public.resilience_hazard_assessments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id %s REFERENCES public.resilience_assets(id) ON DELETE CASCADE,
      asset_uuid uuid,
      scenario text NOT NULL,
      time_horizon_years integer NOT NULL,
      flooding numeric,
      wildfire numeric,
      hurricane numeric,
      sea_level_rise numeric,
      extreme_heat numeric,
      drought numeric,
      landslide numeric,
      erosion numeric,
      overall_risk numeric,
      generated_at timestamptz DEFAULT now()
    )
  $SQL$, asset_id_type);
END $$;

CREATE INDEX IF NOT EXISTS idx_resilience_hazard_asset_scenario
  ON public.resilience_hazard_assessments (asset_id, scenario, time_horizon_years);

-- Add unique constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'resilience_hazard_assessments_asset_scenario_key'
  ) THEN
    ALTER TABLE public.resilience_hazard_assessments
      ADD CONSTRAINT resilience_hazard_assessments_asset_scenario_key 
      UNIQUE (asset_id, scenario, time_horizon_years);
  END IF;
END$$;

-- Seed reference assets (idempotent)
INSERT INTO public.resilience_assets (id, name, location, vulnerability_score, adaptation_cost, asset_type, latitude, longitude, dependents, current_condition, criticality_score, climate_region, population_served)
VALUES
  (1, 'Toronto Downtown Grid Network', 'Toronto, ON', 72.5, 450000000, 'power_grid', 43.6532, -79.3832, 250000, 8.2, 9.5, 'Great Lakes', 250000),
  (2, 'Greater Toronto Water Treatment', 'Toronto, ON', 65.4, 310000000, 'water_systems', 43.6828, -79.3872, 180000, 8.8, 8.7, 'Great Lakes', 180000),
  (3, 'Highway 401 Bridge Infrastructure', 'Ontario, CA', 58.3, 210000000, 'transportation', 43.7350, -79.4408, 95000, 7.5, 8.2, 'Southern Shield', 95000),
  (4, 'Ontario Hydro Transmission Line', 'Central Ontario', 69.1, 275000000, 'power_grid', 44.5000, -79.5000, 120000, 7.8, 8.9, 'Central Shield', 120000)
ON CONFLICT (id) DO UPDATE
SET
  location = EXCLUDED.location,
  vulnerability_score = EXCLUDED.vulnerability_score,
  adaptation_cost = EXCLUDED.adaptation_cost,
  asset_type = EXCLUDED.asset_type,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  dependents = EXCLUDED.dependents,
  current_condition = EXCLUDED.current_condition,
  criticality_score = EXCLUDED.criticality_score,
  climate_region = EXCLUDED.climate_region,
  population_served = EXCLUDED.population_served;

-- Link legacy rows without asset_uuid to generated value
UPDATE public.resilience_assets
SET asset_uuid = COALESCE(asset_uuid, uuid_generate_v4());

-- Seed hazard assessments
INSERT INTO public.resilience_hazard_assessments (
  asset_id,
  asset_uuid,
  scenario,
  time_horizon_years,
  flooding,
  wildfire,
  hurricane,
  sea_level_rise,
  extreme_heat,
  drought,
  landslide,
  erosion,
  overall_risk,
  generated_at
)
SELECT
  rs.id,
  rs.asset_uuid,
  scenario_data.scenario,
  scenario_data.horizon,
  scenario_data.flooding,
  scenario_data.wildfire,
  scenario_data.hurricane,
  scenario_data.sea_level_rise,
  scenario_data.extreme_heat,
  scenario_data.drought,
  scenario_data.landslide,
  scenario_data.erosion,
  scenario_data.overall_risk,
  now()
FROM public.resilience_assets rs
CROSS JOIN LATERAL (
  VALUES
    ('current_2c', 10, 62, 35, 18, 25, 54, 28, 14, 21, 68),
    ('current_2c', 20, 68, 42, 22, 32, 60, 30, 18, 24, 72),
    ('high_emissions_4c', 20, 78, 58, 28, 44, 72, 45, 21, 33, 82),
    ('high_emissions_4c', 30, 85, 63, 34, 52, 80, 50, 27, 38, 88),
    ('ambitious_1_5c', 20, 54, 28, 16, 20, 46, 22, 12, 18, 60)
) AS scenario_data (scenario, horizon, flooding, wildfire, hurricane, sea_level_rise, extreme_heat, drought, landslide, erosion, overall_risk)
ON CONFLICT (asset_id, scenario, time_horizon_years)
DO UPDATE SET
  flooding = EXCLUDED.flooding,
  wildfire = EXCLUDED.wildfire,
  hurricane = EXCLUDED.hurricane,
  sea_level_rise = EXCLUDED.sea_level_rise,
  extreme_heat = EXCLUDED.extreme_heat,
  drought = EXCLUDED.drought,
  landslide = EXCLUDED.landslide,
  erosion = EXCLUDED.erosion,
  overall_risk = EXCLUDED.overall_risk,
  generated_at = EXCLUDED.generated_at;

COMMIT;
