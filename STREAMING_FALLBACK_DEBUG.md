# Streaming Fallback Issue - Debugging Guide

## Problem Statement

Data sources are showing "Source: Fallback" instead of "Source: Stream" on both localhost and Netlify production.

## Root Cause Investigation

### Hypothesis 1: `isEdgeFetchEnabled()` returning false
The `src/lib/config.ts` function `isEdgeFetchEnabled()` has logic that defaults to `false` on localhost unless explicitly set. However, `VITE_ENABLE_EDGE_FETCH=true` IS set in `.env`.

### Debug Logging Added

**Files Modified:**
1. `src/lib/config.ts` - Added debug logs to `isEdgeFetchEnabled()`
2. `src/lib/dataManager.ts` - Added streaming decision logging
3. `.env` - Temporarily set `VITE_DEBUG_LOGS=true`

**What to Check in Browser Console:**

After refreshing http://localhost:5173/, look for these logs:

```
isEdgeFetchEnabled - raw value: [value] type: [type]
isEdgeFetchEnabled - returning string parsed: [true/false]

[dataset_name] Streaming check: {
  isStreamingConfigured: [boolean],
  isEdgeFetchEnabled: [boolean],
  canUseStreaming: [boolean],
  streamingConfigured: [boolean],
  streamingFeatureEnabled: [boolean],
  shouldAttemptStream: [boolean],
  forceStream: [boolean]
}
```

### Expected Flow for Streaming to Work

For data to stream from Supabase edge functions:

1. **`isStreamingConfigured()`** = `true`
   - Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` ✅ (both set)

2. **`isEdgeFetchEnabled()`** = `true`
   - Checks `VITE_ENABLE_EDGE_FETCH` ✅ (set to 'true')
   - Should return `true` for localhost when explicitly set

3. **`canUseStreaming()`** = `true`
   - Checks `VITE_USE_STREAMING_DATASETS` ✅ (set to 'true')
   - Returns `getFeatureFlagUseStreaming() && isStreamingConfigured()`

4. **`shouldAttemptStream`** = `true`
   - Calculated as: `forceStream ? streamingConfigured : streamingFeatureEnabled`
   - `streamingFeatureEnabled = canUseStreaming() && isEdgeFetchEnabled()`

If any of these is `false`, the system falls back to local JSON samples.

## Potential Issues

### Issue A: Edge Functions Not Deployed or Returning 404/500

The console shows:
```
GET https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-resilience-hazards 500 (Internal Server Error)
```

**This suggests edge functions may not be fully deployed or have errors.**

Check which edge functions are actually deployed:
```bash
supabase functions list --project-ref qnymbecjgeaoxsfphrti
```

Expected streaming endpoints:
- `manifest-provincial-generation` or `manifest/kaggle/provincial_generation`
- `stream-provincial-generation` or `stream/kaggle/provincial_generation`
- `manifest-ontario-demand` or `manifest/kaggle/ontario_demand`
- `stream-ontario-demand` or `stream/kaggle/ontario_demand`
- `manifest-ontario-prices` or `manifest/kaggle/ontario_prices`
- `stream-ontario-prices` or `stream/kaggle/ontario_prices`
- `manifest-hf-electricity-demand` or `manifest/hf/electricity_demand`
- `stream-hf-electricity-demand` or `stream/hf/electricity_demand`

### Issue B: CORS Configuration

Edge functions need proper CORS headers to allow requests from:
- `http://localhost:5173` (development)
- `https://canada-energy.netlify.app` (production)

### Issue C: Edge Function Code Errors

If edge functions throw errors or return non-200 status codes, the streamer catches the error and falls back:

```typescript
// In dataManager.ts line 218-226
catch (error: any) {
  console.error(`Failed to load streaming data for ${datasetKey}:`, error);
  try {
    return await this.loadUsingFallback(datasetKey, { maxRows, onProgress, onStatusChange });
  }
}
```

## Testing Steps

### Step 1: Check Console Logs
1. Open http://localhost:5173/
2. Open DevTools Console (F12)
3. Look for the debug logs listed above
4. Identify which check is failing

### Step 2: Test Edge Function Directly

Try accessing an edge function directly:

```bash
curl -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU" \
  "https://qnymbecjgeaoxsfphrti.functions.supabase.co/manifest-provincial-generation"
```

Expected: JSON response with manifest data
If 404: Function not deployed or wrong endpoint name
If 500: Function has runtime error

### Step 3: Check Edge Function Deployment

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard
supabase functions list --project-ref qnymbecjgeaoxsfphrti
```

### Step 4: Review Edge Function Logs

```bash
supabase functions logs manifest-provincial-generation --project-ref qnymbecjgeaoxsfphrti
```

## Resolution Paths

### Path A: Edge Functions Not Deployed
**Solution**: Deploy the missing streaming edge functions

```bash
# Deploy all functions
supabase functions deploy --project-ref qnymbecjgeaoxsfphrti
```

### Path B: isEdgeFetchEnabled() Returns False
**Solution**: Already fixed with debug logging. If the env var check isn't working, it means Vite isn't loading the `.env` file properly.

**Verify**:
```bash
# Restart Vite dev server to reload .env
# Kill existing process and run:
pnpm run dev
```

### Path C: Edge Function Endpoints Have Wrong Names
**Solution**: Check `src/lib/dataStreamers.ts` and verify endpoint names match deployed functions

Look at lines like:
```typescript
const response = await fetchEdgeWithParams([
  'stream-ontario-demand',  // First attempt
  'stream/kaggle/ontario_demand'  // Fallback
], params, { signal });
```

### Path D: CORS Issues
**Solution**: Update edge functions to include proper CORS headers

Example for edge function:
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
});
```

## Quick Fix: Force Streaming On

If you want to bypass fallback logic temporarily for testing:

**Edit `src/lib/dataManager.ts` line 199:**
```typescript
// TEMPORARY: Force streaming
const shouldAttemptStream = true;  // Remove after testing
```

This will help identify if the issue is with the streaming check or the actual edge function calls.

## After Debugging

Once the issue is identified:

1. **Remove debug logs** (set `VITE_DEBUG_LOGS=false`)
2. **Commit the fix**
3. **Deploy to Netlify**
4. **Verify both localhost and production show "Source: Stream"**

---

**Status**: Debug logging active, waiting for browser console output to identify root cause.

**Next Action**: Open http://localhost:5173/ and check console for diagnostic output.
