/**
 * Data Purge Cron Job
 * Runs weekly to clean up old data and maintain database size
 * Optimized for Supabase free tier (500 MB limit)
 * Schedule: 0 2 * * 0 (2 AM every Sunday)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[PURGE] Starting weekly data purge...');

    // Call the purge_old_data function
    const { data: purgeResults, error: purgeError } = await supabase
      .rpc('purge_old_data');

    if (purgeError) {
      console.error('[PURGE] Error:', purgeError);
      throw purgeError;
    }

    console.log('[PURGE] Results:', purgeResults);

    // Get database stats after purge
    const { data: stats, error: statsError } = await supabase
      .rpc('get_database_stats');

    if (statsError) {
      console.warn('[PURGE] Could not fetch stats:', statsError);
    }

    const totalRowsDeleted = purgeResults?.reduce(
      (sum: number, row: any) => sum + (row.rows_deleted || 0),
      0
    ) || 0;

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      total_rows_deleted: totalRowsDeleted,
      tables_purged: purgeResults?.length || 0,
      purge_details: purgeResults,
      database_stats: stats || null
    };

    console.log('[PURGE] Complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[PURGE] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
