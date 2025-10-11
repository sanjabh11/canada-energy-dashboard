import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qnymbecjgeaoxsfphrti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueW1iZWNqZ2Vhb3hzZnBocnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMTczNjEsImV4cCI6MjA3MTU5MzM2MX0.6wAWe5GdKzTOjVa0eUVhDJ4IwczseO9A83uwXlDg0DU'
);

async function check() {
  console.log('🔍 Checking curtailment data...\n');
  
  // Check events
  const { data: events, error: eventsErr } = await supabase
    .from('curtailment_events')
    .select('*')
    .limit(5);
  
  console.log('Events count:', events?.length || 0);
  console.log('Sample event:', events?.[0]);
  
  // Check recommendations
  const { data: recs, error: recsErr } = await supabase
    .from('curtailment_reduction_recommendations')
    .select('*')
    .limit(5);
  
  console.log('\nRecommendations count:', recs?.length || 0);
  console.log('Sample rec:', recs?.[0]);
  
  if (recsErr) {
    console.error('Recommendations error:', recsErr);
  }
}

check().then(() => process.exit(0));
