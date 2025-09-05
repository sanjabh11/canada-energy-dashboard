-- Resilience and Climate Data Schema Migration
-- Run this in Supabase SQL Editor to create tables for infrastructure resilience analysis
-- This migration is idempotent and can be run multiple times safely

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- resilience_assets table - infrastructure assets for resilience analysis
CREATE TABLE IF NOT EXISTS public.resilience_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_name text NOT NULL,
  asset_type text NOT NULL, -- e.g. 'power_plant', 'transmission_line', 'substation', 'distribution_network'
  province text NOT NULL,
  municipality text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  description text,
  criticality_level text DEFAULT 'medium', -- low, medium, high, critical
  infrastructure_type text NOT NULL, -- power, water, transportation, communication

  -- Physical characteristics
  age_years integer,
  replacement_cost numeric(15,2), -- in CAD
  capacity_mw numeric(10,2), -- for power assets
  length_km numeric(8,2), -- for transmission/distribution lines

  -- Resilience characteristics
  flood_risk_level text DEFAULT 'low', -- low, medium, high
  storm_risk_level text DEFAULT 'low',
  heat_risk_level text DEFAULT 'low',
  cold_risk_level text DEFAULT 'low',
  seismic_risk_level text DEFAULT 'low',

  -- Operational data
  last_inspection_date date,
  next_inspection_date date,
  maintenance_schedule text, -- annual, bi-annual, etc.
  backup_power_available boolean DEFAULT false,
  redundancy_level text DEFAULT 'none', -- none, partial, full

  -- Status and metadata
  operational_status text DEFAULT 'operational', -- operational, maintenance, out_of_service, decommissioned
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- climate_projections table - climate change impact projections
CREATE TABLE IF NOT EXISTS public.climate_projections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name text NOT NULL, -- e.g. 'RCP2.6', 'RCP4.5', 'RCP8.5'
  time_horizon text NOT NULL, -- '2030', '2050', '2080'
  region text NOT NULL, -- province or municipality
  data_source text NOT NULL, -- 'Environment_Canada', 'IPCC', etc.

  -- Temperature projections
  temperature_increase_c numeric(4,2), -- degrees Celsius
  heat_wave_days_increase integer, -- additional heat wave days per year
  cold_snap_days_decrease integer, -- fewer cold snap days per year

  -- Precipitation projections
  precipitation_change_percent numeric(6,2), -- percentage change
  extreme_rainfall_increase_percent numeric(6,2), -- increase in extreme rainfall events

  -- Sea level and flooding
  sea_level_rise_cm numeric(6,2), -- sea level rise in cm
  flood_risk_increase_percent numeric(6,2), -- increase in flood risk

  -- Storm and weather events
  hurricane_intensity_increase text, -- none, low, medium, high
  storm_surge_increase_cm numeric(6,2), -- storm surge increase in cm
  drought_frequency_increase_percent numeric(6,2), -- increase in drought frequency

  -- Impact assessments
  agriculture_impact_score smallint, -- -10 to +10 scale
  infrastructure_impact_score smallint,
  health_impact_score smallint,
  economic_impact_score smallint,

  -- Confidence and metadata
  confidence_level text DEFAULT 'medium', -- low, medium, high
  projection_method text,
  last_updated date,
  created_at timestamptz DEFAULT now()
);

-- resilience_assessments table - calculated resilience scores for assets
CREATE TABLE IF NOT EXISTS public.resilience_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id uuid REFERENCES public.resilience_assets(id) ON DELETE CASCADE,
  assessment_date date NOT NULL,
  climate_scenario text, -- references climate_projections.scenario_name

  -- Resilience scores (0-100 scale)
  overall_resilience_score numeric(5,2),
  physical_resilience_score numeric(5,2), -- ability to withstand physical damage
  operational_resilience_score numeric(5,2), -- ability to maintain operations
  adaptive_capacity_score numeric(5,2), -- ability to adapt to changes
  recovery_capacity_score numeric(5,2), -- ability to recover from disruptions

  -- Risk scores (0-100 scale, higher = higher risk)
  climate_risk_score numeric(5,2),
  operational_risk_score numeric(5,2),
  dependency_risk_score numeric(5,2), -- risk from dependencies on other systems

  -- Vulnerability breakdown
  flood_vulnerability_score numeric(5,2),
  storm_vulnerability_score numeric(5,2),
  heat_vulnerability_score numeric(5,2),
  cold_vulnerability_score numeric(5,2),
  seismic_vulnerability_score numeric(5,2),

  -- Adaptation recommendations
  recommended_actions jsonb, -- array of recommended adaptation measures
  priority_level text DEFAULT 'medium', -- low, medium, high, critical
  estimated_adaptation_cost numeric(15,2),

  -- Assessment metadata
  assessment_methodology text,
  assessor_name text,
  assessor_organization text,
  data_sources jsonb,
  confidence_level text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(asset_id, assessment_date, climate_scenario)
);

-- resilience_scenarios table - simulation scenarios for resilience planning
CREATE TABLE IF NOT EXISTS public.resilience_scenarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name text NOT NULL,
  description text,
  climate_scenario text, -- references climate_projections.scenario_name
  time_horizon text, -- '2030', '2050', '2080'
  region text NOT NULL,

  -- Scenario parameters
  temperature_increase_c numeric(4,2),
  precipitation_change_percent numeric(6,2),
  sea_level_rise_cm numeric(6,2),
  extreme_weather_events_increase_percent numeric(6,2),

  -- Impact projections
  infrastructure_damage_estimate numeric(15,2), -- estimated damage cost
  outage_duration_hours_avg numeric(8,2), -- average outage duration
  affected_population_estimate integer,
  economic_impact_estimate numeric(15,2),

  -- Response planning
  emergency_response_plan text,
  recovery_timeline_days integer,
  adaptation_measures jsonb,

  -- Metadata
  created_by text,
  reviewed_by text,
  approval_status text DEFAULT 'draft', -- draft, reviewed, approved
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resilience_assets_province ON public.resilience_assets (province);
CREATE INDEX IF NOT EXISTS idx_resilience_assets_type ON public.resilience_assets (asset_type);
CREATE INDEX IF NOT EXISTS idx_resilience_assets_criticality ON public.resilience_assets (criticality_level);
CREATE INDEX IF NOT EXISTS idx_resilience_assets_status ON public.resilience_assets (operational_status);

CREATE INDEX IF NOT EXISTS idx_climate_projections_scenario ON public.climate_projections (scenario_name);
CREATE INDEX IF NOT EXISTS idx_climate_projections_region ON public.climate_projections (region);
CREATE INDEX IF NOT EXISTS idx_climate_projections_horizon ON public.climate_projections (time_horizon);

CREATE INDEX IF NOT EXISTS idx_resilience_assessments_asset ON public.resilience_assessments (asset_id);
CREATE INDEX IF NOT EXISTS idx_resilience_assessments_date ON public.resilience_assessments (assessment_date);
CREATE INDEX IF NOT EXISTS idx_resilience_assessments_score ON public.resilience_assessments (overall_resilience_score DESC);

CREATE INDEX IF NOT EXISTS idx_resilience_scenarios_region ON public.resilience_scenarios (region);
CREATE INDEX IF NOT EXISTS idx_resilience_scenarios_status ON public.resilience_scenarios (approval_status);

-- Function to calculate resilience score for an asset
CREATE OR REPLACE FUNCTION public.calculate_resilience_score(
  asset_uuid uuid,
  climate_scenario text DEFAULT 'RCP4.5',
  assessment_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  asset_name text,
  overall_score numeric,
  climate_risk numeric,
  operational_risk numeric,
  physical_resilience numeric,
  adaptive_capacity numeric,
  priority_level text
)
LANGUAGE plpgsql
AS $$
DECLARE
  asset_record record;
  climate_record record;
BEGIN
  -- Get asset details
  SELECT * INTO asset_record
  FROM public.resilience_assets
  WHERE id = asset_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  -- Get climate data for the region
  SELECT * INTO climate_record
  FROM public.climate_projections
  WHERE region = asset_record.province
    AND scenario_name = climate_scenario
  ORDER BY last_updated DESC
  LIMIT 1;

  -- Calculate scores (simplified algorithm)
  -- Physical resilience based on age, redundancy, and climate risks
  DECLARE
    physical_score numeric := 100;
    climate_risk numeric := 0;
    operational_risk numeric := 0;
    adaptive_score numeric := 50;
    priority text := 'medium';
  BEGIN
    -- Age penalty
    IF asset_record.age_years > 50 THEN
      physical_score := physical_score * 0.7;
    ELSIF asset_record.age_years > 30 THEN
      physical_score := physical_score * 0.85;
    END IF;

    -- Redundancy bonus
    IF asset_record.redundancy_level = 'full' THEN
      physical_score := physical_score * 1.2;
    ELSIF asset_record.redundancy_level = 'partial' THEN
      physical_score := physical_score * 1.1;
    END IF;

    -- Climate risk calculation
    climate_risk := CASE
      WHEN asset_record.flood_risk_level = 'high' THEN 80
      WHEN asset_record.flood_risk_level = 'medium' THEN 50
      ELSE 20
    END + CASE
      WHEN asset_record.storm_risk_level = 'high' THEN 70
      WHEN asset_record.storm_risk_level = 'medium' THEN 40
      ELSE 15
    END;

    -- Operational risk based on criticality and backup power
    operational_risk := CASE asset_record.criticality_level
      WHEN 'critical' THEN 90
      WHEN 'high' THEN 70
      WHEN 'medium' THEN 40
      ELSE 20
    END;

    IF asset_record.backup_power_available THEN
      operational_risk := operational_risk * 0.7;
    END IF;

    -- Adaptive capacity based on maintenance and inspection
    IF asset_record.last_inspection_date IS NOT NULL THEN
      adaptive_score := 80;
    ELSE
      adaptive_score := 30;
    END IF;

    -- Overall score calculation
    DECLARE
      overall_score numeric := (physical_score * 0.4) + (adaptive_score * 0.3) + ((100 - climate_risk) * 0.2) + ((100 - operational_risk) * 0.1);
    BEGIN
      -- Priority determination
      IF overall_score < 30 OR climate_risk > 70 OR operational_risk > 80 THEN
        priority := 'critical';
      ELSIF overall_score < 50 OR climate_risk > 50 OR operational_risk > 60 THEN
        priority := 'high';
      ELSIF overall_score < 70 THEN
        priority := 'medium';
      ELSE
        priority := 'low';
      END IF;

      RETURN QUERY
      SELECT
        asset_record.asset_name,
        GREATEST(0, LEAST(100, overall_score))::numeric(5,2),
        GREATEST(0, LEAST(100, climate_risk))::numeric(5,2),
        GREATEST(0, LEAST(100, operational_risk))::numeric(5,2),
        GREATEST(0, LEAST(100, physical_score))::numeric(5,2),
        GREATEST(0, LEAST(100, adaptive_score))::numeric(5,2),
        priority;
    END;
  END;
END;
$$;

-- Seed sample data
INSERT INTO public.resilience_assets (
  asset_name, asset_type, province, latitude, longitude, description,
  criticality_level, infrastructure_type, age_years, capacity_mw,
  flood_risk_level, storm_risk_level, heat_risk_level,
  backup_power_available, redundancy_level
) VALUES
('Ontario Hydro One Substation A', 'substation', 'Ontario', 43.6532, -79.3832, 'Major downtown Toronto substation', 'critical', 'power', 25, 500.0, 'medium', 'medium', 'high', true, 'partial'),
('BC Transmission Line Alpha', 'transmission_line', 'British Columbia', 49.2827, -123.1207, 'Vancouver to Victoria high-voltage line', 'high', 'power', 35, null, 'high', 'high', 'low', false, 'none'),
('Alberta Solar Farm Beta', 'power_plant', 'Alberta', 51.0447, -114.0719, 'Large-scale solar installation near Calgary', 'medium', 'power', 8, 150.0, 'low', 'medium', 'high', true, 'partial'),
('Quebec Hydro Dam Gamma', 'power_plant', 'Quebec', 46.8139, -71.2080, 'Hydroelectric dam on St. Lawrence River', 'critical', 'power', 45, 2000.0, 'medium', 'high', 'low', true, 'full')
ON CONFLICT DO NOTHING;

INSERT INTO public.climate_projections (
  scenario_name, time_horizon, region, data_source,
  temperature_increase_c, heat_wave_days_increase, precipitation_change_percent,
  sea_level_rise_cm, flood_risk_increase_percent,
  infrastructure_impact_score, confidence_level
) VALUES
('RCP4.5', '2050', 'Ontario', 'Environment_Canada', 2.5, 15, 5.0, 25.0, 20.0, -3, 'high'),
('RCP4.5', '2050', 'British Columbia', 'Environment_Canada', 2.2, 12, -5.0, 15.0, 15.0, -2, 'high'),
('RCP4.5', '2050', 'Alberta', 'Environment_Canada', 2.8, 18, -10.0, 5.0, 10.0, -4, 'medium'),
('RCP4.5', '2050', 'Quebec', 'Environment_Canada', 2.3, 14, 8.0, 30.0, 25.0, -3, 'high'),
('RCP8.5', '2050', 'Ontario', 'Environment_Canada', 3.8, 25, 12.0, 35.0, 35.0, -5, 'high'),
('RCP8.5', '2050', 'British Columbia', 'Environment_Canada', 3.5, 22, -2.0, 20.0, 20.0, -4, 'high'),
('RCP8.5', '2050', 'Alberta', 'Environment_Canada', 4.2, 30, -5.0, 8.0, 18.0, -6, 'medium'),
('RCP8.5', '2050', 'Quebec', 'Environment_Canada', 3.6, 24, 15.0, 40.0, 40.0, -5, 'high')
ON CONFLICT DO NOTHING;

COMMIT;
