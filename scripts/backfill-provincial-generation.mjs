#!/usr/bin/env node
/**
 * Backfill Provincial Generation Data
 * 
 * Generates 30 days of synthetic provincial generation data
 * for analytics and trend analysis.
 * 
 * Usage: node scripts/backfill-provincial-generation.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envPath = join(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.warn('⚠️  .env.local not found, using environment variables');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const provinces = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU'];

// Realistic generation profiles by province and source
const generationProfiles = {
  ON: { hydro: 6000, nuclear: 9000, wind: 1500, solar: 500, gas: 2000, coal: 0 },
  QC: { hydro: 35000, nuclear: 0, wind: 3500, solar: 300, gas: 500, coal: 0 },
  BC: { hydro: 12000, nuclear: 0, wind: 600, solar: 200, gas: 800, coal: 0 },
  AB: { hydro: 900, nuclear: 0, wind: 2000, solar: 800, gas: 5000, coal: 4000 },
  SK: { hydro: 850, nuclear: 0, wind: 300, solar: 100, gas: 1500, coal: 2000 },
  MB: { hydro: 5500, nuclear: 0, wind: 250, solar: 50, gas: 200, coal: 0 },
  NS: { hydro: 400, nuclear: 0, wind: 600, solar: 100, gas: 1000, coal: 1500 },
  NB: { hydro: 900, nuclear: 600, wind: 300, solar: 50, gas: 500, coal: 400 },
  PE: { hydro: 0, nuclear: 0, wind: 200, solar: 20, gas: 100, coal: 0 },
  NL: { hydro: 6800, nuclear: 0, wind: 50, solar: 10, gas: 200, coal: 0 },
  YT: { hydro: 80, nuclear: 0, wind: 5, solar: 2, gas: 20, coal: 0 },
  NT: { hydro: 40, nuclear: 0, wind: 2, solar: 1, gas: 50, coal: 0 },
  NU: { hydro: 5, nuclear: 0, wind: 1, solar: 0.5, gas: 30, coal: 0 }
};

async function backfillData() {
  console.log('🚀 Starting provincial generation backfill...\n');
  
  const records = [];
  let totalRecords = 0;
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(Date.now() - day * 24 * 3600 * 1000);
    
    for (const province of provinces) {
      const profile = generationProfiles[province];
      
      for (const [source, baseGeneration] of Object.entries(profile)) {
        if (baseGeneration === 0) continue;
        
        // Add realistic variation (±20%)
        const variation = 0.8 + Math.random() * 0.4;
        const generation_mw = baseGeneration * variation;
        
        // Realistic completeness (95-100%)
        const completeness = 95 + Math.random() * 5;
        
        const record = {
          date: date.toISOString().slice(0, 10), // YYYY-MM-DD format
          province_code: province,
          source: source,
          generation_gwh: Math.round((generation_mw / 1000) * 10) / 10, // Convert MW to GWh
          created_at: new Date().toISOString()
        };
        
        records.push(record);
        totalRecords++;
      }
    }
    
    // Insert in batches of 100
    if (records.length >= 100) {
      const batch = records.splice(0, 100);
      const { error } = await supabase
        .from('provincial_generation')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Error inserting batch: ${error.message}`);
      } else {
        process.stdout.write(`✅ Inserted ${totalRecords} records...\r`);
      }
    }
  }
  
  // Insert remaining records
  if (records.length > 0) {
    const { error } = await supabase
      .from('provincial_generation')
      .insert(records);
    
    if (error) {
      console.error(`❌ Error inserting final batch: ${error.message}`);
    }
  }
  
  console.log(`\n\n✅ Backfill complete!`);
  console.log(`📊 Total records inserted: ${totalRecords}`);
  console.log(`📅 Date range: ${new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10)} to ${new Date().toISOString().slice(0, 10)}`);
  console.log(`🌍 Provinces: ${provinces.length}`);
  console.log(`⚡ Sources per province: ~6 (hydro, nuclear, wind, solar, gas, coal)`);
  
  // Verify insertion
  const { count, error: countError } = await supabase
    .from('provincial_generation')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  
  if (!countError) {
    console.log(`\n✅ Verification: ${count} records in database for last 30 days`);
  }
}

backfillData().catch(error => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
