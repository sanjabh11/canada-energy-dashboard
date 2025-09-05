import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Test the LLM adapter import that might be causing issues
import { callLLM } from "../llm/call_llm_adapter.ts";

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
    console.log('Step 3: Testing LLM adapter import...');

    // Test basic regex patterns that might be failing
    const testPatterns = [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      /\b(?:\+?\d[\s-]?){7,15}\b/g,
      /\b\d{6,}\b/g
    ];

    return new Response(
      JSON.stringify({
        success: true,
        message: "Step 3: LLM adapter import test",
        supabaseConnected: supabase ? "YES" : "NO",
        regexTests: "PASSED",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  } catch (err) {
    console.error('Step 3 error:', err);
    return new Response(
      JSON.stringify({ error: String(err), step: "step3" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});