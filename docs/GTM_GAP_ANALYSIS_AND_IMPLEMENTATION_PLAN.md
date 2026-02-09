# GTM Gap Analysis & Implementation Plan
**Date:** February 9, 2026  
**Source:** Cross-reference of `DEEP_RESEARCH_GTM_STRATEGY_2026.md` + `Grok_suggestions.md` + full codebase audit  
**Status:** ✅ ALL COMPLETE — tsc ✅ vite build ✅

---

## EXECUTIVE SUMMARY

After deep audit of both strategy documents and the full codebase (140+ components, 65+ routes, 86 Edge Functions), I identified **11 technical gaps** that blocked the GTM strategy. All have been resolved.

---

## SESSION 1: Component Polish (Completed)

| # | Change | Status |
|---|--------|--------|
| A1 | FunderReportingDashboard: OCAP® badge, aggregate impact cards, community benchmarking, deterministic data | ✅ |
| A2 | TIERROICalculator: SEO explainer, Direct Investment pathway, lead capture, data citations | ✅ |
| A3 | MunicipalLandingPage: How It Works, FAQ, Free Baseline Audit CTA, MCCAC/Canoe references | ✅ |
| A4 | SEOHead configs added for funder-reporting, roi-calculator, municipal pages | ✅ |

## SESSION 2: GTM Infrastructure Gaps (Completed)

| # | Gap | Fix Applied | Status |
|---|-----|-------------|--------|
| B1 | No analytics tracking | Plausible Analytics script + CSP update for plausible.io | ✅ |
| B2 | /watchdog buried under /whop/ | Added /watchdog and /rate-watchdog as standalone routes | ✅ |
| B3 | Missing SEO on sales pages | SEOHead added to PricingPage, EnterprisePage, FunderReportingDashboard, CompetitorComparison, WatchdogApp | ✅ |
| B4 | Enterprise page lacks industry routing | Industry selector (7 options), auto-fills from ?tier= URL param, Calendly CTA, cross-links | ✅ |
| B5 | Pricing page missing navigation | Back-to-home nav, cross-links to Municipal/ROI/Compare, smart tier CTA routing | ✅ |
| B6 | WatchdogApp only upsells Whop | Direct Paddle $9/mo checkout button + "See All Plans" secondary CTA | ✅ |
| B7 | No sitemap.xml | 35+ public URLs with priority weighting in public/sitemap.xml | ✅ |
| B8 | No robots.txt | Created with sitemap reference + admin route disallows | ✅ |
| B9 | CompetitorComparison unreachable | SEOHead added + cross-links from Pricing, Enterprise pages | ✅ |
| B10 | OG meta weak | Updated OG/Twitter descriptions with GTM messaging, absolute image URLs | ✅ |
| B11 | No cross-linking | All sales pages now cross-link: Pricing ↔ Municipal ↔ ROI ↔ Enterprise ↔ Compare ↔ Watchdog | ✅ |

---

## FILES MODIFIED (This Session)

### New Files
- `public/sitemap.xml` — 35+ public URLs with SEO priority weighting
- `public/robots.txt` — sitemap reference + admin route disallows
- `docs/GTM_GAP_ANALYSIS_AND_IMPLEMENTATION_PLAN.md` — this document

### Modified Files
- `index.html` — Plausible Analytics, updated OG/Twitter meta
- `netlify.toml` — CSP updated for plausible.io (script-src + connect-src)
- `src/App.tsx` — /watchdog and /rate-watchdog standalone routes
- `src/components/FunderReportingDashboard.tsx` — SEOHead, OCAP badge, impact cards, benchmarking
- `src/components/TIERROICalculator.tsx` — Full-page layout, SEO explainer, Direct Investment, lead capture
- `src/components/MunicipalLandingPage.tsx` — How It Works, FAQ, Baseline Audit CTA, MCCAC/Canoe
- `src/components/PricingPage.tsx` — SEOHead, nav, tier routing fixes, cross-links
- `src/components/enterprise/EnterprisePage.tsx` — SEOHead, industry selector, Calendly CTA, cross-links
- `src/components/CompetitorComparison.tsx` — SEOHead, cross-links
- `src/components/whop/WatchdogApp.tsx` — SEOHead, Paddle $9/mo checkout, funnel cross-links
- `src/components/SEOHead.tsx` — 3 new SEO_CONFIGS entries

---

## YOUR NEXT STEPS (Non-Code Actions)

### Week 1: Deploy + Legal Foundation
1. **`git commit` and push to main** → Netlify auto-deploys
2. **Test all public pages** — /pricing, /roi-calculator, /municipal, /watchdog, /enterprise, /compare, /funder-reporting
3. **Sign up for Plausible Analytics** at plausible.io ($9/mo) — add `canada-energy.netlify.app` as site
4. **Incorporate in Alberta** (~$400 CAD, 1-2 days) — unlocks grants + local credibility
5. **Finalize Paddle production KYC** — test $9/mo Watchdog checkout flow end-to-end

### Week 2: Grant + Collateral
6. **Apply for Alberta Digital Traction** ($50K non-dilutive) at albertainnovates.ca — use polished site as proof
7. **Record 3 Loom demos**: (a) API walkthrough, (b) Funder Reporting + OCAP vault, (c) Municipal baseline audit
8. **Create 1-page PDF deck** (Canva): Problem → CEIP solution → Pricing → Screenshots

### Week 3-4: First Revenue
9. **LinkedIn outreach** to 20-30 energy analysts at Dunsky, ICF, GLJ, Navius, Econoler — offer free 30-day Pro trial
10. **Launch Rate Watchdog** — 3-5 Reddit posts (r/alberta, r/Calgary), 2 YouTube shorts on RoLR bills
11. **Email ICE Network** (indigenouscleanenergy.com) — propose "official data layer" partnership with Funder Reporting demo

### Month 2-4: Scale
12. **Apply to Canoe Procurement** (canoeprocurement.ca) — vendor application for municipal sales
13. **Attend one event**: ICE Gathering, MCCAC workshop, or ERA event in Calgary
14. **Target**: $3-5K MRR by Month 3, $10K+ by Month 6
