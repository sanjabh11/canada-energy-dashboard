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

The current checkout HEAD is `96b9e3c` and is a documentation-only overlay on
that CI-bound parent. No separate CI run exists for the overlay. The CI run
above therefore proves the parent source tree and its recorded artifacts; it
must not be described as a run for `96b9e3c`. The local `coverage/lcov.info`
deletion remains intentionally unresolved and was not reset or restored.

## Current-tree verification

- CI unit coverage: 177 test files, 1,329 tests, 22.55% lines.
- CI browser evidence: Phase 0 35, Phase 6 80, wedge 80, automated a11y 110;
  all had zero unexpected results.
- Local positioning, claim-boundary, commercial-source, dependency,
  `git diff --check`, typecheck, lint (0 errors / 1,736 warnings), lint
  baseline (1,736 / 1,742), client-env safety, and repository-hygiene gates
  pass on the available checkout. The focused inversion/JWT/negative-fixture
  assurance slice passed 50/50 tests.
- Local critical coverage cannot run because the tracked `coverage/lcov.info`
  file is absent. The secret scanner was guard-blocked by the approved
  execution policy; this is neither a pass nor a source failure. A bounded
  single-file coverage probe passed 17/17 and wrote a fresh lcov report to an
  isolated `/tmp` directory, confirming the reporter path without restoring or
  overwriting the tracked artifact. The full serial coverage reproduction is
  still pending.
- No Netlify deployment exists for `4f0348d`. Supabase remains paused and the
  incident-register project ref `qnymbecjgeaoxsfphrti` still differs from the
  inactive project returned by the control-plane inventory,
  `cwijcjhdugfqwsjbrdro`.

## Refutation-protocol outcomes (auditor claims 1–14)

| # | Auditor verdict | This pass |
|---|---|---|
| 1 tree fingerprint | partially survived | current branch/merge identity is recorded above; independent fingerprint reproduction remains pending |
| 2 artifact re-hash | survived | unchanged |
| 3 manifest false-pass | **refuted — fixed** | manifest now declares required files, `missing_files`, `complete`; hard `Verify evidence completeness` CI step fails the job on absent outputs; `.sha256` sidecar hashes the manifest itself; negative fixture test proves a partial run cannot pass |
| 4 clean-clone coverage | CI-verified, independently unverified | synthetic `VITE_*` fallbacks and `docs/TESTING.md` are present; a fresh clean-clone lcov reproduction still needs to be retained |
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
2. Reproduce the current CI evidence in an isolated clean clone with the
   documented synthetic environment and retain lcov/critical-floor results.
3. Keep the current goal/addendum identities synchronized after every commit;
   a later successful run supersedes an earlier bound run only after its
   artifact, digest, and documents are updated.
4. Leave Supabase restoration, migration, deployment, CASL, manual WCAG,
   performance, and buyer experiments owner-gated.
