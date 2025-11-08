-- Check how many price records exist per mineral
SELECT
  mineral,
  COUNT(*) as price_records,
  MIN(timestamp) as earliest_date,
  MAX(timestamp) as latest_date
FROM minerals_prices
GROUP BY mineral
ORDER BY mineral;
