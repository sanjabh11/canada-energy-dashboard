#!/bin/bash

# CCUS Deployment Script
# Deploys CCUS Project Tracker to Supabase

set -e  # Exit on error

echo "🚀 CCUS Project Tracker Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="qnymbecjgeaoxsfphrti"
MIGRATION_FILE="supabase/migrations/20251112001_ccus_infrastructure.sql"
FUNCTION_NAME="api-v2-ccus"

# Step 1: Verify files exist
echo -e "${BLUE}Step 1: Verifying files...${NC}"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
    echo -e "${RED}❌ Error: Edge function directory not found: supabase/functions/$FUNCTION_NAME${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All files verified${NC}"
echo ""

# Step 2: Deploy Edge Function
echo -e "${BLUE}Step 2: Deploying Edge Function...${NC}"
echo "Deploying $FUNCTION_NAME to project $PROJECT_REF"

npx supabase functions deploy $FUNCTION_NAME \
  --project-ref $PROJECT_REF \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge function deployed successfully${NC}"
else
    echo -e "${RED}❌ Edge function deployment failed${NC}"
    exit 1
fi
echo ""

# Step 3: Test Edge Function
echo -e "${BLUE}Step 3: Testing Edge Function...${NC}"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}?province=AB"
echo "Testing: $FUNCTION_URL"

# Note: Add your ANON_KEY here or pass as environment variable
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_ANON_KEY not set. Skipping function test.${NC}"
    echo -e "${YELLOW}   Set with: export SUPABASE_ANON_KEY=your_key${NC}"
else
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY")

    if [ "$RESPONSE" = "200" ]; then
        echo -e "${GREEN}✅ Edge function responding (HTTP 200)${NC}"
    else
        echo -e "${RED}❌ Edge function test failed (HTTP $RESPONSE)${NC}"
    fi
fi
echo ""

# Step 4: Database Migration Instructions
echo -e "${BLUE}Step 4: Database Migration${NC}"
echo ""
echo -e "${YELLOW}⚠️  Manual Step Required:${NC}"
echo ""
echo "Please run the migration manually using ONE of these methods:"
echo ""
echo "METHOD 1 - Supabase Dashboard (Recommended):"
echo "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "  2. Copy contents of: $MIGRATION_FILE"
echo "  3. Paste into SQL Editor"
echo "  4. Click 'Run'"
echo ""
echo "METHOD 2 - CLI (if you have DB password):"
echo "  npx supabase db push --db-url \"postgresql://postgres.${PROJECT_REF}:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres\""
echo ""

# Step 5: Verification Queries
echo -e "${BLUE}Step 5: Verification Queries${NC}"
echo ""
echo "After running the migration, verify with these SQL queries:"
echo ""
echo "-- Check facilities count (should be 5)"
echo "SELECT COUNT(*) FROM ccus_facilities;"
echo ""
echo "-- Check Pathways Alliance projects (should be 6)"
echo "SELECT COUNT(*) FROM pathways_alliance_projects;"
echo ""
echo "-- View all facilities"
echo "SELECT facility_name, operator, status, design_capture_capacity_mt_per_year"
echo "FROM ccus_facilities"
echo "ORDER BY design_capture_capacity_mt_per_year DESC;"
echo ""

# Final instructions
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 Deployment Script Complete!"
echo "==========================================${NC}"
echo ""
echo "Next Steps:"
echo "  1. ✅ Edge function deployed"
echo "  2. ⏳ Run migration (see instructions above)"
echo "  3. 🧪 Test frontend: npm run dev"
echo "  4. 🌐 Navigate to: http://localhost:5173/"
echo "  5. 📊 Click 'CCUS Tracker' tab"
echo ""
echo -e "${BLUE}For detailed testing guide, see: CCUS_TESTING_GUIDE.md${NC}"
echo ""
