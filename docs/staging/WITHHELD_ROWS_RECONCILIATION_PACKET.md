# Withheld-rows reconciliation packet (template — 89 rows)

Source: `/tmp/ceip-target-migration-manifest-2026-10-23.json` —
41 null/invalid required fields, 48 missing FK parents
(6,797 of 6,886 accepted across 87 whitelisted tables).

## Per-table record (fill per affected table)

| Table | Class | Row count | Hashed row refs | Disposition | Owner |
|---|---|---|---|---|---|
| (table) | null-invalid / fk-absent | n | sha256(row-json)[:16] | exclude / fix-source / parent-add | name |

## Disposition rules (no fabrication)

- **null-invalid**: may fill ONLY from a deterministic sibling column
  in the same row; otherwise exclude.
- **fk-absent**: if parent is an excluded auth/lead/credential table,
  child is transitively excluded and recorded; if parent is reference
  data, the parent row may be added only with data-steward sign-off.
- Every excluded row gets a hashed reference — no PII in this file.

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Data steward | | | |
| Migration owner | | | |
