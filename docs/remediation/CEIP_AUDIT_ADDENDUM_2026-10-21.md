# CEIP audit addendum — 2026-10-21

Final bound tree: HEAD `caadfc5976947f12174a66b59e7e89ff0801579f` · CI run
`39550773406` (all 3 jobs green) · merge SHA `a458a73f598f08b005fe034ba52066ce7fa97020`
· artifact digest `sha256:d98ecd01b5809e411a703df3952e943e644bb6640b4c48e4d71021157586908a`
· manifest `complete:true`, `missing_files:[]`, `.sha256` sidecar
`shasum -c` verified, branch vs merge SHA both recorded · local fingerprint
`2811698a334f96a91d301bc7fbff6f9ff30f2bdd861834fe070916f8938ee6b3`.

Pre-fix run `39541079913` on `b1fc0da` was also green but with the refuted
manifest; superseded. Prior addenda are historical and unchanged.

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
