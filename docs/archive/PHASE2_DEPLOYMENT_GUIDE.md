# 🚀 PHASE 2 DEPLOYMENT GUIDE - Complete Instructions
**Date**: November 12, 2025
**Features**: CCUS, Indigenous, SMR, Grid Queue
**Target**: Production deployment to Supabase

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **Prerequisites**
- ✅ Latest code pulled from GitHub
- ✅ Supabase project access (qnymbecjgeaoxsfphrti)
- ✅ Local dev environment running (`npm run dev`)
- ✅ Browser DevTools ready for testing

### **Files to Deploy** (4 migrations)
```
supabase/migrations/
├── 20251112001_ccus_infrastructure.sql (497 lines)
├── 20251112002_indigenous_equity_enhancement.sql
├── 20251112003_smr_deployment_tracker.sql
└── 20251112004_grid_queue_tracker.sql
```

### **Edge Function to Deploy** (1 function)
```
supabase/functions/
└── api-v2-ccus/index.ts
```

---

## 🗄️ DATABASE DEPLOYMENT

### **Step 1: Deploy CCUS Migration**

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
   ```

2. **Copy migration file:**
   ```bash
   cat supabase/migrations/20251112001_ccus_infrastructure.sql
   ```

3. **Paste into SQL Editor → Click "Run"**
   - Expected: ✅ "Success. No rows returned"

4. **Verify tables created:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'ccus_%'
   ORDER BY table_name;

   -- Should return 5 tables:
   -- ccus_capture_data
   -- ccus_economics
   -- ccus_facilities
   -- ccus_pipelines
   -- ccus_storage_sites
   ```

5. **Verify data seeded:**
   ```sql
   -- Check facilities (should be 5)
   SELECT COUNT(*) as facility_count FROM ccus_facilities;

   -- Check Pathways Alliance projects (should be 6)
   SELECT COUNT(*) as pathways_count FROM pathways_alliance_projects;

   -- View key facilities
   SELECT
     facility_name,
     operator,
     status,
     design_capture_capacity_mt_per_year,
     province
   FROM ccus_facilities
   ORDER BY design_capture_capacity_mt_per_year DESC;

   -- Expected: Capital Power (3.0 Mt), Quest (1.2 Mt), NWRP (1.2 Mt), etc.
   ```

6. **Disable RLS for testing:**
   ```sql
   ALTER TABLE ccus_facilities DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ccus_capture_data DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ccus_pipelines DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ccus_storage_sites DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ccus_economics DISABLE ROW LEVEL SECURITY;
   ALTER TABLE pathways_alliance_projects DISABLE ROW LEVEL SECURITY;
   ```

✅ **CCUS Database: DEPLOYED**

---

### **Step 2: Deploy Indigenous Migration**

1. **New SQL Editor tab:**
   ```
   https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
   ```

2. **Copy migration:**
   ```bash
   cat supabase/migrations/20251112002_indigenous_equity_enhancement.sql
   ```

3. **Paste → Run**

4. **Verify tables:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'indigenous_%'
   ORDER BY table_name;

   -- Should include (among others):
   -- indigenous_economic_impact
   -- indigenous_equity_ownership
   -- indigenous_revenue_agreements
   ```

5. **Verify data:**
   ```sql
   -- Check equity projects (should be 6)
   SELECT COUNT(*) FROM indigenous_equity_ownership;

   -- Check revenue agreements (should be 5)
   SELECT COUNT(*) FROM indigenous_revenue_agreements;

   -- View top equity projects
   SELECT
     project_name,
     indigenous_community,
     ownership_percent,
     equity_value_cad/1000000 as equity_millions
   FROM indigenous_equity_ownership
   ORDER BY equity_value_cad DESC
   LIMIT 5;

   -- Expected: Wataynikaneyap ($340M), Makwa Solar ($30M), etc.
   ```

6. **Disable RLS:**
   ```sql
   ALTER TABLE indigenous_equity_ownership DISABLE ROW LEVEL SECURITY;
   ALTER TABLE indigenous_revenue_agreements DISABLE ROW LEVEL SECURITY;
   ALTER TABLE indigenous_economic_impact DISABLE ROW LEVEL SECURITY;
   ```

✅ **Indigenous Database: DEPLOYED**

---

### **Step 3: Deploy SMR Migration**

1. **New SQL Editor tab**

2. **Copy migration:**
   ```bash
   cat supabase/migrations/20251112003_smr_deployment_tracker.sql
   ```

3. **Paste → Run**

4. **Verify tables:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'smr_%'
   ORDER BY table_name;

   -- Should return 4 tables:
   -- smr_economics
   -- smr_projects
   -- smr_regulatory_milestones
   -- smr_vendors
   ```

5. **Verify data:**
   ```sql
   -- Check projects (should be 7)
   SELECT COUNT(*) FROM smr_projects;

   -- Check vendors (should be 5)
   SELECT COUNT(*) FROM smr_vendors;

   -- View flagship project
   SELECT
     project_name,
     reactor_model,
     total_capacity_mw,
     estimated_capex_cad/1000000000 as capex_billions,
     status,
     target_operational_date
   FROM smr_projects
   WHERE id = 'opg-darlington-smr';

   -- Expected: Darlington New Nuclear Project (SMR), BWRX-300, 1200 MW, $26B
   ```

6. **Disable RLS:**
   ```sql
   ALTER TABLE smr_projects DISABLE ROW LEVEL SECURITY;
   ALTER TABLE smr_vendors DISABLE ROW LEVEL SECURITY;
   ALTER TABLE smr_regulatory_milestones DISABLE ROW LEVEL SECURITY;
   ALTER TABLE smr_economics DISABLE ROW LEVEL SECURITY;
   ```

✅ **SMR Database: DEPLOYED**

---

### **Step 4: Deploy Grid Queue Migration**

1. **New SQL Editor tab**

2. **Copy migration:**
   ```bash
   cat supabase/migrations/20251112004_grid_queue_tracker.sql
   ```

3. **Paste → Run**

4. **Verify tables:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'grid_queue%'
   ORDER BY table_name;

   -- Should return 3 tables:
   -- grid_queue_milestones
   -- grid_queue_projects
   -- grid_queue_statistics
   ```

5. **Verify data:**
   ```sql
   -- Check projects (should be 23+)
   SELECT COUNT(*) as total_projects FROM grid_queue_projects;

   -- Count by province
   SELECT
     province,
     COUNT(*) as projects,
     ROUND(SUM(capacity_mw)/1000, 1) as capacity_gw
   FROM grid_queue_projects
   GROUP BY province
   ORDER BY capacity_gw DESC;

   -- Expected: AB, ON, BC, SK, MB with 23+ total projects
   ```

6. **Disable RLS:**
   ```sql
   ALTER TABLE grid_queue_projects DISABLE ROW LEVEL SECURITY;
   ALTER TABLE grid_queue_milestones DISABLE ROW LEVEL SECURITY;
   ALTER TABLE grid_queue_statistics DISABLE ROW LEVEL SECURITY;
   ```

✅ **Grid Queue Database: DEPLOYED**

---

## ☁️ EDGE FUNCTION DEPLOYMENT

### **Deploy CCUS API Edge Function**

1. **Terminal command:**
   ```bash
   npx supabase functions deploy api-v2-ccus --project-ref qnymbecjgeaoxsfphrti
   ```

2. **Expected output:**
   ```
   Uploading asset (api-v2-ccus): supabase/functions/api-v2-ccus/index.ts
   Deployed Functions on project qnymbecjgeaoxsfphrti: api-v2-ccus
   ```

3. **Test endpoint (with your anon key):**
   ```bash
   # Get anon key from: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/settings/api

   curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ccus?province=AB" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

4. **Expected response:**
   ```json
   {
     "facilities": [...],
     "pathways_alliance": {
       "total_investment": 16500000000,
       "projects": [...]
     },
     "summary": {
       "total_operational_capacity_mt": 3.4,
       "pathways_total_investment": 16500000000
     }
   }
   ```

✅ **Edge Function: DEPLOYED**

---

## 🧪 FRONTEND TESTING

### **Test 1: CCUS Tracker**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate:**
   - Open: http://localhost:5173/
   - Click: **"CCUS Tracker"** (6th core tab)

3. **Verify 4 tabs load:**
   - ✅ **Pathways Alliance**: $16.5B proposal, $7.15B federal gap, 6 projects table
   - ✅ **Overview**: Capacity charts, storage utilization
   - ✅ **Facilities**: 5 facilities table (Quest, NWRP, Boundary Dam, Strathcona, Capital Power)
   - ✅ **Economics**: Investment breakdown, federal funding

4. **Check browser console (F12):**
   - ✅ No errors
   - ✅ Successful fetch: `GET .../api-v2-ccus?province=AB`
   - ✅ Data loaded

**Screenshot Capture**: All 4 tabs

---

### **Test 2: Indigenous Economic Dashboard**

1. **Navigate:**
   - Click: **"More"** dropdown
   - Click: **"Indigenous Economic Impact"**

2. **Verify 4 tabs load:**
   - ✅ **Overview**: Reconciliation banner, $4.5B equity, pie chart
   - ✅ **Equity Ownership**: 6 projects (Wataynikaneyap $340M, Makwa $30M, etc.)
   - ✅ **Revenue Agreements**: 5 IBAs (Keeyask $4B, Coastal GasLink $620M)
   - ✅ **Economic Impact**: 5 community cards (2023 data)

3. **Check console:**
   - ✅ No errors
   - ✅ Direct Supabase queries successful

**Screenshot Capture**: All 4 tabs

---

### **Test 3: SMR Deployment Tracker**

1. **Navigate:**
   - Click: **"More"** dropdown
   - Click: **"SMR Deployment"**

2. **Verify 5 tabs load:**
   - ✅ **Overview**: Canada's SMR strategy banner, capacity by province chart, vendor market share
   - ✅ **Projects**: 7 projects table (OPG Darlington, CNL Chalk River, Bruce, SaskPower, NB, Alberta, Laurentis)
   - ✅ **Technology Vendors**: 5 vendors with CNSC VDR status (GE Hitachi, Westinghouse, ARC, Terrestrial, USNC)
   - ✅ **Regulatory Pipeline**: Milestone tracking with status badges
   - ✅ **Economics**: Investment charts, $970M federal funding, cost per MW

3. **Check console:**
   - ✅ No errors
   - ✅ Direct Supabase queries successful

**Screenshot Capture**: All 5 tabs

---

### **Test 4: Grid Connection Queue**

1. **Navigate:**
   - Click: **"More"** dropdown
   - Click: **"Grid Connection Queue"**

2. **Verify 5 tabs load:**
   - ✅ **Overview**: 30+ GW tracked, technology distribution pie chart, status breakdown
   - ✅ **Projects**: 23+ projects table across 5 provinces
   - ✅ **Technology Mix**: Solar/Wind/Storage breakdown by province
   - ✅ **Timeline**: Annual capacity additions chart, cumulative deployment
   - ✅ **Provincial Comparison**: AB vs ON vs SK vs BC vs MB

3. **Test filters:**
   - ✅ Province filter: Select "AB" → See only Alberta projects
   - ✅ Technology filter: Select "Solar" → See only solar projects
   - ✅ Status filter: Select "In-Service" → See operational projects

4. **Check console:**
   - ✅ No errors
   - ✅ Direct Supabase queries successful

**Screenshot Capture**: All 5 tabs + filtered views

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

### **Database**
- [ ] CCUS: 5 tables created, 5 facilities + 6 Pathways projects seeded
- [ ] Indigenous: 3 tables created, 6 equity + 5 agreements + 5 impacts seeded
- [ ] SMR: 4 tables created, 7 projects + 5 vendors seeded
- [ ] Grid Queue: 3 tables created, 23+ projects seeded
- [ ] All RLS disabled for testing

### **Edge Function**
- [ ] api-v2-ccus deployed successfully
- [ ] Test endpoint returns JSON data

### **Frontend**
- [ ] CCUS Tracker: Tab visible, all 4 tabs load
- [ ] Indigenous Economic: In "More" menu, all 4 tabs load
- [ ] SMR Deployment: In "More" menu, all 5 tabs load
- [ ] Grid Connection Queue: In "More" menu, all 5 tabs load
- [ ] No console errors
- [ ] All data displaying correctly

### **Navigation**
- [ ] CCUS visible as 6th core tab in main ribbon
- [ ] Indigenous Economic visible in "More" dropdown
- [ ] SMR Deployment visible in "More" dropdown
- [ ] Grid Connection Queue visible in "More" dropdown

---

## 🚨 TROUBLESHOOTING

### **Issue: Migration fails with "relation already exists"**
**Cause**: Tables already created from previous migration
**Fix**:
```sql
-- Drop existing tables (CAUTION: Deletes data)
DROP TABLE IF EXISTS ccus_facilities CASCADE;
DROP TABLE IF EXISTS indigenous_equity_ownership CASCADE;
-- etc.

-- Then re-run migration
```

### **Issue: Frontend shows "No data" but no errors**
**Cause**: RLS is blocking queries
**Fix**: Disable RLS (see Step 6 in each migration section above)

### **Issue: Edge function returns 401 Unauthorized**
**Cause**: Expected behavior - function requires anon key
**Fix**: Frontend automatically includes key. Test from browser, not direct curl.

### **Issue: Component doesn't load / blank page**
**Cause**: Import error or route not added
**Fix**: Check browser console for error details. Verify:
1. Component imported in EnergyDataDashboard.tsx
2. Route added with correct activeTab check
3. Navigation tab added to moreNavigationTabs array

### **Issue: Data is stale / not updating**
**Cause**: Browser cache
**Fix**: Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## 🎯 SUCCESS METRICS

### **Phase 2 Deployment Success = ALL TRUE:**
- ✅ All 4 database migrations ran successfully
- ✅ Edge function deployed and responding
- ✅ All 4 frontend components render without errors
- ✅ Real data visible in all dashboards
- ✅ No critical bugs or console errors
- ✅ Navigation integration working
- ✅ Filters/tabs working correctly

---

## 📊 POST-DEPLOYMENT VALIDATION

### **Quick Smoke Test (5 minutes)**

Run this query to verify all Phase 2 data:

```sql
-- CCUS
SELECT 'CCUS Facilities' as metric, COUNT(*) as count FROM ccus_facilities
UNION ALL
SELECT 'Pathways Projects', COUNT(*) FROM pathways_alliance_projects
UNION ALL
-- Indigenous
SELECT 'Indigenous Equity', COUNT(*) FROM indigenous_equity_ownership
UNION ALL
SELECT 'Indigenous Agreements', COUNT(*) FROM indigenous_revenue_agreements
UNION ALL
SELECT 'Indigenous Impact', COUNT(*) FROM indigenous_economic_impact
UNION ALL
-- SMR
SELECT 'SMR Projects', COUNT(*) FROM smr_projects
UNION ALL
SELECT 'SMR Vendors', COUNT(*) FROM smr_vendors
UNION ALL
-- Grid Queue
SELECT 'Grid Queue Projects', COUNT(*) FROM grid_queue_projects;

-- Expected results:
-- CCUS Facilities: 5
-- Pathways Projects: 6
-- Indigenous Equity: 6
-- Indigenous Agreements: 5
-- Indigenous Impact: 5
-- SMR Projects: 7
-- SMR Vendors: 5
-- Grid Queue Projects: 23+
```

**If all counts match** → ✅ **PHASE 2 DEPLOYMENT SUCCESS!**

---

## 🎊 NEXT STEPS AFTER DEPLOYMENT

1. ✅ Take screenshots of all dashboards (see SCREENSHOT_GUIDE.md)
2. ✅ Prepare sponsor pitch deck (see SPONSOR_PITCH_DECK.md)
3. ✅ Book sponsor meetings (Pathways Alliance, OPG, AESO)
4. ✅ Optionally: Implement Phase 1 enhancements (9 hours)

---

## 📞 SUPPORT

If you encounter issues:
1. Check browser console for error messages
2. Verify database tables exist with correct data
3. Confirm RLS is disabled for testing
4. Try hard refresh (Cmd+Shift+R)
5. Check Supabase logs for edge function errors

**Deployment Time Estimate**: 1-2 hours (database + edge function + testing)

**Good luck with deployment! 🚀**
