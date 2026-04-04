# QA Test Instructions: Trust & Transparency Features (Cycle 3)

## Overview
This document provides detailed QA instructions for testing the trust and transparency improvements implemented in Cycle 3 of the Adversarial 10x Execution project.

---

## Test Scope

### 1. Streaming Consumer Normalization (T10)
**Components:** IndigenousDashboard, StakeholderDashboard

### 2. Mock Data Disclosure (T11)
**Components:** RenewableOptimizationHub, ComplianceDashboard, RealTimeDashboard

### 3. LLM Client Modularization (T12)
**Files:** src/lib/llm/*, src/lib/llmClient.ts

---

## Pre-Test Setup

### Environment
- Application must be built successfully: `pnpm exec vite build`
- Local dev server: `pnpm exec vite dev`
- All unit tests passing: `pnpm exec vitest run`

### Test Data Requirements
- Ensure Supabase credentials are NOT configured (to trigger fallback/mock data)
- Or use environment variable `VITE_ENABLE_EDGE_FETCH=false` to force fallback mode

---

## Test Cases

### Feature 1: Indigenous Dashboard Trust Notice

#### Test ID: T10-IND-001
**Priority:** High

**Objective:** Verify fallback data detection and trust notice display

**Preconditions:**
- Dashboard is loaded
- Streaming data is in fallback mode

**Steps:**
1. Navigate to `/indigenous` route
2. Wait for dashboard to fully load
3. Observe the top of the dashboard content

**Expected Results:**
- [ ] **PASS:** Yellow/orange trust notice banner appears with message:
  > "Illustrative territory data in use. Indigenous territory mapping is currently displaying sample data for demonstration purposes. Consultation status and FPIC workflows are illustrative examples only."
- [ ] **PASS:** Notice includes alert triangle icon
- [ ] **PASS:** Notice has proper styling (amber background)

**Benefits Verified:**
- Users are explicitly informed when viewing sample Indigenous territory data
- Prevents misinterpretation of demonstration data as governance-approved records
- Maintains trust with Indigenous communities by being transparent about data status

---

#### Test ID: T10-IND-002
**Priority:** High

**Objective:** Verify connection status indicator shows correct fallback state

**Steps:**
1. Navigate to `/indigenous` route
2. Scroll to bottom of page
3. Look at "Connection Status" section

**Expected Results:**
- [ ] **PASS:** Status indicator shows **amber/yellow** dot for fallback mode
- [ ] **PASS:** Text displays "Using Backup Data" when in fallback
- [ ] **PASS:** Text displays "Data Stream Active" when connected (green dot)
- [ ] **PASS:** Text displays "Data Stream Offline" when disconnected (red dot)

**Visual Verification:**
| State | Color | Text |
|-------|-------|------|
| Connected | Green | "Data Stream Active" |
| Fallback | Amber/Yellow | "Using Backup Data" |
| Offline | Red | "Data Stream Offline" |

---

### Feature 2: Stakeholder Dashboard Trust Notice

#### Test ID: T10-STK-001
**Priority:** High

**Objective:** Verify stakeholder data fallback detection

**Steps:**
1. Navigate to `/stakeholder` route
2. Wait for dashboard to load

**Expected Results:**
- [ ] **PASS:** Yellow/orange trust notice banner appears with message:
  > "Illustrative stakeholder data in use. Stakeholder coordination is currently displaying sample stakeholder records and consultation history for demonstration. Contact information and meeting records are illustrative examples only."
- [ ] **PASS:** Notice appears near the top of the page
- [ ] **PASS:** Stakeholder list still displays (sample data)

**Benefits Verified:**
- Prevents misuse of sample stakeholder contact information
- Ensures users know consultation history is for demonstration
- Protects stakeholder privacy by marking data as illustrative

---

#### Test ID: T10-STK-002
**Priority:** Medium

**Objective:** Verify connection status indicator for stakeholder data stream

**Steps:**
1. Navigate to `/stakeholder` route
2. Scroll to bottom of page
3. Check "Connection Status" section

**Expected Results:**
- [ ] **PASS:** Connection status indicator matches actual data source state
- [ ] **PASS:** Three-state display: Active (green) / Backup (amber) / Offline (red)

---

### Feature 3: Renewable Optimization Hub Mock Notice

#### Test ID: T11-REN-001
**Priority:** High

**Objective:** Verify forecast metrics mock data disclosure

**Preconditions:**
- Supabase forecast_performance table is empty or API is unavailable

**Steps:**
1. Navigate to `/renewable-hub` or `/renewable-optimization` route
2. Select any province from dropdown
3. Wait for data to load
4. Observe top of dashboard

**Expected Results:**
- [ ] **PASS:** Blue trust notice banner appears with message:
  > "Illustrative forecast metrics active. Renewable optimization is displaying sample forecast accuracy metrics for demonstration. MAE/MAPE values and performance statistics are illustrative examples, not live operational data."
- [ ] **PASS:** Notice appears above the header section
- [ ] **PASS:** Charts still display with sample data
- [ ] **PASS:** Forecast accuracy panels show data

**Benefits Verified:**
- Prevents trading/operational decisions based on mock forecast data
- Clearly distinguishes between live grid forecasts and demonstrations
- Reduces liability from misuse of sample metrics

---

#### Test ID: T11-REN-002
**Priority:** Medium

**Objective:** Verify mock state tracking when switching provinces

**Steps:**
1. Navigate to renewable optimization hub
2. Note presence of mock data notice
3. Switch to different province from dropdown
4. Wait for new data to load

**Expected Results:**
- [ ] **PASS:** Mock data notice persists if fallback data is used
- [ ] **PASS:** Notice disappears if real API data is returned
- [ ] **PASS:** No console errors during province switching

---

### Feature 4: Compliance Dashboard Mock Notice

#### Test ID: T11-COM-001
**Priority:** High

**Objective:** Verify compliance violations mock data disclosure

**Steps:**
1. Navigate to `/compliance` route
2. Wait for dashboard to fully load

**Expected Results:**
- [ ] **PASS:** Blue trust notice banner appears with message:
  > "Illustrative compliance data in use. Regulatory compliance monitoring is displaying sample projects, violations, and audit records for demonstration. Compliance scores, violation statuses, and remediation advice are illustrative examples only."
- [ ] **PASS:** Notice appears below Feature Info, above dashboard header
- [ ] **PASS:** Violations list displays (sample data)
- [ ] **PASS:** Audit trail shows sample records

**Benefits Verified:**
- Prevents regulatory actions based on mock violation data
- Ensures users know remediation advice is AI-generated samples
- Protects against legal liability from demonstration data

---

#### Test ID: T11-COM-002
**Priority:** Medium

**Objective:** Verify compliance metrics are marked as illustrative

**Steps:**
1. Navigate to compliance dashboard
2. Review "Compliance Scores" section
3. Click on "Violations" tab
4. Click on "Audit Trail" tab

**Expected Results:**
- [ ] **PASS:** All displayed data is understood to be sample/illustrative
- [ ] **PASS:** Trust notice remains visible across tab switching
- [ ] **PASS:** Violation severity badges display correctly (sample data)

---

### Feature 5: Real-Time Dashboard Fallback Notice

#### Test ID: T11-RTD-001
**Priority:** High

**Objective:** Verify real-time dashboard fallback detection

**Preconditions:**
- One or more data sources are in fallback mode (streaming unavailable)

**Steps:**
1. Navigate to `/real-time` or home dashboard
2. Wait for data to load
3. Observe area below hero section

**Expected Results:**
- [ ] **PASS:** Yellow/orange trust notice appears with message:
  > "Fallback energy data in use. The real-time dashboard is currently displaying data from backup sources rather than live feeds. Demand, generation, and price data may be delayed or from historical samples."
- [ ] **PASS:** Notice has proper margin styling (mx-6 mt-6)
- [ ] **PASS:** Charts and metrics still display
- [ ] **PASS:** "Live Data" / "Data refreshing" badges still function

**Benefits Verified:**
- Distinguishes between live operational data and backup sources
- Critical for grid operators to know data freshness
- Prevents operational decisions on stale data

---

#### Test ID: T11-RTD-002
**Priority:** Medium

**Objective:** Verify notice disappears when live data returns

**Steps:**
1. View dashboard with fallback notice visible
2. (If possible) Restore streaming connections
3. Wait for data refresh cycle

**Expected Results:**
- [ ] **PASS:** Trust notice disappears when all sources are live
- [ ] **PASS:** Notice reappears if fallback data is detected again
- [ ] **PASS:** No page reload required for state change

---

### Feature 6: LLM Client Modularization

#### Test ID: T12-LLM-001
**Priority:** Medium

**Objective:** Verify backward compatibility of llmClient exports

**Steps:**
1. Open browser dev console
2. Navigate to any page using LLM features (e.g., `/analytics`)
3. Trigger any LLM-based feature

**Expected Results:**
- [ ] **PASS:** All imports from `lib/llmClient` work without errors
- [ ] **PASS:** Functions execute correctly: getTransitionReport, getDataQuality, getTransitionKpis
- [ ] **PASS:** RAG search function executes: searchEnergyRag
- [ ] **PASS:** No "module not found" errors in console
- [ ] **PASS:** Type definitions are accessible

**Technical Verification:**
- [ ] **PASS:** Build completes without circular dependency warnings
- [ ] **PASS:** Unit tests for llmClient pass: `pnpm exec vitest run tests/unit/llmClient.test.ts`

**Benefits Verified:**
- Code is now modular and maintainable
- Tree-shaking can reduce bundle size for consumers
- Future LLM feature additions are easier to implement
- No breaking changes for existing code

---

## Cross-Cutting Tests

### Test ID: XCUT-001
**Priority:** High

**Objective:** Verify all trust notices use consistent styling

**Steps:**
1. Visit each modified dashboard
2. Compare notice appearance

**Expected Results:**
- [ ] **PASS:** All fallback notices use amber/orange styling
- [ ] **PASS:** All mock/illustrative notices use blue styling
- [ ] **PASS:** All notices have consistent padding, border radius
- [ ] **PASS:** All notices include alert/warning icon
- [ ] **PASS:** Message text is clear and actionable

---

### Test ID: XCUT-002
**Priority:** Medium

**Objective:** Verify TypeScript compilation and build

**Steps:**
1. Run: `pnpm exec tsc -b`
2. Run: `pnpm exec vite build`

**Expected Results:**
- [ ] **PASS:** TypeScript compilation completes with 0 errors
- [ ] **PASS:** Vite build completes successfully
- [ ] **PASS:** No new warnings introduced
- [ ] **PASS:** All unit tests pass

---

### Test ID: XCUT-003
**Priority:** Medium

**Objective:** Verify responsive design of trust notices

**Steps:**
1. Open dashboard with trust notice
2. Resize browser window to mobile width (< 768px)
3. Resize to tablet width (768px - 1024px)
4. Resize to desktop width (> 1024px)

**Expected Results:**
- [ ] **PASS:** Notice is readable at all screen sizes
- [ ] **PASS:** Icon and text align properly on mobile
- [ ] **PASS:** Notice doesn't overflow viewport
- [ ] **PASS:** Text remains legible (no truncation issues)

---

## Regression Tests

### Test ID: REG-001
**Priority:** High

**Objective:** Verify no regression in existing functionality

**Steps:**
1. Test all features in normal (non-fallback) mode
2. Verify Indigenous project management still works
3. Verify Stakeholder messaging still works
4. Verify Renewable forecasts display correctly
5. Verify Compliance violation tracking works
6. Verify Real-time charts render properly

**Expected Results:**
- [ ] **PASS:** All existing features work as before
- [ ] **PASS:** No new console errors
- [ ] **PASS:** Performance is not degraded
- [ ] **PASS:** Data quality badges still function

---

## Test Summary Report Template

```
QA Test Report: Trust & Transparency Features
Date: ___________
Tester: ___________
Build: ___________

SUMMARY:
- Total Tests: 15
- Passed: ___
- Failed: ___
- Blocked: ___

CRITICAL FINDINGS:
[List any blocking issues]

RECOMMENDATIONS:
[Sign-off or required fixes]

APPROVED FOR RELEASE: [ ] Yes [ ] No
```

---

## Benefits Summary

### Business Value
1. **Risk Reduction:** Prevents operational decisions on mock/stale data
2. **Compliance:** Aligns with AI transparency best practices (NTIA/NIST AI RMF)
3. **User Trust:** Explicit disclosure builds confidence in platform integrity
4. **Legal Protection:** Clear labeling of illustrative data reduces liability

### User Experience
1. **Clarity:** Users always know when data is live vs. illustrative
2. **Safety:** Prevents misinterpretation of demonstration content
3. **Consistency:** Standardized trust signals across all dashboards
4. **Accessibility:** Visual indicators (color + icon) support multiple user needs

### Technical Quality
1. **Maintainability:** Modular llmClient structure supports future growth
2. **Testability:** Each trust component is independently verifiable
3. **Scalability:** Pattern can be extended to new features easily
4. **Backward Compatibility:** All existing code continues to work

---

## Sign-Off

**QA Lead:** _____________________ **Date:** ___________

**Product Owner:** _____________________ **Date:** ___________

**Engineering Lead:** _____________________ **Date:** ___________

---

*Document Version: 1.0*
*Last Updated: 2026-03-25*
