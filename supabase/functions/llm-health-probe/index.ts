// Minimal health probe function to isolate platform boot health
// Deno runtime for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((req) => {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    headers.set('Access-Control-Max-Age', '86400');
    return new Response(null, { status: 204, headers });
  }
  if (req.method === 'GET' && (url.pathname.endsWith('/health') || url.pathname === '/')) {
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
