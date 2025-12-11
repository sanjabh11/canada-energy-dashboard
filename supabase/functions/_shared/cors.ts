/**
 * Shared CORS Utility for Supabase Edge Functions
 * 
 * Provides secure CORS handling with configurable origin allowlist.
 * Replaces wildcard (*) CORS with explicit origin validation.
 */

// Default allowed origins - production and development
const DEFAULT_ALLOWED_ORIGINS = [
  // Production
  'https://canada-energy.netlify.app',
  'https://ceip.netlify.app',
  'https://canada-energy-dashboard.netlify.app',
  // Whop iframe domains (dynamic subdomains)
  'https://whop.com',
  // Development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Whop uses dynamic subdomains like *.apps.whop.com
const WHOP_DOMAIN_PATTERN = /^https:\/\/[a-z0-9]+\.apps\.whop\.com$/;

// Get allowed origins from environment or use defaults
export function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('CORS_ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Check if an origin matches the Whop dynamic subdomain pattern
 */
function isWhopDomain(origin: string): boolean {
  return WHOP_DOMAIN_PATTERN.test(origin);
}

/**
 * Resolve the appropriate origin for CORS response
 * Returns the request origin if it's in the allowlist, otherwise returns the first allowed origin
 */
export function resolveOrigin(req: Request): string {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.get('origin') || '';

  // Check if wildcard is explicitly allowed (for backward compatibility during migration)
  if (allowedOrigins.includes('*')) {
    return '*';
  }

  // Check if the request origin is in the allowlist
  if (requestOrigin && allowedOrigins.some(o => o === requestOrigin)) {
    return requestOrigin;
  }

  // Allow Whop dynamic subdomains (*.apps.whop.com)
  if (requestOrigin && isWhopDomain(requestOrigin)) {
    return requestOrigin;
  }

  // Return first allowed origin as fallback (for non-browser requests)
  return allowedOrigins[0] || '';
}

/**
 * Add CORS headers to a response
 */
export function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  const origin = resolveOrigin(req);

  if (origin) {
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-RateLimit-Limit, X-Cache');
  }

  return new Response(res.body, { status: res.status, headers });
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
export function handleCorsOptions(req: Request): Response {
  const headers = new Headers();
  const origin = resolveOrigin(req);

  if (origin) {
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    // Echo back requested headers or use defaults
    const requestedHeaders = req.headers.get('access-control-request-headers') ||
      'authorization, x-client-info, apikey, content-type';
    headers.set('Access-Control-Allow-Headers', requestedHeaders);
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return new Response(null, { status: 204, headers });
}

/**
 * Standard CORS headers object for simple responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be overridden by withCors
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create CORS headers for a specific request
 */
export function createCorsHeaders(req: Request): Record<string, string> {
  const origin = resolveOrigin(req);
  return {
    'Vary': 'Origin',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
