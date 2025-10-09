# 🚨 QUICK FIX: Enable Streaming in Production

## Problem
Dashboard shows "0/4 Connected" and "Source: Fallback" instead of live data.

## Root Cause
Missing environment variable: `VITE_USE_STREAMING_DATASETS=true` in Netlify

## Fix (5 minutes)

### Step 1: Open Netlify Dashboard
**Direct Link**: https://app.netlify.com/sites/canada-energy/settings/env

### Step 2: Add These 5 Variables

Click "Add a variable" for each:

#### Variable 1
```
Key: VITE_SUPABASE_URL
Value: <YOUR_SUPABASE_PROJECT_URL>
Scopes: All scopes
```

#### Variable 2
```
Key: VITE_SUPABASE_ANON_KEY
Value: <YOUR_SUPABASE_ANON_KEY>
Scopes: All scopes
```

#### Variable 3 ⭐ CRITICAL
```
Key: VITE_USE_STREAMING_DATASETS
Value: true
Scopes: All scopes
```

#### Variable 4
```
Key: VITE_ENABLE_EDGE_FETCH
Value: true
Scopes: All scopes
```

#### Variable 5
```
Key: VITE_DEBUG_LOGS
Value: false
Scopes: All scopes
```

### Step 3: Trigger Redeploy
1. Go to: https://app.netlify.com/sites/canada-energy/deploys
2. Click "Trigger deploy" → "Deploy site"
3. Wait ~2 minutes

### Step 4: Verify
Visit: https://canada-energy.netlify.app

**Check Console** (F12):
```javascript
// Should show:
enableLivestream: true  ✅
streamingFeatureEnabled: true  ✅
```

**Check Dashboard**:
```
Data Sources: 4/4 Connected  ✅
Source: Streaming  ✅
```

## Done! 🎉

Your dashboard should now show live streaming data instead of fallback data.

---

## Troubleshooting

### Still showing fallback?
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check Netlify build logs for errors
3. Verify all 5 variables are set with correct values
4. Ensure "Scopes" is set to "All scopes" not "Deploy previews"

### Need Help?
Check `PRODUCTION_ISSUES_SUMMARY.md` for detailed diagnostics.
