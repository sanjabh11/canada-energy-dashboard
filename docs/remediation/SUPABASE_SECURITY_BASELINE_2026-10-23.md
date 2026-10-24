# Replacement Supabase security baseline — 2026-10-23

This is a read-only control-plane snapshot for the replacement project
`qktgjpbifknqjpvrgkrj`. It is preparation evidence, not staging approval and
not proof that the project is safe to expose. No migration, policy change,
function deployment, secret change, or project-state change was performed by
this audit.

## Snapshot identity

| Field | Value |
|---|---|
| Project URL | `https://qktgjpbifknqjpvrgkrj.supabase.co` |
| Observation time | `2026-10-23T16:58:12.995Z` |
| Collection path | Supabase MCP read-only `get_advisors(type=security)` |
| Edge Functions | `0` reported by the read-only function inventory |
| Proof layer | external account observation; not CI, staging, or owner approval |

The counts below must be refreshed immediately before any owner-run staging
change. A later snapshot supersedes this one; it does not silently inherit its
dispositions.

## Findings observed

| Advisor finding | Level | Count | Required disposition |
|---|---:|---:|---|
| RLS enabled with no policy | INFO | 108 | Classify each table as explicitly deny-all, non-API, service-only, or intentionally public with a policy. No bulk policy is inferred from the count. |
| Security-definer views | ERROR | 26 | Review each view definition, owner, exposed columns and caller before changing ownership, exposure, or security mode. |
| Mutable function `search_path` | WARN | 42 | Review signatures and dependencies, then add a fixed search path or an equivalent safe qualification. |
| RLS disabled in `public` (`spatial_ref_sys`) | ERROR | 1 | Owner decides whether the extension-owned table is excluded from the API, moved, or protected with the supported extension-safe approach. |
| Extensions in `public` | WARN | 4 | Review PostGIS, cube, earthdistance and vector dependencies before any schema move. |
| Materialized views exposed through the API | WARN | 5 | Confirm whether each view is intended for public/authenticated reads; otherwise revoke API-facing grants. |
| Anonymous execution of security-definer functions | WARN | 11 signatures | Map every signature to a real caller. Revoke public execution unless a documented, tested client contract requires it. |
| Authenticated execution of security-definer functions | WARN | 11 signatures | Apply the same caller and privilege review for signed-in clients. |

Known signatures in the warning set include entitlement helpers, API usage and
rate-limit functions, the two `execute_readonly_sql` overloads, and PostGIS
`st_estimatedextent` overloads. The names alone do not authorize a revoke:
the source and deployed caller graph must be checked first.

## Required classification process

1. Export the current advisor result and the object definitions without
   credentials or user data.
2. Map every ERROR/WARN object to its migration, source caller, role grants,
   API exposure, and intended audience.
3. For each object, record one disposition: `fix-in-repo`, `owner-staging-fix`,
   `accepted-with-control`, or `not-applicable-with-evidence`.
4. Add a negative test for every changed privilege or exposure boundary.
5. Re-run the advisor after the owner applies the reviewed changes and retain
   the new timestamp and result. Never call the project advisor-clean while an
   ERROR remains unclassified.

## Stop conditions

- Do not apply a broad `REVOKE` or `ALTER ... SECURITY` change based only on
  the aggregate counts.
- Do not enable `SUPABASE_CRONS_LIVE` while the allowlisted functions are not
  deployed and smoke-tested.
- Do not treat the 108 INFO findings as harmless without table-level evidence.
- Do not restore or migrate the old project while INC-001 key invalidation,
  project identity, and log review remain open.

## Exit gate for staging consideration

Staging may be reconsidered only when every ERROR has a disposition and owner,
the affected grants and policies have been tested with anonymous,
authenticated, and service-role probes, Edge Functions are deployed from the
allowlist, synthetic-data retention and rollback checks pass, and the named
security/operations owners approve the resulting evidence. This document by
itself does not satisfy that gate.

## Refresh — 2026-10-24 read-only observation

The replacement project was queried again through the Supabase MCP on
`2026-10-24T04:26:36.985Z`. This refresh is an external observation of the
current target; it is not a migration, deployment, project-state change, or
owner approval. The original 2026-10-23 snapshot remains preserved above.

| Inventory | Current observation |
|---|---|
| Project URL | `https://qktgjpbifknqjpvrgkrj.supabase.co` |
| Public tables returned | 230 |
| Migration records returned | 123 (the repository has 122 active SQL files plus one intentionally disabled entry; the naming/counting difference is documented in the deviation ledger) |
| Edge Functions deployed | 0 |
| Security advisor result | 108 INFO, 26 ERROR, 42 WARN, 1 ERROR for RLS-disabled `spatial_ref_sys`, 4 extension warnings, 5 materialized-view warnings, 11 anonymous and 11 authenticated security-definer execution warnings |
| Mutation performed | None; read-only MCP calls only |

The refresh confirms that the aggregate security findings are still present and
must be classified at object level before any owner-run staging change. A
source-side caller map was also checked for the highest-risk objects:

The refreshed name comparison found six target-only names and six local-only
names. The six target names are represented by five active repository files
because the two extension records are intentionally merged; the local-only
`20250904_investment_tables.sql.disabled` entry is intentionally disabled. This
is a counting and naming reconciliation, not permission to skip a migration.
The owner-run pack must still compare SQL, applied order, and resulting object
state, then retain the mapping or formally deprecate it before hosted
verification. The full mapping is maintained in
`MIGRATION_DEVIATION_LEDGER.md`.

| Target object or class | Repository evidence | Disposition at this layer |
|---|---|---|
| `ccus_project_summary` | `supabase/functions/api-v2-ccus-projects/index.ts`; migration `20251113010_ccus_project_tracking.sql` | Keep caller and API exposure in the reviewed allowlist; owner-staging privilege probe required |
| `cross_border_trade_summary` | `supabase/functions/api-v2-cross-border-trade/index.ts`; migration `20251113008_cross_border_electricity_trade.sql` | Keep caller and API exposure in the reviewed allowlist; owner-staging privilege probe required |
| `transmission_congestion_summary` | `supabase/functions/api-v2-transmission-infrastructure/index.ts`; migration `20251113009_transmission_infrastructure.sql` | Keep caller and API exposure in the reviewed allowlist; owner-staging privilege probe required |
| `provincial_emissions_summary` | `supabase/functions/api-v2-carbon-emissions/index.ts`; migration `20251113007_carbon_emissions_tracking.sql` | Keep caller and API exposure in the reviewed allowlist; owner-staging privilege probe required |
| `smr_projects_summary`, `ieso_queue_summary`, `ieso_procurement_summary` | Migrations `20251113001_smr_nuclear_tracking.sql` and `20251113002_ieso_interconnection_queue.sql` | Migration-defined; complete deployed-caller and role-grant review before changing exposure |
| `check_api_rate_limit`, `get_database_stats`, `llm_rl_increment`, and related security-definer functions | `_shared/apiKeyAccess.ts`, `data-purge-cron`, `llm/llm_app.ts`, `scripts/sql/fix-llm-function.sql` and their defining migrations | Preserve only the tested server/function paths; owner-staging anonymous/authenticated execution probes required |

This mapping is preparation evidence, not a decision to revoke or alter any
object. No broad `REVOKE`, `ALTER FUNCTION`, view ownership change, or policy
change was issued. The zero-function inventory also means the function caller
map cannot be treated as deployed behavior until the owner deploys the
allowlisted functions and runs the staging pack.

## Object-level metadata refresh — 2026-10-24

Read-only SQL metadata queries were run through the Supabase MCP after the
advisor refresh. They inspected object names, owners, relation kinds, function
configuration and role-execution metadata only; no application rows or secrets
were selected.

### Views and materialized views

The target returned 28 ordinary public views and five public materialized
views. The advisor's 26 security-definer-view finding is treated as the
application-view subset; `geography_columns` and `geometry_columns` are owned
by `supabase_admin` and are extension-managed. The ordinary application-view
inventory is:

`active_rebate_programs_summary`, `badge_leaderboard`,
`capacity_auction_trends`, `capacity_resource_mix`,
`certificate_completion_stats`, `connector_freshness`,
`data_quality_summary`, `der_fleet_composition`, `ev_adoption_progress`,
`ev_charging_infrastructure_summary`, `grid_queue_summary_by_province`,
`grid_queue_technology_mix`, `grid_queue_timeline`, `grid_snapshots`,
`gtm_weekly_funnel_summary`, `heat_pump_adoption_summary`,
`ieso_procurement_summary`, `ieso_queue_summary`,
`minerals_geopolitical_risk_summary`, `renewable_penetration_by_province`,
`smr_projects_summary`, `user_tier_stats`, `v_indigenous_economic_summary`,
`v_indigenous_equity_summary`, `v_indigenous_iba_summary`, and
`vpp_platform_summary`.

The five materialized views are `ccus_project_summary`,
`cross_border_trade_summary`, `mv_llm_daily_spend`,
`provincial_emissions_summary`, and `transmission_congestion_summary`.
Their relation metadata reports `relrowsecurity=false`; exposure must therefore
be decided through explicit grants, API schema policy and caller evidence.

### Security-definer and execution metadata

The live metadata query returned 12 public security-definer signatures:

| Function class | Signatures | Current metadata | Required disposition |
|---|---|---|---|
| Application entitlement/usage helpers | `award_badge_if_eligible(uuid,text)`, `can_access_feature(uuid,text)`, `check_api_rate_limit(text)`, `get_user_tier(uuid)`, `increment_ai_queries(uuid)`, `record_api_usage(text,text)` | Owner `postgres`; anonymous and authenticated execution currently report `true`; no explicit function configuration | Map each to an actual server/function caller, add a fixed search path and least-privilege grants in a reviewed migration, then test anonymous/authenticated/service-role behavior |
| Read-only SQL overloads | `execute_readonly_sql(text)` and `execute_readonly_sql(text,integer)` | Owner `postgres`; anonymous and authenticated execution currently report `true`; `statement_timeout=30s` | Treat as high-risk dynamic SQL surface; prove whether the function is needed at all, then restrict or remove through owner-reviewed staging only |
| Migration helper | `rls_auto_enable()` | Owner `postgres`; anonymous and authenticated execution report `false`; `search_path=pg_catalog` | Preserve the non-public execution boundary; verify service-role migration use |
| PostGIS extension overloads | `st_estimatedextent(text,text)`, `st_estimatedextent(text,text,text)`, `st_estimatedextent(text,text,text,boolean)` | Owner `supabase_admin`; anonymous and authenticated execution currently report `true` | Extension-managed; do not alter blindly; owner classifies API exposure and supported extension-safe control |

The targeted function query found 40 `postgres`-owned public functions without
an explicit `search_path` configuration, while the advisor aggregate reports 42
mutable-search-path warnings. That two-item difference is retained as a
reconciliation item for the owner: compare the advisor's exact object list with
extension-managed objects before changing any function. This snapshot is not a
grant approval and does not close the security gate.
