/**
 * Client identification for rate limiting and usage logging.
 * Pure module (no Deno/env imports) so it is unit-testable outside Deno.
 */

/**
 * FNV-1a 64-bit fingerprint of a credential — non-cryptographic, used only to
 * distinguish keys for attribution and rate-limit buckets. Prefix-slicing is
 * unsafe: every JWT shares the same header prefix, so a 12-char slice both
 * collides across callers and leaks raw key material into logs.
 */
export function hashClientKey(apiKey: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < apiKey.length; i++) {
    hash ^= BigInt(apiKey.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Best-effort client IP. The LAST X-Forwarded-For hop wins: a client can
 * forge earlier hops, but it cannot control what the deployed gateway
 * appended last. Header identity is anti-abuse, not authentication — the
 * trusted-proxy behavior of the actual gateway is a deployment gate and must
 * be verified in staging before this is treated as a security boundary.
 */
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  const lastHop = xff?.split(',').map((hop) => hop.trim()).filter(Boolean).pop();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return (lastHop || realIp || 'unknown').slice(0, 64);
}

/**
 * Get client identifier from request (IP address or API key).
 * Combines credential fingerprint + IP: the anon API key is public and
 * identical for every browser session, so keying on it alone would collapse
 * all callers into one site-wide bucket.
 */
export function getClientId(req: Request): string {
  const apiKey = req.headers.get('apikey') || req.headers.get('authorization')?.replace('Bearer ', '');
  const ip = clientIp(req);
  if (apiKey && apiKey.length > 10) {
    return `key-ip:${hashClientKey(apiKey)}@${ip}`;
  }
  return `ip:${ip}`;
}

/**
 * Bucket identity for rate limiting excludes caller-controlled credentials:
 * rotating them would bypass the limit. Missing IPs share a conservative
 * fallback bucket. This identity is
 * anti-abuse, not authentication; the gateway's trusted-proxy behavior is a
 * deployment gate (see getClientId for attribution logging, which keeps both
 * signals).
 */
export function getRateLimitIdentity(req: Request): string {
  const ip = clientIp(req);
  if (ip !== 'unknown') return `ip:${ip}`;
  return 'ip:unknown';
}

/**
 * Decode a getClientId composite back into api_key / ip_address columns.
 * Handles `key-ip:<keyhash16>@<ip>`, `key:<key>` (legacy), and `ip:<ip>` formats —
 * callers that persist usage logs must use this instead of prefix-slicing so
 * neither field is silently nulled nor key material lands in the IP column.
 */
export function parseClientId(clientId: string): { apiKey: string | null; ipAddress: string | null } {
  if (clientId.startsWith('key-ip:')) {
    const rest = clientId.slice(7);
    const at = rest.indexOf('@');
    if (at === -1) return { apiKey: rest || null, ipAddress: null };
    return { apiKey: rest.slice(0, at) || null, ipAddress: rest.slice(at + 1) || null };
  }
  if (clientId.startsWith('key:')) {
    return { apiKey: clientId.slice(4) || null, ipAddress: null };
  }
  if (clientId.startsWith('ip:')) {
    return { apiKey: null, ipAddress: clientId.slice(3) || null };
  }
  return { apiKey: null, ipAddress: clientId || null };
}
