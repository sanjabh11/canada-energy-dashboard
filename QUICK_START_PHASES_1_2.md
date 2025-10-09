# QUICK START: PHASES 1 & 2 DEPLOYMENT

**Total Time**: 20 minutes  
**Prerequisites**: Supabase project, API keys configured  
**Result**: Fully functional renewable optimization system

---

## 🚀 Step-by-Step Deployment

### Step 1: Deploy Database Migrations (5 minutes)

**Option A: Supabase Dashboard** (RECOMMENDED if CLI connection issues)

1. Go to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
2. Copy contents of `supabase/migrations/20251009_renewable_forecasting_part1.sql`
3. Paste into SQL Editor, click **Run**
4. Repeat for `20251009_renewable_forecasting_part2.sql`
5. Verify: Check "Table Editor" tab, should see 8 new tables

**Option B: Supabase CLI**

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard

# Deploy all pending migrations
supabase db push
# Enter password when prompted: posit12#
# Type Y to confirm

# Verify tables created
supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%forecast%' OR table_name LIKE '%curtailment%')"
```

**Expected Output**: 8 tables listed (renewable_forecasts, forecast_actuals, forecast_performance, weather_observations, curtailment_events, curtailment_reduction_recommendations, storage_dispatch_log, renewable_capacity_registry)

---

### Step 2: Deploy Edge Functions (3 minutes)

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard

# Deploy Phase 1: Forecasting API
supabase functions deploy api-v2-renewable-forecast

# Deploy Phase 2: Curtailment API
supabase functions deploy api-v2-curtailment-reduction

# Test Phase 1
curl "$SUPABASE_EDGE_BASE/functions/v1/api-v2-renewable-forecast?province=ON&source_type=solar&horizon_hours=24" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# Test Phase 2
curl "$SUPABASE_EDGE_BASE/functions/v1/api-v2-curtailment-reduction/statistics?province=ON" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

**Expected**: JSON responses (may be empty initially, that's OK)

---

### Step 3: Add Dashboard Routes (2 minutes)

Update `src/App.tsx` (or your routing file):

```typescript
import RenewableOptimizationHub from './components/RenewableOptimizationHub';
import CurtailmentAnalyticsDashboard from './components/CurtailmentAnalyticsDashboard';

// Add to your routes
<Route path="/renewable-optimization" element={<RenewableOptimizationHub />} />
<Route path="/curtailment-analytics" element={<CurtailmentAnalyticsDashboard />} />
```

---

### Step 4: Start Development Server (1 minute)

```bash
# From project root
npm run dev

# Or if using pnpm
pnpm run dev
```

**Expected**: 
```
VITE v7.1.9  ready in 2184 ms
➜  Local:   http://localhost:5173/
```

---

### Step 5: Verify Phase 1 - Forecasting (5 minutes)

1. **Open Dashboard**:
   ```
   http://localhost:5173/renewable-optimization
   ```

2. **Generate Test Forecast**:
   - Select province: **Ontario**
   - Click **"Generate Forecast"** button
   - Wait 2-3 seconds

3. **Verify Tabs**:
   - ✅ **Forecasts tab**: Shows recent predictions with confidence intervals
   - ✅ **Performance tab**: Displays MAE/MAPE/RMSE (may be empty)
   - ✅ **Curtailment tab**: Lists events (may be empty)
   - ✅ **Storage tab**: Shows dispatch log (may be empty)

4. **Check Award Metrics** (top of page):
   - Should see forecast count
   - May show "No actuals yet" for error metrics

**Expected**: Dashboard loads, forecast generates successfully, data appears in Forecasts tab

---

### Step 6: Verify Phase 2 - Curtailment (5 minutes)

1. **Open Dashboard**:
   ```
   http://localhost:5173/curtailment-analytics
   ```

2. **Generate Mock Data**:
   - Click **"Generate Mock Event"** button 10-15 times
   - Wait 1 second between clicks

3. **Verify Tabs**:
   - ✅ **Events tab**: Shows curtailment events with reasons, MW curtailed, costs
   - ✅ **Recommendations tab**: Displays AI strategies with ROI
   - ✅ **Analytics tab**: Charts render (pie, bar, line)
   - ✅ **Award Evidence tab**: Shows statistics summary

4. **Check Award Metrics** (top of page):
   - Total Events (30d): Should show ~10-15
   - Curtailment Avoided: May be 0 (no implemented recommendations yet)
   - Opportunity Cost Saved: Should show $0
   - ROI: May be 0

**Expected**: Dashboard loads, mock events appear, charts render correctly

---

## ✅ Success Criteria

After completing all 6 steps, you should have:

- [x] **8 database tables** created and accessible
- [x] **2 Edge Functions** deployed and responding
- [x] **2 dashboard routes** added and functional
- [x] **Phase 1 dashboard** displays and generates forecasts
- [x] **Phase 2 dashboard** displays and generates mock curtailment events
- [x] **No console errors** in browser dev tools

---

## 🎯 Next Steps After Deployment

### Immediate (Today)

1. **Explore Dashboards**: Familiarize yourself with all tabs and features
2. **Generate More Data**: 
   - Phase 1: Generate forecasts for AB, BC, QC (multiple horizons)
   - Phase 2: Create 20-30 mock curtailment events
3. **Test API Endpoints**: Use curl or Postman to test all endpoints directly

### This Week

1. **Real Data Integration Planning**:
   - Identify data sources for actual generation (IESO, AESO)
   - Plan integration approach (manual vs API)
   - Set up data collection schedule

2. **Baseline Establishment**:
   - Phase 1: Generate forecasts every hour for 7 days
   - Phase 2: Log curtailment events when detected
   - Document baseline performance

3. **Team Training**:
   - Demo dashboards to operators/stakeholders
   - Explain recommendation process
   - Set up alert workflows

### Next 2-4 Weeks

1. **Begin Data Collection** (Phase 1):
   - Collect actual generation from IESO/AESO
   - Record actuals in database using `recordActualGeneration()`
   - Calculate first MAE/MAPE metrics

2. **Pilot Implementations** (Phase 2):
   - Implement first 3-5 recommendations
   - Measure actual MWh saved
   - Document case studies
   - Refine AI based on effectiveness

---

## 🛠️ Troubleshooting

### Issue: Edge Function deployment fails

**Error**: `failed to deploy function`

**Solution**:
```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref qnymbecjgeaoxsfphrti

# Retry deployment
supabase functions deploy api-v2-renewable-forecast
```

### Issue: Dashboard shows "No data"

**Symptoms**: Empty tables, no forecasts/events

**Solutions**:
1. **Generate mock data**: Use dashboard buttons
2. **Check API response**: Open browser Network tab, verify 200 responses
3. **Verify database**: Check Supabase Table Editor for data
4. **Check environment variables**: Ensure `.env` has correct Supabase keys

### Issue: Migrations fail with constraint error

**Error**: `ON CONFLICT ... no unique constraint`

**Solution**: All migrations have been fixed to use idempotent patterns. If you still see this:
1. Check `MIGRATION_FIX_COMPLETE.md` for details
2. Use Dashboard SQL Editor instead of CLI
3. Ensure you're running latest migration files (check `git status`)

### Issue: Charts not rendering

**Symptoms**: Dashboard loads but charts are blank

**Solutions**:
1. **Check data**: Ensure mock data was generated
2. **Console errors**: Open browser console, look for Recharts errors
3. **Resize window**: Sometimes charts need a re-render
4. **Refresh page**: Hard refresh (Cmd+Shift+R on Mac)

---

## 📞 API Quick Reference

### Phase 1: Generate Forecast

```bash
# GET - Single forecast
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/functions/v1/api-v2-renewable-forecast?province=ON&source_type=solar&horizon_hours=24" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# POST - Multi-horizon batch
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/functions/v1/api-v2-renewable-forecast" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province":"ON","source_type":"wind","horizons":[1,6,24],"fetch_weather":true}'
```

### Phase 2: Detect Curtailment

```bash
# POST - Detect event
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/functions/v1/api-v2-curtailment-reduction/detect" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province":"ON","sourceType":"solar","currentGeneration":800,"forecastGeneration":600,"gridDemand":12000,"marketPrice":45.50}'

# POST - Generate mock event (for testing)
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/functions/v1/api-v2-curtailment-reduction/mock" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province":"ON","sourceType":"solar"}'

# GET - Statistics
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/functions/v1/api-v2-curtailment-reduction/statistics?province=ON&start_date=2025-09-01&end_date=2025-10-09" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 📊 Database Verification

After deployment, verify tables exist:

```sql
-- Run in Supabase SQL Editor
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND (table_name LIKE '%forecast%' OR table_name LIKE '%curtailment%' OR table_name LIKE '%weather%' OR table_name LIKE '%storage%')
ORDER BY table_name;
```

**Expected Output**:
```
renewable_forecasts                        15 columns
forecast_actuals                          12 columns
forecast_performance                      16 columns
weather_observations                      18 columns
curtailment_events                        20 columns
curtailment_reduction_recommendations     15 columns
storage_dispatch_log                      23 columns
renewable_capacity_registry               19 columns
```

---

## 🎯 Post-Deployment Validation Checklist

Run through this checklist to ensure everything is working:

### Phase 1 Validation
- [ ] Navigate to `/renewable-optimization`
- [ ] Select province "Ontario"
- [ ] Click "Generate Forecast" for solar 24h
- [ ] Verify forecast appears in Forecasts tab
- [ ] Check forecast has: predicted_output_mw, confidence_interval, model_type
- [ ] Navigate to Performance tab (may be empty, that's OK)
- [ ] Verify no console errors

### Phase 2 Validation
- [ ] Navigate to `/curtailment-analytics`
- [ ] Click "Generate Mock Event" 5 times
- [ ] Verify events appear in Events tab
- [ ] Each event should have: curtailed_mw, reason, opportunity_cost
- [ ] Navigate to Recommendations tab
- [ ] Verify recommendations generated for events
- [ ] Check Analytics tab - charts should render
- [ ] Navigate to Award Evidence tab
- [ ] Verify statistics calculate correctly

### API Validation
- [ ] Test Phase 1 GET endpoint (forecast for ON solar 24h)
- [ ] Test Phase 2 statistics endpoint
- [ ] Test Phase 2 mock event creation
- [ ] Verify all endpoints return 200 OK
- [ ] Check responses have expected JSON structure

### Database Validation
- [ ] Run SQL query above to list tables
- [ ] Verify 8 tables exist with correct column counts
- [ ] Check `renewable_forecasts` has data (from dashboard)
- [ ] Check `curtailment_events` has data (from mock generation)
- [ ] Verify RLS policies are enabled (Table Editor > Policies)

---

## 🎬 You're Done!

If all validation checks pass, you have successfully deployed:

✅ **Phase 1**: Solar/Wind Forecasting Engine  
✅ **Phase 2**: Curtailment Reduction System  
✅ **2 Interactive Dashboards**  
✅ **2 Production API Endpoints**  
✅ **8 Database Tables with Data**

**Next Milestone**: Begin real-world data collection for award evidence

**Deployment Time**: ~20 minutes  
**Status**: ✅ **PRODUCTION READY**

---

**Need Help?** Refer to:
- **Phase 1 Detailed Setup**: `/docs/RENEWABLE_OPTIMIZATION_SETUP.md`
- **Phase 2 Detailed Setup**: `/docs/PHASE2_CURTAILMENT_REDUCTION_SETUP.md`
- **Overall Status**: `/RENEWABLE_ENERGY_AWARD_STATUS.md`
- **Troubleshooting**: Check console logs, Supabase function logs, browser network tab

