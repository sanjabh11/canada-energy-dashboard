# 🔍 TROUBLESHOOTING: APIs Return No Data

## Issue

The fix script reported:
- ✅ AESO Queue projects inserted: 8

But the verify script shows:
- ⚠️ AI Data Centres API: No data centres in response
- ⚠️ AESO Queue API: No queue projects in response

This means the **tables exist** and **APIs work**, but something is preventing the data from being returned.

---

## 🎯 Step 1: Verify Data Actually Exists

Run this diagnostic query in Supabase Dashboard:

```bash
cat diagnose-api-no-data.sql | pbcopy
```

**Go to:** https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new

Paste and click "Run"

### Expected Results

**If data exists:**
```
🔍 AI Data Centres Count: 5
🔍 AESO Queue Count: 8
```

**If you see:**
```
🔍 AI Data Centres Count: 0  ❌
🔍 AESO Queue Count: 8       ✅
```

This means AI Data Centres didn't insert. **Go to Step 2.**

**If both show counts > 0 but APIs still return nothing:** **Go to Step 3** (RLS issue)

---

## 🎯 Step 2: Re-Insert AI Data Centres Only

If `ai_data_centres` count is 0, run this:

```sql
-- Re-insert just AI Data Centres (5 facilities)
INSERT INTO ai_data_centres (id, facility_name, operator, location_city, province, status, announcement_date, expected_online_date, contracted_capacity_mw, pue_design, cooling_technology, capital_investment_cad, power_source, renewable_percentage, offgrid, latitude, longitude, gpu_count, primary_workload, notes) VALUES
('dc-ab-001', 'Calgary AI Compute Hub 1', 'Vantage Data Centers', 'Calgary', 'AB', 'Interconnection Queue', '2025-03-15', '2027-06-01', 450, 1.25, 'Free Cooling + Liquid', 2800000000, 'Hybrid', 35, FALSE, 51.0447, -114.0719, 50000, 'Mixed', 'First major AI data centre in Calgary region'),
('dc-ab-002', 'Edmonton AI Cloud Campus', 'Microsoft Azure', 'Edmonton', 'AB', 'Proposed', '2025-02-20', '2028-01-01', 750, 1.20, 'Liquid Cooling', 4500000000, 'Grid', 25, FALSE, 53.5461, -113.4938, 80000, 'Training', 'Partnership with University of Alberta'),
('dc-ab-003', 'Red Deer Modular AI Facility', 'Canadian AI Ventures', 'Red Deer', 'AB', 'Under Construction', '2024-11-10', '2026-03-01', 180, 1.30, 'Air Cooled', 850000000, 'Natural Gas', 0, TRUE, 52.2681, -113.8111, 15000, 'Inference', 'Off-grid natural gas powered with future CCUS integration'),
('dc-ab-004', 'Alberta Industrial Heartland AI Hub', 'AWS', 'Fort Saskatchewan', 'AB', 'Interconnection Queue', '2025-04-01', '2027-12-01', 600, 1.22, 'Free Cooling + Evaporative', 3600000000, 'Grid', 40, FALSE, 53.7134, -113.2105, 65000, 'Mixed', 'Near existing industrial infrastructure'),
('dc-ab-005', 'Lethbridge Green AI Centre', 'Google Cloud', 'Lethbridge', 'AB', 'Proposed', '2025-05-15', '2028-06-01', 320, 1.18, 'Liquid Cooling', 2100000000, 'Renewable', 95, FALSE, 49.6942, -112.8328, 35000, 'Training', '100% wind + solar target with battery storage')
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT '✅ AI Data Centres now:' as result, COUNT(*) FROM ai_data_centres;
```

**Expected:** Should show 5

Then **re-run verify script:**
```bash
./verify-phase1-deployment.sh
```

---

## 🎯 Step 3: Check for RLS (Row Level Security) Blocking Reads

If data exists in tables but APIs return nothing, check if RLS is blocking anonymous reads:

### Check RLS Status

Run in SQL Editor:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('ai_data_centres', 'aeso_interconnection_queue');
```

**If rowsecurity = true:** RLS is enabled and might be blocking anon key reads.

### Fix: Disable RLS or Add SELECT Policy

**Option A: Disable RLS (Quick Fix)**
```sql
ALTER TABLE ai_data_centres DISABLE ROW LEVEL SECURITY;
ALTER TABLE aeso_interconnection_queue DISABLE ROW LEVEL SECURITY;
```

**Option B: Add SELECT Policy (Better Security)**
```sql
-- Allow anonymous reads for ai_data_centres
CREATE POLICY "Enable read access for anon users"
ON ai_data_centres FOR SELECT
TO anon
USING (true);

-- Allow anonymous reads for aeso_interconnection_queue
CREATE POLICY "Enable read access for anon users"
ON aeso_interconnection_queue FOR SELECT
TO anon
USING (true);
```

After applying either fix, **re-run verify script:**
```bash
./verify-phase1-deployment.sh
```

---

## 🎯 Step 4: Manual API Test with curl

If still no data, test the API directly:

```bash
# Test with explicit province parameter
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-ai-datacentres?province=AB" | jq '.data_centres | length'
```

**Expected:** Should return `5`

**If returns 0:** Check what the API actually returns:
```bash
curl "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-ai-datacentres?province=AB" | jq '.'
```

Look for:
- `data_centres: []` (empty array) → Data exists but filtered out
- `error` message → API error
- `summary.total_count: 0` → Query returned no results

---

## 🎯 Step 5: Test Query Directly in Database

Run the exact same query the API uses:

```sql
-- This is what the API does
SELECT *
FROM ai_data_centres
WHERE province = 'AB'
ORDER BY contracted_capacity_mw DESC;
```

**Expected:** 5 rows

**If 0 rows:** Check province values:
```sql
SELECT DISTINCT province FROM ai_data_centres;
```

**If province is NULL or different:** Update the data:
```sql
UPDATE ai_data_centres
SET province = 'AB'
WHERE province IS NULL OR province != 'AB';
```

---

## ✅ Quick Win: Run Everything At Once

Copy and paste this mega-script to fix all possible issues:

```sql
-- 1. Check counts
SELECT '📊 Current counts:' as info;
SELECT 'AI Data Centres' as table_name, COUNT(*) as count FROM ai_data_centres
UNION ALL
SELECT 'AESO Queue', COUNT(*) FROM aeso_interconnection_queue;

-- 2. Disable RLS if enabled
ALTER TABLE ai_data_centres DISABLE ROW LEVEL SECURITY;
ALTER TABLE aeso_interconnection_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE alberta_grid_capacity DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dc_power_consumption DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_dc_emissions DISABLE ROW LEVEL SECURITY;

-- 3. Re-insert AI Data Centres (will skip if exist)
INSERT INTO ai_data_centres (id, facility_name, operator, location_city, province, status, announcement_date, expected_online_date, contracted_capacity_mw, pue_design, cooling_technology, capital_investment_cad, power_source, renewable_percentage, offgrid, latitude, longitude, gpu_count, primary_workload, notes) VALUES
('dc-ab-001', 'Calgary AI Compute Hub 1', 'Vantage Data Centers', 'Calgary', 'AB', 'Interconnection Queue', '2025-03-15', '2027-06-01', 450, 1.25, 'Free Cooling + Liquid', 2800000000, 'Hybrid', 35, FALSE, 51.0447, -114.0719, 50000, 'Mixed', 'First major AI data centre in Calgary region'),
('dc-ab-002', 'Edmonton AI Cloud Campus', 'Microsoft Azure', 'Edmonton', 'AB', 'Proposed', '2025-02-20', '2028-01-01', 750, 1.20, 'Liquid Cooling', 4500000000, 'Grid', 25, FALSE, 53.5461, -113.4938, 80000, 'Training', 'Partnership with University of Alberta'),
('dc-ab-003', 'Red Deer Modular AI Facility', 'Canadian AI Ventures', 'Red Deer', 'AB', 'Under Construction', '2024-11-10', '2026-03-01', 180, 1.30, 'Air Cooled', 850000000, 'Natural Gas', 0, TRUE, 52.2681, -113.8111, 15000, 'Inference', 'Off-grid natural gas powered with future CCUS integration'),
('dc-ab-004', 'Alberta Industrial Heartland AI Hub', 'AWS', 'Fort Saskatchewan', 'AB', 'Interconnection Queue', '2025-04-01', '2027-12-01', 600, 1.22, 'Free Cooling + Evaporative', 3600000000, 'Grid', 40, FALSE, 53.7134, -113.2105, 65000, 'Mixed', 'Near existing industrial infrastructure'),
('dc-ab-005', 'Lethbridge Green AI Centre', 'Google Cloud', 'Lethbridge', 'AB', 'Proposed', '2025-05-15', '2028-06-01', 320, 1.18, 'Liquid Cooling', 2100000000, 'Renewable', 95, FALSE, 49.6942, -112.8328, 35000, 'Training', '100% wind + solar target with battery storage')
ON CONFLICT (id) DO NOTHING;

-- 4. Verify final counts
SELECT '✅ Final counts:' as info;
SELECT 'AI Data Centres' as table_name, COUNT(*) as count FROM ai_data_centres
UNION ALL
SELECT 'AESO Queue', COUNT(*) FROM aeso_interconnection_queue;

-- 5. Test the exact query the API uses
SELECT '🔍 API Query Test (province=AB):' as info;
SELECT id, facility_name, province, status, contracted_capacity_mw
FROM ai_data_centres
WHERE province = 'AB'
ORDER BY contracted_capacity_mw DESC;
```

**Expected final output:**
```
✅ Final counts:
- AI Data Centres: 5
- AESO Queue: 8

🔍 API Query Test: (5 rows showing)
```

---

## 🎉 Once Fixed

Run the verify script:
```bash
./verify-phase1-deployment.sh
```

**Expected:**
```
✅ ALL TESTS PASSED!
Passed: 4
Failed: 0
```

Then test in browser:
```bash
./start-dev.sh
```

Open `http://localhost:5173/` in incognito window and see the data! 🚀

---

## 🆘 Still Stuck?

If nothing works, run this and share the output:

```sql
-- Complete diagnostic
SELECT 'Table exists?' as check, tablename
FROM pg_tables
WHERE tablename = 'ai_data_centres';

SELECT 'Row count?' as check, COUNT(*)
FROM ai_data_centres;

SELECT 'Province values?' as check, province, COUNT(*)
FROM ai_data_centres
GROUP BY province;

SELECT 'RLS enabled?' as check, rowsecurity
FROM pg_tables
WHERE tablename = 'ai_data_centres';

SELECT 'First 3 rows?' as check, id, facility_name, province, status
FROM ai_data_centres
LIMIT 3;
```

This will show exactly what's happening!
