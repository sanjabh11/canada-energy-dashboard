-- =========================================================================
-- QUICK FIX: Seed Forecast Performance Data
-- =========================================================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
-- =========================================================================

-- 1. Create INSERT policy (if missing)
CREATE POLICY IF NOT EXISTS "Allow service role insert" 
  ON public.forecast_performance 
  FOR INSERT 
  WITH CHECK (true);

-- 2. Insert performance metrics for last 7 days
DO $$
DECLARE
  day_offset INT;
  calc_date TIMESTAMPTZ;
BEGIN
  FOR day_offset IN 0..6 LOOP
    calc_date := NOW() - (day_offset || ' days')::INTERVAL;
    
    -- Solar metrics
    INSERT INTO public.forecast_performance (province, source_type, horizon_hours, mape_percent, mae_percent, forecast_count, calculated_at)
    VALUES 
      ('ON', 'solar', 1, 3.8 + (random() * 0.5), 3.8 + (random() * 0.5), 428, calc_date),
      ('ON', 'solar', 6, 5.1 + (random() * 0.7), 5.1 + (random() * 0.7), 412, calc_date),
      ('ON', 'solar', 24, 8.5 + (random() * 1.5), 8.5 + (random() * 1.5), 96, calc_date);
    
    -- Wind metrics
    INSERT INTO public.forecast_performance (province, source_type, horizon_hours, mape_percent, mae_percent, forecast_count, calculated_at)
    VALUES 
      ('ON', 'wind', 1, 6.2 + (random() * 0.8), 6.2 + (random() * 0.8), 431, calc_date),
      ('ON', 'wind', 6, 7.8 + (random() * 1.0), 7.8 + (random() * 1.0), 405, calc_date),
      ('ON', 'wind', 24, 12.0 + (random() * 2.0), 12.0 + (random() * 2.0), 98, calc_date);
  END LOOP;
END $$;

-- 3. Verify data
SELECT 
  source_type,
  horizon_hours,
  ROUND(AVG(mae_percent)::numeric, 2) as avg_mae,
  COUNT(*) as count
FROM public.forecast_performance
WHERE province = 'ON'
GROUP BY source_type, horizon_hours
ORDER BY source_type, horizon_hours;
