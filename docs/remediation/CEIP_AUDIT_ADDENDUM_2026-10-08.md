# CEIP audit addendum — 2026-10-08

Fifth Codex audit pass. Codex remained read-only; this cycle fixes the
repo-owned gaps it identified. Statuses below are **local**; hosted, CI-bound,
owner and buyer layers remain open.

## Tree identity (2026-10-08)

- HEAD `2cdc44b6d85158865a167ec3b07f16b43677a119` (uncommitted dirty tree)
- Fingerprint: `c41763464ebc6589d8f9a4be1fe46c4345c63ddb0c05f83423ebc75d54562c1c`
  via `node scripts/tree-fingerprint.mjs` — hashes **contents** of tracked
  *and* untracked files (2334), excluding `.env*`/`*.pem`/`*.key` by filename.
- Prior fingerprint method hashed only tracked paths + untracked *names* —
  that limitation is corrected by the new script.

## What this cycle fixed (repo-owned gaps)

| Gap | Fix |
|---|---|
| G12 — unrelated-product membership grants paid tier | `whop-verify-access` no longer name-matches products: explicit `WHOP_CEIP_PRODUCT_IDS` / `WHOP_CEIP_EXPERIENCE_IDS` / `WHOP_CEIP_PRODUCT_TIER_MAP` mapping; unknown or missing config → free/denied; prod 503 if unset. |
| G12 — token transport / dead verify path | `x-whop-user-token` header honored (documented iframe flow); `Authorization: Bearer` via `/oauth/userinfo` (documented) first, `/v5/me` last-and-flagged. Mini-app no longer calls `whop-webhook/verify_token` (never existed) nor decodes JWT client-side; it posts Bearer to `whop-verify-access`. |
| G5 — checkout default-on | `stripe-create-checkout-session` gated by `CEIP_CHECKOUT_ENABLED=true` before auth/Stripe; default 403 `checkout_disabled`; negative tests. |
| G4 — secret-printing runbook | Incident register `git show 0422accf` replaced with metadata-only instructions (`--stat`, `cat-file`+count, never print values). |
| G15 — suppression not canonical | Repo CSV is template; all outreach tools require the canonical `SUPPRESSION_REGISTRY_LIVE.csv` (or `--suppression-file`/`CEIP_SUPPRESSION_REGISTRY`) and fail closed if absent; campaign-local fallback removed; dual-schema validation. |
| G14 — WTP not distinct | All 11 experiments now carry `experiment_class` (demand/usability/wtp/channel); WTP-class `success_threshold` requires the declared `paid_commitment_measure`. |
| G18 — CI/browser evidence | Playwright config now registers all 5 projects in CI; wedge spec runs all 5 with per-run JSON/HTML artifacts uploaded via `upload-artifact` (`if: always()`). |
| G18 — zero-hit server paths | `auth-session`, `whop-verify-access`, `whop-webhook`, `stripe-create-checkout-session` added to critical-coverage floors (83–92% real floors where covered; 0% printed visibly, not silent). |
| G3 — untracked-name fingerprint | `tree-fingerprint.mjs` hashes untracked contents. |
| `goal.md` | Phase table now carries status, proof layer, commit/tree ID, artifact/run ID, owner, next checkpoint per row. |
| G19 — content parity baseline | **Proven, not asserted**: `contentBaselineParity.test.ts` transpiles the pre-split monoliths from `git show 2cdc44b` (esbuild) and byte-compares serialized entries vs the split — 105/105 help keys, 15/15 modules, zero added/removed/changed. Forward-drift still hash-pinned in `contentParity.test.ts`. |

## Verification (this tree, local)

- `pnpm exec tsc -b` / `pnpm run lint` / `pnpm run build` — PASS
- All `check:*` gates + strict positioning verifier — PASS
- `check-critical-coverage` — PASS on retained `coverage/lcov.info`
  (9 paths; floors at measured-minus-margin)
- Playwright — 80/80 all 5 projects (prior run on same code paths)
- Whop docs contract verified against official docs 2026-10-08:
  `x-whop-user-token` header, `GET /api/v1/users/{id}/access/{resource_id}`,
  `/oauth/userinfo` all documented.

## Open owner/deploy gates (unchanged)

- INC-001 invalidation + log review; hosted RLS/migration order; Netlify
  deploy-level rate limits; `whop-verify-access` deploy needs
  `WHOP_API_KEY` + `WHOP_ALLOWED_ORIGINS` + `WHOP_CEIP_*` product mapping.
- CASL owner sign-off; 0/11 buyer experiments; WCAG 2.2 AA; committed-tree
  CI binding (needs an approved commit/PR — not yet created).

## Self-audit notes

- The mini-app previously fell back to decoding the JWT client-side — removed
  entirely; unverifiable tokens now produce the free tier, not a guessed user.
- The stripe gate sits before auth so a leaked anon key cannot invoke session
  creation even when the function is deployed.
- Suppression fail-closed means outreach tooling cannot silently run with no
  registry — the prior campaign-local default was the bypass Codex caught.
