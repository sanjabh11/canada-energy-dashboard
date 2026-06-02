-- Fix app-owned PL/pgSQL lint defects found by `supabase db lint --linked`.
-- Extension-owned PostGIS/long-transaction findings are intentionally left to
-- extension lifecycle management; this migration only patches CEIP functions.

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
SET search_path = public
AS $$
DECLARE
  asset_record record;
  climate_record record;
BEGIN
  SELECT *
  INTO asset_record
  FROM public.resilience_assets AS ra
  WHERE ra.id = calculate_resilience_score.asset_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  SELECT *
  INTO climate_record
  FROM public.climate_projections AS cp
  WHERE cp.region = asset_record.province
    AND cp.scenario_name = calculate_resilience_score.climate_scenario
  ORDER BY cp.last_updated DESC
  LIMIT 1;

  DECLARE
    physical_score numeric := 100;
    calculated_climate_risk numeric := 0;
    calculated_operational_risk numeric := 0;
    adaptive_score numeric := 50;
    priority text := 'medium';
  BEGIN
    IF asset_record.age_years > 50 THEN
      physical_score := physical_score * 0.7;
    ELSIF asset_record.age_years > 30 THEN
      physical_score := physical_score * 0.85;
    END IF;

    IF asset_record.redundancy_level = 'full' THEN
      physical_score := physical_score * 1.2;
    ELSIF asset_record.redundancy_level = 'partial' THEN
      physical_score := physical_score * 1.1;
    END IF;

    calculated_climate_risk := CASE
      WHEN asset_record.flood_risk_level = 'high' THEN 80
      WHEN asset_record.flood_risk_level = 'medium' THEN 50
      ELSE 20
    END + CASE
      WHEN asset_record.storm_risk_level = 'high' THEN 70
      WHEN asset_record.storm_risk_level = 'medium' THEN 40
      ELSE 15
    END;

    calculated_operational_risk := CASE asset_record.criticality_level
      WHEN 'critical' THEN 90
      WHEN 'high' THEN 70
      WHEN 'medium' THEN 40
      ELSE 20
    END;

    IF asset_record.backup_power_available THEN
      calculated_operational_risk := calculated_operational_risk * 0.7;
    END IF;

    IF asset_record.last_inspection_date IS NOT NULL THEN
      adaptive_score := 80;
    ELSE
      adaptive_score := 30;
    END IF;

    DECLARE
      calculated_overall_score numeric :=
        (physical_score * 0.4)
        + (adaptive_score * 0.3)
        + ((100 - calculated_climate_risk) * 0.2)
        + ((100 - calculated_operational_risk) * 0.1);
    BEGIN
      IF calculated_overall_score < 30 OR calculated_climate_risk > 70 OR calculated_operational_risk > 80 THEN
        priority := 'critical';
      ELSIF calculated_overall_score < 50 OR calculated_climate_risk > 50 OR calculated_operational_risk > 60 THEN
        priority := 'high';
      ELSIF calculated_overall_score < 70 THEN
        priority := 'medium';
      ELSE
        priority := 'low';
      END IF;

      RETURN QUERY
      SELECT
        asset_record.asset_name,
        GREATEST(0, LEAST(100, calculated_overall_score))::numeric(5,2),
        GREATEST(0, LEAST(100, calculated_climate_risk))::numeric(5,2),
        GREATEST(0, LEAST(100, calculated_operational_risk))::numeric(5,2),
        GREATEST(0, LEAST(100, physical_score))::numeric(5,2),
        GREATEST(0, LEAST(100, adaptive_score))::numeric(5,2),
        priority;
    END;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supply_chain_completeness(target_mineral text)
RETURNS TABLE(
  stage text,
  has_domestic_capacity boolean,
  facility_count bigint
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    stages.stage::text,
    COUNT(msc.*) > 0 AS has_domestic_capacity,
    COUNT(msc.*) AS facility_count
  FROM (
    VALUES ('Mining'), ('Concentration'), ('Refining'), ('Processing'), ('Manufacturing'), ('Recycling')
  ) AS stages(stage)
  LEFT JOIN public.minerals_supply_chain AS msc
    ON msc.stage = stages.stage
    AND msc.mineral = get_supply_chain_completeness.target_mineral
    AND msc.country = 'Canada'
    AND msc.status IN ('Operational', 'Under Construction', 'Expansion')
  GROUP BY stages.stage
  ORDER BY
    CASE stages.stage
      WHEN 'Mining' THEN 1
      WHEN 'Concentration' THEN 2
      WHEN 'Refining' THEN 3
      WHEN 'Processing' THEN 4
      WHEN 'Manufacturing' THEN 5
      WHEN 'Recycling' THEN 6
    END;
END;
$$;
