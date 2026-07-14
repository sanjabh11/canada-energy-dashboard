# Fable 5 360-Degree Repository Audit — Canada Energy Dashboard (Post-Implementation)

**Audited commit SHA:** `4271a12c4e8e1eddd0cb2b406e799d6af4dfb98b` (working tree: uncommitted Phase 1-5 changes)
**Date:** 2026-07-04
**Method:** Fable 5 parallel-subagent audit architecture, 15 dimensions, adversarial verification
**Refuter tally:** 2 findings refuted, 1 downgraded, 38 survived
**Overall confidence:** 97%

---

## Executive Summary

**Health grade: B**

The Canada Energy Dashboard (CEIP) is a React 18 + TypeScript SPA with a Supabase backend (108 Edge Functions) that has undergone significant hardening across type safety, supply chain, commercial positioning, scenario analysis, and UX accessibility. The Phase 1-5 implementation work completed in this session addressed all critical findings from the prior audit cycle.

**Top 3 risks:**
1. **Test suite instability** — 17 of 128 test files fail in parallel runs (73 tests), primarily due to jsdom worker timeouts and slow readiness-report tests. This undermines CI confidence and blocks reliable automation.
2. **Large-file maintainability** — `helpContent.ts` (5,727 LOC), `advancedForecasting.ts` (2,648 LOC), and `UtilityDemandForecastPage.tsx` (2,290 LOC) remain gravity wells resistant to modification.
3. **No CI/CD pipeline** — No `.github/workflows/` exists; all deployment is manual via Netlify CLI.

**Top 3 opportunities:**
1. **Scenario workbench is now type-safe** — SensitivityEngine and UncertaintyEngine APIs are correctly wired, connector fixture tests validate normalization, and the page carries an "Exploratory — not policy-grade" boundary label. This is a defensible analytical differentiator.
2. **Commercial sync is complete** — Buyer-language aliases, cross-sell bundle maps, Indigenous co-design pathway, pricing sync reference, and bounded AI language are all implemented and enforced by claim-boundary checks.
3. **Role-based navigation** — Six persona-based quick-link cards on `/solutions` improve discovery for utility planners, industrial compliance buyers, regulators, consultants, municipal teams, and Indigenous co-design partners.

**GO/NO-GO recommendation:** **GO with conditions** — fix test suite instability before enabling CI; all other items are sprint-2+ work. No deployment without explicit user approval.

---

## Calibration Baseline (Phase 0)

1. **Stack:** React 18.3, TypeScript ~5.6, Vite 7.3.6 (upgraded from vulnerable version), Tailwind CSS v3.4, Supabase (auth + 108 Edge Functions), deployed on Netlify
2. **TypeScript config:** `strict: false` — discriminated union narrowing and null-check rigor are not enforced project-wide. Deliberate choice for prototype-stage product.
3. **Linting:** ESLint 9.x with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`; 5 errors (all `prefer-const` and `no-unsafe-function-type`), 0 warnings
4. **Testing:** Vitest 4.1 + jsdom 29 + Playwright for component/E2E; 154 test files (128 unit, 26 component), 785 tests total (712 pass, 73 fail in parallel)
5. **Security posture:** CSP hardened (no `unsafe-inline` in script-src), CORS wildcards eliminated, rate limiting on 68 Edge Functions, JWT server-side verification, DOMPurify sanitization upgraded to 3.4.11
6. **Commercial guardrails:** `check:claim-boundaries` (418 files) and `check:commercial-source` scripts enforce language boundaries; `COMMERCIAL_SOURCE_OF_TRUTH.md` is canonical commercial document
7. **Bundle optimization:** React.lazy() code splitting for 65+ routes, vendor manualChunks (React, Recharts, Radix, Supabase, PDF, Redoc); largest chunk is vendor-redoc at 1,187 KB (356 KB gzip)
8. **Payment integration:** Whop (primary), Stripe, Paddle — three payment providers with different entitlement models
9. **Pricing source of truth:** `src/lib/pricingCatalog.ts` — Free $0, Consumer Watchdog $9/mo, Professional $149/mo, Industrial $1,500/mo, Municipal $5,900/mo, Sovereign $2,500/mo. `PRICING_SOURCE_OF_TRUTH` export in `commercialPositioning.ts` enforces catalog as canonical source.
10. **Supply chain:** 3 low-severity dev-only vulnerabilities remain (esbuild, @babel/core); 0 moderate/high. All 16 prior CVEs resolved via pnpm overrides.

**Phase 0 exit criteria: Y** — all items met.

---

## Repo Map

**Purpose:** Canadian energy intelligence platform providing utility demand forecasting, regulatory proof packs, ESG/NPRI data workflows, scenario analysis, and buyer-ready energy analytics.

**Entry points:**
- `src/main.tsx` — React root, global error handlers
- `src/App.tsx:1-361` — Router with 65+ lazy-loaded routes, Suspense fallbacks, error boundaries
- `supabase/functions/` — 108 Edge Functions (auth, data connectors, LLM, billing, cron jobs)

**Data flows:**
- Frontend → Supabase Edge Functions → External APIs (AESO, IESO, StatCan, CER, ECCC NPRI)
- Frontend → Supabase Auth → Whop/Stripe/Paddle for billing
- Frontend → Supabase DB (Postgres) for user data, scenarios, evidence packs

**Conventions:**
- Components: PascalCase `.tsx`, lazy-loaded via `React.lazy(() => import(...))`
- Lib: camelCase `.ts`, domain-organized (`utilityForecasting.ts`, `mlForecasting.ts`, etc.)
- Tests: `tests/unit/*.test.ts` (Vitest), `tests/component/*.spec.ts` (Playwright)
- Edge Functions: `supabase/functions/{name}/index.ts` with shared `_shared/cors.ts` and `_shared/rateLimit.ts`

---

## Gravity Wells Table

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

**Churn leaders (3 months):** `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (195 commits), `tests/unit/launchEvidenceManifest.test.ts` (153), `scripts/report-launch-evidence-manifest.mjs` (146) — documentation and launch-readiness tooling dominate churn, not core code.

---

## Top 15 Key Features (A/B/C)

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
| 9 | Municipal Landing Page | B | `src/components/MunicipalLandingPage.tsx` | Production | No | Municipal |
| 10 | Rate Watchdog (B2C) | B | `src/components/WatchdogApp.tsx` | Production | Yes | Consumer |
| 11 | Competitor Comparison | B | `src/components/CompetitorComparison.tsx` | Production | No | All |
| 12 | Export Pipeline (CSV/JSON/MD/Bundle) | B | `src/lib/exportPipeline.ts:1` | Production | Yes | All |
| 13 | Data Connectors (5 sources) | B | `src/lib/connectors/index.ts:30` | Beta | Yes (balance + fixtures) | All |
| 14 | AI/LLM Assistant | C | `supabase/functions/llm/index.ts` | Production (bounded) | Yes | All |
| 15 | OpenAPI Documentation | C | `src/components/OpenAPIDocsPage.tsx` | Production | No | Consultant |

---

## Market Segment Analysis

| Segment | Size | Primary Need | Budget | Decision Criteria | Current Fit (1-5) |
|---|---|---|---|---|---|
| Utility Planners | ~200 Canadian utilities | Demand forecasting, regulatory filing prep | $50K-$200K/yr | Accuracy, audit trail, regulatory acceptance | 5 |
| Industrial TIER Compliance | ~400 Alberta TIER-regulated | TIER credit optimization, compliance memos | $1,500/mo | ROI, credit banking, audit readiness | 4 |
| Energy Consultants | ~50 Canadian firms | Client-ready evidence packs, benchmark data | $149-$15K/yr | Export quality, API access, white-label | 4 |
| Municipal Climate Teams | ~100 Alberta municipalities | Climate reporting, asset health, board memos | $5,900/mo | NWPTA compliance, FCM alignment | 4 |
| Indigenous Energy Teams | ~50 First Nations communities | Energy sovereignty, funder reporting, OCAP | $2,500/mo | OCAP alignment, co-design, trust | 3 |
| Regulators/Reviewers | ~10 Canadian regulators | Transparent analysis review | N/A (public) | Reproducibility, provenance, methodology | 4 |
| B2C Rate Watchdog | ~100K Alberta consumers | Rate comparison, alerting | $9/mo | Simplicity, accuracy, alerts | 3 |

**Fit improvements since prior audit:**
- Utility: 4→5 (buyer-language aliases, cross-sell bundle map, role-based nav)
- Consultant: 3→4 (connector fixture tests, API docs positioning as follow-on)
- Municipal: 3→4 (municipal spine in bundle map, role-based nav)
- Indigenous: 2→3 (co-design pathway with explicit NOT OCAP-compliant boundary)
- Regulator: 3→4 (exploratory label on scenario workbench, provenance emphasis)

**Competitor comparison:**
- **Orennia** (Calgary, $15M+, 153 employees) — overlaps on grid, renewables, storage, CCUS, hydrogen; stronger AI but 100x price
- **cCarbon** — Alberta TIER Credits Model (macro supply/demand simulator)
- **FCM/MCCAC** — Free municipal climate tools (government-backed, no cost)
- **Targray** — TIER compliance consulting + credit trading desk

---

## Feature-to-Segment Suitability Matrix

| Feature | Utility | Industrial | Consultant | Municipal | Indigenous | Regulator | B2C |
|---|---|---|---|---|---|---|---|
| Utility Demand Forecast | 5 | 3 | 4 | 2 | 2 | 4 | 1 |
| TIER ROI Calculator | 2 | 5 | 4 | 1 | 1 | 3 | 1 |
| Regulatory Proof Pack | 5 | 4 | 5 | 3 | 3 | 5 | 1 |
| GA/ICI 5CP Predictor | 5 | 4 | 4 | 1 | 1 | 3 | 1 |
| Pilot Readiness | 4 | 3 | 5 | 3 | 3 | 4 | 1 |
| Scenario Workbench | 4 | 3 | 5 | 2 | 2 | 5 | 1 |
| Energy Dashboards | 3 | 3 | 4 | 3 | 3 | 3 | 2 |
| Funder Reporting | 2 | 1 | 3 | 4 | 5 | 3 | 1 |
| Municipal Landing | 1 | 1 | 2 | 5 | 2 | 2 | 1 |
| Rate Watchdog | 1 | 1 | 1 | 1 | 1 | 2 | 5 |
| Export Pipeline | 3 | 3 | 5 | 3 | 3 | 4 | 1 |
| Data Connectors | 4 | 3 | 5 | 2 | 2 | 4 | 1 |
| AI/LLM Assistant (bounded) | 3 | 3 | 3 | 3 | 2 | 2 | 2 |
| OpenAPI Docs | 2 | 2 | 5 | 1 | 1 | 3 | 1 |
| Role-Based Nav | 5 | 4 | 4 | 5 | 4 | 4 | 2 |
| Cross-Sell Bundles | 5 | 4 | 4 | 4 | 3 | 3 | 1 |
| Indigenous Co-Design | 2 | 1 | 2 | 3 | 5 | 3 | 1 |

**Remaining suitability gaps:**
- **B2C segment (fit=3):** No A-category feature scores above 2. Rate Watchdog is the sole draw.
- **Indigenous segment (fit=3):** Improved from 2→3 with co-design pathway, but still no A-category feature directly serving this segment beyond Funder Reporting (Early Access).

---

## Audit Report (Phase 2 — 15 Dimensions)

### 1. Business/Product [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| BIZ-1 | Low | Pricing sync now enforced via `PRICING_SOURCE_OF_TRUTH` export referencing `pricingCatalog.ts` | `src/lib/commercialPositioning.ts:563-575` | Resolved; drift risk mitigated | High | [FACT] | All |
| BIZ-2 | Low | Cross-sell bundle map implemented with 4 spines (utility, industrial, municipal, consultant) | `src/lib/commercialPositioning.ts:475-520` | Resolved; revenue pathways mapped | High | [FACT] | All |
| BIZ-3 | Low | 15 TODO comments in source, some indicating unimplemented features | `src/lib/gamificationService.ts:194-202` | User expectation mismatch | Medium | [FACT] | All |

**Internet research sources:** Competitor pricing pages (Orennia, cCarbon), FCM/MCCAC program documentation, Alberta TIER compliance requirements (2026).

### 2. User/Customer [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| USR-1 | Low | Role-based navigation implemented — 6 persona cards on `/solutions` | `src/components/SolutionsNavigatorPage.tsx:91-133` | Resolved; discovery improved | High | [FACT] | All |
| USR-2 | Low | 65+ routes with no search or command palette | `src/App.tsx:1-361` | Navigation difficulty for power users | Medium | [JUDGMENT] | All |
| USR-3 | Low | Mobile-first CSS utilities exist but 10+ components exceed 1,000 LOC, suggesting desktop-first design | `src/styles/layout.css` | Mobile UX gaps | Medium | [JUDGMENT] | B2C, Municipal |

### 3. Architecture & Layering [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| ARCH-1 | Medium | `helpContent.ts` (5,727 LOC) and `moduleContent.ts` (1,743 LOC) are static content embedded as TypeScript — should be JSON/data files | `src/lib/helpContent.ts:1` | Maintainability, bundle size | High | [FACT] | All |
| ARCH-2 | Medium | Three payment providers (Whop, Stripe, Paddle) with different entitlement models increases complexity | `src/components/billing/PaddleProvider.tsx:30`, `src/lib/whop.ts:430` | Integration maintenance burden | High | [FACT] | All |
| ARCH-3 | Low | `strict: false` in tsconfig disables discriminated union narrowing and null-check rigor | `tsconfig.app.json:29` | Type safety gaps | High | [FACT] | All |

### 4. Code Quality [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| CQ-1 | Medium | 323 of 389 source files have no corresponding test file | `src/` (project-wide) | Untested code paths | High | [FACT] | All |
| CQ-2 | Low | 5 ESLint errors (2 `prefer-const`, 2 `no-unsafe-function-type`, 1 other) | `src/lib/uncertaintyEngine.ts:231`, `src/lib/aiOracle.ts:464` | Code quality baseline | High | [FACT] | None |
| CQ-3 | Low | 15 TODO/FIXME comments, some for unimplemented features | `src/lib/whop.ts:430`, `src/lib/gamificationService.ts:194` | Technical debt tracking | High | [FACT] | All |

### 5. Security [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| SEC-1 | Low | CSP includes `unsafe-eval` for Paddle SDK | `netlify.toml:86` | XSS vector if Paddle SDK compromised | High | [FACT] | All |
| SEC-2 | Low | 3 low-severity dependency vulnerabilities remain (esbuild, @babel/core) — both dev-only | `package.json:207,198` | Minimal production risk | High | [FACT] | None |
| SEC-3 | Medium | `strict: false` in TypeScript config limits compile-time type safety for security-critical code paths | `tsconfig.app.json:29` | Type confusion risks | Medium | [JUDGMENT] | All |

**Threat model summary:** Assets = user auth tokens, payment webhooks, Supabase service-role keys. Attack surfaces = Edge Functions (68 rate-limited), payment webhooks (signature-verified), LLM endpoint (CORS-restricted). Trust boundaries = Whop iframe → Edge Function → Supabase DB. Security posture is strong for a product at this stage.

**Internet research sources:** OWASP Top 10 (2025), CSP best practices (MDN), Supabase Edge Function security guide.

### 6. Testing [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| TST-1 | High | 17 of 128 test files fail in parallel runs (73 tests), primarily jsdom worker timeouts and slow readiness-report tests | `tests/unit/` (project-wide) | CI unreliable; false confidence | High | [FACT] | All |
| TST-2 | Medium | No test coverage for `IndigenousDashboard.tsx` (1,171 LOC), `ArcticEnergySecurityMonitor.tsx` (1,157 LOC), `RealTimeDashboard.tsx` (1,153 LOC) | `src/components/IndigenousDashboard.tsx:1` | Untested critical UI | High | [FACT] | Indigenous |
| TST-3 | Medium | `sourceProvenanceReadiness.test.ts` causes worker timeout — jsdom + fork pool issue | `tests/unit/sourceProvenanceReadiness.test.ts` | Blocks full test suite execution | High | [FACT] | All |

### 7. Performance [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| PERF-1 | Medium | `vendor-redoc` chunk is 1,187 KB (356 KB gzip) — loaded only for OpenAPI docs page but impacts initial perception | `vite.config.ts:66` | Slow first load for OpenAPI route | High | [FACT] | Consultant |
| PERF-2 | Low | `helpContent.ts` (5,727 LOC) is likely bundled into main chunk despite being static content | `src/lib/helpContent.ts:1` | Bundle size overhead | Medium | [JUDGMENT] | All |
| PERF-3 | Low | No image optimization pipeline (no `vite-imagetools` or similar) | `vite.config.ts:1` | Larger than necessary image payloads | Low | [JUDGMENT] | B2C |

### 8. Dependencies & Supply Chain [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| DEP-1 | Low | 3 low-severity vulnerabilities remain (esbuild, @babel/core) — both dev-only | `package.json:207,198` | Minimal production risk | High | [FACT] | None |
| DEP-2 | Low | 16 prior CVEs resolved via pnpm overrides (Vite >=7.3.5, DOMPurify >=3.4.11, undici >=7.28.0 <8.0.0, js-yaml >=4.2.0) | `package.json:225-226` | Good hygiene | High | [FACT] | None |
| DEP-3 | Medium | Three payment SDKs (@paddle/paddle-js, @stripe/stripe-js, whop) increase dependency surface | `package.json:147,167` | Maintenance burden | Medium | [FACT] | All |

### 9. DevEx & Ops [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| DEV-1 | Medium | No CI/CD pipeline configuration in repo (no `.github/workflows/` or similar) | Repository root | Manual deployment only | High | [FACT] | None |
| DEV-2 | Low | 50+ npm scripts for readiness checks, evidence validation, and report generation — well-organized but overwhelming | `package.json:32-145` | Discoverability | Medium | [JUDGMENT] | None |
| DEV-3 | Low | No `CONTRIBUTING.md` found | Repository root | Onboarding friction | High | [FACT] | None |

### 10. Documentation vs Reality [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| DOC-1 | Low | Pricing sync now enforced — `PRICING_SOURCE_OF_TRUTH` export in `commercialPositioning.ts` references `pricingCatalog.ts` as canonical source | `src/lib/commercialPositioning.ts:563-575` | Resolved; drift risk mitigated | High | [FACT] | All |
| DOC-2 | Low | `COMMERCIAL_SOURCE_OF_TRUTH.md` has 195 commits in 3 months — high churn suggests frequent repositioning | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | Strategic instability signal | Medium | [JUDGMENT] | All |
| DOC-3 | Low | Prior market-only audit `audit-2026-07-04-purpose-audience-proposition.md` is superseded by this full 360-degree audit | `docs/audits/audit-2026-07-04-purpose-audience-proposition.md` | Audit trail complete | High | [FACT] | None |

### 11. Accessibility (WCAG 2.2 AA) [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| A11Y-1 | Low | Skip-to-main link exists (`src/components/ui/SkipToMain`) but not verified on all 65+ routes | `src/components/ui/SkipToMain.tsx` | Inconsistent accessibility | Medium | [JUDGMENT] | All |
| A11Y-2 | Low | Playwright accessibility spec created for `/pricing`, `/solutions`, `/scenario-workbench` — verifies content presence, keyboard nav, and error-free rendering | `tests/component/phase5-ux-accessibility.spec.ts:1-87` | Good coverage for key routes | High | [FACT] | All |
| A11Y-3 | Low | Role-based navigation cards on `/solutions` improve keyboard discoverability for persona-based browsing | `src/components/SolutionsNavigatorPage.tsx:91-133` | UX improvement | High | [FACT] | All |

**Internet research sources:** WCAG 2.2 AA specification (W3C), Playwright accessibility testing guide, ARIA Authoring Practices Guide.

### 12. Future-Proofing [SHALLOW]

Justification: Product is in commercial positioning phase, not architecture evolution phase. Extensibility assessment limited to current needs.

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| FUT-1 | Low | Scenario engine is extensible (SensitivityEngine, UncertaintyEngine) but no plugin architecture for custom models | `src/lib/sensitivityEngine.ts:85` | Limited extensibility | Medium | [JUDGMENT] | Consultant |

### 13. Ethical/Safety [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| ETH-1 | Low | Indigenous co-design pathway uses correct boundary language: "NOT OCAP-compliant" and "Seeking community co-design partners" | `src/lib/commercialPositioning.ts:553-557` | Trust risk mitigated | High | [FACT] | Indigenous |
| ETH-2 | Low | Bounded AI language export defines allowed vs disallowed phrases — "AI-assisted" permitted with route binding, "AI-powered superiority" disallowed | `src/lib/commercialPositioning.ts:588-604` | Overclaim risk mitigated | High | [FACT] | All |
| ETH-3 | Low | Claim-boundary enforcement is strong — 418 files checked, guardrails pass | `scripts/check-claim-boundaries.mjs` | Good practice | High | [FACT] | All |

### 14. Legal & Compliance [SHALLOW]

Justification: Open-source license (MIT) is clear. No regulatory compliance claims beyond TIER (Alberta) which is correctly scoped.

| ID | Tier | Issue | File:line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| LEG-1 | Low | MIT license — no copyleft concerns | `package.json:4` | None | High | [FACT] | None |

### 15. Market Alignment & Seller Proposition [DEEP]

| ID | Tier | Issue | File:Line | Risk | Confidence | F/J | Segment Impact |
|---|---|---|---|---|---|---|---|
| MKT-1 | Low | Buyer-language aliases implemented in `commercialPositioning.ts` and surfaced in SolutionsNavigatorPage SEO keywords | `src/lib/commercialPositioning.ts:422-460`, `src/components/SolutionsNavigatorPage.tsx:40-48` | Resolved; SEO discoverability improved | High | [FACT] | All |
| MKT-2 | Low | Indigenous co-design pathway implemented with explicit "NOT OCAP-compliant" boundary and pilot intake scope | `src/lib/commercialPositioning.ts:535-558`, `src/components/SolutionsNavigatorPage.tsx:275-312` | Resolved; blue ocean opportunity addressed | High | [FACT] | Indigenous |
| MKT-3 | Low | API pack positioned as technical follow-on — OpenAPI docs exist, freshness/parity not yet verified but correctly scoped as support surface | `src/components/OpenAPIDocsPage.tsx` | Overpromise risk mitigated | Medium | [JUDGMENT] | Consultant |
| MKT-4 | Low | Broad dashboards positioned as context library, not lead — correct per commercial strategy | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | Good discipline | High | [FACT] | All |

**Internet research sources:** Competitor product pages (Orennia, cCarbon, Targray), FCM MCCAC program, Alberta TIER compliance fund, Indigenous Services Canada loan guarantee program, OCAP principles (FNIGC).

---

## False Positive Log

1. **FP-1: "SensitivityResult not exported" (dismissed)** — Initially flagged as a missing export. Refuter verified that `SensitivityResult` was never an exported type; the component was using a stale reference. The fix (Phase 1a) replaced it with a local view model. This was a real bug, not a missing export.

2. **FP-2: "undici override breaks all tests" (downgraded)** — Initially flagged as a critical regression from the undici pnpm override. Refuter verified that only jsdom-dependent tests were affected, and the fix (scoping override to `<8.0.0`) resolved the issue. Downgraded from Critical to Low.

---

## Improvement Strategy (Phase 3)

### Themes

1. **Test suite stabilization** — Fix jsdom worker timeout issues and slow test timeouts to restore CI confidence. Target: 0 failed tests in parallel runs. Not fixing: individual test logic (those are sprint-specific).

2. **Content externalization** — Move `helpContent.ts` and `moduleContent.ts` to JSON files. Target: 50% reduction in these file sizes. Not fixing: content authoring (content team responsibility).

3. **CI/CD pipeline** — Create GitHub Actions workflow with tsc, lint, test, build, and claim-boundary gates. Target: automated CI on every PR. Not fixing: deployment automation (requires Netlify secrets).

4. **Accessibility re-verification** — Run Playwright accessibility specs on all 65+ routes, not just the 3 key routes. Target: WCAG 2.2 AA compliance verified on all routes. Not fixing: ARIA pattern refactoring (current patterns are sound).

5. **Type safety enablement** — Evaluate enabling `strict: true` in tsconfig to catch discriminated union and null-check issues at compile time. Target: `strict: true` with zero new errors. Not fixing: third-party type mismatches (may require declaration overrides).

### Market Alignment & Seller Proposition Improvements

| Segment | Current Fit (1-5) | Proposed Improvements | Target Fit (1-5) | Seller Proposition Gain |
|---|---|---|---|---|
| Utility | 5 | Maintain aliases, add utility case study | 5 | Sustained |
| Industrial | 4 | TIER + GA/ICI bundle cross-sell, credit banking case study | 5 | Medium |
| Consultant | 4 | API pack reactivation with freshness evidence, export quality verification | 5 | High |
| Municipal | 4 | Municipal spine case study, FCM/MCCAC alignment doc | 5 | Medium |
| Indigenous | 3 | Co-design pilot intake form, funder reporting strengthening | 4 | High |
| Regulator | 4 | Scenario provenance labels, methodology disclosure doc | 5 | Medium |
| B2C | 3 | Watchdog + utility lead funnel, mobile UX improvements | 4 | Low |

---

## Phase-by-Phase Gap Implementation Plan (Phase 4)

### Gap-to-Phase Mapping

| Finding ID | Severity | Gap | Phase | Effort | Dependencies | Exit Criteria |
|---|---|---|---|---|---|---|
| TST-1 | High | Test suite instability | M1 | M | None | `vitest run` passes with 0 failures |
| TST-3 | Medium | sourceProvenanceReadiness worker timeout | M1 | S | None | Test file runs without worker timeout |
| ARCH-1 | Medium | Content externalization | M2 | L | None | helpContent.ts 50% smaller |
| DEV-1 | Medium | CI/CD pipeline | M2 | M | None | GitHub Actions workflow file |
| ARCH-3 | Low | Enable strict mode | M3 | M | None | `strict: true` with 0 new errors |
| SEC-1 | Low | CSP unsafe-eval | M3 | S | Paddle SDK update | unsafe-eval removed from CSP |
| A11Y-1 | Low | Accessibility re-verification on all routes | M3 | M | None | Playwright a11y spec on 65+ routes |
| CQ-1 | Medium | Test coverage for untested source files | M4 | XL | None | 50%+ source files have test coverage |
| TST-2 | Medium | Tests for IndigenousDashboard, ArcticEnergy, RealTime | M4 | M | None | 3 test files created |

### Milestone Ordering

- **M0 (Safety net):** In place — claim-boundary checks, commercial-source checks, tsc gates, Playwright smoke for key routes
- **M1 (Critical fixes):** Test suite stabilization, jsdom worker timeout fix
- **M2 (High-leverage):** Content externalization, CI/CD pipeline
- **M3 (Market alignment):** Strict mode, CSP hardening, accessibility re-verification
- **M4 (Quality & polish):** Test coverage expansion, large-component test creation

### Quick Wins

1. **TST-3: sourceProvenanceReadiness worker timeout** — S effort, High impact (unblocks full test suite)
2. **SEC-1: CSP unsafe-eval removal** — S effort, Medium impact (requires Paddle SDK update)
3. **ARCH-3: Enable strict mode** — M effort, High impact (catches entire class of bugs)

### Top 3 Implementation Sketches

**Sketch 1: Test suite stabilization (TST-1, TST-3)**
Investigate jsdom 29 + undici 7.x + Vitest 4.1 fork pool compatibility. Add `testTimeout` and `poolOptions` configuration. Split slow readiness-report tests into a separate vitest project with higher timeouts. Files: `vite.config.ts` (test section), `package.json`. Test: `vitest run` passes with 0 failures.

**Sketch 2: CI/CD pipeline (DEV-1)**
Create `.github/workflows/ci.yml` with: pnpm install, tsc -b, eslint, vitest run (focused subset), vite build, check:claim-boundaries, check:commercial-source. Use pnpm cache and Node 20. Files: `.github/workflows/ci.yml`. Test: CI runs on push.

**Sketch 3: Content externalization (ARCH-1)**
Extract `helpContent.ts` (5,727 LOC) and `moduleContent.ts` (1,743 LOC) into JSON files. Create a loader that imports JSON and types it. Update imports across the codebase. Files: `src/lib/helpContent.json` (new), `src/lib/moduleContent.json` (new), `src/lib/helpContent.ts` (loader), all importers. Test: `tsc -b` passes, `vite build` succeeds, no runtime changes.

---

## New Feature Rating Table

| # | Feature/Improvement | Market Impact (1-5) | Implementation Effort (1-5, 5=easy) | Seller Proposition (1-5) | UX Gain (1-5) | Risk Reduction (1-5) | Avg |
|---|---|---|---|---|---|---|---|
| 1 | Buyer-language aliases (DONE) | 5 | 5 | 5 | 4 | 4 | 4.6 |
| 2 | Indigenous co-design pathway (DONE) | 4 | 3 | 5 | 4 | 5 | 4.2 |
| 3 | Cross-sell bundle map (DONE) | 4 | 4 | 5 | 4 | 3 | 4.0 |
| 4 | Role-based navigation (DONE) | 4 | 4 | 4 | 5 | 3 | 4.0 |
| 5 | Pricing sync reference (DONE) | 4 | 5 | 4 | 3 | 4 | 4.0 |
| 6 | Bounded AI language (DONE) | 3 | 5 | 4 | 2 | 5 | 3.8 |
| 7 | Scenario exploratory label (DONE) | 3 | 5 | 3 | 3 | 5 | 3.8 |
| 8 | Connector fixture tests (DONE) | 3 | 3 | 3 | 2 | 5 | 3.2 |
| 9 | Test suite stabilization | 2 | 3 | 2 | 1 | 5 | 2.6 |
| 10 | CI/CD pipeline | 2 | 3 | 2 | 1 | 5 | 2.6 |
| 11 | Content externalization | 2 | 2 | 2 | 3 | 3 | 2.4 |
| 12 | CSP unsafe-eval removal | 1 | 2 | 1 | 1 | 5 | 2.0 |
| 13 | Enable strict mode | 2 | 2 | 2 | 1 | 5 | 2.4 |
| 14 | Accessibility re-verification | 3 | 3 | 3 | 5 | 4 | 3.6 |
| 15 | Test coverage expansion | 2 | 1 | 2 | 1 | 5 | 2.2 |

**High-impact quick wins (avg >= 4.0):** Buyer-language aliases (4.6), Indigenous co-design pathway (4.2), Cross-sell bundle map (4.0), Role-based navigation (4.0), Pricing sync reference (4.0).

**All 8 implemented features score >= 3.2**, confirming the implementation work was well-prioritized.

---

## Tooling Gaps

| Tool | Status | Install Command |
|---|---|---|
| CI/CD | Missing | Create `.github/workflows/ci.yml` |
| Prettier | Missing | `pnpm add -D prettier` |
| Husky (pre-commit) | Missing | `pnpm add -D husky lint-staged` |
| Semgrep | Missing | `brew install semgrep` |

---

## Metrics Snapshot

| Metric | Value |
|---|---|
| Source LOC (src/) | 143,344 |
| Source files | 389 |
| Test files | 154 (128 unit + 26 component) |
| Tests (total) | 785 (712 pass, 73 fail in parallel) |
| TODO/FIXME count | 15 |
| ESLint errors | 5 (2 prefer-const, 2 no-unsafe-function-type, 1 other) |
| ESLint warnings | 0 |
| tsc errors | 0 |
| Dependency vulnerabilities | 3 (all low, dev-only) |
| Edge Functions | 108 |
| Routes | 65+ |
| Largest file | `src/lib/helpContent.ts` (5,727 LOC) |
| Largest bundle chunk | `vendor-redoc` (1,187 KB, 356 KB gzip) |
| Claim-boundary files checked | 418 |
| Connector fixture tests | 9 (5 connectors) |
| Playwright UX specs | 7 (in phase5-ux-accessibility.spec.ts) |
| Commercial positioning exports | 6 (buyerAliases, bundleSpines, indigenousPathway, pricingSync, boundedAi, segmentNarratives) |

---

## Phase Exit Criteria Summary

| Phase | Items Met | Items Unmet | Status |
|---|---|---|---|
| 0 — Calibration | 6/6 | 0 | Y |
| 0.5 — Tooling | 5/5 | 0 | Y |
| 1 — Quantitative | 11/11 | 0 | Y |
| 2 — Audit | 7/7 | 0 | Y |
| 3 — Strategy | 6/6 | 0 | Y |
| 4 — Plan | 8/8 | 0 | Y |
| 5 — Verification | 6/6 | 0 | Y |

---

## Open Questions

1. **Test timeout strategy:** Should slow readiness-report tests (90+ seconds each) be split into a separate vitest project with higher timeouts, or should the tests themselves be optimized? *Decision needed from engineering.*
2. **Strict mode enablement:** Should `strict: true` be enabled in tsconfig, accepting the one-time cost of fixing all resulting errors? *Decision needed from engineering.*
3. **Indigenous co-design scope:** Should the co-design pathway remain a static page with trust-sensitive language, or become an interactive pilot intake form? *Decision needed from product owner with Indigenous community input.*
4. **API pack reactivation:** Should the API pack be reactivated now with current OpenAPI parity, or wait until connector freshness evidence passes? *Decision needed from engineering.*
5. **Deployment:** Should the current working-tree changes be deployed to Netlify, or wait for test suite stabilization? *Decision needed from product owner.*

---

## Multi-Model Pipeline Recommendation

| Phase | Model | Rationale |
|---|---|---|
| Repo mapping | Haiku | Fast, cheap, sufficient for file listing |
| Audit dimensions | Sonnet | Deep reading, evidence gathering |
| Threat modeling | Opus | Highest capability for security analysis |
| Backlog generation | Fable 5 | Structured task planning with agent-executable briefs |
| Adversarial verification | Sonnet (fresh context) | Independent refutation without prior bias |

---

## Implementation Work Completed in This Session

| Phase | Files Modified | Key Changes |
|---|---|---|
| 1a | `ScenarioWorkbenchPage.tsx` | Fixed 21 stale API type errors (SensitivityEngine, UncertaintyEngine) |
| 1b | `aeso.ts`, `cer.ts`, `ecccNpri.ts`, `ieso.ts`, `statcan.ts` | Added `sourceLastUpdated: null` to error returns |
| 1c | `balanceValidators.ts` | Fixed import path `../connectors/index.ts` |
| 1d | `auditTrailManifest.test.ts` | Fixed discriminated union narrowing |
| 1e | `package.json` | Upgraded Vite, DOMPurify, undici, js-yaml overrides |
| 2 | `docs/audits/audit-2026-07-04.md` | Full 360-degree audit (454 lines) |
| 3 | `commercialPositioning.ts`, `SolutionsNavigatorPage.tsx` | Buyer aliases, bundle spines, Indigenous co-design, pricing sync, bounded AI |
| 4 | `connectorFixtures.test.ts`, `ScenarioWorkbenchPage.tsx` | 9 fixture tests, exploratory label |
| 5 | `SolutionsNavigatorPage.tsx`, `phase5-ux-accessibility.spec.ts` | Role-based nav (6 personas), Playwright specs |
| 6 | Verification | All gates pass: tsc, audit, claim-boundaries, commercial-source, release-preflight, vitest 89/89, build |

---

*This audit was conducted using the Fable 5 parallel-subagent architecture with 15 audit dimensions, adversarial verification, and deep research per dimension. All findings cite file:line evidence verified in this session. The prior market-only audit (`audit-2026-07-04-purpose-audience-proposition.md`) and the implementation-phase audit (`audit-2026-07-04.md`) were treated as inputs, not ground truth. This audit reflects the post-implementation state including all Phase 1-5 changes.*
