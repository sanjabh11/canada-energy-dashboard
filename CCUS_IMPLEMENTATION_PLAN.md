# CCUS Dashboard Implementation Plan
**Feature**: CCUS Project Tracker
**Timeline**: 2 hours (immediate implementation)
**Priority**: CRITICAL (Pathways Alliance $16.5B sponsorship opportunity)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Data Flow:
```
Database (Supabase)
  ↓
Edge Function (api-v2-ccus)
  ↓
Frontend Component (CCUSProjectTracker.tsx)
  ↓
Navigation Ribbon (new tab)
  ↓
User
```

---

## 📋 STEP-BY-STEP IMPLEMENTATION

### **STEP 1: Create Edge Function API** (30 minutes)

**File**: `supabase/functions/api-v2-ccus/index.ts`

**Endpoints to Implement**:
1. `GET /api-v2-ccus?province=AB&status=Operational`
   - Returns: List of CCUS facilities
   - Filters: province, status, operator

2. `GET /api-v2-ccus/pathways`
   - Returns: Pathways Alliance projects
   - Total investment, status breakdown

3. `GET /api-v2-ccus/pipelines`
   - Returns: ACTL and other pipelines
   - Capacity, throughput, connections

4. `GET /api-v2-ccus/storage`
   - Returns: Storage sites
   - Remaining capacity, injection rates

5. `GET /api-v2-ccus/economics`
   - Returns: Tax credits, carbon credits
   - Aggregated by year

**Security**:
- Input validation using `_shared/validation.ts`
- CORS headers for allowed origins
- Rate limiting (future)

**Response Format**:
```typescript
{
  "facilities": [...],
  "pathways_alliance": {
    "total_investment": 16500000000,
    "projects": [...]
  },
  "summary": {
    "total_operational_capacity_mt": 3.8,
    "total_proposed_capacity_mt": 20.0,
    "cumulative_stored_mt": 40.0
  }
}
```

---

### **STEP 2: TypeScript Interfaces** (10 minutes)

**Interfaces to Define**:
```typescript
interface CCUSFacility {
  id: string;
  facility_name: string;
  operator: string;
  location_city: string;
  province: string;
  status: 'Operational' | 'Under Construction' | 'Proposed' | 'Paused';
  design_capture_capacity_mt_per_year: number;
  current_capture_capacity_mt_per_year: number;
  capture_technology: string;
  storage_type: string;
  cumulative_stored_mt: number;
  capital_cost_cad: number;
  federal_tax_credit_value_cad: number;
  latitude: number;
  longitude: number;
}

interface PathwaysAllianceProject {
  id: string;
  project_name: string;
  member_company: string;
  facility_type: string;
  capture_capacity_mt_per_year: number;
  status: string;
  capex_cad: number;
  federal_tax_credit_requested_cad: number;
  target_operational_date: string;
  connected_to_actl: boolean;
}

interface CCUSPipeline {
  id: string;
  pipeline_name: string;
  operator: string;
  from_location: string;
  to_location: string;
  total_length_km: number;
  design_capacity_mt_per_year: number;
  current_throughput_mt_per_year: number;
  status: string;
}

interface CCUSStorageSite {
  id: string;
  site_name: string;
  operator: string;
  location: string;
  reservoir_type: string;
  total_storage_capacity_mt: number;
  cumulative_injected_mt: number;
  remaining_capacity_mt: number;
}

interface CCUSDashboardData {
  facilities: CCUSFacility[];
  pathways_projects: PathwaysAllianceProject[];
  pipelines: CCUSPipeline[];
  storage_sites: CCUSStorageSite[];
  summary: {
    total_operational_capacity_mt: number;
    total_proposed_capacity_mt: number;
    cumulative_stored_mt: number;
    total_pathways_investment_cad: number;
  };
}
```

---

### **STEP 3: Frontend Component Structure** (60 minutes)

**File**: `src/components/CCUSProjectTracker.tsx`

**Component Sections**:

1. **Header Section**
   - Title: "CCUS Project Tracker"
   - Subtitle: "Alberta's $30B Carbon Capture Corridor"
   - Stats cards: Total Capture Capacity, Storage Capacity, Federal Investment

2. **Pathways Alliance Dashboard** (Priority #1)
   - KPI Cards:
     - Total Investment: $16.5B
     - Member Companies: 6
     - Total Capture Capacity: 15+ Mt/year
     - Status: "Awaiting Federal Decision"
   - Project Breakdown Table:
     - Company, Project, Capacity, CapEx, Tax Credit, Status
   - Status Timeline Chart

3. **Operational Facilities Map**
   - Alberta map centered on Edmonton-Calgary corridor
   - Markers:
     - Quest (Fort Saskatchewan) - Green
     - NWRP (Redwater) - Green
     - Strathcona (Edmonton) - Yellow (Under Construction)
     - Capital Power (Genesee) - Blue (Proposed)
   - ACTL pipeline overlay (red line)
   - Storage sites (purple markers)

4. **Capture Capacity Chart**
   - Stacked bar chart:
     - X-axis: Facility
     - Y-axis: Mt CO2/year
     - Stacks: Operational (green), Under Construction (yellow), Proposed (blue)
   - Total capacity line

5. **Storage Monitoring**
   - Donut chart: Storage capacity used vs remaining
   - Table: Storage sites with capacity details
   - Containment status indicators

6. **Economics Dashboard**
   - Federal Tax Credit Tracker:
     - Allocated: $2.6B
     - Pathways Requested: $9.75B
     - Gap: $7.15B
   - Carbon Credit Revenue (bar chart by year)
   - Cost per Tonne trends

7. **Technology Breakdown**
   - Pie chart: Capture technology distribution
     - Post-combustion
     - Pre-combustion
     - Oxy-fuel
     - Direct Air Capture

**Visual Design**:
- Color scheme:
  - Green: Operational
  - Yellow: Under Construction
  - Blue: Proposed
  - Red: Critical/Pathways
  - Purple: Storage
- Icons from lucide-react:
  - Factory (facilities)
  - Cloud (CO2 capture)
  - Database (storage)
  - DollarSign (economics)
  - TrendingUp (capacity)

---

### **STEP 4: Data Fetching Logic** (15 minutes)

```typescript
const [data, setData] = useState<CCUSDashboardData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function fetchCCUSData() {
    try {
      setLoading(true);
      const response = await fetch('/api-v2-ccus?province=AB');
      if (!response.ok) throw new Error('Failed to fetch CCUS data');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  fetchCCUSData();
}, []);
```

---

### **STEP 5: Navigation Integration** (10 minutes)

**File**: `src/components/EnergyDataDashboard.tsx`

**Changes**:
1. Add import: `import CCUSProjectTracker from './CCUSProjectTracker';`
2. Add to `coreNavigationTabs`:
   ```typescript
   { id: 'CCUS', label: 'CCUS Tracker', icon: Factory }
   ```
3. Add route:
   ```typescript
   {activeTab === 'CCUS' && <CCUSProjectTracker />}
   ```
4. Add help ID:
   ```typescript
   CCUS: 'page.ccus-tracker'
   ```

---

### **STEP 6: Validation & Shared Utilities** (5 minutes)

**File**: `supabase/functions/_shared/validation.ts`

**Add CCUS-specific validation**:
```typescript
export const VALID_CCUS_STATUSES = [
  'Proposed',
  'Under Development',
  'Under Construction',
  'Commissioning',
  'Operational',
  'Paused',
  'Decommissioned'
] as const;

export const VALID_STORAGE_TYPES = [
  'Saline Aquifer',
  'Depleted Oil/Gas Reservoir',
  'Enhanced Oil Recovery',
  'Mineralization'
] as const;
```

---

## 🎨 MOCKUP WIREFRAME

```
┌─────────────────────────────────────────────────────────────┐
│ CCUS Project Tracker - Alberta's $30B Carbon Capture       │
│ Corridor                                                     │
├─────────────────────────────────────────────────────────────┤
│ [3.8 Mt/year]    [100 Mt Storage]    [$2.6B Fed Tax Credit]│
│ Operational      Capacity Used        Allocated             │
├─────────────────────────────────────────────────────────────┤
│ 🔴 PATHWAYS ALLIANCE DASHBOARD                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Total Investment: $16.5B | 6 Companies | 15+ Mt/year  │  │
│ │ Status: Awaiting Federal Decision                      │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Company      | Project        | Capacity | CapEx      │  │
│ │ Suncor       | Fort Hills     | 3.0 Mt   | $5.0B      │  │
│ │ CNRL         | Horizon        | 4.0 Mt   | $6.5B      │  │
│ │ Cenovus      | Christina Lake | 2.5 Mt   | $4.0B      │  │
│ │ Imperial Oil | Kearl          | 2.0 Mt   | $3.5B      │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ 🗺️ ALBERTA CCUS CORRIDOR MAP                                │
│ ┌───────────────────────────────────────────────────────┐  │
│ │         [Fort Saskatchewan - Quest ●]                  │  │
│ │              [Redwater - NWRP ●]                       │  │
│ │                   │                                     │  │
│ │              [Edmonton ▼]                              │  │
│ │                   │ ACTL Pipeline                      │  │
│ │                   │                                     │  │
│ │              [Red Deer ▼]                              │  │
│ │                   │                                     │  │
│ │         [Clive Storage Site ◆]                         │  │
│ │                                                         │  │
│ │         [Calgary ▼]                                    │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ 📊 CAPTURE CAPACITY BY FACILITY                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Quest        ████████ 1.2 Mt/year (Operational)        │  │
│ │ NWRP         ██████ 1.2 Mt/year (Operational)          │  │
│ │ Boundary Dam █████ 1.0 Mt/year (Operational)           │  │
│ │ Strathcona   ███ 0.5 Mt/year (Under Construction)      │  │
│ │ Pathways...  ████████████████ 15+ Mt/year (Proposed)   │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ 💰 FEDERAL TAX CREDIT TRACKER                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Allocated:  $2.6B ████░░░░░░░░░░░░░░░░░░░ (21%)       │  │
│ │ Requested:  $9.75B ████████████████████████ (79%)      │  │
│ │ Gap:        $7.15B                                     │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTING PLAN

### Unit Tests:
1. Edge function returns correct data structure
2. Component renders without crashing
3. Data fetching handles errors gracefully
4. Charts render with real data

### Integration Tests:
1. Navigation works (click CCUS tab)
2. Help button integration
3. Data updates on refresh
4. Responsive design on mobile

### User Acceptance:
1. Can view Pathways Alliance status
2. Can see operational facilities on map
3. Can understand tax credit gap
4. Can identify storage capacity

---

## 📈 SUCCESS CRITERIA

✅ **Technical**:
- Edge function deployed and responding < 500ms
- Component renders in < 2s
- Zero TypeScript errors
- All charts display real data

✅ **Business**:
- Pathways Alliance $16.5B proposal clearly visible
- Federal tax credit gap highlighted ($7.15B)
- Operational vs proposed capacity differentiated
- Sponsorship value proposition clear

---

## ⏱️ ESTIMATED TIMELINE

- **Edge Function**: 30 min
- **TypeScript Interfaces**: 10 min
- **Component Structure**: 30 min
- **Visualizations**: 30 min
- **Navigation Integration**: 10 min
- **Testing**: 10 min
- **Total**: **2 hours**

---

## 🚀 IMPLEMENTATION ORDER

1. ✅ Database migration (COMPLETE)
2. 🔨 Edge function (NEXT - 30 min)
3. 🔨 Component scaffold (45 min)
4. 🔨 Pathways Alliance section (30 min)
5. 🔨 Map + charts (30 min)
6. 🔨 Navigation integration (10 min)
7. 🔨 Testing (15 min)

**Let's start building!** 🏗️
