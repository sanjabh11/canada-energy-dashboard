# Deploy Verification: Dashboard Summary Snapshots

Use this checklist after the migration and edge-function deploys land in the target Supabase project.

## One-Command Verification

Run the repo script after exporting the required Supabase env vars:

```bash
pnpm run verify:migration-versions
export SUPABASE_DB_URL='postgresql://...'
export SUPABASE_URL='https://<project-ref>.supabase.co'
export SUPABASE_ANON_KEY='...'
export CEIP_VERIFICATION_FALLBACK_TOKEN='...same token used in the target edge-function env...'
pnpm run verify:dashboard-snapshots
```

The script will:
- run the migration/schema SQL checks through `psql`
- verify anon REST read/write behavior
- call Hydrogen and Critical Minerals live endpoints
- force the persisted-snapshot fallback path with the verification token

Run `pnpm run verify:migration-versions` first. If it fails, do not repair or push remote migrations until the local migration prefixes are unique again.

## Migration History Gate

- [ ] `pnpm run verify:migration-versions` passes locally.
- [ ] `supabase migration list` has been reviewed after upgrading the Supabase CLI.
- [ ] Any unmatched legacy umbrella versions have been repaired before `supabase db push --include-all`.

### Post-Upgrade Repair Sequence

After upgrading the Supabase CLI, use this exact sequence with the currently observed migration history:

```bash
pnpm run verify:migration-versions
supabase migration list
supabase migration repair --status reverted 20250104 20250925 20251009 20251010
supabase migration list
supabase db push --include-all
```

If `supabase migration list` still shows a legacy umbrella version on the remote side that has been replaced by split local files, repair only that specific remote version before retrying the push.

## Phase 1. Migration

- [ ] `public.dashboard_summary_snapshots` exists.
- [ ] Columns are present:
  - [ ] `dashboard_key`
  - [ ] `variant_key`
  - [ ] `summary_payload`
  - [ ] `source_label`
  - [ ] `source_updated_at`
  - [ ] `snapshot_stored_at`
  - [ ] `is_partial`
  - [ ] `notes`
  - [ ] `created_at`
  - [ ] `updated_at`
- [ ] Primary key is `(dashboard_key, variant_key)`.
- [ ] Indexes exist on:
  - [ ] `dashboard_key`
  - [ ] `snapshot_stored_at`
- [ ] `updated_at` trigger is installed and updates on write.

## Phase 2. RLS

- [ ] `anon` can `SELECT` from `dashboard_summary_snapshots`.
- [ ] `anon` cannot `INSERT`.
- [ ] `anon` cannot `UPDATE`.
- [ ] `anon` cannot `DELETE`.
- [ ] `authenticated` can `SELECT`.
- [ ] `authenticated` cannot `INSERT`, `UPDATE`, or `DELETE`.
- [ ] `service_role` can write snapshots.

## Phase 3. Snapshot Save

- [ ] Successful Hydrogen live response persists a row for `dashboard_key = hydrogen_economy`.
- [ ] Successful Critical Minerals live response persists a row for `dashboard_key = critical_minerals_supply_chain`.
- [ ] `variant_key` changes with the selected filters.
- [ ] `snapshot_payload` contains the same summary response returned by the edge function.
- [ ] `source_label` and `source_updated_at` are populated.

## Phase 4. Snapshot Load

- [ ] Force Hydrogen upstream failure and confirm the response returns `snapshot_type = persisted_snapshot`.
- [ ] Force Critical Minerals upstream failure and confirm the response returns `snapshot_type = persisted_snapshot`.
- [ ] Confirm the fallback response includes `snapshot_stored_at`.
- [ ] Confirm the fallback response preserves the original dashboard data source label.

## Phase 5. Browser Cache Precedence

- [ ] With live data available, dashboards render as `live`.
- [ ] With live failure and persisted snapshot available, dashboards render as `persisted_snapshot`.
- [ ] With live failure and no backend snapshot but browser cache present, dashboards render as `browser_cache`.
- [ ] With no live data, no backend snapshot, and no browser cache, dashboards render as `unavailable`.
- [ ] Browser cache never impersonates a backend persisted snapshot.

## Phase 6. Browser Routes

- [ ] `/hydrogen` loads successfully.
- [ ] `/hydrogen-economy` loads successfully.
- [ ] `/critical-minerals` loads successfully.
- [ ] `/minerals` loads successfully.
- [ ] `/ai-data-centre` loads successfully.

## Phase 7. UI Truthfulness

- [ ] Hydrogen shows a persisted-snapshot banner when fallback is used.
- [ ] Critical Minerals shows a persisted-snapshot banner when fallback is used.
- [ ] AI Data Centre does not present seeded demo rows as live data.
- [ ] Metric badges match the actual freshness state.
- [ ] No dashboard claims “live” when the rendered state is snapshot-backed or browser-cached.

## Phase 8. Final Gates

- [ ] `pnpm vitest run` passes.
- [ ] `pnpm run build` passes.
- [ ] `pnpm exec playwright test tests/component/browser-provenance.spec.ts --project=chromium` passes.
- [ ] `pnpm exec playwright test tests/component/foundation-phase0.spec.ts --project=chromium` passes.
- [ ] Target project rollback steps are documented and understood before deploy.
