// Supabase Edge Function: llm - Minimal Bootstrap
// This is the minimal entry point that delegates to llm_app.ts for all non-health routes
// Keeps only essential CORS helpers and health endpoint to avoid cold-start BOOT_ERROR

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { withCors, handleCorsOptions } from "../_shared/cors.ts";

// Minimal bootstrap env flags
const LLM_SAFE_MODE = (Deno.env.get('LLM_SAFE_MODE') || '') === '1';
const WRAPPER_BASE_URL_BOOT = Deno.env.get('WRAPPER_BASE_URL') || '';

const jsonHeaders = { 'Content-Type': 'application/json' };

function handleHealth(): Response {
  return new Response(JSON.stringify({ ok: true, mode: WRAPPER_BASE_URL_BOOT ? 'live' : 'mock' }), { headers: jsonHeaders });
}


type LlmModule = {
  handleRequest?: (req: Request) => Response | Promise<Response>;
};

serve(async (req) => {
  const rl = applyRateLimit(req, 'llm');
  if (rl.response) return rl.response;

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/functions\/v1\/llm\b/, '');

    // Preflight support for browser requests
    if (req.method === 'OPTIONS') {
      return handleCorsOptions(req);
    }

    // Safe mode: only expose health endpoint to guarantee boot success
    if (LLM_SAFE_MODE) {
      if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
        return withCors(handleHealth(), req);
      }
      return withCors(new Response(JSON.stringify({ error: 'LLM in SAFE_MODE' }), { status: 503, headers: jsonHeaders }), req);
    }

    if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
      return withCors(handleHealth(), req);
    }

    // Delegate all other routes to the lazily-loaded app module
    const mod: LlmModule = await import('./llm_app.ts');
    if (typeof mod.handleRequest === 'function') {
      const res = await mod.handleRequest(req);
      return withCors(res, req);
    }

    return withCors(new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders }), req);
  } catch (e) {
    console.error('LLM function error', e);
    return withCors(new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders }), req);
  }
});

export {};
