-- Create views to normalize UI expectations without altering existing inserts
-- Fix 2: View alias for storage_dispatch_log -> storage_dispatch_logs
-- Fix 3: View alias for grid_snapshots -> grid_status (with derived fields)

BEGIN;

-- View: storage_dispatch_log
-- Unifies plural logs into singular schema expected by parts of the UI
CREATE OR REPLACE VIEW public.storage_dispatch_log AS
SELECT
  sdl.id,
  COALESCE(
    sdl.decision_timestamp,
    sdl.timestamp,
    sdl.created_at,
    NOW()
  ) AS decision_timestamp,
  sdl.battery_id,
  sdl.province,
  sdl.action,
  COALESCE(sdl.magnitude_mw, sdl.power_mw, 0)::double precision AS magnitude_mw,
  COALESCE(sdl.soc_before_pct, sdl.soc_before_percent, 0)::double precision AS soc_before_pct,
  COALESCE(sdl.soc_after_pct, sdl.soc_after_percent, 0)::double precision AS soc_after_pct,
  COALESCE(sdl.expected_revenue_cad, 0)::double precision AS expected_revenue_cad,
  NULLIF(sdl.actual_revenue_cad, 0) AS actual_revenue_cad,
  COALESCE(sdl.reasoning, sdl.reason, '') AS reasoning,
  COALESCE(sdl.grid_price_cad_per_mwh, sdl.market_price_cad_per_mwh) AS grid_price_cad_per_mwh
FROM public.storage_dispatch_logs sdl;

-- View: grid_snapshots
-- Maps grid_status into minimal fields expected by UI/scheduler.
-- Derives province code and curtailment_risk with simple heuristics.
CREATE OR REPLACE VIEW public.grid_snapshots AS
WITH base AS (
  SELECT
    gs.id,
    gs.captured_at AS observed_at,
    -- Map region names to province codes; adjust as needed for your data
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
      WHEN 'yukon' THEN 'YT'
      WHEN 'northwest territories' THEN 'NT'
      WHEN 'nunavut' THEN 'NU'
      ELSE UPPER(gs.region)
    END AS province,
    gs.region,
    gs.renewable_percentage,
    gs.generation_mw,
    gs.load_mw
  FROM public.grid_status gs
), latest_prices AS (
  SELECT 'ON' AS province,
         (SELECT hoep FROM public.ontario_prices ORDER BY datetime_et DESC LIMIT 1) AS price_cad_mwh
)
SELECT
  b.observed_at,
  b.province,
  -- Price available for Ontario; others NULL unless you extend this join
  CASE WHEN b.province = 'ON' THEN lp.price_cad_mwh ELSE NULL END AS price_cad_mwh,
  -- Heuristic curtailment risk: cheap price or very high renewable share
  (COALESCE((CASE WHEN b.province = 'ON' THEN lp.price_cad_mwh ELSE NULL END), 9999) < 10)
  OR (COALESCE(b.renewable_percentage, 0) > 80) AS curtailment_risk,
  b.generation_mw,
  b.load_mw,
  b.region
FROM base b
LEFT JOIN latest_prices lp
  ON lp.province = b.province;

COMMIT;
