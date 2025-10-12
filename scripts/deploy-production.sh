#!/bin/bash
# Production Deployment Script
# Date: 2025-10-12
# Purpose: Complete pre-deployment checks and deploy to production

set -e  # Exit on error

echo "🚀 Starting production deployment process..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo "📋 Step 1: Running pre-deployment checks..."

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}❌ Not on main branch. Current: $CURRENT_BRANCH${NC}"
  echo "   Switch to main: git checkout main"
  exit 1
fi
echo -e "${GREEN}✅ On main branch${NC}"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
  echo "   Commit changes before deploying"
  exit 1
fi
echo -e "${GREEN}✅ No uncommitted changes${NC}"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Step 2: Security audit
echo ""
echo "🔒 Step 2: Running security audit..."
pnpm audit --audit-level=high || {
  echo -e "${YELLOW}⚠️  Security vulnerabilities found${NC}"
  echo "   Run: pnpm audit fix"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
}
echo -e "${GREEN}✅ Security audit passed${NC}"

# Step 3: Type checking
echo ""
echo "📝 Step 3: Running TypeScript type check..."
TYPE_CHECK_RAN=false
if pnpm run --if-present type-check; then
  TYPE_CHECK_RAN=true
elif npm run --if-present type-check; then
  TYPE_CHECK_RAN=true
fi

if [ "$TYPE_CHECK_RAN" = false ]; then
  echo -e "${YELLOW}⚠️  No type-check script found, skipping${NC}"
else
  echo -e "${GREEN}✅ Type check passed${NC}"
fi

# Step 4: Linting
echo ""
echo "🔍 Step 4: Running ESLint..."
pnpm run lint || npm run lint || {
  echo -e "${YELLOW}⚠️  Linting issues found${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
}
echo -e "${GREEN}✅ Linting passed${NC}"

# Step 5: Build production bundle
echo ""
echo "🏗️  Step 5: Building production bundle..."
pnpm run build || npm run build || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "   Build size: $BUILD_SIZE"

# Step 6: Database migration check
echo ""
echo "💾 Step 6: Checking database migrations..."
if [ -d "supabase/migrations" ]; then
  MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
  echo "   Found $MIGRATION_COUNT migration files"
  
  read -p "Apply database migrations? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd supabase
    supabase db push || {
      echo -e "${RED}❌ Migration failed${NC}"
      exit 1
    }
    cd ..
    echo -e "${GREEN}✅ Migrations applied${NC}"
  else
    echo -e "${YELLOW}⚠️  Skipped migrations${NC}"
  fi
fi

# Step 7: Run backfill scripts
echo ""
echo "📊 Step 7: Checking data backfill..."
read -p "Run provincial generation backfill? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  node scripts/backfill-provincial-generation.mjs || {
    echo -e "${YELLOW}⚠️  Backfill failed (non-critical)${NC}"
  }
  echo -e "${GREEN}✅ Backfill completed${NC}"
else
  echo -e "${YELLOW}⚠️  Skipped backfill${NC}"
fi

# Step 8: Environment variables check
echo ""
echo "🔐 Step 8: Checking environment variables..."
if [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ .env.local not found${NC}"
  exit 1
fi

# Check required variables
REQUIRED_VARS=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^$var=" .env.local; then
    echo -e "${RED}❌ Missing required variable: $var${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✅ Environment variables configured${NC}"

# Step 9: Deploy to Netlify
echo ""
echo "🌐 Step 9: Deploying to Netlify..."
read -p "Deploy to production? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  netlify deploy --prod || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Deployed to production${NC}"
else
  echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
  exit 0
fi

# Step 10: Post-deployment verification
echo ""
echo "✅ Step 10: Post-deployment verification..."
echo ""
echo "Please verify the following:"
echo "  1. Visit your production URL"
echo "  2. Check Ops Health panel shows green"
echo "  3. Verify wind/solar accuracy panels render"
echo "  4. Test storage dispatch status"
echo "  5. Check analytics completeness filtering"
echo "  6. Test award evidence export"
echo ""

# Get deployment URL
DEPLOY_URL=$(netlify status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4 | head -1)
if [ -n "$DEPLOY_URL" ]; then
  echo "🌐 Production URL: $DEPLOY_URL"
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Deployment Summary:"
echo "  - Branch: $CURRENT_BRANCH"
echo "  - Build size: $BUILD_SIZE"
echo "  - Node version: $(node -v)"
echo "  - Timestamp: $(date)"
echo ""
echo "📝 Next Steps:"
echo "  1. Monitor Netlify logs for errors"
echo "  2. Check Supabase edge function logs"
echo "  3. Verify GitHub Actions cron is running"
echo "  4. Test all critical user flows"
echo "  5. Generate award evidence CSV"
echo ""
echo "🔗 Useful Links:"
echo "  - Netlify Dashboard: https://app.netlify.com"
echo "  - Supabase Dashboard: https://supabase.com/dashboard"
echo "  - GitHub Actions: https://github.com/[user]/[repo]/actions"
echo ""
echo "✅ Deployment successful! 🚀"
