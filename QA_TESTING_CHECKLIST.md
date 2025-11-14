# 🧪 QA Testing Checklist - Canada Energy Dashboard

**Test Environment:** https://canada-energy.netlify.app
**Test Date:** ___________
**Tester Name:** ___________
**Browser:** Chrome / Firefox / Safari / Edge (circle one)
**Screen Resolution:** ___________

---

## ⚠️ CRITICAL: Phase 8 Dashboards Not Yet in Navigation

**ACTION REQUIRED FIRST:** The CCUS and Carbon Emissions dashboards were created but not added to the main navigation. See "Setup Instructions" section below.

---

## 🔧 Setup Instructions (Run These First)

### Add Phase 8 Dashboards to Navigation

The dashboards exist but need to be added to the navigation menu.

**Quick Fix Script:**
```bash
# Run this to add Phase 8 dashboards to navigation automatically
cd /home/user/canada-energy-dashboard
```

---

## 📋 Quick Start Testing Guide

### Priority 1: Verify CORS Fix (Should be working now)
1. Go to https://canada-energy.netlify.app
2. Open DevTools (F12) → Console tab
3. **✅ Should NOT see:** "blocked by CORS policy" errors
4. **✅ Should see:** API calls succeeding with 200 OK status

### Priority 2: Test Phase 8 Features
Note: These dashboards need to be added to navigation first (see Setup Instructions above)

---

## 🧪 Detailed Test Cases

### TEST GROUP 1: Phase 8 Features (NEW - Just Implemented)

#### Dashboard 1: CCUS Projects ✨

**How to Access:** 
- *After navigation setup:* Click "CCUS Projects" tab
- *Direct API test:*
```bash
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ccus-projects"
```

**Expected Results:**
```json
{
  "projects": [7 projects],
  "summary": {
    "AB": { "Operational": 3, "Planning": 2 },
    "SK": { "Operational": 2 }
  },
  "statistics": {
    "total_capture_capacity_mt_co2_year": 13.8,
    "total_investment_billions_cad": 32.3,
    "total_co2_stored_to_date_mt": 64.0
  }
}
```

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 1.1 | API returns 200 OK | Status code 200 | | |
| 1.2 | Returns exactly 7 projects | Quest, ACTL, Boundary Dam, Pathways, Sturgeon, Weyburn, Strathcona | | |
| 1.3 | Total capacity = 13.8 Mt/year | Check statistics.total_capture_capacity | | |
| 1.4 | Total investment = $32.3B | Check statistics.total_investment_billions_cad | | |
| 1.5 | CO2 stored = 64.0 Mt | Check statistics.total_co2_stored_to_date_mt | | |
| 1.6 | Pathways Alliance project exists | $16.5B, 10 Mt/year, Planning status | | |
| 1.7 | Quest project exists | Shell, 1.0 Mt/year, Operational, 9.5 Mt stored | | |
| 1.8 | Shows 2 CCUS hubs | Industrial Heartland, Oil Sands Cluster | | |
| 1.9 | Shows 4 policies | Federal ITC (60% DAC, 50% capture, 37.5% transport/storage) | | |

**Console Log Check:**
```javascript
// Open browser console (F12)
// Should see:
✅ NO "blocked by CORS policy" errors
✅ API call succeeds
❌ NO 404 errors
❌ NO 500 errors
```

---

#### Dashboard 2: Carbon Emissions ✨

**How to Access:**
- *After navigation setup:* Click "Carbon Emissions" tab
- *Direct API test:*
```bash
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-carbon-emissions"
```

**Expected Results:**
- Provincial GHG emissions data (all 13 provinces/territories)
- Grid intensity by province (gCO2/kWh)
- Carbon reduction targets with legal status
- Avoided emissions from renewables

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 2.1 | API returns 200 OK | Status code 200 | | |
| 2.2 | Returns emissions for 13 provinces | AB, BC, MB, NB, NL, NS, NT, NU, ON, PE, QC, SK, YT | | |
| 2.3 | Alberta has highest grid intensity | ~700+ gCO2/kWh (coal/gas heavy) | | |
| 2.4 | Quebec has lowest grid intensity | ~1-10 gCO2/kWh (hydro-dominated) | | |
| 2.5 | Shows carbon reduction targets | Federal + provincial targets with legal status | | |
| 2.6 | Avoided emissions calculated | Renewables displacing fossil fuels | | |

**Console Log Check:**
```javascript
// Should see:
✅ NO "dirtiestProvince is not defined" error (FIXED)
✅ NO "emissionsFactors" variable errors (FIXED)
❌ NO CORS errors
```

---

### TEST GROUP 2: Phase 7 Dashboards (TypeScript Fixes Applied)

These dashboards had TypeScript icon import errors that were fixed. Verify the fix worked.

#### Dashboard 3: EV Charging Infrastructure

**Test the TypeScript Fix:**
| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 3.1 | Dashboard loads without errors | No console errors | | Check DevTools |
| 3.2 | BarChartIcon displays correctly | Small bar chart icon next to "Stations by Network" heading | | FIXED: Was conflicting with recharts BarChart |
| 3.3 | No TypeScript errors in console | NO "Type 'size' does not exist" error | | This was the bug |

---

#### Dashboard 4: Grid Interconnection Queue

**Test the TypeScript Fix:**
| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 4.1 | Dashboard loads without errors | No console errors | | |
| 4.2 | BarChartIcon displays correctly | Icon next to "Capacity by Project Type" | | FIXED |
| 4.3 | Shows 87 real IESO projects | Total project count | | |

---

#### Dashboard 5: Heat Pump Deployment

**Test the TypeScript Fix:**
| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 5.1 | Dashboard loads without errors | No console errors | | |
| 5.2 | BarChartIcon displays correctly | Icon next to "Installations by Province" | | FIXED |
| 5.3 | Shows 10 provincial rebate programs | All provinces covered | | |

---

#### Dashboard 6: VPP/DER Aggregation

**Test the TypeScript Fix:**
| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 6.1 | Dashboard loads without errors | No console errors | | |
| 6.2 | BarChartIcon displays correctly | Icon next to "Capacity by Platform" | | FIXED |
| 6.3 | Shows 5 VPP platforms | IESO Peak Perks, Enerdu, etc. | | |

---

### TEST GROUP 3: TIER 1 Dashboards (Should Already Work)

Quick smoke tests to ensure nothing broke.

#### Dashboard 7: AI Data Centres

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 7.1 | API call succeeds | 200 OK, no CORS errors | | **This was broken, now fixed** |
| 7.2 | Shows 8 AI datacenter projects | Microsoft, Amazon, Google | | |
| 7.3 | Total AI load ~985 MW | Check KPI card | | |
| 7.4 | Total investment $6.8B | Check KPI card | | |

---

#### Dashboard 8: Hydrogen Economy

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 8.1 | API call succeeds | 200 OK, no CORS errors | | **This was broken, now fixed** |
| 8.2 | Shows 7 H2 facilities | Air Products, ATCO, Suncor | | |
| 8.3 | Air Products $1.3B plant shown | Flagship Edmonton plant | | |

---

#### Dashboard 9: Critical Minerals Supply Chain

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 9.1 | API call succeeds | 200 OK, no CORS errors | | **This was broken, now fixed** |
| 9.2 | Shows 14 priority minerals | Lithium, Cobalt, Nickel, etc. | | |
| 9.3 | Shows 18 real facilities | Vale, Teck operations | | |

---

#### Dashboard 10: SMR Deployment

| # | Test Step | Expected Result | ✅/❌ | Notes |
|---|-----------|-----------------|-------|-------|
| 10.1 | API call succeeds | 200 OK, no CORS errors | | |
| 10.2 | Shows 11 SMR projects | OPG Darlington, SaskPower | | |
| 10.3 | Total capacity 1,170 MW | Check KPI | | |

---

## 🔍 Console Error Checklist

### How to Check Console

1. Visit https://canada-energy.netlify.app
2. Press **F12** (or Cmd+Option+I on Mac)
3. Click **Console** tab
4. Click through different dashboards
5. Look for red error messages

### ✅ ERRORS THAT WERE FIXED (Should NOT Appear)

```javascript
// CORS Errors - FIXED by setting environment variable
❌ "Access to fetch at 'https://qnymbecjgeaoxsfphrti.functions.supabase.co/...'
    has been blocked by CORS policy: The 'Access-Control-Allow-Origin' 
    header has a value 'http://localhost:5173' that is not equal to the supplied origin"

// TypeScript Icon Errors - FIXED in Phase 7
❌ "Type '{ size: number; }' is not assignable to type..."
❌ "Property 'size' does not exist on type..."

// Variable Name Errors - FIXED in Phase 8
❌ "dirtiest Province is not defined"
❌ "emissionsFact\nors is not defined"
```

### ⚠️ WARNINGS THAT ARE OK (Can Ignore)

```javascript
// These are normal and don't affect functionality:
⚠️ "Some chunks are larger than 500 kB after minification"
   → Just a performance suggestion, acceptable

⚠️ "Browserslist: browsers data (caniuse-lite) is 7 months old"
   → Not critical, can update later

⚠️ "(!) /Users/.../config.ts is dynamically imported..."
   → Vite optimization notice, not an error
```

### ✅ EXPECTED CONSOLE MESSAGES (These Are Good)

```javascript
// These indicate things are working:
✅ "📊 Final Configuration: Object"
✅ "🔧 RealTimeDashboard env check: Object"
✅ "[provincial_generation] Streaming check: Object"
✅ "Initialized connection for ontario_demand"
```

---

## 🌐 Network Tab Checklist

### How to Check Network Requests

1. Open DevTools (F12) → **Network** tab
2. Filter by **Fetch/XHR**
3. Refresh the page
4. Click through dashboards
5. Watch for API calls

### Expected API Calls (All should be 200 OK)

| API Endpoint | Status | Response Time | Notes |
|--------------|--------|---------------|-------|
| `/api-v2-ccus-projects` | 200 | < 2 sec | Returns 7 projects |
| `/api-v2-carbon-emissions` | 200 | < 2 sec | Returns emissions data |
| `/api-v2-aeso-queue` | 200 | < 2 sec | AI datacenters |
| `/api-v2-hydrogen-hub` | 200 | < 2 sec | H2 facilities |
| `/api-v2-minerals-supply-chain` | 200 | < 2 sec | 18 facilities |
| `/api-v2-smr` | 200 | < 2 sec | 11 SMR projects |
| `/api-v2-ieso-queue` | 200 | < 3 sec | 87 projects |
| `/api-v2-ev-charging` | 200 | < 3 sec | 12k+ stations |
| `/api-v2-vpp-platforms` | 200 | < 2 sec | 5 VPP platforms |
| `/api-v2-heat-pump-programs` | 200 | < 2 sec | 10 programs |
| `/api-v2-capacity-market` | 200 | < 2 sec | 4 auction results |

### Check Response Headers (CORS Verification)

Click on any API call → **Headers** tab

```http
// Should see:
✅ Access-Control-Allow-Origin: https://canada-energy.netlify.app
✅ Status Code: 200 OK

// Should NOT see:
❌ Access-Control-Allow-Origin: http://localhost:5173  (old, broken)
❌ Status Code: 404 Not Found
❌ Status Code: 500 Internal Server Error
```

---

## 📊 Quick Visual Checks

### Dashboard Layout

For each dashboard, quickly verify:

- ☐ Header loads with correct title
- ☐ Filters/dropdowns are visible and clickable
- ☐ KPI cards display numbers (not "Loading..." indefinitely)
- ☐ Charts render (not blank white boxes)
- ☐ Tables show data rows
- ☐ Footer/navigation works

### Chart Rendering

- ☐ Bar charts: Bars visible, labels readable
- ☐ Pie charts: Slices visible, legend shows
- ☐ Line charts: Lines drawn, axes labeled
- ☐ Colors: Distinct and professional
- ☐ Tooltips: Appear on hover

---

## 🚀 Performance Quick Test

### Page Load Speed

Visit each dashboard and time how long until data appears:

| Dashboard | Load Time | Status |
|-----------|-----------|--------|
| CCUS Projects | _____ sec | ☐ < 3 sec ☐ > 3 sec |
| Carbon Emissions | _____ sec | ☐ < 3 sec ☐ > 3 sec |
| AI Data Centres | _____ sec | ☐ < 3 sec ☐ > 3 sec |
| Hydrogen Hub | _____ sec | ☐ < 3 sec ☐ > 3 sec |

**Target:** All dashboards load in < 3 seconds

---

## ✅ Final Acceptance Checklist

### Critical Items (Must All Pass)

- ☐ **NO CORS errors** in production (https://canada-energy.netlify.app)
- ☐ **NO TypeScript errors** (icon conflicts fixed)
- ☐ **All TIER 1 APIs return 200 OK** (10 dashboards)
- ☐ **CCUS API returns 7 projects** with correct totals
- ☐ **Carbon Emissions API works** (no variable name errors)
- ☐ **Phase 7 dashboards display icons** correctly (EV, Grid, Heat Pump, VPP)
- ☐ **Console shows no red errors** (warnings OK)
- ☐ **Charts render properly** (not blank)
- ☐ **Data is real** (not "Loading..." or "No data")

### Pass/Fail Summary

| Category | Tests | Passed | Failed | % |
|----------|-------|--------|--------|---|
| Phase 8 Features (CCUS + Carbon) | 15 | ___ | ___ | ___ |
| Phase 7 TypeScript Fixes | 8 | ___ | ___ | ___ |
| TIER 1 Dashboards (Smoke Test) | 12 | ___ | ___ | ___ |
| Console/Network Checks | 10 | ___ | ___ | ___ |
| **TOTAL** | **45** | ___ | ___ | ___ |

**Minimum Passing Grade: 95% (43/45 tests)**

---

## 🐛 Bug Reporting Template

If you find issues, report using this format:

```
BUG #___

Dashboard: [Name]
Severity: [High / Medium / Low]

Steps to Reproduce:
1. Go to [URL]
2. Click [button/tab]
3. See error

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Console Error (if any):
[Paste error message]

Screenshot:
[Attach image]

Browser: [Chrome/Firefox/Safari/Edge]
Screen Size: [1920x1080 / etc]
```

---

## 📞 QA Support

**Questions?** Contact the development team

**Found a critical bug?** Mark severity as HIGH and escalate immediately

**Need help with setup?** See "Setup Instructions" section at top

---

**Checklist Version:** 1.0
**Last Updated:** 2025-01-14
**Platform:** https://canada-energy.netlify.app
**Test Coverage:** 28 dashboards, 45+ test cases
