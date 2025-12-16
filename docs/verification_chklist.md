# MANUAL VERIFICATION CHECKLIST FOR LIVE DEPLOYMENT
## https://canada-energy.netlify.app/
## Date: November 22, 2025

---

## HOW TO USE THIS CHECKLIST

1. Open https://canada-energy.netlify.app/ in your browser
2. Open browser DevTools (F12) to check console for errors
3. Work through each section systematically
4. Mark ✅ or ❌ next to each item
5. Note any errors or issues in the "Notes" section

---

## SECTION 1: INITIAL LOAD & NAVIGATION

### Basic Functionality
- [ ] Site loads without errors (<3 seconds)
- [ ] No console errors in DevTools
- [ ] Main navigation menu visible
- [ ] Dashboard sections load correctly
- [ ] Responsive design works on mobile (test with DevTools device emulator)

### Navigation Structure (Check sidebar/menu)
Look for these dashboard links:
- [ ] Real-Time Dashboard
- [ ] Analytics & Trends
- [ ] AI Data Centres
- [ ] Hydrogen Economy
- [ ] Critical Minerals
- [ ] SMR Deployment
- [ ] CCUS Projects
- [ ] EV Charging
- [ ] VPP/DER Aggregation
- [ ] Grid Interconnection Queue
- [ ] Capacity Market
- [ ] Heat Pump Programs
- [ ] Indigenous Dashboard
- [ ] Arctic Energy Security
- [ ] Curtailment Analytics
- [ ] Storage Dispatch
- [ ] Resilience Map
- [ ] Security Dashboard
- [ ] CER Compliance
- [ ] Innovation & TRL Tracking
- [ ] Household Energy Advisor

**Notes:**
```
[Write any observations here]
```

---

## SECTION 2: TIER 1 STRATEGIC FEATURES (CRITICAL)

### Feature #1: AI Data Centre Energy Dashboard
**How to Access:** Navigate to "AI Data Centres" in menu

Check for:
- [ ] Dashboard loads without errors
- [ ] Province filter dropdown present (should have AB, BC, SK, ON, etc.)
- [ ] Power consumption chart displays
- [ ] AESO interconnection queue visualization
- [ ] At least 5 data centre facilities listed
- [ ] Grid capacity metrics shown
- [ ] Real data (not "Lorem ipsum" or placeholder text)
- [ ] Export/download functionality

**Test Actions:**
1. Change province filter → Chart should update
2. Hover over chart elements → Tooltips should appear
3. Check if numbers look realistic (not random like 999999)

**Data Points to Verify:**
- Total AI data centre capacity should be ~2,180 MW
- Should show Microsoft, AWS, Google Cloud facilities
- AESO queue should show ~10GW+ of projects

**Notes:**
```
[Record your findings]
```

---

### Feature #2: Hydrogen Economy Hub
**How to Access:** Navigate to "Hydrogen Economy" in menu

Check for:
- [ ] Dashboard loads without errors
- [ ] Province filter present
- [ ] Hub filter present (Edmonton Hub / Calgary Hub)
- [ ] Production tracking chart
- [ ] Blue vs. green hydrogen distinction visible
- [ ] Project pipeline table (should show ~5 projects)
- [ ] Infrastructure map (pipelines, refueling stations)
- [ ] Price tracking chart ($/kg)

**Test Actions:**
1. Select "Edmonton Hub" → Should show Edmonton-specific data
2. Select "Calgary Hub" → Data should change
3. Switch between provinces → Data should update

**Data Points to Verify:**
- Total capacity should be ~1,570 t/day
- Should see Air Products $1.3B project
- ATCO projects visible
- Project costs should total ~$4.8B

**Notes:**
```
[Record your findings]
```

---

### Feature #3: Critical Minerals Supply Chain (Enhanced)
**How to Access:** Navigate to "Critical Minerals" in menu

Check for:
- [ ] Dashboard loads without errors
- [ ] At least 7 minerals projects listed
- [ ] **AI Geopolitical Risk Analysis** button present (this is new enhancement)
- [ ] **Automated Risk Alerts** visible (high-risk minerals highlighted)
- [ ] Supply chain visualization (mine → processing → battery → EV)
- [ ] China dependency analysis
- [ ] Battery supply chain tracking
- [ ] Price tracking charts

**Test Actions:**
1. Click "AI Risk Analysis" button on any mineral → Should generate AI analysis
2. Look for risk alert badges (red/yellow/green)
3. Check if supply chain flow diagram renders

**Data Points to Verify:**
- Total investment should be ~$6.45B
- Battery capacity should show 120 GWh
- Should track lithium, cobalt, nickel, graphite, copper, rare earths

**Notes:**
```
[Record your findings]
```

---

### Feature #4: SMR Deployment Tracker
**How to Access:** Navigate to "SMR Deployment" in menu

Check for:
- [ ] Dashboard loads without errors
- [ ] 3 facilities listed:
  - [ ] OPG Darlington BWRX-300
  - [ ] SaskPower Estevan SMR
  - [ ] NB Point Lepreau SMR
- [ ] Capacity range: 300-900 MW per facility
- [ ] CNSC licensing milestones timeline
- [ ] Capital cost tracking
- [ ] Target commercial operation dates
- [ ] Technology vendor information (GE Hitachi)

**Test Actions:**
1. Click on each project → Should show detailed info
2. Check timeline visualization

**Data Points to Verify:**
- OPG Darlington should target 2030 commercial operation
- Total capacity should be 900-1,800 MW
- Cost estimates should be present

**Notes:**
```
[Record your findings]
```

---

### Feature #5: CCUS Project Tracker
**How to Access:** Navigate to "CCUS Projects" in menu

Check for:
- [ ] Dashboard loads without errors
- [ ] 7 real projects listed:
  - [ ] Quest
  - [ ] Alberta Carbon Trunk Line (ACTL)
  - [ ] Pathways Alliance
  - [ ] Boundary Dam
  - [ ] Sturgeon
  - [ ] Weyburn-Midale
  - [ ] (7th project)
- [ ] Total capacity: ~15.3 Mt CO2/year
- [ ] Total storage to date: ~69 Mt
- [ ] Investment tracking: $31.7B total
- [ ] Operational vs. planned breakdown
- [ ] Storage site monitoring
- [ ] Cost per tonne tracking

**Test Actions:**
1. Click on each project → Detailed information should appear
2. Check if charts show capture vs. storage capacity

**Data Points to Verify:**
- $11.1B operational projects
- $20.6B planned projects
- Real project names from Pathways Alliance, Shell, government sources

**Notes:**
```
[Record your findings]
```

---

## SECTION 3: TIER 2 STRATEGIC FEATURES

### Feature #6: EV & Charging Infrastructure
**How to Access:** Navigate to "EV Charging" in menu

Check for:
- [ ] Dashboard loads
- [ ] Charging network map visible
- [ ] 4 networks tracked:
  - [ ] Tesla Supercharger (209 stations, 1,990 ports)
  - [ ] Electrify Canada (32 stations, 128 ports)
  - [ ] FLO (500 stations)
  - [ ] Petro-Canada (50 stations)
- [ ] Total ports: ~33,767 Canada-wide
- [ ] Map markers clickable
- [ ] Station details show (address, power level, connector types)

**Notes:**
```
[Record your findings]
```

---

### Feature #7: VPP & DER Aggregation
**How to Access:** Navigate to "VPP/DER Aggregation" in menu

Check for:
- [ ] Dashboard loads
- [ ] 3 platforms listed:
  - [ ] IESO Peak Perks (100,000 homes, 90 MW)
  - [ ] OEB DER Aggregation Pilot
  - [ ] Alberta VPP Pilot
- [ ] Revenue sharing models visible
- [ ] Grid services taxonomy
- [ ] Participant enrollment tracking

**Notes:**
```
[Record your findings]
```

---

### Feature #8: Grid Interconnection Queue
**How to Access:** Navigate to "Grid Interconnection Queue" in menu

Check for:
- [ ] Dashboard loads
- [ ] IESO queue: ~10 projects, 1,500+ MW
- [ ] AESO queue: ~8 projects, 3,270 MW
- [ ] Queue position and status visible
- [ ] Wait time analytics
- [ ] Transmission bottleneck identification
- [ ] Project type breakdown (solar, wind, battery, data centre)

**Notes:**
```
[Record your findings]
```

---

### Feature #9: Indigenous Energy Governance
**How to Access:** Navigate to "Indigenous Dashboard" in menu

Check for:
- [ ] Dashboard loads
- [ ] FPIC (Free, Prior, Informed Consent) workflow tracker
- [ ] Territorial mapping with GeoJSON overlays
- [ ] TEK (Traditional Ecological Knowledge) repository
- [ ] **AI Co-Design Assistant** chat interface (NEW ENHANCEMENT)
- [ ] **Enhanced filters**: territory, energy type, season
- [ ] UNDRIP-compliant responses
- [ ] Consultation records accessible
- [ ] Custodian management interface

**Test Actions:**
1. Try AI co-design chat → Ask a question about indigenous energy
2. Test filters → Data should update
3. Click on territorial map → Should show governance details

**Notes:**
```
[Record your findings]
```

---

### Feature #10: Sustainable Finance & ESG Dashboard
**How to Access:** Navigate to "ESG Dashboard" or "Carbon Emissions" in menu

**EXPECTED STATUS: 60% COMPLETE**

Check what EXISTS:
- [ ] Carbon emissions tracking visible
- [ ] Provincial GHG by sector chart
- [ ] Emission factors by fuel type
- [ ] Carbon reduction targets shown

Check what's MISSING (should NOT be present yet):
- [ ] ❌ Green bond tracking (if present, note it!)
- [ ] ❌ ESG ratings dashboard (if present, note it!)
- [ ] ❌ Sustainability-linked loans (if present, note it!)
- [ ] ❌ Carbon pricing exposure modeling (if present, note it!)

**Notes:**
```
If ESG features ARE present, document thoroughly - this would mean
they were implemented after the README was written!
```

---

## SECTION 4: ORIGINAL 20 FEATURES

### Quick Checks for Other Key Features

**Renewable Curtailment Analytics**
- [ ] Navigate to dashboard
- [ ] 6 curtailment reasons classified (transmission, oversupply, negative pricing, frequency, voltage, other)
- [ ] AI mitigation recommendations present
- [ ] Effectiveness scoring visible
- [ ] Export functionality

**Storage Dispatch Intelligence**
- [ ] Navigate to dashboard
- [ ] Battery state-of-charge (SoC) graph
- [ ] Charge/discharge decisions logged
- [ ] Round-trip efficiency shown (target: >88%)
- [ ] Revenue tracking

**Multi-Horizon Renewable Forecasting**
- [ ] Navigate to dashboard
- [ ] All 6 time horizons: 1h, 3h, 6h, 12h, 24h, 48h
- [ ] 3-model ensemble results
- [ ] Confidence intervals (shaded areas)
- [ ] Accuracy metrics: MAPE, MAE, RMSE

**Real-Time CO2 Emissions Tracker**
- [ ] Navigate to dashboard
- [ ] Live emissions calculation
- [ ] Fuel-specific emission factors shown
- [ ] Fossil vs. renewable split chart
- [ ] Carbon intensity trending
- [ ] Provincial comparison

**Household Energy Advisor**
- [ ] Navigate to dashboard
- [ ] AI chatbot interface present
- [ ] Can send messages and get responses
- [ ] TOU pricing recommendations
- [ ] Rebate matching
- [ ] Savings calculations

**Notes:**
```
[Record findings for each feature]
```

---

## SECTION 5: DATA QUALITY VERIFICATION

### Real-Time Data Streams (Check if data is updating)

**Ontario IESO Data**
- [ ] Navigate to Real-Time Dashboard
- [ ] Ontario demand chart shows recent data (check timestamp)
- [ ] Ontario prices chart shows recent data
- [ ] Data should be from today or yesterday (hourly updates)
- [ ] Numbers should be realistic (demand: 10,000-20,000 MW range)

**Weather Data**
- [ ] Navigate to Analytics & Trends Dashboard
- [ ] Weather correlation section present
- [ ] 8 provinces should have weather data
- [ ] Updates every 3 hours (check timestamps)
- [ ] Temperature, conditions visible

**Storage Dispatch**
- [ ] Navigate to Storage Dispatch Dashboard
- [ ] Recent dispatch actions logged (timestamps within last 30 minutes)
- [ ] State-of-charge updating
- [ ] Action types: charge, discharge, hold

**Notes:**
```
Check timestamps carefully - if data is weeks/months old, automated
crons may not be working
```

---

## SECTION 6: PERFORMANCE & UX

### Performance Tests

**Load Times (use DevTools Network tab)**
- [ ] Initial page load: <3 seconds
- [ ] Dashboard navigation: <1 second
- [ ] Chart rendering: <2 seconds
- [ ] API calls: <500ms

**Browser Console**
- [ ] Open DevTools → Console tab
- [ ] Count errors: ___ errors found
- [ ] Count warnings: ___ warnings found
- [ ] Any critical errors? List them:
  ```
  [List any red console errors here]
  ```

### User Experience

**Visual Design**
- [ ] Tokyo Night theme consistently applied
- [ ] No generic purple gradients (check throughout site)
- [ ] Typography distinctive and professional
- [ ] Color scheme consistent
- [ ] Charts well-designed

**Interactions**
- [ ] Buttons respond on click
- [ ] Dropdowns open properly
- [ ] Charts interactive (hover, zoom, pan)
- [ ] Tooltips appear on hover
- [ ] Loading states present (spinners, skeletons)
- [ ] Error messages user-friendly

**Notes:**
```
[Visual design and UX observations]
```

---

## SECTION 7: SECURITY CHECKS (Basic)

### Public-Facing Security

- [ ] No API keys visible in browser DevTools → Network tab
- [ ] No error messages leaking sensitive info
- [ ] HTTPS enabled (green padlock in browser)
- [ ] No console warnings about insecure content
- [ ] CORS errors? (should not see any)

**Notes:**
```
[Any security concerns]
```

---

## SECTION 8: BONUS FEATURES

### Check for These Additional Features

**Peak Alert Banner**
- [ ] Look for alert banner at top of Real-Time Dashboard
- [ ] Should show if demand is spiking
- [ ] Color-coded severity
- [ ] Dismissible

**Renewable Penetration Heatmap**
- [ ] Navigate to Analytics & Trends Dashboard
- [ ] Heatmap showing provinces (0% red → 100% green)
- [ ] Interactive province details
- [ ] National statistics

**Award Evidence Export**
- [ ] Look for "Export Award Evidence" button
- [ ] Click should download CSV
- [ ] CSV should have provenance data

**Model Cards**
- [ ] Navigate to Renewable Forecasting
- [ ] Look for "Model Card" or documentation links
- [ ] Solar model card accessible
- [ ] Wind model card accessible

**Notes:**
```
[Bonus feature findings]
```

---

## SECTION 9: MISSING FEATURES CONFIRMATION

### Features That Should NOT Be Present Yet

Based on the gap analysis, these should be MISSING:

**Sustainable Finance & ESG (partially missing)**
- [ ] ❌ Green bond tracking dashboard
- [ ] ❌ ESG ratings by company (MSCI, Sustainalytics scores)
- [ ] ❌ Sustainability-linked loans tracking
- [ ] ❌ Carbon pricing impact modeling ($170/tonne by 2030)

**Industrial Decarbonization (mostly missing)**
- [ ] ❌ Facility-level emission tracking (>500 facilities)
- [ ] ❌ Methane reduction tracker (75% federal target)
- [ ] ❌ OBPS credits/debits dashboard
- [ ] ❌ Process efficiency improvements section

**Grid Modernization (partially missing)**
- [ ] ❌ DERMS adoption tracking
- [ ] ❌ Distribution automation metrics
- [ ] ❌ Canadian smart meter data (currently using European proxy)
- [ ] ❌ Interoperability standards tracking

**If any of these ARE present, document thoroughly!**

**Notes:**
```
[Unexpected implementations found]
```

---

## SECTION 10: OVERALL ASSESSMENT

### Summary Scores (Your Assessment)

Rate each category 1-5:
- **Original 20 Features**: ___/5
- **Tier 1 Strategic Features**: ___/5
- **Tier 2 Strategic Features**: ___/5
- **Data Quality**: ___/5
- **Performance**: ___/5
- **User Experience**: ___/5
- **Security**: ___/5

**Overall Platform Score**: ___/5

### Critical Issues Found
```
List any showstopper bugs or critical missing features:
1. 
2. 
3. 
```

### Minor Issues Found
```
List any non-critical issues:
1. 
2. 
3. 
```

### Positive Surprises
```
List features that exceeded expectations:
1. 
2. 
3. 
```

### Confirmation of Gap Analysis
```
Do the findings match the gap analysis?
- ESG Dashboard 60% complete: [ ] Confirmed / [ ] Different
- Industrial Decarb 40% complete: [ ] Confirmed / [ ] Different
- Other gaps accurate: [ ] Yes / [ ] No
```

---

## SECTION 11: RECOMMENDATIONS

Based on your verification, prioritize next steps:

**Urgent (Fix Immediately)**
```
1. 
2. 
3. 
```

**High Priority (This Week)**
```
1. 
2. 
3. 
```

**Medium Priority (This Month)**
```
1. 
2. 
3. 
```

**Low Priority (Can Wait)**
```
1. 
2. 
3. 
```

---

## SECTION 12: SPONSORSHIP READINESS FINAL CHECK

### Tier 1 Sponsors (Should be 100% ready for these 7)

**Alberta Innovates**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**AESO**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**NRCan**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**OPG**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**Air Products**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**Microsoft Azure**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

**IESO**
- Required features present: [ ] Yes / [ ] No
- Data quality sufficient: [ ] Yes / [ ] No
- Demo-ready: [ ] Yes / [ ] No

### Final Verdict
```
Can you confidently demo to Tier 1 sponsors today?
[ ] Yes, without reservation
[ ] Yes, but need to fix [list issues]
[ ] No, critical issues must be addressed first

Estimated time to fix critical issues: ___ hours
```

---

## TESTING COMPLETED

**Date Tested:** _______________
**Browser Used:** _______________
**Screen Resolution:** _______________
**Time Spent:** ___ hours

**Tester Notes:**
```
[Final observations, recommendations, or concerns]
```

---

## NEXT STEPS

Based on this verification:

1. **If 95%+ features work as expected:**
   → Start Tier 1 sponsor outreach immediately
   → Build ESG Dashboard in parallel (Week 1)
   → Build Industrial Decarb Dashboard (Week 2)

2. **If 80-95% features work:**
   → Fix critical issues first (1-3 days)
   → Then start outreach
   → Build missing features in parallel

3. **If <80% features work:**
   → Systematic bug fixing needed
   → Delay outreach until platform stable
   → Reassess in 1 week

**Recommended Action:**
```
Based on your findings, write your recommended next steps here:


```