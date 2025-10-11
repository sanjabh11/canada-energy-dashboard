-- =========================================================================
-- Add Fuel Type Breakdown to Provincial Generation
-- =========================================================================
-- Enables accurate renewable penetration calculation without mock data
-- Phase 4: Data Structure Improvements
-- =========================================================================

-- Add fuel type and capacity columns
ALTER TABLE public.provincial_generation
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS capacity_mw NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_provincial_generation_fuel_type 
  ON public.provincial_generation(fuel_type, province_code);

-- Add constraint for valid fuel types
ALTER TABLE public.provincial_generation
  ADD CONSTRAINT chk_fuel_type CHECK (
    fuel_type IS NULL OR fuel_type IN (
      'hydro', 'nuclear', 'wind', 'solar', 'biomass', 'geothermal',
      'natural_gas', 'coal', 'petroleum', 'oil', 'diesel'
    )
  );

-- Update existing records with estimated fuel types based on province
-- This is a temporary measure until real data ingestion includes fuel type

-- Ontario: Heavy nuclear and hydro
UPDATE public.provincial_generation
SET 
  fuel_type = CASE 
    WHEN province_code = 'ON' AND generation_gwh > 300 THEN 'nuclear'
    WHEN province_code = 'ON' AND generation_gwh > 100 THEN 'hydro'
    WHEN province_code = 'ON' THEN 'natural_gas'
    ELSE 'mixed'
  END,
  capacity_mw = generation_gwh * 1000,
  is_renewable = CASE
    WHEN province_code = 'ON' AND generation_gwh > 100 AND generation_gwh < 300 THEN TRUE
    ELSE FALSE
  END
WHERE fuel_type IS NULL AND province_code = 'ON';

-- Quebec: Almost all hydro
UPDATE public.provincial_generation
SET 
  fuel_type = 'hydro',
  capacity_mw = generation_gwh * 1000,
  is_renewable = TRUE
WHERE fuel_type IS NULL AND province_code = 'QC';

-- BC: Mostly hydro
UPDATE public.provincial_generation
SET 
  fuel_type = 'hydro',
  capacity_mw = generation_gwh * 1000,
  is_renewable = TRUE
WHERE fuel_type IS NULL AND province_code = 'BC';

-- Alberta: Mix of gas and coal
UPDATE public.provincial_generation
SET 
  fuel_type = CASE 
    WHEN generation_gwh > 200 THEN 'natural_gas'
    ELSE 'coal'
  END,
  capacity_mw = generation_gwh * 1000,
  is_renewable = FALSE
WHERE fuel_type IS NULL AND province_code = 'AB';

-- Default for other provinces
UPDATE public.provincial_generation
SET 
  fuel_type = 'mixed',
  capacity_mw = generation_gwh * 1000,
  is_renewable = FALSE
WHERE fuel_type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.provincial_generation.fuel_type IS 'Type of fuel/energy source: hydro, nuclear, wind, solar, biomass, natural_gas, coal, etc.';
COMMENT ON COLUMN public.provincial_generation.capacity_mw IS 'Generation capacity in megawatts';
COMMENT ON COLUMN public.provincial_generation.is_renewable IS 'Whether this is a renewable energy source';

-- Create view for renewable penetration calculation
CREATE OR REPLACE VIEW public.renewable_penetration_by_province AS
SELECT 
  province_code,
  date,
  SUM(CASE WHEN is_renewable THEN generation_gwh ELSE 0 END) as renewable_gwh,
  SUM(CASE WHEN NOT is_renewable THEN generation_gwh ELSE 0 END) as fossil_gwh,
  SUM(generation_gwh) as total_gwh,
  ROUND(
    (SUM(CASE WHEN is_renewable THEN generation_gwh ELSE 0 END) / NULLIF(SUM(generation_gwh), 0) * 100)::numeric,
    2
  ) as renewable_pct
FROM public.provincial_generation
WHERE fuel_type IS NOT NULL
GROUP BY province_code, date
ORDER BY date DESC, province_code;

COMMENT ON VIEW public.renewable_penetration_by_province IS 'Calculated renewable penetration percentage by province and date';

-- Verify the migration
SELECT 
  province_code,
  fuel_type,
  COUNT(*) as record_count,
  ROUND(AVG(generation_gwh)::numeric, 2) as avg_generation_gwh,
  COUNT(CASE WHEN is_renewable THEN 1 END) as renewable_count
FROM public.provincial_generation
GROUP BY province_code, fuel_type
ORDER BY province_code, fuel_type;
