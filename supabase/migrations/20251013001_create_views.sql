-- Create views to normalize UI expectations without altering existing inserts
-- Fix 2: View alias for storage_dispatch_log -> storage_dispatch_logs
-- Fix 3: View alias for grid_snapshots -> grid_status (with derived fields)

BEGIN;

-- View: storage_dispatch_log
-- Unifies plural logs into singular schema expected by parts of the UI
DROP TABLE IF EXISTS public.storage_dispatch_log;
DROP VIEW IF EXISTS public.storage_dispatch_log;
CREATE OR REPLACE VIEW public.storage_dispatch_log AS
SELECT
  sdl.id,
  COALESCE(sdl.dispatched_at, sdl.created_at, NOW()) AS decision_timestamp,
  NULL::text AS battery_id,
  sdl.province,
  sdl.action,
  COALESCE(sdl.power_mw, 0)::double precision AS magnitude_mw,
  COALESCE(sdl.soc_before_percent, 0)::double precision AS soc_before_pct,
  COALESCE(sdl.soc_after_percent, 0)::double precision AS soc_after_pct,
  COALESCE(sdl.expected_revenue_cad, 0)::double precision AS expected_revenue_cad,
  NULL::double precision AS actual_revenue_cad,
  COALESCE(sdl.reason, '') AS reasoning,
  NULL::double precision AS grid_price_cad_per_mwh,
  sdl.renewable_absorption,
  sdl.curtailment_mitigation
FROM public.storage_dispatch_logs sdl;

-- View: grid_snapshots
-- Maps grid_status into minimal fields expected by UI/scheduler using available columns
DROP VIEW IF EXISTS public.grid_snapshots;
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
  NULL::double precision AS price_cad_mwh,
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
