# 🔧 QUICK FIX: Empty AI Data Centres & AESO Queue Tables

## Issue Summary

Your verification script showed:
- ✅ All 4 APIs return HTTP 200 (tables exist, functions work)
- ✅ Hydrogen Hub has data ✓
- ✅ Critical Minerals has data ✓
- ⚠️ AI Data Centres has NO data
- ⚠️ AESO Queue has NO data

**Cause:** Migration 1 created the tables but the INSERT statements were skipped.

**Solution:** Re-insert the sample data using the fix script below.

---

## 🚀 Quick Fix (2 minutes)

### Step 1: Verify Which Tables Are Empty

Copy and run this in Supabase Dashboard SQL Editor:

```bash
cat check-phase1-data.sql | pbcopy
```

**Go to:** https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new

Paste and click "Run"

**Look at the row counts:**
- If `📊 AI Data Centres` shows `0` → Need to fix
- If `📊 AESO Queue` shows `0` → Need to fix

---

### Step 2: Re-Insert Missing Data

Copy and run the fix script:

```bash
cat fix-migration1-data.sql | pbcopy
```

**Go to:** https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new

Paste and click "Run"

**Expected output:**
```
✅ AI Data Centres inserted: 5
✅ AESO Queue projects inserted: 8
```

---

### Step 3: Verify APIs Now Return Data

Run the verification script again:

```bash
./verify-phase1-deployment.sh
```

**Expected output (ALL PASS):**
```
Test 1: AI Data Centres API
  Calling api-v2-ai-datacentres... ✓ PASS (HTTP 200)
    → Data centres found in response ✅

Test 2: AESO Queue API
  Calling api-v2-aeso-queue... ✓ PASS (HTTP 200)
    → Queue projects found in response ✅

Test 3: Hydrogen Hub API
  Calling api-v2-hydrogen-hub... ✓ PASS (HTTP 200)
    → Hydrogen facilities found in response ✅

Test 4: Critical Minerals Supply Chain API
  Calling api-v2-minerals-supply-chain... ✓ PASS (HTTP 200)
    → Minerals projects found in response ✅

=================================
📊 VERIFICATION SUMMARY
=================================

Passed: 4
Failed: 0

✅ ALL TESTS PASSED!
```

---

### Step 4: Test in Browser

Start the dev server:

```bash
./start-dev.sh
```

Open `http://localhost:5173/` in **incognito window**

Click **AI Data Centres** tab (position 3)

**You should now see:**
- ✅ 5 facilities displayed
- ✅ 2,180 MW total capacity
- ✅ Phase 1 allocation gauge: 780/1,200 MW (65%)
- ✅ AESO queue chart with 8 projects
- ✅ Data centre registry table with Calgary, Edmonton, Red Deer, Fort Saskatchewan, Lethbridge

---

## 📊 What Gets Inserted

### AI Data Centres (5 facilities)

| Facility | Operator | City | Capacity | Status |
|----------|----------|------|----------|--------|
| Calgary AI Compute Hub 1 | Vantage Data Centers | Calgary | 450 MW | Interconnection Queue |
| Edmonton AI Cloud Campus | Microsoft Azure | Edmonton | 750 MW | Proposed |
| Red Deer Modular AI Facility | Canadian AI Ventures | Red Deer | 180 MW | Under Construction |
| Alberta Industrial Heartland AI Hub | AWS | Fort Saskatchewan | 600 MW | Interconnection Queue |
| Lethbridge Green AI Centre | Google Cloud | Lethbridge | 320 MW | Proposed |

**Total:** 2,180 MW, $13.85B investment

### AESO Interconnection Queue (8 projects)

| Project | Type | Capacity | Phase | Status |
|---------|------|----------|-------|--------|
| Calgary AI Hub Interconnection | AI Data Centre | 450 MW | Phase 1 | Active |
| Edmonton AI Cloud Campus Grid Tie | AI Data Centre | 750 MW | Phase 1 | Active |
| Fort Saskatchewan AI Hub | AI Data Centre | 600 MW | Phase 2 | Active |
| Brooks Solar Farm | Solar | 500 MW | Phase 1 | Active |
| Pincher Creek Wind | Wind | 400 MW | Phase 1 | Active |
| Medicine Hat Battery Storage | Battery | 300 MW | Phase 2 | Active |
| Lethbridge Green AI Interconnection | AI Data Centre | 320 MW | Phase 2 | Active |
| Calgary Region Battery | Battery | 200 MW | Phase 2 | Active |

**Total:** 3,520 MW in queue (3,270 MW from first 7 projects)

---

## ✅ Why This Happened

When you ran Migration 1 the first time, the tables were created successfully, but the INSERT statements likely failed silently due to:

1. **Foreign key constraints** - If tables were created in wrong order
2. **Check constraints** - If some values were invalid (though none should be)
3. **Silent skip** - The `ON CONFLICT (id) DO NOTHING` means if IDs existed, inserts were skipped

The fix script uses the same `ON CONFLICT (id) DO NOTHING`, so it's safe to run even if some data exists. It will only insert missing records.

---

## 🎯 Success Criteria

After running the fix, you should have:

- ✅ 5 AI data centres in database
- ✅ 8 AESO queue projects in database
- ✅ All 4 API tests passing
- ✅ AI Data Centres dashboard showing charts and data
- ✅ AESO queue visualization with all 8 projects

**Time to complete:** ~2 minutes

---

## 🆘 If Still No Data After Fix

If `fix-migration1-data.sql` runs but still shows 0 rows:

1. **Check for errors in SQL output** - Look for any ERROR messages
2. **Check table structure:**
   ```sql
   \d ai_data_centres
   ```
3. **Try manual insert of just one row:**
   ```sql
   INSERT INTO ai_data_centres (id, facility_name, province, status)
   VALUES ('test-001', 'Test Facility', 'AB', 'Proposed');

   SELECT * FROM ai_data_centres WHERE id = 'test-001';
   ```

If manual insert works, the fix script should work too.

---

**Ready?** Run Step 1 to check, then Step 2 to fix! 🚀
