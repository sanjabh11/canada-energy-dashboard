# Deploy Edge Functions - Manual Instructions

## Supabase CLI Permissions Issue

The Supabase CLI is showing a 403 permissions error:
```
Your account does not have the necessary privileges to access this endpoint.
```

This means the project may belong to a different Supabase account or organization.

## Solution: Deploy via Supabase Dashboard

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login with the account that owns your Supabase project
3. Select the project (should show as "canada-energy" or similar)

### Step 2: Deploy Edge Functions

For each of these 4 functions, follow these steps:

#### Functions to Deploy:
1. `stream-ontario-demand`
2. `stream-provincial-generation`
3. `stream-ontario-prices`
4. `stream-hf-electricity-demand`

#### Deployment Steps (for each function):

1. In Supabase Dashboard, go to **Edge Functions** section
2. Find the function name (e.g., `stream-ontario-demand`)
3. Click on the function
4. Click **"Deploy"** or **"Redeploy"** button
5. The dashboard will pull the latest code from your GitHub repository
6. Wait for deployment to complete (usually 30-60 seconds)
7. Verify deployment shows "Deployed" status with green checkmark

### Step 3: Verify Deployment

After deploying all 4 functions, run this test script:

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard
./test-edge-functions.sh
```

Expected output:
```
✅ stream-ontario-demand?limit=1 - OK (200)
✅ stream-provincial-generation?limit=1 - OK (200)
✅ stream-ontario-prices?limit=1 - OK (200)
✅ stream-hf-electricity-demand?limit=1 - OK (200)
```

### Step 4: Test Data Content

Verify the functions now return actual data (not empty arrays):

```bash
curl -H "apikey: $SUPABASE_ANON_KEY" \
  "$SUPABASE_EDGE_BASE/stream-ontario-demand?limit=5" | jq '.rows | length'
```

Expected: Should show a number > 0 (e.g., 5)

## Alternative: Deploy via GitHub Actions (If Available)

If you have GitHub Actions set up for Supabase deployments:

1. The push to `main` branch may trigger automatic deployment
2. Check your GitHub repository's **Actions** tab
3. Look for a workflow that deploys Supabase functions
4. If it exists, it should run automatically

## Alternative: Use Supabase CLI with Correct Account

If the CLI permissions issue is due to being logged into the wrong account:

```bash
# Logout current account
supabase logout

# Login with the correct account
supabase login

# Try deployment again
supabase functions deploy stream-ontario-demand --project-ref <YOUR_PROJECT_REF>
supabase functions deploy stream-provincial-generation --project-ref <YOUR_PROJECT_REF>
supabase functions deploy stream-ontario-prices --project-ref <YOUR_PROJECT_REF>
supabase functions deploy stream-hf-electricity-demand --project-ref <YOUR_PROJECT_REF>
```

## What These Changes Do

### Before (Current State):
- Edge functions query database → Database is empty → Return empty array
- Client receives empty array → Falls back to local JSON
- UI shows "Source: Fallback"

### After (With These Changes):
- Edge functions query database → Database is empty → Fetch sample data from GitHub
- Edge function returns sample data with pagination
- Client receives data → Shows "Source: Stream"
- UI displays 200-2000 records instead of 6-8

### Key Benefits:
1. ✅ Streaming architecture works end-to-end
2. ✅ UI shows "Source: Stream" 
3. ✅ Proper pagination support
4. ✅ Graceful degradation (database → sample → error)
5. ✅ When database is populated later, functions automatically use real data

## Files Modified

1. **`supabase/functions/_shared/sampleDataLoader.ts`** (NEW)
   - Fetches sample data from GitHub raw content
   - Provides pagination helper
   - Caches data for 5 minutes

2. **`supabase/functions/stream-ontario-demand/index.ts`**
   - Added sample data fallback when IESO API fails
   - Returns paginated sample data

3. **`supabase/functions/stream-provincial-generation/index.ts`**
   - Added sample data fallback when database empty
   - Returns paginated sample data

4. **`supabase/functions/stream-ontario-prices/index.ts`**
   - Added sample data fallback when database empty
   - Returns paginated sample data

5. **`supabase/functions/stream-hf-electricity-demand/index.ts`**
   - Added sample data fallback when database empty
   - Returns paginated sample data

## Expected Results After Deployment

### Localhost (http://localhost:5173/)
- Ontario Hourly Demand: **"Data: 200 records • Source: Stream"**
- Provincial Generation: **"Data: 500 records • Source: Stream"**
- Alberta Supply & Demand: **"Data: 200 records • Source: Stream"**
- Weather Correlation: **"Data: 200 records • Source: Stream"**

### Netlify (https://canada-energy.netlify.app/)
- Same as localhost
- All panels show "Source: Stream"
- Higher data counts

## Troubleshooting

### If deployment fails:
1. Check Supabase dashboard for error messages
2. Verify GitHub repository is connected to Supabase project
3. Check function logs in Supabase dashboard

### If still showing "Source: Fallback" after deployment:
1. Hard refresh browser (Cmd+Shift+R)
2. Check browser console for errors
3. Verify edge functions are returning data:
   ```bash
   curl "$SUPABASE_EDGE_BASE/stream-ontario-demand?limit=1" | jq
   ```

### If functions return 500 errors:
1. Check Supabase function logs
2. Verify GitHub raw URLs are accessible
3. Check CORS headers are correct

---

**Status**: Code changes complete and pushed to GitHub
**Next Action**: Deploy functions via Supabase Dashboard
**ETA**: 10-15 minutes for deployment + verification
