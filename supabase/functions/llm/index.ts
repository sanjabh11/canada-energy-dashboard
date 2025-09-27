// Supabase Edge Function: llm - Minimal Bootstrap
// This is the minimal entry point that delegates to llm_app.ts for all non-health routes
// Keeps only essential CORS helpers and health endpoint to avoid cold-start BOOT_ERROR

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Minimal bootstrap env flags
const LLM_SAFE_MODE = (Deno.env.get('LLM_SAFE_MODE') || '') === '1';
const WRAPPER_BASE_URL_BOOT = Deno.env.get('WRAPPER_BASE_URL') || '';

const jsonHeaders = { 'Content-Type': 'application/json' };

function handleHealth(): Response {
  return new Response(JSON.stringify({ ok: true, mode: WRAPPER_BASE_URL_BOOT ? 'live' : 'mock' }), { headers: jsonHeaders });
}

// CORS helpers
const ALLOW_ORIGINS = (Deno.env.get('LLM_CORS_ALLOW_ORIGINS') || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function resolveOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOW_ORIGINS.includes('*')) return '*';
  if (origin && ALLOW_ORIGINS.some((o) => o === origin)) return origin;
  return ALLOW_ORIGINS[0] || '*';
}

function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-RateLimit-Limit, X-Cache, X-LLM-Mode');
  return new Response(res.body, { status: res.status, headers });
}

function handleOptions(req: Request): Response {
  const headers = new Headers();
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  const reqHeaders = req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type, x-user-id';
  headers.set('Access-Control-Allow-Headers', reqHeaders);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

type LlmModule = {
  handleRequest?: (req: Request) => Response | Promise<Response>;
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/functions\/v1\/llm\b/, '');

    // Preflight support for browser requests
    if (req.method === 'OPTIONS') {
      return handleOptions(req);
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
