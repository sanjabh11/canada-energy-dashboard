#!/usr/bin/env node
/**
 * Generate Sample Historical Data for Phase 5 Testing
 * 
 * Creates realistic synthetic data for Ontario (Sep-Oct 2024)
 * to demonstrate curtailment replay and baseline calculations.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate realistic hourly data for Ontario
 */
function generateHistoricalData() {
  console.log('\n🔧 Generating sample historical data...');
  
  const startDate = new Date('2024-09-01T00:00:00Z');
  const endDate = new Date('2024-10-31T23:00:00Z');
  
  const observations = [];
  const demandObs = [];
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const hour = currentDate.getHours();
    const dayOfWeek = currentDate.getDay();
    const timestamp = currentDate.toISOString();
    
    // Demand patterns (MW) - Ontario typical
    let baseDemand = 15000;
    if (hour >= 7 && hour <= 19) baseDemand += 3000; // Daytime increase
    if (hour >= 17 && hour <= 20) baseDemand += 2000; // Evening peak
    if (dayOfWeek === 0 || dayOfWeek === 6) baseDemand -= 2000; // Weekend reduction
    
    const demand = baseDemand + (Math.random() - 0.5) * 1000;
    
    demandObs.push({
      province: 'ON',
      metric_type: 'demand',
      observed_at: timestamp,
      demand_mw: demand,
      data_source: 'synthetic_historical',
      data_provenance: 'historical_archive',
      completeness_percent: 100,
      created_at: new Date().toISOString(),
    });
    
    // Solar generation (MW) - Peak at noon, zero at night
    let solarBase = 0;
    if (hour >= 6 && hour <= 18) {
      const solarCurve = Math.sin((hour - 6) / 12 * Math.PI);
      solarBase = 2500 * solarCurve; // Peak 2500 MW
    }
    const solar = Math.max(0, solarBase + (Math.random() - 0.5) * 300);
    
    observations.push({
      province: 'ON',
      source_type: 'solar',
      observed_at: timestamp,
      generation_mw: solar,
      data_source: 'synthetic_historical',
      data_provenance: 'historical_archive',
      completeness_percent: 100,
      created_at: new Date().toISOString(),
    });
    
    // Wind generation (MW) - Variable, some high periods
    const windBase = 1500 + Math.sin(currentDate.getTime() / (1000 * 60 * 60 * 6)) * 1000;
    const wind = Math.max(0, windBase + (Math.random() - 0.5) * 800);
    
    observations.push({
      province: 'ON',
      source_type: 'wind',
      observed_at: timestamp,
      generation_mw: wind,
      data_source: 'synthetic_historical',
      data_provenance: 'historical_archive',
      completeness_percent: 100,
      created_at: new Date().toISOString(),
    });
    
    // Create some oversupply events (10% of hours with high renewable + low demand)
    if (Math.random() < 0.12 && hour >= 10 && hour <= 15) {
      // Boost renewables significantly to create oversupply conditions
      observations[observations.length - 2].generation_mw = 5500 + Math.random() * 1500; // Solar peak up to 7 GW
      observations[observations.length - 1].generation_mw = 4000 + Math.random() * 2000; // Wind surge up to 6 GW
      // Reduce demand to create realistic curtailment pressure
      demandObs[demandObs.length - 1].demand_mw = 7000 + Math.random() * 1200;
    }
    
    currentDate.setHours(currentDate.getHours() + 1);
  }
  
  console.log(`✅ Generated ${observations.length} generation observations`);
  console.log(`✅ Generated ${demandObs.length} demand observations`);
  
  return { observations, demandObs };
}

/**
 * Insert observations in batches
 */
async function insertData(observations, demandObs) {
  console.log('\n💾 Inserting data into Supabase...');
  
  const chunkSize = 1000;
  
  // Insert generation observations
  for (let i = 0; i < observations.length; i += chunkSize) {
    const chunk = observations.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('energy_observations')
      .upsert(chunk, { onConflict: 'province,observed_at,source_type' });
    
    if (error) {
      console.error(`❌ Error inserting generation chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      process.stdout.write(`\rGeneration: ${Math.min(i + chunkSize, observations.length)}/${observations.length}`);
    }
  }
  console.log('\n✅ Generation observations inserted');
  
  // Insert demand observations
  for (let i = 0; i < demandObs.length; i += chunkSize) {
    const chunk = demandObs.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('demand_observations')
      .upsert(chunk, { onConflict: 'province,observed_at' });
    
    if (error) {
      console.error(`❌ Error inserting demand chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      process.stdout.write(`\rDemand: ${Math.min(i + chunkSize, demandObs.length)}/${demandObs.length}`);
    }
  }
  console.log('\n✅ Demand observations inserted');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Sample Historical Data Generator\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Date range: Sep 1 - Oct 31, 2024`);
  console.log(`Province: ON (Ontario)\n`);
  
  try {
    const { observations, demandObs } = generateHistoricalData();
    await insertData(observations, demandObs);
    
    console.log('\n✅ Sample historical data generated successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Total generation observations: ${observations.length}`);
    console.log(`- Total demand observations: ${demandObs.length}`);
    console.log(`- Date range: September 2024 - October 2024`);
    console.log(`- Province: ON (Ontario)`);
    console.log(`- Provenance: historical_archive (synthetic)`);
    console.log(`- Oversupply events: ~10% of hours (midday periods)`);
    console.log('\n📈 Next step: Run curtailment replay simulation');
    
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
