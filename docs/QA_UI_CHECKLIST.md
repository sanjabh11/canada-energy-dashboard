# CEIP UI/UX QA Checklist

**Version:** 1.0  
**Date:** November 29, 2025  
**Scope:** Gap Analysis Implementation Verification

---

## Pre-Testing Setup

- [ ] Clear browser cache and cookies
- [ ] Test in Chrome, Firefox, Safari, Edge
- [ ] Test on desktop (1920x1080, 1440x900)
- [ ] Test on tablet (iPad 768x1024)
- [ ] Test on mobile (iPhone 375x667, Android 360x640)
- [ ] Enable browser dev tools for console monitoring

---

## 1. New Components Verification

### 1.1 DataSource Component
**Location:** `src/components/ui/DataSource.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Compact mode displays correctly | Shows database icon + dataset name | ☐ |
| Tooltip appears on hover | Shows date, version, description | ☐ |
| External link opens in new tab | Navigates to source URL | ☐ |
| Full mode displays all fields | Source, date, version, link visible | ☐ |
| COMMON_DATA_SOURCES constants work | IESO, AESO, ECCC sources render | ☐ |

### 1.2 SkeletonLoader Component
**Location:** `src/components/ui/SkeletonLoader.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| `type="text"` renders text skeleton | 3 lines with varying widths | ☐ |
| `type="card"` renders card skeleton | Card with title + value + text | ☐ |
| `type="chart"` renders chart skeleton | Bar chart placeholder | ☐ |
| `type="table"` renders table skeleton | Header + 5 rows | ☐ |
| `type="metrics"` renders grid | 4 metric cards | ☐ |
| `type="dashboard"` renders full layout | Header + metrics + charts + table | ☐ |
| Animation is smooth | Pulse animation visible | ☐ |

### 1.3 DataFreshnessBadge Component
**Location:** `src/components/ui/DataFreshnessBadge.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Fresh data shows green | "Live" badge with checkmark | ☐ |
| Stale data shows amber | "Stale" badge with warning | ☐ |
| Expired data shows red | "Expired" badge with X | ☐ |
| Relative time displays correctly | "5 min ago", "2h ago" | ☐ |
| Refresh button triggers callback | onRefresh called, spinner shows | ☐ |
| Compact mode works | Smaller inline display | ☐ |

### 1.4 SkipToMain Component
**Location:** `src/components/ui/SkipToMain.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Hidden by default | Not visible on page load | ☐ |
| Visible on Tab key | Shows "Skip to main content" | ☐ |
| Click navigates to main | Focus moves to main content | ☐ |
| Keyboard accessible | Enter key activates link | ☐ |

### 1.5 LanguageSwitcher Component
**Location:** `src/components/LanguageSwitcher.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Toggle variant displays EN/FR buttons | Both buttons visible | ☐ |
| Active language highlighted | Blue background on active | ☐ |
| Clicking switches language | Context updates, UI re-renders | ☐ |
| Dropdown variant works | Opens menu, shows options | ☐ |
| Language persists on refresh | localStorage saves preference | ☐ |

### 1.6 ConsentWizard Component
**Location:** `src/components/ConsentWizard.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Modal opens correctly | Overlay + centered dialog | ☐ |
| Step 1 (FPIC) displays | Checkbox + explanation | ☐ |
| Step 2 (OCAP) displays | 4 principle cards | ☐ |
| Step 3 (Visibility) displays | Radio buttons + form fields | ☐ |
| Step 4 (Confirm) displays | Summary + final checkbox | ☐ |
| Validation prevents skipping | Error messages show | ☐ |
| Grant Consent logs to audit | Console shows audit entry | ☐ |
| Cancel closes modal | onCancel callback fired | ☐ |

### 1.7 PolicyDependencyMap Component
**Location:** `src/components/PolicyDependencyMap.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Node list displays | 10 policy nodes visible | ☐ |
| Filter dropdown works | Filters by type | ☐ |
| Clicking node shows details | Right panel updates | ☐ |
| Dependencies clickable | Navigates to related node | ☐ |
| Sources link externally | Opens in new tab | ☐ |
| Legend displays correctly | 5 color-coded types | ☐ |

---

## 2. New Pages Verification

### 2.1 Employers Page (`/employers`)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Page loads without errors | No console errors | ☐ |
| Hero section displays | Title + description + CTAs | ☐ |
| HelpButton works | Opens help modal | ☐ |
| Partnership benefits grid | 4 benefit cards | ☐ |
| Capability profiles display | 4 role cards | ☐ |
| Download PDF button works | Alert shows (placeholder) | ☐ |
| Contact Sales button works | Opens mailto link | ☐ |
| Navigation links work | Back to Dashboard, To Incubators | ☐ |
| Responsive on mobile | Stacks vertically | ☐ |

### 2.2 Incubators Page (`/incubators`)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Page loads without errors | No console errors | ☐ |
| Hero section displays | Title + description + CTAs | ☐ |
| HelpButton works | Opens help modal | ☐ |
| Benefits grid displays | 4 benefit cards | ☐ |
| Calculator inputs work | Sliders update values | ☐ |
| Calculator outputs update | Metrics recalculate | ☐ |
| 5-Year Economic Impact shows | Large formatted number | ☐ |
| Download Report button works | Alert shows (placeholder) | ☐ |
| Training tracks display | 3 track cards | ☐ |
| Responsive on mobile | Stacks vertically | ☐ |

---

## 3. Integration Verification

### 3.1 RealTimeDashboard Integration

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| DataFreshnessBadge in header | Shows last update time | ☐ |
| Refresh button updates badge | Timestamp changes | ☐ |
| DataSource on Ontario Demand | IESO citation visible | ☐ |
| DataSource on Generation Mix | Citation visible | ☐ |
| Loading state shows skeleton | Placeholder during load | ☐ |

### 3.2 EnergyDataDashboard Integration

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| LanguageSwitcher in header | EN/FR toggle visible | ☐ |
| Switching language works | UI text changes (where translated) | ☐ |
| SkipToMain on Tab | Skip link appears | ☐ |

### 3.3 App.tsx Integration

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| I18nProvider wraps app | No context errors | ☐ |
| /employers route works | Page loads | ☐ |
| /incubators route works | Page loads | ☐ |
| /for-employers alias works | Redirects correctly | ☐ |
| /ctn alias works | Redirects correctly | ☐ |

---

## 4. PWA Verification

### 4.1 Manifest

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| manifest.json loads | No 404 in network tab | ☐ |
| App name correct | "Canada Energy Intelligence Platform" | ☐ |
| Icons defined | favicon.svg referenced | ☐ |
| Shortcuts defined | Dashboard, Indigenous, Climate | ☐ |

### 4.2 Service Worker

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| SW registers on load | Console shows registration | ☐ |
| Static assets cached | Check Application > Cache Storage | ☐ |
| Offline mode works | Basic page loads offline | ☐ |
| API requests cached | Network-first strategy | ☐ |

### 4.3 Install Prompt

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Chrome shows install icon | Address bar install button | ☐ |
| Safari shows Add to Home | Share menu option | ☐ |
| Installed app opens standalone | No browser chrome | ☐ |

---

## 5. Accessibility Verification

### 5.1 Keyboard Navigation

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Tab order logical | Left-to-right, top-to-bottom | ☐ |
| Focus indicators visible | Blue ring on focused elements | ☐ |
| Skip link works | Jumps to main content | ☐ |
| Modal traps focus | Tab cycles within modal | ☐ |
| Escape closes modals | ConsentWizard, HelpModal | ☐ |

### 5.2 Screen Reader

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Page title announced | "Canada Energy Intelligence Platform" | ☐ |
| Headings structured | H1 > H2 > H3 hierarchy | ☐ |
| Buttons have labels | aria-label or text content | ☐ |
| Charts have alt text | Description for screen readers | ☐ |
| Form fields labeled | Associated labels or aria-label | ☐ |

### 5.3 Color Contrast

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Text on dark background | 4.5:1 minimum ratio | ☐ |
| Interactive elements | Visible focus states | ☐ |
| Status badges readable | Fresh/Stale/Expired distinguishable | ☐ |

---

## 6. Performance Verification

### 6.1 Lighthouse Audit

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Performance | ≥80 | _____ | ☐ |
| Accessibility | ≥90 | _____ | ☐ |
| Best Practices | ≥90 | _____ | ☐ |
| SEO | ≥90 | _____ | ☐ |
| PWA | ≥80 | _____ | ☐ |

### 6.2 Load Times

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| First Contentful Paint | <2s | _____ | ☐ |
| Largest Contentful Paint | <3s | _____ | ☐ |
| Time to Interactive | <4s | _____ | ☐ |
| Total Blocking Time | <300ms | _____ | ☐ |

---

## 7. Help Content Verification

### 7.1 New Help Entries

| Help ID | Modal Opens | Content Displays | Pass/Fail |
|---------|-------------|------------------|-----------|
| page.employers.overview | ☐ | ☐ | ☐ |
| page.employers.partnership | ☐ | ☐ | ☐ |
| page.employers.profiles | ☐ | ☐ | ☐ |
| page.incubators.overview | ☐ | ☐ | ☐ |
| page.incubators.benefits | ☐ | ☐ | ☐ |
| page.incubators.calculator | ☐ | ☐ | ☐ |
| page.incubators.tracks | ☐ | ☐ | ☐ |

---

## 8. Console Error Check

| Page | Console Errors | Warnings | Pass/Fail |
|------|----------------|----------|-----------|
| / (Dashboard) | ☐ None | ☐ Acceptable | ☐ |
| /employers | ☐ None | ☐ Acceptable | ☐ |
| /incubators | ☐ None | ☐ Acceptable | ☐ |
| /indigenous | ☐ None | ☐ Acceptable | ☐ |
| /climate-policy | ☐ None | ☐ Acceptable | ☐ |

---

## 9. Session 2 & 3 Components Verification

### 9.1 IndigenousCaseStudies Component
**Location:** `src/components/IndigenousCaseStudies.tsx`
**Integration:** IndigenousDashboard

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Carousel displays 5 case studies | Cedar LNG, Wataynikaneyap, etc. | ☐ |
| Navigation arrows work | Previous/Next changes slide | ☐ |
| Dot navigation works | Clicking dots changes slide | ☐ |
| Testimonials display | Quote + author + role visible | ☐ |
| Impact metrics show | Investment, equity, jobs, year | ☐ |
| External links open | Source URLs open in new tab | ☐ |
| Compact mode works | Shows 3 highlights only | ☐ |

### 9.2 ImpactMetricsDashboard Component
**Location:** `src/components/ImpactMetricsDashboard.tsx`
**Integration:** ESGFinance tab

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| 8 metric cards display | Emissions, Jobs, Equity, etc. | ☐ |
| Values formatted correctly | 2.8M t CO₂e, 45,200 jobs | ☐ |
| Change indicators show | Arrow up/down with percentage | ☐ |
| Refresh button works | Metrics update, spinner shows | ☐ |
| Export CSV works | File downloads with metrics | ☐ |
| Compact mode works | 4 cards in 2x2 grid | ☐ |
| Summary row displays | 3 key metrics highlighted | ☐ |

### 9.3 AIDemandScenarioSlider Component
**Location:** `src/components/AIDemandScenarioSlider.tsx`
**Integration:** AIDataCentreDashboard

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Slider adjusts 1-100 GW | Value updates in real-time | ☐ |
| Year selector works | 2030/2035/2040/2050 buttons | ☐ |
| Grid stress indicator updates | Low/Moderate/High/Critical | ☐ |
| Key metrics calculate | Clean firm, emissions, investment | ☐ |
| Advanced details toggle | Shows infrastructure requirements | ☐ |
| Context note displays | IEA projection information | ☐ |

### 9.4 CrisisScenarioSimulator Component
**Location:** `src/components/CrisisScenarioSimulator.tsx`
**Integration:** Resilience tab

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| 6 scenarios selectable | Wildfire, Heatwave, etc. | ☐ |
| Scenario details display | Severity, duration, regions | ☐ |
| Run Simulation button works | Shows loading, then results | ☐ |
| Results panel displays | Blackout risk, customers, impact | ☐ |
| Mitigations list shows | 4 recommended actions | ☐ |
| Reset button works | Clears results | ☐ |
| Export button works | Downloads JSON report | ☐ |

### 9.5 SEO Utilities
**Location:** `src/lib/seo.ts`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| PAGE_SCHEMAS defined | 5 page schemas available | ☐ |
| DATASET_SCHEMAS defined | 4 dataset schemas available | ☐ |
| generateHreflangTags works | Returns en-CA, fr-CA, x-default | ☐ |
| generateSEOMeta works | Returns title, meta, link arrays | ☐ |

---

## 10. Whop SDK Integration Verification

### 10.1 Whop Client
**Location:** `src/lib/whop.ts`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| WHOP_ACCESS_MATRIX defined | 4 tiers with features | ☐ |
| whopClient.getCurrentTier() | Returns 'free' by default | ☐ |
| whopClient.hasFeature() | Checks feature access | ☐ |
| whopClient.hasTierAccess() | Checks tier level | ☐ |
| whopClient.login() | Sets user in localStorage | ☐ |
| whopClient.logout() | Clears localStorage | ☐ |

### 10.2 WhopGate Components
**Location:** `src/components/WhopGate.tsx`

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| FeatureGate blocks content | Shows upgrade prompt | ☐ |
| TierGate blocks content | Shows upgrade prompt | ☐ |
| ProBadge displays | Purple gradient badge | ☐ |
| TeamBadge displays | Amber gradient badge | ☐ |
| FeatureLock shows icon | Lock icon for gated features | ☐ |
| PricingCard renders | Tier info + features + button | ☐ |
| Upgrade button opens URL | Opens Whop checkout | ☐ |

---

## 11. Accessibility Fixes Verification

### 11.1 Color Contrast (accessibility.css)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| text-tertiary readable | 4.6:1 contrast on white | ☐ |
| Badge text readable | White text on colored bg | ☐ |
| Card headers readable | Dark text on light bg | ☐ |

### 11.2 Focus Indicators

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Buttons show focus ring | 3px blue outline | ☐ |
| Links show focus ring | 3px blue outline | ☐ |
| Inputs show focus ring | Blue border + outline | ☐ |
| Tabs show focus ring | Inset outline | ☐ |

### 11.3 Reduced Motion

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Enable reduced motion | Animations disabled | ☐ |
| Pulse animations stop | No skeleton animation | ☐ |
| Transitions instant | No slide/fade effects | ☐ |

### 11.4 Touch Targets (Mobile)

| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Buttons 44x44px minimum | Adequate tap area | ☐ |
| Links 44x44px minimum | Adequate tap area | ☐ |
| Spacing between targets | 8px minimum gap | ☐ |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | _____________ | _____________ | _____________ |
| QA Tester | _____________ | _____________ | _____________ |
| Product Owner | _____________ | _____________ | _____________ |

---

## Notes

_Use this section to document any issues found during testing:_

1. 
2. 
3. 

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Nov 29, 2025 | Initial checklist | Implementation Team |
| 1.1 | Nov 29, 2025 | Added Session 2 & 3 components, Whop SDK, Accessibility fixes | Implementation Team |
