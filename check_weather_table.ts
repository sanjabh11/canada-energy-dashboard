import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnymbecjgeaoxsfphrti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU'
);

async function check() {
  // Check if table exists and has data
  const { data, error, count } = await supabase
    .from('weather_observations')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log('Count:', count);
  console.log('Sample:', data?.[0]);
  console.log('Error:', error);
}

check().then(() => process.exit(0));
