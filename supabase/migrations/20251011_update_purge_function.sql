-- =========================================================================
-- Update Data Purge Function - Add Storage Dispatch Logs
-- =========================================================================
-- Adds storage_dispatch_logs to the purge function with 30-day retention
-- Optimized for Supabase free tier (500 MB database limit)
-- =========================================================================

CREATE OR REPLACE FUNCTION purge_old_data()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT,
  retention_days INT
) AS $$
DECLARE
  v_weather_deleted BIGINT;
  v_actuals_deleted BIGINT;
  v_forecasts_deleted BIGINT;
  v_events_deleted BIGINT;
  v_storage_deleted BIGINT;
BEGIN
  -- Weather observations: 90 days retention
  DELETE FROM weather_observations 
  WHERE observed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_weather_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'weather_observations'::TEXT, v_weather_deleted, 90;

  -- Forecast actuals: 60 days retention
  DELETE FROM forecast_actuals 
  WHERE recorded_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS v_actuals_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'forecast_actuals'::TEXT, v_actuals_deleted, 60;

  -- Renewable forecasts: 60 days retention (only unmatched forecasts)
  DELETE FROM renewable_forecasts 
  WHERE generated_at < NOW() - INTERVAL '60 days' AND has_actual = false;
  GET DIAGNOSTICS v_forecasts_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'renewable_forecasts'::TEXT, v_forecasts_deleted, 60;

  -- Curtailment events: 180 days retention (keep for award evidence)
  DELETE FROM curtailment_events 
  WHERE occurred_at < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'curtailment_events'::TEXT, v_events_deleted, 180;

  -- Storage dispatch logs: 30 days retention (NEW - optimized for demo)
  DELETE FROM storage_dispatch_logs 
  WHERE dispatched_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_storage_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'storage_dispatch_logs'::TEXT, v_storage_deleted, 30;

  RAISE NOTICE '✅ Data purge complete';
  RAISE NOTICE '   Weather: % rows deleted (90 day retention)', v_weather_deleted;
  RAISE NOTICE '   Forecasts: % rows deleted (60 day retention)', v_forecasts_deleted;
  RAISE NOTICE '   Curtailment: % rows deleted (180 day retention)', v_events_deleted;
  RAISE NOTICE '   Storage: % rows deleted (30 day retention)', v_storage_deleted;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM purge_old_data();

-- Verify database size
SELECT 
  schemaname || '.' || relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN (
    'weather_observations',
    'storage_dispatch_logs',
    'curtailment_events',
    'renewable_forecasts'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
