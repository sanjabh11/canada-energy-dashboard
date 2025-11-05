# Phase 1 User Testing Guide

## How to Check All Phase 1 Features

This guide walks you through testing all Phase 1 features step-by-step.

---

## 🚀 Quick Access

After deployment, your Phase 1 features are accessible through 3 new tabs in the main navigation:

1. **AI Data Centres** tab (Server icon 🖥️)
2. **Hydrogen Hub** tab (Fuel icon ⛽)
3. **Critical Minerals** tab (Package icon 📦)

---

## Part 1: AI Data Centre Dashboard

### Step 1: Navigate to AI Data Centres Tab

1. Open your application in the browser
2. Look at the top navigation bar
3. Click the **"More ▾"** dropdown (or scroll right in the navigation tabs)
4. Click on **"AI Data Centres"** tab (should have a Server/Computer icon)

### Step 2: What You Should See

**Top Section: Critical Alerts** (if any queue/reliability issues)
- Red/yellow banner with warnings about AESO queue or grid reliability
- Example: "AESO Phase 1 allocation is 65% utilized (780 MW / 1,200 MW)"

**Metric Cards Section** (4 cards in a row)
1. **Total Facilities Card**
   - Should show: **5 facilities**
   - Icon: Server icon
   - Subtitle: "Operational & Under Construction"

2. **Total Capacity Card**
   - Should show: **2,180 MW**
   - Icon: Zap (lightning) icon
   - Subtitle: "Contracted Capacity"

3. **Average PUE Card**
   - Should show: **1.35** (Power Usage Effectiveness)
   - Icon: Activity (graph) icon
   - Subtitle: "Industry Best: <1.3"

4. **Grid Impact Card**
   - Should show: **13.9%** of peak demand
   - Icon: AlertTriangle icon
   - Subtitle: "Of Alberta's 15,697 MW peak"

### Step 3: Check Phase 1 Allocation Chart (Radial Gauge)

**What it shows:**
- Title: "AESO Phase 1 Allocation (1,200 MW Limit)"
- A circular gauge showing capacity usage
- **Should display: 780 MW / 1,200 MW = 65%**
- Color: Blue if under 80%, Yellow if 80-90%, Red if >90%

**Why it matters:**
- AESO limited Phase 1 data centre allocations to 1,200 MW total
- This shows how much has been allocated vs remaining capacity
- Critical for new data centre operators planning to enter Alberta

### Step 4: Check Grid Impact Breakdown (Pie Chart)

**What it shows:**
- Title: "Grid Impact Breakdown"
- Pie chart with segments for:
  - **Data Centres: 2,180 MW** (what's operational/planned)
  - **Available: ~13,517 MW** (remaining grid capacity)

**Colors:**
- Data Centres segment: Blue
- Available segment: Gray/Light color

### Step 5: Check AESO Queue Breakdown (Bar Chart)

**What it shows:**
- Title: "AESO Interconnection Queue by Type"
- Horizontal bar chart showing project types in queue
- **Should show 8 projects totaling 3,270 MW:**
  - AI Data Centre: Multiple projects
  - Solar: 500 MW
  - Wind: 400 MW
  - Battery Storage: 250 MW

**Why it matters:**
- Shows what's waiting to connect to Alberta's grid
- Data centres dominate the queue (potential reliability concern)

### Step 6: Check Operator Breakdown (Bar Chart)

**What it shows:**
- Title: "Capacity by Operator"
- Bar chart showing each operator's capacity
- **Should show 5 operators:**
  1. **Microsoft Azure** (Calgary): 750 MW
  2. **Amazon AWS** (Calgary): 500 MW
  3. **Digital Realty** (Calgary): 380 MW
  4. **QTS Data Centers** (Edmonton): 300 MW
  5. **Vantage Data Centers** (Calgary): 250 MW

**Colors:**
- Each operator gets a different color from the palette

### Step 7: Check Data Centre Registry Table

**What it shows:**
- Title: "Data Centre Registry"
- Table with 5 facilities
- **Columns:**
  1. **Facility Name**
  2. **Location** (City)
  3. **Capacity (MW)**
  4. **Status** (badge: green=Operational, blue=Under Construction, yellow=Planned)
  5. **PUE** (Power Usage Effectiveness)
  6. **Cooling Type** (Liquid/Air)

**Sample Data to Verify:**
| Facility | Location | Capacity | Status | PUE | Cooling |
|----------|----------|----------|--------|-----|---------|
| Microsoft Azure Calgary DC | Calgary | 750 MW | Operational | 1.25 | Liquid |
| Amazon AWS Calgary | Calgary | 500 MW | Under Construction | 1.30 | Liquid |
| Digital Realty YYC-1 | Calgary | 380 MW | Operational | 1.40 | Air |
| QTS Edmonton Data Center | Edmonton | 300 MW | Operational | 1.35 | Hybrid |
| Vantage Calgary Campus | Calgary | 250 MW | Planned | 1.45 | Air |

### Step 8: Test Province Filter

**Location:** Top-left of the dashboard

**What to test:**
1. Click the **Province dropdown**
2. Should see options: **All Provinces, AB, BC, ON, QC**
3. Select **AB** (Alberta) - should show all 5 facilities (default)
4. Select **BC** - should show 0 facilities or "No data" message
5. Switch back to **AB** or **All Provinces**

### Step 9: Check Power Consumption Trends (if loaded)

**What it shows:**
- Title: "Power Consumption Trends"
- Line chart showing power usage over time
- X-axis: Timestamps
- Y-axis: Power (MW)

**Note:** This may be empty if no time-series data is loaded yet.

---

## Part 2: Hydrogen Economy Dashboard

### Step 1: Navigate to Hydrogen Hub Tab

1. In the top navigation bar
2. Click **"More ▾"** dropdown
3. Click on **"Hydrogen Hub"** tab (should have a Fuel/Gas pump icon ⛽)

### Step 2: What You Should See

**Top Section: Hub Comparison Alert**
- Info banner comparing Edmonton vs Calgary hubs
- Example: "Edmonton Hub: 3 facilities, Calgary Hub: 2 facilities"

**Metric Cards Section** (4 cards)
1. **Total Facilities**
   - Should show: **5 facilities**
   - Icon: Factory icon

2. **Total Production Capacity**
   - Should show: **~500 tonnes H2/day**
   - Icon: Zap icon

3. **Total Investment**
   - Should show: **$1.68B** (operational facilities)
   - Icon: DollarSign icon

4. **Major Projects Pipeline**
   - Should show: **5 projects, $4.8B**
   - Icon: Briefcase icon

### Step 3: Check Hub Comparison Chart (Grouped Bar)

**What it shows:**
- Title: "Edmonton vs Calgary Hub Comparison"
- Grouped bar chart comparing the two cities
- **Metrics shown:**
  1. **Number of Facilities**: Edmonton vs Calgary
  2. **Production Capacity (tonnes/day)**: Edmonton vs Calgary
  3. **Investment ($M)**: Edmonton vs Calgary

**Colors:**
- Edmonton: Blue
- Calgary: Green

**Expected data:**
- Edmonton: 3 facilities, higher capacity (includes Air Products $1.3B)
- Calgary: 2 facilities, growing with AZETEC

### Step 4: Check Hydrogen Color Distribution (Pie Chart)

**What it shows:**
- Title: "Hydrogen by Color Type"
- Pie chart showing production method breakdown
- **Should show 3 segments:**
  1. **Green Hydrogen** (60%): From renewable energy - Green color
  2. **Blue Hydrogen** (30%): From natural gas + carbon capture - Blue color
  3. **Grey Hydrogen** (10%): From natural gas without capture - Gray color

**Why it matters:**
- Green = zero emissions (premium market)
- Blue = low emissions (transition fuel)
- Grey = high emissions (being phased out)

### Step 5: Check Facilities by Type (Bar Chart)

**What it shows:**
- Title: "Facilities by Type"
- Bar chart showing facility categories
- **Should show:**
  1. **Production**: 3 facilities
  2. **Refueling Station**: 1 facility
  3. **Storage**: 1 facility

### Step 6: Check Hydrogen Pricing Trends (Line Chart)

**What it shows:**
- Title: "Hydrogen Pricing Trends ($/kg)"
- Line chart with pricing over time
- **Should show 3 lines:**
  1. **Green H2 Price**: Highest line (premium)
  2. **Blue H2 Price**: Middle line
  3. **Diesel Equivalent**: Comparison baseline

**Colors:**
- Green H2: Green line
- Blue H2: Blue line
- Diesel: Orange/Red line (dashed)

**Expected price range:**
- Green H2: $8-12/kg
- Blue H2: $4-7/kg
- Diesel equivalent: $2-3/kg

### Step 7: Check Demand Forecast (Stacked Area Chart)

**What it shows:**
- Title: "Hydrogen Demand Forecast by Sector"
- Stacked area chart showing future demand
- **Sectors shown:**
  1. **Transportation**: Trucks, buses, trains
  2. **Industry**: Refineries, petrochemicals
  3. **Power Generation**: Grid storage, peaker plants
  4. **Buildings**: Heating, backup power

**Timeline:** 2025-2035 forecast

### Step 8: Check Major Projects Section

**What it shows:**
- Title: "Major Hydrogen Projects"
- Grid of project cards (2-3 per row)
- **Should show 5 projects:**

**1. Air Products Edmonton Hub**
- Location: Edmonton, AB
- Capacity: 1,500 tonnes H2/day
- Investment: $1.3B
- Status: Under Construction (blue badge)
- Completion: 2024
- Icon: Factory

**2. AZETEC Calgary**
- Location: Calgary, AB
- Capacity: 4,500 tonnes NH3/day (ammonia)
- Investment: $1.4B
- Status: Under Construction
- Completion: 2025

**3. Calgary-Banff Hydrogen Rail**
- Location: Calgary-Banff corridor
- Investment: $2B
- Status: Planned (yellow badge)
- Description: Hydrogen-powered passenger rail

**4. Suncor Hydrogen Refinery**
- Location: Fort McMurray, AB
- Status: Operational (green badge)
- Blue hydrogen from upgrader

**5. Parkland Refueling Network**
- Location: Alberta-wide
- Investment: $50M
- Status: Operational
- Type: Refueling infrastructure

### Step 9: Test Hub Filter

**Location:** Top of dashboard

**What to test:**
1. Click **Hub dropdown**
2. Should see: **All Hubs, Edmonton, Calgary**
3. Select **Edmonton**: Should filter to show only Edmonton facilities/projects
4. Select **Calgary**: Should filter to show only Calgary facilities/projects
5. Select **All Hubs**: Shows everything

---

## Part 3: Critical Minerals Supply Chain Dashboard

### Step 1: Navigate to Critical Minerals Tab

1. In the top navigation bar
2. Click **"More ▾"** dropdown
3. Click on **"Critical Minerals"** tab (should have a Package icon 📦)

### Step 2: What You Should See

**Top Section: Strategic Alert**
- Info banner highlighting supply chain gaps
- Example: "Canada has no domestic cobalt refining capacity - 100% import dependent"

**Metric Cards Section** (4 cards)
1. **Active Projects**
   - Should show: **7 projects**
   - Icon: MapPin icon

2. **Total Investment**
   - Should show: **$6.45B**
   - Icon: DollarSign icon

3. **Supply Chain Completeness**
   - Should show: **~45%** (average across minerals)
   - Icon: Activity icon
   - Color: Red/Yellow (indicating gaps)

4. **China Dependency**
   - Should show: **65-75%** (for critical processing)
   - Icon: Globe icon
   - Color: Red (danger)

### Step 3: Select a Mineral to Analyze

**Location:** Top of dashboard

**Mineral Selector:**
- Click dropdown to see available minerals
- **6 Priority Minerals:**
  1. **Lithium** (batteries)
  2. **Cobalt** (batteries)
  3. **Nickel** (batteries)
  4. **Graphite** (batteries)
  5. **Copper** (electrical)
  6. **Rare Earth Elements** (magnets, electronics)

**For testing: Select "Lithium"**

### Step 4: Check Supply Chain Completeness Flow (Stacked Bar)

**What it shows:**
- Title: "Supply Chain Completeness - [Selected Mineral]"
- Stacked bar chart showing 6 stages from mine to recycling
- **Stages (left to right):**
  1. **Mining**: Extract ore from ground
  2. **Concentration**: Initial processing
  3. **Refining**: Purification
  4. **Processing**: Chemical conversion
  5. **Manufacturing**: Battery/component production
  6. **Recycling**: End-of-life recovery

**Colors per stage:**
- **Green (100%)**: Canada has domestic capacity
- **Yellow (50%)**: Partial capacity / gaps identified
- **Red (0%)**: No domestic capacity / 100% import dependent

**Example for Lithium:**
- Mining: 100% (green) - Canada has lithium mines
- Concentration: 100% (green) - Processing facilities exist
- Refining: 50% (yellow) - Limited capacity
- Processing: 0% (red) - No lithium hydroxide plants
- Manufacturing: 0% (red) - No battery cell production
- Recycling: 0% (red) - No lithium recycling facilities

**Key Insight:**
- Canada has raw materials but lacks downstream processing
- Sends lithium abroad for processing, buys back batteries at high cost

### Step 5: Check China Dependency Analysis (Pie Chart)

**What it shows:**
- Title: "China Dependency - [Selected Mineral]"
- Pie chart showing import dependency
- **Two segments:**
  1. **China**: Red color (percentage dependent on China)
  2. **Other Sources**: Green color (remainder)

**Expected data (varies by mineral):**
- **Graphite**: 100% from China (critical!)
- **Rare Earths**: 80% from China
- **Cobalt Refining**: 70% from China
- **Lithium Processing**: 60% from China
- **Nickel**: 35% from China

**Why it matters:**
- National security risk
- Supply chain vulnerability
- Price volatility exposure

### Step 6: Check Battery Minerals Demand (Bar Chart)

**What it shows:**
- Title: "Battery Supply Chain - Annual Minerals Demand"
- Bar chart showing demand from Canadian battery facilities
- **Should show 4 battery minerals:**
  1. **Lithium**: ~15,000 tonnes/year
  2. **Cobalt**: ~8,000 tonnes/year
  3. **Nickel**: ~25,000 tonnes/year
  4. **Graphite**: ~35,000 tonnes/year

**Data source:** 4 battery facilities in Canada with 135 GWh capacity

**Key facilities:**
1. Northvolt (Quebec): 60 GWh
2. Stellantis-LGES (Ontario): 45 GWh
3. Volkswagen PowerCo (Ontario): 20 GWh
4. GM-POSCO (Quebec): 10 GWh

### Step 7: Check Projects by Province (Bar Chart)

**What it shows:**
- Title: "Critical Minerals Projects by Province"
- Horizontal bar chart showing project distribution
- **Should show:**
  1. **Quebec**: 3 projects (Lithium, Graphite, REE)
  2. **Ontario**: 2 projects (Nickel, Copper)
  3. **Saskatchewan**: 1 project (Potash/REE)
  4. **British Columbia**: 1 project (Copper)

**Colors:** Different color per province

### Step 8: Check Projects by Stage (Donut Chart)

**What it shows:**
- Title: "Projects by Development Stage"
- Donut chart showing project maturity
- **Stages:**
  1. **Operational** (Green): Currently producing
  2. **Under Construction** (Blue): Being built
  3. **Advanced** (Yellow): Permitted, financing secured
  4. **Exploration** (Gray): Early stage

**Expected distribution:**
- Operational: 2 projects (29%)
- Under Construction: 2 projects (29%)
- Advanced: 2 projects (28%)
- Exploration: 1 project (14%)

### Step 9: Check Price Volatility Index (Line Chart)

**What it shows:**
- Title: "Price Volatility Index (12-month)"
- Line chart showing price changes over time
- **Multiple lines for different minerals:**
  - Lithium: High volatility (300% swings in 2022-23)
  - Cobalt: Medium volatility
  - Nickel: Medium-high volatility
  - Copper: Low volatility (stable)

**Y-axis:** Volatility score (0-100)
**X-axis:** Last 12 months

### Step 10: Check Strategic Recommendations

**What it shows:**
- Title: "Strategic Recommendations"
- List of actionable recommendations based on data
- **Should show 5-8 recommendations like:**

1. **Priority: Build Lithium Processing Capacity**
   - Icon: AlertTriangle (high priority)
   - "Canada sends lithium ore to China for processing. Build domestic lithium hydroxide plants."

2. **Priority: Establish Cobalt Refining**
   - Icon: AlertTriangle
   - "0% domestic cobalt refining capacity. Critical for EV battery security."

3. **Opportunity: Graphite Supply Chain**
   - Icon: TrendingUp
   - "Quebec has graphite reserves. Invest in spherical graphite production."

4. **Risk: China Dependency**
   - Icon: Shield
   - "65% of critical minerals processing happens in China. Diversify supply chains."

5. **Investment Opportunity: Battery Recycling**
   - Icon: DollarSign
   - "No lithium recycling facilities. Market gap worth $500M+ by 2030."

### Step 11: Check Project Registry Table

**What it shows:**
- Title: "Critical Minerals Project Registry"
- Detailed table with all 7 projects
- **Columns:**
  1. **Project Name**
  2. **Mineral Type**
  3. **Province**
  4. **Investment ($M)**
  5. **Status** (badge)
  6. **Stage**
  7. **Completion Date**

**Sample projects to verify:**

| Project | Mineral | Province | Investment | Status |
|---------|---------|----------|------------|--------|
| James Bay Lithium | Lithium | QC | $1,400M | Under Construction |
| Nouveau Monde Graphite | Graphite | QC | $850M | Advanced |
| Vale Voisey's Bay | Nickel | NL | $2,000M | Operational |
| First Quantum Copper | Copper | BC | $1,200M | Under Construction |
| Imperial Mining REE | Rare Earths | QC | $600M | Advanced |
| Saskatchewan Potash | Potash/REE | SK | $300M | Exploration |
| Glencore Sudbury | Nickel/Cobalt | ON | $100M | Operational |

### Step 12: Test Priority Filter

**Location:** Top of dashboard

**What to test:**
1. Click **"Priority Minerals Only"** toggle/checkbox
2. When ON: Shows only 6 priority minerals (Lithium, Cobalt, Nickel, Graphite, Copper, REE)
3. When OFF: Shows all 34 minerals tracked
4. Toggle back and forth to see difference

---

## Part 4: Data API Testing (Optional - For Developers)

### Test API Endpoints Directly

Open your browser's developer console (F12) or use curl:

### 1. AI Data Centres API

```bash
# Get all Alberta data centres
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-ai-datacentres?province=AB"

# Expected response: JSON with 5 facilities, summary stats
```

### 2. AESO Queue API

```bash
# Get active queue projects
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-aeso-queue?status=Active"

# Expected response: JSON with 8 projects, 3,270 MW total
```

### 3. Hydrogen Hub API

```bash
# Get Edmonton hub data
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-hydrogen-hub?hub=Edmonton"

# Expected response: JSON with Edmonton facilities, projects, pricing
```

### 4. Minerals Supply Chain API

```bash
# Get lithium supply chain
curl "https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/api-v2-minerals-supply-chain?mineral=Lithium"

# Expected response: JSON with supply chain stages, projects, dependencies
```

---

## Part 5: Database Verification (Optional - For Admins)

### Check Database Tables

Connect to your Supabase database and run:

```sql
-- Verify AI Data Centres tables
SELECT COUNT(*) FROM ai_data_centres;  -- Should return 5
SELECT COUNT(*) FROM aeso_interconnection_queue;  -- Should return 8

-- Verify Hydrogen tables
SELECT COUNT(*) FROM hydrogen_facilities;  -- Should return 5
SELECT COUNT(*) FROM hydrogen_projects;  -- Should return 5

-- Verify Critical Minerals tables
SELECT COUNT(*) FROM critical_minerals_projects;  -- Should return 7
SELECT COUNT(*) FROM battery_supply_chain;  -- Should return 4

-- Check sample data
SELECT facility_name, location, capacity_mw, status
FROM ai_data_centres
ORDER BY capacity_mw DESC;

SELECT project_name, capex_millions, status
FROM hydrogen_projects
ORDER BY capex_millions DESC;

SELECT project_name, mineral, province, capex_millions
FROM critical_minerals_projects
ORDER BY capex_millions DESC;
```

---

## Troubleshooting

### Issue: "No data available" shows in dashboard

**Possible causes:**
1. Database migrations not applied
2. API endpoints not deployed
3. CORS errors blocking API calls

**How to check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages like:
   - `404 Not Found` → Edge Functions not deployed
   - `CORS policy` → CORS configuration issue
   - `Network Error` → Database connection issue

**Fix:**
- Verify migrations: `supabase db inspect tables | grep -E "(ai_data|hydrogen|minerals)"`
- Verify functions: `supabase functions list`
- Check logs: `supabase functions logs api-v2-ai-datacentres`

### Issue: Charts don't render

**Possible causes:**
1. Data format mismatch
2. Recharts library not loaded
3. Browser compatibility

**How to check:**
1. Open Console (F12)
2. Look for Recharts errors or warnings
3. Try in different browser (Chrome/Firefox/Safari)

**Fix:**
- Verify recharts version: `npm list recharts` (should be 2.15+)
- Clear cache and reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Issue: Navigation tabs don't show Phase 1 tabs

**Possible causes:**
1. Frontend not rebuilt after changes
2. Cache issue
3. Wrong build deployed

**Fix:**
1. Rebuild: `npm run build:prod`
2. Clear browser cache
3. Hard reload: Ctrl+Shift+R
4. Check `EnergyDataDashboard.tsx` has the new imports

---

## Success Checklist

After going through this guide, you should have verified:

### AI Data Centre Dashboard ✅
- [ ] Dashboard loads without errors
- [ ] Shows 5 facilities totaling 2,180 MW
- [ ] Phase 1 allocation gauge shows 780/1,200 MW
- [ ] AESO queue shows 8 projects
- [ ] Province filter works (AB/BC/ON/QC)
- [ ] Data centre registry table displays correctly
- [ ] All charts render properly

### Hydrogen Economy Dashboard ✅
- [ ] Dashboard loads without errors
- [ ] Shows 5 facilities and 5 projects
- [ ] Hub comparison shows Edmonton vs Calgary
- [ ] Hydrogen color distribution shows Green/Blue/Grey
- [ ] Pricing trends chart displays
- [ ] Major projects cards show Air Products, AZETEC, etc.
- [ ] Hub filter works (Edmonton/Calgary/All)
- [ ] All metrics display correctly

### Critical Minerals Dashboard ✅
- [ ] Dashboard loads without errors
- [ ] Shows 7 projects totaling $6.45B
- [ ] Mineral selector works (Lithium, Cobalt, etc.)
- [ ] Supply chain completeness shows 6 stages
- [ ] China dependency chart displays
- [ ] Battery minerals demand shows 4 minerals
- [ ] Strategic recommendations list appears
- [ ] Project registry table displays correctly
- [ ] Priority filter toggle works

### General ✅
- [ ] All 3 new tabs appear in navigation
- [ ] No console errors in browser DevTools
- [ ] All API endpoints respond (if tested)
- [ ] Database has sample data (if checked)
- [ ] Page loads in under 3 seconds
- [ ] Mobile responsive (test on phone or resize browser)

---

## Next Steps After Verification

Once you've verified everything works:

1. **Take screenshots** of each dashboard for marketing materials
2. **Record a demo video** (2-3 minutes) showing all features
3. **Prepare pitch deck** using the data you see
4. **Identify top sponsors** from the data:
   - Microsoft Azure (AI Data Centres)
   - Air Products (Hydrogen)
   - Teck Resources (Critical Minerals)

5. **Schedule sponsor demos** and show them their own data in the platform

---

## Questions or Issues?

If something doesn't work as described:

1. Check the **Console tab** in DevTools (F12) for error messages
2. Check the **Network tab** to see if API calls are succeeding
3. Verify deployment completed successfully
4. Review PHASE1_DEPLOYMENT_GUIDE.md for troubleshooting
5. Check database with the SQL queries above

**Remember:** All sample data is demonstration data. You'll need to integrate real-time data feeds for production use (see PHASE1_DEPLOYMENT_GUIDE.md section on "Data Population Strategy").

---

**Happy Testing! 🎉**

You now have a comprehensive platform solving 3 critical Alberta energy challenges:
- ✅ AESO queue management crisis
- ✅ Hydrogen hub tracking
- ✅ Critical minerals supply chain intelligence
