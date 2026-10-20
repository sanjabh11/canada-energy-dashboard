import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL ?? 'https://qnymbecjgeaoxsfphrti.supabase.co',
  process.env.SUPABASE_ANON_KEY ?? (() => { throw new Error('SUPABASE_ANON_KEY required for seeding'); })()
);

async function seed() {
  console.log('🌱 Seeding with minimal columns...');
  
  const metrics: any[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    metrics.push(
      { province: 'ON', source_type: 'solar', horizon_hours: 1, mape_percent: 3.8, mae_percent: 3.8, forecast_count: 428, calculated_at: date.toISOString() },
      { province: 'ON', source_type: 'solar', horizon_hours: 6, mape_percent: 5.1, mae_percent: 5.1, forecast_count: 412, calculated_at: date.toISOString() },
      { province: 'ON', source_type: 'wind', horizon_hours: 1, mape_percent: 6.2, mae_percent: 6.2, forecast_count: 431, calculated_at: date.toISOString() },
      { province: 'ON', source_type: 'wind', horizon_hours: 6, mape_percent: 7.8, mae_percent: 7.8, forecast_count: 405, calculated_at: date.toISOString() }
    );
  }
  
  const { data, error } = await supabase.from('forecast_performance').insert(metrics).select();
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log(`✅ Inserted ${data?.length || 0} metrics`);
  }
}

seed().then(() => process.exit(0));
