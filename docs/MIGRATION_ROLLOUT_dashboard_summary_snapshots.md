# Dashboard Summary Snapshots Migration Rollout Guide

## Overview

This guide documents the deployment steps for the `dashboard_summary_snapshots` table, which enables persisted backend fallback for Hydrogen Economy and Critical Minerals Supply Chain dashboards.

## Migration File

- **Source**: `supabase/migrations/20260404155100_dashboard_summary_snapshots.sql`
- **Target Environment**: Production Supabase project

## Pre-Deployment Checklist

- [ ] `pnpm run verify:migration-versions` passes locally
- [ ] Review migration SQL for safety (no destructive operations)
- [ ] Verify edge functions are deployed with snapshot wiring
- [ ] Confirm dashboard frontends are deployed with provenance updates
- [ ] Schedule maintenance window (if required)
- [ ] Backup current database state (optional - new table only)

## Migration Contents

The migration creates:

1. **Table**: `public.dashboard_summary_snapshots`
   - Stores dashboard summary payloads with variant-based lookup
   - Includes provenance metadata (source_label, is_partial, notes)

2. **Indexes**:
   - `idx_dashboard_summary_lookup` - Fast lookup by dashboard_key + variant_key
   - `idx_dashboard_summary_stored` - Query by stored_at timestamp

3. **RLS Policy**:
   - `dashboard_summary_snapshots_public_read` - Public read access for degraded-mode serving
   - No insert/update/delete policies (edge functions use service role)

4. **Trigger**:
   - `update_dashboard_summary_snapshots_timestamp` - Auto-updates updated_at

## Deployment Steps

### Option 1: Supabase CLI (Recommended)

```bash
# Verify local migration prefixes first
pnpm run verify:migration-versions

# Link to production project
supabase link --project-ref <YOUR_PROJECT_REF>

# Upgrade Supabase CLI before any repair/push step
# Example if installed with Homebrew:
brew upgrade supabase/tap/supabase

# Review remote/local migration history
supabase migration list

# Repair legacy umbrella versions that no longer map to split local files
supabase migration repair --status reverted 20250104 20250925 20251009 20251010

# Re-check history, then push all pending migrations
supabase migration list
supabase db push --include-all

# Verify migration applied
pnpm run verify:dashboard-snapshots
```

### Option 2: Supabase Dashboard SQL Editor

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Copy contents of `supabase/migrations/20260404155100_dashboard_summary_snapshots.sql`
3. Run as **New query**
4. Verify no errors in output

### Option 3: Programmatic (CI/CD)

```bash
# In your deployment pipeline
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260404155100_dashboard_summary_snapshots.sql
```

## Post-Deployment Verification

Before the SQL checks below, confirm:

```bash
pnpm run verify:migration-versions
supabase migration list
```

### 1. Verify Table Exists

```sql
SELECT * FROM public.dashboard_summary_snapshots LIMIT 1;
```

Expected: Empty result (no rows yet), no errors

### 2. Verify RLS Enabled

```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'dashboard_summary_snapshots';
```

Expected: `relrowsecurity = true`

### 3. Test Edge Function Snapshot Write

Trigger a Hydrogen or Critical Minerals dashboard load with live edge fetch enabled. Verify:

```sql
SELECT dashboard_key, variant_key, snapshot_stored_at, source_label
FROM public.dashboard_summary_snapshots
ORDER BY snapshot_stored_at DESC
LIMIT 5;
```

Expected: Rows appear with `dashboard_key` values:
- `hydrogen_economy`
- `critical_minerals_supply_chain`

### 4. Test Fallback Read

Simulate edge function failure (e.g., by temporarily breaking the upstream URL) and verify:
- Dashboard loads from persisted snapshot
- UI shows "Persisted backend snapshot" notice
- Data provenance badge reflects fallback state

## Rollback Procedure

If issues arise, rollback is safe:

```sql
-- Remove table (data loss acceptable - fallback cache only)
DROP TABLE IF EXISTS public.dashboard_summary_snapshots;

-- Edge functions will gracefully degrade to browser-local cache only
```

## Monitoring

After deployment, monitor:

1. **Edge Function Logs**: Look for snapshot save/read operations
2. **Database**: Table growth rate (should stabilize after initial population)
3. **User Experience**: Dashboard load times in fallback scenarios

## Related Components

- **Edge Functions**:
  - `supabase/functions/api-v2-hydrogen-hub/index.ts`
  - `supabase/functions/api-v2-minerals-supply-chain/index.ts`

- **Frontend Components**:
  - `src/components/HydrogenEconomyDashboard.tsx`
  - `src/components/CriticalMineralsSupplyChainDashboard.tsx`

- **Shared Helper**:
  - `supabase/functions/_shared/dashboardSnapshots.ts`

## Troubleshooting

### Issue: Edge functions fail to save snapshots

**Symptoms**: No rows in `dashboard_summary_snapshots` after live loads

**Check**:
1. Edge function logs for errors
2. Database permissions (edge functions use service role, should bypass RLS)
3. Variant key generation (must be deterministic for lookup)

### Issue: Fallback not triggering on upstream failure

**Symptoms**: Dashboard shows error instead of persisted snapshot

**Check**:
1. Edge function error handling logic
2. Snapshot lookup query (variant_key must match exactly)
3. Frontend state handling for `snapshot_type === 'persisted_snapshot'`

## Completion Criteria

- [ ] Migration applied to production
- [ ] Table exists with correct schema
- [ ] RLS policy active
- [ ] Indexes created
- [ ] Edge functions writing snapshots successfully
- [ ] Fallback scenarios tested and working
- [ ] Monitoring in place

## Contact

For issues with this migration, refer to:
- Implementation PR: [Link to PR]
- Documentation: `/docs/delivery/scoreboard-provenance-tightening.md`
