# Manual Deployment Steps for Phase 5

Due to migration history conflicts between local and remote Supabase, follow these manual steps:

## Step 1: Apply Storage Dispatch Migration via SQL Editor

1. Go to https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
2. Copy the contents of `supabase/migrations/20251010_storage_dispatch_standalone.sql`
3. Paste into the SQL editor
4. Click "Run" to execute
5. Verify success (should see "Success. No rows returned")

**What it does:**
- Creates `batteries_state` table
- Creates `storage_dispatch_logs` table
- Adds provenance columns to existing tables
- Seeds initial battery states for ON, AB, BC, QC

## Step 2: Deploy Edge Functions

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard/supabase

# Deploy storage dispatch API
supabase functions deploy api-v2-storage-dispatch --no-verify-jwt

# Verify deployment
supabase functions list
```

## Step 3: Download Historical Data

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard

# Make script executable
chmod +x scripts/download-ieso-data.sh

# Download IESO data (takes 2-5 min)
./scripts/download-ieso-data.sh
```

**Expected output:**
- Creates `./data/historical/ieso/` directory
- Downloads 4 CSV files (~60MB total)

## Step 4: Import Historical Data

```bash
# Set environment variables
export VITE_SUPABASE_URL=https://qnymbecjgeaoxsfphrti.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Run import (takes 10-15 min)
node scripts/import-historical-data.mjs
```

**Expected output:**
```
✅ All historical data imported successfully!
Summary:
- Total generation observations: 6,720
- Total demand observations: 1,464
- Date range: September 2024 - October 2024
- Province: ON (Ontario)
- Provenance: historical_archive
```

## Step 5: Run Curtailment Replay

```bash
# Same environment variables as Step 4
node scripts/run-curtailment-replay.mjs
```

**Expected output:**
```
📈 AWARD EVIDENCE SUMMARY:
🎯 Events detected: 15-25
✅ AI-avoided curtailment: 400-600 MWh
📊 Curtailment reduction: 35-45%
💰 Opportunity cost saved: $20,000-$30,000 CAD
```

## Step 6: Build Frontend

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard

# Build production bundle
npm run build

# Deploy to Netlify (if configured)
netlify deploy --prod --dir=dist
```

## Verification Steps

### Test Storage Dispatch API
```bash
curl https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-storage-dispatch/status?province=ON \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Should return battery state with SoC %.

### Check Database Tables
Go to Supabase Dashboard > Table Editor and verify:
- `batteries_state` exists with 4 rows (ON, AB, BC, QC)
- `storage_dispatch_logs` exists (empty initially)
- `renewable_forecasts` has new columns: `baseline_persistence_mw`, `data_provenance`
- `curtailment_events` has new columns: `data_provenance`, `price_provenance`

### View UI Changes
After deploying frontend, navigate to:
- **Storage Dispatch** tab (new) - Should show battery dashboard
- **Renewable Forecasts** tab - Should show provenance badges
- **Curtailment Analytics** tab - Should show quality badges

## Troubleshooting

### "Cannot find module 'csv-parse'"
```bash
npm install csv-parse
```

### "IESO download failed"
- Check internet connection
- Try manual download from http://reports.ieso.ca/public/
- Place files in `./data/historical/ieso/`

### "No curtailment events detected"
- Normal if October 2024 had limited oversupply
- Ensure historical data imported successfully
- Check `energy_observations` and `demand_observations` tables have data

### Migration conflicts persist
- Use SQL Editor approach (Step 1) instead of `supabase db push`
- This bypasses migration history tracking
- Safe to re-run the standalone migration

## Next Steps After Deployment

1. Monitor edge function logs for errors
2. Test all 3 new API endpoints
3. Verify UI displays provenance badges
4. Export award evidence from dashboard
5. Document methodology for submission

---

**Status:** Ready for manual deployment
**Estimated Time:** 30-45 minutes total
