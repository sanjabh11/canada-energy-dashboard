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

**Milestone status (2026-10-24):** bound HEAD `389dad3` — CI run
> `40073506314` — `head_sha` exact; `lint-typecheck`, `test`,
`evidence-binding`, and `build-and-smoke` all succeeded (artifact
`12551764380`, merge SHA `02d17636953cf1a2e2482abfe50704b5a1c42c28`, GitHub
digest `sha256:036865d5043db63b545b6b80ec73dbc9e01bc6dd663dd26632e7eb8541a6a9f4`).
The downloaded artifact ZIP reproduced the GitHub digest; its manifest was
complete, its sidecar verified, and all nine listed evidence files matched
their recorded SHA-256 hashes and byte counts. The prior `a460a82` / run
`40071166986` receipt remains historical: its verification jobs were green
but its evidence-binding job was the intended staleness signal.
>
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
> The predecessor receipt recorded client-env, hygiene, and secret-scan
> results; those restricted scans are guard-blocked for the current overlay
> and remain unverified here. `coverage/lcov.info` remains deleted locally by
> owner decision. The `ubuntu-latest`→26.04 migration
> broke the previous run's browser install; the image is now pinned.
> Prior bound runs (`39554044008`/`4f0348d`, `39552477642`/`e7a5f81`,
> `39550773406`/`caadfc5`) remain historical evidence. Any later commit is
> evidence-only in that historical chain; the current implementation overlay
> is separate. Binding rule: the run whose `headSha` equals a commit
> binds that commit — no older run is proof for a newer HEAD.
> The current receipt's manifest records merge checkout `02d1763`, PR head
> `389dad3`, `complete: true`, `missing_files: []`, nine evidence files,
> and `jobs: "not-recorded"`; GitHub's four external job conclusions are the
> authoritative job result. Browser and coverage artifacts are retained by
> the run. Later evidence-only document commits must not be described as a
> new code-binding source unless their own head-matching run exists.
> WCAG evidence claims automated axe+reflow coverage only —
> manual 2.2 review stays open. Supabase project-ref discrepancy
> (`qnymb…` vs `cwij…`) is recorded owner-gated. (Historical baselines —
> `2cdc44b`, 1186-test, 80-browser, and prior run IDs — are superseded;
> see dated addenda.)
>
> **Current checkout:** `389dad3` is CI-verified by run `40073506314`. The
> tracked `coverage/lcov.info` deletion and zero-byte untracked dump stubs
> remain intentionally preserved and are not backup evidence. No reset or
> restoration was performed.
>
> **Source remediation — predecessor CI-bound:** commit `ad44494` (test-only
> child-process warning isolation) is bound by run `40071166986` on `a460a82`
> (all 3 jobs green); its push succeeded after the execution-guard block was
> lifted here. The predecessor receipt recorded client-env 2272 surfaces,
> repository hygiene, and secret-scan results. Those restricted scans remain
> guard-blocked and unverified for the current `779eef6` overlay.

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
| P0 — Preservation and INC-001 owner separation | in progress | source | current HEAD `389dad3`; intentional dirty overlay preserved | exact-head CI receipt; lcov deletion and zero-byte stubs remain classified | repo | owner resolves Supabase project identity + invalidates INC-001 | project-ref mismatch (qnymb… vs cwij…) and local dirty overlay remain |
| P1 — Current-tree addendum and evidence binding | in progress | committed CI | bound source `389dad3` / run `40073506314` | artifact `12551764380`; digest `sha256:036865…a6a9f4`; manifest/sidecar/internal hashes verified | repo | retain current receipt and historical distinction | manifest jobs field is explicitly not-recorded; hosted proof remains absent |
| P2 — Repository security and billing code | partial | local tests + committed CI | `10ab812` (contains `ad44494`) | inversion + JWT-fuzz suites; secret scan in CI; exact-commit clean-clone + CI-bound | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests + committed CI | `389dad3` / run `40073506314` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests + committed CI | `389dad3` / run `40073506314` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `389dad3` / run `40073506314` | automated axe+reflow and browser evidence retained (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `389dad3` / run `40073506314` | complete manifest, sidecar, nine internal file hashes, external four-job success | repo → CI | independent clean-clone lcov and hosted staging | local lcov deletion remains intentional; hosted proof absent |
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

**Historical predecessor receipt:** `4967b72` was verified by run
`39990265678`; all four jobs succeeded and the evidence artifact was
`12519384283`. It is superseded for current-state claims by the exact-head
`389dad3` / `40073506314` receipt above. The local evidence/migration
descendant after `389dad3` has not been pushed because the shared-state guard blocked
the push; it must not be called CI-verified until a run has `headSha` equal to
that commit and succeeds.

**Replacement-project security baseline:** the read-only snapshot in
[`SUPABASE_SECURITY_BASELINE_2026-10-23.md`](docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md)
records 26 ERROR, 73 WARN, and 108 INFO findings. This is an open staging
gate, not a security-clearance claim.
