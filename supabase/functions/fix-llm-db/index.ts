import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database config missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('Creating missing LLM database function...');

    // Test the missing rate limiting function call that the LLM function needs
    console.log('Testing if llm_rl_increment function exists...');

    try {
      const testCall = await supabase.rpc('llm_rl_increment', {
        p_user_id: 'test_user',
        p_window: new Date().toISOString(),
        p_default_limit: 30
      });

      console.log('llm_rl_increment function exists and works:', testCall);

      return new Response(JSON.stringify({
        success: true,
        message: 'llm_rl_increment function already exists and works',
        result: testCall.data ?? null
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    } catch (rpcError) {
      console.warn('llm_rl_increment function missing or failed:', rpcError);
    }

    console.log('Checking for required LLM database tables...');

    const tablesToCheck = ['llm_call_log', 'llm_feedback', 'llm_reports'];
    const missingTables: string[] = [];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error && error.message.includes('does not exist')) {
          missingTables.push(table);
        }
      } catch (e) {
        missingTables.push(table);
        console.log(`Table '${table}' does not exist or inaccessible`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: missingTables.length === 0
        ? 'All required database components found'
        : 'Missing database components detected',
      rateLimitFunctionWorks: false,
      tablesFound: tablesToCheck,
      missingTables,
      diagnosis: missingTables.length > 0
        ? `Missing tables: ${missingTables.join(', ')} - create these before re-running the LLM function.`
        : 'All database components exist - investigate runtime environment differences causing BOOT_ERROR.'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (err) {
    console.error('Fix LLM DB error:', err);
    return new Response(JSON.stringify({
      error: String(err),
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});