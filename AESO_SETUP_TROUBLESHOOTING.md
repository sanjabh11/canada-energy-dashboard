# 🐛 AESO Setup Troubleshooting Guide

## Issue: pg_cron Extension Error

### Error Message You Saw:
```
ERROR: 2BP01: dependent privileges exist
HINT: Use CASCADE to revoke them too.
CONTEXT: ... pg_cron extension creation ...
```

### Root Cause:
The `pg_cron` extension **already exists** in your Supabase database, but the script tried to create it again with conflicting privileges.

### Solution: Use AESO_SETUP_FIXED.sql

I've created a **fixed version** of the setup script:

---

## ✅ SOLUTION: Run AESO_SETUP_FIXED.sql Instead

### What Changed in the Fixed Script:

1. **SKIP pg_cron creation** (it already exists)
   - Just verifies the extension is installed
   - Doesn't try to recreate it

2. **CREATE http extension if needed** (safe)
   - Uses `IF NOT EXISTS` logic
   - Only creates if missing

3. **Everything else stays the same**
   - Table creation
   - Column additions
   - Cron job setup
   - Verification queries

---

## 📋 STEPS TO FIX (5 minutes)

### STEP 1: Use the Fixed Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. **Clear** any previous query
3. Open `AESO_SETUP_FIXED.sql` from your project
4. **Copy the entire contents**
5. **Paste** into SQL Editor
6. Click **"Run"** (or press Cmd+Enter)

### STEP 2: Verify Success

**Expected Output:**
```
✅ Added timestamp column to grid_status
✅ Added reserve_margin column to grid_status
✅ Added frequency_hz column to grid_status
✅ Added data_source column to grid_status
```

Or if columns already exist:
```
ℹ️ timestamp column already exists in grid_status
ℹ️ reserve_margin column already exists in grid_status
...
```

**Final Messages:**
```
========================================
✅ AESO SETUP COMPLETE!
========================================

Next steps:
1. Manually test the function (see below)
2. Wait 5 minutes and verify data appears
3. Check cron job logs for any errors
```

**Verification Tables:**
- Cron job table showing `aeso-stream-every-5-min`
- Tables list showing 5 tables created
- Columns list showing grid_status columns

### STEP 3: Test Immediately

Run this in SQL Editor to test the function manually:

```sql
SELECT net.http_post(
  url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
  )
);
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-11-08T...",
  "data": {
    "grid_status_records": 1,
    "generation_records": 6-8,
    "price_records": 1
  }
}
```

### STEP 4: Verify Data Appeared

```sql
-- Check Alberta grid data
SELECT
  region,
  COALESCE(timestamp, captured_at) AS ts,
  demand_mw,
  supply_mw,
  data_source
FROM grid_status
WHERE region = 'Alberta'
ORDER BY COALESCE(timestamp, captured_at) DESC
LIMIT 5;
```

**Expected:** At least 1 row with `data_source = 'AESO Real-Time'`

---

## 🎯 What If It Still Fails?

### Error: "http extension does not exist"

**Fix:**
```sql
CREATE EXTENSION http SCHEMA net;
```

Then run `AESO_SETUP_FIXED.sql` again.

### Error: "function net.http_post does not exist"

**Check Extension:**
```sql
SELECT * FROM pg_extension WHERE extname = 'http';
```

**If missing, create it:**
```sql
CREATE EXTENSION http SCHEMA net;
```

### Error: "permission denied for schema cron"

**This means you need admin privileges.** Contact Supabase support or use the Supabase Dashboard (which has admin access).

### Error: "cron.schedule function does not exist"

**Check pg_cron:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**If missing:** Contact Supabase support - pg_cron should be pre-installed on Supabase projects.

---

## 🔍 Diagnostic Queries

### Check Which Extensions Are Installed

```sql
SELECT
  extname AS extension_name,
  extversion AS version,
  nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname IN ('pg_cron', 'http')
ORDER BY extname;
```

**Expected Output:**
| extension_name | version | schema |
|----------------|---------|--------|
| http | 1.x | net |
| pg_cron | 1.x | pg_catalog or extensions |

### Check Existing Cron Jobs

```sql
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
ORDER BY jobname;
```

### Check Cron Job History

```sql
SELECT
  jobid,
  runid,
  job_pid,
  status,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'aeso-stream-every-5-min'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

## ✅ SUCCESS CRITERIA

After running `AESO_SETUP_FIXED.sql`, you should have:

- [x] No error messages
- [x] Success notices about columns being added
- [x] Cron job created: `aeso-stream-every-5-min`
- [x] 5 tables exist: grid_status, provincial_generation, alberta_grid_prices, edge_invocation_log, stream_health
- [x] grid_status has columns: timestamp, data_source, reserve_margin, frequency_hz
- [x] Manual test returns success
- [x] Database shows Alberta data with `data_source = 'AESO Real-Time'`

---

## 📞 Still Having Issues?

If `AESO_SETUP_FIXED.sql` still fails:

1. **Copy the exact error message** from SQL Editor
2. **Copy the query** that caused the error
3. **Share both** with me
4. I'll provide a specific fix

---

## 🔄 Comparison: Original vs Fixed Script

| Aspect | AESO_COMPLETE_SETUP.sql | AESO_SETUP_FIXED.sql |
|--------|-------------------------|----------------------|
| pg_cron extension | ❌ Tries to CREATE (fails) | ✅ Just verifies exists |
| http extension | ❌ Tries to CREATE | ✅ CREATE IF NOT EXISTS |
| Table creation | ✅ Same | ✅ Same |
| Column additions | ✅ Same | ✅ Same |
| Cron job setup | ✅ Same | ✅ Same |
| Verification | ✅ Same | ✅ Same |

**Recommendation:** Always use `AESO_SETUP_FIXED.sql` going forward.

---

## 📝 Summary

**Problem:** pg_cron already exists, can't recreate it
**Solution:** Use AESO_SETUP_FIXED.sql that skips extension creation
**Time:** 5 minutes to run fixed script
**Result:** Full AESO integration working

**Next:** After successful setup, continue with AESO_QUICK_START.md Step 4 (Manual Test)
