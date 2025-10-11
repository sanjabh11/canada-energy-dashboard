/**
 * Comprehensive Gap Diagnostic Tool
 * Validates all data pipelines and identifies root causes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnymbecjgeaoxsfphrti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GapResult {
  category: string;
  issue: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  rootCause: string;
  possibleSources: string[];
  evidence: any;
}

const results: GapResult[] = [];

async function checkTable(tableName: string, expectedMinRows: number = 1): Promise<{ exists: boolean; count: number; sample: any }> {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(1);
    
    if (error) {
      return { exists: false, count: 0, sample: null };
    }
    
    return { exists: true, count: count || 0, sample: data?.[0] || null };
  } catch (err) {
    return { exists: false, count: 0, sample: null };
  }
}

async function checkEdgeFunction(path: string): Promise<{ available: boolean; response: any; error: any }> {
  try {
    const response = await fetch(`https://qnymbecjgeaoxsfphrti.functions.supabase.co/${path}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      return { available: false, response: null, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return { available: true, response: data, error: null };
  } catch (err: any) {
    return { available: false, response: null, error: err.message };
  }
}

async function diagnoseRealTimeDashboard() {
  console.log('\n🔍 CATEGORY 1: Real-Time Dashboard');
  console.log('='.repeat(80));
  
  // Check Ontario Demand streaming
  const ontarioDemandEdge = await checkEdgeFunction('stream-ontario-demand?limit=10');
  results.push({
    category: 'Real-Time Dashboard',
    issue: 'Ontario Demand Streaming',
    status: ontarioDemandEdge.available && ontarioDemandEdge.response?.rows?.length > 0 ? 'PASS' : 'FAIL',
    rootCause: !ontarioDemandEdge.available 
      ? 'Edge function not deployed or returning errors'
      : ontarioDemandEdge.response?.rows?.length === 0
      ? 'Edge function returns empty rows array'
      : 'Unknown',
    possibleSources: [
      '1. Edge function not deployed after code changes',
      '2. IESO API unavailable and sample data fallback broken',
      '3. Data transformation layer missing required fields'
    ],
    evidence: ontarioDemandEdge
  });
  
  // Check CO2 emissions data
  const co2Data = await checkTable('provincial_generation', 10);
  results.push({
    category: 'Real-Time Dashboard',
    issue: 'CO2 Emissions Showing Zero',
    status: co2Data.count > 0 ? 'WARN' : 'FAIL',
    rootCause: co2Data.count === 0 
      ? 'No provincial generation data available'
      : 'CO2 calculation logic not implemented or fuel type missing',
    possibleSources: [
      '1. Provincial generation table empty or missing fuel_type field',
      '2. CO2 emission factors not configured per fuel type',
      '3. Frontend calculation logic missing or broken'
    ],
    evidence: { count: co2Data.count, sample: co2Data.sample }
  });
  
  // Check provenance badges
  results.push({
    category: 'Real-Time Dashboard',
    issue: 'Provenance Badges Not Visible',
    status: 'WARN',
    rootCause: 'ProvenanceBadge component not integrated into all data panels',
    possibleSources: [
      '1. Component exists but not imported/used in RealTimeDashboard',
      '2. Data source metadata not passed to badge component',
      '3. Conditional rendering hiding badges when data is fallback'
    ],
    evidence: 'Code inspection required'
  });
}

async function diagnoseRenewableForecasts() {
  console.log('\n🔍 CATEGORY 2: Renewable Forecasts');
  console.log('='.repeat(80));
  
  // Check forecast performance data
  const forecastPerf = await checkTable('forecast_performance', 1);
  results.push({
    category: 'Renewable Forecasts',
    issue: 'Forecast Performance Showing "No Data Available"',
    status: forecastPerf.count > 0 ? 'PASS' : 'FAIL',
    rootCause: forecastPerf.count === 0 
      ? 'forecast_performance table empty - SQL seed not run'
      : 'Data exists but component query broken',
    possibleSources: [
      '1. SQL seed script not executed in Supabase dashboard',
      '2. Table name mismatch (forecast_performance vs forecast_performance_metrics)',
      '3. RLS policy blocking reads for anon role'
    ],
    evidence: { count: forecastPerf.count, sample: forecastPerf.sample }
  });
  
  // Check weather observations
  const weatherObs = await checkTable('weather_observations', 1);
  results.push({
    category: 'Renewable Forecasts',
    issue: 'Weather Features Not Shown',
    status: weatherObs.count > 0 ? 'WARN' : 'FAIL',
    rootCause: weatherObs.count === 0
      ? 'weather_observations table empty - no ingestion pipeline'
      : 'Weather data exists but not joined to forecast display',
    possibleSources: [
      '1. Weather ingestion cron job not running or not deployed',
      '2. API keys for weather services missing/invalid',
      '3. Frontend not querying or displaying weather_data jsonb field'
    ],
    evidence: { count: weatherObs.count }
  });
  
  // Check baseline comparisons
  results.push({
    category: 'Renewable Forecasts',
    issue: 'Baseline Uplift Not Shown',
    status: forecastPerf.sample?.improvement_vs_baseline ? 'PASS' : 'FAIL',
    rootCause: !forecastPerf.sample?.improvement_vs_baseline
      ? 'improvement_vs_baseline column null or not calculated'
      : 'Data exists but UI not displaying',
    possibleSources: [
      '1. Baseline calculation function not implemented',
      '2. SQL seed missing improvement_vs_baseline values',
      '3. Frontend component not rendering baseline comparison card'
    ],
    evidence: forecastPerf.sample
  });
}

async function diagnoseCurtailmentReduction() {
  console.log('\n🔍 CATEGORY 3: Curtailment Reduction');
  console.log('='.repeat(80));
  
  // Check curtailment events
  const events = await checkTable('curtailment_events', 1);
  results.push({
    category: 'Curtailment Reduction',
    issue: 'Events Labeled as "Mock" / Avoided MWh = 0',
    status: events.count > 0 ? 'WARN' : 'FAIL',
    rootCause: events.count === 0
      ? 'curtailment_events table empty - seed script not run'
      : 'Events exist but data_source field = "mock" or UI hardcoded "Mock" label',
    possibleSources: [
      '1. Seed script scripts/seed-curtailment-data.ts not executed',
      '2. Historical replay pipeline not implemented',
      '3. UI checking data_source field and showing "Mock" badge'
    ],
    evidence: { count: events.count, sample: events.sample }
  });
  
  // Check recommendations
  const recs = await checkTable('curtailment_reduction_recommendations', 1);
  results.push({
    category: 'Curtailment Reduction',
    issue: 'No Recommendations Available',
    status: recs.count > 0 ? 'PASS' : 'FAIL',
    rootCause: recs.count === 0
      ? 'curtailment_reduction_recommendations table empty'
      : 'Unknown',
    possibleSources: [
      '1. Seed script not run (generates recommendations with events)',
      '2. curtailmentEngine.generateCurtailmentRecommendations() not called',
      '3. RLS policy blocking reads'
    ],
    evidence: { count: recs.count }
  });
  
  // Check monthly aggregates
  const edgeStats = await checkEdgeFunction('api-v2-curtailment-reduction/statistics?province=ON&start_date=2025-09-01&end_date=2025-10-11');
  results.push({
    category: 'Curtailment Reduction',
    issue: 'Monthly Avoided MWh = 0, Savings = $0',
    status: edgeStats.available && edgeStats.response?.monthly_curtailment_avoided_mwh > 0 ? 'PASS' : 'FAIL',
    rootCause: !edgeStats.available
      ? 'Edge function api-v2-curtailment-reduction not deployed'
      : edgeStats.response?.monthly_curtailment_avoided_mwh === 0
      ? 'No events with implemented recommendations in database'
      : 'Unknown',
    possibleSources: [
      '1. Edge function not deployed or broken',
      '2. Database empty (no events/recommendations)',
      '3. Aggregation logic not summing implemented recommendations'
    ],
    evidence: edgeStats
  });
}

async function diagnoseStorageDispatch() {
  console.log('\n🔍 CATEGORY 4: Storage Dispatch');
  console.log('='.repeat(80));
  
  // Check storage dispatch logs
  const dispatchLogs = await checkTable('storage_dispatch_log', 1);
  results.push({
    category: 'Storage Dispatch',
    issue: 'Actions Count = 0, Alignment = 0%',
    status: dispatchLogs.count > 0 ? 'PASS' : 'FAIL',
    rootCause: dispatchLogs.count === 0
      ? 'storage_dispatch_log table empty - no dispatch decisions logged'
      : 'Unknown',
    possibleSources: [
      '1. Rule-based dispatch engine not implemented or not running',
      '2. Dispatch cron job not scheduled',
      '3. Table exists but no writes due to missing province configs'
    ],
    evidence: { count: dispatchLogs.count }
  });
  
  // Check SoC bounds
  results.push({
    category: 'Storage Dispatch',
    issue: 'SoC Bounds Violated',
    status: dispatchLogs.sample?.soc_after_mwh ? 'WARN' : 'FAIL',
    rootCause: !dispatchLogs.sample
      ? 'No dispatch data to validate bounds'
      : 'Dispatch logic not enforcing min/max SoC constraints',
    possibleSources: [
      '1. Dispatch algorithm missing SoC validation',
      '2. Province config missing battery_capacity_mwh or soc_min/max',
      '3. Frontend calculation error'
    ],
    evidence: dispatchLogs.sample
  });
  
  // Check alignment with renewables
  results.push({
    category: 'Storage Dispatch',
    issue: 'Alignment % Renewable Absorption = 0%',
    status: 'FAIL',
    rootCause: 'Alignment calculation not implemented or no charge actions during high renewable periods',
    possibleSources: [
      '1. No logic to correlate dispatch actions with renewable generation timestamps',
      '2. Renewable generation data not available for alignment calculation',
      '3. All actions are discharge/hold, no charge actions'
    ],
    evidence: 'Requires code inspection'
  });
}

async function diagnoseAwardEvidence() {
  console.log('\n🔍 CATEGORY 5: Award Evidence Metrics');
  console.log('='.repeat(80));
  
  // Check forecast MAE
  const forecastPerf = await checkTable('forecast_performance', 1);
  const solarMAE = forecastPerf.sample?.mae_percent || 0;
  const windMAE = forecastPerf.sample?.mae_percent || 0;
  
  results.push({
    category: 'Award Evidence',
    issue: 'Solar MAE / Wind MAE Blank or Zero',
    status: solarMAE > 0 && solarMAE < 10 ? 'PASS' : 'FAIL',
    rootCause: solarMAE === 0
      ? 'forecast_performance table empty or mae_percent null'
      : solarMAE > 10
      ? 'MAE values too high (>10%) - need better forecasts or baseline comparison'
      : 'Unknown',
    possibleSources: [
      '1. SQL seed not run',
      '2. Real forecast performance calculation not implemented',
      '3. Frontend querying wrong table or field'
    ],
    evidence: { solarMAE, windMAE, sample: forecastPerf.sample }
  });
  
  // Check curtailment avoided
  const edgeStats = await checkEdgeFunction('api-v2-curtailment-reduction/statistics?province=ON&start_date=2025-09-01&end_date=2025-10-11');
  const avoidedMWh = edgeStats.response?.monthly_curtailment_avoided_mwh || 0;
  
  results.push({
    category: 'Award Evidence',
    issue: 'Curtailment Avoided <500 MWh/month',
    status: avoidedMWh >= 500 ? 'PASS' : 'FAIL',
    rootCause: avoidedMWh === 0
      ? 'No curtailment events or recommendations in database'
      : avoidedMWh < 500
      ? 'Insufficient events or low implementation rate'
      : 'Unknown',
    possibleSources: [
      '1. Seed script not run or insufficient events generated',
      '2. Historical replay not producing enough events',
      '3. Recommendations not marked as implemented'
    ],
    evidence: { avoidedMWh, response: edgeStats.response }
  });
  
  // Check storage efficiency
  results.push({
    category: 'Award Evidence',
    issue: 'Storage Efficiency <88%',
    status: 'FAIL',
    rootCause: 'No storage dispatch data to calculate efficiency',
    possibleSources: [
      '1. storage_dispatch_log empty',
      '2. Efficiency calculation not implemented (energy_out / energy_in)',
      '3. Round-trip losses not modeled'
    ],
    evidence: 'No dispatch data'
  });
}

async function diagnoseAnalyticsTrends() {
  console.log('\n🔍 CATEGORY 6: Analytics & Trends');
  console.log('='.repeat(80));
  
  // Check data completeness filtering
  results.push({
    category: 'Analytics & Trends',
    issue: 'Days <95% Completeness Not Excluded',
    status: 'WARN',
    rootCause: 'Frontend not filtering data by completeness_percent field',
    possibleSources: [
      '1. Completeness field not calculated or stored',
      '2. Frontend query missing WHERE completeness_percent >= 95',
      '3. Completeness calculation logic not implemented'
    ],
    evidence: 'Code inspection required'
  });
  
  // Check weather correlations
  const weatherObs = await checkTable('weather_observations', 1);
  results.push({
    category: 'Analytics & Trends',
    issue: 'Weather Correlations Not Shown',
    status: weatherObs.count > 0 ? 'WARN' : 'FAIL',
    rootCause: weatherObs.count === 0
      ? 'weather_observations table empty'
      : 'Weather data not joined to generation data for correlation',
    possibleSources: [
      '1. Weather ingestion not running',
      '2. JOIN logic not implemented in analytics query',
      '3. Correlation calculation missing'
    ],
    evidence: { count: weatherObs.count }
  });
}

async function diagnoseProvinceConfigs() {
  console.log('\n🔍 CATEGORY 7: Province Configurations');
  console.log('='.repeat(80));
  
  const configs = await checkTable('province_configs', 1);
  results.push({
    category: 'Province Configs',
    issue: 'Reserve Margin, Price Profile, Timezone Not Shown',
    status: configs.count > 0 ? 'WARN' : 'FAIL',
    rootCause: configs.count === 0
      ? 'province_configs table empty or not created'
      : 'Config data exists but UI not displaying',
    possibleSources: [
      '1. Migration not run to create/seed province_configs',
      '2. Frontend component not querying province_configs',
      '3. Province detail pages not implemented'
    ],
    evidence: { count: configs.count, sample: configs.sample }
  });
}

async function diagnoseMyEnergyAI() {
  console.log('\n🔍 CATEGORY 8: My Energy AI');
  console.log('='.repeat(80));
  
  results.push({
    category: 'My Energy AI',
    issue: 'Not Using Live Optimization Data',
    status: 'WARN',
    rootCause: 'LLM context not including forecast/curtailment/dispatch endpoints',
    possibleSources: [
      '1. llmClient.ts not fetching optimization data before prompt',
      '2. System prompt not instructing to reference live data',
      '3. RAG/context injection not implemented'
    ],
    evidence: 'Code inspection required'
  });
}

async function diagnoseOpsMonitoring() {
  console.log('\n🔍 CATEGORY 9: Operations & Monitoring');
  console.log('='.repeat(80));
  
  results.push({
    category: 'Ops & Monitoring',
    issue: 'Uptime, Job Latency, Retention Status Not Shown',
    status: 'FAIL',
    rootCause: 'Ops dashboard not implemented',
    possibleSources: [
      '1. No ops metrics collection infrastructure',
      '2. Edge functions not logging performance metrics',
      '3. UI component for ops dashboard not created'
    ],
    evidence: 'Feature not implemented'
  });
}

async function runDiagnostics() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 COMPREHENSIVE GAP DIAGNOSTIC TOOL');
  console.log('='.repeat(80));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  await diagnoseRealTimeDashboard();
  await diagnoseRenewableForecasts();
  await diagnoseCurtailmentReduction();
  await diagnoseStorageDispatch();
  await diagnoseAwardEvidence();
  await diagnoseAnalyticsTrends();
  await diagnoseProvinceConfigs();
  await diagnoseMyEnergyAI();
  await diagnoseOpsMonitoring();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⚠️  WARN: ${warnings}`);
  console.log(`📋 TOTAL: ${results.length}`);
  
  // Critical failures
  console.log('\n🔥 CRITICAL FAILURES (Blocking Award Evidence):');
  const critical = results.filter(r => 
    r.status === 'FAIL' && 
    (r.category === 'Award Evidence' || r.category === 'Curtailment Reduction' || r.category === 'Renewable Forecasts')
  );
  
  critical.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.category}: ${r.issue}`);
    console.log(`   Root Cause: ${r.rootCause}`);
    console.log(`   Most Likely Source: ${r.possibleSources[0]}`);
  });
  
  // Export results
  console.log('\n' + '='.repeat(80));
  console.log('📄 FULL RESULTS (JSON):');
  console.log('='.repeat(80));
  console.log(JSON.stringify(results, null, 2));
  
  // Generate fix priority
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMMENDED FIX PRIORITY:');
  console.log('='.repeat(80));
  
  const fixes = [
    { priority: 1, task: 'Run SQL seed for forecast_performance table', impact: 'Fixes 3 award evidence gaps' },
    { priority: 2, task: 'Run seed-curtailment-data.ts script', impact: 'Fixes curtailment events, recommendations, avoided MWh' },
    { priority: 3, task: 'Deploy Ontario streaming edge function', impact: 'Fixes real-time demand data' },
    { priority: 4, task: 'Implement storage dispatch engine', impact: 'Fixes storage efficiency and alignment metrics' },
    { priority: 5, task: 'Set up weather ingestion cron', impact: 'Enables weather features and correlations' },
    { priority: 6, task: 'Remove "Mock" labels from UI', impact: 'Professional presentation' },
    { priority: 7, task: 'Add provenance badges to all panels', impact: 'Data transparency' },
    { priority: 8, task: 'Implement ops monitoring dashboard', impact: 'System observability' }
  ];
  
  fixes.forEach(fix => {
    console.log(`${fix.priority}. ${fix.task}`);
    console.log(`   Impact: ${fix.impact}\n`);
  });
}

runDiagnostics().then(() => {
  console.log('\n✅ Diagnostics complete!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Diagnostic failed:', err);
  process.exit(1);
});
