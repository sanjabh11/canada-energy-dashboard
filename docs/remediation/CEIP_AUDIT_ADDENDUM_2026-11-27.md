# CEIP audit addendum — 2026-11-27 (Product-Value Sprint rebind)

This addendum records the exact evidence boundary for the product-value sprint.
It does not upgrade hosted Supabase, Whop, legal, accessibility, performance,
or buyer evidence.

## Bound source and CI receipt

- Bound source: `7d2c549de8eafa8e456526b2cbe5fa94e95fda13` on
  `codex/product-value-spine-2026-11-27`.
- Exact-head CI run:
  [45996032177](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45996032177).
- Required source verification jobs: `lint-typecheck`, `test`, and
  `build-and-smoke` concluded `success`; `evidence-binding` is the expected
  pre-rebind staleness failure because this document still named the prior
  receipt when the source run executed.
- CI evidence artifact: `15196807837`, digest
  `sha256:bad759475d931772a417185ab09c0a1f4624986b094b9c17f12c113061f73c95`.
- Coverage artifact: `15195708073`, digest
  `sha256:5eb38fc7e091446156e51ffd2724c87b24f540a3b51e5288b5b23dbbe51f2b4c`.
- The PR run did not produce a Netlify Deploy Preview.

### Historical receipts retained

- Code commit `5f26fa9cc1d877cfb19be900be8aaa4e55fc9b47` / run
  `45984013531` had the three required verification jobs green and the
  expected pre-rebind `evidence-binding` failure.
- Docs/PDF commit `605a8985a9fb65e6abe9d524bdfc11e1ff47b862` / run
  `45987365111` is retained as **failure**: its addendum increased the docs
  inventory from 267 to 268 while EV-005 still claimed 267. The follow-up
  corrected the evidence artifacts without changing product code.
- Corrective copy commit `d930a2cbd0db9d371f1a466953b9aa758686507a` / run
  `45995260412` is retained as **failure**: `uiClaimsDrift.test.ts` caught the
  missing canonical `Ontario GA ICI 5CP` workflow phrase after the starter was
  made region-neutral. The follow-up source commit `7d2c549de8eafa8e456526b2cbe5fa94e95fda13`
  restores the phrase while explicitly stating that the starter is synthetic,
  not Ontario or Alberta utility evidence.

## Follow-up receipt — documentation inventory correction

- Docs/PDF commit `605a8985a9fb65e6abe9d524bdfc11e1ff47b862` was tested by
  [run 45987365111](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45987365111).
- That run is retained as **failure**, not replaced: `test` and the positioning
  verifier found one real EV-005 drift (`claimed docs=267`, `actual docs=268`)
  introduced by this addendum itself. The correction changes only positioning
  evidence artifacts and this receipt; it does not weaken the verifier or alter
  product code.

## Product-value implementation evidence

The code-bearing commit added the browser-local three-step proof workflow,
generic `kWh`/`kW` ingestion and conversion provenance, region-neutral starter
copy, neutral tax language, owner-approved legal contact text, CAD hypothesis
pricing, and the 13-designed/0-executed experiment synchronization. No
Supabase, Whop, workflow, checkout, deployment, outreach, or production files
were changed in this sprint.

The timestamp contract is intentionally asymmetric:

- local-clock `kWh`/`kW` timestamps such as `2026-07-15 14:00` are retained with
  a visible `timezone_ambiguous` warning and a schema check of `review`;
- the explicit `strictTimezone` parser option rejects those rows;
- date-only, duplicate, non-monotonic, irregular, negative, and non-finite
  energy rows remain rejected with no usable rows.

## Local verification on the implementation tree

| Check | Result |
| --- | --- |
| `pnpm exec tsc -b --pretty false` | PASS |
| `pnpm run lint` | PASS, 0 errors / 1,696 warnings (baseline 1,742) |
| `pnpm run build` | PASS |
| Expanded Vitest slice (11 files) | PASS, 132/132 |
| `pnpm run test:wedge-prototype-routes` | PASS, 16/16 Chromium |
| `scripts/verify-positioning-audit.mjs --strict` | PASS, 0 warnings |
| `scripts/check-claim-boundaries.mjs` | PASS |
| `scripts/check-commercial-source-docs.mjs` | PASS |
| Product-value Chromium smoke | PASS, 2/2; no raw CSV request body |
| `git diff --check` | PASS |
| retired `pilot-inquiry@ceip.energy` search | 0 matches in `src`/`tests` |

## PDF artifact

The headless Chromium smoke generated and the docs commit stages:
`.positioning-audit/artifacts/forecast-benchmark-appendix.pdf`.
It is non-empty, begins with `%PDF-`, and has SHA-256
`ddbe499e56b64241fd97644b2693f169f145bf827c9ac3c2b3bde81577bb0e22`.

## Worktree and exclusions

The intentional untracked artifacts remain outside Git:
`.fastembed_cache/`, `data.sql`, `roles.sql`, and `schema.sql`. The tracked
`coverage/lcov.info` deletion remains preserved from the checkpoint. No
credential value was read or printed.

## Proof-layer decision

- Repository implementation: **implemented + locally tested + CI-verified** at
  the required three-job layer for `5f26fa9`.
- Documentation rebind: **in progress** for source
  `7d2c549de8eafa8e456526b2cbe5fa94e95fda13` / `45996032177`; the next
  document-only CI run must make the evidence-binding job green.
- Hosted staging: **STOP** — no migration, RLS/grants, function, storage,
  backup/restore, retention, rate-limit, monitoring, or rollback evidence.
- Pilot: **STOP** — privacy/CASL/legal approval, manual WCAG, deployed
  performance, Whop deployment configuration, and 13 paid experiments (0
  executed) remain open.

The next run may close only the documentation-binding layer. It cannot close
the owner or buyer gates above. The inverse-containment diff from checkpoint
`4da02aaf8592e6fbca75276aa0610dbd7af13684` to the corrective source lists
exactly the seven approved paths; the broader `4da02aa`→`6106405` comparison
includes historical evidence/docs differences and is not a reason to revert
them.
