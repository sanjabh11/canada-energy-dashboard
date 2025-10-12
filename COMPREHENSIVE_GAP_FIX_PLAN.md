# 🔧 COMPREHENSIVE GAP FIX & IMPLEMENTATION PLAN

**Date:** October 12, 2025, 12:05 PM IST  
**Status:** Analyzing & Implementing

---

## 🚨 ISSUE 1: RENEWABLE PENETRATION SHOWING 0%

### **Root Cause Analysis:**

**Problem:** Renewable penetration shows 92%+ initially, then drops to 0% within a second.

**Why This Happens:**
1. **Initial Render:** Component uses `MOCK_RENEWABLE_PENETRATION` data (92% for ON, 99% for QC, etc.)
2. **Data Loads:** `provincialGeneration` data arrives from database
3. **Calculation Error:** Code tries to calculate from `megawatt_hours` field but:
   - Field may not exist or be 0
   - Data structure mismatch
   - Wrong aggregation logic (summing MWh instead of calculating current capacity %)
4. **Fallback Fails:** Calculation returns empty or zero values
5. **Result:** All provinces show 0%

**Code Location:** `src/components/AnalyticsTrendsDashboard.tsx` lines 228-316

**Specific Issues:**
```typescript
// PROBLEM 1: Wrong field access
if (typeof record.megawatt_hours === 'number' && record.megawatt_hours > 0) {
  mw = record.megawatt_hours;
}
// megawatt_hours might not exist or be cumulative, not instantaneous

// PROBLEM 2: Wrong calculation
renewable_pct: data.total_mw > 0 ? (data.renewable_mw / data.total_mw) * 100 : 0
// This divides MWh by MWh, but if all values are 0, result is 0%

// PROBLEM 3: Fallback data structure wrong
renewable_mw: data.renewable_pct,  // Should be MW, not percentage!
fossil_mw: 100 - data.renewable_pct,  // Wrong!
```

### **Fix Required:**

1. **Check actual database schema** for provincial_generation table
2. **Fix data extraction** to use correct fields
3. **Fix calculation logic** to properly aggregate
4. **Fix fallback data** structure
5. **Add data quality validation** before replacing mock data

---

## 📋 ISSUE 2: DETAILED GAP ANALYSIS & IMPLEMENTATION

### **Gap 1: Curtailment Provenance & Evidence**

**Requirements:**
- Keep "Historical" provenance everywhere
- Ensure avoided MWh, savings, ROI match Award Evidence export
- Add per-event recommendation impact
- Downloadable month summary

**Current State:**
- ✅ Award-evidence API filters mock data
- ✅ Provenance metadata added
- ⚠️ Per-event recommendation impact not visible in UI
- ❌ No downloadable summary

**Implementation:**
1. Add recommendation impact to curtailment event display
2. Create CSV export function
3. Add "Download Report" button

**Time:** 45 minutes

---

### **Gap 2: Renewable Forecasts - Baseline Display**

**Requirements:**
- Render horizon-wise baseline uplift side-by-side
- Show persistence AND seasonal baselines
- Display sample_count and completeness badges
- Schedule hourly weather cron
- Display "Calibrated by ECCC" or widen confidence when missing

**Current State:**
- ✅ Baseline calculation module created (`forecastBaselines.ts`)
- ❌ Not integrated into UI
- ❌ No horizon comparison table
- ❌ Weather cron not scheduled
- ❌ ECCC calibration not shown

**Implementation:**
1. Create `ForecastBaselineComparison` component
2. Integrate into forecast display
3. Add weather cron job
4. Add calibration badges

**Time:** 90 minutes

---

### **Gap 3: Wind Metrics**

**Requirements:**
- Publish wind MAE/MAPE by horizon with confidence intervals
- Note current coverage limits
- Include improvement plan if data is sparse

**Current State:**
- ✅ Wind status component created (`WindForecastStatus.tsx`)
- ❌ Not integrated into UI
- ❌ No actual wind metrics (data collection in progress)

**Implementation:**
1. Integrate WindForecastStatus component
2. Add placeholder metrics structure
3. Document data collection status

**Time:** 30 minutes

---

### **Gap 4: Storage Dispatch**

**Requirements:**
- Ensure actions written to storage_dispatch_log
- Show % cycles aligned to curtailment
- SoC bounds compliance
- Expected vs realized revenue
- Expose in status endpoint for nightly suite

**Current State:**
- ✅ StorageDispatchLog component created
- ❌ Not integrated into UI
- ⚠️ Need to verify data is being written
- ❌ Status endpoint not updated

**Implementation:**
1. Integrate StorageDispatchLog component
2. Verify cron job writes to storage_dispatch_log
3. Update status endpoint
4. Add to nightly test suite

**Time:** 60 minutes

---

### **Gap 5: Award Evidence API Enhancement**

**Requirements:**
- Include model_name/version
- Period windows
- Sample counts
- Completeness %
- Provenance strings
- Exclude simulated/mock from headline KPIs

**Current State:**
- ✅ Mock data filtered
- ✅ Provenance added
- ⚠️ Missing model_name/version
- ⚠️ Missing completeness %

**Implementation:**
1. Add model metadata
2. Add completeness calculation
3. Enhance response structure

**Time:** 30 minutes

---

### **Gap 6: Province Configs**

**Requirements:**
- Surface reserve_margin_pct
- Show indicative price profile
- Keep assumptions visible via methodology tooltip

**Current State:**
- ✅ MethodologyTooltip component created
- ❌ Not integrated with province configs
- ❌ Reserve margin not displayed

**Implementation:**
1. Query province_configs table
2. Display in UI with methodology tooltips
3. Show price profiles

**Time:** 45 minutes

---

## 📊 IMPLEMENTATION PRIORITY

### **Phase 1: Critical Fixes (2 hours)**
1. ✅ Fix renewable penetration calculation (30 min) - URGENT
2. ✅ Integrate StorageDispatchLog (30 min)
3. ✅ Integrate WindForecastStatus (20 min)
4. ✅ Add curtailment per-event impact (40 min)

### **Phase 2: Baseline & Metrics (2 hours)**
5. ✅ Create forecast baseline comparison UI (60 min)
6. ✅ Enhance award evidence API (30 min)
7. ✅ Add province config display (30 min)

### **Phase 3: Documentation & Cleanup (1.5 hours)**
8. ✅ Update README.md (30 min)
9. ✅ Update PRD.md (20 min)
10. ✅ Complete console.log cleanup (40 min)

**Total Time:** 5.5 hours

---

## 🎯 SUCCESS CRITERIA

After implementation:
- [ ] Renewable penetration shows correct % (not 0%)
- [ ] All baseline comparisons visible in UI
- [ ] Wind status clearly communicated
- [ ] Storage dispatch log visible with metrics
- [ ] Award evidence API complete with all metadata
- [ ] Province configs visible
- [ ] Documentation updated
- [ ] All console.log replaced

---

## 🚀 STARTING IMPLEMENTATION

**Order of Execution:**
1. Fix renewable penetration (URGENT - user-facing bug)
2. Integrate all created components
3. Enhance APIs
4. Update documentation

**Beginning with Issue 1: Renewable Penetration Fix...**
