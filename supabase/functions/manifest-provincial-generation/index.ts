import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'manifest-provincial-generation');
  if (rl.response) return rl.response;


  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const manifest = {
      dataset: 'provincial_generation',
      version: '1.0',
      fields: ['date','province','producer','generation_type','megawatt_hours','source','version'],
      page_size_default: 100,
      max_page_size: 1000,
      notes: 'Provincial generation manifest placeholder',
    };
    return new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as any)?.message ?? err) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});
