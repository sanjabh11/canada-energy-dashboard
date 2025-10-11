# 🚀 Quick Deployment Instructions

## Critical: Apply Database Migration First

### Step 1: Run SQL Migration (Required)

1. Open Supabase SQL Editor:
   **https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new**

2. Copy and paste the entire contents of:
   `supabase/migrations/20251010_province_configs_batteries.sql`

3. Click **RUN** button

4. Verify success:
   ```sql
   SELECT * FROM province_configs;
   SELECT * FROM batteries;
   ```
   
   You should see 8 provinces and 1 demo battery.

### Step 2: Edge Functions (Already Deployed ✅)

The following functions have been deployed:
- ✅ `api-v2-forecast-performance` (with storage metrics)
- ✅ `api-v2-curtailment-reduction` (with replay endpoint)

### Step 3: Restart Your Dev Server

```bash
# Kill any running Vite processes
pkill -f "vite"

# Start fresh
npm run dev
```

### Step 4: Test Pages

Visit these URLs and verify no errors:

1. **Battery Storage Dispatch**
   - Should show: SoC 85.2%, 0 actions, "No dispatch logs yet" message
   - No console errors

2. **Curtailment Reduction**
   - Should show: Event count, $0 saved (until replay runs)
   - "Run Historical Replay" button visible

3. **Award Evidence Metrics**
   - All cards show "0" or "88%" (not blank/undefined)
   - No `.toLocaleString()` errors

## What Was Fixed

### 🐛 Root Cause
```typescript
// CRASHED: undefined.toLocaleString()
${awardMetrics?.monthly_arbitrage_revenue_cad.toLocaleString()}

// FIXED: Nullish coalescing before method call
${(awardMetrics?.monthly_arbitrage_revenue_cad ?? 0).toLocaleString()}
```

### ✅ Changes Made

1. **UI Null Guards** - All `awardMetrics` fields now default to 0
2. **Database Tables** - Created province_configs, batteries, batteries_state, storage_dispatch_logs
3. **Award Evidence API** - Now returns storage metrics (efficiency, revenue, accuracy)
4. **Historical Replay** - New endpoint to compute avoided MWh from past events

## Troubleshooting

### Pages Still Blank?

1. **Check migration applied:**
   ```sql
   SELECT COUNT(*) FROM province_configs;
   -- Should return 8
   ```

2. **Check browser console** - Look for any remaining errors

3. **Hard refresh** - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

4. **Verify .env.local** - Ensure correct Supabase URL and keys

### Edge Function Errors?

Check logs in Supabase Dashboard:
https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/functions

## Next Steps (Optional)

### Generate Test Data

**Create mock curtailment events:**
```bash
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-curtailment-reduction/mock" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province": "ON", "sourceType": "solar"}'
```

**Run historical replay:**
```bash
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-curtailment-reduction/replay" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province": "ON"}'
```

**Trigger dispatch action:**
```bash
curl -X POST "https://qnymbecjgeaoxsfphrti.functions.supabase.co/api-v2-storage-dispatch/dispatch" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"province": "ON", "currentPrice": 25, "curtailmentRisk": true}'
```

## Files Changed

- `src/components/RenewableOptimizationHub.tsx` - Null guards
- `supabase/migrations/20251010_province_configs_batteries.sql` - New tables
- `supabase/functions/api-v2-forecast-performance/index.ts` - Storage metrics
- `supabase/functions/api-v2-curtailment-reduction/index.ts` - Replay endpoint

## Success Criteria

- [ ] No console errors on any page
- [ ] All KPI cards show numbers (not blank)
- [ ] Battery Storage page displays SoC and helpful messages
- [ ] Curtailment page shows event count and replay button
- [ ] Award Evidence page shows all metrics (even if 0)

---

**Full details:** See `BLANK_PAGES_FIX.md`
