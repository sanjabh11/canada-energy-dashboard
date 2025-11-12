#!/bin/bash

# Indigenous Economic Dashboard Deployment Script
# Deploys Indigenous Equity Enhancement to Supabase

set -e  # Exit on error

echo "🚀 Indigenous Economic Dashboard Deployment Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="qnymbecjgeaoxsfphrti"
MIGRATION_FILE="supabase/migrations/20251112002_indigenous_equity_enhancement.sql"

# Step 1: Verify files exist
echo -e "${BLUE}Step 1: Verifying files...${NC}"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

if [ ! -f "src/components/IndigenousEconomicDashboard.tsx" ]; then
    echo -e "${RED}❌ Error: Component file not found: src/components/IndigenousEconomicDashboard.tsx${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All files verified${NC}"
echo ""

# Step 2: Database Migration Instructions
echo -e "${BLUE}Step 2: Database Migration${NC}"
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

# Step 3: Verification Queries
echo -e "${BLUE}Step 3: Verification Queries${NC}"
echo ""
echo "After running the migration, verify with these SQL queries:"
echo ""
echo "-- Check equity projects (should be 6)"
echo "SELECT COUNT(*) FROM indigenous_equity_ownership;"
echo ""
echo "-- Check revenue agreements (should be 5)"
echo "SELECT COUNT(*) FROM indigenous_revenue_agreements;"
echo ""
echo "-- Check economic impact data (should be 5)"
echo "SELECT COUNT(*) FROM indigenous_economic_impact WHERE year = 2023;"
echo ""
echo "-- View top equity projects"
echo "SELECT"
echo "  project_name,"
echo "  indigenous_community,"
echo "  ownership_percent,"
echo "  equity_value_cad/1000000 as equity_value_millions"
echo "FROM indigenous_equity_ownership"
echo "ORDER BY equity_value_cad DESC;"
echo ""

# Step 4: RLS Policy Warning
echo -e "${BLUE}Step 4: Row Level Security${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important: Disable RLS for testing${NC}"
echo ""
echo "If data doesn't appear in the dashboard, run these SQL commands:"
echo ""
echo "ALTER TABLE indigenous_equity_ownership DISABLE ROW LEVEL SECURITY;"
echo "ALTER TABLE indigenous_revenue_agreements DISABLE ROW LEVEL SECURITY;"
echo "ALTER TABLE indigenous_economic_impact DISABLE ROW LEVEL SECURITY;"
echo ""
echo "Later, enable proper policies for production access control."
echo ""

# Step 5: Frontend Testing
echo -e "${BLUE}Step 5: Frontend Testing${NC}"
echo ""
echo "Test the dashboard locally:"
echo ""
echo "1. Start dev server:"
echo "   npm run dev"
echo ""
echo "2. Open browser:"
echo "   http://localhost:5173/"
echo ""
echo "3. Navigate to dashboard:"
echo "   - Click 'More' dropdown in navigation"
echo "   - Click 'Indigenous Economic Impact'"
echo ""
echo "4. Verify all 4 tabs:"
echo "   - Overview (reconciliation banner, $4.5B equity)"
echo "   - Equity Ownership (6 projects, Wataynikaneyap $340M)"
echo "   - Revenue Agreements (5 IBAs, Keeyask $4B)"
echo "   - Economic Impact (5 communities, Ermineskin $18.5M)"
echo ""

# Final instructions
echo ""
echo -e "${GREEN}=================================================="
echo "🎉 Deployment Instructions Complete!"
echo "==================================================${NC}"
echo ""
echo "Next Steps:"
echo "  1. ⏳ Run migration (see instructions above)"
echo "  2. ✅ Disable RLS for testing (if needed)"
echo "  3. 🧪 Test frontend: npm run dev"
echo "  4. 🌐 Navigate to: http://localhost:5173/"
echo "  5. 📊 Click 'More' → 'Indigenous Economic Impact'"
echo ""
echo -e "${BLUE}For detailed testing guide, see: INDIGENOUS_TESTING_GUIDE.md${NC}"
echo ""
echo -e "${GREEN}🌟 Key Features:${NC}"
echo "  - $4.5B+ total equity value tracked"
echo "  - $285M+ annual dividend income"
echo "  - 1,800+ jobs created (direct + indirect)"
echo "  - 45+ active projects"
echo "  - Truth & Reconciliation alignment"
echo ""
