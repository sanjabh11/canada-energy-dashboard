// filename: tests/nightly/ceip_nightly_tests.mjs
// Node 18+, ESM. Minimal deps: none (native fetch). Supabase REST used via fetch.

// Required ENV:
// SUPABASE_URL=https://<project>.supabase.co
// SUPABASE_ANON_KEY=<anon>
// SUPABASE_FUNCTIONS_BASE=https://<project>.functions.supabase.co
// TEST_PROVINCES=ON,AB

import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const FUNCTIONS_BASE = process.env.VITE_SUPABASE_EDGE_BASE || process.env.SUPABASE_FUNCTIONS_BASE;
const TEST_PROVINCES = (process.env.TEST_PROVINCES || 'ON,AB').split(',').map(s => s.trim());

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !FUNCTIONS_BASE) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) console.error('  - VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  if (!FUNCTIONS_BASE) console.error('  - VITE_SUPABASE_EDGE_BASE or SUPABASE_FUNCTIONS_BASE');
  console.error('\nPlease set these in your environment or .env.local file');
  process.exit(1);
}

// Thresholds for pass/fail (aligned with Phase 5 targets)
const THRESHOLDS = {
  solarMaePctMax: 8.0,          // pass if <= 8%
  windMaePctMax: 12.0,          // pass if <= 12%
  baselineUpliftMinPct: 25.0,   // vs seasonal/persistence
  completenessMinPct: 95.0,
  avoidedMWhMinMonthly: 300.0,  // monthly curtailment avoided
  roiMin: 1.0,                  // >1 means net positive
  storageAlignmentMinPct: 35.0, // % of cycles aligned with renewable absorption
  ingestionUptimeMinPct: 99.5,
  forecastJobSuccessMinPct: 99.0
};

// Util fetch with headers
async function httpGet(url, headers = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        ...headers,
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${url} failed: ${res.status} ${text}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Supabase REST select (public schema)
async function sbSelect(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&${query}`;
  return httpGet(url, { 'Accept': 'application/json' });
}

// Functions endpoints
async function getAwardEvidence(province) {
  const url = `${FUNCTIONS_BASE}/api-v2-forecast-performance/award-evidence?province=${encodeURIComponent(province)}`;
  return httpGet(url);
}

async function getCurtailmentStats(province) {
  const url = `${FUNCTIONS_BASE}/api-v2-curtailment-reduction/statistics?province=${encodeURIComponent(province)}`;
  return httpGet(url);
}

async function getStorageStatus(province) {
  const url = `${FUNCTIONS_BASE}/api-v2-storage-dispatch/status?province=${encodeURIComponent(province)}`;
  return httpGet(url);
}

// Test cases
async function testForecastAccuracy(province) {
  const evidence = await getAwardEvidence(province);
  const { 
    solar_forecast_mae_percent, 
    wind_forecast_mae_percent, 
    data_completeness_percent, 
    baseline_uplift_persistence_pct, 
    baseline_uplift_seasonal_pct 
  } = evidence;

  const passSolar = solar_forecast_mae_percent <= THRESHOLDS.solarMaePctMax;
  const passWind = wind_forecast_mae_percent <= THRESHOLDS.windMaePctMax;
  const passCompleteness = (data_completeness_percent ?? 0) >= THRESHOLDS.completenessMinPct;
  const passUpliftPersistence = (baseline_uplift_persistence_pct ?? 0) >= THRESHOLDS.baselineUpliftMinPct;
  const passUpliftSeasonal = (baseline_uplift_seasonal_pct ?? 0) >= THRESHOLDS.baselineUpliftMinPct;

  return {
    name: `ForecastAccuracy(${province})`,
    pass: passSolar && passWind && passCompleteness && passUpliftPersistence && passUpliftSeasonal,
    details: { 
      solar_forecast_mae_percent, 
      wind_forecast_mae_percent, 
      data_completeness_percent, 
      baseline_uplift_persistence_pct, 
      baseline_uplift_seasonal_pct,
      thresholds: {
        solar_max: THRESHOLDS.solarMaePctMax,
        wind_max: THRESHOLDS.windMaePctMax,
        completeness_min: THRESHOLDS.completenessMinPct,
        uplift_min: THRESHOLDS.baselineUpliftMinPct
      }
    }
  };
}

async function testCurtailmentReplay(province) {
  const stats = await getCurtailmentStats(province);
  const { 
    monthly_curtailment_avoided_mwh, 
    monthly_opportunity_cost_saved_cad, 
    roi_benefit_cost, 
    provenance 
  } = stats;

  const passAvoided = (monthly_curtailment_avoided_mwh ?? 0) >= THRESHOLDS.avoidedMWhMinMonthly;
  const passROI = (roi_benefit_cost ?? 0) >= THRESHOLDS.roiMin;
  const passProvenance = (provenance || '').toLowerCase() !== 'mock'; // should be Historical/Real/Replay
  
  return {
    name: `CurtailmentReplay(${province})`,
    pass: passAvoided && passROI && passProvenance,
    details: { 
      monthly_curtailment_avoided_mwh, 
      monthly_opportunity_cost_saved_cad, 
      roi_benefit_cost, 
      provenance,
      thresholds: {
        avoided_min: THRESHOLDS.avoidedMWhMinMonthly,
        roi_min: THRESHOLDS.roiMin
      }
    }
  };
}

async function testStorageDispatchAlignment(province) {
  const status = await getStorageStatus(province);
  const { 
    alignment_pct_renewable_absorption, 
    soc_bounds_ok, 
    actions_count 
  } = status;

  const passAlignment = (alignment_pct_renewable_absorption ?? 0) >= THRESHOLDS.storageAlignmentMinPct;
  const passSocBounds = !!soc_bounds_ok;
  const passActions = (actions_count ?? 0) > 0;

  return {
    name: `StorageDispatchAlignment(${province})`,
    pass: passAlignment && passSocBounds && passActions,
    details: { 
      alignment_pct_renewable_absorption, 
      soc_bounds_ok, 
      actions_count,
      thresholds: {
        alignment_min: THRESHOLDS.storageAlignmentMinPct
      }
    }
  };
}

async function testDataCompleteness() {
  // Check forecast_performance_metrics for completeness
  const rows = await sbSelect('forecast_performance_metrics', 'order=date.desc&limit=30');
  
  const avgCompleteness = rows.length > 0
    ? rows.reduce((sum, r) => sum + (r.data_completeness_percent || 100), 0) / rows.length
    : 100;
  
  const lowQualityDays = rows.filter(r => (r.data_completeness_percent || 100) < THRESHOLDS.completenessMinPct);
  
  return {
    name: 'DataCompleteness',
    pass: avgCompleteness >= THRESHOLDS.completenessMinPct && lowQualityDays.length === 0,
    details: { 
      avg_completeness_percent: avgCompleteness, 
      low_quality_days: lowQualityDays.length,
      total_days: rows.length,
      threshold: THRESHOLDS.completenessMinPct
    }
  };
}

async function testProvenanceClean() {
  // Ensure award evidence export contains no "mock" provenance
  const results = [];
  for (const p of TEST_PROVINCES) {
    const evidence = await getAwardEvidence(p);
    const evProv = (evidence?.provenance || '').toLowerCase();
    results.push(evProv !== 'mock');
  }
  
  // Spot-check curtailment_events last 10 rows to ensure data_source not "mock"
  const events = await sbSelect('curtailment_events', 'order=occurred_at.desc&limit=10');
  const noMockEvents = events.every(e => String(e.data_source || '').toLowerCase() !== 'mock');

  const pass = results.every(Boolean) && noMockEvents;
  return {
    name: 'ProvenanceClean',
    pass,
    details: { 
      evidenceProvenanceOK: results, 
      curtailmentEventsNoMock: noMockEvents,
      checked_provinces: TEST_PROVINCES
    }
  };
}

async function testBaselineComparisons() {
  // Verify baselines exist and show improvement
  const province = TEST_PROVINCES[0];
  const evidence = await getAwardEvidence(province);
  
  const hasPersistenceBaseline = (evidence.baseline_uplift_persistence_pct ?? 0) > 0;
  const hasSeasonalBaseline = (evidence.baseline_uplift_seasonal_pct ?? 0) > 0;
  const meetsUpliftTarget = (evidence.baseline_uplift_persistence_pct ?? 0) >= THRESHOLDS.baselineUpliftMinPct;
  
  return {
    name: 'BaselineComparisons',
    pass: hasPersistenceBaseline && hasSeasonalBaseline && meetsUpliftTarget,
    details: {
      persistence_uplift_pct: evidence.baseline_uplift_persistence_pct,
      seasonal_uplift_pct: evidence.baseline_uplift_seasonal_pct,
      has_persistence: hasPersistenceBaseline,
      has_seasonal: hasSeasonalBaseline,
      meets_target: meetsUpliftTarget,
      threshold: THRESHOLDS.baselineUpliftMinPct
    }
  };
}

async function testSampleCounts() {
  // Verify sufficient sample counts for statistical validity
  const province = TEST_PROVINCES[0];
  const evidence = await getAwardEvidence(province);
  
  const totalSamples = evidence.total_forecast_samples || 0;
  const solarSamples = evidence.solar_samples || 0;
  const windSamples = evidence.wind_samples || 0;
  
  const minSamples = 500; // Minimum for statistical validity
  const pass = totalSamples >= minSamples && solarSamples >= 200 && windSamples >= 200;
  
  return {
    name: 'SampleCounts',
    pass,
    details: {
      total_samples: totalSamples,
      solar_samples: solarSamples,
      wind_samples: windSamples,
      min_required: minSamples,
      meets_requirement: pass
    }
  };
}

async function testModelMetadata() {
  // Verify model metadata is present
  const province = TEST_PROVINCES[0];
  const evidence = await getAwardEvidence(province);
  
  const hasModelName = !!evidence.model_name;
  const hasModelVersion = !!evidence.model_version;
  const hasProvenance = !!evidence.provenance;
  const hasTimestamp = !!evidence.generated_at;
  
  return {
    name: 'ModelMetadata',
    pass: hasModelName && hasModelVersion && hasProvenance && hasTimestamp,
    details: {
      model_name: evidence.model_name,
      model_version: evidence.model_version,
      provenance: evidence.provenance,
      generated_at: evidence.generated_at,
      all_present: hasModelName && hasModelVersion && hasProvenance && hasTimestamp
    }
  };
}

async function testAPIResponsiveness() {
  // Test that all APIs respond within reasonable time
  const startTime = Date.now();
  const province = TEST_PROVINCES[0];
  
  try {
    await Promise.all([
      getAwardEvidence(province),
      getCurtailmentStats(province),
      getStorageStatus(province)
    ]);
    
    const duration = Date.now() - startTime;
    const pass = duration < 5000; // All APIs should respond within 5 seconds
    
    return {
      name: 'APIResponsiveness',
      pass,
      details: {
        duration_ms: duration,
        threshold_ms: 5000,
        within_threshold: pass
      }
    };
  } catch (err) {
    return {
      name: 'APIResponsiveness',
      pass: false,
      details: {
        error: err.message,
        duration_ms: Date.now() - startTime
      }
    };
  }
}

async function testEndToEndIntegration() {
  // Verify data flows through entire pipeline
  const province = TEST_PROVINCES[0];
  
  // Check observations exist
  const { data: energyObs } = await sbSelect('energy_observations', `province=eq.${province}&limit=1`);
  const { data: demandObs } = await sbSelect('demand_observations', `province=eq.${province}&limit=1`);
  
  // Check forecasts exist
  const metrics = await sbSelect('forecast_performance_metrics', `province=eq.${province}&limit=1`);
  
  // Check curtailment events exist
  const events = await sbSelect('curtailment_events', `province=eq.${province}&limit=1`);
  
  // Check storage logs exist
  const logs = await sbSelect('storage_dispatch_logs', `province=eq.${province}&limit=1`);
  
  const hasObservations = energyObs && energyObs.length > 0 && demandObs && demandObs.length > 0;
  const hasMetrics = metrics && metrics.length > 0;
  const hasEvents = events && events.length > 0;
  const hasLogs = logs && logs.length > 0;
  
  return {
    name: 'EndToEndIntegration',
    pass: hasObservations && hasMetrics && hasEvents && hasLogs,
    details: {
      has_observations: hasObservations,
      has_metrics: hasMetrics,
      has_events: hasEvents,
      has_logs: hasLogs,
      all_present: hasObservations && hasMetrics && hasEvents && hasLogs
    }
  };
}

async function run() {
  console.log('🚀 CEIP Nightly Validation Tests\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Functions Base: ${FUNCTIONS_BASE}`);
  console.log(`Test Provinces: ${TEST_PROVINCES.join(', ')}\n`);
  
  const timestamp = new Date().toISOString();
  const testResults = [];

  // Run tests for each province
  for (const province of TEST_PROVINCES) {
    console.log(`\n📍 Testing province: ${province}`);
    
    try {
      console.log('  ⏳ Forecast accuracy...');
      testResults.push(await testForecastAccuracy(province));
      
      console.log('  ⏳ Curtailment replay...');
      testResults.push(await testCurtailmentReplay(province));
      
      console.log('  ⏳ Storage dispatch alignment...');
      testResults.push(await testStorageDispatchAlignment(province));
    } catch (err) {
      console.error(`  ❌ Error testing ${province}:`, err.message);
      testResults.push({ 
        name: `ProvinceSuite(${province})`, 
        pass: false, 
        details: { error: err.message } 
      });
    }
  }

  // Run system-wide tests
  console.log('\n🔧 Running system-wide tests...');
  
  try {
    console.log('  ⏳ Data completeness...');
    testResults.push(await testDataCompleteness());
  } catch (err) {
    console.error('  ❌ Data completeness failed:', err.message);
    testResults.push({ name: 'DataCompleteness', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ Provenance clean...');
    testResults.push(await testProvenanceClean());
  } catch (err) {
    console.error('  ❌ Provenance clean failed:', err.message);
    testResults.push({ name: 'ProvenanceClean', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ Baseline comparisons...');
    testResults.push(await testBaselineComparisons());
  } catch (err) {
    console.error('  ❌ Baseline comparisons failed:', err.message);
    testResults.push({ name: 'BaselineComparisons', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ Sample counts...');
    testResults.push(await testSampleCounts());
  } catch (err) {
    console.error('  ❌ Sample counts failed:', err.message);
    testResults.push({ name: 'SampleCounts', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ Model metadata...');
    testResults.push(await testModelMetadata());
  } catch (err) {
    console.error('  ❌ Model metadata failed:', err.message);
    testResults.push({ name: 'ModelMetadata', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ API responsiveness...');
    testResults.push(await testAPIResponsiveness());
  } catch (err) {
    console.error('  ❌ API responsiveness failed:', err.message);
    testResults.push({ name: 'APIResponsiveness', pass: false, details: { error: err.message } });
  }

  try {
    console.log('  ⏳ End-to-end integration...');
    testResults.push(await testEndToEndIntegration());
  } catch (err) {
    console.error('  ❌ End-to-end integration failed:', err.message);
    testResults.push({ name: 'EndToEndIntegration', pass: false, details: { error: err.message } });
  }

  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.length - passed;

  const report = {
    generated_at: timestamp,
    totals: { passed, failed, total: testResults.length },
    thresholds: THRESHOLDS,
    provinces: TEST_PROVINCES,
    results: testResults
  };

  // Write JSON and Markdown summary
  const outDir = path.resolve('tests/nightly/out');
  fs.mkdirSync(outDir, { recursive: true });
  
  const reportFilename = `report_${timestamp.replace(/:/g, '-').replace(/\..+/, '')}.json`;
  fs.writeFileSync(
    path.join(outDir, reportFilename), 
    JSON.stringify(report, null, 2), 
    'utf-8'
  );

  const mdLines = [];
  mdLines.push(`# CEIP Nightly Validation Report`);
  mdLines.push(`Generated: ${timestamp}`);
  mdLines.push(`Provinces: ${TEST_PROVINCES.join(', ')}`);
  mdLines.push(`**Passed: ${passed} / ${testResults.length}, Failed: ${failed}**\n`);
  mdLines.push('## Test Results\n');
  
  for (const r of testResults) {
    mdLines.push(`### ${r.pass ? '✅' : '❌'} ${r.name} — ${r.pass ? 'PASS' : 'FAIL'}`);
    mdLines.push('```json');
    mdLines.push(JSON.stringify(r.details, null, 2));
    mdLines.push('```\n');
  }
  
  mdLines.push('## Thresholds\n');
  mdLines.push('```json');
  mdLines.push(JSON.stringify(THRESHOLDS, null, 2));
  mdLines.push('```');
  
  const mdFilename = `report_${timestamp.replace(/:/g, '-').replace(/\..+/, '')}.md`;
  fs.writeFileSync(
    path.join(outDir, mdFilename), 
    mdLines.join('\n'), 
    'utf-8'
  );

  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passed}/${testResults.length}`);
  console.log(`   Failed: ${failed}/${testResults.length}`);
  console.log(`\n📁 Reports saved to: ${outDir}`);
  console.log(`   - ${reportFilename}`);
  console.log(`   - ${mdFilename}`);

  // Exit code for CI
  if (failed > 0) {
    console.error(`\n❌ Nightly tests failed: ${failed}/${testResults.length}`);
    process.exit(1);
  } else {
    console.log(`\n✅ All nightly tests passed: ${passed}/${testResults.length}`);
    process.exit(0);
  }
}

run().catch(err => {
  console.error('💥 Fatal error in nightly tests:', err);
  process.exit(1);
});
