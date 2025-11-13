# ✅ END-TO-END TESTING CHECKLIST - Phase 2
**Purpose**: Verify all 4 Phase 2 features are production-ready
**Timeline**: 30-45 minutes complete testing
**Prerequisites**: All migrations deployed, edge functions live, frontend running

---

## 🗄️ DATABASE VERIFICATION

### **CCUS Tables**
```sql
-- Run all these queries in Supabase SQL Editor

-- Verify CCUS tables exist
SELECT COUNT(*) FROM ccus_facilities;          -- Expected: 5
SELECT COUNT(*) FROM pathways_alliance_projects; -- Expected: 6
SELECT COUNT(*) FROM ccus_pipelines;           -- Expected: 1 (ACTL)
SELECT COUNT(*) FROM ccus_storage_sites;       -- Expected: 3
SELECT COUNT(*) FROM ccus_economics;           -- Expected: 2

-- Verify key data
SELECT facility_name, status, design_capture_capacity_mt_per_year
FROM ccus_facilities
ORDER BY design_capture_capacity_mt_per_year DESC;
-- Expected: Capital Power (3.0), Quest (1.2), NWRP (1.2), Boundary Dam (1.0), Strathcona (0.5)
```

- [ ] ✅ All 5 CCUS tables exist
- [ ] ✅ Data counts match expected values
- [ ] ✅ Key facilities visible

---

### **Indigenous Tables**
```sql
SELECT COUNT(*) FROM indigenous_equity_ownership;    -- Expected: 6
SELECT COUNT(*) FROM indigenous_revenue_agreements;  -- Expected: 5
SELECT COUNT(*) FROM indigenous_economic_impact;     -- Expected: 5

-- Verify flagship project
SELECT project_name, indigenous_community, equity_value_cad/1000000 as millions
FROM indigenous_equity_ownership
WHERE id = 'watay-power';
-- Expected: Wataynikaneyap Power, 24 First Nations, 340
```

- [ ] ✅ All 3 Indigenous tables exist
- [ ] ✅ Data counts match expected
- [ ] ✅ Wataynikaneyap data correct ($340M)

---

### **SMR Tables**
```sql
SELECT COUNT(*) FROM smr_projects;                -- Expected: 7
SELECT COUNT(*) FROM smr_vendors;                 -- Expected: 5
SELECT COUNT(*) FROM smr_regulatory_milestones;   -- Expected: 8+

-- Verify OPG Darlington
SELECT project_name, total_capacity_mw, estimated_capex_cad/1000000000 as billions
FROM smr_projects
WHERE id = 'opg-darlington-smr';
-- Expected: Darlington New Nuclear Project, 1200, 26
```

- [ ] ✅ All 4 SMR tables exist
- [ ] ✅ Data counts match
- [ ] ✅ OPG Darlington correct (1,200 MW, $26B)

---

### **Grid Queue Tables**
```sql
SELECT COUNT(*) FROM grid_queue_projects;         -- Expected: 23+
SELECT COUNT(*) FROM grid_queue_statistics;       -- Expected: 5 (one per province)

-- Count by province
SELECT province, COUNT(*) as projects
FROM grid_queue_projects
GROUP BY province
ORDER BY province;
-- Expected: AB, BC, MB, ON, SK
```

- [ ] ✅ All 3 Grid Queue tables exist
- [ ] ✅ 23+ projects seeded
- [ ] ✅ All 5 provinces represented

---

## ☁️ EDGE FUNCTION TESTING

### **CCUS API Test**
```bash
# Test CCUS endpoint (from browser DevTools Console)
fetch('https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ccus?province=AB', {
  headers: {
    'Authorization': 'Bearer [YOUR_ANON_KEY]'
  }
}).then(r => r.json()).then(console.log);
```

**Expected Response**:
```json
{
  "facilities": [...5 facilities...],
  "pathways_alliance": {
    "total_investment": 16500000000,
    "projects": [...6 projects...]
  },
  "summary": {
    "total_operational_capacity_mt": 3.4,
    "pathways_total_investment": 16500000000
  }
}
```

- [ ] ✅ Edge function returns 200 OK
- [ ] ✅ JSON structure valid
- [ ] ✅ 5 facilities in response
- [ ] ✅ 6 Pathways projects
- [ ] ✅ Summary calculations correct

---

## 🌐 FRONTEND TESTING

### **Test 1: CCUS Tracker**

**Navigation:**
1. Open: http://localhost:5173/
2. Click: **"CCUS Tracker"** (6th tab in main ribbon)

**Tab 1: Pathways Alliance**
- [ ] ✅ Red banner visible: "$16.5B Proposal Awaiting Federal Decision"
- [ ] ✅ Federal Tax Credit Gap chart shows $7.15B gap
- [ ] ✅ Green bar: $2.6B (21%)
- [ ] ✅ Red bar: $9.75B (79%)
- [ ] ✅ Projects table shows 6 member companies
- [ ] ✅ CNRL Horizon shows $6.5B (highest CapEx)

**Tab 2: Overview**
- [ ] ✅ Stat cards show correct values
- [ ] ✅ Capacity by province chart renders
- [ ] ✅ Storage utilization chart visible
- [ ] ✅ ACTL pipeline section present

**Tab 3: Facilities**
- [ ] ✅ Table shows 5 facilities
- [ ] ✅ Quest: 1.2 Mt/year, Operational
- [ ] ✅ NWRP: 1.2 Mt/year, Operational
- [ ] ✅ Boundary Dam: 1.0 Mt/year, Operational
- [ ] ✅ Strathcona: 0.5 Mt/year, Under Construction
- [ ] ✅ Capital Power: 3.0 Mt/year, Proposed

**Tab 4: Economics**
- [ ] ✅ Investment breakdown chart renders
- [ ] ✅ Federal funding section visible
- [ ] ✅ Economics table populated

**Console Check:**
- [ ] ✅ No red errors in console
- [ ] ✅ Successful API call: `GET .../api-v2-ccus`
- [ ] ✅ No network errors

---

### **Test 2: Indigenous Economic Dashboard**

**Navigation:**
1. Click: **"More"** dropdown
2. Click: **"Indigenous Economic Impact"**

**Tab 1: Overview**
- [ ] ✅ Green reconciliation banner visible
- [ ] ✅ "Truth and Reconciliation through Economic Participation"
- [ ] ✅ Stat cards: $435M+ equity, $32.5M+ dividends, 1,800+ jobs
- [ ] ✅ Pie chart showing equity distribution renders
- [ ] ✅ Reconciliation priorities info panel present

**Tab 2: Equity Ownership**
- [ ] ✅ Table shows 6 equity projects
- [ ] ✅ Wataynikaneyap: $340M, 51% ownership, 24 First Nations
- [ ] ✅ Makwa Solar: $30M, 100%, Ermineskin Cree
- [ ] ✅ Clearwater Wind: $25M, 50%, Duncan's First Nation
- [ ] ✅ All ownership percentages visible
- [ ] ✅ Annual dividends shown
- [ ] ✅ Board seats column populated

**Tab 3: Revenue Agreements**
- [ ] ✅ Table shows 5 IBAs/CBAs
- [ ] ✅ Keeyask: $4B, 850 jobs
- [ ] ✅ Coastal GasLink: $620M, 450 jobs
- [ ] ✅ Site C: $50M, 80 jobs
- [ ] ✅ Jobs created column visible
- [ ] ✅ Training programs listed

**Tab 4: Economic Impact**
- [ ] ✅ 5 community cards visible
- [ ] ✅ Ermineskin Cree Nation: $18.5M revenue, 35 jobs
- [ ] ✅ Treaty 9 Communities: $285M revenue, 450 jobs
- [ ] ✅ Revenue breakdown chart renders
- [ ] ✅ Direct + indirect jobs shown

**Console Check:**
- [ ] ✅ No errors
- [ ] ✅ Direct Supabase queries successful
- [ ] ✅ All 3 tables queried (`indigenous_equity_ownership`, etc.)

---

### **Test 3: SMR Deployment Tracker**

**Navigation:**
1. Click: **"More"** dropdown
2. Click: **"SMR Deployment"**

**Tab 1: Overview**
- [ ] ✅ Blue strategy banner visible
- [ ] ✅ "Canada's SMR Leadership Strategy"
- [ ] ✅ OPG Darlington highlighted (4×300MW)
- [ ] ✅ Stat cards: 1,800 MW capacity, $38B investment
- [ ] ✅ Capacity by province chart renders
- [ ] ✅ Vendor market share chart visible
- [ ] ✅ Timeline scatter chart populated

**Tab 2: Projects**
- [ ] ✅ Table shows 7 projects
- [ ] ✅ OPG Darlington: 1,200 MW, $26B, Licensing
- [ ] ✅ CNL Chalk River: 15 MW, $2B, Pre-Licensing
- [ ] ✅ Bruce Power: 300 MW, Feasibility Study
- [ ] ✅ SaskPower eVinci: 5 MW, $300M
- [ ] ✅ NB Power ARC-100: 100 MW, $3B
- [ ] ✅ Status badges color-coded correctly
- [ ] ✅ Target dates visible (2029, 2030, etc.)

**Tab 3: Technology Vendors**
- [ ] ✅ 5 vendor cards visible
- [ ] ✅ GE Hitachi: BWRX-300, CNSC VDR Phase 2
- [ ] ✅ Westinghouse: eVinci, VDR Phase 1
- [ ] ✅ ARC Clean Energy: ARC-100, Canadian tech
- [ ] ✅ Terrestrial Energy: IMSR, VDR Phase 2
- [ ] ✅ USNC: MMR, VDR Phase 2
- [ ] ✅ TRL levels shown (7-8/9)
- [ ] ✅ Canadian partners listed

**Tab 4: Regulatory Pipeline**
- [ ] ✅ Milestone tracking for each project
- [ ] ✅ OPG Darlington milestones:
  - [ ] ✅ EA Approval: Completed (March 15, 2024)
  - [ ] ✅ CNSC VDR Phase 2: In Progress
  - [ ] ✅ Construction License: Pending (2027)
- [ ] ✅ Status badges: Completed (green), In Progress (blue), Pending (gray)

**Tab 5: Economics**
- [ ] ✅ Investment by province chart
- [ ] ✅ Cost per MW chart
- [ ] ✅ Federal funding: $970M to OPG visible
- [ ] ✅ Economics table with all projects

**Console Check:**
- [ ] ✅ No errors
- [ ] ✅ Supabase queries successful

---

### **Test 4: Grid Connection Queue**

**Navigation:**
1. Click: **"More"** dropdown
2. Click: **"Grid Connection Queue"**

**Tab 1: Overview**
- [ ] ✅ Green pipeline banner visible
- [ ] ✅ Stat cards: 30+ GW, 15 GW active, 5 GW in-service, 5 provinces
- [ ] ✅ Capacity by province chart (Alberta highest)
- [ ] ✅ Technology distribution pie chart (Solar ~40%, Wind ~35%)
- [ ] ✅ Status breakdown chart
- [ ] ✅ Key Insights cards visible

**Tab 2: Projects**
- [ ] ✅ Table shows 23+ projects
- [ ] ✅ Alberta projects visible:
  - [ ] Buffalo Trail Solar: 400 MW, Under Construction
  - [ ] Cascade Storage: 150 MW, Facility Study
  - [ ] Windrise Wind: 206 MW, In-Service
- [ ] ✅ Ontario projects visible:
  - [ ] Oneida Storage: 250 MW, In-Service
  - [ ] Goreway Storage: 250 MW, Under Construction
- [ ] ✅ All columns populated (proponent, technology, capacity, status)
- [ ] ✅ Expected COD dates visible

**Tab 3: Technology Mix**
- [ ] ✅ Total capacity by technology chart
- [ ] ✅ Technology by province table
- [ ] ✅ Solar: highest capacity
- [ ] ✅ Wind: second highest
- [ ] ✅ Storage: growing segment

**Tab 4: Timeline**
- [ ] ✅ Annual capacity additions chart (2025-2030)
- [ ] ✅ Cumulative capacity line
- [ ] ✅ Deployment timeline table
- [ ] ✅ Projects grouped by year

**Tab 5: Provincial Comparison**
- [ ] ✅ Provincial comparison chart (Total, Active, In-Service)
- [ ] ✅ Provincial summary table
- [ ] ✅ All 5 provinces: AB, ON, SK, BC, MB
- [ ] ✅ Capacity in GW (not MW)

**Filter Testing:**
- [ ] ✅ Province filter: Select "AB" → Only Alberta projects
- [ ] ✅ Province filter: Select "ON" → Only Ontario projects
- [ ] ✅ Technology filter: Select "Solar" → Only solar projects
- [ ] ✅ Technology filter: Select "Storage - Battery" → Only storage
- [ ] ✅ Status filter: Select "In-Service" → Only operational
- [ ] ✅ Status filter: Select "Under Construction" → Only construction
- [ ] ✅ Filters work in combination
- [ ] ✅ "All" option resets filters

**Console Check:**
- [ ] ✅ No errors
- [ ] ✅ Supabase queries successful

---

## 🧪 INTEGRATION TESTING

### **Navigation Integration**

**Core Tabs:**
- [ ] ✅ CCUS Tracker visible as 6th tab in main ribbon
- [ ] ✅ Clicking CCUS tab loads component
- [ ] ✅ Tab stays active (visual indicator)

**More Dropdown:**
- [ ] ✅ "More" button visible
- [ ] ✅ Clicking "More" opens dropdown
- [ ] ✅ "Indigenous Economic Impact" visible in dropdown
- [ ] ✅ "SMR Deployment" visible in dropdown
- [ ] ✅ "Grid Connection Queue" visible in dropdown
- [ ] ✅ Clicking each item loads correct component
- [ ] ✅ Dropdown closes after selection

**Tab Switching:**
- [ ] ✅ Switch: Home → CCUS → Indigenous → SMR → Grid Queue → Home (no errors)
- [ ] ✅ Each component unmounts cleanly
- [ ] ✅ No memory leaks (check browser memory in DevTools)

---

### **Data Consistency Testing**

**Cross-Feature Verification:**

**CCUS vs Indigenous:**
- [ ] ✅ No Indigenous projects accidentally in CCUS tables
- [ ] ✅ Keeyask project in Indigenous (not in CCUS)

**SMR vs Grid Queue:**
- [ ] ✅ OPG Darlington in SMR (not in Grid Queue)
- [ ] ✅ Grid Queue has different projects (Buffalo Trail Solar, etc.)

**Data Integrity:**
- [ ] ✅ No null values in critical fields (project names, capacities)
- [ ] ✅ All foreign keys valid (no orphaned records)
- [ ] ✅ Dates in correct format (YYYY-MM-DD)
- [ ] ✅ Currencies in CAD (not USD)

---

## 📱 RESPONSIVE TESTING (Optional)

**Desktop (1920×1080):**
- [ ] ✅ All dashboards render correctly
- [ ] ✅ Charts visible and readable
- [ ] ✅ Tables not overflowing

**Tablet (1024×768):**
- [ ] ✅ Navigation collapses gracefully
- [ ] ✅ Charts remain readable
- [ ] ✅ Tables scroll horizontally if needed

**Mobile (375×667):**
- [ ] ⚠️ Layout may break (Phase 1 fix) - Note issues for roadmap

---

## ⚡ PERFORMANCE TESTING

**Page Load Speed:**
- [ ] ✅ Dashboard loads in < 3 seconds
- [ ] ✅ Tab switches in < 500ms
- [ ] ✅ Charts render in < 1 second

**API Response Times:**
- [ ] ✅ CCUS API: < 2 seconds
- [ ] ✅ Direct Supabase queries: < 1 second

**Browser Performance:**
```javascript
// Run in DevTools Console
performance.getEntriesByType('navigation')[0].loadEventEnd
// Expected: < 3000 (3 seconds)
```

- [ ] ✅ Page load time acceptable
- [ ] ✅ No console warnings about performance

---

## 🐛 ERROR HANDLING TESTING

**Simulate Errors:**

**Network Error:**
1. Open DevTools → Network tab → Set to "Offline"
2. Navigate to CCUS Tracker
3. Expected: Error message "Failed to load CCUS data"
- [ ] ✅ Graceful error message shown
- [ ] ✅ No white screen of death

**Invalid Query:**
```sql
-- In Supabase SQL Editor, temporarily rename table
ALTER TABLE ccus_facilities RENAME TO ccus_facilities_backup;
```
4. Reload frontend
5. Expected: Error message in console
- [ ] ✅ Error caught and logged
- [ ] ✅ User sees friendly error message

**Restore Table:**
```sql
ALTER TABLE ccus_facilities_backup RENAME TO ccus_facilities;
```

---

## 🔒 SECURITY TESTING

**Row-Level Security (RLS):**

**Test with RLS Enabled:**
```sql
-- Re-enable RLS on one table
ALTER TABLE ccus_facilities ENABLE ROW LEVEL SECURITY;
```
1. Reload frontend
2. Expected: CCUS facilities not loading (403 error)
- [ ] ✅ Error occurs as expected
- [ ] ✅ Console shows 403 error

**Re-disable RLS:**
```sql
ALTER TABLE ccus_facilities DISABLE ROW LEVEL SECURITY;
```

**API Security:**
- [ ] ✅ Edge function requires Authorization header
- [ ] ✅ Invalid API key returns 401
- [ ] ✅ No sensitive data exposed in client-side code

---

## ✅ FINAL SIGN-OFF CHECKLIST

### **Database**
- [ ] ✅ All 16 tables exist (CCUS: 5, Indigenous: 3, SMR: 4, Grid: 3, Pathways: 1)
- [ ] ✅ All data seeded correctly (verified counts)
- [ ] ✅ RLS disabled for testing

### **Edge Functions**
- [ ] ✅ api-v2-ccus deployed and responding

### **Frontend**
- [ ] ✅ All 4 features render without errors
- [ ] ✅ All tabs within each feature work
- [ ] ✅ Navigation integration complete
- [ ] ✅ Filters functional (Grid Queue)

### **Data Quality**
- [ ] ✅ No mock data (100% real projects)
- [ ] ✅ Data sources documented
- [ ] ✅ Values match public sources (e.g., OPG $26B, Wataynikaneyap $340M)

### **Performance**
- [ ] ✅ Page loads < 3 seconds
- [ ] ✅ No memory leaks
- [ ] ✅ Charts render smoothly

### **User Experience**
- [ ] ✅ No console errors
- [ ] ✅ Visual polish (charts, colors, spacing)
- [ ] ✅ Text readable and professional

---

## 🎊 TESTING COMPLETE!

**If all checkboxes above are checked** → ✅ **PHASE 2 IS PRODUCTION-READY!**

**Next Steps:**
1. ✅ Take screenshots (see SCREENSHOT_GUIDE.md)
2. ✅ Prepare sponsor deck (see SPONSOR_PITCH_DECK.md)
3. ✅ Book sponsor meetings (Pathways Alliance, OPG, AESO)
4. ✅ Optionally: Deploy to production Supabase (if using separate staging)

---

## 📞 ISSUE REPORTING

**If tests fail:**
1. Note which checkbox failed
2. Capture screenshot of error
3. Copy browser console log (if error)
4. Check troubleshooting section in PHASE2_DEPLOYMENT_GUIDE.md

**Common Fixes:**
- Tables not found → Re-run migration
- No data → Check RLS is disabled
- Component not loading → Hard refresh (Cmd+Shift+R)
- API 401 error → Check anon key in frontend

---

**Testing Time Estimate**: 30-45 minutes (thorough)

**Good luck with testing! 🚀**
