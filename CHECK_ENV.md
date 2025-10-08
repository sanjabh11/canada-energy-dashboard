# Environment Variable Check

## Quick Test

Open your browser console on http://localhost:5173/ and run this:

```javascript
// Check if environment variables are loaded
console.log('VITE_ENABLE_EDGE_FETCH:', import.meta.env.VITE_ENABLE_EDGE_FETCH);
console.log('VITE_USE_STREAMING_DATASETS:', import.meta.env.VITE_USE_STREAMING_DATASETS);
console.log('VITE_DEBUG_LOGS:', import.meta.env.VITE_DEBUG_LOGS);
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
```

## Expected Output

```
VITE_ENABLE_EDGE_FETCH: "true"
VITE_USE_STREAMING_DATASETS: "true"
VITE_DEBUG_LOGS: "true"
VITE_SUPABASE_URL: "https://qnymbecjgeaoxsfphrti.supabase.co"
```

## If You See `undefined`

The `.env` file is not being loaded. This happens when:

1. **Dev server wasn't restarted** after changing `.env`
2. **Wrong `.env` file name** (should be exactly `.env`, not `.env.local` or `.env.development`)
3. **Vite caching issue**

### Solution

```bash
# 1. Kill all node/vite processes
pkill -f vite
pkill -f node

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Verify .env file exists and has correct content
cat .env | grep VITE_

# 4. Start dev server fresh
pnpm run dev
```

## If You See Correct Values But Still Fallback

Then the issue is in the logic, not the environment. Check for these debug logs:

```
isEdgeFetchEnabled - raw value: true type: string
[ontario_demand] Streaming check: { shouldAttemptStream: true }
[ontario_demand] Attempting to stream from edge functions...
```

If you see `shouldAttemptStream: false`, that tells us which check is failing.

## About the "Creating fallback connection" Message

This message comes from `streamingService.ts` which is used by:
- GridOptimizationDashboard
- SecurityDashboard  
- InvestmentCards
- StakeholderDashboard

These components use a DIFFERENT streaming system (`useStreamingData` hook) that's designed for Server-Sent Events (SSE), not the batch API loading.

**This is NOT the cause of your main dashboard showing "Source: Fallback".**

The main `RealTimeDashboard` uses `energyDataManager.loadData()` which is the correct system and should work.

## Current Status

- ✅ Edge functions deployed and working (verified with test script)
- ✅ Environment variables set in `.env` file
- ❓ Need to verify Vite is loading the `.env` file
- ❓ Need to see debug logs from `dataManager.ts`

## Next Step

Run the JavaScript snippet above in your browser console and share the output.
