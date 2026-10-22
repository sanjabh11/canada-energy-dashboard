# CEIP audit addendum — 2026-10-22

Bound state (audit #5, externally verified by the auditor):

- HEAD `10ab812b0c848db85fa5f4c5c53ef0df4a895bd2`
- CI run `39641749404` — all jobs green; merge SHA
  `d36e88f22bd44116e61a019690654f6c1bdb5731`
- artifact ID `12365798216`; GitHub artifact digest
  `sha256:7e77cc63a96b0764167e95b7043b7b85847c9915209a6432cc80b64e1962ad6f`
- tree fingerprint `494227ceb3ce1ad8f2286a7a824c07e397d5e8d12a3f15619077cd23e85830db`
- manifest hash `a7557cbf027a3476d65d8da8d5d17d4752aeb4673caca0ca2ad0b76dcae0aa3f`
- manifest: `complete:true`, `missing_files:[]`, sidecar + internal hashes
  verified by the auditor; `jobs:"not-recorded"` is an honest sentinel —
  external GitHub job conclusions are the job proof
- browser evidence: Phase 0 35/35, Phase 6 80/80, wedge 80/80,
  accessibility 110/110; zero unexpected results

Any later commit on this branch is a documentation-only delta; the latest
successful branch run is the authoritative bound state.

## Audit-5 disposition

The auditor independently re-downloaded the artifact, verified the GitHub
digest, sidecar, and all internal file hashes, and counted browser results —
the evidence chain survived external verification end to end. The sole
repo-owned residual was documentation staleness (this file + `goal.md`),
fixed by this addendum.

## Still open (owner/hosted — unchanged)

INC-001 invalidation + log review · Supabase project identity
(`qnymbecjgeaoxsfphrti` vs `cwijcjhdugfqwsjbrdro`) and unpause → hosted
RLS/migration/rate limits/rollback · `WHOP_CEIP_*` env + edge deploy +
`/v5/me` chain · CASL sign-off · manual WCAG 2.2 review · deployed Web
Vitals · buyer experiments 0/11.

`coverage/lcov.info` remains intentionally deleted in the local overlay;
not restored, not staged.

**Decision: repository remediation is defensible at the CI proof layer;
staging and pilot remain STOP on owner gates.**
