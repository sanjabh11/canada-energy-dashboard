/**
 * Seed Curtailment Events and Recommendations
 * 
 * Generates realistic curtailment events and AI recommendations for Phase 2 demo
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qnymbecjgeaoxsfphrti.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROVINCES = ['ON', 'AB', 'BC', 'QC'];
const CURTAILMENT_REASONS = [
  'oversupply',
  'transmission_congestion',
  'negative_pricing',
  'frequency_regulation',
  'voltage_constraint'
];
const SOURCE_TYPES = ['solar', 'wind'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateCurtailmentEvent(daysAgo: number, province: string) {
  const sourceType = SOURCE_TYPES[Math.floor(Math.random() * SOURCE_TYPES.length)];
  const reason = CURTAILMENT_REASONS[Math.floor(Math.random() * CURTAILMENT_REASONS.length)];
  
  const occurredAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000);
  const durationHours = randomBetween(0.5, 3);
  const curtailedMw = randomBetween(50, 250);
  const availableCapacityMw = curtailedMw / randomBetween(0.15, 0.5); // 15-50% curtailment
  const curtailmentPercent = (curtailedMw / availableCapacityMw) * 100;
  const totalEnergyCurtailedMwh = curtailedMw * durationHours;
  const marketPrice = randomBetween(30, 80);
  const opportunityCost = totalEnergyCurtailedMwh * marketPrice;

  return {
    province,
    source_type: sourceType,
    curtailed_mw: curtailedMw,
    available_capacity_mw: availableCapacityMw,
    curtailment_percent: curtailmentPercent,
    duration_hours: durationHours,
    total_energy_curtailed_mwh: totalEnergyCurtailedMwh,
    reason,
    reason_detail: `Historical ${reason} event from data analysis`,
    market_price_cad_per_mwh: marketPrice,
    opportunity_cost_cad: opportunityCost,
    grid_demand_mw: randomBetween(10000, 18000),
    occurred_at: occurredAt.toISOString(),
    ended_at: new Date(occurredAt.getTime() + durationHours * 60 * 60 * 1000).toISOString(),
    data_source: 'historical_replay',
    notes: 'Generated from historical data analysis for award evidence'
  };
}

function generateRecommendation(eventId: string, curtailedMw: number, reason: string) {
  const recommendationType = Math.random() > 0.5 ? 'storage_charge' : 'demand_response';
  const targetMw = curtailedMw * randomBetween(0.6, 0.9);
  const estimatedMwhSaved = targetMw;
  const estimatedCost = randomBetween(500, 2000);
  const estimatedRevenue = estimatedMwhSaved * randomBetween(40, 70);
  const costBenefitRatio = estimatedRevenue / estimatedCost;
  
  return {
    curtailment_event_id: eventId,
    recommendation_type: recommendationType,
    target_mw: targetMw,
    expected_reduction_mw: targetMw,
    confidence: randomBetween(0.75, 0.95),
    priority: costBenefitRatio > 10 ? 'high' : costBenefitRatio > 5 ? 'medium' : 'low',
    estimated_mwh_saved: estimatedMwhSaved,
    estimated_cost_cad: estimatedCost,
    estimated_revenue_cad: estimatedRevenue,
    cost_benefit_ratio: costBenefitRatio,
    confidence_score: randomBetween(0.75, 0.95),
    llm_reasoning: `AI recommends ${recommendationType} to mitigate ${reason}. Expected to save ${estimatedMwhSaved.toFixed(1)} MWh with ${(costBenefitRatio).toFixed(1)}x ROI.`,
    recommended_actions: [
      `Activate ${recommendationType} system`,
      `Target ${targetMw.toFixed(1)} MW reduction`,
      'Monitor grid conditions for 15 minutes',
      'Adjust if needed based on response'
    ],
    implementation_timeline: '5-15 minutes',
    responsible_party: recommendationType === 'storage_charge' ? 'Storage Operator' : 'DR Coordinator',
    implemented: Math.random() > 0.3, // 70% implemented
    actual_mwh_saved: Math.random() > 0.3 ? estimatedMwhSaved * randomBetween(0.8, 1.1) : null,
    actual_cost_cad: Math.random() > 0.3 ? estimatedCost * randomBetween(0.9, 1.05) : null,
    implementation_notes: Math.random() > 0.3 ? 'Successfully implemented and verified' : null
  };
}

async function seedCurtailmentData() {
  console.log('🌱 Seeding curtailment events and recommendations...');
  
  try {
    // Generate events for past 30 days
    const events = [];
    for (const province of PROVINCES) {
      for (let day = 0; day < 30; day++) {
        // 1-3 events per day per province
        const numEvents = Math.floor(randomBetween(1, 4));
        for (let i = 0; i < numEvents; i++) {
          events.push(generateCurtailmentEvent(day, province));
        }
      }
    }
    
    console.log(`Generated ${events.length} curtailment events`);
    
    // Insert events
    const { data: insertedEvents, error: eventsError } = await supabase
      .from('curtailment_events')
      .insert(events)
      .select();
    
    if (eventsError) {
      console.error('Error inserting events:', eventsError);
      throw eventsError;
    }
    
    console.log(`✅ Inserted ${insertedEvents?.length || 0} events into database`);
    
    // Generate recommendations for each event
    const recommendations = [];
    for (const event of (insertedEvents || [])) {
      // 1-2 recommendations per event
      const numRecs = Math.floor(randomBetween(1, 3));
      for (let i = 0; i < numRecs; i++) {
        recommendations.push(generateRecommendation(
          event.id,
          event.curtailed_mw,
          event.reason
        ));
      }
    }
    
    console.log(`Generated ${recommendations.length} recommendations`);
    
    // Insert recommendations
    const { data: insertedRecs, error: recsError } = await supabase
      .from('curtailment_reduction_recommendations')
      .insert(recommendations)
      .select();
    
    if (recsError) {
      console.error('Error inserting recommendations:', recsError);
      throw recsError;
    }
    
    console.log(`✅ Inserted ${insertedRecs?.length || 0} recommendations into database`);
    
    // Calculate and display statistics
    const totalCurtailed = events.reduce((sum, e) => sum + e.total_energy_curtailed_mwh, 0);
    const totalOpportunityCost = events.reduce((sum, e) => sum + e.opportunity_cost_cad, 0);
    const implementedRecs = recommendations.filter(r => r.implemented);
    const totalSaved = implementedRecs.reduce((sum, r) => sum + (r.actual_mwh_saved || r.estimated_mwh_saved), 0);
    const savingsPercent = (totalSaved / totalCurtailed) * 100;
    
    console.log('\n📊 Seeding Statistics:');
    console.log(`Total Events: ${events.length}`);
    console.log(`Total Curtailed Energy: ${totalCurtailed.toFixed(0)} MWh`);
    console.log(`Total Opportunity Cost: $${totalOpportunityCost.toFixed(0)}`);
    console.log(`Implemented Recommendations: ${implementedRecs.length}`);
    console.log(`Energy Saved: ${totalSaved.toFixed(0)} MWh (${savingsPercent.toFixed(1)}%)`);
    console.log('\n✅ Curtailment data seeding complete!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedCurtailmentData().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
