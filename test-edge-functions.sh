#!/bin/bash

# Test script to verify Supabase Edge Functions are deployed and working

SUPABASE_URL="https://qnymbecjgeaoxsfphrti.functions.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU"

echo "Testing Supabase Edge Functions Deployment"
echo "==========================================="
echo ""

# Test streaming manifest endpoints
ENDPOINTS=(
  "manifest-provincial-generation"
  "manifest-ontario-demand"
  "manifest-ontario-prices"
  "manifest-hf-electricity-demand"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing: $endpoint"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/$endpoint")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $endpoint - OK (200)"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ $endpoint - NOT DEPLOYED (404)"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "⚠️  $endpoint - DEPLOYED BUT ERROR (500)"
  else
    echo "⚠️  $endpoint - UNEXPECTED STATUS ($HTTP_CODE)"
  fi
  echo ""
done

echo ""
echo "Testing streaming data endpoints"
echo "================================"
echo ""

# Test actual stream endpoints with limit
STREAM_ENDPOINTS=(
  "stream-provincial-generation?limit=1"
  "stream-ontario-demand?limit=1"
  "stream-ontario-prices?limit=1"
  "stream-hf-electricity-demand?limit=1"
)

for endpoint in "${STREAM_ENDPOINTS[@]}"; do
  echo "Testing: $endpoint"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/$endpoint")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $endpoint - OK (200)"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ $endpoint - NOT DEPLOYED (404)"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo "⚠️  $endpoint - DEPLOYED BUT ERROR (500)"
  else
    echo "⚠️  $endpoint - UNEXPECTED STATUS ($HTTP_CODE)"
  fi
  echo ""
done

echo ""
echo "Summary"
echo "======="
echo "If you see ❌ 404 errors: Functions need to be deployed"
echo "If you see ⚠️  500 errors: Functions are deployed but have runtime errors"
echo "If you see ✅ 200: Functions are working correctly"
echo ""
echo "To deploy all functions:"
echo "  supabase functions deploy --project-ref qnymbecjgeaoxsfphrti"
