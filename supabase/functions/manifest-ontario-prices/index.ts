import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'manifest-ontario-prices');
  if (rl.response) return rl.response;


  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const manifest = {
      dataset: 'ontario_prices',
      version: '1.0',
      fields: ['datetime','node_name','lmp_price','energy_price','congestion_price','loss_price','zone','market_date','interval_ending','source','version'],
      page_size_default: 100,
      max_page_size: 1000,
      notes: 'Ontario prices manifest placeholder',
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
