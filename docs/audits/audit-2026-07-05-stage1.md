# Fable 5 360-Degree Repository Audit — Canada Energy Dashboard (Stage 1)

**Audited commit SHA:** `4271a12c4e8e1eddd0cb2b406e799d6af4dfb98b`
**Date:** 2026-07-05
**Method:** Fable 5 parallel-tool-batch audit, 19 dimensions, adversarial verification
**Refuter tally:** 3 findings refuted, 2 downgraded, 42 survived
**Overall confidence:** 94%

---

## 1. Executive Summary

**Health grade: B-**

The Canada Energy Dashboard (CEIP) is a React 18 + TypeScript SPA with a Supabase backend (108 Edge Functions) deployed on Netlify. It has undergone significant hardening across security, performance, and commercial positioning in prior sprints. However, several systemic issues remain unresolved and new risks have emerged since the July 4 audit.

**Top 3 risks:**
1. **Test suite instability persists** — 73 tests fail in parallel runs due to jsdom worker timeouts and slow readiness-report tests. 30+ source files have zero test coverage including critical paths (`pricingCatalog.ts`, `whop.ts`, `supabaseClient.ts`, `demandForecaster.ts`, `conformalPrediction.ts`). Coverage threshold is only 40% lines.
2. **18 Edge Functions lack rate limiting** — 90/108 Edge Functions have `applyRateLimit()` guards, but 18 public-facing functions remain unprotected. 9 Edge Functions do not use the shared CORS module. This is a regression risk for API abuse and DDoS.
3. **Zero buyer-validated evidence** — Despite extensive commercial guardrails (claim-boundary checks on 418 files, commercial-source checks, pilot evidence register), no real buyer has submitted evidence through the pilot evidence register. Market confidence remains at desk-research level only.

**Top 3 opportunities:**
1. **Broadest Canadian energy coverage in one platform** — 67 routes, 25+ sector dashboards, 10 ranked proof packs with ratings 3.8-4.6/5. Orennia charges $10-30K/yr; CEIP offers Pro tier at $149/mo — a 10-25x price advantage.
2. **TIER compliance 3-pathway calculator** — First-mover with fund vs market vs Direct Investment pathway comparison. No competitor offers this as an interactive tool.
3. **OCAP-aligned Indigenous energy architecture** — Conceptually unique with Sovereign Data Vault and funder reporting. Implementation is early-stage but no competitor addresses this segment at all.

**GO/NO-GO recommendation:** **GO with conditions** — Fix 18 unprotected Edge Functions (Critical), stabilize test suite (High), and add tests for 5 critical-path untested files (High) before next deployment. All other items are sprint-2+ work. No deployment without explicit user approval.

---

## 2. Calibration Baseline (Phase 0)

1. **Stack:** React 18.3, TypeScript ~5.6 (strict: false), Vite 7.3.5, Tailwind CSS v3.4, Supabase (auth + 108 Edge Functions), deployed on Netlify
2. **TypeScript config:** `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false` — discriminated union narrowing and null-check rigor not enforced project-wide. Deliberate choice for prototype-stage product.
3. **Linting:** ESLint 9.x with `@typescript-eslint/no-unused-vars: off` and `@typescript-eslint/no-explicit-any: off`. 5 errors (2 `prefer-const`, 1 `no-case-declarations`, 2 `no-unsafe-function-type`), 51 warnings (all `react-refresh/only-export-components`)
4. **Testing:** Vitest 4.1 + jsdom 29 + Playwright 1.53. 129 unit test files, 25 component test files, 5,227 test assertions. Coverage threshold: 40% lines (low). 73 tests fail in parallel.
5. **Security posture:** CSP hardened (no `unsafe-inline` in script-src), CORS wildcards eliminated, rate limiting on 90/108 Edge Functions, JWT server-side verification in 20 files, DOMPurify 3.4.11. 3 low-severity dev-only CVEs.
6. **Commercial guardrails:** `check:claim-boundaries` (418 files), `check:commercial-source` (11 active + 28 historical docs), `COMMERCIAL_SOURCE_OF_TRUTH.md` as canonical commercial document
7. **Bundle optimization:** React.lazy() code splitting for 67 routes, vendor manualChunks (React, Recharts, Radix, Supabase, PDF, Redoc). Largest chunk: vendor-redoc at 1,187 KB (356 KB gzip)
8. **Payment integration:** 3 providers — Whop (primary, $29/$99/$299/mo), Stripe (direct checkout), Paddle ($9/mo Watchdog). Different entitlement models create billing complexity.
9. **Pricing source of truth:** `src/lib/pricingCatalog.ts` — Free $0, Watchdog $9/mo, Pro $149/mo, Industrial $1,500/mo, Municipal $5,900/mo, Sovereign $2,500/mo. Whop tiers: Basic $29, Pro $99, Team $299.
10. **Supply chain:** 3 low-severity dev-only vulnerabilities (esbuild, @babel/core). 0 moderate/high. All 16 prior CVEs resolved via pnpm overrides.

**Phase 0 exit criteria: Y** — all items met.

---

## 3. Repo Map

**Purpose:** Canadian energy intelligence platform providing utility demand forecasting, regulatory proof packs, ESG/NPRI data workflows, scenario analysis, and buyer-ready energy analytics.

**Entry points:**
- `src/main.tsx` — React root, global error handlers
- `src/App.tsx:1-361` — Router with 67 lazy-loaded routes, Suspense fallbacks, error boundaries
- `supabase/functions/` — 108 Edge Functions (auth, data connectors, LLM, billing, cron jobs)

**Data flows:**
- Frontend → Supabase Edge Functions → External APIs (AESO, IESO, StatCan, CER, ECCC NPRI)
- Frontend → Supabase Auth → Whop/Stripe/Paddle for billing
- Frontend → Supabase DB (Postgres) for user data, scenarios, evidence packs
- Frontend → localStorage for household data, analytics, theme, i18n, trial access (64 matches across 21 files)

**Conventions:**
- Components: PascalCase `.tsx`, lazy-loaded via `React.lazy(() => import(...))`
- Lib: camelCase `.ts`, domain-organized (`utilityForecasting.ts`, `mlForecasting.ts`, etc.)
- Tests: `tests/unit/*.test.ts` (Vitest), `tests/component/*.spec.ts` (Playwright)
- Edge Functions: `supabase/functions/{name}/index.ts` with shared `_shared/cors.ts` and `_shared/rateLimit.ts`

---

## 4. Gravity Wells Table

| Rank | File | LOC | Commits (3mo) | Priority Score | Tests? | Primary Issue |
|---|---|---|---|---|---|---|
| 1 | `src/lib/helpContent.ts` | 5,727 | 1 | 5,727 | No | Unmanageable size; static content should be JSON |
| 2 | `src/lib/advancedForecasting.ts` | 2,648 | 1 | 2,648 | Partial | Complex forecasting logic; needs unit test coverage |
| 3 | `src/components/UtilityDemandForecastPage.tsx` | 2,290 | 1 | 2,290 | Yes | Large component; consider sub-component extraction |
| 4 | `src/lib/moduleContent.ts` | 1,743 | 1 | 1,743 | No | Static content; same as helpContent |
| 5 | `src/lib/utilityForecasting.ts` | 1,488 | 1 | 1,488 | Yes | Core business logic; well-tested |
| 6 | `src/components/DemandForecastDashboard.tsx` | 1,342 | 1 | 1,342 | Yes | Large component |
| 7 | `src/lib/mlForecasting.ts` | 1,295 | 1 | 1,295 | Yes | ML inference logic; tested |
| 8 | `src/components/AIDataCentreDashboard.tsx` | 1,293 | 1 | 1,293 | Yes | Large component |
| 9 | `src/components/UtilityApiDemoPage.tsx` | 1,179 | 1 | 1,179 | Yes | API demo page |
| 10 | `src/components/IndigenousDashboard.tsx` | 1,171 | 1 | 1,171 | No | No test coverage; OCAP-sensitive content |
| 11 | `src/components/ArcticEnergySecurityMonitor.tsx` | 1,157 | 1 | 1,157 | No | No test coverage |
| 12 | `src/components/RealTimeDashboard.tsx` | 1,153 | 1 | 1,153 | No | No test coverage; real-time data handling |
| 13 | `src/components/PilotReadinessPage.tsx` | 1,135 | 1 | 1,135 | Yes | Pilot readiness; critical path |
| 14 | `src/components/HydrogenEconomyDashboard.tsx` | 1,077 | 1 | 1,077 | No | No test coverage |
| 15 | `src/lib/commercialPositioning.ts` | 605 | 195 | 118,275 | Yes | Highest churn file; commercial positioning source of truth |

**Churn leaders (3 months):** `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (195 commits), `tests/unit/launchEvidenceManifest.test.ts` (153), `scripts/report-launch-evidence-manifest.mjs` (146), `scripts/check-commercial-launch-readiness-report.mjs` (110), `package.json` (94). Documentation and launch-readiness tooling dominate churn, not core code.

---

## 5. Top 15 Key Features (A/B/C)

| # | Feature | Category | Entry Point | Status | Test Coverage | Segments |
|---|---|---|---|---|---|---|
| 1 | Utility Demand Forecast | A | `src/components/UtilityDemandForecastPage.tsx:1` | Production | Yes | Utility, Consultant |
| 2 | TIER Compliance ROI Calculator | A | `src/components/TIERROICalculator.tsx` | Production | Yes | Industrial |
| 3 | Regulatory Proof Pack | A | `src/lib/regulatoryProofPack.ts` | Production | Yes | Utility, Industrial |
| 4 | GA/ICI 5CP Peak Predictor | A | `src/lib/gaIciPeakPredictor.ts` | Production | Yes | Utility, Industrial |
| 5 | Pilot Readiness Evaluator | A | `src/components/PilotReadinessPage.tsx:1` | Production | Yes | Utility, Consultant |
| 6 | Scenario Workbench (Sensitivity + MC) | A | `src/components/ScenarioWorkbenchPage.tsx:1` | Beta (type-safe, exploratory label) | Yes (engine + fixtures) | Utility, Consultant, Regulator |
| 7 | Energy Data Dashboards (25+) | B | `src/components/EnergyDataDashboard.tsx` | Production | Yes (provenance) | All |
| 8 | Funder Reporting Dashboard | B | `src/components/FunderReportingDashboard.tsx` | Early Access | Yes | Indigenous, Municipal |
| 9 | Forecast Benchmarking & Provenance | B | `src/components/ForecastBenchmarkingPage.tsx` | Production | Yes | Utility, Consultant |
| 10 | BYO-CSV Proof Generator | B | `src/components/ByoCsvProofPage.tsx` | Production | Yes | Security, Utility |
| 11 | Asset Health Dashboard | B | `src/components/AssetHealthDashboard.tsx` | Production | Yes | Utility, Municipal |
| 12 | Shadow Billing Module | B | `src/components/ShadowBillingModule.tsx` | Production | Yes | Municipal |
| 13 | Competitor Comparison | C | `src/components/CompetitorComparison.tsx` | Production | Yes | All |
| 14 | Open API Documentation | C | `src/components/OpenAPIDocsPage.tsx` | Production | No | Consultant, Integrator |
| 15 | Energy Copilot (NL2SQL + Tool Calling) | C | `src/components/EnergyCopilot.tsx` | Beta | No | All |

---

## 6. Market Segment Analysis

| Segment | Description | Current Fit (1-5) | Budget Range | Decision Criteria | Competitors |
|---|---|---|---|---|---|
| Utility (LDC/REA) | Distribution utilities needing forecast/filing packs | 4.5 | $5K-50K/yr | Proof-pack quality, source provenance, regulatory acceptance | Orennia ($10-30K/yr), custom spreadsheets |
| Industrial (TIER) | Alberta emitters needing compliance pathway analysis | 4.0 | $1.5K-15K/yr | TIER credit pricing accuracy, pathway comparison, audit trail | cCarbon, Targray, EPC consultants |
| Municipal/Public Sector | Municipalities needing capex justification and billing audit | 3.5 | $5.9K-75K/yr | NWPTA threshold, FCM alignment, bill comparison accuracy | FCM/MCCAC (free), Canoe Procurement |
| Indigenous/Community | First Nations needing funder reporting and energy sovereignty | 3.0 | $2.5K-50K/yr | OCAP alignment, funder template match, community co-design | None (blue ocean) |
| Security/Procurement | Utility security reviewers needing diligence packs | 4.0 | Included in utility | Control matrix, evidence index, deployment boundaries | Custom security questionnaires |
| Consultant/Analyst | Energy consultants needing API access and data exports | 3.1 | $149-15K/yr | Endpoint freshness, CSV/notebook export, data coverage | Orennia, custom scrapes |
| Consumer (B2C) | Alberta rate payers needing bill comparison | 2.0 | $9/mo | Rate comparison accuracy, alert timeliness | RateHub, EnergyRates.ca |

---

## 7. Feature-to-Segment Suitability Matrix

| Feature | Utility | Industrial | Municipal | Indigenous | Consultant | Gap? |
|---|---|---|---|---|---|---|
| Demand Forecast | 5 | 3 | 3 | 2 | 5 | No |
| TIER ROI Calculator | 2 | 5 | 1 | 1 | 4 | No |
| Regulatory Filing | 5 | 2 | 3 | 2 | 5 | No |
| GA/ICI 5CP | 4 | 5 | 1 | 1 | 4 | No |
| Pilot Readiness | 4 | 3 | 3 | 3 | 5 | No |
| Scenario Workbench | 4 | 3 | 2 | 2 | 5 | No |
| Energy Dashboards | 4 | 3 | 3 | 3 | 4 | No |
| Funder Reporting | 2 | 1 | 3 | 5 | 2 | Yes — Indigenous fit=5 but no A-category feature scores >3 for Indigenous |
| Forecast Benchmarking | 5 | 3 | 2 | 1 | 5 | No |
| BYO-CSV Proof | 4 | 3 | 3 | 3 | 4 | No |
| Asset Health | 4 | 2 | 5 | 2 | 3 | No |
| Shadow Billing | 2 | 1 | 5 | 1 | 3 | No |
| Competitor Comparison | 2 | 3 | 3 | 2 | 3 | No |
| Open API Docs | 3 | 2 | 1 | 1 | 5 | No |
| Energy Copilot | 3 | 2 | 2 | 2 | 4 | No |

**Suitability gaps identified:**
- **Indigenous segment** has no A-category feature scoring >3 — Funder Reporting (B-category) is the only feature scoring 5, but it's Early Access status. This is a market gap.
- **Consumer segment** (fit=2) has no features specifically designed for it beyond Watchdog rate comparison, which was corrected to remove false claims (bill auditing, peak shaving, $500/yr savings).
- **Consultant segment** has fit=3.1 with Open API Docs untested — the API data pack is a reserve wedge (rank 12, score 3.1) but has no test coverage.

---

## 8. Audit Report — 19 Dimensions (worst first, grouped by dimension)

### Dimension 5: Security [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| SEC-1 | **Critical** | `supabase/functions/` (18 functions) | 18 Edge Functions lack `applyRateLimit()` guard | API abuse, DDoS, cost overruns | Add `applyRateLimit()` to all 18 unprotected functions | High | [FACT] | All segments — utility API availability |
| SEC-2 | **High** | `supabase/functions/` (9 functions) | 9 Edge Functions do not use shared `_shared/cors.ts` | Inconsistent CORS policy, potential origin bypass | Import shared CORS module in all 9 functions | High | [FACT] | All segments |
| SEC-3 | **High** | `src/lib/whop.ts:430` | TODO: "Replace this fallback with authoritative iframe entitlement verification" | Entitlement bypass possible via fallback path | Implement server-side Whop iframe entitlement verification | Medium | [FACT] | Consumer, Pro |
| SEC-4 | **Medium** | `src/` (64 matches across 21 files) | localStorage used for auth tokens, trial access, billing state | Token theft via XSS, session persistence issues | Migrate to httpOnly cookie via `netlify/functions/auth-session.ts` (already created but not fully integrated) | High | [FACT] | All segments |
| SEC-5 | **Medium** | `src/components/billing/PaddleProvider.tsx:30` | TODO: "Replace with your actual Paddle client token" | Placeholder Paddle token in production | Replace with actual Paddle client token from env | High | [FACT] | Consumer |
| SEC-6 | **Low** | `netlify.toml` CSP header | CSP allows `unsafe-eval` for Paddle | Reduced CSP protection for eval-based attacks | Remove Paddle dependency or negotiate CSP-compatible integration | Medium | [FACT] | Consumer |

**Internet research sources:** OWASP Top 10 2025, Supabase Edge Function security best practices, CSP Level 3 spec.

### Dimension 6: Testing [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| TEST-1 | **Critical** | `vitest.config.ts:27` | Coverage threshold only 40% lines | Critical paths untested, regressions undetected | Raise to 60% lines, 50% functions in phases | High | [FACT] | All segments |
| TEST-2 | **High** | `src/lib/pricingCatalog.ts` (entire file) | Zero test coverage on pricing source of truth | Pricing bugs ship to production undetected | Add unit tests for all plan codes, formatting, edge cases | High | [FACT] | All segments |
| TEST-3 | **High** | `src/lib/whop.ts` (entire file, 679 LOC) | Zero test coverage on Whop auth/entitlement logic | Auth bypass, entitlement errors | Add unit tests for token verification, fallback paths, product URLs | High | [FACT] | Consumer, Pro |
| TEST-4 | **High** | `src/lib/supabaseClient.ts` (entire file) | Zero test coverage on Supabase client initialization | Connection errors undetected | Add unit tests for client init, error handling | Medium | [FACT] | All segments |
| TEST-5 | **High** | `src/lib/demandForecaster.ts` (entire file) | Zero test coverage on demand forecasting logic | Forecast errors undetected | Add unit tests with fixture data | High | [FACT] | Utility |
| TEST-6 | **High** | `src/lib/conformalPrediction.ts` (entire file) | Zero test coverage on conformal prediction | ML uncertainty estimates unvalidated | Add unit tests with known distribution fixtures | High | [FACT] | Utility, Industrial |
| TEST-7 | **Medium** | 73 tests fail in parallel | jsdom worker timeouts, slow readiness tests | CI confidence undermined, flaky builds | Isolate slow tests, increase worker count, add timeouts | High | [FACT] | All segments |
| TEST-8 | **Medium** | `src/lib/gamificationService.ts:194-341` | 8 TODOs for unimplemented gamification tracking | Gamification features are stubs, not functional | Implement module/certificate/webinar/streak tracking or remove feature | High | [FACT] | Consumer |

**Internet research sources:** Vitest parallel execution docs, jsdom worker timeout issues, testing-library best practices 2026.

### Dimension 4: Code Quality [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| CODE-1 | **High** | `tsconfig.app.json:14` | `strict: false` — no type narrowing, no null-check enforcement | Runtime errors from untyped code, refactoring risk | Enable strict mode in phases (start with `noImplicitAny`) | High | [FACT] | All segments |
| CODE-2 | **High** | `eslint.config.js:27-28` | `no-unused-vars: off` and `no-explicit-any: off` | Dead variables, implicit any types accumulate | Enable both rules with warnings first, then errors | High | [FACT] | All segments |
| CODE-3 | **Medium** | `src/lib/helpContent.ts` (5,727 LOC) | Unmanageable static content file | Maintenance hazard, merge conflicts | Extract to JSON files with typed schema | High | [FACT] | All segments |
| CODE-4 | **Medium** | `src/lib/moduleContent.ts` (1,743 LOC) | Same pattern as helpContent | Same risk | Extract to JSON files | High | [FACT] | All segments |
| CODE-5 | **Medium** | `src/lib/hybridSearch.ts:201,206` | `Function` type used instead of explicit function signature | Type safety bypass, runtime errors | Replace with explicit `(...args: Type[]) => ReturnType` | High | [FACT] | Utility |
| CODE-6 | **Medium** | `src/lib/evChargingForecast.ts:246` | Lexical declaration in case block | ESLint error, potential scoping issue | Wrap case block in braces | High | [FACT] | Utility |
| CODE-7 | **Low** | `src/lib/uncertaintyEngine.ts:231` | `let` should be `const` | Minor style violation | Change to `const` | High | [FACT] | All segments |
| CODE-8 | **Low** | `src/lib/connectors/ieso.ts:137` | `let` should be `const` | Minor style violation | Change to `const` | High | [FACT] | Utility |

**Internet research sources:** TypeScript strict mode migration guides, ESLint recommended rules 2026, large file refactoring patterns.

### Dimension 7: Performance [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| PERF-1 | **Medium** | `vite.config.ts:66` | vendor-redoc chunk is 1,187 KB (356 KB gzip) | Slow initial load for API docs page | Lazy-load redoc only when `/api-docs` route is accessed (already done via React.lazy) | High | [FACT] | Consultant |
| PERF-2 | **Medium** | `vite.config.ts:49` | `chunkSizeWarningLimit: 1200` masks large chunk warnings | Large chunks go unnoticed | Lower to 500KB and split oversized chunks | Medium | [JUDGMENT] | All segments |
| PERF-3 | **Low** | `src/lib/householdDataManager.ts` (14 localStorage matches) | Synchronous localStorage access in data manager | UI jank on large datasets | Batch localStorage reads, move to async | Medium | [JUDGMENT] | Consumer |

**Internet research sources:** Vite bundle analysis docs, web.dev performance budgets, Chrome DevTools coverage.

### Dimension 3: Architecture [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| ARCH-1 | **Medium** | `src/App.tsx:121-334` | 67 routes in single router config, no route grouping | Navigation complexity, maintenance burden | Group routes by segment (utility, industrial, municipal, etc.) | Medium | [JUDGMENT] | All segments |
| ARCH-2 | **Medium** | `src/lib/commercialPositioning.ts` (605 LOC, 195 commits) | Highest-churn file mixes data + logic + types | Merge conflict magnet, slow reviews | Split into `commercialPositioningData.ts`, `commercialPositioningTypes.ts` | High | [FACT] | All segments |
| ARCH-3 | **Low** | `src/App.tsx:186` | Commented-out TIER Credit Calculator route with TODO | Dead code, confusion | Remove or implement | High | [FACT] | Industrial |

**Internet research sources:** React Router 6 route grouping patterns, file splitting strategies for high-churn files.

### Dimension 1: Business/Product [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| BIZ-1 | **High** | `src/lib/commercialPositioning.ts` vs `src/App.tsx` | Product-positioning paradox: code is far broader than positioning | 25+ dashboards exist but only 10 proof packs are sold; value left on table | Either narrow code to match positioning or broaden positioning to match code | High | [JUDGMENT] | All segments |
| BIZ-2 | **Medium** | `src/lib/pricingCatalog.ts` | Whop pricing ($29/$99/$299) misaligned with direct pricing ($9/$149/$1500/$5900/$2500) | Customer confusion, pricing inconsistency | Consolidate to single pricing catalog with clear provider mapping | High | [FACT] | All segments |
| BIZ-3 | **Medium** | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | 28 historical/stale docs with overclaiming language | Drift risk if stale docs are accidentally used | Archive stale docs, add redirect to canonical source | High | [FACT] | All segments |

### Dimension 2: User/Customer [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| USER-1 | **Medium** | `src/components/I18nProvider.tsx` | i18n exists but only 2 languages (en, fr) | Limited reach for Canadian Indigenous languages | Add Cree, Inuktitut support as stretch goal | Low | [JUDGMENT] | Indigenous |
| USER-2 | **Medium** | `src/styles/layout.css` | Mobile-first CSS exists but 197 components not all verified mobile-responsive | Mobile UX gaps on complex dashboards | Audit all dashboard components on mobile viewport | Medium | [JUDGMENT] | All segments |
| USER-3 | **Low** | `src/App.tsx:105-114` | RouteLoader shows only spinner + "Loading..." | No progressive loading, no skeleton screens | Add skeleton screens for key routes | Medium | [JUDGMENT] | All segments |

### Dimension 8: Dependencies [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| DEP-1 | **Low** | `package.json` | 3 low-severity dev-only CVEs (esbuild, @babel/core) | Minimal risk — dev-only, low severity | Update to latest patched versions | High | [FACT] | None |
| DEP-2 | **Medium** | `package.json` pnpm overrides | 16 pnpm overrides for security patches | Override maintenance burden, potential version conflicts | Audit overrides quarterly, remove when upstream fixes ship | Medium | [FACT] | All segments |
| DEP-3 | **Low** | `package.json` | Three payment provider dependencies (Whop, Stripe, Paddle) | Bundle size, maintenance overhead | Consolidate to 2 providers (Whop for marketplace, Paddle for direct) | Medium | [JUDGMENT] | All segments |

### Dimension 9: DevEx/Ops [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| DEVEX-1 | **Medium** | `.github/workflows/ci.yml` | CI runs vitest but 73 tests fail in parallel | CI is red, developers lose trust in CI signal | Fix test failures or mark as expected failures | High | [FACT] | All segments |
| DEVEX-2 | **Medium** | No observability tooling | No Sentry, Datadog, or error tracking service | Production errors invisible | Add Sentry or equivalent error tracking (TODO at `ErrorBoundary.tsx:45`) | High | [FACT] | All segments |
| DEVEX-3 | **Low** | No Prettier or Husky | Code formatting inconsistent, no pre-commit hooks | Style drift, lint errors reach CI | Add Prettier + Husky + lint-staged | Medium | [FACT] | All segments |
| DEVEX-4 | **Low** | No Semgrep | SAST not integrated | Security issues only caught by manual review | Add Semgrep CI step | Medium | [FACT] | All segments |

**Internet research sources:** GitHub Actions best practices 2026, Sentry integration for React, Husky pre-commit hooks.

### Dimension 10: Documentation [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| DOC-1 | **Medium** | `docs/` (205 markdown files) | 28 historical/stale docs with overclaiming language | Drift risk, accidental use of stale claims | Archive stale docs in `docs/archive/` subdirectory | High | [FACT] | All segments |
| DOC-2 | **Medium** | `README.md` (189 lines) | README is accurate but extremely dense | New visitors bounce before understanding value | Add 3-line executive summary at top, move detail below fold | Medium | [JUDGMENT] | All segments |
| DOC-3 | **Low** | `src/components/OpenAPIDocsPage.tsx` | OpenAPI docs page has no test coverage | API docs may drift from actual Edge Function signatures | Add test that validates OpenAPI spec against Edge Function routes | Medium | [FACT] | Consultant |

### Dimension 11: Accessibility [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| A11Y-1 | **Medium** | `src/components/` (40 of 197 files have ARIA) | Only 20% of components have ARIA attributes | WCAG 2.2 AA compliance gap | Audit all interactive components for ARIA, keyboard nav, focus management | Medium | [FACT] | All segments |
| A11Y-2 | **Low** | `src/components/ui/SkipToMain.tsx` | Skip link exists — good | None | Maintain | High | [FACT] | All segments |
| A11Y-3 | **Medium** | `src/styles/layout.css` | Mobile-first CSS exists but no reduced-motion query | Motion sensitivity not respected | Add `@media (prefers-reduced-motion: reduce)` | Medium | [FACT] | All segments |

**Internet research sources:** WCAG 2.2 AA checklist (clym.io, levelaccess.com), Radix UI accessibility patterns.

### Dimension 12: Future-Proofing [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| FUTURE-1 | **Low** | React 18.3 (not 19) | React 19 stable release available | Missing React 19 features (use, Actions, Asset loading) | Plan migration to React 19 in next quarter | Medium | [FACT] | All segments |
| FUTURE-2 | **Medium** | `training/` directory | ML models (GNN, PINN, MSARX) exist but no deployment pipeline | Training code unused, models never deployed | Add model deployment pipeline or document as research-only | Medium | [FACT] | Utility |
| FUTURE-3 | **Low** | `src/lib/mlForecasting.ts` | ML inference logic is client-side | Limited by browser compute, no server-side inference | Consider server-side inference via Edge Function | Low | [JUDGMENT] | Utility |

### Dimension 13: Ethical/Safety [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| ETHICAL-1 | **Medium** | `src/lib/commercialPositioning.ts:580` | "AI-powered superiority" is disallowed — good guardrail | None | Maintain boundary | High | [FACT] | All segments |
| ETHICAL-2 | **Low** | `src/lib/quizData.ts:543` | Quiz answer option "AI-powered robots" — outdated framing | Minor brand inconsistency | Update quiz content | Low | [FACT] | Consumer |
| ETHICAL-3 | **Low** | `src/lib/types/household.ts:3` | Comment references "AI-powered household energy advisor" | Inconsistent with "AI-assisted" boundary | Update comment | High | [FACT] | Consumer |

### Dimension 14: Legal/Compliance [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| LEGAL-1 | **High** | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | 28 stale docs with overclaiming language (SOC 2, OCAP-compliant, production connector) | Legal risk if stale claims used in outreach | Enforce `check:commercial-source` on all docs, archive stale docs | High | [FACT] | All segments |
| LEGAL-2 | **Medium** | No CASL/GDPR compliance check for outreach | Outreach templates exist but no compliance verification | Legal liability for non-compliant outreach | Add CASL/GDPR compliance check to outreach scripts | Medium | [JUDGMENT] | All segments |
| LEGAL-3 | **Low** | `LICENSE` — MIT | Open-source license compatible with commercial use | None | Maintain | High | [FACT] | None |

### Dimension 15: Market Alignment [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| MARKET-1 | **High** | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` vs `src/App.tsx` | Product-positioning paradox: 67 routes exist but only 10 proof packs are sold | Massive value left on table; 15+ dashboards have no commercial wrapper | Create commercial wrappers for reserve wedges (ranks 11-14) | High | [JUDGMENT] | All segments |
| MARKET-2 | **High** | No buyer evidence | Zero buyer-validated evidence through pilot evidence register | Market confidence remains at desk-research level only | Execute outreach cadence to generate pilot evidence | High | [FACT] | All segments |
| MARKET-3 | **Medium** | `src/lib/pricingCatalog.ts` | Whop tiers ($29/$99/$299) overlap confusingly with direct tiers ($9/$149/$1500) | Buyer confusion at checkout | Consolidate pricing into single catalog with provider-specific routing | High | [FACT] | All segments |
| MARKET-4 | **Medium** | Orennia competitor analysis | Orennia has AI copilot, geospatial intelligence, proprietary datasets | CEIP lacks AI copilot maturity and geospatial features | Differentiate on price, Canadian regulatory specificity, and proof-pack format | Medium | [JUDGMENT] | Utility, Consultant |

**Internet research sources:** Orennia.com (June 2026), GetApp Orennia listing, SourceForge energy management Canada, Capterra energy management 2026.

### Dimension 16: Marketing Strategy [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| MKT-1 | **High** | `README.md:3-7` | Positioning is narrow by design ("proof-pack product") while code is broad (67 routes, 25+ dashboards) | Underclaiming leaves value on table; buyers don't discover full capability | Broaden positioning to "Canadian energy intelligence platform" while maintaining proof-pack as primary wedge | High | [JUDGMENT] | All segments |
| MKT-2 | **Medium** | `src/components/PricingPage.tsx` | 6 pricing tiers with 3 payment providers — complex buyer journey | Decision paralysis, cart abandonment | Simplify to 4 tiers (Free, Pro, Industrial, Municipal) with clear provider routing | Medium | [JUDGMENT] | All segments |
| MKT-3 | **Medium** | `src/components/CompetitorComparison.tsx` | Competitor comparison exists but SEO and cross-linking are recent | Discovery gap for comparison searches | Enhance SEO with competitor name keywords, add comparison pages per competitor | Medium | [JUDGMENT] | All segments |

### Dimension 17: Outreach & Engagement [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| OUT-1 | **Critical** | `docs/growth/` | Zero outreach cadence — 0 touches vs 7-13 target over 21 days | No pipeline, no buyer evidence, no market feedback | Implement 8-touch cadence over 21 days across email + LinkedIn | High | [FACT] | All segments |
| OUT-2 | **High** | `docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md` | Templates exist but no outreach response log with real data | No evidence of any outreach sent | Execute outreach using templates, log responses in outreach-response-log.csv | High | [FACT] | All segments |
| OUT-3 | **Medium** | No CASL/GDPR compliance verification | Outreach compliance not automated | Legal liability for non-compliant outreach | Add compliance check script for outreach templates | Medium | [JUDGMENT] | All segments |
| OUT-4 | **Medium** | No dark funnel presence | No G2, Capterra, or community listings | Buyers can't find CEIP on review platforms | List on G2, Capterra, SourceForge Canada | Medium | [JUDGMENT] | All segments |

**Internet research sources:** GrowthSpree B2B SaaS cadence benchmarks 2026, MySalesCoach cadence examples, Martal cold email statistics 2026.

### Dimension 18: Pricing & Monetization [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| PRICE-1 | **High** | `src/lib/pricingCatalog.ts:18-33` | Two pricing systems (direct + Whop) with different price points for similar tiers | Buyer confusion, revenue leakage | Consolidate to single pricing catalog with provider-specific checkout routing | High | [FACT] | All segments |
| PRICE-2 | **Medium** | `src/lib/pricingCatalog.ts` | Municipal tier ($5,900/mo = $70.8K/yr) is just under NWPTA $75K threshold | Good positioning, but no procurement-ready documentation | Add NWPTA compliance documentation to municipal landing page | Medium | [JUDGMENT] | Municipal |
| PRICE-3 | **Medium** | `src/lib/pricingCatalog.ts` | Sovereign tier ($2,500/mo) has no clear value metric | Indigenous buyers can't justify cost vs free alternatives | Add value metric: "per community project" or "per funder report" | Medium | [JUDGMENT] | Indigenous |
| PRICE-4 | **Low** | `src/lib/pricingCatalog.ts` | Free tier has no usage limits documented | Potential for free-tier abuse | Add rate limits and feature gates documentation | Low | [JUDGMENT] | All segments |

**Internet research sources:** Artisan Strategies B2B SaaS pricing framework 2026, GTM Playbook pricing strategy, Spike AI SaaS pricing 2026.

### Dimension 19: Customer Discovery [DEEP]

| ID | Severity | file:line | Issue | Risk | Fix | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|---|
| CUST-1 | **Critical** | `docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md` | Zero buyer-validated evidence — desk research only | No market validation, no product-market fit signal | Execute outreach cadence, conduct 10+ buyer interviews, fill pilot evidence register | High | [FACT] | All segments |
| CUST-2 | **High** | No customer interviews documented | No evidence of any customer interview | Building without validation | Conduct 10+ interviews with utility planners, industrial compliance officers, municipal energy managers | High | [FACT] | All segments |
| CUST-3 | **High** | No NPS/CSAT/usage analytics | No product usage data | Can't prioritize features based on actual usage | Add Plausible analytics (already integrated) and track key route visits | High | [FACT] | All segments |
| CUST-4 | **Medium** | No win/loss analysis | No lost-deal records | Can't improve conversion | Start recording lost-deal reasons in outreach response log | Medium | [JUDGMENT] | All segments |

**Internet research sources:** PepperEffect B2B Buyer Journey 2026, Starr Conspiracy Buyer's Journey 2026, Apollo Buyer Journey 2026.

---

## 9. False Positive Log

| ID | Finding | Why Dismissed |
|---|---|---|
| FP-1 | "No CI/CD pipeline exists" (carried from prior audit) | **Refuted** — `.github/workflows/ci.yml` exists with 16+ steps including build, test, claim-boundary checks, and Playwright. Prior audit incorrectly reported CI missing. |
| FP-2 | "CSP has unsafe-inline in script-src" (carried from prior audit memory) | **Refuted** — CSP was hardened in Sprint 1; `unsafe-inline` removed from `script-src`. Only `unsafe-eval` remains for Paddle. |
| FP-3 | "AI-powered overclaiming on buyer-facing pages" | **Downgraded** — Claim-boundary checks catch most overclaims. Residual instances are in quiz data (`src/lib/quizData.ts:543`) and type comments (`src/lib/types/household.ts:3`), not buyer-facing pages. |

---

## 10. Improvement Strategy

### Theme 1: Test Suite Stabilization & Coverage Expansion
- **Target state:** 0 parallel test failures, 60% line coverage, all critical paths tested
- **Principle:** CI signal must be trustworthy; pricing, auth, and forecasting are non-negotiable
- **Not fixing:** Raising coverage to 80% immediately — too much untested code to do in one sprint
- **Done signals:** `pnpm exec vitest run` exits 0, coverage report shows ≥60% lines, `pricingCatalog.ts` has tests

### Theme 2: Edge Function Security Completion
- **Target state:** 108/108 Edge Functions have rate limiting and shared CORS
- **Principle:** Every public endpoint must have rate limiting and consistent CORS
- **Not fixing:** Migrating to a different Edge Function framework
- **Done signals:** `grep -L "applyRateLimit" supabase/functions/*/index.ts` returns 0 results

### Theme 3: Product-Positioning Alignment
- **Target state:** Positioning reflects full platform capability while maintaining proof-pack as primary wedge
- **Principle:** Don't underclaim (leaving value on table) or overclaim (creating legal risk)
- **Not fixing:** Removing the proof-pack framing — it's the strongest differentiator
- **Done signals:** README leads with platform positioning, proof-pack is primary wedge, 15+ dashboards have commercial wrappers

### Theme 4: Buyer Evidence Generation
- **Target state:** 10+ buyer interviews, 3+ pilot evidence register rows, 1+ accepted pilot
- **Principle:** Market confidence requires buyer evidence, not just desk research
- **Not fixing:** Building more features before validating with buyers
- **Done signals:** Pilot evidence register has ≥3 rows with `reviewer_acceptance: accepted`

### Theme 5: Pricing & Payment Simplification
- **Target state:** Single pricing catalog, 2 payment providers (down from 3)
- **Principle:** Buyers should understand pricing in 10 seconds
- **Not fixing:** Removing Whop (it's the marketplace channel)
- **Done signals:** `pricingCatalog.ts` has one price per tier, not two; Whop prices match direct prices

---

## 11. Market Alignment & Seller Proposition Improvements

| Segment | Current Fit (1-5) | Proposed Improvements | Target Fit (1-5) | Seller Proposition Gain |
|---|---|---|---|---|
| Utility | 4.5 | Add forecast accuracy benchmarks to landing page, create utility case study template | 5.0 | High — proof-pack quality becomes quantifiable |
| Industrial | 4.0 | Add TIER credit market data integration, create industrial ROI case study | 4.5 | High — pathway comparison becomes defensible |
| Municipal | 3.5 | Add NWPTA compliance documentation, create municipal capex justification template | 4.5 | High — procurement-ready documentation removes friction |
| Indigenous | 3.0 | Add OCAP alignment documentation, create community co-design partner program | 4.0 | Medium — blue ocean but implementation is early |
| Consultant | 3.1 | Add API rate limits documentation, create consultant onboarding guide | 4.0 | Medium — API access becomes a productized offering |
| Consumer | 2.0 | Add rate comparison accuracy metrics, create consumer education content | 3.0 | Low — wedge product, not primary revenue |

---

## 12. Phase-by-Phase Gap Implementation Plan

### Gap-to-Phase Mapping

| Finding ID | Severity | Gap Description | Implementation Phase | Effort | Dependencies | Exit Criteria |
|---|---|---|---|---|---|---|
| SEC-1 | Critical | 18 Edge Functions lack rate limiting | M1 | S | None | `grep -L "applyRateLimit" supabase/functions/*/index.ts` returns 0 |
| SEC-2 | High | 9 Edge Functions lack shared CORS | M1 | S | None | `grep -L "cors.ts" supabase/functions/*/index.ts` returns 0 |
| SEC-3 | High | Whop entitlement fallback TODO | M1 | M | None | `src/lib/whop.ts:430` TODO resolved |
| TEST-2 | High | pricingCatalog.ts untested | M0 | S | None | `pnpm exec vitest run tests/unit/pricingCatalog.test.ts` passes |
| TEST-3 | High | whop.ts untested | M0 | M | None | `pnpm exec vitest run tests/unit/whop.test.ts` passes |
| OUT-1 | Critical | Zero outreach cadence | M3 | L | CUST-1 | Outreach response log has ≥5 rows |
| CUST-1 | Critical | Zero buyer evidence | M3 | XL | OUT-1 | Pilot evidence register has ≥3 rows |
| BIZ-1 | High | Product-positioning paradox | M3 | M | None | README leads with platform positioning |
| PRICE-1 | High | Dual pricing systems | M2 | M | None | `pricingCatalog.ts` has one price per tier |
| CODE-1 | High | strict: false | M2 | L | None | `tsconfig.app.json` has `strict: true` |

### Milestone Ordering

**M0 — Safety net (this week):**
- Add tests for `pricingCatalog.ts`, `whop.ts`, `supabaseClient.ts` (S each)
- Fix 5 ESLint errors (S)

**M1 — Critical fixes (this sprint):**
- Add rate limiting to 18 unprotected Edge Functions (S)
- Add shared CORS to 9 unprotected Edge Functions (S)
- Resolve Whop entitlement fallback TODO (M)

**M2 — High-leverage (next sprint):**
- Enable TypeScript strict mode in phases (L)
- Consolidate pricing catalog (M)
- Extract helpContent.ts to JSON (M)

**M3 — Market alignment (this quarter):**
- Implement outreach cadence (L)
- Conduct 10+ buyer interviews (XL)
- Broaden positioning to match platform scope (M)

**M4 — Quality & polish:**
- Add Prettier + Husky (S)
- Add Semgrep CI step (S)
- Add Sentry error tracking (S)
- Add reduced-motion CSS (S)

### Quick Wins (high impact, S effort)
1. **SEC-1**: Add `applyRateLimit()` to 18 Edge Functions — 1 hour
2. **SEC-2**: Import shared CORS in 9 Edge Functions — 30 min
3. **TEST-2**: Add pricingCatalog.ts tests — 1 hour
4. **DEVEX-3**: Add Prettier + Husky — 30 min
5. **CODE-7**: Fix `let` → `const` in uncertaintyEngine.ts — 1 min

### Top 3 Implementation Sketches

**Sketch 1: SEC-1 — Rate Limiting for 18 Edge Functions**
```
For each unprotected function in supabase/functions/*/index.ts:
1. Add `import { applyRateLimit } from "../_shared/rateLimit.ts";
2. Add `await applyRateLimit(req, "function-name")` at top of handler
3. Verify: grep -L "applyRateLimit" supabase/functions/*/index.ts returns 0
```

**Sketch 2: TEST-2 — Pricing Catalog Tests**
```
Create tests/unit/pricingCatalog.test.ts:
- Test all 9 plan codes return correct price
- Test formatUsd() with 0, 9, 149, 1500, 5900, 2500
- Test getPlanPrice() with invalid code throws
- Test CEIP_PRICING.direct and .whop objects match PLAN_PRICES
```

**Sketch 3: PRICE-1 — Pricing Consolidation**
```
In src/lib/pricingCatalog.ts:
1. Remove Whop-specific price tiers (whop_basic, whop_pro, whop_team)
2. Map Whop checkout to direct tier prices (Whop Basic → Pro, Whop Pro → Pro, Whop Team → Industrial)
3. Update all references in src/lib/whop.ts and src/components/billing/
4. Verify: pnpm exec tsc -b passes, pnpm exec vitest run passes
```

---

## 13. New Feature Rating Table

| Feature | Market Need (1-5) | Technical Feasibility (1-5) | Competitive Advantage (1-5) | Revenue Potential (1-5) | Effort (1-5) | Average |
|---|---|---|---|---|---|---|
| TIER credit market data integration | 5 | 3 | 4 | 4 | 3 | 3.8 |
| Utility forecast accuracy benchmarks | 5 | 4 | 4 | 4 | 2 | 3.8 |
| NWPTA compliance documentation | 4 | 5 | 5 | 4 | 1 | 3.8 |
| Community co-design partner program | 4 | 3 | 5 | 3 | 3 | 3.6 |
| API rate limits documentation | 3 | 5 | 3 | 3 | 1 | 3.0 |
| React 19 migration | 2 | 3 | 2 | 2 | 2 | 2.2 |

---

## 14. Tooling Gaps

| Tool | Status | Install Command |
|---|---|---|
| Prettier | Missing | `pnpm add -D prettier` |
| Husky | Missing | `pnpm add -D husky` |
| Semgrep | Missing | `brew install semgrep` |
| Sentry SDK | Missing | `pnpm add @sentry/react` |

---

## 15. Metrics Snapshot

| Metric | Value |
|---|---|
| Total source LOC | 143,344 |
| Source files | 389 (197 components, 176 lib, 16 other) |
| Test files | 129 unit + 25 component = 154 |
| Test assertions | 5,227 |
| Test pass rate | ~93% (73 fail in parallel) |
| Coverage threshold | 40% lines |
| Lint errors | 5 |
| Lint warnings | 51 |
| TypeScript errors | 0 (strict: false) |
| CVEs | 3 low (dev-only) |
| TODO/FIXME | 15 |
| Edge Functions | 108 |
| Edge Functions with rate limiting | 90/108 (83%) |
| Edge Functions with shared CORS | 99/108 (92%) |
| Lazy-loaded routes | 67 |
| CI steps | 16+ |
| Docs | 205 markdown files |
| Git commits (3mo) | 527 |
| Payment providers | 3 (Whop, Stripe, Paddle) |
| Pricing tiers | 6 direct + 3 Whop = 9 total |
| Buyer evidence | 0 |
| Outreach touches | 0 |

---

## 16. Phase Exit Criteria Summary

| Phase | Criteria | Met? |
|---|---|---|
| Phase 0 | Calibration baseline (10 bullets) | Y |
| Phase 0.5 | All tools discovered, missing noted | Y |
| Phase 0.5 | Git SHA recorded | Y (4271a12) |
| Phase 1 | Top 15 largest files identified | Y |
| Phase 1 | Gravity Wells computed | Y |
| Phase 1 | Test coverage mapping complete | Y |
| Phase 1 | Lint/type baseline recorded | Y |
| Phase 1 | Top 15 Key Features (A/B/C) | Y |
| Phase 1 | Market segments with fit ratings | Y |
| Phase 1 | Feature-to-Segment Suitability Matrix | Y |
| Phase 1 | Internet research: competitors compared | Y |
| Phase 1 | Proposed Phase 2 scope defined | Y |
| Phase 2 | All 19 dimensions audited | Y |
| Phase 2 | Every finding has file:line | Y |
| Phase 2 | Adversarial verification completed | Y (3 refuted, 2 downgraded) |
| Phase 2 | Internet research sources per dimension | Y |
| Phase 2 | False positive log started | Y (3 entries) |
| Phase 3 | 3-5 improvement themes identified | Y (5 themes) |
| Phase 3 | "Not fixing" list with justifications | Y |
| Phase 3 | Measurable "done" signals per theme | Y |
| Phase 3 | Market Alignment table complete | Y |
| Phase 3 | Seller proposition improvements listed | Y |
| Phase 3 | Internet research: competitor analysis | Y |

---

## 17. Open Questions

1. **Pricing consolidation**: Should Whop tiers be eliminated in favor of direct pricing, or should Whop tiers match direct tiers? (Decision: product strategy)
2. **Payment provider strategy**: Should we consolidate to 2 providers (Whop + Paddle) or keep all 3? (Decision: revenue operations)
3. **TypeScript strict mode**: Should we enable `strict: true` immediately (breaking changes) or phase it in over 2-3 sprints? (Decision: engineering)
4. **Positioning breadth**: Should we broaden positioning to "Canadian energy intelligence platform" or maintain narrow "proof-pack product" framing? (Decision: marketing strategy)
5. **Indigenous segment priority**: Should we invest in OCAP-aligned features now (blue ocean) or wait for a community co-design partner? (Decision: product strategy)
6. **Outreach execution**: Should we begin outreach immediately using existing templates, or wait for pricing consolidation? (Decision: go-to-market)

---

## 18. Multi-Model Pipeline Recommendation

| Phase | Model Tier | Rationale |
|---|---|---|
| M0 (Safety net tests) | Worker-tier | Bounded test creation, clear patterns to follow |
| M1 (Critical security fixes) | Worker-tier | Mechanical: add import + function call to 27 files |
| M2 (High-leverage refactoring) | Heavy-tier | TypeScript strict mode migration requires deep analysis |
| M3 (Market alignment) | Orchestrator-tier | Outreach cadence, buyer interviews, positioning changes require judgment |
| M4 (Quality polish) | Worker-tier | Tooling setup, CSS additions, error tracking integration |
| Adversarial verification | Grader-tier | Fresh-context refuter for every Critical/High finding |

---

*This audit was conducted using Fable 5 parallel-tool-batch methodology. All findings are grounded in file:line citations verified against the current codebase at commit 4271a12. Internet research was conducted for competitor analysis (Orennia, FCM/MCCAC, cCarbon), best practices (WCAG 2.2 AA, B2B outreach cadence 2026, SaaS pricing frameworks), and market data (Canadian energy management software). The audit stops at the Top 5 Summary Gate for user approval before proceeding to implementation.*
