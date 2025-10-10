-- Weather Observations Table
-- Stores hourly weather data for renewable energy forecasting

BEGIN;

-- Create weather_observations table
CREATE TABLE IF NOT EXISTS public.weather_observations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  timestamp timestamptz NOT NULL,
  temperature_c double precision,
  wind_speed_kmh double precision,
  wind_direction_degrees int,
  cloud_cover_percent double precision,
  solar_irradiance_w_m2 double precision,
  humidity_percent double precision,
  pressure_hpa double precision,
  data_source text NOT NULL CHECK (data_source IN ('eccc', 'open_meteo', 'noaa', 'manual', 'calibrated')),
  confidence_score double precision DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  provenance text NOT NULL CHECK (provenance IN ('real_time', 'historical_archive', 'forecast', 'indicative')),
  quality_flags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(province, timestamp, data_source)
);

-- Add RLS policies
ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather observations are viewable by everyone"
  ON public.weather_observations FOR SELECT
  USING (true);

CREATE POLICY "Weather observations are insertable by service role"
  ON public.weather_observations FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weather_observations_province_timestamp 
  ON public.weather_observations(province, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_weather_observations_timestamp 
  ON public.weather_observations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_weather_observations_data_source 
  ON public.weather_observations(data_source);

CREATE INDEX IF NOT EXISTS idx_weather_observations_provenance 
  ON public.weather_observations(provenance);

-- Add helpful comment
COMMENT ON TABLE public.weather_observations IS 'Hourly weather observations for renewable energy forecasting. Includes confidence scores and provenance tracking for award evidence.';

COMMENT ON COLUMN public.weather_observations.confidence_score IS 'Confidence score (0-1) based on data age, source reliability, and calibration status. 1.0 = real-time from primary source, 0.7 = historical archive, 0.5 = forecast/indicative.';

COMMENT ON COLUMN public.weather_observations.quality_flags IS 'JSON object with quality indicators: {"missing_fields": [], "out_of_range": [], "calibrated": true, "age_hours": 0.5}';

-- Seed with sample data for testing
INSERT INTO public.weather_observations (
  province,
  timestamp,
  temperature_c,
  wind_speed_kmh,
  wind_direction_degrees,
  cloud_cover_percent,
  solar_irradiance_w_m2,
  humidity_percent,
  pressure_hpa,
  data_source,
  confidence_score,
  provenance,
  quality_flags
) VALUES
  -- Ontario sample
  (
    'ON',
    now() - interval '1 hour',
    15.5,
    22.3,
    180,
    45.0,
    650.0,
    68.0,
    1013.25,
    'eccc',
    0.95,
    'real_time',
    '{"calibrated": true, "age_hours": 1.0, "missing_fields": []}'::jsonb
  ),
  (
    'ON',
    now() - interval '2 hours',
    14.8,
    20.1,
    175,
    52.0,
    580.0,
    70.0,
    1013.50,
    'eccc',
    0.90,
    'real_time',
    '{"calibrated": true, "age_hours": 2.0, "missing_fields": []}'::jsonb
  ),
  -- Alberta sample
  (
    'AB',
    now() - interval '1 hour',
    12.2,
    35.5,
    270,
    25.0,
    720.0,
    45.0,
    1010.00,
    'eccc',
    0.95,
    'real_time',
    '{"calibrated": true, "age_hours": 1.0, "missing_fields": []}'::jsonb
  ),
  -- BC sample
  (
    'BC',
    now() - interval '1 hour',
    18.0,
    15.8,
    90,
    65.0,
    420.0,
    75.0,
    1015.00,
    'eccc',
    0.95,
    'real_time',
    '{"calibrated": true, "age_hours": 1.0, "missing_fields": []}'::jsonb
  ),
  -- Quebec sample
  (
    'QC',
    now() - interval '1 hour',
    13.5,
    18.2,
    200,
    55.0,
    550.0,
    72.0,
    1012.75,
    'eccc',
    0.95,
    'real_time',
    '{"calibrated": true, "age_hours": 1.0, "missing_fields": []}'::jsonb
  )
ON CONFLICT (province, timestamp, data_source) DO NOTHING;

COMMIT;
