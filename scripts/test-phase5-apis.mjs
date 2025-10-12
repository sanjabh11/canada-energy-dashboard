#!/usr/bin/env node
/**
 * Test Phase 5 APIs - Storage Dispatch & Enhanced Forecasts
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnymbecjgeaoxsfphrti.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function testStorageDispatch() {
  console.log('\n🔋 Testing Storage Dispatch API...');
  
  try {
    // Test: Get battery status
    const statusRes = await fetch(`${SUPABASE_URL}/functions/v1/api-v2-storage-dispatch/status?province=ON`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const status = await statusRes.json();
    console.log('✅ Battery Status:', status.battery);

    // Test: Run dispatch
    const dispatchRes = await fetch(`${SUPABASE_URL}/functions/v1/api-v2-storage-dispatch/dispatch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        province: 'ON',
        currentPrice: 20,
        curtailmentRisk: true
      })
    });
    const dispatch = await dispatchRes.json();
    console.log('✅ Dispatch Decision:', dispatch.decision);

    // Test: Get logs
    const logsRes = await fetch(`${SUPABASE_URL}/functions/v1/api-v2-storage-dispatch/logs?province=ON&limit=5`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const logs = await logsRes.json();
    console.log('✅ Dispatch Logs:', logs.summary);

  } catch (error) {
    console.error('❌ Storage Dispatch Test Failed:', error.message);
  }
}

async function testEnhancedForecasts() {
  console.log('\n🌤️  Testing Enhanced Forecast API...');
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-v2-renewable-forecast?province=ON&source_type=solar&horizons=1,6,24`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const data = await res.json();
    
    if (data.forecasts && data.forecasts.length > 0) {
      const forecast = data.forecasts[0];
      console.log('✅ Forecast Generated:', {
        predicted: forecast.predicted_output_mw,
        baseline_persistence: forecast.baseline_persistence_mw,
        baseline_seasonal: forecast.baseline_seasonal_mw,
        provenance: forecast.data_provenance,
        completeness: forecast.completeness_percent
      });
    }
  } catch (error) {
    console.error('❌ Forecast Test Failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Phase 5 API Testing\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  if (!SUPABASE_ANON_KEY) {
    console.error('❌ VITE_SUPABASE_ANON_KEY not set');
    process.exit(1);
  }

  await testStorageDispatch();
  await testEnhancedForecasts();
  
  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);
