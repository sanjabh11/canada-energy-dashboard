# CEIP audit addendum — 2026-10-20 (committed-tree CI bound)

Seventh audit pass. Responds to the re-audit taken at `bb94b07` while the
WCAG lane was uncommitted. All repository-owned items it raised are now
fixed and bound to a green committed-tree CI run.

## Exact tree and merge identity

- Branch: `codex/green-button-truth-spine` → PR #50
- **Branch SHA:** `043231e991660fa2415fc83464bd86a75369b64b`
- **Merge SHA (CI checkout):** `e688e2406f24b5d009b6fc3ac2a21e7bbda37790`
  — PR checkouts test a merge commit; both are recorded separately.
  `CEIP_PR_HEAD_SHA` is now passed to the manifest step so future runs
  record branch SHA explicitly too.
- Tree fingerprint (final committed tree):
  `c13200f7d27394b4116e429c1b0d509d3fbf9d6de8777dc652a401bf4088aff7`
  (1668 files, contents-hashed, `.env*` excluded)
- Dirty-tree status at write time: clean — all remediation committed.

## CI evidence

- **Green run:** `39431650307` — all three jobs green on `043231e`:
  - `lint-typecheck`: tsc, eslint + warning baseline, semgrep, dep audit,
    migrations, secret scan incl. history, client-env incl. history,
    hygiene, claim boundaries, commercial docs, repo/public metadata,
    evidence register + 95 fixture, positioning strict (0 warnings).
  - `test`: full serial unit suite + coverage + critical-path floors.
  - `build-and-smoke`: build, bundle budgets, **Phase 0 / Phase 6 / wedge
    across all five Playwright projects**, **WCAG 2.2 AA audit**,
    `ci-evidence-manifest` recorded + all artifacts uploaded `if: always()`.
- **Artifact:** id `12269560674`, name `ci-evidence-e688e240…`,
  digest `sha256:40aa360b2781d55367e0e17cbfbc7ecfeef9b68cf0da621e0f02e2940fa4e346`,
  1,975,797 bytes; contains manifest + 4 report dirs + 4 result JSONs + lcov.
- **Manifest** (inside artifact): `head_sha` = merge SHA `e688e240…`,
  `GITHUB_RUN_ID`/`ATTEMPT`/`WORKFLOW`/`JOB`, tree fingerprint, per-file
  sha256. Recursive hashing of every uploaded artifact file (not only
  `index.html`) was added in `043231e` per this audit's P7.4 — binds from
  the next run onward.
- **Failed predecessor** `39417475061` — recorded, not claimed: 249/248
  inventory mismatch, 2 positioning tests, 19 Phase 6 browser failures.

## Proof layers

implemented → locally-tested → CI-verified → staging-verified →
owner-approved → buyer-validated. Everything below CI-verified is done;
staging/owner/buyer layers remain open by design.

## Reconciliation

- **249-vs-248 docs:** `collectFiles` counted `.DS_Store` — macOS junk
  present in the dirty tree, absent in CI checkouts. Dotfiles now excluded;
  claimed value corrected 249→248 (the claim itself had counted the junk).
  Reproduced in a fresh shallow clone before fixing — verifier strict =
  0 warnings in both dirty tree and clone.
- **mission_prepare.md:** the 08B addendum noted it missing; it was
  created during that pass. The stale note is corrected in-place (the
  addendum now reads "at the time of this pass").
- **Phase 6 `tier_market_rates` failures:** real fetches to the paused
  project produced transport noise. Spec now intercepts `*.supabase.co`
  and fulfills `[]` — the app's documented empty-data fallback; page-error
  assertions remain fully enforced. `/solutions` badge assertion corrected
  to the page's own copy (`Rank N • Sellability X.X/5`).
- **Old baselines** (`2cdc44b`, 1186-test, 80-browser claims) are
  historical — superseded by the bound run.

## G1–G23 corrected status

| Gap | Status | Proof layer |
|---|---|---|
| G1 ledger | closed (this addendum) | repo |
| G2 preserve work | closed — snapshot manifest verified (68/68 files, 0 secret paths) | repo |
| G3 final-state verify | closed — quiescent `043231e` + green run bound | CI |
| G4 secret scan | closed repo-side — history scan green, INC paths documented+exempted | CI |
| G5 billing | closed repo-side — double gate, allowlisted origin | CI |
| G6 intake | local closed (PGlite RLS); hosted open | repo → owner |
| G7 privacy | owner-gated | owner |
| G8 emailed-report | source-closed | repo |
| G9 economics | closed — fresh coverage incl. stale-suppression floors | CI |
| G10 DI | open by design — undetermined pending current Standard | owner |
| G11 currency | closed repo-side — null-FX preserved, thresholds removed | CI |
| G12 Whop | closed repo-side — server-verified, allowlist-gated | repo → owner |
| G13 positioning | closed — 248/248 | CI |
| G14 buyer | open — 0/11, human-owned | buyer |
| G15 CASL | tools closed; approval open | repo → owner |
| G16 claims | closed repo-side | CI |
| G17 braces exception | conditional — documented, expiry-enforced | repo |
| G18 coverage/browser | closed — 1276/1276 + 5 projects + WCAG in CI | CI |
| G19 content parity | closed — byte-parity vs HEAD monolith (105/105 keys) | CI |
| G20 tracking state | local-unit verified; browser spot-check pending | repo |
| G21 a11y/perf | automated closed (0 serious/critical, spec in CI); manual SR review open | CI → owner |
| G22 hosted config | blocked — Supabase paused | owner |
| G23 29-dim | partial — evidence attached; shallow dims named | repo |

## Still open (owner/deploy-gated — not claimed)

INC-001 key invalidation + log review · Supabase unpause → hosted RLS /
migration order / rate limits / retention / rollback · `WHOP_CEIP_*`
env + edge deploy · `/v5/me` removal post-staging · CASL sign-off ·
manual screen-reader review · buyer experiments 0/11.

**Decision:** repository remediation and repo-bound evidence complete;
staging blocked on owner actions; pilot blocked on owner + buyer evidence.
