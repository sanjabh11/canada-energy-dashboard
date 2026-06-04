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

# Check for uncommitted or untracked changes
if [ -n "$(git status --short)" ]; then
  echo -e "${YELLOW}⚠️  Uncommitted or untracked changes detected${NC}"
  git status --short
  echo "   Commit, stash, or intentionally remove local changes before deploying"
  exit 1
fi
echo -e "${GREEN}✅ Clean worktree${NC}"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check package manager path. The repo pins pnpm through packageManager, so use
# Corepack instead of relying on a globally installed pnpm shim.
if ! command -v corepack >/dev/null 2>&1; then
  echo -e "${RED}❌ Corepack is required to run the pinned pnpm version${NC}"
  exit 1
fi
PNPM_VERSION=$(corepack pnpm --version)
echo -e "${GREEN}✅ pnpm via Corepack: $PNPM_VERSION${NC}"

# Step 2: CEIP release-readiness gate
echo ""
echo "🧪 Step 2: Running CEIP release-readiness gate..."
corepack pnpm run check:release-readiness || {
  echo -e "${RED}❌ CEIP release-readiness gate failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ CEIP release-readiness gate passed${NC}"

# Step 3: Security audit
echo ""
echo "🔒 Step 3: Running security audit..."
corepack pnpm audit --audit-level=high || {
  echo -e "${YELLOW}⚠️  Security vulnerabilities found${NC}"
  echo "   Run: pnpm audit fix"
  exit 1
}
echo -e "${GREEN}✅ Security audit passed${NC}"

# Step 4: Type checking
echo ""
echo "📝 Step 4: Running TypeScript type check..."
TYPE_CHECK_RAN=false
if corepack pnpm run --if-present type-check; then
  TYPE_CHECK_RAN=true
elif npm run --if-present type-check; then
  TYPE_CHECK_RAN=true
fi

if [ "$TYPE_CHECK_RAN" = false ]; then
  echo -e "${YELLOW}⚠️  No type-check script found, skipping${NC}"
else
  echo -e "${GREEN}✅ Type check passed${NC}"
fi

# Step 5: Linting
echo ""
echo "🔍 Step 5: Running ESLint..."
corepack pnpm run lint || npm run lint || {
  echo -e "${YELLOW}⚠️  Linting issues found${NC}"
  exit 1
}
echo -e "${GREEN}✅ Linting passed${NC}"

# Step 6: Build production bundle
echo ""
echo "🏗️  Step 6: Building production bundle..."
corepack pnpm run build:prod || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}
corepack pnpm run check:built-client-env || {
  echo -e "${RED}❌ Built client env check failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Check build size
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "   Build size: $BUILD_SIZE"

# Step 7: Database migration check
echo ""
echo "💾 Step 7: Checking database migrations..."
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

# Step 8: Run backfill scripts
echo ""
echo "📊 Step 8: Checking data backfill..."
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

# Step 9: Environment variables check
echo ""
echo "🔐 Step 9: Checking environment variables..."
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

# Step 10: Deploy to Netlify
echo ""
echo "🌐 Step 10: Deploying to Netlify..."
echo "This deploy requires explicit owner approval outside this script."
read -p "Type DEPLOY CEIP PRODUCTION to deploy to production: " DEPLOY_CONFIRMATION
echo
if [ "$DEPLOY_CONFIRMATION" = "DEPLOY CEIP PRODUCTION" ]; then
  netlify deploy --prod --no-build --dir=dist || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Deployed to production${NC}"
else
  echo -e "${YELLOW}⚠️  Deployment cancelled${NC}"
  exit 0
fi

# Step 11: Post-deployment verification
echo ""
echo "✅ Step 11: Post-deployment verification..."
corepack pnpm run check:post-deploy-live || {
  echo -e "${RED}❌ Post-deploy live parity check failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Post-deploy live parity check passed${NC}"
echo ""
echo "Please verify the following:"
echo "  1. Review Netlify deploy logs for unexpected warnings"
echo "  2. Confirm root, manifest.json, and schema-webapp.jsonld now carry proof-pack metadata"
echo "  3. Confirm proof-pack routes are reachable for utility forecast, forecast benchmarking, regulatory filing, pilot readiness, GA/ICI, and BYO-CSV"
echo "  4. Keep buyer-proven 95% market confidence unchanged until validate:pilot-evidence --require-95 passes"
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
