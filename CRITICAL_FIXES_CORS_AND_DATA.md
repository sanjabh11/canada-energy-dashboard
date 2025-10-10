# Critical Fixes: CORS + Data Population

**Date:** October 10, 2025, 16:38 IST  
**Priority:** HIGH - Blocking all API calls  
**Status:** Ready to Execute

---

## 🔴 Issue 1: CORS Policy Violation (CRITICAL)

### Problem
```
Access-Control-Allow-Origin header has value 'http://localhost:5173' 
that is not equal to the supplied origin 'http://localhost:5174'
```

### Root Cause
- Vite dev server running on port **5174** (not default 5173)
- Edge functions hardcoded to allow only `http://localhost:5173`
- LLM function specifically has: `LLM_CORS_ALLOW_ORIGINS=http://localhost:5173`

### Solution Options

#### Option A: Change Vite Port to 5173 (Recommended)
```bash
# Kill existing server on 5174
lsof -ti:5174 | xargs kill -9

# Start on default port
npm run dev
# Should start on 5173
```

#### Option B: Update All Edge Functions CORS
Update every edge function to accept both ports:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Or 'http://localhost:5173,http://localhost:5174'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

Then redeploy all functions:
```bash
supabase functions deploy api-v2-analytics-national-overview
supabase functions deploy api-v2-analytics-provincial-metrics
supabase functions deploy api-v2-analytics-trends
supabase functions deploy llm
# ... (30+ functions)
```

#### Option C: Use Wildcard CORS (Development Only)
Set in `.env.local`:
```bash
LLM_CORS_ALLOW_ORIGINS=*
```

**Recommendation:** Use Option A (change port to 5173) - fastest fix.

---

## 🟡 Issue 2: No Performance Data

### Problem
```
No Performance Data Available
Run historical data import scripts to populate forecast performance metrics.
```

### Root Cause
- Tables exist but are empty
- Need to run data generation scripts

### Solution
```bash
# 1. Set environment variables
export VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<your_rotated_key>

# 2. Generate sample historical data
node scripts/generate-sample-historical-data.mjs

# 3. Run curtailment replay
node scripts/run-curtailment-replay.mjs

# 4. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM forecast_performance_metrics;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM curtailment_events;"
```

**Expected Output:**
- `forecast_performance_metrics`: 60+ rows
- `curtailment_events`: 20+ rows
- `energy_observations`: 720+ rows

---

## 🟡 Issue 3: Multiple Supabase Clients

### Problem
```
Multiple GoTrueClient instances detected in the same browser context.
```

### Root Cause
`StorageDispatchDashboard.tsx` creates its own Supabase client instead of using shared instance.

### Solution
**File:** `src/components/StorageDispatchDashboard.tsx`

**Before:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);
```

**After:**
```typescript
import { supabase } from '../lib/supabaseClient';
```

---

## 🟢 Issue 4: Streaming Returns 0 Rows (Expected)

### Problem
```
[ontario_demand] Streaming returned 0 rows; falling back to sample data.
```

### Root Cause
- No real-time data in database
- Fallback to sample data working as designed

### Solution
This is **expected behavior** until you:
1. Deploy streaming edge functions
2. Set up data ingestion cron jobs
3. Populate initial data

**No action required** - fallback is working correctly.

---

## 📋 Execution Plan

### Step 1: Fix CORS (5 min)
```bash
# Kill server on wrong port
lsof -ti:5174 | xargs kill -9

# Restart on correct port
npm run dev
# Verify it starts on 5173
```

### Step 2: Fix Multiple Supabase Clients (2 min)
```bash
# Create shared client if not exists
cat > src/lib/supabaseClient.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);
EOF

# Update StorageDispatchDashboard.tsx to use shared client
```

### Step 3: Populate Data (10 min)
```bash
# Set env vars
export VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<your_key>

# Run scripts
node scripts/generate-sample-historical-data.mjs
node scripts/run-curtailment-replay.mjs
```

### Step 4: Verify (2 min)
```bash
# Refresh browser (should be on localhost:5173 now)
# Navigate to Renewable Forecasts → Performance tab
# Should see baseline comparison cards with data
```

---

## ✅ Success Criteria

- [ ] No CORS errors in console
- [ ] API calls succeed (200 OK)
- [ ] Performance tab shows baseline comparison cards
- [ ] Curtailment dashboard shows MWh > 0
- [ ] Storage dispatch shows alignment %
- [ ] Only one "GoTrueClient" warning (if any)

---

## 🚨 If Issues Persist

### CORS Still Failing
```bash
# Check which port Vite is using
lsof -i :5173
lsof -i :5174

# Force specific port
npm run dev -- --port 5173
```

### Data Scripts Fail
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify migrations applied
supabase migration list

# Check table exists
psql $DATABASE_URL -c "\dt forecast_performance_metrics"
```

### Multiple Clients Warning Persists
```bash
# Search for all createClient calls
grep -r "createClient" src/

# Should only be in src/lib/supabaseClient.ts
```

---

*End of Critical Fixes Document*
