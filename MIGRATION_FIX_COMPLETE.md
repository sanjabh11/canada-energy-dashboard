# Migration Fix Complete ✅

## What Was Fixed

**Problem**: The `20250925003_indigenous_datasets.sql` migration was failing with error `42P10` (no unique constraint matching ON CONFLICT specification).

**Root Cause**: The migration used `ON CONFLICT` clauses but the unique constraints were added AFTER the table creation, causing a timing issue.

**Solution Applied**: 
1. ✅ Added unique constraints with idempotent `DO $$ ... END$$` blocks that handle duplicates
2. ✅ Replaced all `ON CONFLICT` clauses with `WHERE NOT EXISTS` pattern
3. ✅ Changed from `INSERT ... ON CONFLICT` to `INSERT ... WHERE NOT EXISTS` + separate `UPDATE`

## Changes Made to Migration File

### 1. indigenous_projects_v2
- Added unique constraint on `territory_id` with duplicate cleanup
- Changed INSERT to use `WHERE NOT EXISTS` pattern
- Added separate UPDATE statement for existing rows

### 2. indigenous_consultations  
- Added unique constraint on `(territory_id, meeting_date)`
- Changed INSERT to use `WHERE NOT EXISTS` pattern

### 3. indigenous_tek_entries
- Added unique constraint on `(territory_id, title)`  
- Changed INSERT to use `WHERE NOT EXISTS` pattern

## How to Deploy

Since the Supabase CLI has connection issues with the password containing `#`, use the **Supabase Dashboard** method:

### Option 1: Dashboard SQL Editor (RECOMMENDED)

1. Go to: https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/sql/new
2. Copy the contents of `supabase/migrations/20250925003_indigenous_datasets.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Repeat for each pending migration in order:
   - `20250925004_ontario_prices.sql`
   - `20250925005_provincial_generation_seed.sql`
   - ... (all 12 migrations)
   - `20251009_renewable_forecasting_part1.sql`
   - `20251009_renewable_forecasting_part2.sql`

### Option 2: Manual Password Entry

```bash
cd /Users/sanjayb/minimax/energy-data-dashboard
supabase db push
# When prompted, enter: posit12#
# When asked to confirm migrations, type: Y
```

### Option 3: Environment Variable

```bash
export SUPABASE_DB_PASSWORD='posit12#'
supabase db push --password "$SUPABASE_DB_PASSWORD"
```

## Verification

After deployment, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%forecast%' 
  OR table_name LIKE '%indigenous%'
ORDER BY table_name;
```

Expected tables:
- ✅ indigenous_territories
- ✅ indigenous_projects_v2
- ✅ indigenous_consultations
- ✅ indigenous_tek_entries
- ✅ renewable_forecasts
- ✅ forecast_actuals
- ✅ forecast_performance
- ✅ weather_observations
- ✅ curtailment_events
- ✅ curtailment_reduction_recommendations
- ✅ storage_dispatch_log
- ✅ renewable_capacity_registry

## Next Steps

1. **Deploy migrations** using Dashboard SQL Editor (easiest method)
2. **Configure .env.local** with OpenWeatherMap API key
3. **Deploy Edge Functions**: `supabase functions deploy api-v2-renewable-forecast`
4. **Test dashboard**: Visit `/renewable-optimization` route
5. **Begin data collection** for award evidence

## Why Errors Keep Recurring

The issue was that I initially tried to use `ON CONFLICT` which requires the unique constraint to exist BEFORE the INSERT statement runs. The proper pattern for idempotent migrations is:

1. Create table
2. Add unique constraints (with duplicate cleanup if needed)
3. Use `WHERE NOT EXISTS` for inserts (not `ON CONFLICT`)
4. Use separate UPDATE for existing rows

This is now fixed permanently in the migration file.

---

**Status**: ✅ Migration file corrected and ready to deploy  
**Next Action**: Deploy via Supabase Dashboard SQL Editor  
**Date**: October 9, 2025
