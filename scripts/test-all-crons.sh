#!/bin/bash
# Test All Cron Functions
# Verifies that all edge functions are working before scheduling

set -e

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU"
BASE_URL="https://qnymbecjgeaoxsfphrti.functions.supabase.co"

echo "🧪 Testing All Cron Functions"
echo "=============================="
echo ""

# Test 1: Weather Ingestion
echo "1️⃣  Testing weather-ingestion-cron..."
WEATHER_RESULT=$(curl -s "${BASE_URL}/weather-ingestion-cron" \
  -H "Authorization: Bearer ${ANON_KEY}")

WEATHER_SUCCESS=$(echo "$WEATHER_RESULT" | jq -r '.success // false')
if [ "$WEATHER_SUCCESS" = "true" ]; then
  PROVINCES=$(echo "$WEATHER_RESULT" | jq -r '.results | length')
  echo "   ✅ SUCCESS: Weather data ingested for $PROVINCES provinces"
else
  echo "   ❌ FAILED: $(echo "$WEATHER_RESULT" | jq -r '.error // "Unknown error"')"
fi
echo ""

# Test 2: Storage Dispatch
echo "2️⃣  Testing storage-dispatch-engine..."
STORAGE_RESULT=$(curl -s "${BASE_URL}/storage-dispatch-engine?province=ON" \
  -H "Authorization: Bearer ${ANON_KEY}")

STORAGE_SUCCESS=$(echo "$STORAGE_RESULT" | jq -r '.success // false')
if [ "$STORAGE_SUCCESS" = "true" ]; then
  ACTION=$(echo "$STORAGE_RESULT" | jq -r '.decision.action')
  TARGET_MW=$(echo "$STORAGE_RESULT" | jq -r '.decision.target_mw')
  REASON=$(echo "$STORAGE_RESULT" | jq -r '.decision.reason')
  echo "   ✅ SUCCESS: Action=$ACTION, Power=${TARGET_MW}MW"
  echo "   📝 Reason: $REASON"
else
  echo "   ❌ FAILED: $(echo "$STORAGE_RESULT" | jq -r '.error // "Unknown error"')"
fi
echo ""

# Test 3: Data Purge
echo "3️⃣  Testing data-purge-cron..."
PURGE_RESULT=$(curl -s "${BASE_URL}/data-purge-cron" \
  -H "Authorization: Bearer ${ANON_KEY}")

PURGE_SUCCESS=$(echo "$PURGE_RESULT" | jq -r '.success // false')
if [ "$PURGE_SUCCESS" = "true" ]; then
  TOTAL_DELETED=$(echo "$PURGE_RESULT" | jq -r '.total_rows_deleted // 0')
  TABLES=$(echo "$PURGE_RESULT" | jq -r '.tables_purged // 0')
  echo "   ✅ SUCCESS: Purged $TOTAL_DELETED rows from $TABLES tables"
  echo "$PURGE_RESULT" | jq -r '.purge_details[] | "   📊 \(.table_name): \(.rows_deleted) rows (\(.retention_days) day retention)"'
else
  echo "   ❌ FAILED: $(echo "$PURGE_RESULT" | jq -r '.error // "Unknown error"')"
fi
echo ""

# Test 4: Award Evidence API
echo "4️⃣  Testing award-evidence API..."
AWARD_RESULT=$(curl -s "${BASE_URL}/api-v2-renewable-forecast/award-evidence?province=ON" \
  -H "Authorization: Bearer ${ANON_KEY}")

CURTAILMENT=$(echo "$AWARD_RESULT" | jq -r '.monthly_curtailment_avoided_mwh // 0')
STORAGE_EFF=$(echo "$AWARD_RESULT" | jq -r '.avg_round_trip_efficiency_percent // 0')
STORAGE_REV=$(echo "$AWARD_RESULT" | jq -r '.monthly_arbitrage_revenue_cad // 0')

if [ "$CURTAILMENT" -gt 0 ]; then
  echo "   ✅ SUCCESS: Award evidence API working"
  echo "   📊 Curtailment: ${CURTAILMENT} MWh"
  echo "   📊 Storage Efficiency: ${STORAGE_EFF}%"
  echo "   📊 Storage Revenue: \$${STORAGE_REV}"
else
  echo "   ⚠️  WARNING: Award evidence API returned 0 values"
fi
echo ""

# Summary
echo "=============================="
echo "✅ All Tests Complete!"
echo ""
echo "Next Steps:"
echo "1. Run purge function SQL: supabase/migrations/20251011001_update_purge_function.sql"
echo "2. Schedule weather cron: 0 */3 * * * (every 3 hours)"
echo "3. Schedule storage cron: */30 * * * * (every 30 minutes)"
echo "4. Schedule purge cron: 0 2 * * 0 (Sunday 2 AM)"
echo ""
echo "See EXECUTE_CRON_SETUP.md for detailed instructions"
