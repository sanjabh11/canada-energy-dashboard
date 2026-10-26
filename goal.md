# goal.md — CEIP controlled-pilot objective

> Bring CEIP to an evidence-backed controlled-pilot decision. Close
> repository-owned security, data-integrity, calculation, claims, quality,
> and evidence-packaging gaps; verify the exact final tree through
> reproducible tests and approved CI; preserve verified access for existing
> Whop customers while removing Whop acquisition and channel priority.
> Continue repository work while the replacement Supabase project is under
> controlled preparation. INC-001 is closed at the owner-recorded incident
> layer because the leak-site project was deleted or is outside the owner's
> account; preserve that historical evidence and never restore the leak-site
> project. Keep staging, production, and pilot blocked until the replacement
> project's hosted controls, named owner approvals, and buyer evidence exist.
> Never infer closure from code presence or an unrun test.

**Current bound source (2026-10-26):** bound HEAD `180a1e5d745d961d7b1b48d8c14f7b82dd3e746a` — CI run
> `40282361170` (source head SHA exact; `lint-typecheck`, `test`, and
> `build-and-smoke` successful; the `evidence-binding` job is the expected
> staleness signal for the preceding unbound code commit). Artifact
> `12634400722`, GitHub digest
> `sha256:a6553839f6f73e3d8174be3a949123e60ff3507ddfeb141b864137c730e849ff`.
> GitHub job conclusions are authoritative; the manifest jobs field remains
> an honest sentinel. This receipt proves repository CI only, not staging or
> pilot readiness.

**Audit snapshot (2026-10-26; captured before this documentation update; not CI proof):**

- The latest remote PR head at capture was `5ba25d9`, bound by CI run
  `40216410789`; all four jobs succeeded. This receipt did not prove the local
  checkout.
- The local checkout at capture was `de11fa4`, with the intentional
  `coverage/lcov.info` deletion and untracked zero-byte dump stubs. No reset,
  clean, or restoration is permitted.
- The replacement project is `qktgjpbifknqjpvrgkrj`. Read-only dashboard
  evidence shows migrations and five visible Edge Functions, no Storage
  buckets/objects, and no Free-plan scheduled backups. Hosted behavior remains
  unverified.
- The displayed project-scoped MCP token has been revoked. The CLI OAuth MCP
  remains the preferred read-only path; the in-chat connector still requires
  account refresh before it can query the replacement project.
- The authoritative incident register records INC-001 closed by deletion or
  third-party ownership of the leak-site project. The residual risk is the
  historical credential in public Git history; the leak-site project must not
  be restored.

**Current phase overrides:**

| Phase | Status | Highest proof layer | Next checkpoint |
|---|---|---|---|
| P0 — incident and preservation | complete | owner-recorded | retain closure evidence and preserve dirty overlay |
| P1 — goal/evidence binding | complete | committed CI | `180a1e5` / run `40282361170` | three verification jobs green; artifact `12634400722`; GitHub digest recorded above; binding gate staleness signal documented | repo | keep hosted gates blocked and preserve receipt |
| P2 — repository security/billing | ci-verified remotely | committed CI | verify replacement-project grants, RLS and function behavior in staging |
| P8 — replacement-project staging | blocked | none | backup/export, migration order, RLS, rate limits, retention, rollback |
| P9 — buyer validation | blocked | none | CASL/privacy approval followed by 11 paid experiments |

**Historical milestone (2026-10-25; superseded for current-state claims):** bound HEAD `fc133bc` — CI run
> `40214413753` — `head_sha` exact; all four jobs green including
`evidence-binding` (the audit-12 chain is covered inside bound source
`fc133bc`; run conclusion `success`) (artifact
`12607099570`, merge SHA recorded by GitHub for this run, GitHub digest
`sha256:e826aba042a8c589ea17165e16782c24ac83765363cd987297fa376d0ec205f7`).
The downloaded artifact ZIP was retained by the run; its manifest was
complete, its sidecar verified, and all 11 hashed payload files (9 required
core files plus the manual-assist report/result) matched their recorded
SHA-256 hashes and byte counts. The prior `a460a82` / run
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
> The current receipt's manifest records merge checkout `63ebd10c`, PR head
> `fc133bc`, `complete: true`, `missing_files: []`, 9 required core evidence
> files plus 2 manual-assist payloads (11 hashed payloads),
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
> **Current checkout:** `fc133bc` is CI-verified by run `40214413753`. The
> tracked `coverage/lcov.info` deletion and zero-byte untracked dump stubs
> remain intentionally preserved and are not backup evidence. No reset or
> restoration was performed.
>
> **Source remediation — historical:** commit `ad44494` (test-only
> child-process warning isolation) is covered by the historical
> `a460a82`/`40071166986` receipt. The current `e5261b2` run independently
> executed the secret, hygiene, and client-environment scans successfully.

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
| P0 — Preservation and INC-001 owner separation | complete | owner-recorded | leak-site deletion/third-party ownership recorded in incident register; intentional dirty overlay preserved | incident register closure; lcov deletion and zero-byte stubs remain classified | repo/owner | retain closure evidence; never restore leak-site project | historical credential remains in public Git history |
| P1 — Current-tree addendum and evidence binding | in progress | committed CI | bound source `fc133bc` / run `40214413753` | artifact `12607099570`; digest `sha256:e826aba042a8c589ea17165e16782c24ac83765363cd987297fa376d0ec205f7`; manifest/sidecar/11 payload hashes verified | repo | retain current receipt and historical distinction | manifest jobs field is explicitly not-recorded; hosted proof remains absent |
| P2 — Repository security and billing code | partial | local tests + committed CI | `10ab812` (contains `ad44494`) | inversion + JWT-fuzz suites; secret scan in CI; exact-commit clean-clone + CI-bound | repo | hosted RLS + contract verification | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | local tests + committed CI | `fc133bc` / run `40214413753` | `tierPricing` provenance + stale_inputs; allocator `available`-only; landfill screening-labeled | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | local tests + committed CI | `fc133bc` / run `40214413753` | server-verified identity/entitlement; acquisition surfaces removed | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `fc133bc` / run `40214413753` | automated axe+reflow and browser evidence retained (automated coverage only) | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `fc133bc` / run `40214413753` | complete manifest, sidecar, 11 hashed payload files, external four-job success | repo → CI | independent clean-clone lcov and hosted staging | local lcov deletion remains intentional; hosted proof absent |
| P8 — Replacement Supabase staging and named-owner approvals | blocked | — | — | — | owner | backup/export, migration order, RLS, rate limits, retention, rollback and named approvals | all hosted evidence absent |
| P9 — Buyer validation | blocked | — | — | `.positioning-audit/experiments.json` (0/11) | owner | business decision | commercial readiness unverifiable |

Status values: `not started / in progress / blocked / complete`.
Proof-layer vocabulary: `source` < `local tests` < `committed CI` < `staging` < `owner approved` < `buyer validated`. A row may only move right when the artifact at that layer exists.

## Hard boundaries

- No buyer contact, no new checkout enablement, no project restore, no hosted
  migration, no staging/production deploy, no owner-gate approval by agents.
- INC-001 (`SUPABASE_SERVICE_ROLE_KEY` in public history, `0422accf`) is
  closed at the incident-register layer by deletion or third-party ownership
  of the leak-site project. Preserve the historical record and do not restore
  that project; any future resurfacing requires owner rotation and log review.
- The coverage threshold is set only from a passing full serial run; the current
  committed CI measurement is 22.55% lines, while the local lcov deletion is
  unresolved and must not be treated as a passing local coverage state.

**Historical predecessor receipt:** `4967b72` was verified by run
`39990265678`; all four jobs succeeded and the evidence artifact was
`12519384283`. It is superseded for current-state claims by the exact-head
`389dad3` / `40073506314` receipt above remains historical. The evidence/migration
descendant `fc133bc` is now pushed and CI-verified by run `40214413753`; no older
run is reused as proof for this newer head.

**Replacement-project security baseline:** the read-only snapshot in
[`SUPABASE_SECURITY_BASELINE_2026-10-23.md`](docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md)
records 26 ERROR, 73 WARN, and 108 INFO findings. This is an open staging
gate, not a security-clearance claim.
