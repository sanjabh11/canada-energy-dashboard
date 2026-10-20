# CEIP audit addendum — 2026-10-07

Fourth Codex audit pass on the remediated tree. Codex made no repository edits;
its ECC advisor returned STOP for staging/pilot (sound 0.18, unaddressed 0.85).
All statuses below are **local** evidence; hosted, CI-bound, owner, and buyer
layers remain open.

## Tree identity (regenerate before citing)

- HEAD: `2cdc44b6d85158865a167ec3b07f16b43677a119` (unchanged — all work is
  working-tree only)
- Tree fingerprint: see `node_modules/.cache/tree-fingerprint.txt` (SHA-256 of
  `git hash-object` over tracked files + porcelain untracked list, `.env*`
  excluded; regenerated at end of each cycle — do not quote a stale value)

## What this cycle fixed (repo-owned gaps from the Codex pass)

| Gap | Fix |
|---|---|
| G12 — edge function spoofable | `whop-verify-access` rewritten: caller `userId` removed entirely, identity derived from verified bearer token; CORS narrowed to `WHOP_ALLOWED_ORIGINS` allowlist (unset = deny); production 503 fail-closed if required env missing; per-target `docsStatus` metadata marks `/v5/me` + `/oauth/userinfo` as owner-unconfirmed against official Whop docs. 15 new tests. |
| G12 — mini-app claims | `$540/year`, "Powered by Whop", "verified credentials", "$2,600+ CEM equivalent", simulated-profit-as-outcome removed/qualified across `whop-mini/` (7 files); kept functional for existing members. |
| G13 — stale "sellable"/"buyer-ready" docs | `Top20.md` and `COMMERCIAL_STATUS.md` qualified inline; claim-boundary checker now covers COMMERCIAL_STATUS (429→430 files). |
| G4 — scans not in CI | `check:secret-scan` added to CI lint job (repo-hygiene and client-env-safety already wired). |
| G21 — baseline polluted by generated files | ESLint now ignores `coverage/`, `playwright-report*`, `test-results`; baseline resynced 1742→1739 warnings. |
| G6 — no local RLS proof | `tests/unit/leadIntakeRlsPolicy.test.ts` runs the actual migration SQL in embedded Postgres (PGlite): pre-migration anon/authenticated inserts succeed, post-migration denied, `service_role` survives. `@electric-sql/pglite` added as devDep. |
| G15 — cross-directory opt-out | New test proves a shared `--suppression-file` registry blocks outbound rows logged in a different campaign dir. |
| G14 — experiment pre-registration | All 11 `.positioning-audit/experiments.json` entries now carry `quoted_price` + `paid_commitment_measure` (WTP = paid LOI/deposit/paid pilot — replies and free pilots excluded), enforced by the schema test. Statuses remain `designed`/`draft_approval_gated` — 0/11 run. |
| G23 — stale ASVS statements | `docs/security/ASVS_CHECKLIST.md` gained a dated 2026-10-07 reconciliation banner listing the 4 known deltas vs current code; rows remain pre-remediation assertions, not hosted proof. |
| G18 — fifth project omitted | Firefox was missing binaries (post-reboot); installed, rerun: **16/16 PASS** → total **80/80 across all 5 projects** (chromium, firefox, webkit, Mobile Chrome, Mobile Safari). |
| G18 — critical-path coverage | `coverage.include` widened to `netlify/functions/**` + `supabase/functions/**`; new `check-critical-coverage.mjs` asserts per-file floors from `lcov.info` and is wired into CI after the coverage step. Global floor re-measured on this cycle's full run — see below. |

## Final-cycle verification (this tree, quiet machine)

- HEAD `2cdc44b6d85158865a167ec3b07f16b43677a119` (uncommitted tree);
  tree fingerprint `6fa6d6b0b34a3caa4639c4932bfc0bc323c3cd545acbc1904774067eb2643277`
- `pnpm exec tsc -b` — PASS (0 errors)
- `pnpm run lint` — PASS (0 errors, 1738 warnings ≤ 1739 baseline)
- `pnpm run build` — PASS
- All `check:*` gates + strict positioning verifier — PASS (claim checker now 430 files)
- Playwright all 5 projects — **80/80 PASS** (chromium + firefox + webkit +
  Mobile Chrome + Mobile Safari, 16 each)
- Full serial coverage — **168/168 files, 1186/1186 tests**; lines 21.42%
  (honest drop from 26.25% — `coverage.include` was widened to instrument
  `netlify/functions` + `supabase/functions`; floor re-ratcheted to 21)
- Critical-path floors from the same run: `leads.ts` 81.5%, `tierCalculations`
  98.3%, `tierPricing` 62.8%, `creditBankingSupport` 91.5%, `whop.ts` 53.7% —
  each now gated at measured-minus-margin via `check-critical-coverage.mjs`,
  wired into CI after the coverage step
- Embedded-Postgres RLS proof: `leadIntakeRlsPolicy.test.ts` — anon/authed
  inserts succeed pre-migration, are denied post-migration, service_role
  survives (real allow→deny, not a string assertion)

## Honest boundaries retained

- INC-001 rotation + log review — owner-gated; Supabase guidance confirms key
  creation does not revoke legacy keys; project restore can un-pause exposure.
- Hosted RLS denial, migration apply order, Netlify rate-limit rules,
  retention/erasure jobs — all deploy/owner-gated; no live evidence claimed.
- Whop provider contract (corrected 2026-10-08): `/oauth/userinfo` IS
  documented for OAuth user tokens, and `x-whop-user-token` is the documented
  same-origin iframe header; `GET /api/v1/users/{id}/access/{resource_id}` is
  the documented resource-scoped access check (`prod_`/`exp_`/`biz_` IDs).
  Only `/v5/me` remains unconfirmed — it stays last in the fallback chain and
  is flagged in code metadata; owner confirmation still required before
  hosted enablement.
- Buyer experiments 0/11; CASL legal sign-off; WCAG 2.2 AA full audit —
  unchanged owner/human gates.
- "Coverage passed" means the floor matched a measured result on this tree —
  not that coverage is comprehensive (26% lines is thin; critical-path floors
  now guard the security-sensitive files).
