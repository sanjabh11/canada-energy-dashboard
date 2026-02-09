#!/bin/bash
# Phase 1 Deployment Verification Script
# Run this AFTER applying migrations via Supabase Dashboard

set -e

echo "🔍 PHASE 1 DEPLOYMENT VERIFICATION"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="qnymbecjgeaoxsfphrti"
BASE_URL="https://${PROJECT_REF}.functions.supabase.co"

# Counter for results
PASSED=0
FAILED=0

echo "📋 Step 1: Testing API Endpoints"
echo "================================="
echo ""

# Test 1: AI Data Centres API
echo "Test 1: AI Data Centres API"
echo -n "  Calling api-v2-ai-datacentres... "
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api-v2-ai-datacentres?province=AB")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"

  # Check for expected data
  DC_COUNT=$(echo "$BODY" | grep -o '"total":' | wc -l)
  if [ "$DC_COUNT" -gt 0 ]; then
    echo "    → Data centres found in response"
    PASSED=$((PASSED + 1))
  else
    echo -e "    ${YELLOW}⚠ Warning: No data centres in response${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  echo "    Response: $BODY"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: AESO Queue API
echo "Test 2: AESO Queue API"
echo -n "  Calling api-v2-aeso-queue... "
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api-v2-aeso-queue?status=Active")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"

  # Check for queue projects
  QUEUE_COUNT=$(echo "$BODY" | grep -o '"projects":' | wc -l)
  if [ "$QUEUE_COUNT" -gt 0 ]; then
    echo "    → Queue projects found in response"
    PASSED=$((PASSED + 1))
  else
    echo -e "    ${YELLOW}⚠ Warning: No queue projects in response${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  echo "    Response: $BODY"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Hydrogen Hub API
echo "Test 3: Hydrogen Hub API"
echo -n "  Calling api-v2-hydrogen-hub... "
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api-v2-hydrogen-hub")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"

  # Check for facilities
  FAC_COUNT=$(echo "$BODY" | grep -o '"facilities":' | wc -l)
  if [ "$FAC_COUNT" -gt 0 ]; then
    echo "    → Hydrogen facilities found in response"
    PASSED=$((PASSED + 1))
  else
    echo -e "    ${YELLOW}⚠ Warning: No facilities in response${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  echo "    Response: $BODY"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Critical Minerals API
echo "Test 4: Critical Minerals Supply Chain API"
echo -n "  Calling api-v2-minerals-supply-chain... "
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api-v2-minerals-supply-chain?mineral=Lithium")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"

  # Check for projects
  PROJ_COUNT=$(echo "$BODY" | grep -o '"projects":' | wc -l)
  if [ "$PROJ_COUNT" -gt 0 ]; then
    echo "    → Minerals projects found in response"
    PASSED=$((PASSED + 1))
  else
    echo -e "    ${YELLOW}⚠ Warning: No projects in response${NC}"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  echo "    Response: $BODY"
  FAILED=$((FAILED + 1))
fi
echo ""

echo "================================="
echo "📊 VERIFICATION SUMMARY"
echo "================================="
echo ""
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "🎉 Phase 1 deployment is successful!"
  echo ""
  echo "Next steps:"
  echo "1. Open your browser: http://localhost:5173/"
  echo "2. Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
  echo "3. Click through the Phase 1 tabs:"
  echo "   - AI Data Centres (position 3)"
  echo "   - Hydrogen Hub (position 4)"
  echo "   - Critical Minerals (position 5)"
  echo ""
  echo "You should see:"
  echo "  - 5 AI data centres (2,180 MW)"
  echo "  - 8 AESO queue projects (3,270 MW)"
  echo "  - 5 hydrogen facilities (\$1.68B)"
  echo "  - 7 critical minerals projects (\$6.45B)"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Troubleshooting steps:"
  echo ""
  echo "1. Verify migrations were applied:"
  echo "   - Open: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
  echo "   - Run this query:"
  echo ""
  echo "   SELECT table_name"
  echo "   FROM information_schema.tables"
  echo "   WHERE table_schema = 'public'"
  echo "   AND table_name IN ("
  echo "     'ai_data_centres',"
  echo "     'aeso_interconnection_queue',"
  echo "     'hydrogen_facilities',"
  echo "     'hydrogen_projects',"
  echo "     'critical_minerals_projects',"
  echo "     'minerals_supply_chain'"
  echo "   );"
  echo ""
  echo "   Expected: Should show all 6 table names"
  echo ""
  echo "2. Check Edge Functions are deployed:"
  echo "   supabase functions list"
  echo ""
  echo "3. Review EXECUTE_NOW.md for detailed migration steps"
  echo ""
  exit 1
fi
