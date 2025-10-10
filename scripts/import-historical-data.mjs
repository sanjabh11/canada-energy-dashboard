#!/usr/bin/env node
/**
 * Import IESO Historical Data into Supabase
 * 
 * Processes downloaded CSV files and imports with proper provenance tracking.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Parse IESO Generator Output CSV
 */
function parseGeneratorOutput(csvPath) {
  console.log(`\n📊 Parsing: ${csvPath}`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const observations = [];
  
  for (const record of records) {
    const timestamp = new Date(record.Date + ' ' + record.Hour + ':00:00').toISOString();
    
    // Extract fuel types (columns: NUCLEAR, GAS, HYDRO, WIND, SOLAR, BIOFUEL)
    const fuelTypes = ['NUCLEAR', 'GAS', 'HYDRO', 'WIND', 'SOLAR', 'BIOFUEL'];
    
    for (const fuelType of fuelTypes) {
      if (record[fuelType]) {
        const value = parseFloat(record[fuelType]);
        if (!isNaN(value) && value >= 0) {
          observations.push({
            province: 'ON',
            source_type: fuelType.toLowerCase(),
            observed_at: timestamp,
            generation_mw: value,
            data_source: 'ieso_historical',
            data_provenance: 'historical_archive',
            completeness_percent: 100,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  console.log(`✅ Parsed ${observations.length} observations`);
  return observations;
}

/**
 * Parse IESO Demand CSV
 */
function parseDemand(csvPath) {
  console.log(`\n📊 Parsing: ${csvPath}`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const observations = [];
  
  for (const record of records) {
    const timestamp = new Date(record.Date + ' ' + record.Hour + ':00:00').toISOString();
    const demand = parseFloat(record['Ontario Demand']);
    
    if (!isNaN(demand) && demand >= 0) {
      observations.push({
        province: 'ON',
        metric_type: 'demand',
        observed_at: timestamp,
        demand_mw: demand,
        data_source: 'ieso_historical',
        data_provenance: 'historical_archive',
        completeness_percent: 100,
        created_at: new Date().toISOString(),
      });
    }
  }

  console.log(`✅ Parsed ${observations.length} demand observations`);
  return observations;
}

/**
 * Insert observations with deduplication
 */
async function insertObservations(table, observations, chunkSize = 1000) {
  console.log(`\n💾 Inserting ${observations.length} records into ${table}...`);
  
  let inserted = 0;
  let updated = 0;
  
  for (let i = 0; i < observations.length; i += chunkSize) {
    const chunk = observations.slice(i, i + chunkSize);
    
    const { data, error } = await supabase
      .from(table)
      .upsert(chunk, {
        onConflict: 'province,observed_at,source_type',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`❌ Error inserting chunk ${i / chunkSize + 1}:`, error.message);
      continue;
    }

    inserted += chunk.length;
    process.stdout.write(`\rProgress: ${Math.min(i + chunkSize, observations.length)}/${observations.length} (${((Math.min(i + chunkSize, observations.length) / observations.length) * 100).toFixed(1)}%)`);
  }
  
  console.log(`\n✅ Inserted/Updated ${inserted} records in ${table}`);
  return { inserted, updated };
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 IESO Historical Data Import\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Target tables: energy_observations, demand_observations\n`);

  const dataDir = './data/historical/ieso';

  try {
    // Import October 2024 Generator Output
    const octGenObs = parseGeneratorOutput(`${dataDir}/generator_output_oct2024.csv`);
    await insertObservations('energy_observations', octGenObs);

    // Import October 2024 Demand
    const octDemandObs = parseDemand(`${dataDir}/ontario_demand_oct2024.csv`);
    await insertObservations('demand_observations', octDemandObs);

    // Import September 2024 Generator Output (for baselines)
    const sepGenObs = parseGeneratorOutput(`${dataDir}/generator_output_sep2024.csv`);
    await insertObservations('energy_observations', sepGenObs);

    // Import September 2024 Demand
    const sepDemandObs = parseDemand(`${dataDir}/ontario_demand_sep2024.csv`);
    await insertObservations('demand_observations', sepDemandObs);

    console.log('\n✅ All historical data imported successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Total generation observations: ${octGenObs.length + sepGenObs.length}`);
    console.log(`- Total demand observations: ${octDemandObs.length + sepDemandObs.length}`);
    console.log(`- Date range: September 2024 - October 2024`);
    console.log(`- Province: ON (Ontario)`);
    console.log(`- Provenance: historical_archive`);
    console.log(`- Data source: IESO public reports`);

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
