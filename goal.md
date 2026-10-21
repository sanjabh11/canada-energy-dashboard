# goal.md — CEIP controlled-pilot objective

> Bring CEIP to an evidence-backed controlled-pilot decision. Close
> repository-owned security, data-integrity, calculation, claims, quality,
> and evidence-packaging gaps; verify the exact final tree through
> reproducible tests and approved CI; preserve verified access for existing
> Whop customers while removing Whop acquisition and channel priority.
> Continue repository work while Supabase remains paused. Keep restoration,
> staging, production, and pilot blocked until INC-001 is invalidated, logs
> are reviewed, named owners approve their gates, and buyer evidence exists.
> Never infer closure from code presence or an unrun test.
>
> **Milestone status (2026-10-21):** HEAD `b1fc0da` — bound CI run
> `39541079913` green (merge `65a42671`, Git tree `def21810`, artifact
> digest `4e8bf9804df5d4c6f3aa13fc23593e4570a165460a15b73c659229ac8e0ee4e1`).
> Audit #3 then refuted evidence packaging (manifest hashed 9/10 files;
> `always()` upload permits partial artifacts) and flagged unreproduced
> clean-clone coverage, unproven assertion-inversion/JWT-fuzz assurance,
> a11y test-design gaps, and a Supabase project-ref discrepancy
> (`qnymbecjgeaoxsfphrti` in docs vs inactive `cwijcjhdugfqwsjbrdro` in the
> owner environment). Those are closed or documented below; WCAG evidence
> claims only automated axe/reflow coverage — manual 2.2 review stays open.
> (Historical baselines — `2cdc44b`, 1186-test, 80-browser, and prior run
> IDs — are superseded; see dated addenda.)

## Proof-layer definitions

| Layer | Meaning |
|---|---|
| implemented | Code/doc change exists in the working tree |
| locally-tested | Test/build/gate ran green on this tree |
| ci-verified | CI artifacts tied to this exact commit/tree |
| staging-verified | Verified against the hosted environment (blocked until owner gates) |
| owner-approved | Named owner signed off |
| buyer-validated | Pre-registered experiment produced the defined evidence |

A code change is not CI evidence; CI is not staging evidence; staging is not
owner approval or buyer validation.

## Phase tracking

| Phase | Status | Proof layer | Commit/tree ID | Artifact / run ID | Owner | Next checkpoint | Remaining risk |
|---|---|---|---|---|---|---|---|
| P0 — Preservation and INC-001 owner separation | in progress | source | HEAD `b1fc0da` | tree fingerprint recorded; WIP clean (0 dirty files at 2026-10-21) | repo | owner resolves Supabase project identity + invalidates INC-001 | project-ref mismatch (qnymb… vs cwij…) is owner-gated |
| P1 — Current-tree addendum and evidence binding | in progress | source + bound CI | `b1fc0da` | addendum 2026-10-21; run `39541079913`; merge `65a42671`; tree `def21810` | repo | rebind after manifest fix | prior runs superseded |
| P2 — Repository security and billing code | partial | local tests + committed CI | `b1fc0da` | inversion + JWT-fuzz suites (this pass); secret scan in CI | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests | `b1fc0da` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests | `b1fc0da` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `b1fc0da` | axe+reflow 105 tests ×5 engines (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `b1fc0da` | manifest completeness gate + self-hash sidecar (this pass); clean-clone synthetic env | repo → CI | next bound run proves completeness gate | reproduction pending next run |
| P8 — Supabase staging and named-owner approvals | blocked | — | — | — | owner | INC-001 + project identity + named approvals | all hosted evidence absent |
| P9 — Buyer validation | blocked | — | — | `.positioning-audit/experiments.json` (0/11) | owner | business decision | commercial readiness unverifiable |

Status values: `not started / in progress / blocked / complete`.
Proof-layer vocabulary: `source` < `local tests` < `committed CI` < `staging` < `owner approved` < `buyer validated`. A row may only move right when the artifact at that layer exists.

## Hard boundaries

- No buyer contact, no new checkout enablement, no project restore, no hosted
  migration, no staging/production deploy, no owner-gate approval by agents.
- INC-001 (`SUPABASE_SERVICE_ROLE_KEY` in public history, `0422accf`) remains
  an open owner action until key invalidation + log review, or project
  deletion on migration. See the incident register.
- The 45%→measured coverage threshold is set only from a passing full serial run.
