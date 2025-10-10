# CEIP Nightly Validation Tests

## Overview

Comprehensive automated test suite validating Phase 5 renewable optimization features for award submission readiness.

## What This Tests

### 1. **Forecast Accuracy** (Per Province)
- Solar MAE ≤ 8%
- Wind MAE ≤ 12%
- Data completeness ≥ 95%
- Baseline uplift ≥ 25% (persistence + seasonal)

### 2. **Curtailment Reduction** (Per Province)
- Monthly avoided MWh ≥ 300
- ROI ≥ 1.0 (net positive)
- Provenance = "historical" (not "mock")

### 3. **Storage Dispatch Alignment** (Per Province)
- Renewable absorption alignment ≥ 35%
- SoC bounds respected (0-100%)
- Actions count > 0

### 4. **Data Completeness** (System-Wide)
- Average completeness ≥ 95%
- No low-quality days in last 30 days

### 5. **Provenance Clean** (System-Wide)
- Award evidence contains no "mock" provenance
- Curtailment events exclude mock data

### 6. **Baseline Comparisons** (System-Wide)
- Persistence baseline exists
- Seasonal baseline exists
- Uplift meets target (≥ 25%)

### 7. **Sample Counts** (System-Wide)
- Total samples ≥ 500
- Solar samples ≥ 200
- Wind samples ≥ 200

### 8. **Model Metadata** (System-Wide)
- Model name present
- Model version present
- Provenance labeled
- Timestamp present

### 9. **API Responsiveness** (System-Wide)
- All APIs respond within 5 seconds

### 10. **End-to-End Integration** (System-Wide)
- Observations → Metrics → Events → Logs pipeline complete

---

## Environment Variables

Required (set as GitHub Secrets or locally):

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_FUNCTIONS_BASE=https://<project>.functions.supabase.co
TEST_PROVINCES=ON,AB
```

Optional (fallback to VITE_ prefixed versions):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_EDGE_BASE`

---

## Running Locally

### Prerequisites
- Node.js 18+
- Environment variables set

### Run Tests
```bash
# From project root
node tests/nightly/ceip_nightly_tests.mjs
```

### Expected Output
```
🚀 CEIP Nightly Validation Tests

Supabase URL: https://qnymbecjgeaoxsfphrti.supabase.co
Functions Base: https://qnymbecjgeaoxsfphrti.functions.supabase.co
Test Provinces: ON, AB

📍 Testing province: ON
  ⏳ Forecast accuracy...
  ⏳ Curtailment replay...
  ⏳ Storage dispatch alignment...

📍 Testing province: AB
  ⏳ Forecast accuracy...
  ⏳ Curtailment replay...
  ⏳ Storage dispatch alignment...

🔧 Running system-wide tests...
  ⏳ Data completeness...
  ⏳ Provenance clean...
  ⏳ Baseline comparisons...
  ⏳ Sample counts...
  ⏳ Model metadata...
  ⏳ API responsiveness...
  ⏳ End-to-end integration...

📊 Test Summary:
   Passed: 17/17
   Failed: 0/17

📁 Reports saved to: tests/nightly/out
   - report_2025-10-10T10-00-00Z.json
   - report_2025-10-10T10-00-00Z.md

✅ All nightly tests passed: 17/17
```

---

## CI/CD Integration

### GitHub Actions

Workflow: `.github/workflows/nightly-ceip.yml`

**Schedule:** Daily at 18:30 UTC

**Manual Trigger:**
```bash
# Via GitHub UI: Actions → CEIP Nightly Validation → Run workflow
```

**Artifacts:**
- JSON report (machine-readable)
- Markdown report (human-readable)
- Retention: 30 days

**On Failure:**
- Creates GitHub issue with full report
- Uploads artifacts for inspection
- Exit code 1 (fails CI)

---

## Thresholds

Configurable in `ceip_nightly_tests.mjs`:

```javascript
const THRESHOLDS = {
  solarMaePctMax: 8.0,          // Solar forecast accuracy
  windMaePctMax: 12.0,          // Wind forecast accuracy
  baselineUpliftMinPct: 25.0,   // Baseline improvement
  completenessMinPct: 95.0,     // Data quality
  avoidedMWhMinMonthly: 300.0,  // Curtailment reduction
  roiMin: 1.0,                  // Economic viability
  storageAlignmentMinPct: 35.0, // Storage effectiveness
  ingestionUptimeMinPct: 99.5,  // System reliability (future)
  forecastJobSuccessMinPct: 99.0 // Job success rate (future)
};
```

---

## Output Files

### JSON Report
```json
{
  "generated_at": "2025-10-10T10:00:00.000Z",
  "totals": { "passed": 17, "failed": 0, "total": 17 },
  "thresholds": { ... },
  "provinces": ["ON", "AB"],
  "results": [
    {
      "name": "ForecastAccuracy(ON)",
      "pass": true,
      "details": {
        "solar_forecast_mae_percent": 6.5,
        "wind_forecast_mae_percent": 8.2,
        "data_completeness_percent": 98.5,
        "baseline_uplift_persistence_pct": 49.3,
        "baseline_uplift_seasonal_pct": 42.0
      }
    },
    ...
  ]
}
```

### Markdown Report
Human-readable summary with:
- Test results (✅/❌)
- Detailed metrics
- Threshold comparisons
- Pass/fail reasons

---

## Troubleshooting

### Test Fails: "No data available"
**Cause:** Database tables empty  
**Fix:** Run data import scripts:
```bash
export SUPABASE_SERVICE_ROLE_KEY=<key>
node scripts/generate-sample-historical-data.mjs
node scripts/run-curtailment-replay.mjs
```

### Test Fails: "Forecast accuracy below threshold"
**Cause:** MAE/MAPE too high  
**Fix:** 
1. Check `forecast_performance_metrics` table
2. Verify weather data quality
3. Retrain models if needed

### Test Fails: "Provenance is mock"
**Cause:** Using mock data instead of historical  
**Fix:**
1. Check `curtailment_events.data_source` column
2. Ensure replay script ran successfully
3. Filter out mock events in queries

### Test Fails: "ROI below 1.0"
**Cause:** Costs exceed benefits  
**Fix:**
1. Review `curtailment_reduction_recommendations` table
2. Check `estimated_cost_cad` vs `estimated_revenue_cad`
3. Adjust recommendation logic if needed

### Test Fails: "API timeout"
**Cause:** Edge functions slow or unreachable  
**Fix:**
1. Check Supabase function logs
2. Verify database indexes exist
3. Increase timeout in test (default 30s)

---

## Security Notes

- **No service role key required** - Tests use anon key for read-only operations
- **RLS policies** - Ensure public read access on relevant tables
- **Rate limiting** - Tests include 30s timeout per request
- **GitHub Secrets** - Never commit API keys to repository

---

## Extending Tests

### Add New Test
```javascript
async function testMyFeature() {
  // Your test logic
  const data = await httpGet('https://...');
  const pass = data.metric > threshold;
  
  return {
    name: 'MyFeature',
    pass,
    details: { metric: data.metric, threshold }
  };
}

// Add to run() function
testResults.push(await testMyFeature());
```

### Adjust Thresholds
Edit `THRESHOLDS` object at top of `ceip_nightly_tests.mjs`

### Add Province
Set `TEST_PROVINCES` environment variable:
```bash
export TEST_PROVINCES=ON,AB,BC,QC
```

---

## Award Submission

Use test results as evidence:

1. **Forecast Accuracy:** JSON report → `solar_forecast_mae_percent`, `wind_forecast_mae_percent`
2. **Baseline Uplift:** JSON report → `baseline_uplift_persistence_pct`, `baseline_uplift_seasonal_pct`
3. **Curtailment Reduction:** JSON report → `monthly_curtailment_avoided_mwh`
4. **ROI:** JSON report → `roi_benefit_cost`
5. **Data Quality:** JSON report → `data_completeness_percent`

---

## Support

**Issues:** GitHub Issues  
**Documentation:** `/docs/models/` (model cards)  
**API Docs:** `/supabase/functions/` (endpoint README files)

---

*Last Updated: October 10, 2025*  
*Test Suite Version: 1.0.0*  
*Phase: 5 (Renewable Optimization)*
