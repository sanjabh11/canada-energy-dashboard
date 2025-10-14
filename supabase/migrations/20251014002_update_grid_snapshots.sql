-- Update grid_snapshots to include Ontario HOEP price and keep curtailment_risk logic
BEGIN;

CREATE OR REPLACE VIEW public.grid_snapshots AS
WITH base AS (
  SELECT
    gs.captured_at AS observed_at,
    CASE TRIM(LOWER(gs.region))
      WHEN 'ontario' THEN 'ON'
      WHEN 'alberta' THEN 'AB'
      WHEN 'british columbia' THEN 'BC'
      WHEN 'quebec' THEN 'QC'
      WHEN 'saskatchewan' THEN 'SK'
      WHEN 'manitoba' THEN 'MB'
      WHEN 'new brunswick' THEN 'NB'
      WHEN 'nova scotia' THEN 'NS'
      WHEN 'prince edward island' THEN 'PE'
      WHEN 'newfoundland and labrador' THEN 'NL'
      ELSE UPPER(gs.region)
    END AS province,
    gs.region,
    gs.demand_mw,
    gs.supply_mw,
    gs.reserve_margin,
    gs.frequency_hz,
    gs.voltage_kv,
    gs.congestion_index,
    gs.data_source,
    gs.status
  FROM public.grid_status gs
)
SELECT
  b.observed_at,
  b.province,
  CASE
    WHEN b.province = 'ON' THEN (
      SELECT hoep FROM public.ontario_prices ORDER BY datetime DESC LIMIT 1
    )
    ELSE NULL
  END::double precision AS price_cad_mwh,
  (COALESCE(b.reserve_margin, 0) < 5 OR COALESCE(b.congestion_index, 0) > 80) AS curtailment_risk,
  b.demand_mw,
  b.supply_mw,
  b.reserve_margin,
  b.frequency_hz,
  b.voltage_kv,
  b.congestion_index,
  b.data_source,
  b.status,
  b.region
FROM base b;

COMMIT;
