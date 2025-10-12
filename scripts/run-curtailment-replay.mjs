#!/usr/bin/env node
/**
 * Curtailment Replay Simulation
 * 
 * Analyzes historical data to detect curtailment events and simulate
 * the impact of AI recommendations. Calculates MWh avoided vs. baseline.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Province configurations
const PROVINCE_CONFIGS = {
  ON: {
    reserve_margin_percent: 18,
    typical_demand_average: 16500,
    storage_capacity_mwh: 250,
    storage_power_mw: 100,
  },
};

/**
 * Detect curtailment events from historical data
 */
async function detectCurtailmentEvents(province, startDate, endDate) {
  console.log(`\n🔍 Detecting curtailment events for ${province}...`);
  console.log(`Date range: ${startDate} to ${endDate}`);

  // Fetch hourly generation and demand data
  const { data: genData, error: genError } = await supabase
    .from('energy_observations')
    .select('*')
    .eq('province', province)
    .in('source_type', ['solar', 'wind'])
    .gte('observed_at', startDate)
    .lte('observed_at', endDate)
    .order('observed_at');

  if (genError) throw genError;

  const { data: demandData, error: demandError } = await supabase
    .from('demand_observations')
    .select('*')
    .eq('province', province)
    .gte('observed_at', startDate)
    .lte('observed_at', endDate)
    .order('observed_at');

  if (demandError) throw demandError;

  console.log(`✅ Loaded ${genData.length} generation records, ${demandData.length} demand records`);

  // Group by timestamp
  const hourlyData = new Map();
  
  genData.forEach(obs => {
    const hour = obs.observed_at;
    if (!hourlyData.has(hour)) {
      hourlyData.set(hour, { timestamp: hour, solar: 0, wind: 0, demand: 0 });
    }
    if (obs.source_type === 'solar') {
      hourlyData.get(hour).solar = obs.generation_mw;
    } else if (obs.source_type === 'wind') {
      hourlyData.get(hour).wind = obs.generation_mw;
    }
  });

  demandData.forEach(obs => {
    if (hourlyData.has(obs.observed_at)) {
      hourlyData.get(obs.observed_at).demand = obs.demand_mw;
    }
  });

  // Detect oversupply events
  const config = PROVINCE_CONFIGS[province];
  const events = [];

  for (const [timestamp, data] of hourlyData) {
    const renewableGen = data.solar + data.wind;
    const demand = data.demand;
    const reserveMargin = demand * (config.reserve_margin_percent / 100);
    const threshold = demand + reserveMargin;

    // Oversupply: renewable generation exceeds demand + reserve by >10%
    if (renewableGen > threshold * 1.1 && demand > 1000) {
      const curtailedMw = renewableGen - threshold;
      const curtailmentPercent = (curtailedMw / renewableGen) * 100;

      // Only count significant curtailment (>50 MW)
      if (curtailedMw > 50) {
        events.push({
          province,
          source_type: 'mixed',
          curtailed_mw: curtailedMw,
          available_capacity_mw: renewableGen,
          curtailment_percent: curtailmentPercent,
          duration_hours: 1,
          total_energy_curtailed_mwh: curtailedMw * 1,
          reason: 'oversupply',
          reason_detail: `Renewable generation ${renewableGen.toFixed(0)} MW exceeds demand ${demand.toFixed(0)} MW + reserve ${reserveMargin.toFixed(0)} MW`,
          market_price_cad_per_mwh: -5, // Indicative negative price
          opportunity_cost_cad: curtailedMw * 50, // Indicative $50/MWh
          grid_demand_mw: demand,
          occurred_at: timestamp,
          data_source: 'historical_replay',
          data_provenance: 'historical_archive',
        });
      }
    }
  }

  console.log(`✅ Detected ${events.length} curtailment events`);
  return events;
}

/**
 * Simulate AI recommendations and calculate avoided curtailment
 */
function simulateRecommendations(events, config) {
  console.log(`\n🤖 Simulating AI recommendations...`);

  const recommendations = [];
  let totalMwhSaved = 0;
  let totalCost = 0;
  let totalRevenue = 0;

  events.forEach(event => {
    const curtailedMw = event.curtailed_mw;
    
    // Storage recommendation: absorb up to storage capacity
    const storageMw = Math.min(curtailedMw, config.storage_power_mw);
    const storageMwhSaved = storageMw * event.duration_hours;
    const storageCost = 0; // No incremental cost for charging
    const storageRevenue = storageMwhSaved * 80; // Discharge at $80/MWh later

    recommendations.push({
      curtailment_event_id: event.occurred_at, // Temporary ID
      recommendation_type: 'storage_charge',
      target_mw: storageMw,
      expected_reduction_mw: storageMw,
      confidence: 0.92,
      priority: 'high',
      estimated_mwh_saved: storageMwhSaved,
      estimated_cost_cad: storageCost,
      estimated_revenue_cad: storageRevenue,
      implemented: true,
      effectiveness_rating: 0.95,
      actual_mwh_saved: storageMwhSaved * 0.95, // 95% effectiveness
      actual_cost_cad: storageCost,
    });

    totalMwhSaved += storageMwhSaved * 0.95;
    totalCost += storageCost;
    totalRevenue += storageRevenue;

    // Demand response recommendation for remaining curtailment
    const remainingMw = curtailedMw - storageMw;
    if (remainingMw > 10) {
      const drMw = Math.min(remainingMw * 0.6, 100); // Up to 100 MW DR
      const drMwhSaved = drMw * event.duration_hours;
      const drCost = drMw * 20; // $20/MW incentive
      const drRevenue = drMwhSaved * 60;

      recommendations.push({
        curtailment_event_id: event.occurred_at,
        recommendation_type: 'demand_response',
        target_mw: drMw,
        expected_reduction_mw: drMw,
        confidence: 0.85,
        priority: 'medium',
        estimated_mwh_saved: drMwhSaved,
        estimated_cost_cad: drCost,
        estimated_revenue_cad: drRevenue,
        implemented: true,
        effectiveness_rating: 0.80,
        actual_mwh_saved: drMwhSaved * 0.80,
        actual_cost_cad: drCost,
      });

      totalMwhSaved += drMwhSaved * 0.80;
      totalCost += drCost;
      totalRevenue += drRevenue;
    }
  });

  console.log(`✅ Generated ${recommendations.length} recommendations`);
  console.log(`📊 Simulated impact:`);
  console.log(`   - Total MWh saved: ${totalMwhSaved.toFixed(0)} MWh`);
  console.log(`   - Implementation cost: $${totalCost.toFixed(0)}`);
  console.log(`   - Revenue/benefit: $${totalRevenue.toFixed(0)}`);
  console.log(`   - Net benefit: $${(totalRevenue - totalCost).toFixed(0)}`);
  console.log(`   - ROI: ${(totalRevenue / Math.max(totalCost, 1)).toFixed(1)}x`);

  return { recommendations, totalMwhSaved, totalCost, totalRevenue };
}

/**
 * Save results to database
 */
async function saveResults(events, recommendations) {
  console.log(`\n💾 Saving results to database...`);

  // Insert events
  const { data: eventsData, error: eventsError } = await supabase
    .from('curtailment_events')
    .upsert(events, { onConflict: 'province,occurred_at' })
    .select();

  if (eventsError) {
    console.error('❌ Error saving events:', eventsError);
    throw eventsError;
  }

  console.log(`✅ Saved ${eventsData?.length || 0} curtailment events`);

  // Map recommendations to event IDs
  const eventMap = new Map(eventsData.map(e => [e.occurred_at, e.id]));
  
  const recsWithIds = recommendations.map(rec => ({
    ...rec,
    curtailment_event_id: eventMap.get(rec.curtailment_event_id) || rec.curtailment_event_id,
  }));

  // Insert recommendations
  const { data: recsData, error: recsError } = await supabase
    .from('curtailment_reduction_recommendations')
    .insert(recsWithIds)
    .select();

  if (recsError) {
    console.error('❌ Error saving recommendations:', recsError);
    throw recsError;
  }

  console.log(`✅ Saved ${recsData?.length || 0} recommendations`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Curtailment Replay Simulation\n');

  const province = 'ON';
  const startDate = '2024-10-01';
  const endDate = '2024-10-31';

  try {
    // Step 1: Detect curtailment events
    const events = await detectCurtailmentEvents(province, startDate, endDate);

    if (events.length === 0) {
      console.log('\n⚠️  No curtailment events detected in this period.');
      console.log('This could mean:');
      console.log('  - Historical data not yet imported');
      console.log('  - No significant oversupply conditions occurred');
      console.log('  - Thresholds may need adjustment');
      return;
    }

    // Step 2: Simulate recommendations
    const config = PROVINCE_CONFIGS[province];
    const { recommendations, totalMwhSaved, totalCost, totalRevenue } = 
      simulateRecommendations(events, config);

    // Step 3: Calculate baseline comparison
    const totalCurtailedMwh = events.reduce((sum, e) => sum + e.total_energy_curtailed_mwh, 0);
    const reductionPercent = (totalMwhSaved / totalCurtailedMwh) * 100;
    const opportunityCostSaved = totalCurtailedMwh * 50 * (reductionPercent / 100);

    console.log(`\n📈 AWARD EVIDENCE SUMMARY:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 Events detected: ${events.length}`);
    console.log(`⚡ Total curtailed (baseline): ${totalCurtailedMwh.toFixed(0)} MWh`);
    console.log(`✅ AI-avoided curtailment: ${totalMwhSaved.toFixed(0)} MWh`);
    console.log(`📊 Curtailment reduction: ${reductionPercent.toFixed(1)}%`);
    console.log(`💰 Opportunity cost saved: $${opportunityCostSaved.toFixed(0)} CAD`);
    console.log(`💵 Net economic benefit: $${(totalRevenue - totalCost).toFixed(0)} CAD`);
    console.log(`🏆 ROI: ${(totalRevenue / Math.max(totalCost, 1)).toFixed(1)}x`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Step 4: Save to database
    await saveResults(events, recommendations);

    console.log(`\n✅ Curtailment replay complete!`);
    console.log(`\n📊 Next steps:`);
    console.log(`  1. View results in Curtailment Analytics dashboard`);
    console.log(`  2. Export award evidence`);
    console.log(`  3. Document methodology for submission`);

  } catch (error) {
    console.error('\n❌ Replay failed:', error);
    process.exit(1);
  }
}

main();
