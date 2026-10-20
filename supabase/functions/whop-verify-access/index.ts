/**
 * Whop Access Verification — Supabase Edge Function (hardened)
 *
 * Server-side entitlement check for existing Whop customers (audit G12,
 * Lane B identity-contract hardening).
 *
 * Request contract:
 *   POST /functions/v1/whop-verify-access
 *   Headers: x-whop-user-token: <token>   — Whop iframe-injected header
 *             (docs-confirmed for embedded apps); checked FIRST.
 *            Authorization: Bearer <whop user token> — OAuth user tokens.
 *   Body (optional JSON): { experienceId?: string } — app context only.
 *
 *   Tokens are read ONLY from those two headers. The function never reads
 *   tokens from URL query params or from the request body, and a
 *   caller-supplied user id is ignored entirely.
 *
 *   There is NO userId parameter. Identity is derived exclusively from the
 *   caller's bearer token after it is verified against the Whop API. A
 *   caller-supplied user id must never substitute identity — posting one is
 *   ignored (Codex audit: the previous contract let any caller spoof any
 *   user's entitlements by posting their userId).
 *
 * Response contract (fail-closed everywhere):
 *   Success: { hasAccess, tier, features, user: { id, email? },
 *              verificationSource, experienceId? }
 *   Failure: { hasAccess: false, tier: 'free', features: [], reason } — never
 *            elevates access. Verification infrastructure failures return 503
 *            with the same fail-closed body.
 *
 * CORS: Access-Control-Allow-Origin is echoed ONLY when the request Origin
 * matches the WHOP_ALLOWED_ORIGINS env allowlist (comma-separated). Empty or
 * unset allowlist = deny all origins (no wildcard, ever). Unlisted origins
 * get 403 and no ACAO header, for both POST and OPTIONS preflight.
 *
 * Deploy gate: in production mode (DENO_DEPLOYMENT_ID present, or
 * WHOP_ENV / ENVIRONMENT / SUPABASE_ENV === 'production') the function
 * REFUSES to serve requests (503 fail-closed) when WHOP_ALLOWED_ORIGINS is
 * unset, WHOP_API_KEY is missing, or BOTH WHOP_CEIP_PRODUCT_IDS and
 * WHOP_CEIP_EXPERIENCE_IDS are empty — at least one CEIP identifier
 * allowlist must be configured. A deployed-as-is function can never grant
 * access.
 *
 * Tier mapping: product-name matching is deliberately NOT used (Codex
 * audit: substring matching granted 'starter' for an active membership in
 * ANY unrelated product). Recognition requires an exact match between a
 * membership's product/plan/experience identifier and the server-held
 * allowlists:
 *   - WHOP_CEIP_PRODUCT_IDS      comma-separated prod_* IDs
 *   - WHOP_CEIP_EXPERIENCE_IDS   comma-separated exp_* IDs
 *   - WHOP_CEIP_PRODUCT_TIER_MAP JSON object {"prod_x":"pro", ...}
 * A configured ID with no tier-map entry resolves to 'free' — fail closed.
 */

export interface WhopVerifyAccessConfig {
  /** Server-held Whop API key used for the membership lookup (never exposed). */
  whopApiKey: string;
  /** Explicit origin allowlist parsed from WHOP_ALLOWED_ORIGINS. */
  allowedOrigins: string[];
  /**
   * Server-held CEIP product allowlist parsed from WHOP_CEIP_PRODUCT_IDS
   * (comma-separated). In production at least one of ceipProductIds /
   * ceipExperienceIds must be non-empty — an experience-only deployment
   * (experiences without product IDs) is a valid configuration.
   */
  ceipProductIds: string[];
  /**
   * Server-held CEIP experience allowlist parsed from
   * WHOP_CEIP_EXPERIENCE_IDS (comma-separated). In production at least one
   * of ceipProductIds / ceipExperienceIds must be non-empty.
   */
  ceipExperienceIds: string[];
  /**
   * Explicit Whop-ID → CEIP-tier map parsed from WHOP_CEIP_PRODUCT_TIER_MAP
   * (JSON object, e.g. {"prod_x":"pro"}). Keys may be product, plan, or
   * experience IDs — whichever identifier Whop returns on the membership.
   */
  ceipProductTierMap: Record<string, string>;
  /** True on hosted/production infrastructure — enables the deploy gate. */
  isProduction: boolean;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to https://api.whop.com. */
  whopApiBase?: string;
}

export interface VerifiedCallerIdentity {
  providerId: string;
  email?: string;
  name?: string;
  verificationSource: 'oauth_userinfo' | 'legacy_me';
}

const DEFAULT_WHOP_API_BASE = "https://api.whop.com";

// Mirror of the client-side WHOP_ACCESS_MATRIX — kept minimal: the function
// only returns tier + features; the client treats 'free' as the safe default.
const TIER_FEATURES: Record<string, string[]> = {
  free: [],
  starter: ["basic_dashboard"],
  pro: ["basic_dashboard", "exports", "roi_calculator"],
  enterprise: ["basic_dashboard", "exports", "roi_calculator", "api_access"],
};

/**
 * Whop identity verification targets — honest documentation status
 * (Codex audit, 2026-10):
 *
 * Token transport (both CONFIRMED in official Whop docs):
 * - Authorization: Bearer <token>: OAuth user tokens.
 * - x-whop-user-token request header: injected by Whop into requests for
 *   embedded (iframe) apps; honored here BEFORE the Authorization header.
 *
 * Verification endpoints:
 * - GET /users/{id}: CONFIRMED in official Whop docs for user OAuth tokens,
 *   but unusable as a bootstrap target — the user id is exactly what this
 *   function is trying to derive, so it cannot be queried first.
 * - GET /oauth/userinfo: CONFIRMED in official Whop docs for OAuth user
 *   tokens — the primary verification target.
 * - GET /v5/me: legacy endpoint this application has used historically;
 *   NOT confirmed against official Whop docs — kept LAST in the chain as a
 *   flagged compatibility fallback. If it proves dead, remove it rather
 *   than letting it sit ahead of confirmed targets.
 *
 * The multi-target fallback chain is kept intentionally (do NOT remove
 * silently): each target must return a successful Whop API response carrying
 * a subject/id, so the chain never fabricates identity.
 */
export const WHOP_IDENTITY_VERIFICATION_TARGETS: ReadonlyArray<{
  url: string;
  verificationSource: VerifiedCallerIdentity['verificationSource'];
  docsStatus: string;
}> = [
  {
    url: "https://api.whop.com/oauth/userinfo",
    verificationSource: "oauth_userinfo",
    docsStatus: "confirmed_in_official_whop_docs_for_oauth_user_tokens",
  },
  {
    url: "https://api.whop.com/v5/me",
    verificationSource: "legacy_me",
    docsStatus: "unconfirmed_in_official_whop_docs_kept_last_as_legacy_fallback_requires_owner_confirmation_before_hosted_deploy",
  },
];

/** Parse a comma-separated origin allowlist. Unset/empty => deny all. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Parse a comma-separated Whop ID allowlist. Unset/empty => []. */
export function parseWhopIdList(raw: string | undefined): string[] {
  return parseAllowedOrigins(raw);
}

/**
 * Parse WHOP_CEIP_PRODUCT_TIER_MAP — a JSON object mapping Whop
 * product/plan/experience IDs to CEIP tiers, e.g. {"prod_x":"pro"}.
 * Entries with unknown tiers are dropped; unparseable input => {}.
 */
export function parseWhopProductTierMap(raw: string | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const map: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const id = key.trim();
      const tier = (textValue(value) ?? "").toLowerCase();
      if (id && tier && tier !== "free" && tier in TIER_FEATURES) {
        map[id] = tier;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function corsHeaders(origin: string, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, content-type, x-whop-user-token";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return headers;
}

function textValue(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Flat shape: this repo typechecks the edge functions with strictNullChecks
// off, where boolean-discriminated-union narrowing does not apply.
interface TokenVerification {
  ok: boolean;
  identity?: VerifiedCallerIdentity;
  httpStatus?: number;
  retryable: boolean;
}

/**
 * Verify the caller's bearer token against Whop and take the identity FROM
 * the verification response. Never trusts the request body. Fails closed:
 * any target error skips to the next target; no successful Whop response
 * means no identity.
 */
async function verifyCallerToken(
  token: string,
  fetchImpl: typeof fetch,
): Promise<TokenVerification> {
  let lastStatus: number | undefined;
  let retryable = false;

  for (const target of WHOP_IDENTITY_VERIFICATION_TARGETS) {
    try {
      const response = await fetchImpl(target.url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8_000),
      });
      lastStatus = response.status;
      if (!response.ok) continue;

      const payload: unknown = await response.json().catch(() => ({}));
      const record = isRecord(payload) ? payload : {};
      const providerId =
        textValue(record.sub) ?? textValue(record.id) ?? textValue(record.user_id);
      if (!providerId) continue;

      return {
        ok: true,
        retryable: false,
        identity: {
          providerId,
          email: textValue(record.email),
          name: textValue(record.name),
          verificationSource: target.verificationSource,
        },
      };
    } catch {
      retryable = true;
      // Try the compatibility target without exposing verification details.
    }
  }

  return {
    ok: false,
    httpStatus: lastStatus,
    retryable:
      retryable ||
      lastStatus === undefined ||
      lastStatus >= 500 ||
      lastStatus === 408 ||
      lastStatus === 429,
  };
}

/**
 * Collect every product/plan/experience identifier a Whop membership might
 * carry — Whop API payload shapes vary between endpoints and API versions
 * (product_id, product.id, plan_id, plan.id, plan.product_id,
 * experience_id). Matching is exact-ID only; names are never consulted.
 */
function membershipIdentifiers(membership: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const push = (value: unknown) => {
    const id = textValue(value);
    if (id && !ids.includes(id)) ids.push(id);
  };
  const product = isRecord(membership.product) ? membership.product : {};
  const plan = isRecord(membership.plan) ? membership.plan : {};
  push(membership.product_id);
  push(product.id);
  push(membership.plan_id);
  push(plan.id);
  push(plan.product_id);
  push(membership.experience_id);
  return ids;
}

/**
 * Map a Whop membership to a CEIP tier using ONLY the server-held
 * product/experience ID allowlists (Codex audit defect: the previous
 * product-NAME substring matching granted 'starter' for an active
 * membership in ANY unrelated product — removed entirely).
 *
 * A membership is recognized only when one of its identifiers exactly
 * matches a configured CEIP product/experience ID (or a tier-map key).
 * Its tier then comes from the explicit ID→tier map. An unrecognized
 * product, missing config, or a configured-but-unmapped ID all resolve to
 * 'free' — fail closed everywhere.
 */
function tierFromMembership(
  membership: Record<string, unknown>,
  config: WhopVerifyAccessConfig,
): string {
  const status = String(membership.status ?? "").toLowerCase();
  if (status !== "active" && status !== "trialing") return "free";

  const recognized = new Set([
    ...config.ceipProductIds,
    ...config.ceipExperienceIds,
    ...Object.keys(config.ceipProductTierMap),
  ]);
  if (recognized.size === 0) return "free";

  const ids = membershipIdentifiers(membership);
  // First pass: a recognized ID with an explicit tier-map entry wins.
  for (const id of ids) {
    if (!recognized.has(id)) continue;
    const tier = (textValue(config.ceipProductTierMap[id]) ?? "").toLowerCase();
    if (tier && tier !== "free" && tier in TIER_FEATURES) return tier;
  }
  // Second pass: recognized but unmapped still fails closed — 'free'
  // either way, so no distinction is needed in the return value.
  return "free";
}

/** Rank used to keep the best tier when a member holds several memberships. */
const TIER_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

const FAIL_CLOSED = { hasAccess: false, tier: "free", features: [] as string[] };

export async function handleWhopVerifyAccessRequest(
  req: Request,
  config: WhopVerifyAccessConfig,
): Promise<Response> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const apiBase = (config.whopApiBase ?? DEFAULT_WHOP_API_BASE).replace(/\/$/, "");
  const origin = req.headers.get("origin") ?? "";
  const headers = corsHeaders(origin, config.allowedOrigins);
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers });
  const failClosed = (reason: string, status = 200): Response =>
    json({ ...FAIL_CLOSED, reason }, status);

  // Deploy gate: refuse to serve entirely when a production deployment lacks
  // the origin allowlist, the server credential, or EVERY CEIP identifier
  // allowlist — an experience-only deployment (WHOP_CEIP_EXPERIENCE_IDS set,
  // WHOP_CEIP_PRODUCT_IDS empty) is valid, so the gate requires at least one
  // of the two lists. Without any ID config every membership resolves to
  // 'free' anyway, so serving would be pointless rather than harmful, but
  // failing closed surfaces the misconfiguration explicitly.
  if (
    config.isProduction &&
    (config.allowedOrigins.length === 0 ||
      !config.whopApiKey ||
      (config.ceipProductIds.length === 0 && config.ceipExperienceIds.length === 0))
  ) {
    return failClosed("deploy_gated_unconfigured", 503);
  }

  if (req.method === "OPTIONS") {
    if (origin && !config.allowedOrigins.includes(origin)) {
      return json({ error: "origin not allowed" }, 403);
    }
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // CORS: unlisted origins are rejected outright — no ACAO header is emitted.
  if (origin && !config.allowedOrigins.includes(origin)) {
    return json({ error: "origin not allowed" }, 403);
  }

  // Fail closed when the server secret is not configured.
  if (!config.whopApiKey) {
    return failClosed("verification_unconfigured");
  }

  // Identity comes ONLY from Whop-issued tokens in request headers — never
  // from the request body and never from URL query params. The Whop iframe
  // injects x-whop-user-token into requests for embedded apps (docs
  // confirmed), so it is checked first; Authorization: Bearer covers OAuth
  // user tokens.
  const iframeToken = textValue(req.headers.get("x-whop-user-token")) ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = iframeToken || bearerToken;
  if (!token) {
    return failClosed("token_required", 401);
  }

  // Optional JSON body: { experienceId } is kept as app context only. Any
  // caller-supplied userId is deliberately ignored — it must never substitute
  // identity (Codex audit defect 1).
  let experienceId: string | undefined;
  const rawBody = await req.text();
  if (rawBody.trim().length > 0) {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "invalid body" }, 400);
    }
    if (isRecord(body)) {
      const candidate = textValue(body.experienceId);
      if (candidate && candidate.length <= 128) experienceId = candidate;
    }
  }

  const verification = await verifyCallerToken(token, fetchImpl);
  if (!verification.ok) {
    // Verification infrastructure failure is still fail-closed, but marked
    // retryable so callers can distinguish it from a definitive rejection.
    if (verification.retryable) {
      return failClosed("verification_unavailable", 503);
    }
    return failClosed("verification_failed");
  }
  const verifiedUserId = verification.identity?.providerId ?? "";
  if (!verifiedUserId) {
    return failClosed("verification_failed");
  }

  try {
    const url = new URL(`${apiBase}/api/v5/memberships`);
    url.searchParams.set("user_id", verifiedUserId);
    url.searchParams.set("page_size", "10");
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${config.whopApiKey}` },
    });
    if (!res.ok) {
      return failClosed("verification_failed");
    }
    const data: unknown = await res.json();
    const memberships: Record<string, unknown>[] =
      isRecord(data) && Array.isArray(data.data)
        ? (data.data as Record<string, unknown>[])
        : [];
    // Scan all memberships and keep the best tier: a member may hold an
    // active membership in an unrelated product alongside a CEIP one, and
    // membership order is not meaningful. Unrecognized/expired memberships
    // contribute 'free' via tierFromMembership.
    let tier = "free";
    for (const membership of memberships) {
      const candidate = tierFromMembership(membership, config);
      if ((TIER_RANK[candidate] ?? 0) > (TIER_RANK[tier] ?? 0)) tier = candidate;
    }
    return json({
      hasAccess: tier !== "free",
      tier,
      features: TIER_FEATURES[tier] ?? [],
      user: {
        id: verifiedUserId,
        ...(verification.identity?.email ? { email: verification.identity.email } : {}),
      },
      verificationSource: verification.identity?.verificationSource,
      ...(experienceId ? { experienceId } : {}),
    });
  } catch {
    return failClosed("verification_error");
  }
}

/**
 * Deno bootstrap — guarded so the module stays importable under Node/vitest
 * for unit tests. `Deno.serve` is the current Supabase Edge Runtime entry.
 */
function configFromDenoEnv(): WhopVerifyAccessConfig {
  const isProduction =
    Boolean(Deno.env.get("DENO_DEPLOYMENT_ID")) ||
    Deno.env.get("WHOP_ENV") === "production" ||
    Deno.env.get("SUPABASE_ENV") === "production" ||
    Deno.env.get("ENVIRONMENT") === "production";
  return {
    whopApiKey: Deno.env.get("WHOP_API_KEY") ?? "",
    allowedOrigins: parseAllowedOrigins(Deno.env.get("WHOP_ALLOWED_ORIGINS")),
    ceipProductIds: parseWhopIdList(Deno.env.get("WHOP_CEIP_PRODUCT_IDS")),
    ceipExperienceIds: parseWhopIdList(Deno.env.get("WHOP_CEIP_EXPERIENCE_IDS")),
    ceipProductTierMap: parseWhopProductTierMap(Deno.env.get("WHOP_CEIP_PRODUCT_TIER_MAP")),
    isProduction,
  };
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve((req: Request) => handleWhopVerifyAccessRequest(req, configFromDenoEnv()));
}
