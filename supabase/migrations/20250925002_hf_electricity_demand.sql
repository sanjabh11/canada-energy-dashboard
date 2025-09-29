-- HuggingFace electricity demand reference table

BEGIN;

CREATE TABLE IF NOT EXISTS public.hf_electricity_demand (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  datetime timestamptz NOT NULL,
  electricity_demand numeric(10,2) NOT NULL,
  temperature numeric(6,2) NOT NULL,
  humidity numeric(6,2) NOT NULL,
  wind_speed numeric(6,2) NOT NULL,
  solar_irradiance numeric(10,2) NOT NULL,
  household_id text NOT NULL,
  location text NOT NULL,
  day_of_week integer NOT NULL,
  hour integer NOT NULL,
  source text DEFAULT 'huggingface',
  version text DEFAULT '1.0'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_demand_datetime_household
  ON public.hf_electricity_demand (datetime, household_id);

INSERT INTO public.hf_electricity_demand (
  datetime,
  electricity_demand,
  temperature,
  humidity,
  wind_speed,
  solar_irradiance,
  household_id,
  location,
  day_of_week,
  hour,
  source,
  version
)
VALUES
  ('2025-09-25T12:00:00Z', 982.5, 18.4, 55.0, 5.2, 420.0, 'hh-001', 'ottawa', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:05:00Z', 988.7, 18.6, 54.2, 5.4, 430.0, 'hh-001', 'ottawa', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:10:00Z', 995.1, 18.8, 53.5, 5.5, 445.0, 'hh-001', 'ottawa', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:00:00Z', 912.3, 17.9, 58.0, 6.1, 400.0, 'hh-214', 'toronto', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:05:00Z', 919.8, 18.2, 57.1, 6.2, 412.0, 'hh-214', 'toronto', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:10:00Z', 927.4, 18.5, 56.4, 6.4, 425.0, 'hh-214', 'toronto', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:00:00Z', 1034.2, 17.1, 49.0, 4.8, 405.0, 'hh-387', 'sudbury', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:05:00Z', 1040.6, 17.3, 48.2, 4.9, 412.0, 'hh-387', 'sudbury', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:10:00Z', 1047.8, 17.5, 47.5, 5.0, 420.0, 'hh-387', 'sudbury', 4, 12, 'huggingface', '1.0-seed'),
  ('2025-09-25T12:15:00Z', 1054.3, 17.7, 46.8, 5.1, 432.0, 'hh-387', 'sudbury', 4, 12, 'huggingface', '1.0-seed')
ON CONFLICT (datetime, household_id) DO UPDATE
SET electricity_demand = EXCLUDED.electricity_demand,
    temperature = EXCLUDED.temperature,
    humidity = EXCLUDED.humidity,
    wind_speed = EXCLUDED.wind_speed,
    solar_irradiance = EXCLUDED.solar_irradiance,
    location = EXCLUDED.location,
    day_of_week = EXCLUDED.day_of_week,
    hour = EXCLUDED.hour,
    version = EXCLUDED.version;

COMMIT;
