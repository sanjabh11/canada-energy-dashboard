import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnymbecjgeaoxsfphrti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU'
);

async function check() {
  console.log('🔍 Checking provincial_generation data...\n');
  
  const { data, error, count } = await supabase
    .from('provincial_generation')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log('Total count:', count);
  console.log('Sample records:', data?.length || 0);
  console.log('Sample record:', data?.[0]);
  
  if (error) {
    console.error('Error:', error);
  }
}

check().then(() => process.exit(0));
