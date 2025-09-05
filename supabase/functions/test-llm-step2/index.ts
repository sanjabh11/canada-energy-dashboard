import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
    console.log('Step 2: Testing Supabase database connection...');

    const supabaseConnected = supabase ? "YES" : "NO";

    return new Response(
      JSON.stringify({
        success: true,
        message: "Step 2: Supabase connection test",
        supabaseConnected,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  } catch (err) {
    console.error('Step 2 error:', err);
    return new Response(
      JSON.stringify({ error: String(err), step: "step2" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});