#!/usr/bin/env node
/**
 * Run Migrations via Supabase Client
 * 
 * Alternative to psql - uses Supabase JS client to run SQL migrations
 * Works without needing DATABASE_URL or psql installed
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
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Execute SQL migration via Supabase RPC
 */
async function runMigration(migrationFile, description) {
  console.log(`\n📄 Running: ${migrationFile}`);
  console.log(`   ${description}`);
  
  try {
    const sqlPath = join(__dirname, '../supabase/migrations', migrationFile);
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    // Execute SQL via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      // If exec_sql function doesn't exist, try direct query
      console.log('   Trying direct SQL execution...');
      
      // Split by statement and execute one by one
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');
      
      for (const statement of statements) {
        if (!statement) continue;
        
        const { error: stmtError } = await supabase.rpc('exec', {
          query: statement
        });
        
        if (stmtError) {
          console.error(`   ❌ Error executing statement:`, stmtError.message);
          throw stmtError;
        }
      }
    }
    
    console.log(`   ✅ Migration completed successfully`);
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
  console.log('🚀 Running Migrations via Supabase Client\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Using service role key: ${SUPABASE_KEY.substring(0, 20)}...`);
  
  const migrations = [
    {
      file: '20251014006_clear_mock_data.sql',
      description: 'Clear mock/synthetic test data'
    },
    {
      file: '20251014007_add_data_provenance.sql',
      description: 'Add data provenance tracking'
    }
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.description);
    if (success) successCount++;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Completed ${successCount}/${migrations.length} migrations`);
  
  if (successCount === migrations.length) {
    console.log('\n✅ All migrations successful!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/backfill-ieso-data.mjs');
    console.log('2. Run: node scripts/backfill-provincial-generation-improved.mjs');
    console.log('3. Run: ./scripts/verify-real-data.sh');
  } else {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});
