import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnymbecjgeaoxsfphrti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU'
);

async function check() {
  // Try different table names
  const tables = ['forecast_performance_metrics', 'forecast_performance', 'renewable_forecasts'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`Table '${table}':`, error ? `❌ ${error.message}` : `✅ EXISTS`);
  }
}

check().then(() => process.exit(0));
