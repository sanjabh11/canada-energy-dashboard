# STATE.md — Fable 5 Audit Memory

## Verified facts      # Carried from 2026-07-04 audit (commit 4271a12)
- [FACT] Health grade: B (38 findings survived, 2 refuted, 2026-07-04)
- [FACT] SEC: CSP hardened, no unsafe-inline in script-src
- [FACT] SEC: CORS wildcards eliminated across 108 Edge Functions
- [FACT] SEC: Rate limiting on 68 public Edge Functions
- [FACT] SEC: JWT server-side verification, DOMPurify 3.4.11
- [FACT] CONFIG: strict: false in tsconfig.app.json (deliberate, prototype-stage)
- [FACT] CONFIG: ESLint 9.x, 5 errors (prefer-const, no-unsafe-function-type)
- [FACT] CONFIG: No Prettier, Husky, or Semgrep
- [FACT] TEST: 785 tests, 712 pass, 73 fail in parallel (jsdom timeouts, slow readiness tests)
- [FACT] PERF: vendor-redoc chunk 1,187 KB (356 KB gzip)
- [FACT] PERF: React.lazy() code splitting for 65+ routes, 97% bundle reduction
- [FACT] ARCH: 389 source files, 154 test files, 108 Edge Functions, 65+ routes
- [FACT] ARCH: Gravity wells: helpContent.ts (5727 LOC), advancedForecasting.ts (2648 LOC), UtilityDemandForecastPage.tsx (2290 LOC)
- [FACT] COMM: Claim-boundary checks on 418 files, commercial-source checks on 11 active + 28 historical docs
- [FACT] COMM: Pricing tiers: Free $0, Watchdog $9/mo, Pro $149/mo, Industrial $1,500/mo, Municipal $5,900/mo, Sovereign $2,500/mo
- [FACT] COMM: 3 payment providers: Whop (primary), Stripe, Paddle
- [FACT] COMM: Zero buyer-validated evidence
- [FACT] COMM: No outreach cadence (0 touches vs 8-16 target)
- [FACT] COMM: Product-positioning paradox (code broader than positioning)
- [FACT] CI: .github/workflows/ci.yml exists (install → security audit → migration verify → tsc → build → proof-pack → claim-boundary → commercial-source → repo-hygiene → client-env-safety → github-metadata → public-metadata → pilot-evidence → vitest → Playwright)
- [FACT] CHURN: 527 commits in last 3 months; docs and launch-readiness tooling dominate churn

## General rules
- Rule: Claim-boundary checks apply to all buyer-facing page findings
- Rule: COMMERCIAL_SOURCE_OF_TRUTH.md is canonical for commercial positioning
- Rule: Green color theme is non-negotiable
- Rule: No deployment without explicit user approval

## Open failures
- [OPEN] TEST: 73 tests fail in parallel (jsdom timeouts, slow readiness tests)
- [OPEN] CODE: helpContent.ts 5,727 LOC — needs content externalization
- [OPEN] CONFIG: strict: false in tsconfig.app.json
- [OPEN] TOOL: No Prettier, Husky, or Semgrep
- [OPEN] PERF: vendor-redoc chunk 1,187 KB
- [OPEN] COMM: Zero buyer-validated evidence
- [OPEN] COMM: No outreach cadence (0 touches vs 8-16 target)
- [OPEN] COMM: Product-positioning paradox (code broader than positioning)
- [OPEN] PAY: 3 payment providers with different entitlement models (Whop, Stripe, Paddle)

## Lessons learned
- Lesson: Claim-boundary checks pass but marketing copy still overclaims "AI-powered"
- Lesson: CI workflow exists but prior audit incorrectly reported it missing — always verify with ls/find
- Lesson: Test failures are primarily jsdom worker timeouts under parallel load, not logic failures

## Last session
- Last audit: 2026-07-04, commit 4271a12, 38 findings survived, 2 refuted, health grade B
- Next priority: test suite instability root cause, 19-dimension full audit, market alignment

## 2026-07-05 Stage 1 Audit Update

**Audit complete:** Stage 1 (Phases 0-3) delivered to `docs/audits/audit-2026-07-05-stage1.md` (600 lines)

**Findings summary:**
- 42 findings across 19 dimensions (3 refuted, 2 downgraded, 42 survived)
- 4 Critical: SEC-1 (18 Edge Functions no rate limiting), TEST-1 (40% coverage threshold), OUT-1 (zero outreach), CUST-1 (zero buyer evidence)
- 12 High: SEC-2/3, TEST-2/3/4/5/6, CODE-1/2, BIZ-1, LEGAL-1, MARKET-1/2, PRICE-1, OUT-2, CUST-2/3
- Overall health grade: B-

**Implementation Loop completed (M0-M4):**
- M0: 31 unit tests (pricingCatalog, whop, supabaseClient), 5 ESLint errors fixed
- M1: Rate limiting on 9 Edge Functions, shared CORS on 3, Whop entitlement fail-closed
- M2: ESLint warnings enabled for no-unused-vars and no-explicit-any
- M4: Reduced-motion CSS, Prettier, Husky, Semgrep CI, Sentry dynamic import

**Phase 2 WS1 completed (noImplicitAny sprint):**
- 116 noImplicitAny errors fixed across 31 files (Edge Functions, test fixtures, components, lib/ops)
- `noImplicitAny: true` enabled in `tsconfig.app.json`
- tsc -b: 0 errors, vitest: modified test files pass

**Gate status:** Stage 1 COMPLETE. Handoff packet created at `.fable5/handoff-to-outreach.json`
**Next action:** Stage 2 — Marketing/Outreach/Presales Audit (fable5-with-outreach)

## 2026-07-05 Stage 2A Audit Update

**Stage 2A complete (Phases M0-M4):**
- M0: Calibration — 10 verified facts from commercial infrastructure files
- M1: Marketing/Positioning — 5 findings (1 Critical, 2 High, 2 Medium); claim-boundary discipline is strongest dimension
- M2: Outreach/Engagement — 6 findings (3 Critical, 2 High, 1 Medium); CASL compliance gap blocks all Canadian outreach
- M3: Pricing/Monetization — 7 findings (2 High, 4 Medium, 1 Low); 9 tiers across 2 providers creates overlap confusion
- M4: Buyer Journey — 4 findings (1 Critical, 2 High, 1 Medium); 15-stage touchpoint matrix shows 11 missing touchpoints

**GTM Readiness Grade: D+**
**Total Stage 2A findings: 22** (5 Critical, 8 High, 7 Medium, 2 Low)

**Top 5 GTM Gaps:**
1. OUT-COMP-1 (Critical): No CASL compliance in outreach templates — $10M penalty risk
2. OUT-CAD-1 (Critical): Zero outreach cadence — 0 touches vs 6-8 benchmark
3. MKT-POS-1 (Critical): Positioning statement is a feature list, not a positioning statement
4. BJ-GAP-1 (Critical): No self-serve pilot signup flow
5. OUT-CHN-1 (Critical): Single-channel outreach vs 3-channel benchmark

**Gate status:** AWAITING_USER_APPROVAL at Top 5 Summary Gate (Stage 2A)
**Next action:** User approves → proceed to Stage 2B (M5-M8) or implementation of top 5 gaps

## 2026-07-05 Stage 2 Complete

**Stage 2B complete (Phases M5-M9):**
- M5: Sales Enablement — 5 findings (1 Critical, 2 High, 2 Medium); zero case studies, zero battle cards, demo runbook is internal-only
- M6: GTM Readiness — 2 findings (1 High, 1 Medium); overall score 2.5/5 (50%); strongest: pricing + compliance, weakest: outreach + sales enablement
- M7: Customer Validation — 6 findings (1 Critical, 2 High, 3 Medium); zero pipeline data, 3 deal-stall points, ~1-2 pilots/month throughput
- M8: Competitive Intelligence — 7 findings (0 Critical, 2 High, 3 Medium, 2 Low); 9-dimension matrix vs Orennia/Enverus/cCarbon; no battle cards
- M9: Improvement Plan — 10 prioritized tasks in 3 waves; 5 unresolved strategic decisions

**Total Stage 2 findings: 42** (7 Critical, 15 High, 17 Medium, 3 Low)
**GTM Readiness Grade: D+** (score 2.5/5)

**Deliverable:** `docs/audits/outreach-audit-2026-07-05.md` (516 lines)

**Top 5 implementation priorities (Wave 1, all Small effort):**
1. CASL compliance footer for all outreach templates
2. Positioning statement rewrite (Dunford framework)
3. Messaging hierarchy documentation (message pyramid)
4. Orennia battle card
5. 5 Plausible conversion events instrumented

**Gate status:** Stage 2 COMPLETE. Awaiting user decision on implementation vs strategic decisions.
**Next action:** User chooses → implement Wave 1 tasks, or resolve strategic decisions first, or both in parallel
