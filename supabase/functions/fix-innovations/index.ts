import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Add missing columns to innovations table
    const queries = [
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS innovation_name text',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS technology_category text',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS description text',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS current_trl smallint',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS target_trl smallint',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS market_maturity text DEFAULT \'early\'',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS development_stage text DEFAULT \'concept\'',
      'ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS lead_organization text'
    ];

    const results = [];
    for (const query of queries) {
      const { data, error } = await supabaseClient.rpc('exec_sql', { sql: query });
      results.push({ query, success: !error, error: error?.message });
    }

    // Insert sample data
    const { data: insertData, error: insertError } = await supabaseClient
      .from('innovations')
      .upsert([
        {
          innovation_name: 'Advanced Flow Battery Storage',
          technology_category: 'battery_storage',
          description: 'Long-duration energy storage using vanadium redox flow technology',
          current_trl: 7,
          target_trl: 9,
          market_maturity: 'growth',
          development_stage: 'pilot',
          lead_organization: 'Canadian Battery Innovation Centre'
        },
        {
          innovation_name: 'AI-Powered Grid Optimization',
          technology_category: 'smart_grid',
          description: 'Machine learning for real-time grid balancing and optimization',
          current_trl: 6,
          target_trl: 8,
          market_maturity: 'growth',
          development_stage: 'prototype',
          lead_organization: 'University of Toronto'
        }
      ], { onConflict: 'innovation_name' });

    return new Response(
      JSON.stringify({
        success: true,
        alterResults: results,
        insertResult: { success: !insertError, error: insertError?.message }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
