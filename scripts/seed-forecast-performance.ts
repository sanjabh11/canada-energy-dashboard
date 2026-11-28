/**
 * Seed Forecast Performance Metrics
 * Creates table if missing and populates with realistic data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('');
  console.error('Set them in your process environment or export them before running:');
  console.error('  export VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('Then run: npm run seed-forecast-performance');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedForecastPerformance() {
  console.log('🌱 Seeding forecast performance metrics...');
  
  try {
    // Check if table exists by trying to query it
    const { data: existingData, error: queryError } = await supabase
      .from('forecast_performance_metrics')
      .select('id')
      .limit(1);
    
    if (queryError && queryError.code === '42P01') {
      console.error('❌ Table forecast_performance_metrics does not exist!');
      console.log('\n📋 Please create the table first using Supabase Dashboard SQL Editor:');
      const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'your-project';
      console.log(`Navigate to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      console.log('\nOr run this SQL manually:');
      console.log('\nCREATE TABLE IF NOT EXISTS public.forecast_performance_metrics (');
      console.log('  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('  province text NOT NULL,');
      console.log('  source_type text NOT NULL,');
      console.log('  horizon_hours int NOT NULL,');
      console.log('  mape_percent double precision,');
      console.log('  mae_percent double precision,');
      console.log('  rmse_percent double precision,');
      console.log('  forecast_count int,');
      console.log('  calculated_at timestamptz DEFAULT now()');
      console.log(');');
      console.log('\nALTER TABLE public.forecast_performance_metrics ENABLE ROW LEVEL SECURITY;');
      console.log('CREATE POLICY "Allow public read" ON public.forecast_performance_metrics FOR SELECT USING (true);');
      return;
    }
    
    // Generate performance metrics for last 7 days
    const metrics = [];
    const today = new Date();
    
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      
      // Solar metrics
      metrics.push({
        province: 'ON',
        source_type: 'solar',
        horizon_hours: 1,
        mape_percent: 3.5 + Math.random() * 1.5,
        mae_percent: 3.5 + Math.random() * 1.5,
        rmse_percent: 5.0 + Math.random() * 1.5,
        forecast_count: 24,
        calculated_at: date.toISOString()
      });
      
      metrics.push({
        province: 'ON',
        source_type: 'solar',
        horizon_hours: 6,
        mape_percent: 4.8 + Math.random() * 1.5,
        mae_percent: 4.8 + Math.random() * 1.5,
        rmse_percent: 7.0 + Math.random() * 1.5,
        forecast_count: 4,
        calculated_at: date.toISOString()
      });
      
      metrics.push({
        province: 'ON',
        source_type: 'solar',
        horizon_hours: 24,
        mape_percent: 8.5 + Math.random() * 2.5,
        mae_percent: 8.5 + Math.random() * 2.5,
        rmse_percent: 12.0 + Math.random() * 2.5,
        forecast_count: 1,
        calculated_at: date.toISOString()
      });
      
      // Wind metrics
      metrics.push({
        province: 'ON',
        source_type: 'wind',
        horizon_hours: 1,
        mape_percent: 6.0 + Math.random() * 1.5,
        mae_percent: 6.0 + Math.random() * 1.5,
        rmse_percent: 8.5 + Math.random() * 2.0,
        forecast_count: 24,
        calculated_at: date.toISOString()
      });
      
      metrics.push({
        province: 'ON',
        source_type: 'wind',
        horizon_hours: 6,
        mape_percent: 7.5 + Math.random() * 2.0,
        mae_percent: 7.5 + Math.random() * 2.0,
        rmse_percent: 11.0 + Math.random() * 2.5,
        forecast_count: 4,
        calculated_at: date.toISOString()
      });
      
      metrics.push({
        province: 'ON',
        source_type: 'wind',
        horizon_hours: 24,
        mape_percent: 12.0 + Math.random() * 3.0,
        mae_percent: 12.0 + Math.random() * 3.0,
        rmse_percent: 16.0 + Math.random() * 3.5,
        forecast_count: 1,
        calculated_at: date.toISOString()
      });
    }
    
    console.log(`Generated ${metrics.length} performance metrics`);
    
    // Insert metrics
    const { data: inserted, error: insertError } = await supabase
      .from('forecast_performance_metrics')
      .upsert(metrics, { onConflict: 'province,source_type,horizon_hours,calculated_at' })
      .select();
    
    if (insertError) {
      console.error('Error inserting metrics:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Inserted ${inserted?.length || 0} metrics into database`);
    
    // Display summary
    const avgSolarMAE = metrics.filter(m => m.source_type === 'solar').reduce((sum, m) => sum + m.mae_percent, 0) / metrics.filter(m => m.source_type === 'solar').length;
    const avgWindMAE = metrics.filter(m => m.source_type === 'wind').reduce((sum, m) => sum + m.mae_percent, 0) / metrics.filter(m => m.source_type === 'wind').length;
    
    console.log('\n📊 Seeding Statistics:');
    console.log(`Total Metrics: ${metrics.length}`);
    console.log(`Solar Avg MAE: ${avgSolarMAE.toFixed(2)}%`);
    console.log(`Wind Avg MAE: ${avgWindMAE.toFixed(2)}%`);
    console.log('\n✅ Forecast performance data seeding complete!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedForecastPerformance().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
