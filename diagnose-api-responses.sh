#!/bin/bash
# Diagnostic script to see actual API responses
set -e

PROJECT_REF="qnymbecjgeaoxsfphrti"
BASE_URL="https://${PROJECT_REF}.functions.supabase.co"

echo "=========================================="
echo "🔍 ACTUAL API RESPONSE DIAGNOSTIC"
echo "=========================================="
echo ""

echo "Test 1: AI Data Centres API"
echo "----------------------------"
echo "URL: ${BASE_URL}/api-v2-ai-datacentres?province=AB"
echo ""
RESPONSE=$(curl -s "${BASE_URL}/api-v2-ai-datacentres?province=AB")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo ""

echo "Test 2: AESO Queue API"
echo "----------------------"
echo "URL: ${BASE_URL}/api-v2-aeso-queue?status=Active"
echo ""
RESPONSE=$(curl -s "${BASE_URL}/api-v2-aeso-queue?status=Active")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo ""

echo "Test 3: Hydrogen Hub API"
echo "------------------------"
echo "URL: ${BASE_URL}/api-v2-hydrogen-hub"
echo ""
RESPONSE=$(curl -s "${BASE_URL}/api-v2-hydrogen-hub")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo ""

echo "Test 4: Minerals Supply Chain API"
echo "----------------------------------"
echo "URL: ${BASE_URL}/api-v2-minerals-supply-chain?mineral=Lithium"
echo ""
RESPONSE=$(curl -s "${BASE_URL}/api-v2-minerals-supply-chain?mineral=Lithium")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
