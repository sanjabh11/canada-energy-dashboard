# 🚨 EDGE FUNCTION REDEPLOYMENT REQUIRED

## Root Cause Identified ✅

**Database**: Has 132 records ✅
**API**: Returning empty array ❌ (Old version deployed)
**Fix**: Edge Function code updated locally but not deployed to Supabase

The code changes I made to fix the year filter are in your local repository but haven't been deployed to your live Supabase project yet.

---

## SOLUTION: Redeploy Edge Function

### Option 1: Deploy via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti

2. **Open Edge Functions**
   - Click **"Edge Functions"** in the left sidebar

3. **Find the Function**
   - Look for `api-v2-minerals-supply-chain`

4. **Redeploy**
   - Click on the function name
   - Click **"Deploy New Version"** or **"Redeploy"**
   - Select the source: `supabase/functions/api-v2-minerals-supply-chain`
   - Click **"Deploy"**

5. **Wait for Deployment**
   - Should take 30-60 seconds
   - Status should change to "Active" or "Deployed"

---

### Option 2: Deploy via Supabase CLI

If you have Supabase CLI authenticated:

```bash
npx supabase functions deploy api-v2-minerals-supply-chain --project-ref qnymbecjgeaoxsfphrti
```

If you get authentication errors:
```bash
npx supabase login
# Then retry the deploy command
```

---

## After Deployment

1. **Hard refresh** the Critical Minerals Dashboard (Cmd+Shift+R)
2. **Check browser console** - you should now see:
   ```
   Raw trade_flows from API: Array(132)
   trade_flows length: 132
   Chart will render: true
   ```
3. **Trade Flows chart should appear** showing imports vs exports

---

## What Changed in the Edge Function

**File**: `supabase/functions/api-v2-minerals-supply-chain/index.ts`
**Lines**: 85-107

**Before (deployed version)**:
```typescript
const currentYear = new Date().getFullYear(); // 2025
let tradeQuery = supabase
  .from('minerals_trade_flows')
  .eq('year', currentYear) // ❌ No data for 2025
```

**After (local version - needs deployment)**:
```typescript
// First, get the most recent year in the database
const { data: latestYearData } = await supabase
  .from('minerals_trade_flows')
  .select('year')
  .order('year', { ascending: false })
  .limit(1)
  .single();

const queryYear = latestYearData?.year || currentYear; // ✅ Uses 2024

let tradeQuery = supabase
  .from('minerals_trade_flows')
  .eq('year', queryYear) // ✅ Returns data
```

---

## Verification

After deploying, you can verify the API directly:

**API URL**:
```
https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-minerals-supply-chain?priority=true
```

**Expected Response**:
```json
{
  "trade_flows": [
    { "mineral": "Lithium", "year": 2024, "flow_type": "Export", ... },
    { "mineral": "Lithium", "year": 2024, "flow_type": "Import", ... },
    ...
  ]
}
```

The `trade_flows` array should have ~132 objects.

---

## If Deploy Still Fails

If you cannot deploy via Dashboard or CLI, the alternative is to:

1. Manually copy the updated `index.ts` code
2. Create a new function version in Supabase Dashboard
3. Paste the code and deploy

Let me know if you encounter any issues with deployment!
