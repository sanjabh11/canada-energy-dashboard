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
    console.log('Test function called successfully with method:', req.method);
    console.log('Environment check:', {
      has_SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      has_SERVICE_ROLE: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test LLM function working",
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  } catch (err) {
    console.error('Test function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});