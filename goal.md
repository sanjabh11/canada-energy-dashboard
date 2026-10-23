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
> **Milestone status (2026-10-23):** bound HEAD `5c883f1` — CI run
> `39987095875` on pinned `ubuntu-24.04` — `head_sha` exact; **all four
> jobs green** including `evidence-binding` (the intermediate commits
> `9cb343e..b1e5d98` are covered inside this bound source, so no
> staleness signal fired); run conclusion `success`
> (merge `97bef02b`, artifact `12517835140`, digest
> `sha256:1b6e7bc2cc9282fe3f246fbfc5297b186e08911fea2a94b44f7f6b50df4b973f`;
> manifest `complete:true`, sidecar verified). Chain: `e239699` →
> `2f1b88d`/`a86f1f8`/`cc3ff23` (evidence-only) → `fb5cddd`/`aa6d8d5`
> (code, covered inside this bound source) → `5c883f1` bound.
> Two-state binding contract:
> the bound source requires a run whose `headSha` equals it with all
> verification jobs green; descendants after it may touch only the
> evidence-file allowlist, except the current run head which self-binds.
> The `evidence-binding` job's red is a staleness signal, never a code
> verdict. Machine check:
> `node scripts/check-evidence-binding.mjs`. Externally auditor-verified run
> `39641749404` on `10ab812` (merge `d36e88f2`, artifact `12365798216`,
> digest `sha256:7e77cc63…`, tree fingerprint `494227ce…`, manifest hash
> `a7557cbf…`; Phase0 35/35, Phase6 80/80, wedge 80/80, a11y 110/110).
> Clean-clone reproduction at `42d4e2d`: 177/177 files, 1329/1329 tests,
> 22.37% lines (expected nondeterminism vs CI 22.55%), lcov `f7364e6c…`,
> a11y 110/110 ×5 engines.
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
> docs-only; binding rule: the run whose `headSha` equals a commit
> binds that commit — no older run is proof for a newer HEAD.
> Latest CI-tested documentation descendant: `0550c29` — run
> `39777254650`, artifact `12425598211`, GitHub digest
> `sha256:93f00e9745d615cece0a16a6502a00aa6d1d1a5422735d92d15967f774ea74b4`.
> The artifact manifest is complete, its sidecar and nine internal evidence
> file hashes verify, and browser results are 35/80/80/110 with zero
> unexpected, flaky, or skipped cases. This is the latest source/CI receipt;
> later evidence-only document commits do not change the code-binding source.
> WCAG evidence claims automated axe+reflow coverage only —
> manual 2.2 review stays open. Supabase project-ref discrepancy
> (`qnymb…` vs `cwij…`) is recorded owner-gated. (Historical baselines —
> `2cdc44b`, 1186-test, 80-browser, and prior run IDs — are superseded;
> see dated addenda.)
>
> **Current checkout overlay:** the checkout contains the CI-tested
> documentation descendant `0550c29` and any later evidence-only document
> overlay. Run `39777254650` covered `0550c29` with all four jobs green; the
> tracked `coverage/lcov.info` deletion remains in the local overlay and is
> preserved for classification. No reset or restoration was performed.
>
> **Source remediation — now CI-bound:** commit `ad44494` (test-only
> child-process warning isolation) is bound by run `39987095875` on `5c883f1`
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
| P0 — Preservation and INC-001 owner separation | in progress | source | docs-only overlay; bound HEAD `5c883f1` | current CI tree bound; local `coverage/lcov.info` deletion preserved for classification | repo | owner resolves Supabase project identity + invalidates INC-001 | project-ref mismatch (qnymb… vs cwij…) and local dirty overlay remain |
| P1 — Current-tree addendum and evidence binding | in progress | source + bound CI | bound source `5c883f1`; latest tested docs descendant `0550c29` | addendum 2026-10-23; runs `39987095875` / `39777254650`; artifact `12425598211` | repo | retain current digest and external job outcomes | manifest is complete; `jobs` is explicitly not-recorded; every commit receives its own run |
| P2 — Repository security and billing code | partial | local tests + committed CI | `10ab812` (contains `ad44494`) | inversion + JWT-fuzz suites; secret scan in CI; exact-commit clean-clone + CI-bound | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests + committed CI | `5c883f1` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests + committed CI | `5c883f1` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `5c883f1` | automated axe+reflow 110 cases ×5 engines (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `5c883f1` + docs receipt `0550c29` | runs `39987095875` / `39777254650`; latest artifact complete + self-hash sidecar; exact-commit clean clone 177/1329, 22.55%, floors pass; focused assurance 50/50 | repo → CI | retain clean-clone lcov; hosted staging | tracked lcov deletion remains local; independent local hygiene scan remains guard-blocked in this audit |
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

**Last completed exact-HEAD receipt before the current implementation overlay:**
`4967b72` was verified by run `39990265678`; all four jobs succeeded and the
evidence artifact was `12519384283`. Changes made after that receipt are an
unbound implementation overlay until a new run has `headSha` equal to the
resulting commit and succeeds.

**Replacement-project security baseline:** the read-only snapshot in
[`SUPABASE_SECURITY_BASELINE_2026-10-23.md`](docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md)
records 26 ERROR, 73 WARN, and 108 INFO findings. This is an open staging
gate, not a security-clearance claim.
