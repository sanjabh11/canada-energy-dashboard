# goal.md — CEIP controlled-pilot objective

> Bring CEIP to an evidence-backed controlled-pilot decision. Close
> repository-owned security, data-integrity, calculation, claims and quality
> gaps; verify the exact final tree through reproducible tests and approved
> CI; preserve verified access for existing Whop customers while removing
> Whop acquisition, listing promotion and channel priority. Continue
> repository work while the Supabase project is paused. Keep project
> restoration, staging and pilot blocked until the owner has invalidated the
> exposed INC-001 key and reviewed relevant logs, and named privacy, legal,
> billing, dependency, operations and business owners complete their gates.
> Never infer closure from code presence or an unrun test; tie every status
> to its required evidence layer.
>
> **Immediate milestone (2026-10-08 audit):** close the remaining
> repository-owned Whop authorization, billing-disable, suppression,
> secret-handling documentation, and evidence-binding defects. Require a
> committed-tree CI run and a demonstrated existing-member journey before
> requesting owner-run staging. All hosted and buyer gates stay blocked while
> INC-001 is open and the Supabase project is paused.

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
| P0 — Preserve tree and separate incident gate | in progress | source | HEAD `2cdc44b` + dirty tree | `.remediation-snapshots/` manifest; `/tmp` archive absent — filtered recovery unverified | repo | inventory non-secret WIP and test isolated recovery | INC-001 rotation/migration is owner-gated |
| P1 — Goal and exact-tree evidence | in progress | source + local runs | `node scripts/tree-fingerprint.mjs` (hashes untracked contents too) | Oct 6 + Oct 7 + Oct 8 addenda | repo | ~~commit reviewed phase → bind CI run~~ done: CI run `39425067455` green on `aeae26a` (PR #50) | CI binding obtained |
| P2 — Security, access and dependencies | in progress | local tests | dirty tree | PGlite allow→deny test; `whop-verify-access` product-ID-scoped rewrite (this pass); `auth-session` verified chain; secret-scan in CI | repo | hosted RLS + contract verification | `/v5/me` unconfirmed; hosted denial owner-gated |
| P3 — Economics, currency and methane | in progress | local tests | dirty tree | `tierPricing` provenance + `stale_inputs`; allocator `available`-only; screening-labeled landfill | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop and claims | in progress | local tests | dirty tree | claims swept from `whop-mini/`; Top20/COMMERCIAL_STATUS qualified; checker 430 files | repo | deployed copy + membership-route integration test | deployed copy unverified |
| P5 — Outreach readiness | in progress | local tests | dirty tree | canonical `SUPPRESSION_REGISTRY_LIVE.csv` required by all tools (this pass); cross-dir opt-out test | repo → human | CASL owner sign-off | 0/11 experiments |
| P6 — Product quality and governance | in progress | local tests | dirty tree | content-hash parity; server-path critical coverage floors in CI | repo | WCAG 2.2 AA + perf audit; 29-dim evidence links | shallow dimensions remain |
| P7 — Full-suite and exact-tree verification | in progress | committed CI | `aeae26a` | 1186/1186 local; CI run `39425067455` all jobs green — Phase 0/6/wedge across all 5 projects + WCAG spec in CI + tree-bound `ci-evidence-manifest.json` uploaded | repo → CI | staging run | committed-tree CI bound; staging owner-gated |
| P8 — Owner-run staging | blocked | — | — | — | owner | INC-001 + named approvals | all hosted evidence absent |
| P9 — Human buyer experiments | blocked | — | — | `.positioning-audit/experiments.json` (0/11; WTP fields now declared) | owner | business decision | commercial readiness unverifiable |

Status values: `not started / in progress / blocked / complete`.
Proof-layer vocabulary: `source` < `local tests` < `committed CI` < `staging` < `owner approved` < `buyer validated`. A row may only move right when the artifact at that layer exists.

## Hard boundaries

- No buyer contact, no new checkout enablement, no project restore, no hosted
  migration, no staging/production deploy, no owner-gate approval by agents.
- INC-001 (`SUPABASE_SERVICE_ROLE_KEY` in public history, `0422accf`) remains
  an open owner action until key invalidation + log review, or project
  deletion on migration. See the incident register.
- The 45%→measured coverage threshold is set only from a passing full serial run.
