// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

// Minimal manifest for HF Electricity Demand. Returns static JSON to validate endpoint wiring.
// Frontend expects a manifest and a separate stream endpoint.

Deno.serve(async (req: Request) => {
  // CORS preflight support
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'manifest-hf-electricity-demand');
  if (rl.response) return rl.response;


  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }
  try {
    const manifest = {
      dataset: 'hf_electricity_demand',
      version: '1.0',
      fields: ['datetime','electricity_demand','temperature','humidity','wind_speed','solar_irradiance','household_id','location','day_of_week','hour','source','version'],
      page_size_default: 100,
      max_page_size: 1000,
      notes: 'HF electricity demand manifest placeholder',
    }
    return new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as any)?.message ?? err) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/manifest-hf-electricity-demand' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
