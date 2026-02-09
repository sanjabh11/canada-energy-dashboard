-- Storage Dispatch Scheduler Cron Job
-- Run this in Supabase Dashboard > Database > SQL Editor

-- Create cron job to run every 30 minutes
SELECT cron.schedule(
  'storage-dispatch-tick',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT net.http_post(
    url:='https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/storage-dispatch-scheduler',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'storage-dispatch-tick';

-- To manually trigger (for testing):
SELECT net.http_post(
  url:='https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/storage-dispatch-scheduler',
  headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
);

-- Check storage_dispatch_log for actions
SELECT 
  battery_id,
  decision_timestamp,
  action,
  magnitude_mw,
  soc_before_pct,
  soc_after_pct,
  renewable_absorption,
  expected_revenue_cad,
  reasoning
FROM storage_dispatch_log
ORDER BY decision_timestamp DESC
LIMIT 10;

-- Verify SoC bounds compliance
SELECT 
  battery_id,
  soc_pct,
  CASE 
    WHEN soc_pct >= 5 AND soc_pct <= 95 THEN 'COMPLIANT'
    ELSE 'OUT OF BOUNDS'
  END as compliance_status
FROM batteries_state;

-- Calculate alignment percentage
SELECT 
  COUNT(*) FILTER (WHERE renewable_absorption = true) * 100.0 / COUNT(*) as alignment_pct_renewable
FROM storage_dispatch_log
WHERE decision_timestamp >= NOW() - INTERVAL '7 days';

-- Calculate 7-day revenue
SELECT 
  SUM(expected_revenue_cad) as expected_revenue_cad_7d
FROM storage_dispatch_log
WHERE decision_timestamp >= NOW() - INTERVAL '7 days';
