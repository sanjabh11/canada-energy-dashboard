-- ============================================================================
-- TIER 1 IMPLEMENTATION - COMPLETE MIGRATION
-- Combines: Forecast Metrics + Data Retention + Award Evidence
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: FORECAST PERFORMANCE METRICS
-- ============================================================================

-- Function: Calculate Daily Forecast Performance
CREATE OR REPLACE FUNCTION calculate_daily_forecast_performance(
  p_date DATE,
  p_province TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL
) RETURNS TABLE(
  province TEXT,
  source_type TEXT,
  mae_mw NUMERIC,
  mape_percent NUMERIC,
  rmse_mw NUMERIC,
  forecast_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.province,
    rf.source_type,
    AVG(ABS(fa.error_mw))::NUMERIC(10,2) as mae_mw,
    AVG(ABS(fa.error_percent))::NUMERIC(6,2) as mape_percent,
    SQRT(AVG(fa.squared_error))::NUMERIC(10,2) as rmse_mw,
    COUNT(*)::INT as forecast_count
  FROM forecast_actuals fa
  JOIN renewable_forecasts rf ON fa.forecast_id = rf.id
  WHERE rf.valid_at::DATE = p_date
    AND (p_province IS NULL OR rf.province = p_province)
    AND (p_source_type IS NULL OR rf.source_type = p_source_type)
  GROUP BY rf.province, rf.source_type
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Aggregate 30-day Performance
CREATE OR REPLACE FUNCTION aggregate_forecast_performance_30d(
  p_province TEXT DEFAULT 'ON',
  p_source_type TEXT DEFAULT NULL
) RETURNS TABLE(
  province TEXT,
  source_type TEXT,
  avg_mae_mw NUMERIC,
  avg_mape_percent NUMERIC,
  avg_rmse_mw NUMERIC,
  total_forecasts INT,
  period_start DATE,
  period_end DATE
) AS $$
DECLARE
  v_start_date DATE := CURRENT_DATE - INTERVAL '30 days';
  v_end_date DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    rf.province,
    rf.source_type,
    AVG(ABS(fa.error_mw))::NUMERIC(10,2) as avg_mae_mw,
    AVG(ABS(fa.error_percent))::NUMERIC(6,2) as avg_mape_percent,
    SQRT(AVG(fa.squared_error))::NUMERIC(10,2) as avg_rmse_mw,
    COUNT(*)::INT as total_forecasts,
    v_start_date as period_start,
    v_end_date as period_end
  FROM forecast_actuals fa
  JOIN renewable_forecasts rf ON fa.forecast_id = rf.id
  WHERE rf.valid_at >= v_start_date
    AND rf.valid_at <= v_end_date
    AND rf.province = p_province
    AND (p_source_type IS NULL OR rf.source_type = p_source_type)
  GROUP BY rf.province, rf.source_type
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Store Daily Performance Summary
CREATE OR REPLACE FUNCTION store_daily_performance_summary(
  p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
) RETURNS INT AS $$
DECLARE
  v_inserted_count INT := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT * FROM calculate_daily_forecast_performance(p_date)
  LOOP
    INSERT INTO forecast_performance (
      province, source_type, horizon_hours, model_version,
      period_start, period_end, mae_mw, mape_percent, rmse_mw,
      forecast_count, calculated_at
    ) VALUES (
      v_record.province, v_record.source_type, 24, '1.0.0',
      p_date, p_date, v_record.mae_mw, v_record.mape_percent,
      v_record.rmse_mw, v_record.forecast_count, NOW()
    )
    ON CONFLICT (province, source_type, period_start, period_end, horizon_hours) 
    DO UPDATE SET
      mae_mw = EXCLUDED.mae_mw,
      mape_percent = EXCLUDED.mape_percent,
      rmse_mw = EXCLUDED.rmse_mw,
      forecast_count = EXCLUDED.forecast_count,
      calculated_at = NOW();
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Award Evidence Metrics
CREATE OR REPLACE FUNCTION get_award_evidence_metrics(
  p_province TEXT DEFAULT 'ON',
  p_days INT DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_solar_mae NUMERIC;
  v_wind_mae NUMERIC;
  v_curtailment_saved NUMERIC;
  v_opportunity_cost NUMERIC;
  v_recommendations_count INT;
  v_implemented_count INT;
BEGIN
  -- Solar forecast MAE
  SELECT AVG(ABS(fa.error_percent))::NUMERIC(6,2)
  INTO v_solar_mae
  FROM forecast_actuals fa
  JOIN renewable_forecasts rf ON fa.forecast_id = rf.id
  WHERE rf.province = p_province
    AND rf.source_type = 'solar'
    AND rf.valid_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL;
  
  -- Wind forecast MAE
  SELECT AVG(ABS(fa.error_percent))::NUMERIC(6,2)
  INTO v_wind_mae
  FROM forecast_actuals fa
  JOIN renewable_forecasts rf ON fa.forecast_id = rf.id
  WHERE rf.province = p_province
    AND rf.source_type = 'wind'
    AND rf.valid_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL;
  
  -- Curtailment metrics
  SELECT 
    COALESCE(SUM(r.actual_mwh_saved), SUM(r.estimated_mwh_saved), 0),
    COALESCE(SUM(e.opportunity_cost_cad), 0),
    COUNT(r.id),
    COUNT(r.id) FILTER (WHERE r.implemented = true)
  INTO v_curtailment_saved, v_opportunity_cost, v_recommendations_count, v_implemented_count
  FROM curtailment_events e
  LEFT JOIN curtailment_reduction_recommendations r ON e.id = r.curtailment_event_id
  WHERE e.province = p_province
    AND e.occurred_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL;
  
  v_result := json_build_object(
    'province', p_province,
    'period_days', p_days,
    'solar_forecast_mae_percent', COALESCE(v_solar_mae, 0),
    'wind_forecast_mae_percent', COALESCE(v_wind_mae, 0),
    'monthly_curtailment_avoided_mwh', COALESCE(v_curtailment_saved * (30.0 / p_days), 0),
    'monthly_opportunity_cost_saved_cad', COALESCE(v_opportunity_cost * (30.0 / p_days), 0),
    'total_recommendations', COALESCE(v_recommendations_count, 0),
    'implemented_recommendations', COALESCE(v_implemented_count, 0),
    'implementation_rate_percent', 
      CASE 
        WHEN v_recommendations_count > 0 THEN (v_implemented_count::NUMERIC / v_recommendations_count * 100)::NUMERIC(5,2)
        ELSE 0
      END,
    'calculated_at', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'forecast_performance_unique_period'
  ) THEN
    ALTER TABLE forecast_performance 
    ADD CONSTRAINT forecast_performance_unique_period 
    UNIQUE (province, source_type, period_start, period_end, horizon_hours);
  END IF;
END $$;

-- ============================================================================
-- PART 2: DATA RETENTION & PURGE
-- ============================================================================

-- Function: Purge Old Data
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
BEGIN
  DELETE FROM weather_observations 
  WHERE observed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_weather_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'weather_observations'::TEXT, v_weather_deleted, 90;

  DELETE FROM forecast_actuals 
  WHERE recorded_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS v_actuals_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'forecast_actuals'::TEXT, v_actuals_deleted, 60;

  DELETE FROM renewable_forecasts 
  WHERE generated_at < NOW() - INTERVAL '60 days' AND has_actual = false;
  GET DIAGNOSTICS v_forecasts_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'renewable_forecasts'::TEXT, v_forecasts_deleted, 60;

  DELETE FROM curtailment_events 
  WHERE occurred_at < NOW() - INTERVAL '180 days';
  GET DIAGNOSTICS v_events_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'curtailment_events'::TEXT, v_events_deleted, 180;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Database Stats
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

-- Function: Get Data Completeness
CREATE OR REPLACE FUNCTION get_data_completeness(
  p_days INT DEFAULT 7
) RETURNS TABLE(
  metric_name TEXT,
  expected_count BIGINT,
  actual_count BIGINT,
  completeness_percent NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMP := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT 
    'renewable_forecasts'::TEXT,
    (2 * 4 * 24 * p_days)::BIGINT AS expected_count,
    COUNT(*)::BIGINT AS actual_count,
    (COUNT(*)::NUMERIC / (2 * 4 * 24 * p_days) * 100)::NUMERIC(5,2) AS completeness_percent
  FROM renewable_forecasts
  WHERE generated_at >= v_start_date;

  RETURN QUERY
  SELECT 
    'curtailment_events'::TEXT,
    NULL::BIGINT AS expected_count,
    COUNT(*)::BIGINT AS actual_count,
    NULL::NUMERIC AS completeness_percent
  FROM curtailment_events
  WHERE occurred_at >= v_start_date;

  RETURN QUERY
  SELECT 
    'weather_observations'::TEXT,
    (96 * p_days)::BIGINT AS expected_count,
    COUNT(*)::BIGINT AS actual_count,
    (COUNT(*)::NUMERIC / (96 * p_days) * 100)::NUMERIC(5,2) AS completeness_percent
  FROM weather_observations
  WHERE observed_at >= v_start_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tier 1 Implementation Complete!';
  RAISE NOTICE '✅ Forecast performance metrics functions deployed';
  RAISE NOTICE '✅ Award evidence calculation ready';
  RAISE NOTICE '✅ Data retention & purge functions active';
  RAISE NOTICE '✅ Database statistics tracking enabled';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test queries:';
  RAISE NOTICE '   SELECT * FROM get_award_evidence_metrics(''ON'', 30);';
  RAISE NOTICE '   SELECT * FROM get_database_stats();';
  RAISE NOTICE '   SELECT * FROM get_data_completeness(7);';
  RAISE NOTICE '   SELECT * FROM purge_old_data();';
END $$;
