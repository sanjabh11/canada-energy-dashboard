# CEIP audit addendum — 2026-10-21

CI-bound source tree parent: `4f0348d10851204418e76bbdbcbbbd53f1aa4e43` · CI run
`39554044008` (all 3 jobs green) · merge SHA
`8e81bbe63db0aeaa94d74cb98c92047a3c13efcc` · artifact ID `12325836686` ·
artifact digest
`sha256:845cdcf0066fbed2ce345b4fd8ac06d6b2479f1edd43693975ca5884a1b2ed27`.
The downloaded artifact contains nine evidence files; every manifest hash
matches, `complete:true`, `missing_files:[]`, and the manifest `.sha256`
sidecar verifies with `shasum -c`. The manifest records the honest
`jobs: not-recorded` sentinel; external GitHub job conclusions are the job
proof. Prior bound runs `39552477642` on `e7a5f81`, `39550773406` on `caadfc5`,
and `39541079913` on `b1fc0da` remain historical evidence. The current local
checkout has a tracked deletion of `coverage/lcov.info`; it is preserved for
classification and is not represented as a clean local tree.

The current checkout contains a documentation-only overlay on that CI-bound
parent. No separate CI run exists for the overlay. The CI run above therefore
proves the parent source tree and its recorded artifacts; it must not be
described as a run for the overlay. The exact overlay hash is obtained from
Git rather than copied into this self-referential document. The local `coverage/lcov.info`
deletion remains intentionally unresolved and was not reset or restored.

**Update (2026-10-21, post-push):** the overlay was pushed and is now bound —
run `39628050850` on `947bbfe`, all 3 jobs green on pinned `ubuntu-24.04`
(merge `758cecc148f7bfee0df089c5d46c458e1c399997`, artifact `12358059140`,
digest `sha256:cbcec7b7598a9310da7f05d3924d3cf2e917670c94a8fe8e93c3c0191ef1dc41`).
That run caught two real defects missed by every prior run: the
`ubuntu-latest`→26.04 migration broke Playwright browser install (image now
pinned), and nine routes had latent WebKit reflow overflow at 320–768px that
prior runner-image font metrics had masked — fixed structurally (implicit-auto
grid tracks, scroll-region shrink guards, `hidden`→`sr-only` file inputs,
unbreakable tokens). The three scans the audit environment could not run
(client-env 2272 surfaces, repo hygiene, secret scan — HEAD clean, documented
INC history only) were executed here and pass.

Commit `ad444941b1a1b270959a2939b8a4d9146ef67520` contains one test-only
change: spawned CLI processes set `NODE_NO_WARNINGS=1` so host-runtime
deprecation warnings cannot contaminate the scripts' stderr contract. An exact
commit clean clone at `/tmp/ceip-clean-20261021-ad444` installed the frozen
lockfile and completed serial coverage with 177/177 files, 1,329/1,329 tests,
22.55% lines, and all 11 critical floors passing. Its retained lcov is
`/tmp/ceip-clean-20261021-ad444/coverage/lcov.info` (1,217,118 bytes,
SHA-256 `a2f8b08be559708a45a92e388b2b819c092e35b3e65db38b6751435fb1bcd066`).
The push needed for a fresh CI run was blocked by the execution guard, so this
commit is locally reproduced but not yet CI-bound.

Snapshot preservation check: the only durable snapshot currently present is the
filenames/status manifest
`.remediation-snapshots/pre-m-remediation-2026-10-05.txt` (SHA-256
`e939ed4a600b10f77ebf0c043a2eb5fa98511472d627de1a5800dddacbb49ff2`); the
previous archive is not present. A read-only archive listing of the recorded
base commit contains 1,795 tracked entries and no `coverage/lcov.info`; that
file was introduced later in `043231e9` (HEAD copy SHA-256
`dbceb64404a337c35761be9101a2a133011fabf79f350970227b3cd376ef359a`) and is
now deliberately deleted in the local overlay. An isolated materialization
would write outside the repository and was blocked by the execution guard, so
no recovery copy was created and no current WIP was overwritten.

## Current-tree verification

- CI unit coverage: 177 test files, 1,329 tests, 22.55% lines.
- CI browser evidence: Phase 0 35, Phase 6 80, wedge 80, automated a11y 110;
  all had zero unexpected results.
- Local positioning, claim-boundary, commercial-source, dependency,
  `git diff --check`, typecheck, lint (0 errors / 1,736 warnings), lint
  baseline (1,736 / 1,742), and the focused inversion/JWT/negative-fixture
  assurance slice (50/50) pass on the available checkout. Client-environment,
  repository-hygiene, and secret scans were guard-blocked in this pass; they
  are not reported as local passes.
- Local critical coverage cannot run because the tracked `coverage/lcov.info`
  file is absent. The secret scanner was guard-blocked by the approved
  execution policy; this is neither a pass nor a source failure. A bounded
  single-file coverage probe passed 17/17 and wrote a fresh lcov report to an
  isolated `/tmp` directory, confirming the reporter path without restoring or
  overwriting the tracked artifact. The exact-commit clean-clone run recorded
  below is the independent full serial reproduction; the main checkout remains
  intentionally without the deleted artifact.
- The exact-commit clean-clone lcov and critical-path results are retained as
  run evidence; the lcov bytes are not claimed byte-identical to CI artifacts
  because coverage output varies by runtime and execution environment.
- The snapshot preservation check found no recoverable archive and confirms
  that the deleted lcov was not part of the October 5 snapshot base; this is a
  preservation limitation, not permission to restore or discard the local
  deletion.
- No Netlify deployment exists for `4f0348d`. Supabase remains paused and the
  incident-register project ref `qnymbecjgeaoxsfphrti` still differs from the
  inactive project returned by the control-plane inventory,
  `cwijcjhdugfqwsjbrdro`.

The final ECC advisor review returned **STOP** (`sound=0.43`,
`unaddressed_risk=0.80`) because JEV hard-blocked the client-environment,
repository-hygiene, and secret scanners in this checkout. The earlier bound CI
run proves those gates for its parent tree, but no current `ad444941` CI run is
claimed. This is an evidence-layer limitation, not a scanner PASS or a reason
to bypass the guard; staging and pilot remain blocked.

## Refutation-protocol outcomes (auditor claims 1–14)

| # | Auditor verdict | This pass |
|---|---|---|
| 1 tree fingerprint | partially survived | the exact-commit clean clone and Git identity were checked; the canonical content-fingerprint script was guard-blocked because its repository-wide scan touches restricted dotenv/key patterns, so no independent fingerprint match is claimed |
| 2 artifact re-hash | survived | unchanged |
| 3 manifest false-pass | **refuted — fixed** | manifest now declares required files, `missing_files`, `complete`; hard `Verify evidence completeness` CI step fails the job on absent outputs; `.sha256` sidecar hashes the manifest itself; negative fixture test proves a partial run cannot pass |
| 4 clean-clone coverage | locally independently reproduced | exact commit `ad444941` in `/tmp/ceip-clean-20261021-ad444` completed 177/177 files and 1,329/1,329 tests at 22.55% lines; critical floors passed and lcov was retained; fresh CI binding remains open |
| 5 inversion checks | CI-verified | `tests/unit/securityInversions.test.ts`: whop identity, webhook HMAC, suppression, checkout kill-switch, anonymous-write denial; retained in the bound test job |
| 6 JWT fuzzing | CI-verified | `tests/unit/jwtShapeGate.test.ts`: expired, wrong-aud, forged-iss, malformed, oversized, truncated, non-base64url; retained in the bound test job |
| 7 a11y design gaps | CI-verified for tested cases | unique per-route markers, interception-scope proof, nested-scroll-container check, post-audit URL guard; full WCAG remains manual/open |
| 8 WCAG claim ceiling | bounded | evidence claims automated axe+reflow only; manual 2.2 review stays open; CI step renamed |
| 9 net diff (296 files) | partial | reviewed; lcov/history-artifact tracking is intentional evidence binding — documented, not a defect |
| 10 dependency audit | survived | braces exception current; no new advisories today |
| 11 gate-script correctness | partial — extended | manifest negative fixture + `checkScriptNegativeFixtures.test.ts` covers high-risk gates |
| 12 Netlify preview | unverifiable | no deployment exists for this SHA; deployed behavior is not claimed anywhere |
| 13 Supabase project identity | partial — recorded | register now documents `qnymb…` vs `cwij…` mismatch; owner must identify the authoritative record |
| 14 doc-count pin | survived | 251/251 strict (pin drifted twice this pass — caught by the gate both times, working as designed) |

## Remaining open (owner/hosted, unchanged)

INC-001 invalidation + log review · Supabase project identity, unpause,
hosted RLS/migration/rate limits/rollback · `WHOP_CEIP_*` env + edge deploy
+ `/v5/me` removal · CASL sign-off · manual keyboard/focus/SR WCAG review ·
deployed perf (Redoc is already a lazy route-split dynamic chunk — the
1,178 kB is not in the initial bundle; deployed Web Vitals still
staged-blocked) · buyer experiments 0/11.

## Next execution order

1. Preserve and classify the local `coverage/lcov.info` deletion without
   resetting or overwriting the dirty checkout.
2. Push `ad44494` through an approved path and retain its fresh CI run,
   artifact ID, digest, manifest, and external job conclusions. The current
   execution guard blocked this step, so it remains open.
3. Keep the current goal/addendum identities synchronized after every commit;
   a later successful run supersedes an earlier bound run only after its
   artifact, digest, and documents are updated.
4. Leave Supabase restoration, migration, deployment, CASL, manual WCAG,
   performance, and buyer experiments owner-gated.
