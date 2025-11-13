-- ============================================================================
-- FIX: Database Stats Function - Column Name Correction
-- Purpose: Fix pg_stat_user_tables column reference (tablename → relname)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  data_size TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS data_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) AS index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND relname IN (
      'renewable_forecasts', 'forecast_actuals', 'forecast_performance',
      'weather_observations', 'curtailment_events',
      'curtailment_reduction_recommendations', 'storage_dispatch_log',
      'renewable_capacity_registry'
    )
  ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database stats function fixed (tablename → relname)';
  RAISE NOTICE '📊 Test with: SELECT * FROM get_database_stats();';
END $$;
