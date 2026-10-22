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

Any later commit on this branch is a documentation-only delta. (The earlier
"latest successful branch run is authoritative" phrasing is superseded by
the audit-7 two-state binding contract below.)

**Update (2026-10-22, mission contract):** HEAD `7d8c1fe` is bound by run
`39728420587` (all jobs green; merge `656e5f53`, artifact `12404293064`,
digest `sha256:859df2f85ebfa72878562fa6e3024c9100baa57b23deb300cd8aa44c55cf7702`,
manifest `complete:true`, sidecar verified). `mission.md` + append-only
`.phase-loop/ceip-controlled-pilot-mission.jsonl` added by the architect
lane; status `PLANNED / NOT COMPLETE` — repository CI evidence defensible,
staging/pilot STOP. (Note: `7d8c1fe` was HEAD at the time of that update;
see the audit-7 binding below for the current bound source.)

**Update (2026-10-22, audit-7 two-state binding):** bound source HEAD
`3ff27df` is bound by run `39755846368` (`head_sha` == `3ff27df` exact; all
verification jobs green; merge `2111069c`, artifact `12417415983`, digest
`sha256:2eb16a414139365be5d7b72dff916654d7d91304ea2205fe10f8a0078e1c8c4c`).
The dedicated `evidence-binding` job reported the pre-rebind staleness on
that run — by design it is a staleness signal only and does not invalidate
the verification jobs. `check-evidence-binding.mjs` now enforces the
two-state contract in CI: `bound_source_sha`+`bound_source_run` with exact
`head_sha` equality and ancestry, and every descendant commit after the
bound source must be evidence-allowlist-only (`goal.md`, `mission.md`,
dated addenda, `.phase-loop/`, `.positioning-audit/`) or self-bound as the
current run head. Negative fixtures cover: stale ancestor + code change,
stale ancestor + CI workflow change, evidence-only descendant pass,
run/head mismatch, and failed/missing run.

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
