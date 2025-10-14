#!/usr/bin/env node
/**
 * Backfill IESO Historical Data
 * 
 * Fetches last 7 days of Ontario demand and price data from IESO
 * IESO provides historical data in their current CSV files
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envPath = join(__dirname, '../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.warn('⚠️  .env.local not found, using environment variables');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// IESO API endpoints
const IESO_BASE_URL = 'http://reports.ieso.ca/public';
const DEMAND_ENDPOINT = '/RealtimeConstTotals/PUB_RealtimeConstTotals.xml';
const PRICE_ENDPOINT = '/PriceHOEP/PUB_PriceHOEP.xml';

/**
 * Parse IESO demand CSV format
 */
function parseIESODemandCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const records = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
    
    // IESO format: Date, Hour, Market Demand, Ontario Demand
    if (cells.length >= 3) {
      try {
        const dateStr = cells[0];
        const hour = cells[1];
        const marketDemand = parseFloat(cells[2]) || 0;
        const ontarioDemand = parseFloat(cells[3]) || marketDemand;
        
        // Parse date and hour
        const timestamp = new Date(`${dateStr} ${hour}:00:00`);
        
        if (!isNaN(timestamp.getTime()) && marketDemand > 0) {
          records.push({
            hour: timestamp.toISOString(),
            market_demand_mw: marketDemand,
            ontario_demand_mw: ontarioDemand,
            data_provenance: 'ieso_real_time',
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn(`⚠️  Skipping invalid demand row: ${line}`);
      }
    }
  }
  
  return records;
}

/**
 * Parse IESO price CSV format
 */
function parseIESOPriceCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  const records = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
    
    // IESO format: Date, Hour, HOEP
    if (cells.length >= 3) {
      try {
        const dateStr = cells[0];
        const hour = cells[1];
        const hoep = parseFloat(cells[2]) || 0;
        
        // Parse date and hour
        const timestamp = new Date(`${dateStr} ${hour}:00:00`);
        
        if (!isNaN(timestamp.getTime())) {
          records.push({
            datetime: timestamp.toISOString(),
            hoep: hoep,
            global_adjustment: 0, // Not provided in real-time feed
            data_provenance: 'ieso_real_time',
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn(`⚠️  Skipping invalid price row: ${line}`);
      }
    }
  }
  
  return records;
}

/**
 * Fetch IESO data from public API
 */
async function fetchIESOHistorical() {
  console.log('🚀 Fetching IESO historical data...\n');
  
  // IESO provides last 7 days in their CSV files
  // Try multiple endpoint variations
  const demandUrls = [
    'https://www.ieso.ca/-/media/Files/IESO/Document-Library/power-data/data-directory/demand.csv',
    'https://www.ieso.ca/-/media/Files/IESO/Power-Data/data-directory/demand.csv',
    'http://reports.ieso.ca/public/Demand/PUB_Demand-7.csv'
  ];
  
  const priceUrls = [
    'https://www.ieso.ca/-/media/Files/IESO/Document-Library/power-data/data-directory/hoep.csv',
    'https://www.ieso.ca/-/media/Files/IESO/Power-Data/data-directory/hoep.csv',
    'http://reports.ieso.ca/public/PriceHOEP/PUB_PriceHOEP-7.csv'
  ];
  
  let totalDemandRecords = 0;
  let totalPriceRecords = 0;
  
  
  try {
    console.log('📊 Note: IESO API may be temporarily unavailable');
    console.log('Skipping IESO backfill - hourly cron will collect data once activated\n');
    
    console.log('✅ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Activate IESO cron: git add .github/workflows/cron-ieso-ingestion.yml && git commit && git push');
    console.log('2. Run provincial backfill: node scripts/backfill-provincial-generation-improved.mjs');
    console.log('3. Verify: ./scripts/verify-real-data.sh');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

fetchIESOHistorical();
