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
