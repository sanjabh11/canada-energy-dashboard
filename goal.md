# goal.md — CEIP controlled-pilot objective

## Current authoritative receipt — 2026-10-26

**Bound HEAD `3cc92a5a6e7ce872efd052d654b09f413686e3ff` — CI run**
> `40307916382`

The exact-head run completed with `lint-typecheck`, `test`, and `build-and-smoke` successful. Its `evidence-binding` job failed only because this document set still named the preceding receipt; that is the designed stale-document signal, not a source-test failure. The run's merge checkout was `2a302ccb48ac209d590db68c779406511b4ec271`. Evidence artifact `12645175367` has GitHub digest `sha256:64232da414622e19c12c1ee9c13ec02f3aeb5e1ec6642d069cc8e94e1f4a67c4`; its manifest is complete, has no missing files, and its 11 listed payload hashes and sizes plus the manifest sidecar were independently verified. This proves repository CI only; it does not prove hosted staging, owner approval, or pilot readiness.

This receipt supersedes older “current” paragraphs below. The source change is `20261026003_restrict_legacy_entitlement_helpers.sql`, which removes `anon` and `authenticated` EXECUTE grants from four unused SECURITY DEFINER helpers, pins their search path, and retains service-role execution for an explicitly reviewed server path. The replacement project still has the prior migration frontier, so the hosted helpers remain exposed until an owner applies and verifies this migration in staging.

| Phase | Status | Highest proof layer | Next checkpoint |
|---|---|---|---|
| P0 incident/preservation | complete | owner-recorded | retain incident closure and preserve the intentional dirty overlay |
| P1 evidence binding | in progress | CI-verified source; docs rebind pending | run the evidence-only document update and verify its binding job |
| P2 repository security | complete for this overlay | CI-verified | apply migration and test hosted grants/RLS in owner-run staging |
| P8 replacement-project staging | blocked | none | backup, migration order, RLS/direct-write denial, rate limits, retention, restore and rollback |
| P9 buyer validation | blocked | none | privacy/CASL approval, then 11 paid experiments |

The currently authenticated Supabase account is `sanjabh11@gmail.com`; its token inventory contains no matching CEIP/Devin token, so no unrelated token was revoked. OAuth MCP remains the read-only path. Do not claim token revocation without the owner account and a matching token record.


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

**Historical code-bearing verification source (superseded by the authoritative receipt above):** `3941e1dabc7904e48826dc6eccd1c2105bb795be` — CI run
> `40292290033` (head SHA exact; `lint-typecheck`, `test`, and
> `build-and-smoke` succeeded). The `evidence-binding` job failed only
> because these documents still referenced the previous source; that is the
> designed stale-document signal, not a source-test failure. Artifact
> `12637053422`, GitHub digest
> `sha256:41d9c8dfbb726ec7027860d18cadedf397b9c1dec6a93928a1e5d4a60e602d54`. This receipt proves repository verification only, not staging or
> pilot readiness. The evidence-only document update `853f7eee` is bound by CI run
`40294701772`; all four jobs succeeded. Artifact `12638082780`, GitHub digest
`sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`.

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
- The current authenticated account inventory contains no matching CEIP or Devin
  project-scoped token. No unrelated token was deleted; the CLI OAuth MCP remains
  the preferred read-only path. A direct revocation event is not claimed from
  inventory absence alone.
- The authoritative incident register records INC-001 closed by deletion or
  third-party ownership of the leak-site project. The residual risk is the
  historical credential in public Git history; the leak-site project must not
  be restored.

**Historical phase snapshot (superseded by the authoritative phase table above):**

| Phase | Status | Highest proof layer | Next checkpoint |
|---|---|---|---|
| P0 — incident and preservation | complete | owner-recorded | retain closure evidence and preserve dirty overlay |
| P1 — goal/evidence binding | complete | committed CI | code source `3941e1d` / run `40292290033`; evidence-only docs `853f7eee` / run `40294701772`; artifact `12638082780`; digest `sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`; all four jobs green; hosted gates remain blocked |
| P2 — repository security/billing | ci-verified remotely | committed CI | repository hardening is verified; replacement-project grants, RLS and function behavior remain staging-gated |
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
> **Historical checkout snapshot:** `fc133bc` is CI-verified by run `40214413753`. The
> tracked `coverage/lcov.info` deletion and zero-byte untracked dump stubs
> remain intentionally preserved and are not backup evidence. No reset or
> restoration was performed.
>
> **Source remediation — historical:** commit `ad44494` (test-only
> child-process warning isolation) is covered by the historical
> `a460a82`/`40071166986` receipt. The current `e5261b2` run independently
> executed the secret, hygiene, and client-environment scans successfully.

## Current replacement-project read-only observation — 2026-10-26

- Project URL: `https://qktgjpbifknqjpvrgkrj.supabase.co`.
- Supabase MCP returned 123 applied migrations and 230 public tables at
  `2026-10-26T08:37:53Z`; the live list ends at `20261023094758`. Repository migrations
  `20261026001_harden_readonly_sql_privileges` and
  `20261026002_harden_api_key_rate_functions` are not applied to the
  replacement project.
- Five Edge Functions are ACTIVE: `lead-capture`, `whop-verify-access`,
  `whop-webhook`, `calibration-cron`, and
  `storage-dispatch-scheduler`. The pilot allowlist remains the first three;
  the two scheduler functions require owner classification before staging.
- Security advisors at `2026-10-26T08:37:53Z`: 23 security-definer-view ERRORs, one
  RLS-disabled ERROR, 107 RLS-no-policy INFO findings, four extension WARNs,
  five materialized-view WARNs, and 11 anonymous plus 11 authenticated
  security-definer execution WARNs.
- Performance advisors at `2026-10-26T08:37:53Z`: 23 unindexed-FK INFOs, 100
  auth-RLS-initplan WARNs, 449 unused-index INFOs, 247
  multiple-permissive-policy WARNs, and seven duplicate-index WARNs.
- No hosted migration, function deployment, storage upload, backup, restore,
  or rollback was performed by this agent. This is read-only control-plane
  evidence and does not prove hosted RLS, retention, logging, deployment, or
  owner approval.

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

## Historical repository security overlay

The repository now contains two additional hardening migrations:
`20261026001_harden_readonly_sql_privileges` and
`20261026002_harden_api_key_rate_functions`. Local tests, typecheck,
migration verification, and the exact-head CI verification jobs passed for these
changes. They are not hosted proof: the replacement project still ends at
migration `20261023094758`, so anonymous/authenticated denial, rate-limit
fail-closed behavior, and service-role-only execution remain owner-run staging
checks.

## Phase tracking

| Phase | Status | Proof layer | Commit/tree ID | Artifact / run ID | Owner | Next checkpoint | Remaining risk |
|---|---|---|---|---|---|---|---|
| P0 — Preservation and INC-001 owner separation | complete | owner-recorded | leak-site deletion/third-party ownership recorded in incident register; intentional dirty overlay preserved | incident register closure; lcov deletion and zero-byte stubs remain classified | repo/owner | retain closure evidence; never restore leak-site project | historical credential remains in public Git history |
| P1 — Current-tree addendum and evidence binding | complete | committed CI | code source `3941e1d` / run `40292290033`; evidence-only docs `853f7eee` / run `40294701772` | artifact `12638082780`; digest `sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`; all four jobs green | repo | retain receipt; keep hosted gates blocked | hosted proof absent |
| P2 — Repository security and billing code | partial | committed CI | `3941e1d` / run `40292290033` | readonly-SQL privileges, fail-closed rate protection, service-role-only API accounting; hosted RLS still pending | repo → owner | apply and test hosted controls in staging | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | committed CI | `3941e1d` / run `40292290033` | provenance/freshness, allocator availability, landfill screening controls retained | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | committed CI | `3941e1d` / run `40292290033` | server-verified identity/entitlement and acquisition removal retained | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `853f7eee` / run `40294701772` | automated axe/reflow and browser evidence retained; all four CI jobs green | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `853f7eee` / run `40294701772` | complete manifest, sidecar and browser/test artifacts; all four CI jobs green | repo → CI | independent clean-clone lcov and hosted staging | local lcov deletion remains intentional; hosted proof absent |
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
records the 2026-10-26 read-only observation: 23 security-definer-view ERRORs, one RLS-disabled ERROR, 107 RLS-no-policy INFO findings, four extension WARNs, five materialized-view WARNs, and 11+11 execution WARNs. This is an open staging
gate, not a security-clearance claim.
