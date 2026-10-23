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
| Current code-bearing proof | `5c883f1` / CI run `39987095875` |
| Current evidence-only HEAD proof | `4967b72` / CI run `39990265678`, all four jobs successful |
| Proof boundary | CI proves the committed repository; it does not prove a hosted migration or rollback |

The merged extension entries are a counting rule, not permission to discard
history. A fresh replay must record the merge explicitly.

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

The source-only tables reported without target equivalents are:

- `der_assets_summary`
- `energy_events`
- `onet_related_occupations`
- `smr_vendors`

For each table, the owner and data steward must choose `add-equivalent`,
`deprecated-with-evidence`, or `excluded-from-pilot-scope`. The choice must
include row counts, schema comparison, downstream callers, and rollback impact.

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
