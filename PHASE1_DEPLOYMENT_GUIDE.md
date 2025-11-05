# Phase 1 Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Phase 1 features to production:

1. **AI Data Centre Dashboard** - AESO queue management and grid impact tracking
2. **Hydrogen Economy Hub** - Edmonton/Calgary hydrogen hub comparison
3. **Critical Minerals Supply Chain** - Supply chain intelligence and gap analysis

## Pre-Deployment Checklist

### ✅ Completed Items

- [x] Database migrations created (3 files, 62KB)
- [x] Edge Functions implemented (4 APIs)
- [x] Frontend dashboards built (3 components, 1,740 lines)
- [x] Navigation integration complete
- [x] TypeScript compilation passes
- [x] Vite build succeeds (2,794 KB bundle)
- [x] deno.json configuration files created
- [x] config.toml updated with Phase 1 functions
- [x] All code committed and pushed to branch

### 📋 Deployment Preparation

Before deploying, ensure you have:

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project access (Project Ref: `qnymbecjgeaoxsfphrti`)
- [ ] Supabase access token configured
- [ ] Database backup created (recommended)
- [ ] Frontend hosting credentials (Netlify/Vercel)

## Deployment Steps

### Step 1: Database Migration

**Apply the three Phase 1 migrations to your Supabase database:**

```bash
# Navigate to project root
cd /home/user/canada-energy-dashboard

# Login to Supabase (if not already logged in)
supabase login

# Link to your Supabase project
supabase link --project-ref qnymbecjgeaoxsfphrti

# Apply migrations
supabase db push

# Alternative: Apply migrations individually
psql $DATABASE_URL < supabase/migrations/20251105001_ai_data_centres.sql
psql $DATABASE_URL < supabase/migrations/20251105002_hydrogen_economy.sql
psql $DATABASE_URL < supabase/migrations/20251105003_critical_minerals_enhanced.sql
```

**Verify migrations:**

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ai_data_centres',
  'aeso_interconnection_queue',
  'hydrogen_facilities',
  'hydrogen_projects',
  'critical_minerals_projects',
  'minerals_supply_chain'
);

-- Verify sample data loaded
SELECT COUNT(*) FROM ai_data_centres;  -- Should be 5
SELECT COUNT(*) FROM aeso_interconnection_queue;  -- Should be 8
SELECT COUNT(*) FROM hydrogen_facilities;  -- Should be 5
SELECT COUNT(*) FROM critical_minerals_projects;  -- Should be 7
```

### Step 2: Deploy Edge Functions

**Deploy all 4 Phase 1 Edge Functions:**

```bash
# Deploy AI Data Centres API
supabase functions deploy api-v2-ai-datacentres --project-ref qnymbecjgeaoxsfphrti

# Deploy AESO Queue API
supabase functions deploy api-v2-aeso-queue --project-ref qnymbecjgeaoxsfphrti

# Deploy Hydrogen Hub API
supabase functions deploy api-v2-hydrogen-hub --project-ref qnymbecjgeaoxsfphrti

# Deploy Minerals Supply Chain API
supabase functions deploy api-v2-minerals-supply-chain --project-ref qnymbecjgeaoxsfphrti
```

**Verify Edge Function deployment:**

```bash
# List all deployed functions
supabase functions list --project-ref qnymbecjgeaoxsfphrti

# Test each endpoint
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres?province=AB
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-aeso-queue?status=Active
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-hydrogen-hub?hub=Edmonton
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-minerals-supply-chain?mineral=Lithium
```

### Step 3: Build and Deploy Frontend

**Build the production frontend:**

```bash
# Install dependencies and build
npm run build:prod

# Output should be in dist/ directory
ls -lh dist/
```

**Deploy to Netlify (recommended):**

```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist

# Or configure continuous deployment from GitHub
# 1. Connect your GitHub repository to Netlify
# 2. Set build command: npm run build:prod
# 3. Set publish directory: dist
# 4. Add environment variables (see below)
```

**Deploy to Vercel (alternative):**

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy to production
vercel --prod

# Or use Vercel GitHub integration
```

### Step 4: Environment Variables

**Set the following environment variables in your hosting platform:**

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Build Configuration
BUILD_MODE=prod
NODE_ENV=production
```

### Step 5: Post-Deployment Verification

**Test each dashboard:**

1. **AI Data Centre Dashboard**
   - Navigate to `/AIDataCentres` tab
   - Verify Phase 1 allocation gauge displays
   - Check AESO queue breakdown chart
   - Confirm data centre registry table loads

2. **Hydrogen Economy Dashboard**
   - Navigate to `/HydrogenHub` tab
   - Verify Edmonton vs Calgary hub comparison
   - Check hydrogen color distribution chart
   - Confirm major projects cards display

3. **Critical Minerals Dashboard**
   - Navigate to `/CriticalMinerals` tab
   - Verify supply chain completeness visualization
   - Check China dependency pie chart
   - Confirm project registry table loads

**API Health Check:**

```bash
# Test all Phase 1 APIs
curl -I https://your-domain.com/functions/v1/api-v2-ai-datacentres
curl -I https://your-domain.com/functions/v1/api-v2-aeso-queue
curl -I https://your-domain.com/functions/v1/api-v2-hydrogen-hub
curl -I https://your-domain.com/functions/v1/api-v2-minerals-supply-chain

# All should return HTTP 200 OK
```

### Step 6: Monitoring and Analytics

**Set up monitoring:**

1. **Supabase Dashboard:**
   - Monitor Edge Function invocations
   - Check database query performance
   - Review error logs

2. **Frontend Analytics:**
   - Track page views for new tabs
   - Monitor API call latency
   - Set up error tracking (Sentry recommended)

3. **Database Performance:**
   ```sql
   -- Check query performance
   SELECT * FROM pg_stat_statements
   WHERE query LIKE '%ai_data_centres%'
   OR query LIKE '%hydrogen%'
   OR query LIKE '%minerals%'
   ORDER BY total_exec_time DESC
   LIMIT 10;
   ```

## Rollback Plan

If issues occur during deployment:

### Database Rollback

```bash
# Rollback last migration
supabase db reset --linked

# Or manually drop Phase 1 tables
psql $DATABASE_URL << EOF
DROP TABLE IF EXISTS ai_dc_emissions CASCADE;
DROP TABLE IF EXISTS alberta_grid_capacity CASCADE;
DROP TABLE IF EXISTS aeso_interconnection_queue CASCADE;
DROP TABLE IF EXISTS ai_dc_power_consumption CASCADE;
DROP TABLE IF EXISTS ai_data_centres CASCADE;

DROP TABLE IF EXISTS hydrogen_demand CASCADE;
DROP TABLE IF EXISTS hydrogen_prices CASCADE;
DROP TABLE IF EXISTS hydrogen_infrastructure CASCADE;
DROP TABLE IF EXISTS hydrogen_projects CASCADE;
DROP TABLE IF EXISTS hydrogen_production CASCADE;
DROP TABLE IF EXISTS hydrogen_facilities CASCADE;

DROP TABLE IF EXISTS ev_minerals_demand_forecast CASCADE;
DROP TABLE IF EXISTS minerals_strategic_stockpile CASCADE;
DROP TABLE IF EXISTS battery_supply_chain CASCADE;
DROP TABLE IF EXISTS minerals_trade_flows CASCADE;
DROP TABLE IF EXISTS minerals_prices CASCADE;
DROP TABLE IF EXISTS minerals_supply_chain CASCADE;
DROP TABLE IF EXISTS critical_minerals_projects CASCADE;
EOF
```

### Edge Function Rollback

```bash
# Delete deployed functions
supabase functions delete api-v2-ai-datacentres --project-ref qnymbecjgeaoxsfphrti
supabase functions delete api-v2-aeso-queue --project-ref qnymbecjgeaoxsfphrti
supabase functions delete api-v2-hydrogen-hub --project-ref qnymbecjgeaoxsfphrti
supabase functions delete api-v2-minerals-supply-chain --project-ref qnymbecjgeaoxsfphrti
```

### Frontend Rollback

```bash
# Netlify: Rollback to previous deployment
netlify rollback

# Vercel: Rollback from dashboard or CLI
vercel rollback
```

## Data Population Strategy

Phase 1 includes sample data for demonstration. For production use:

### Real-Time Data Integration

1. **AI Data Centres & AESO Queue:**
   - Integrate with AESO API (https://api.aeso.ca/)
   - Set up cron job for queue updates (daily)
   - Manual data entry for new facilities

2. **Hydrogen Economy:**
   - Scrape Alberta government announcements
   - Integrate with Natural Resources Canada data
   - Manual tracking of major projects

3. **Critical Minerals:**
   - Integrate with Natural Resources Canada API
   - Connect to CME/LME for price data
   - Track S&P Global Market Intelligence

### Cron Job Setup

```bash
# Example cron job for AESO queue updates (daily at 2 AM)
0 2 * * * curl -X POST https://your-domain.com/functions/v1/sync-aeso-queue

# Example cron job for hydrogen pricing (weekly)
0 3 * * 1 curl -X POST https://your-domain.com/functions/v1/sync-hydrogen-prices

# Example cron job for minerals pricing (daily)
0 4 * * * curl -X POST https://your-domain.com/functions/v1/sync-minerals-prices
```

## Sponsorship Outreach

With Phase 1 deployed, you're ready to approach sponsors:

### Target Sponsors

1. **AI Data Centre Operators:**
   - Microsoft Azure (Calgary facility)
   - Amazon Web Services (planned Calgary)
   - Digital Realty
   - QTS Data Centers

2. **Hydrogen Economy:**
   - Air Products ($1.3B Edmonton)
   - Suncor Energy
   - Parkland Corporation
   - ATCO

3. **Critical Minerals:**
   - Teck Resources
   - First Quantum Minerals
   - Li-Cycle (battery recycling)
   - Nano One Materials

### Pitch Materials

Use PHASE1_FRONTEND_COMPLETE.md to create:
- Executive summary (1-pager)
- Demo video (2-3 minutes)
- ROI analysis showing sponsorship value
- Media coverage potential

### Success Metrics

Track these KPIs to demonstrate value:

- **Unique visitors:** Target 1,000/month by Q1 2026
- **API calls:** Track per-sponsor usage
- **Media mentions:** Target 5 articles by Q2 2026
- **Government engagement:** AESO, NRCAN, AEPA contact
- **Sponsorship revenue:** Target $325K-$1M+ annually

## Support and Troubleshooting

### Common Issues

**Issue: Edge Functions return 404**
- Verify deployment: `supabase functions list`
- Check function logs: `supabase functions logs api-v2-ai-datacentres`
- Verify CORS settings in function code

**Issue: Dashboard shows "Loading..." indefinitely**
- Check browser console for API errors
- Verify Supabase URL and anon key in .env
- Test API endpoints directly with curl

**Issue: Database queries slow**
- Check indexes: `\d+ ai_data_centres` in psql
- Review query plans: `EXPLAIN ANALYZE SELECT...`
- Consider materialized views for complex queries

### Getting Help

- **Supabase Docs:** https://supabase.com/docs
- **Project Repository:** https://github.com/sanjabh11/canada-energy-dashboard
- **Branch:** `claude/canada-energy-analysis-improvements-011CUpkRFhrAaZfk5NF9kChz`

## Next Steps: Phase 2

After successful Phase 1 deployment, consider:

1. **Data Collection Automation**
   - AESO API integration
   - Price data feeds
   - Automated reporting

2. **Advanced Analytics**
   - Predictive modeling for queue wait times
   - Hydrogen cost competitiveness analysis
   - Supply chain risk scoring

3. **Additional Features**
   - User authentication and personalization
   - Export/download functionality
   - Email alerts for critical updates
   - Mobile app development

## Deployment Sign-Off

**Deployment Date:** _________________

**Deployed By:** _________________

**Version:** Phase 1 (commit: 9d9927d)

**Verification Checklist:**

- [ ] All 3 database migrations applied successfully
- [ ] All 4 Edge Functions deployed and tested
- [ ] Frontend build completed without errors
- [ ] All 3 dashboards load and display data
- [ ] Environment variables configured
- [ ] Monitoring and analytics set up
- [ ] Rollback plan documented and tested
- [ ] Sponsorship materials prepared

**Notes:**

___________________________________________
___________________________________________
___________________________________________

---

**Phase 1 Status: ✅ READY FOR PRODUCTION DEPLOYMENT**

For questions or issues during deployment, refer to PHASE1_IMPLEMENTATION_SUMMARY.md and PHASE1_FRONTEND_COMPLETE.md for detailed technical documentation.
