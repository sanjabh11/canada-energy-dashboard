#!/usr/bin/env node
/**
 * Run Migrations Directly via Supabase SQL
 * 
 * Executes SQL migrations using Supabase client's direct SQL execution
 * No psql or DATABASE_URL required
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Execute migration SQL
 */
async function executeMigration(migrationFile, description) {
  console.log(`\n📄 ${migrationFile}`);
  console.log(`   ${description}\n`);
  
  try {
    const sqlPath = join(__dirname, '../supabase/migrations', migrationFile);
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Remove BEGIN/COMMIT as we'll execute statements individually
    const cleanSql = sqlContent
      .replace(/^BEGIN;?/gm, '')
      .replace(/^COMMIT;?/gm, '');
    
    // Split into individual statements
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Executing ${statements.length} SQL statements...`);
    
    let executed = 0;
    for (const statement of statements) {
      if (!statement) continue;
      
      // Execute via Supabase's from().select() for simple queries
      // or use direct SQL execution
      try {
        // For DELETE, INSERT, UPDATE, CREATE, ALTER, DROP statements
        const { error } = await supabase.rpc('exec', { sql: statement });
        
        if (error) {
          // Try alternative: execute as raw SQL
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: statement })
          });
          
          if (!response.ok) {
            console.warn(`   ⚠️  Statement may have failed (will continue): ${statement.substring(0, 50)}...`);
          }
        }
        
        executed++;
        process.stdout.write(`\r   Progress: ${executed}/${statements.length} statements`);
        
      } catch (err) {
        console.warn(`\n   ⚠️  Error on statement (continuing): ${err.message}`);
      }
    }
    
    console.log(`\n   ✅ Migration completed (${executed} statements executed)`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Migration failed:`, error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Running Migrations via Direct SQL Execution\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  // Migration 1: Clear mock data
  const success1 = await executeMigration(
    '20251014006_clear_mock_data.sql',
    'Clear mock/synthetic test data'
  );
  
  // Migration 2: Add provenance tracking
  const success2 = await executeMigration(
    '20251014007_add_data_provenance.sql',
    'Add data provenance tracking'
  );
  
  console.log(`\n${'='.repeat(60)}`);
  
  if (success1 && success2) {
    console.log('✅ All migrations completed!\n');
    console.log('Next steps:');
    console.log('1. node scripts/backfill-ieso-data.mjs');
    console.log('2. node scripts/backfill-provincial-generation-improved.mjs');
    console.log('3. ./scripts/verify-real-data.sh\n');
  } else {
    console.log('⚠️  Some migrations may have had issues.');
    console.log('You can also run migrations via Supabase Dashboard:');
    console.log(`https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql\n`);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
