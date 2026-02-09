# Canada Energy Intelligence Platform — Integrated Roadmap

> Generated: 2026-02-09 | All Sprints 0–4 Complete | Build: `tsc` ✅ `vite build` ✅

---

## Executive Summary

Five sprints delivered across security hardening, code quality, UI/UX, and performance optimization. The platform is a React 18 + TypeScript + Vite SPA with 80+ Supabase Edge Functions, deployed on Netlify.

| Sprint | Status | Headline Impact |
|--------|--------|-----------------|
| 0 — Onboarding | ✅ Done | Repo structure mapped, toolchain validated |
| 1 — Security | ✅ Done | 4 critical + 4 high + 4 medium findings fixed |
| 2 — Code Quality | ✅ Done | 10.6K dead lines removed, 16 unused deps pruned |
| 3 — UI/UX | ✅ Done | Mobile-first CSS, WCAG 2.2 AA, responsive grids |
| 4 — Performance | ✅ Done | Main dashboard 3,024KB → 442KB (85% reduction) |

---

## Sprint 1: Security Audit & P0 Fixes

### Critical (P0)
- **CORS Wildcard Elimination** — 0 wildcard `Access-Control-Allow-Origin` remain across all 86 Edge Functions. All use shared `_shared/cors.ts`.
- **Rate Limiting** — `applyRateLimit()` guard on 68 public Edge Functions. Endpoint-specific limits (LLM: 20/min, Digital Twin: 10/min, Stripe: 10/min). CORS-aware 429 responses.
- **JWT Verification** — `WhopMiniApp.tsx` now verifies tokens server-side; fallback caps at `free` tier.
- **Dependency CVEs** — jspdf 3.0.4→4.1.0, jspdf-autotable 5.0.2→5.0.7.

### High
- Removed VITE_ prefix from service role key, Stripe secret, Whop API key in `.env`.
- Removed hardcoded Supabase keys from `netlify.toml`.
- Fixed webhook signature bypass in `stripe-webhook` and `whop-webhook`.
- DOMPurify sanitization in `HelpButton.tsx`, HTML escaping in `helpContent.ts`.

### Medium
- Removed deprecated `X-Frame-Options` and `X-XSS-Protection` headers.
- Removed duplicate CSP meta tag from `index.html`.
- Hardened CSP: removed `unsafe-inline` from `script-src`, added `object-src none`.

### Files Changed
- `supabase/functions/_shared/cors.ts` — removed wildcard backward-compat path
- `supabase/functions/_shared/rateLimit.ts` — `applyRateLimit` guard, OPTIONS skip
- `supabase/functions/_shared/validation.ts` — `getCorsHeaders` re-exports from `cors.ts`
- 68+ Edge Function `index.ts` files — CORS + rate limiting
- 18 inline `buildCorsHeaders` patterns replaced with shared import
- 4 broken multi-line imports fixed, 12 orphaned `ALLOWED_ORIGINS` arrays cleaned

---

## Sprint 2: Code Quality & Refactoring

### 2.1 Dead Code Cleanup
- **26 unused components deleted** (~10,663 lines): DataFilters, PolicyDependencyMap, OpsReliabilityPanel, IndigenousEconomicDashboard, QuickActionsRibbon, WindForecastStatus, ConsultationTracker, GridQueueTracker, ProvinceConfigPanel, EnhancedMineralsDashboard, EnhancedGridOptimizationDashboard, CurtailmentEventDetail, OCAPDataExport, HelpButtonTemplate, WhopGate, SMRDeploymentTracker, ConsentWizard, EnhancedComplianceDashboard, EmissionsImpactCalculator, AwardEvidenceExportButton, ForecastBaselineComparison, EnhancedInvestmentDashboard, ExplainChartButton, TEKPanel, withHelp, CCUSProjectTracker
- **9 unused lib files deleted**: promptTemplates, aesoFallback, progressTracker, provinceConfig, curtailmentEngine, renewableForecastEngine, weatherIntegration, forecastPerformance, renewableOptimizationPrompt
- **16 unused npm dependencies removed**: @hookform/resolvers, cmdk, embla-carousel-react, input-otp, next-themes, react-day-picker, react-resizable-panels, swagger-ui-react, @radix-ui/react-aspect-ratio, @radix-ui/react-context-menu, @radix-ui/react-hover-card, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-radio-group, @radix-ui/react-toggle, @radix-ui/react-toggle-group

### 2.2 Component Architecture
- `AIDataCentreDashboard`: 1,265→956 lines — extracted types, constants, fallback data to `ai-datacentre/types.ts`

### 2.3 Error Handling
- Created `RouteErrorFallback.tsx` — route-level error UI with dev-mode stack traces
- Restructured `App.tsx` router: parent layout route with `errorElement` catches all child route errors
- Added `{ path: '*' }` catch-all for 404s
- Added global `unhandledrejection` and `error` handlers in `main.tsx`

---

## Sprint 3: UI/UX Audit

### 3.1 Mobile Responsive
- Added `metric-grid` CSS class (1→2→4 columns across breakpoints)
- Added `hero-section` responsive padding
- Added `table-responsive` horizontal scroll wrapper
- Added `tap-target` (WCAG 44×44px minimum), `flex-col-mobile`, `btn-full-mobile`
- Added responsive text sizing (`text-responsive-xl/2xl/3xl`)

### 3.2 Navigation
- Already in place: ribbon nav with horizontal scroll, `nav-mobile-scroll`, `scroll-snap-type`
- Skip-to-main content link (`SkipToMain` component)
- Footer settings menu for admin/low-priority features

### 3.3 Accessibility
- Already comprehensive: WCAG 2.2 AA CSS in `accessibility.css`
- Focus indicators: `:focus-visible` with 3px blue outline + box-shadow
- Color contrast: 4.5:1+ ratios for all text levels
- Reduced motion: `prefers-reduced-motion` disables all animations
- High contrast mode: `prefers-contrast: high` with 2px borders
- Touch targets: `@media (pointer: coarse)` enforces 44px minimums
- Screen reader: `.sr-only` class, proper heading hierarchy

---

## Sprint 4: Performance & Mobile Optimization

### 4.1 Bundle Optimization
- **EnergyDataDashboard**: 3,024KB → 442KB (**85% reduction**) — 25 sub-dashboard imports converted from eager to `React.lazy()` with `Suspense` fallback
- **OpenAPIDocsPage**: 1,214KB → 45KB — `redoc` library isolated into `vendor-redoc` chunk (1,169KB, loaded only on `/api-docs`)
- `vendor-date` removed (tree-shaken already)
- Total vendor chunks: react (208KB), recharts (454KB), supabase (123KB), pdf (389KB), redoc (1,169KB), radix (1KB)

### 4.2 Caching & Headers
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`
- `/index.html`: `Cache-Control: no-cache, no-store, must-revalidate`
- YAML API specs: `Cache-Control: public, max-age=3600`

### 4.3 Runtime Performance
- 25 sub-dashboards lazy-loaded — only active tab's code fetched
- `Suspense` fallback with `MiniLoadingSpinner` for seamless tab transitions
- `useCallback` for data loading in main dashboard
- Existing: React.lazy for 40+ route-level components, vendor manualChunks

---

## Verification

```
$ npx tsc --noEmit        → ✅ 0 errors
$ npx vite build          → ✅ built in ~23s
$ grep "Allow-Origin.*\*" → 0 matches (wildcard CORS eliminated)
$ grep "includes('*')"    → 0 matches (wildcard fallbacks eliminated)
```

---

## Remaining Opportunities (Future Sprints)

| Priority | Item | Estimated Effort |
|----------|------|------------------|
| Medium | Split remaining 1000+ line components (IndigenousDashboard, ArcticEnergySecurityMonitor) | 2-3 hours |
| Medium | Add Sentry or similar error tracking (TODO in ErrorBoundary) | 1-2 hours |
| Low | Virtualize long lists in DataTable (react-window) | 2-3 hours |
| Low | Service worker caching strategy for API responses | 3-4 hours |
| Low | E2E test suite (Playwright) for critical user flows | 4-6 hours |
| Low | Image lazy loading + WebP conversion for any raster assets | 1-2 hours |
