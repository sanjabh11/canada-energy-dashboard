# TIER Credit-Limit Wedge — Peer-Reviewed Decision Record

Date: 2026-10-28
Branch: `codex/tier-credit-limit-wedge` (base `codex/green-button-truth-spine`)
HEAD: `4129b89`

## Scope

Records the peer-review cycle and evidence state for the TIER regulated
credit-use-limit wedge (commits `6c64030` → `e542699` → `16dac60` → `4129b89`),
so the owner can decide next steps on the evidence-gated items.

## Commit chain

| Commit | Change |
|--------|--------|
| `6c64030` | Regulated credit use limit (60/70/80/90% for 2023–2026+) applied in `tierPricing` + `tierCalculations` + local `mlForecasting`; `first_artifact` funnel wired. |
| `e542699` | `complianceYear` wired from UI into local + Edge calls; spread banner uses cap-adjusted effective spread; `TierRoiResults` gained cap fields; memo/appendix surface blend detail; `first_artifact` once-per-session. |
| `16dac60` | **Edge/local parity restored**: `supabase/functions/_shared/mlForecasting.ts` applies the same regulated schedule and blend; proof-pack blend wording conditional on field presence; `first_artifact` marker written after emit; new `tierEdgeParity` test suite. |
| `4129b89` | Strict compliance-year normalization (integer ≥2000 or clean 4-digit string, else asOf fallback) on Edge, local engine, `tierCalculations`, and UI; Edge accepts `as_of_date`/`credit_assumptions`; proof-pack blend gating is validity-based; parity suite expanded to 36-year sweep + malformed inputs. |

## Peer-review ratings (codex CLI, codereviewer role)

| Round | Target | Rating | Verdict |
|-------|--------|--------|---------|
| 1 | `e542699` | 4/10 | Do not approve pilot — production-path blocker: Edge `calculateTierScenario` priced 100% of obligation at market rate (no cap), disagreeing with local engine (CAD 500k vs 780k for identical 2025 input). |
| 2 | `16dac60` | 8/10 code readiness | Blocker closed; edge/local schedules byte-equivalent; blended arithmetic, rounding, parity tests verified. Remaining: edge input coercion (fixed in `4129b89`), presence-only blend gating (fixed), incomplete snake-case/handler coverage (partially fixed), duplicated schedule prose (parity sweep now serves as contract test). |

Evidence readiness was separately rated STOP/unverified in both rounds —
deployment, live data, licensing, and buyer validation are not code questions.

## Verification evidence (locally run)

- `pnpm exec tsc -b` — clean (exit 0) after each commit.
- `npx vitest run` on 9 affected files — 150/150 pass, including
  `tests/unit/tierEdgeParity.test.ts` (edge-vs-local schedule sweep 2000–2035,
  malformed-year fallback, string coercion, raw snake_case payload).
- `node scripts/check-claim-boundaries.mjs` — pass (431 files).
- `node scripts/verify-positioning-audit.mjs --strict` — pass, `warning_count: 0`.
- `node scripts/check-lint-warning-baseline.mjs` — 1738 ≤ 1742 baseline.
- `git diff --check` — clean.
- Peer full-suite observation (round 2): 1,398/1,399 pass; sole failure is
  `tests/unit/claimsLaneD.test.ts` vs `CommercialLandingPage.tsx` — unrelated
  to this wedge, recorded as a pre-existing/off-scope signal.

## Evidence layers — honest state

| Layer | Status |
|-------|--------|
| Implemented (local code) | ✅ `4129b89` |
| Locally tested | ✅ 150/150 targeted |
| CI-verified | ❌ no CI run evidenced |
| Staging/deployed | ❌ live Netlify bundle predates this branch; Edge function not redeployed |
| Owner-approved | ⏸ awaiting owner decision on this record |
| Buyer-validated | ❌ no buyer contact yet |

## Confirmed facts reducing prior uncertainty

- `tier_market_rates` **is defined in-repo**: migration
  `supabase/migrations/20260425_source_tables.sql` + `tier-simulator` reads it,
  `ingest-tier-market-rates` writes it. Implemented ≠ deployed.
- `schema.sql` / `data.sql` / `roles.sql` in worktree are 0-byte placeholders —
  no evidence about the live project.
- Live site `canada-energy.netlify.app` serves an older bundle; wedge strings
  absent as expected (branch not merged/deployed).

## Human gates still open (agent cannot/should not act)

1. **Deploy decision** — merging/deploying the wedge to Netlify + redeploying
   the `tier-simulator` Edge function is owner-gated. Deployed parity can only
   be verified after that.
2. **Supabase access** — verifying `tier_market_rates` exists in the live
   project needs owner-managed credentials (MCP currently unauthorized).
3. **Rate licensing** — quoting third-party credit prices (beyond the public
   Alberta fund-price schedule) needs a licensing determination before any
   live-rate claim.
4. **Buyer contact / outreach** — human-gated; the funnel + artifacts are now
   instrumented but no outreach should start until deploy + licensing are resolved.

## Claim boundaries preserved

- No claim of production connectivity, live pricing, buyer demand, ROI, or
  willingness to pay.
- Regulatory simplification (no CRTs, facility-specific adjustments, Direct
  Investment standard undetermined) remains disclosed in artifacts.
- Stale/fallback pricing gates unchanged.
