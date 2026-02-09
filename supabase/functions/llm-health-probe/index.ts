// Minimal health probe function to isolate platform boot health
// Deno runtime for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

serve((req) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'llm-health-probe');
  if (rl.response) return rl.response;

  const url = new URL(req.url);
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }
  if (req.method === 'GET' && (url.pathname.endsWith('/health') || url.pathname === '/')) {
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
});
