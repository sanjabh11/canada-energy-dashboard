# CEIP audit addendum — 2026-11-27 (Product-Value Sprint rebind)

This addendum records the exact evidence boundary for the product-value sprint.
It does not upgrade hosted Supabase, Whop, legal, accessibility, performance,
or buyer evidence.

## Bound source and CI receipt

- Bound source: `5f26fa9cc1d877cfb19be900be8aaa4e55fc9b47` on
  `codex/product-value-spine-2026-11-27`.
- Exact-head CI run:
  [45984013531](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45984013531).
- Required verification jobs: `lint-typecheck`, `test`, and `build-and-smoke`
  all concluded `success` for the bound source.
- `evidence-binding` concluded `failure` because the documents named the prior
  milestone at the time the code run executed. This docs-only rebind is intended
  to make the next exact-head run four-job green; that future result is not
  claimed here.
- CI evidence artifact: `15191817955`, digest
  `sha256:14900d9e218584c3fe31dadb8f324e71aa1c2ab56a7d56a9ee1889b871b01e86`.
- Coverage artifact: `15191335629`, digest
  `sha256:1a3bbdc5caf6d0769ba518f727fff7771802482f7edafe9681a7c799edf7be9c`.
- The PR run did not produce a Netlify Deploy Preview.

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
- Documentation rebind: **in progress** until the docs commit's exact-head CI
  run reports `evidence-binding=success`.
- Hosted staging: **STOP** — no migration, RLS/grants, function, storage,
  backup/restore, retention, rate-limit, monitoring, or rollback evidence.
- Pilot: **STOP** — privacy/CASL/legal approval, manual WCAG, deployed
  performance, Whop deployment configuration, and 13 paid experiments (0
  executed) remain open.

The next run may close only the documentation-binding layer. It cannot close
the owner or buyer gates above.
