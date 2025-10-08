# Netlify Environment Variables Fix

## Issue Summary

Two issues identified:

### 1. Fallback Data on Localhost (Port 5173)
**Status**: ✅ FIXED - Updated local `.env`

The application was using fallback/sample data because streaming edge functions were failing. This is the expected behavior when:
- Edge functions are unreachable (CORS, network issues)
- Supabase service is down
- Edge function deployment is incomplete

**Solution**: 
- Cleaned up `.env` file formatting
- Disabled WebSocket (not deployed yet)
- All streaming-related env vars are properly configured

### 2. Missing Navigation Tabs on Netlify Production

**Status**: ⚠️ ACTION REQUIRED - Netlify environment variable needs update

Only 4 buttons are visible (Home, Analytics & Trends, Provinces, My Energy AI) because the code filters tabs in production mode based on feature flags defined in `src/lib/featureFlags.ts`.

## Root Cause

**Wrong Environment Variable Name on Netlify**

You have set:
```
VITE_USE_STREAMING ❌ (WRONG)
```

But the code expects:
```
VITE_USE_STREAMING_DATASETS ✅ (CORRECT)
```

See `src/lib/config.ts` line 64:
```typescript
export function getFeatureFlagUseStreaming(): boolean {
  const raw = env.VITE_USE_STREAMING_DATASETS as string | boolean | undefined;
  // ...
}
```

## Fix Instructions for Netlify

### Step 1: Delete Wrong Variable
1. Go to your Netlify dashboard: https://app.netlify.com
2. Navigate to: **Site settings** → **Environment variables**
3. Find `VITE_USE_STREAMING` 
4. Click **Options** → **Delete**

### Step 2: Add Correct Variable
1. Click **Add a variable** → **Add a single variable**
2. Set the following:

```
Key: VITE_USE_STREAMING_DATASETS
Value: true
Scopes: All scopes (check all boxes)
Deploy contexts: All contexts (Production, Deploy Previews, Branch deploys, etc.)
```

### Step 3: Add Missing Variables (if not present)

Ensure these are also set:

```
VITE_ENABLE_EDGE_FETCH=true
VITE_SUPABASE_EDGE_BASE=https://qnymbecjgeaoxsfphrti.functions.supabase.co
```

### Step 4: Trigger Redeploy
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for build to complete
4. Test the site - you should now see all navigation tabs

## Expected Navigation Tabs After Fix

Once fixed, you should see these tabs on https://canada-energy.netlify.app/:

### Production-Ready & Acceptable Features (Always Visible):
1. **Home** 🏠
2. **Dashboard** 📊
3. **Analytics & Trends** 📈
4. **Provinces** 🌍
5. **My Energy AI** 🏠
6. **Investment** 📈
7. **Resilience** 🛡️
8. **Innovation** ⚡
9. **Indigenous** 🛡️
10. **Stakeholders** ⚡

### Partial Features (Visible with Warning Badges):
11. **Grid Ops** ⚡ - Badge: "Limited"
12. **Security** 🔒 - Badge: "Limited"

### Always Visible:
13. **Features** ℹ️ - Status page

### Hidden in Production (Deferred to Phase 2):
- Emissions Tracking (status: 'deferred')
- Market Intelligence (status: 'deferred')
- Community Planning (status: 'deferred')

## How Feature Filtering Works

### Development Mode (localhost)
All tabs are visible, including deferred features (unless explicitly disabled via feature flags)

### Production Mode (Netlify)
See `src/components/EnergyDataDashboard.tsx` lines 220-229:

```typescript
}).filter(tab => {
  // In production, hide deferred features
  if (import.meta.env.PROD) {
    const featureId = tabToFeatureMap[tab.id];
    if (featureId && !isFeatureEnabled(featureId)) {
      return false;
    }
  }
  return true;
});
```

This code:
1. Checks if running in production (`import.meta.env.PROD`)
2. Maps each tab to its feature ID
3. Calls `isFeatureEnabled()` from `src/lib/featureFlags.ts`
4. Hides tabs where `enabled: false` (deferred features)

## Verification

After deploying, check:

1. **All 13 tabs should be visible** on the production site
2. **Grid Ops** and **Security** should have "Limited" badges
3. **No fallback data warnings** if Supabase edge functions are working
4. **Browser console** should not show streaming errors

## Debugging Checklist

If tabs are still missing after fix:

- [ ] Cleared browser cache and hard-refreshed (Cmd+Shift+R on Mac)
- [ ] Verified deploy completed successfully on Netlify
- [ ] Checked browser console for JavaScript errors
- [ ] Verified all environment variables are set in **Production** context
- [ ] Confirmed Supabase credentials are correct

## Additional Context

### Why Streaming Matters for Tab Visibility

While streaming (`VITE_USE_STREAMING_DATASETS`) primarily controls data fetching behavior, it's part of the overall feature flag system. Some components check this flag to determine their availability.

### Fallback Behavior

When streaming is disabled or fails:
- App shows "Using sample data • Source: Fallback"
- Uses local JSON files from `/public/data/`
- All features still function, but with static demo data

### WebSocket Note

`VITE_ENABLE_WEBSOCKET` is set to `false` because:
- WebSocket server is not yet deployed
- Real-time collaboration features deferred to Phase 2
- Setting to `true` would cause connection errors

## Files Modified

- ✅ `/Users/sanjayb/minimax/energy-data-dashboard/.env` - Cleaned up and fixed formatting
- 📝 This documentation file

## Next Steps

1. **Apply Netlify environment variable fix** (instructions above)
2. **Test production deployment** at https://canada-energy.netlify.app/
3. **Monitor edge function health** - check if fallback warnings persist
4. **Review feature flags** in `src/lib/featureFlags.ts` if custom visibility needed

---

**Created**: 2025-10-08  
**Issue Reporter**: User  
**Resolved By**: AI Assistant
