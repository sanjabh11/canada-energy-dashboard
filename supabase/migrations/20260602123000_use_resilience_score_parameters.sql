-- Keep the resilience RPC signature stable while making both public parameters
-- part of the deterministic score. This closes the remaining app-owned
-- `supabase db lint` unused-parameter warnings after the dead climate lookup
-- was removed.

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
  normalized_scenario text := upper(COALESCE(NULLIF(TRIM(calculate_resilience_score.climate_scenario), ''), 'RCP4.5'));
  effective_assessment_date date := COALESCE(calculate_resilience_score.assessment_date, CURRENT_DATE);
  scenario_multiplier numeric := 1.0;
  inspection_age_years numeric := NULL;
  physical_score numeric := 100;
  calculated_climate_risk numeric := 0;
  calculated_operational_risk numeric := 0;
  adaptive_score numeric := 50;
  calculated_overall_score numeric := 0;
  priority text := 'medium';
BEGIN
  SELECT *
  INTO asset_record
  FROM public.resilience_assets AS ra
  WHERE ra.asset_uuid = calculate_resilience_score.asset_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;

  scenario_multiplier := CASE
    WHEN normalized_scenario IN ('RCP8.5', 'SSP5-8.5', 'HIGH', 'HIGH-RISK') THEN 1.15
    WHEN normalized_scenario IN ('RCP6.0', 'SSP3-7.0', 'MEDIUM-HIGH') THEN 1.08
    WHEN normalized_scenario IN ('RCP2.6', 'SSP1-2.6', 'LOW', 'LOW-RISK') THEN 0.90
    ELSE 1.00
  END;

  IF COALESCE(asset_record.age_years, 0) > 50 THEN
    physical_score := physical_score * 0.7;
  ELSIF COALESCE(asset_record.age_years, 0) > 30 THEN
    physical_score := physical_score * 0.85;
  END IF;

  IF asset_record.redundancy_level = 'full' THEN
    physical_score := physical_score * 1.2;
  ELSIF asset_record.redundancy_level = 'partial' THEN
    physical_score := physical_score * 1.1;
  END IF;

  calculated_climate_risk := (
    CASE
      WHEN asset_record.flood_risk_level = 'high' THEN 80
      WHEN asset_record.flood_risk_level = 'medium' THEN 50
      ELSE 20
    END
    + CASE
      WHEN asset_record.storm_risk_level = 'high' THEN 70
      WHEN asset_record.storm_risk_level = 'medium' THEN 40
      ELSE 15
    END
  ) * scenario_multiplier;

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
    inspection_age_years := GREATEST(
      0,
      EXTRACT(EPOCH FROM (effective_assessment_date::timestamp - asset_record.last_inspection_date::timestamp)) / 31557600
    );

    adaptive_score := CASE
      WHEN inspection_age_years <= 2 THEN 85
      WHEN inspection_age_years <= 5 THEN 70
      ELSE 55
    END;
  ELSE
    adaptive_score := 30;
  END IF;

  calculated_overall_score :=
    (physical_score * 0.4)
    + (adaptive_score * 0.3)
    + ((100 - LEAST(100, calculated_climate_risk)) * 0.2)
    + ((100 - calculated_operational_risk) * 0.1);

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
$$;
