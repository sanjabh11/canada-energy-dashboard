# CEIP migration and data deviation ledger

This ledger separates repository replay evidence from hosted migration proof.
It is a planning and reconciliation artifact; it does not authorize a
Supabase migration or claim that the replacement project is pilot-ready.

## Identity and counting rule

| Item | Current record |
|---|---|
| Repository migration directory | 122 active `.sql` files plus one `.disabled` file = 123 directory entries |
| Replacement-project ledger | 123 target records reported during the owner-led replay |
| Replay relationship | 117 repository migration names replayed plus six target-only entries |
| Ported repository migrations | Five files cover six target entries because the two extension entries are intentionally merged |
| Latest exact-head source/documentation subject | `389dad3` / CI run `40073506314`, all four jobs successful |
| Current local tree | Unpushed evidence/migration descendant after `389dad3` plus intentional D/?? overlay files; own remote CI receipt pending |
| Current artifact receipt | `12551764380`, GitHub digest `sha256:036865d5043db63b545b6b80ec73dbc9e01bc6dd663dd26632e7eb8541a6a9f4` |
| Proof boundary | CI proves the committed repository; it does not prove a hosted migration or rollback |

The predecessor ledger recorded **exact CI receipt pending** for this lane;
that wording is historical and is superseded by the exact-head receipt above.

The merged extension entries are a counting rule, not permission to discard
history. A fresh replay must record the merge explicitly.

## Target-name reconciliation — 2026-10-24 read-only comparison

The replacement project returned 123 migration records through the Supabase
MCP. The repository contains 122 active SQL migrations and one intentionally
disabled SQL entry. Comparing target names with repository basenames produced
the following six-to-six difference set:

| Target migration name | Repository representation | Reconciliation |
|---|---|---|
| `20261023_harden_rls_auto_enable_api_acl` | `20261023001_harden_rls_auto_enable_api_acl.sql` | Same reviewed change; timestamp/name normalized locally |
| `20250927_fix_weather_data_primary_key` | `20250926001_fix_weather_data_primary_key.sql` | Same reviewed change; timestamp/name normalized locally |
| `20261023_enable_cube_for_earthdistance` | `20251112008_enable_cube_earthdistance.sql` | Intentionally merged with the next target entry |
| `20261023_enable_earthdistance_for_ev` | `20251112008_enable_cube_earthdistance.sql` | Intentionally merged with the preceding target entry |
| `20261023_create_provinces_reference` | `20251112009_create_provinces_reference.sql` | Same reviewed change; timestamp/name normalized locally |
| `20261023_revoke_legacy_public_lead_writes` | `20261023002_revoke_legacy_public_lead_writes.sql` | Same reviewed change; timestamp/name normalized locally |

The only repository-only basename is
`20250904_investment_tables.sql.disabled`; it is not active and is retained as
historical evidence. This comparison resolves the count/name discrepancy at
the repository evidence layer. It does not prove SQL equivalence, applied
order, resulting object state, or rollback; those remain owner-run staging
checks.

## Target-only entries ported

| Target entry | Repository representation | Status |
|---|---|---|
| `20250927_fix_weather_data_primary_key` | `20250926001_fix_weather_data_primary_key.sql` | Ported; ordering and deterministic `ctid` tie-break are documented |
| `20261023_enable_cube_for_earthdistance` | `20251112008_enable_cube_earthdistance.sql` | Ported as a merged extension migration |
| `20261023_enable_earthdistance_for_ev` | `20251112008_enable_cube_earthdistance.sql` | Ported as a merged extension migration |
| `20261023_create_provinces_reference` | `20251112009_create_provinces_reference.sql` | Ported |
| `20261023_harden_rls_auto_enable_api_acl` | `20261023001_harden_rls_auto_enable_api_acl.sql` | Ported; public execution is restricted |
| `20261023_revoke_legacy_public_lead_writes` | `20261023002_revoke_legacy_public_lead_writes.sql` | Ported; public/anonymous lead writes are revoked |

## Non-ported replay differences

These are non-destructive replays of defective or alternate source files. They
must remain visible until a fresh replay proves equivalence or an owner accepts
the target state.

| Source replay | Current treatment | Required next proof |
|---|---|---|
| 20250927 policy / `ON CONFLICT` rewrites | Not ported | Compare policy and conflict semantics against the target |
| `innovations.name` backfill | Not ported | Decide whether the source data or target schema is authoritative |
| `20251009005` idempotent replay | Not ported | Replay in an isolated database and retain the result |
| `20251010004` ordered replay | Not ported | Verify dependency ordering and resulting object state |
| `20251010007` alternate weather schema | Recorded no-op | Confirm no target object or data depends on the alternate shape |
| `20251012001` adapted index/defaults | Not ported | Compare query and constraint behavior |
| `20251013001` non-destructive view replay | Not ported | Compare view definitions and security exposure |
| `20251014005` and clear-mock no-ops | Recorded no-op | Keep as historical replay evidence; do not invent replacement rows |

## Data reconciliation

The owner-led import record reports **6,797 accepted rows across 87
whitelisted public tables** and **89 withheld rows**. The withheld set is not
closed:

| Withheld reason | Count | Required disposition |
|---|---:|---|
| Null or invalid required fields | 41 | Identify table/row, repair source data or formally exclude with rationale |
| Missing foreign-key parent | 48 | Identify parent dependency, restore the parent or formally exclude |
| **Total** | **89** | No fabricated values and no silent drop |

The source-only tables reported without target equivalents are present in the
owner-provided old-project dump, but are absent from the replacement target.
The metadata-only dump inventory and caller review support a bounded
`excluded-from-pilot-scope` recommendation; this is not an owner/data-steward
approval and does not delete or overwrite the source data.

- `der_assets_summary`
- `energy_events`
- `onet_related_occupations`
- `smr_vendors`

For each table, the owner and data steward must choose `add-equivalent`,
`deprecated-with-evidence`, or `excluded-from-pilot-scope`. The choice must
include row counts, schema comparison, downstream callers, and rollback impact.

### Row-level register status

The repository contains the aggregate import result but no row-level rejection
manifest. Therefore the 89 rows cannot be safely enumerated from source code or
from the compressed backup without risking accidental exposure of imported
data. They remain `NOT_REPLAYED` rather than being inferred from counts.

The owner-run reconciliation packet must provide one record per withheld row
using a stable non-secret row identifier (for example, a keyed hash of the
source primary key), source table, reason code, required field or missing
parent relation, proposed disposition, evidence reference, and rollback
consequence. Values must come from the importer/export owner; no agent may
fabricate missing fields or copy raw personal/facility data into this ledger.

| Reason group | Required row-level artifact | Current status |
|---|---|---|
| 41 null/invalid required fields | Redacted row manifest plus source-quality repair or formal exclusion decision | `PENDING_OWNER_DATA_PACKET` |
| 48 missing foreign-key parents | Redacted row manifest plus parent restore, dependency exclusion, or schema decision | `PENDING_OWNER_DATA_PACKET` |

The four source-only tables also remain explicitly unresolved until the data
steward records one of the three allowed dispositions:

The earlier `PENDING_DATA_STEWARD` state is retained as the historical
pre-decision label; the current rows below are recommendations, not owner
approval.

| Source table | Required decision evidence | Current status |
|---|---|---|
| `der_assets_summary` | Old dump: 4 rows, 4 columns; no `.from()` caller; API response shape only; schema SHA-256 `6555e869…` | `RECOMMENDED_EXCLUDE_PILOT_SCOPE` — owner confirmation required |
| `energy_events` | Old dump: 37,409 rows, 13 columns; no application caller; schema SHA-256 `6bea3d4d…` | `RECOMMENDED_EXCLUDE_PILOT_SCOPE` — owner confirmation required |
| `onet_related_occupations` | Old dump: 42 rows, 9 columns; no application caller; schema SHA-256 `c0fe0df1…` | `RECOMMENDED_EXCLUDE_PILOT_SCOPE` — owner confirmation required |
| `smr_vendors` | Old dump: 5 rows, 13 columns; no application caller; schema SHA-256 `cec20bdb…` | `RECOMMENDED_EXCLUDE_PILOT_SCOPE` — owner confirmation required |

A read-only target metadata query on 2026-10-24 returned no public tables with
any of these four names. The old dump was verified as a valid gzip SQL stream
(SHA-256 `b1addd8f…`) and inspected without printing row values. The source
caller search found only the `der_assets_summary` response-shape field in
`api-v2-vpp-platforms`; it does not query a table. This supports the scoped
exclusion recommendation above, while the data steward still owns the final
disposition and rollback consequence.

## Backup and artifact rule

The working-tree files `data.sql`, `roles.sql`, and `schema.sql` are zero-byte
placeholders. They are not backups and must never be presented as recovery
evidence. A valid backup packet needs non-empty exports or an owner-approved
Supabase backup/PITR receipt, SHA-256 hashes, a separate restore test, and a
record of what was intentionally excluded.

## Completion gate

This ledger is complete only when every replay difference, withheld row group,
and source-only table has a named disposition, evidence link, owner, and
rollback consequence. Repository replay completion still does not prove hosted
RLS, function deployment, Storage transfer, restore, or pilot readiness.
