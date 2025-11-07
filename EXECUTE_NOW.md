# PHASE 1 DEPLOYMENT - IMMEDIATE EXECUTION GUIDE

## 🎯 GOAL
Apply 3 database migrations to fix 500 errors and show data in Phase 1 dashboards

## ⚡ QUICK STATUS
- ✅ Navigation tabs visible (AI Data Centres, Hydrogen Hub, Critical Minerals)
- ✅ Edge Functions deployed
- ❌ Database tables missing (causing 500 errors)

## 🚀 SOLUTION: Apply Migrations via Dashboard (3 steps)

Since Supabase CLI has connectivity issues, we'll use the **Dashboard SQL Editor** instead.

---

## STEP 1: Apply AI Data Centres Migration

### 1. Open SQL Editor
**URL:** https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new

### 2. Click "New Query"

### 3. Copy the SQL from this file:
**File:** `supabase/migrations/20251105001_ai_data_centres.sql`

**On your Mac, run:**
```bash
cat supabase/migrations/20251105001_ai_data_centres.sql | pbcopy
```

This copies the entire file to your clipboard.

### 4. Paste into SQL Editor and click "Run"

**Expected:** You should see "Success. No rows returned."

**This creates:**
- 5 tables (ai_data_centres, ai_dc_power_consumption, aeso_interconnection_queue, alberta_grid_capacity, ai_dc_emissions)
- 5 sample data centres (Calgary, Edmonton, Red Deer, Fort Saskatchewan, Lethbridge)
- 8 AESO queue projects
- Helper functions

---

## STEP 2: Apply Hydrogen Economy Migration

### 1. Click "New Query" again

### 2. Copy the SQL:
```bash
cat supabase/migrations/20251105002_hydrogen_economy.sql | pbcopy
```

### 3. Paste and click "Run"

**This creates:**
- 6 tables (hydrogen_facilities, hydrogen_production, hydrogen_projects, hydrogen_infrastructure, hydrogen_prices, hydrogen_demand)
- 5 sample facilities (Edmonton and Calgary hubs)
- 5 major projects (Air Products $1.3B, AZETEC $1.4B, etc.)
- Helper functions

---

## STEP 3: Apply Critical Minerals Migration

### 1. Click "New Query" again

### 2. Copy the SQL:
```bash
cat supabase/migrations/20251105003_critical_minerals_enhanced.sql | pbcopy
```

### 3. Paste and click "Run"

**This creates:**
- 7 tables (critical_minerals_projects, minerals_supply_chain, minerals_prices, minerals_trade_flows, battery_supply_chain, minerals_strategic_stockpile, ev_minerals_demand_forecast)
- 7 sample projects ($6.45B total)
- 4 battery facilities (135 GWh capacity)
- Supply chain data showing gaps
- Helper functions

---

## ✅ VERIFICATION

### After all 3 migrations applied:

### 1. Check tables exist:

In SQL Editor, run:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ai_data_centres',
  'aeso_interconnection_queue',
  'hydrogen_facilities',
  'hydrogen_projects',
  'critical_minerals_projects',
  'minerals_supply_chain'
);
```

**Expected:** Should show all 6 table names.

### 2. Check data exists:

```sql
SELECT
  (SELECT COUNT(*) FROM ai_data_centres) as dc_count,
  (SELECT COUNT(*) FROM aeso_interconnection_queue) as queue_count,
  (SELECT COUNT(*) FROM hydrogen_facilities) as h2_fac_count,
  (SELECT COUNT(*) FROM hydrogen_projects) as h2_proj_count,
  (SELECT COUNT(*) FROM critical_minerals_projects) as minerals_count,
  (SELECT COUNT(*) FROM battery_supply_chain) as battery_count;
```

**Expected output:**
```
dc_count: 5
queue_count: 8
h2_fac_count: 5
h2_proj_count: 5
minerals_count: 7
battery_count: 4
```

---

## 🎯 TEST THE APIS

After migrations applied, test each API:

### Test 1: AI Data Centres API
```bash
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-ai-datacentres?province=AB"
```

**Expected:** JSON with 5 data centres, summary stats

### Test 2: AESO Queue API
```bash
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-aeso-queue?status=Active"
```

**Expected:** JSON with 8 queue projects

### Test 3: Hydrogen Hub API
```bash
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-hydrogen-hub"
```

**Expected:** JSON with Edmonton/Calgary facilities

### Test 4: Minerals Supply Chain API
```bash
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-minerals-supply-chain?mineral=Lithium"
```

**Expected:** JSON with lithium projects and supply chain data

---

## 🌐 REFRESH BROWSER

### 1. Go back to your browser: http://localhost:5173/

### 2. Hard reload: **Cmd+Shift+R**

### 3. Click each Phase 1 tab:

**AI Data Centres:**
- Should show: 5 facilities, 2,180 MW
- Phase 1 allocation gauge: 780/1,200 MW (65%)
- AESO queue: 8 projects, 3,270 MW
- Data centre registry table with 5 rows

**Hydrogen Hub:**
- Should show: 5 facilities, $1.68B
- Edmonton vs Calgary comparison bars
- Color distribution: 60% Green, 30% Blue, 10% Grey
- Major projects: Air Products $1.3B, AZETEC $1.4B

**Critical Minerals:**
- Should show: 7 projects, $6.45B
- Supply chain completeness (6 stages)
- China dependency: ~65-75%
- Project registry with James Bay Lithium, Vale Voisey's Bay, etc.

---

## 🚨 TROUBLESHOOTING

### If migrations fail with "already exists" error:
**Solution:** That table is already created. Just continue to next migration.

### If APIs still return 500:
**Check:**
1. Tables exist: Run the verification SQL above
2. Data exists: Should see row counts
3. CORS headers: Edge Functions have CORS enabled

### If dashboards still show "Failed to load":
1. Check browser console (F12) for specific error
2. Verify API endpoints return 200 (not 500)
3. Hard reload: Cmd+Shift+R

---

## 📊 SUCCESS CRITERIA

After completing these steps:

✅ 18 database tables created
✅ 51 sample records inserted
✅ 4 Edge Functions returning data (200 OK)
✅ 3 Phase 1 dashboards displaying charts and data
✅ No 500 errors in browser console

---

## ⏱️ ESTIMATED TIME
- Migration 1: 1 minute
- Migration 2: 1 minute
- Migration 3: 1 minute
- Verification: 1 minute
- API testing: 1 minute
- Browser refresh: 30 seconds

**Total: ~6 minutes**

---

## 🎬 START NOW

**Step 1:** Open https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new

**Step 2:** On your Mac terminal:
```bash
cd /Users/sanjayb/minimax/canada-energy-dashboard
cat supabase/migrations/20251105001_ai_data_centres.sql | pbcopy
```

**Step 3:** Paste into SQL Editor and click "Run"

**Step 4:** Repeat for other 2 migrations

**Step 5:** Test APIs with curl commands above

**Step 6:** Refresh browser (Cmd+Shift+R) and check dashboards

---

**READY TO EXECUTE!** 🚀
