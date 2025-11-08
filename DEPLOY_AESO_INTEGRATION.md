# 🚀 AESO REAL-TIME INTEGRATION - DEPLOYMENT GUIDE

## Overview
Deploy Alberta Electric System Operator (AESO) real-time grid data streaming to track 10GW+ AI data center interconnection queue.

**Edge Functions to Deploy:**
1. `stream-aeso-grid-data` - Fetches real-time Alberta grid data
2. `aeso-ingestion-cron` - Scheduled job to trigger data fetching every 5 minutes

---

## STEP 1: Deploy Edge Functions

### Option A: Deploy via Supabase Dashboard (Recommended)

#### 1.1 Deploy stream-aeso-grid-data

1. Go to https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti
2. Click **"Edge Functions"** in left sidebar
3. Click **"Deploy New Function"** or **"Create Function"**
4. **Function Name**: `stream-aeso-grid-data`
5. **Source**: Select `supabase/functions/stream-aeso-grid-data`
6. Click **"Deploy"**
7. Wait 30-60 seconds for deployment to complete

#### 1.2 Deploy aeso-ingestion-cron

1. In Edge Functions dashboard
2. Click **"Deploy New Function"**
3. **Function Name**: `aeso-ingestion-cron`
4. **Source**: Select `supabase/functions/aeso-ingestion-cron`
5. Click **"Deploy"**
6. Wait for deployment

---

### Option B: Deploy via Supabase CLI

If you have Supabase CLI authenticated:

```bash
# Deploy stream function
npx supabase functions deploy stream-aeso-grid-data --project-ref qnymbecjgeaoxsfphrti

# Deploy cron trigger
npx supabase functions deploy aeso-ingestion-cron --project-ref qnymbecjgeaoxsfphrti
```

---

## STEP 2: Set Environment Variables

### Required Environment Variables

Go to **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**

Add these variables:

```bash
# AESO API Configuration
AESO_API_BASE_URL=http://ets.aeso.ca/ets_web/ip/Market/Reports

# Cron Security (optional but recommended)
CRON_SECRET=your-random-secret-key-here

# AESO Refresh Interval
AESO_REFRESH_INTERVAL_MINUTES=5
```

**To generate CRON_SECRET:**
```bash
openssl rand -hex 32
```

---

## STEP 3: Test Manual Data Fetch

### 3.1 Test stream-aeso-grid-data Function

**Method 1: Via Supabase Dashboard**
1. Go to Edge Functions dashboard
2. Click on `stream-aeso-grid-data`
3. Click **"Invoke"** or **"Test"** button
4. Should see success response with grid data

**Method 2: Via cURL**
```bash
curl -X POST \
  https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-11-08T...",
  "data": {
    "grid_status_records": 1,
    "generation_records": 8,
    "price_records": 1
  }
}
```

---

## STEP 4: Verify Data in Database

Run these queries in **Supabase Dashboard > SQL Editor**:

### 4.1 Check Grid Status
```sql
SELECT
  region,
  timestamp,
  demand_mw,
  supply_mw,
  data_source
FROM grid_status
WHERE region = 'Alberta'
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected**: Should show recent Alberta grid data with `data_source = 'AESO Real-Time'`

### 4.2 Check Alberta Generation
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

**Expected**: Should show generation by fuel type (Coal, Gas, Wind, Hydro, etc.)

### 4.3 Check Alberta Pool Prices
```sql
SELECT
  timestamp,
  pool_price_cad_per_mwh,
  market_demand_mw,
  data_source
FROM alberta_grid_prices
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected**: Should show recent Alberta electricity pool prices

---

## STEP 5: Set Up Automated Cron Job

### Option A: Supabase Cron (Recommended)

1. Go to **Supabase Dashboard > Database > Cron Jobs**
2. Click **"Create a new Cron Job"**
3. **Configuration:**
   - **Name**: `aeso-ingestion-every-5-minutes`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Command**:
     ```sql
     SELECT net.http_post(
       url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/aeso-ingestion-cron',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
         'x-supabase-cron', 'true'
       )
     );
     ```
4. Click **"Create"**

### Option B: External Cron (Alternative)

If using external cron service (Cron-job.org, EasyCron, etc.):

**Cron Expression**: `*/5 * * * *` (every 5 minutes)

**HTTP Request:**
```
POST https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/aeso-ingestion-cron
Headers:
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  x-supabase-cron: true
```

---

## STEP 6: Monitor Data Ingestion

### Check Cron Job Logs

**In Supabase Dashboard > Edge Functions > aeso-ingestion-cron:**
- Click "Logs" tab
- Should see entries every 5 minutes
- Look for success messages

### Check Data Freshness

```sql
-- Check latest AESO data timestamp
SELECT
  MAX(timestamp) as latest_data,
  NOW() - MAX(timestamp) as data_age_minutes
FROM grid_status
WHERE region = 'Alberta' AND data_source = 'AESO Real-Time';
```

**Expected**: `data_age_minutes` should be < 10 minutes if cron is working

---

## STEP 7: Frontend Integration (Optional)

### Add "Real-Time" Badge for Alberta

**File**: `src/components/RealTimeDashboard.tsx` or grid component

Add indicator for Alberta:

```tsx
{region === 'Alberta' && (
  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
    ⚡ Real-Time
  </span>
)}
```

### Add Alberta Pool Price Chart (Optional)

Create a new chart component showing recent pool prices:

```tsx
<LineChart data={albertaPoolPrices}>
  <XAxis dataKey="timestamp" />
  <YAxis label="Price (CAD/MWh)" />
  <Line dataKey="pool_price_cad_per_mwh" stroke="#ef4444" />
  <Tooltip />
</LineChart>
```

---

## TROUBLESHOOTING

### Issue: No Data Appearing

**Check 1: Function Deployment**
```bash
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Should return success.

**Check 2: Function Logs**
- Go to Edge Functions > stream-aeso-grid-data > Logs
- Look for errors in recent invocations

**Check 3: AESO API Availability**
```bash
curl http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet
```

AESO API may be down or rate-limited.

### Issue: Cron Not Running

**Check 1: Cron Job Status**
- Database > Cron Jobs > Check if job is enabled
- Look for error messages in job history

**Check 2: Service Role Key**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify key has permissions to invoke functions

### Issue: Data Parsing Errors

**Check Function Logs:**
- Look for "Failed to parse AESO data" errors
- AESO may have changed their API format
- Update parsing logic in `stream-aeso-grid-data/index.ts`

---

## VERIFICATION CHECKLIST

After deployment, verify:

- [ ] `stream-aeso-grid-data` function deployed successfully
- [ ] `aeso-ingestion-cron` function deployed successfully
- [ ] Manual test of stream function returns success
- [ ] Database tables populated with Alberta data
- [ ] Grid status shows recent Alberta records
- [ ] Provincial generation shows AB fuel mix
- [ ] Alberta pool prices table has recent data
- [ ] Cron job created and running every 5 minutes
- [ ] Logs show successful cron executions
- [ ] Data age is < 10 minutes (fresh data)
- [ ] No errors in Edge Function logs

---

## SUCCESS CRITERIA

✅ **AESO Integration Complete When:**

1. Both Edge Functions deployed and active
2. Manual function test returns Alberta grid data
3. Database shows recent Alberta records (< 10 min old)
4. Cron job running every 5 minutes
5. No errors in function logs for last 1 hour
6. Data source = 'AESO Real-Time' in database

---

## NEXT STEPS AFTER AESO DEPLOYMENT

1. **Test Frontend Display** - Verify Alberta data appears on dashboards
2. **Add Real-Time Badge** - Show "⚡ Real-Time" for Alberta region
3. **Monitor Performance** - Check function execution time and costs
4. **Expand Coverage** - Add BC Hydro, Hydro-Québec integrations
5. **Production Deployment** - Deploy all changes to production

---

## SUPPORT

**AESO API Documentation:**
- http://ets.aeso.ca/ets_web/ip/Market/Reports

**Supabase Edge Functions:**
- https://supabase.com/docs/guides/functions

**Questions?** Check function logs and database query results first!
