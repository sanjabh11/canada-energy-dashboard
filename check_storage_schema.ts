import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnymbecjgeaoxsfphrti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU'
);

async function check() {
  // Try to insert with minimal fields
  const { data, error } = await supabase
    .from('storage_dispatch_log')
    .insert({
      province: 'ON',
      timestamp: new Date().toISOString(),
      action: 'hold',
      target_mw: 0
    })
    .select();
  
  console.log('Insert result:', data);
  console.log('Error:', error);
}

check().then(() => process.exit(0));
