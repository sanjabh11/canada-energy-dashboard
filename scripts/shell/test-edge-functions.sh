#!/bin/bash

# Test script to verify Supabase Edge Functions are deployed and working
# Usage: SUPABASE_URL=<url> ANON_KEY=<key> ./test-edge-functions.sh
# Or set these in your .env file and source it: source .env && ./test-edge-functions.sh

# Read from environment or use placeholders
SUPABASE_URL="${SUPABASE_URL:-https://YOUR_PROJECT.functions.supabase.co}"
ANON_KEY="${ANON_KEY:-YOUR_SUPABASE_ANON_KEY}"

# Check if variables are set
if [[ "$SUPABASE_URL" == *"YOUR_PROJECT"* ]] || [[ "$ANON_KEY" == *"YOUR_"* ]]; then
  echo "❌ Error: SUPABASE_URL and ANON_KEY must be set"
  echo "Usage: SUPABASE_URL=<url> ANON_KEY=<key> ./test-edge-functions.sh"
  echo "Or: source .env && ./test-edge-functions.sh"
  exit 1
fi

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
