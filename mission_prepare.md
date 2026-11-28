# mission_prepare.md — CEIP controlled-pilot decision contract

## Decision question

**Can this exact worktree move from local remediation to owner-run
controlled-pilot staging?**

## Proof layers (never collapse these)

`implemented → locally-tested → CI-verified → staging-verified →
owner-approved → buyer-validated`

A code change is not CI evidence; CI is not staging evidence; staging is not
owner approval or buyer validation. A stale artifact or a test definition
without a run is **UNVERIFIED**.

## Current state (as of addendum `docs/remediation/CEIP_AUDIT_ADDENDUM_2026-10-08B.md`)

| Layer | State |
|---|---|
| Repository implementation | locally complete for audited items — tree fingerprint `scripts/tree-fingerprint.mjs` (tracked + untracked contents) |
| CI verification | all 5 Playwright projects + `ci-evidence-manifest.json` artifact binding wired; **no committed-tree run yet** (needs authorized commit/PR) |
| Staging | **BLOCKED** — Supabase paused, INC-001 open, hosted RLS/migrations unverified |
| Owner approvals | **BLOCKED** — INC-001 invalidation + log review, privacy/CASL, billing, ops |
| Buyer validation | **BLOCKED** — 0/11 pre-registered experiments executed |

## Hard boundaries

- No deploy, no checkout enablement, no buyer contact, no project restore,
  no hosted migration — all owner-gated.
- `.env*` untracked owner-managed, mode 600 — never read or print.
- Preserve the dirty worktree; never `git reset`/`clean`.

## Gate sequence to staging

1. Authorized commit/PR of the reviewed tree → CI run bound to commit SHA.
2. Owner invalidates INC-001 legacy `service_role` key + reviews access logs
   (a replacement key alone does NOT revoke the legacy key).
3. Owner selects active destination; applies reviewed migrations before
   intake deploy; verifies RLS + synthetic intake + rate limits + privacy
   notice + Whop existing-member journey + disabled checkout + redacted
   logs + rollback.
4. CASL/business owner approves outreach basis; the 11 pre-registered
   priced experiments run through the human buyer owner.
5. `continue/pivot/stop` decision recorded with evidence.

## Canonical references

- `goal.md` — phase tracking + proof-layer table
- `docs/security/SECRET_EXPOSURE_INCIDENTS.md` — incident register (metadata-only commands)
- `docs/remediation/CEIP_AUDIT_ADDENDUM_2026-10-07.md`,
  `CEIP_AUDIT_ADDENDUM_2026-10-08.md`, `CEIP_AUDIT_ADDENDUM_2026-10-08B.md` —
  dated implementation records
- `AGENTS.md` — working rules + verification ladder
