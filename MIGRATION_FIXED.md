# Migration Fixed - Schema Compatibility

## Issues Encountered

### Error 1: Column `soc_pct` does not exist
**Cause:** Migration used `soc_pct` but existing table has `soc_percent`
**Fix:** ✅ Updated all references from `soc_pct` to `soc_percent`

### Error 2: Column `battery_id` does not exist
**Cause:** Existing `batteries_state` table has different schema:
- Uses `id` (UUID) as primary key, not `battery_id`
- Already has columns: `id`, `province`, `soc_percent`, `soc_mwh`, `capacity_mwh`, `power_rating_mw`, `efficiency_percent`, `last_updated`, `created_at`

**Fix:** ✅ Changed migration to:
1. Add `battery_id` column conditionally (if not exists)
2. Use UPDATE instead of INSERT for existing rows
3. Work with existing schema structure

## Updated Migration Strategy

The migration now:
1. **Creates new tables** (if they don't exist):
   - `province_configs` ✅
   - `batteries` ✅
   - `storage_dispatch_logs` ✅

2. **Adapts to existing `batteries_state`**:
   - Adds `battery_id` column (for future foreign key)
   - Updates existing Ontario row with new values
   - Preserves existing UUID-based primary key

3. **Seeds data**:
   - 8 province configs
   - 1 demo battery (ON_demo_batt)
   - Updates Ontario battery state

4. **Sets up RLS policies**:
   - Public read access
   - Service role full access

## Ready to Deploy

The migration file is now compatible with your existing schema.

**Run in Supabase SQL Editor:**
```
https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
```

Copy and paste the entire contents of:
```
supabase/migrations/20251010_province_configs_batteries.sql
```

## Expected Result

After running, you should have:
- ✅ `province_configs` table with 8 provinces
- ✅ `batteries` table with ON_demo_batt
- ✅ `batteries_state` with battery_id column added
- ✅ Ontario battery state updated (85.2% SoC)
- ✅ `storage_dispatch_logs` table ready for dispatch actions
- ✅ All RLS policies in place

## Verification Queries

After migration, run these to verify:

```sql
-- Check province configs
SELECT COUNT(*) FROM province_configs;
-- Should return: 8

-- Check batteries
SELECT * FROM batteries WHERE id = 'ON_demo_batt';
-- Should return: 1 row

-- Check battery state
SELECT id, province, battery_id, soc_percent, soc_mwh 
FROM batteries_state 
WHERE province = 'ON';
-- Should show: battery_id = 'ON_demo_batt', soc_percent = 85.2

-- Check storage logs table exists
SELECT COUNT(*) FROM storage_dispatch_logs;
-- Should return: 0 (empty, ready for data)
```

## Next Steps

1. ✅ Run the updated migration SQL
2. Verify queries above pass
3. Restart dev server: `npm run dev`
4. Test pages - should load without errors
5. All KPI cards should show "0" or "88%" (not blank/undefined)
