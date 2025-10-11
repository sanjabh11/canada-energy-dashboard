# 🚀 DETAILED IMPLEMENTATION PLAN

## **PHASE 1: IMMEDIATE FIXES** (30 minutes)

### **Task 1.1: Add Renewable Penetration Mock Data**
**Priority:** P2 | **Effort:** 5 minutes | **Impact:** Visual completeness

**Implementation:**
```typescript
// File: src/components/AnalyticsTrendsDashboard.tsx
// Add after line 215

const MOCK_RENEWABLE_PENETRATION = {
  'ON': { renewable_pct: 92, hydro: 60, nuclear: 32, wind: 8, solar: 2 },
  'QC': { renewable_pct: 99, hydro: 95, wind: 3, solar: 1 },
  'BC': { renewable_pct: 98, hydro: 90, wind: 5, solar: 3 },
  'AB': { renewable_pct: 15, wind: 10, solar: 5, gas: 50, coal: 35 },
  'SK': { renewable_pct: 25, hydro: 20, wind: 5, coal: 40, gas: 35 },
  'MB': { renewable_pct: 97, hydro: 95, wind: 2 },
  'NS': { renewable_pct: 35, wind: 15, hydro: 10, biomass: 10, coal: 40, gas: 25 },
  'NB': { renewable_pct: 40, hydro: 25, wind: 10, biomass: 5, nuclear: 30, oil: 30 },
};

// Use this when provincialData is empty
```

**Steps:**
1. Open `src/components/AnalyticsTrendsDashboard.tsx`
2. Add constant above
3. Modify line 216 to use mock data if `data.provincialGeneration.length === 0`
4. Test in browser

---

### **Task 1.2: Remove Unused Mock Functions**
**Priority:** P5 | **Effort:** 10 minutes | **Impact:** Code cleanliness

**Files to Clean:**
1. `src/lib/curtailmentEngine.ts` - Remove `generateMockCurtailmentEvent` (line 476)
2. `src/lib/weatherService.ts` - Keep `generateMockWeather` (still needed until cron implemented)

---

## **PHASE 2: WEATHER INGESTION** (2-3 hours)

### **Task 2.1: Create Weather Ingestion Edge Function**
**Priority:** P4 | **Effort:** 1.5 hours

**File:** `supabase/functions/weather-ingestion-cron/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
const PROVINCES = ['ON', 'QC', 'BC', 'AB'];
const COORDS = {
  'ON': { lat: 43.65, lon: -79.38 },
  'QC': { lat: 45.50, lon: -73.57 },
  'BC': { lat: 49.28, lon: -123.12 },
  'AB': { lat: 51.05, lon: -114.07 },
};

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const observations = [];
  
  for (const province of PROVINCES) {
    const coord = COORDS[province];
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coord.lat}&lon=${coord.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    observations.push({
      province,
      temperature_c: data.main.temp,
      humidity_percent: data.main.humidity,
      wind_speed_ms: data.wind.speed,
      wind_direction_deg: data.wind.deg,
      cloud_cover_percent: data.clouds.all,
      pressure_hpa: data.main.pressure,
      source: 'openweathermap',
      observed_at: new Date().toISOString(),
      raw_data: data,
    });
  }

  const { error } = await supabase
    .from('weather_observations')
    .insert(observations);

  if (error) throw error;

  return new Response(JSON.stringify({ inserted: observations.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Steps:**
1. Create file above
2. Get OpenWeather API key (free tier: 1000 calls/day)
3. Add to Supabase secrets: `supabase secrets set OPENWEATHER_API_KEY=xxx`
4. Deploy: `supabase functions deploy weather-ingestion-cron`
5. Schedule cron: Supabase Dashboard → Edge Functions → Cron → Every hour

---

### **Task 2.2: Update weatherService.ts**
**Priority:** P4 | **Effort:** 30 minutes

**Changes:**
1. Remove `generateMockWeather` fallback from production code
2. Add error handling for missing weather data
3. Update components to handle null weather gracefully

---

## **PHASE 3: STORAGE DISPATCH ENGINE** (4-6 hours)

### **Task 3.1: Create Dispatch Logic**
**Priority:** P3 | **Effort:** 3 hours

**File:** `supabase/functions/storage-dispatch-engine/index.ts`

```typescript
// Rule-based battery dispatch logic
// Inputs: renewable forecast, price forecast, current SoC
// Outputs: charge/discharge decisions

interface DispatchDecision {
  province: string;
  timestamp: string;
  action: 'charge' | 'discharge' | 'hold';
  target_mw: number;
  duration_hours: number;
  reason: string;
  expected_revenue_cad: number;
}

function calculateDispatch(
  renewableForecast: number,
  priceForecas: number,
  currentSoC: number,
  batteryCapacity: number
): DispatchDecision {
  // Logic:
  // 1. Charge when: renewable > demand AND price < $30/MWh AND SoC < 90%
  // 2. Discharge when: demand > renewable AND price > $60/MWh AND SoC > 20%
  // 3. Hold otherwise
  
  // Implementation details...
}
```

**Steps:**
1. Create dispatch algorithm
2. Test with historical data
3. Deploy as cron job (every 15 minutes)
4. Write decisions to `storage_dispatch_log`

---

### **Task 3.2: Calculate Efficiency Metrics**
**Priority:** P3 | **Effort:** 1 hour

**File:** `supabase/functions/storage-metrics-calculator/index.ts`

```typescript
// Calculate round-trip efficiency
// Formula: (energy_out / energy_in) * 100
// Target: >88%

async function calculateEfficiency(province: string, period: string) {
  const { data: dispatches } = await supabase
    .from('storage_dispatch_log')
    .select('*')
    .eq('province', province)
    .gte('timestamp', period);

  const totalCharged = dispatches
    .filter(d => d.action === 'charge')
    .reduce((sum, d) => sum + d.actual_mwh, 0);

  const totalDischarged = dispatches
    .filter(d => d.action === 'discharge')
    .reduce((sum, d) => sum + d.actual_mwh, 0);

  const efficiency = (totalDischarged / totalCharged) * 100;
  
  return efficiency;
}
```

---

### **Task 3.3: Update Award Evidence API**
**Priority:** P3 | **Effort:** 30 minutes

**File:** `supabase/functions/api-v2-renewable-forecast/index.ts`

**Changes:**
```typescript
// In /award-evidence route, add:

const { data: storageDispatches } = await supabaseClient
  .from('storage_dispatch_log')
  .select('*')
  .eq('province', province)
  .gte('timestamp', startDate);

const efficiency = calculateStorageEfficiency(storageDispatches);
const revenue = calculateArbitrageRevenue(storageDispatches);
const accuracy = calculateDispatchAccuracy(storageDispatches);

awardMetrics.avg_round_trip_efficiency_percent = efficiency;
awardMetrics.monthly_arbitrage_revenue_cad = revenue;
awardMetrics.storage_dispatch_accuracy_percent = accuracy;
```

---

## **PHASE 4: DATA STRUCTURE IMPROVEMENTS** (2-3 hours)

### **Task 4.1: Add Fuel Type to Provincial Generation**
**Priority:** P6 | **Effort:** 2 hours

**Migration:** `supabase/migrations/20251011_add_fuel_type.sql`

```sql
ALTER TABLE provincial_generation
  ADD COLUMN fuel_type TEXT,
  ADD COLUMN capacity_mw NUMERIC;

-- Populate with historical data or estimates
UPDATE provincial_generation
SET fuel_type = 'hydro',
    capacity_mw = generation_gwh * 1000
WHERE province_code IN ('QC', 'BC', 'MB');

UPDATE provincial_generation
SET fuel_type = 'mixed',
    capacity_mw = generation_gwh * 1000
WHERE fuel_type IS NULL;
```

**Steps:**
1. Create migration
2. Run: `supabase db push`
3. Update ingestion pipelines to include fuel_type
4. Remove mock renewable penetration data

---

## **PHASE 5: TESTING & VALIDATION** (1 hour)

### **Task 5.1: Update Diagnostic Tool**
**File:** `scripts/diagnose-all-gaps.ts`

**Add tests for:**
1. Weather observations (should have data after cron runs)
2. Storage dispatch log (should have decisions)
3. Fuel type breakdown (should have non-null values)

### **Task 5.2: End-to-End Test**
1. Run diagnostic: `npx tsx scripts/diagnose-all-gaps.ts`
2. Check all dashboards in browser
3. Verify award evidence shows 5/6 or 6/6 criteria met
4. Document any remaining gaps

---

## **TIMELINE SUMMARY**

| Phase | Tasks | Effort | Priority | Status |
|-------|-------|--------|----------|--------|
| Phase 1 | Renewable penetration mock, cleanup | 30 min | P2-P5 | ⏳ Ready |
| Phase 2 | Weather ingestion | 2-3 hrs | P4 | ⏳ Ready |
| Phase 3 | Storage dispatch | 4-6 hrs | P3 | ⏳ Ready |
| Phase 4 | Data structure | 2-3 hrs | P6 | ⏳ Ready |
| Phase 5 | Testing | 1 hr | P1 | ⏳ Ready |

**Total Effort:** 10-13.5 hours
**Recommended Order:** Phase 1 → Phase 3 → Phase 2 → Phase 5 → Phase 4

---

## **IMMEDIATE NEXT STEPS**

1. **Refresh browser** - Verify curtailment cards now show 594 MWh
2. **Run Phase 1 Task 1.1** - Add renewable penetration mock (5 min)
3. **Decide priority** - Storage (award criterion) or Weather (data quality)?
4. **Allocate time** - 4-6 hours for storage, 2-3 hours for weather

**Ready to start implementation?** Let me know which phase to begin with!
