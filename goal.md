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
> **Milestone status (2026-10-21):** bound HEAD `4f0348d` — CI run
> `39554044008` green (merge `8e81bbe`, artifact ID `12325836686`, digest
> `sha256:845cdcf0066fbed2ce345b4fd8ac06d6b2479f1edd43693975ca5884a1b2ed27`).
> The artifact manifest reports `complete:true`, `missing_files:[]`, nine
> hashed evidence files, and a valid manifest sidecar; job outcomes remain
> authoritative in the external GitHub run because the manifest records the
> honest `jobs: not-recorded` sentinel. Prior bound runs `39552477642` and
> `39550773406` remain historical evidence. The current local checkout has a
> tracked `coverage/lcov.info` deletion and is therefore not a clean local
> tree; the latest successful CI run is the bound committed-tree state.
> The audit-3 refutations are closed at the committed CI proof layer in this
> run: manifest declares
> `complete:true` with zero `missing_files`, `.sha256` sidecar verifies,
> the `Verify evidence completeness` gate is hard, CI exercises the documented
> synthetic environment, and inversion/JWT-fuzz/a11y-design suites run in CI.
> Independent clean-clone reproduction remains pending. WCAG evidence claims automated axe+reflow coverage only —
> manual 2.2 review stays open. Supabase project-ref discrepancy
> (`qnymb…` vs `cwij…`) is recorded owner-gated. (Historical baselines —
> `2cdc44b`, 1186-test, 80-browser, and prior run IDs — are superseded;
> see dated addenda.)

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
| P0 — Preservation and INC-001 owner separation | in progress | source | HEAD `4f0348d` | current CI tree bound; local `coverage/lcov.info` deletion preserved for classification | repo | owner resolves Supabase project identity + invalidates INC-001 | project-ref mismatch (qnymb… vs cwij…) and local dirty overlay remain |
| P1 — Current-tree addendum and evidence binding | in progress | source + bound CI | `4f0348d` | addendum 2026-10-21; run `39554044008`; merge `8e81bbe`; artifact `12325836686` | repo | retain current digest and external job outcomes | manifest is complete; `jobs` is explicitly not-recorded |
| P2 — Repository security and billing code | partial | local tests + committed CI | `4f0348d` | inversion + JWT-fuzz suites; secret scan in CI | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests + committed CI | `4f0348d` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests + committed CI | `4f0348d` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `4f0348d` | automated axe+reflow 110 cases ×5 engines (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `4f0348d` | run `39554044008`; manifest complete + self-hash sidecar; 177 files/1329 tests/22.55% lines | repo → CI | independent clean-clone reproduction and local lcov classification | local dependencies absent; tracked lcov deletion remains |
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
- The coverage threshold is set only from a passing full serial run; the current
  committed CI measurement is 22.55% lines, while the local lcov deletion is
  unresolved and must not be treated as a passing local coverage state.
