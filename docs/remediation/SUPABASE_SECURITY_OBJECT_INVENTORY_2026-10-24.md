# Supabase security-object inventory — 2026-10-24

This is a read-only inventory of the replacement project
`qktgjpbifknqjpvrgkrj`. It is not a hosted remediation and does not authorize
revokes, ownership changes, function deployment, or project restoration.

## Snapshot

| Field | Value |
|---|---|
| Observation date | 2026-10-24 |
| Collection | Supabase MCP read-only SQL metadata and security-advisor snapshot |
| Public ordinary views | 28 total; 26 application-owned and 2 PostGIS extension-managed |
| Public materialized views | 5 |
| Security-definer view advisor count | 26 |
| Proof layer | external metadata observation; owner staging classification pending |

The two extension-managed views (`geography_columns` and `geometry_columns`)
are owned by `supabase_admin` and have no repository reference. They are kept
separate from the 26 application-owned views so an extension object is not
mistaken for an application object.

## Application-owned ordinary views

Every row needs a staging-time role/grant probe and an owner disposition. The
repository migration is provenance only; it does not prove the view is exposed
through PostgREST or used by a deployed function.

| View | Repository migration | Current disposition |
|---|---|---|
| `active_rebate_programs_summary` | `20251113006_heat_pump_deployment` | `PENDING_OWNER_CLASSIFICATION` |
| `badge_leaderboard` | `20251117_edubiz_tables` | `PENDING_OWNER_CLASSIFICATION` |
| `capacity_auction_trends` | `20251113003_capacity_market_tracking` | `PENDING_OWNER_CLASSIFICATION` |
| `capacity_resource_mix` | `20251113003_capacity_market_tracking` | `PENDING_OWNER_CLASSIFICATION` |
| `certificate_completion_stats` | `20251117_edubiz_tables` | `PENDING_OWNER_CLASSIFICATION` |
| `connector_freshness` | `20260820001_connector_freshness_truth`, `20260610002_connector_lineage` | `PENDING_OWNER_CLASSIFICATION` |
| `data_quality_summary` | `20251014007_add_data_provenance` | `PENDING_OWNER_CLASSIFICATION` |
| `der_fleet_composition` | `20251113005_vpp_der_aggregation` | `PENDING_OWNER_CLASSIFICATION` |
| `ev_adoption_progress` | `20251113004_ev_charging_infrastructure` | `PENDING_OWNER_CLASSIFICATION` |
| `ev_charging_infrastructure_summary` | `20251113004_ev_charging_infrastructure` | `PENDING_OWNER_CLASSIFICATION` |
| `grid_queue_summary_by_province` | `20251112004_grid_queue_tracker` | `PENDING_OWNER_CLASSIFICATION` |
| `grid_queue_technology_mix` | `20251112004_grid_queue_tracker` | `PENDING_OWNER_CLASSIFICATION` |
| `grid_queue_timeline` | `20251112004_grid_queue_tracker` | `PENDING_OWNER_CLASSIFICATION` |
| `grid_snapshots` | `20251013001_create_views`, `20251012001_comprehensive_fixes`, `20251014002_update_grid_snapshots` | `PENDING_OWNER_CLASSIFICATION` |
| `gtm_weekly_funnel_summary` | `20260303001_gtm_pipeline_entities` | `PENDING_OWNER_CLASSIFICATION` |
| `heat_pump_adoption_summary` | `20251113006_heat_pump_deployment` | `PENDING_OWNER_CLASSIFICATION` |
| `ieso_procurement_summary` | `20251113002_ieso_interconnection_queue`, `20251120010_stage2_rls_and_api_usage` | `PENDING_OWNER_CLASSIFICATION` |
| `ieso_queue_summary` | `20251113002_ieso_interconnection_queue`, `20251120010_stage2_rls_and_api_usage` | `PENDING_OWNER_CLASSIFICATION` |
| `minerals_geopolitical_risk_summary` | `20251112007_minerals_geopolitical_risk` | `PENDING_OWNER_CLASSIFICATION` |
| `renewable_penetration_by_province` | `20251011002_add_fuel_type_breakdown` | `PENDING_OWNER_CLASSIFICATION` |
| `smr_projects_summary` | `20251113001_smr_nuclear_tracking` | `PENDING_OWNER_CLASSIFICATION` |
| `user_tier_stats` | `20251117_edubiz_tables` | `PENDING_OWNER_CLASSIFICATION` |
| `v_indigenous_economic_summary` | `20251112002_indigenous_equity_enhancement` | `PENDING_OWNER_CLASSIFICATION` |
| `v_indigenous_equity_summary` | `20251112002_indigenous_equity_enhancement` | `PENDING_OWNER_CLASSIFICATION` |
| `v_indigenous_iba_summary` | `20251112002_indigenous_equity_enhancement` | `PENDING_OWNER_CLASSIFICATION` |
| `vpp_platform_summary` | `20251113005_vpp_der_aggregation` | `PENDING_OWNER_CLASSIFICATION` |

## Materialized views exposed in `public`

| Materialized view | Repository caller/provenance found | Current disposition |
|---|---|---|
| `ccus_project_summary` | `supabase/functions/api-v2-ccus-projects`, `20251113010_ccus_project_tracking` | `PENDING_OWNER_CLASSIFICATION` |
| `cross_border_trade_summary` | `supabase/functions/api-v2-cross-border-trade`, `20251113008_cross_border_electricity_trade` | `PENDING_OWNER_CLASSIFICATION` |
| `mv_llm_daily_spend` | LLM usage migrations/functions | `PENDING_OWNER_CLASSIFICATION` |
| `provincial_emissions_summary` | `supabase/functions/api-v2-carbon-emissions`, `20251113007_carbon_emissions_tracking` | `PENDING_OWNER_CLASSIFICATION` |
| `transmission_congestion_summary` | `supabase/functions/api-v2-transmission-infrastructure`, `20251113009_transmission_infrastructure` | `PENDING_OWNER_CLASSIFICATION` |

## Required owner staging packet

For each row above, the owner must record:

1. exact owner and security mode;
2. anonymous, authenticated, and service-role grants;
3. API exposure and every deployed caller;
4. data classification and whether the view is in pilot scope;
5. one disposition: `fix-in-repo`, `owner-staging-fix`,
   `accepted-with-control`, or `not-applicable-with-evidence`;
6. a negative or positive role probe and rollback consequence.

The 26 application view rows, five materialized-view rows, and advisor counts
must reconcile after the owner refreshes the security advisor. No aggregate
“advisor clean” statement is valid while a row is unclassified.
