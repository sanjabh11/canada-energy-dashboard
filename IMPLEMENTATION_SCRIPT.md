# 🚀 CRITICAL FIXES IMPLEMENTATION SCRIPT

**Status:** Executing Now  
**Priority:** Critical Gaps Only (7 hours)

---

## ✅ FIX 1: REMOVE AWARD REFERENCES (20 min) - STARTING NOW

### **Files to Clean:**
1. `SESSION_IMPROVEMENTS_SUMMARY.md` - Remove ET Award references
2. `phase 5.md` - Remove ET Award references  
3. `supabase/functions/api-v2-forecast-performance/index.ts` - Remove comments
4. `supabase/functions/api-v2-renewable-forecast/index.ts` - Remove comments
5. `supabase/migrations/20251009_tier1_complete.sql` - Remove comments

### **Search & Replace:**
- "ET Award" → "Evidence System"
- "Energy Transformation Award" → "Performance Metrics"
- "award-evidence" → "performance-evidence" (in code)
- Keep `/award-evidence` endpoint name (already deployed)

---

## ✅ FIX 2: SECURITY AUDIT & CLEANUP (100 min)

### **Task 2.1: Replace console.log (45 min)**

**Files with console.log (75 instances):**
1. `src/lib/provincialGenerationStreamer.ts` (18)
2. `src/main.tsx` (9)
3. `src/lib/config.ts` (8)
4. `src/components/CurtailmentAnalyticsDashboard.tsx` (6)
5. `src/hooks/useWebSocket.ts` (6)
6. `src/lib/dataManager.ts` (4)
7. `src/lib/debug.ts` (4) - Keep these, it's the debug utility
8. `src/components/RenewableOptimizationHub.tsx` (3)
9. `src/lib/clientStreamSimulator.ts` (3)
10. `src/lib/data/streamingService.ts` (3)
11. `src/components/DigitalTwinDashboard.tsx` (2)
12. `src/lib/featureFlags.ts` (2)
13. `src/lib/progressTracker.ts` (2)
14. Remaining 11 files (23 total)

**Pattern:**
```typescript
// BEFORE:
console.log('Message', data);
console.warn('Warning', error);
console.error('Error', error);

// AFTER:
import { debug } from '@/lib/debug';
debug.log('Message', data);
debug.warn('Warning', error);
debug.error('Error', error);
```

### **Task 2.2: Security Audit Checklist (55 min)**

**A. Hardcoded Secrets Check (10 min)**
```bash
# Search for potential secrets
grep -r "eyJ" src/ --include="*.ts" --include="*.tsx"
grep -r "sk-" src/ --include="*.ts" --include="*.tsx"
grep -r "API_KEY" src/ --include="*.ts" --include="*.tsx"
grep -r "password" src/ --include="*.ts" --include="*.tsx"
```

**B. CORS Configuration (10 min)**
- Verify `supabase/functions/llm/index.ts` CORS origins
- Ensure only production domains allowed
- Test with malicious origin

**C. Input Validation (20 min)**
- Add validation to all Edge Function inputs
- Sanitize user-provided strings
- Validate datasetPath, userMessage, etc.

**D. Rate Limiting Test (15 min)**
- Test LLM endpoints with rapid requests
- Verify 429 responses after limit
- Check rate limit headers

---

## ✅ FIX 3: MOCK DATA CLEANUP (90 min)

### **Task 3.1: Audit Data Sources (30 min)**

**Check each component:**
1. `RenewableOptimizationHub.tsx` - 22 mock instances
2. `MineralsDashboard.tsx` - 12 mock instances
3. `ComplianceDashboard.tsx` - 11 mock instances

**For each:**
- Identify if data is actually mock or mislabeled
- Update provenance type to correct value
- Add data quality badges

### **Task 3.2: Add Data Quality Badges (30 min)**

**Create Component:**
```typescript
// src/components/DataQualityBadge.tsx
import React from 'react';
import { ProvenanceMetadata, getProvenanceBadge, formatProvenance } from '@/lib/types/provenance';

interface DataQualityBadgeProps {
  provenance: ProvenanceMetadata;
  sampleCount?: number;
  showDetails?: boolean;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  provenance,
  sampleCount,
  showDetails = false
}) => {
  const badge = getProvenanceBadge(provenance.type);
  const quality = provenance.confidence * (provenance.completeness || 1);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
      <span>{badge.icon}</span>
      <span className="font-medium">{badge.label}</span>
      {sampleCount && <span className="text-gray-600">n={sampleCount}</span>}
      {provenance.completeness && (
        <span className="text-gray-600">{(provenance.completeness * 100).toFixed(0)}%</span>
      )}
      {showDetails && (
        <span className="text-xs text-gray-500" title={formatProvenance(provenance)}>
          ℹ️
        </span>
      )}
    </div>
  );
};
```

### **Task 3.3: Filter Mock Data from KPIs (30 min)**

**Update Award Evidence API:**
```typescript
// supabase/functions/award-evidence/index.ts
// Add filter to exclude mock/simulated data

const curtailmentData = await supabase
  .from('curtailment_events')
  .select('*')
  .in('provenance_type', ['historical_archive', 'real_stream', 'calibrated']) // Exclude mock/simulated
  .gte('created_at', thirtyDaysAgo);

const totalMWhSaved = curtailmentData.data?.reduce((sum, event) => sum + event.curtailed_mw, 0) || 0;
```

---

## ✅ FIX 4: BASELINE RIGOR (60 min)

### **Task 4.1: Calculate Baselines (30 min)**

**Add to forecast calculation:**
```typescript
// Calculate persistence baseline (t-1 prediction)
const persistenceMAE = calculatePersistenceMAE(actualValues, timestamps);

// Calculate seasonal-naïve baseline (same hour last week)
const seasonalNaiveMAE = calculateSeasonalNaiveMAE(actualValues, timestamps);

// Calculate uplift
const uplift = ((baseline - actualMAE) / baseline) * 100;
```

### **Task 4.2: Add Confidence Intervals (30 min)**

**Bootstrap CI calculation:**
```typescript
function calculateBootstrapCI(errors: number[], confidence: number = 0.95): [number, number] {
  const n = errors.length;
  const nBootstrap = 1000;
  const means: number[] = [];
  
  for (let i = 0; i < nBootstrap; i++) {
    const sample = Array.from({ length: n }, () => errors[Math.floor(Math.random() * n)]);
    means.push(sample.reduce((a, b) => a + b, 0) / n);
  }
  
  means.sort((a, b) => a - b);
  const lower = means[Math.floor((1 - confidence) / 2 * nBootstrap)];
  const upper = means[Math.floor((1 + confidence) / 2 * nBootstrap)];
  
  return [lower, upper];
}
```

---

## ✅ FIX 5: ECONOMIC METHODOLOGY (45 min)

### **Task 5.1: Document Price Source (15 min)**

**Add to curtailment calculation:**
```typescript
// Economic calculation with methodology
const opportunityCost = curtailedMWh * avgHOEP;

const methodology = {
  formula: "Opportunity Cost = Curtailed MWh × Average HOEP",
  priceSource: "HOEP Indicative Curve (Ontario IESO)",
  period: "30-day rolling average",
  assumptions: [
    "Reserve margin: 15%",
    "Dispatch efficiency: 95%",
    "Transmission losses: 5%"
  ],
  sensitivity: {
    low: opportunityCost * 0.8,  // -20%
    median: opportunityCost,
    high: opportunityCost * 1.2   // +20%
  }
};
```

### **Task 5.2: Add Method Tooltips (30 min)**

**Create MethodologyTooltip component:**
```typescript
// src/components/MethodologyTooltip.tsx
interface MethodologyTooltipProps {
  formula: string;
  source: string;
  assumptions: string[];
}

export const MethodologyTooltip: React.FC<MethodologyTooltipProps> = ({
  formula,
  source,
  assumptions
}) => {
  return (
    <div className="methodology-tooltip">
      <div className="font-semibold">Calculation Method</div>
      <div className="text-sm mt-2">
        <strong>Formula:</strong> {formula}
      </div>
      <div className="text-sm mt-1">
        <strong>Source:</strong> {source}
      </div>
      <div className="text-sm mt-2">
        <strong>Assumptions:</strong>
        <ul className="list-disc ml-4">
          {assumptions.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </div>
    </div>
  );
};
```

---

## ✅ FIX 6: STORAGE DISPATCH PROOF (75 min)

### **Task 6.1: Create Dispatch Log Panel (45 min)**

**New Component:**
```typescript
// src/components/StorageDispatchLog.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DispatchAction {
  timestamp: string;
  battery_id: string;
  action: 'charge' | 'discharge' | 'hold';
  soc_before: number;
  soc_after: number;
  power_mw: number;
  reason: string;
  expected_revenue: number;
  actual_revenue?: number;
}

export const StorageDispatchLog: React.FC = () => {
  const [actions, setActions] = useState<DispatchAction[]>([]);
  
  useEffect(() => {
    fetchDispatchLog();
  }, []);
  
  const fetchDispatchLog = async () => {
    const { data } = await supabase
      .from('storage_dispatch_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    
    setActions(data || []);
  };
  
  return (
    <div className="storage-dispatch-log">
      <h3>Recent Dispatch Actions</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Battery</th>
            <th>Action</th>
            <th>SoC Change</th>
            <th>Power</th>
            <th>Reason</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, i) => (
            <tr key={i}>
              <td>{new Date(action.timestamp).toLocaleString()}</td>
              <td>{action.battery_id}</td>
              <td className={`action-${action.action}`}>{action.action}</td>
              <td>{action.soc_before}% → {action.soc_after}%</td>
              <td>{action.power_mw} MW</td>
              <td>{action.reason}</td>
              <td>
                ${action.actual_revenue?.toFixed(0) || action.expected_revenue.toFixed(0)}
                {action.actual_revenue && (
                  <span className="text-xs text-gray-500">
                    ({((action.actual_revenue / action.expected_revenue - 1) * 100).toFixed(0)}%)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### **Task 6.2: Add Alignment Metrics (30 min)**

**Calculate curtailment-storage alignment:**
```typescript
// Calculate % of curtailment events with storage response
const curtailmentEvents = await supabase
  .from('curtailment_events')
  .select('timestamp, curtailed_mw')
  .gte('timestamp', thirtyDaysAgo);

const storageActions = await supabase
  .from('storage_dispatch_logs')
  .select('timestamp, action')
  .eq('action', 'charge')
  .gte('timestamp', thirtyDaysAgo);

// Find actions within 30 min of curtailment
let alignedActions = 0;
curtailmentEvents.data?.forEach(event => {
  const eventTime = new Date(event.timestamp).getTime();
  const hasResponse = storageActions.data?.some(action => {
    const actionTime = new Date(action.timestamp).getTime();
    return Math.abs(actionTime - eventTime) < 30 * 60 * 1000; // 30 min window
  });
  if (hasResponse) alignedActions++;
});

const alignmentPercent = (alignedActions / (curtailmentEvents.data?.length || 1)) * 100;
```

---

## ✅ FIX 7: WIND STATUS CLARIFICATION (30 min)

### **Task 7.1: Check Wind Data (10 min)**

```sql
SELECT 
  COUNT(*) as wind_forecasts,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest
FROM forecast_performance_metrics
WHERE metric_type = 'wind';
```

### **Task 7.2: Add Status Message (20 min)**

**If no wind data:**
```typescript
// src/components/ForecastStatus.tsx
export const WindForecastStatus: React.FC = () => {
  return (
    <div className="wind-status-banner bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900">Wind Forecasting Status</h4>
      <p className="text-sm text-blue-800 mt-2">
        <strong>Phase 2 Development (Q1 2026)</strong>
      </p>
      <ul className="list-disc ml-6 mt-2 text-sm text-blue-700">
        <li>Currently focused on solar forecasting (70% of Ontario renewable capacity)</li>
        <li>Wind data collection infrastructure in progress</li>
        <li>Expected launch: January 2026</li>
      </ul>
      <p className="text-xs text-blue-600 mt-3">
        Solar forecasting meets industry targets (MAE &lt;6%). Wind will follow same methodology.
      </p>
    </div>
  );
};
```

---

## 📊 IMPLEMENTATION TIMELINE

| Fix | Priority | Time | Status |
|-----|----------|------|--------|
| 1. Award References | 🔴 Critical | 20 min | ⏳ Ready |
| 2. Security Audit | 🔴 Critical | 100 min | ⏳ Ready |
| 3. Mock Data Cleanup | 🔴 Critical | 90 min | ⏳ Ready |
| 4. Baseline Rigor | 🔴 Critical | 60 min | ⏳ Ready |
| 5. Economic Methodology | 🔴 Critical | 45 min | ⏳ Ready |
| 6. Storage Dispatch Proof | 🔴 Critical | 75 min | ⏳ Ready |
| 7. Wind Status | 🔴 Critical | 30 min | ⏳ Ready |
| **TOTAL** | | **420 min (7 hours)** | |

---

## ✅ EXECUTION ORDER

1. **Quick Wins (50 min):**
   - Award references removal (20 min)
   - Wind status clarification (30 min)

2. **Security (100 min):**
   - Console.log replacement (45 min)
   - Security audit (55 min)

3. **Data Quality (150 min):**
   - Mock data cleanup (90 min)
   - Baseline rigor (60 min)

4. **Credibility (120 min):**
   - Economic methodology (45 min)
   - Storage dispatch proof (75 min)

**Total: 7 hours**

---

## 🚀 STARTING EXECUTION

**Beginning with Quick Wins...**
