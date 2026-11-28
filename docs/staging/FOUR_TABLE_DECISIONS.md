# Four source-only tables — decision record

Backup contains all four (valid gzip SQL). None has a repo migration —
they were out-of-band console objects on the old project.

| Table | Repo code evidence | Recommended | Steward |
|---|---|---|---|
| `der_assets_summary` | Only as `api-v2-vpp-platforms` **response shape** (index.ts:74); dashboard reads `data.der_assets_summary`; no `.from()` query, no migration | Exclude — function recomputes payload | pending |
| `energy_events` | none in live code | Exclude | pending |
| `onet_related_occupations` | none in live code | Exclude | pending |
| `smr_vendors` | none in live code | Exclude | pending |

Reversal rule: if steward confirms a table fed the function or a view,
create a repo migration for it instead — do not import without one.
