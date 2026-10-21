# CEIP audit addendum — 2026-10-21

Audited tree: HEAD `b1fc0dae47e7d766fa39ddf7906d8db5f4420c5e` · CI run
`39541079913` (green) · merge SHA `65a42671a9227d5a17778c02f8714134d0360676`
· Git tree `def2181076a9b846261ff53898d54632fc790eda` · artifact digest
`4e8bf9804df5d4c6f3aa13fc23593e4570a165460a15b73c659229ac8e0ee4e1` ·
tree fingerprint `bf9894bd4a37563ef675f386e668c29295f3036b9928975c7bd1b472e4168b02`
(1669 files, 4 secret/dir entries skipped).

This pass remediates audit #3's refutations. Prior addenda are historical
and unchanged.

## Refutation-protocol outcomes (auditor claims 1–14)

| # | Auditor verdict | This pass |
|---|---|---|
| 1 tree fingerprint | partially survived | fingerprint re-recorded above |
| 2 artifact re-hash | survived | unchanged |
| 3 manifest false-pass | **refuted — fixed** | manifest now declares required files, `missing_files`, `complete`; hard `Verify evidence completeness` CI step fails the job on absent outputs; `.sha256` sidecar hashes the manifest itself; negative fixture test proves a partial run cannot pass |
| 4 clean-clone coverage | unverifiable — fixed | synthetic `VITE_*` fallbacks in `tests/setup/vitest.setup.ts` (obviously-invalid values); `docs/TESTING.md` records the repro path; lcov regenerates on a clean clone |
| 5 inversion checks | unverified — fixed | `tests/unit/securityInversions.test.ts`: whop identity, webhook HMAC, suppression, checkout kill-switch, anonymous-write denial |
| 6 JWT fuzzing | unverified — fixed | `tests/unit/jwtShapeGate.test.ts`: expired, wrong-aud, forged-iss, malformed, oversized, truncated, non-base64url |
| 7 a11y design gaps | unverified — fixed | unique per-route markers, interception-scope proof, nested-scroll-container check, post-audit URL guard |
| 8 WCAG claim ceiling | bounded | evidence claims automated axe+reflow only; manual 2.2 review stays open; CI step renamed |
| 9 net diff (296 files) | partial | reviewed; lcov/history-artifact tracking is intentional evidence binding — documented, not a defect |
| 10 dependency audit | survived | braces exception current; no new advisories today |
| 11 gate-script correctness | partial — extended | manifest negative fixture + `checkScriptNegativeFixtures.test.ts` covers high-risk gates |
| 12 Netlify preview | unverifiable | no preview exists for this SHA; deployed behavior is not claimed anywhere |
| 13 Supabase project identity | partial — recorded | register now documents `qnymb…` vs `cwij…` mismatch; owner must identify the authoritative record |
| 14 doc-count pin | survived | 249/249 strict |

## Remaining open (owner/hosted, unchanged)

INC-001 invalidation + log review · Supabase project identity, unpause,
hosted RLS/migration/rate limits/rollback · `WHOP_CEIP_*` env + edge deploy
+ `/v5/me` removal · CASL sign-off · manual keyboard/focus/SR WCAG review ·
deployed perf (Redoc is already a lazy route-split dynamic chunk — the
1,178 kB is not in the initial bundle; deployed Web Vitals still
staged-blocked) · buyer experiments 0/11.
