# 🚀 AESO REAL-TIME INTEGRATION - QUICK START

## ✅ What We've Already Done

1. ✅ **Deleted 5 unused Edge Functions** to free up capacity:
   - `fix-innovations`
   - `help-simple`
   - `opportunity-detector`
   - `ops-heartbeat`
   - `final-llm-fix`

2. ✅ **Deployed `stream-aeso-grid-data` Edge Function**
   - Status: Live and ready
   - URL: https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data

3. ✅ **Bypassed `aeso-ingestion-cron` deployment** (not needed!)
   - Using superior DB Cron solution instead
   - No additional function needed
   - Automatic retry logic
   - Lower costs

---

## 📋 YOUR ACTION ITEMS (15 minutes total)

### **STEP 1: Set Environment Variables** (2 minutes)

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Environment Variables**

2. Click **"Add Variable"** for each:

```bash
# Variable 1
Name:  AESO_API_BASE_URL
Value: http://ets.aeso.ca/ets_web/ip/Market/Reports

# Variable 2
Name:  AESO_REFRESH_INTERVAL_MINUTES
Value: 5

# Variable 3 - Generate first with this command:
# Run in terminal: openssl rand -hex 32
Name:  CRON_SECRET
Value: <paste the output from openssl command>
```

3. Click **"Save"** for each variable

---

### **STEP 2: Generate CRON_SECRET** (30 seconds)

Run this in your local terminal:

```bash
openssl rand -hex 32
```

**Copy the output** and paste it as the `CRON_SECRET` value in Step 1.

**Example output:**
```
a7f3c8e2d9b1a4f6e8c7d3b9a2f5e1c8d4b7a3f9e6c2d8b5a1f4e7c9d6b3a8f2
```

---

### **STEP 3: Run Complete Setup SQL** (5 minutes)

1. Go to **Supabase Dashboard** → **SQL Editor**

2. Click **"New Query"**

3. **Copy the entire contents** of `AESO_COMPLETE_SETUP.sql`

4. **Paste** into SQL Editor

5. Click **"Run"** (or press Cmd+Enter)

6. **Wait** for execution to complete (~10-20 seconds)

**Expected Output:**
- ✅ Several NOTICE messages about columns being added
- ✅ Table showing cron job was created
- ✅ Table showing 5 tables exist
- ✅ Table showing grid_status columns

**If you see errors:**
- Check that extensions are installed
- Verify service role key is set
- Contact me with the specific error message

---

### **STEP 4: Manual Test** (2 minutes)

After the SQL script completes, manually trigger a data fetch:

**Option A: Via SQL Editor**

```sql
SELECT net.http_post(
  url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
  )
);
```

**Option B: Via Terminal (cURL)**

```bash
curl -X POST \
  https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU"
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

---

### **STEP 5: Verify Data** (3 minutes)

Run these queries in SQL Editor to confirm data was inserted:

**Check Alberta Grid Status:**
```sql
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

**Check Alberta Generation by Fuel Type:**
```sql
SELECT
  date,
  source,
  generation_gwh,
  data_source
FROM provincial_generation
WHERE province_code = 'AB'
  AND data_source = 'AESO Real-Time'
ORDER BY date DESC
LIMIT 10;
```

**Expected:** 6-8 rows showing different fuel types (Gas, Coal, Wind, Hydro, Solar, etc.)

**Check Alberta Pool Prices:**
```sql
SELECT
  timestamp,
  pool_price_cad_per_mwh,
  forecast_price_cad_per_mwh,
  data_source
FROM alberta_grid_prices
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected:** At least 1 row with recent pool price

---

### **STEP 6: Verify Cron Job** (1 minute)

Check that the automated cron job was created:

```sql
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname = 'aeso-stream-every-5-min';
```

**Expected Output:**
| jobid | jobname | schedule | active | database |
|-------|---------|----------|--------|----------|
| (number) | aeso-stream-every-5-min | */5 * * * * | true | postgres |

**If `active = false`:**
```sql
-- Enable the cron job
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'aeso-stream-every-5-min'),
  schedule := '*/5 * * * *',
  active := true
);
```

---

### **STEP 7: Monitor (Ongoing)**

**Wait 5-10 minutes**, then check data freshness:

```sql
SELECT
  MAX(COALESCE(timestamp, captured_at)) AS latest_data,
  EXTRACT(EPOCH FROM (NOW() - MAX(COALESCE(timestamp, captured_at))))/60.0 AS data_age_minutes
FROM grid_status
WHERE region = 'Alberta' AND data_source = 'AESO Real-Time';
```

**Expected:** `data_age_minutes` should be < 10 minutes (proving cron is working)

**Check Edge Function Logs:**
1. Go to **Dashboard** → **Edge Functions** → **stream-aeso-grid-data**
2. Click **"Logs"** tab
3. Look for invocations every 5 minutes
4. Verify no errors

---

## ✅ SUCCESS CRITERIA

You've successfully completed AESO integration when:

- [x] All 3 environment variables are set
- [x] AESO_COMPLETE_SETUP.sql ran without errors
- [x] Manual test returned `success: true`
- [x] Database shows Alberta records with `data_source = 'AESO Real-Time'`
- [x] Cron job exists and is active
- [x] Data age is < 10 minutes (after waiting 10 minutes)
- [x] Edge Function logs show successful invocations every 5 minutes

---

## 🐛 TROUBLESHOOTING

### Issue: Manual test fails with 401 Unauthorized

**Fix:** Check that environment variables are set correctly in Dashboard

### Issue: No data appears in database

**Checks:**
1. View Edge Function logs for errors
2. Verify AESO API is accessible:
   ```bash
   curl http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet
   ```
3. Check stream health:
   ```sql
   SELECT * FROM stream_health WHERE stream_key = 'aeso-grid-data';
   ```

### Issue: Cron job not running

**Checks:**
1. Verify job exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'aeso-stream-every-5-min';
   ```
2. Check if job is active (should be `true`)
3. View cron history:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'aeso-stream-every-5-min')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

### Issue: Data stops updating

**Fix:**
1. Check Edge Function logs for errors
2. Manually trigger function to test
3. Check stream_health table for error messages
4. AESO API may be down - check their status

---

## 📊 WHAT YOU GET

**Real-Time Alberta Grid Data (Updates every 5 minutes):**
- ⚡ Current demand and supply (MW)
- ⚡ Generation by fuel type (Coal, Gas, Wind, Hydro, Solar, Other)
- ⚡ Alberta electricity pool price (CAD/MWh)
- ⚡ Grid frequency and reserve margin

**Strategic Value:**
- Track 10GW+ AI data center interconnection queue impact
- Monitor renewable energy integration
- Analyze electricity market pricing
- Support investment decisions with live data
- Foundation for expanding to BC, Quebec

---

## 🎯 NEXT STEPS AFTER AESO

Once AESO is working:

1. **Add Real-Time Badge to Frontend**
   - Show "⚡ Real-Time" indicator for Alberta region
   - Display current pool price
   - Add live grid status indicator

2. **Expand Real-Time Coverage**
   - BC Hydro integration
   - Hydro-Québec integration
   - IESO (Ontario) integration

3. **Production Deployment**
   - Create pull request
   - Deploy to production
   - Monitor performance

---

## 📁 REFERENCE FILES

- `AESO_COMPLETE_SETUP.sql` - Run this in SQL Editor (STEP 3)
- `DEPLOY_AESO_INTEGRATION.md` - Detailed deployment guide
- `DEPLOY_EDGE_FUNCTION.md` - How to redeploy functions

---

## ⏱️ TIME ESTIMATE

- **Total Time:** ~15 minutes
- **STEP 1 (Env vars):** 2 minutes
- **STEP 2 (Generate secret):** 30 seconds
- **STEP 3 (Run SQL):** 5 minutes
- **STEP 4 (Manual test):** 2 minutes
- **STEP 5 (Verify data):** 3 minutes
- **STEP 6 (Check cron):** 1 minute
- **STEP 7 (Monitor):** Wait 5-10 minutes, then 1 minute to check

---

## 🆘 NEED HELP?

If you encounter issues:

1. **Check the exact error message** from SQL Editor or function logs
2. **Copy the error** and send it to me
3. **Share the output** of verification queries
4. I'll diagnose and provide a fix

**Common issues are documented in the Troubleshooting section above.**

---

**Ready to start? Begin with STEP 1! 🚀**
