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
> **Milestone status (2026-10-21):** bound HEAD `edc4163` — CI run
> `39638728096` green on pinned `ubuntu-24.04`. Code-bound run `39634936628`
> on `69e182f` also green (merge `65a7658f`, artifact `12363351105`, digest
> `sha256:a85dae2d074293e0c18a140cd7e8c7b6a6b60cc17faee4cc291320fcd9e57bdb`).
> This run includes the settled-layout reflow measurement and driver-chain
> diagnostics; prior bound run `39628050850` on `947bbfe` (merge `758cecc1`,
> artifact `12358059140`, digest `845cdcf0…`).
> This run binds the audit-session overlay commits (`ad444941`…`f12accc`)
> and the structural WebKit reflow fixes; the audit-3 refutations are closed
> at the committed CI proof layer (manifest `complete:true`, `missing_files:[]`,
> sidecar verified, hard `Verify evidence completeness` gate, synthetic-env
> coverage reproduction, inversion/JWT-fuzz/a11y-design suites in CI).
> The scans the audit environment could not run (client-env, hygiene,
> secret scan) pass locally on this tree. `coverage/lcov.info` remains
> deleted locally by owner decision. The `ubuntu-latest`→26.04 migration
> broke the previous run's browser install; the image is now pinned.
> Prior bound runs (`39554044008`/`4f0348d`, `39552477642`/`e7a5f81`,
> `39550773406`/`caadfc5`) remain historical evidence. Any later commit is
> docs-only; the latest successful branch run is authoritative.
> WCAG evidence claims automated axe+reflow coverage only —
> manual 2.2 review stays open. Supabase project-ref discrepancy
> (`qnymb…` vs `cwij…`) is recorded owner-gated. (Historical baselines —
> `2cdc44b`, 1186-test, 80-browser, and prior run IDs — are superseded;
> see dated addenda.)
>
> **Current checkout overlay:** the checkout contains a documentation-only
> descendant of the CI-bound parent. Its own CI run (`39638728096` on
> `edc4163`) is green — every commit on the branch is bound. The tracked
> `coverage/lcov.info` deletion remains in the local overlay and is preserved
> for classification; no reset or restoration was performed.
>
> **Source remediation — now CI-bound:** commit `ad44494` (test-only
> child-process warning isolation) is bound by run `39638728096` on `edc4163`
> (all 3 jobs green); its push succeeded after the execution-guard block was
> lifted here. The guard-blocked scans (client-env 2272 surfaces, repo
> hygiene, secret scan — HEAD clean, documented INC history only) were
> executed directly and pass on this tree.

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
| P0 — Preservation and INC-001 owner separation | in progress | source | docs-only overlay / CI parent `4f0348d` | current CI tree bound; local `coverage/lcov.info` deletion preserved for classification | repo | owner resolves Supabase project identity + invalidates INC-001 | project-ref mismatch (qnymb… vs cwij…) and local dirty overlay remain |
| P1 — Current-tree addendum and evidence binding | in progress | source + bound CI | docs-only overlay; CI parent `4f0348d` | addendum 2026-10-21; run `39554044008`; merge `8e81bbe`; artifact `12325836686` | repo | retain current digest and external job outcomes | manifest is complete; `jobs` is explicitly not-recorded; overlay has no new CI run |
| P2 — Repository security and billing code | partial | local tests + committed CI | `edc4163` (contains `ad44494`) | inversion + JWT-fuzz suites; secret scan in CI; exact-commit clean-clone + CI-bound | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests + committed CI | `4f0348d` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests + committed CI | `4f0348d` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `4f0348d` | automated axe+reflow 110 cases ×5 engines (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `edc4163` | run `39638728096` green; manifest complete + self-hash sidecar; exact-commit clean clone 177/1329, 22.55%, floors pass, lcov `a2f8b08b…`; focused assurance 50/50 | repo → CI | retain clean-clone lcov; hosted staging | tracked lcov deletion remains local; scans verified green |
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
