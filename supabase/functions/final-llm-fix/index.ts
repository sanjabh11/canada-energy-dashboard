import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database config missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('Running final diagnosis for LLM function BOOT_ERROR...');

    // Test 1: Environment variables
    const envCheck = {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY
    };

    // Test 2: Rate limiting function
    let rateLimitWorks = false;
    try {
      const testCall = await supabase.rpc('llm_rl_increment', {
        p_user_id: 'test_user',
        p_window: new Date(),
        p_default_limit: 30
      });
      rateLimitWorks = !testCall.error;
    } catch (e) {
      console.log('Rate limiting function test failed:', e);
    }

    // Test 3: Required tables
    const tablesToCheck = ['llm_call_log', 'llm_feedback'];
    const missingTables: string[] = [];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error && (error.message.includes('does not exist') || error.code === 'PGRST116')) {
          missingTables.push(table);
        }
      } catch (e) {
        missingTables.push(table);
      }
    }

    // Return comprehensive diagnostic results
    return new Response(JSON.stringify({
      success: true,
      message: 'LLM Function BOOT_ERROR Diagnosis',
      timestamp: new Date().toISOString(),
      tests: {
        environment_variables: envCheck,
        rate_limit_function: rateLimitWorks,
        missing_tables: missingTables
      },
      diagnosis: {
        issue_identified: !rateLimitWorks || missingTables.length > 0 || !envCheck.SUPABASE_URL || !envCheck.SUPABASE_SERVICE_ROLE_KEY,
        root_cause: rateLimitWorks ? 'Unknown - all database components exist' : 'Missing database function or table',
        recommendation: rateLimitWorks ?
          'All database components exist - BOOT_ERROR may be runtime-specific. Try redeploying LLM function with DEBUG=true' :
          'Create missing database functions/tables using migration scripts'
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (err) {
    console.error('Diagnosis error:', err);
    return new Response(JSON.stringify({
      error: String(err),
      success: false,
      step: "final_diagnosis"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});