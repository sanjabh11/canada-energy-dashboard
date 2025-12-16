# Regulatory API Rate Limiting Design Note

> Scope: `api-v2-ai-datacentres`, `api-v2-carbon-emissions`, `api-v2-ieso-queue`, `api-v2-cer-compliance`
>
> Intent: Document a simple, extensible design for adding rate limits *later* using the existing `api_usage` table and a shared helper, without changing current open-data behavior.

---

## 1. Current State (Nov 21, 2025)

- **Access model**: Public-but-keyed open data via Supabase Edge Functions.
  - Clients must send a valid anon key in `apikey` and/or `Authorization: Bearer <anon-key>`.
  - No JWT-based per-user auth is enforced for these endpoints yet.
- **Read posture**: All underlying tables are protected by **RLS + FORCE RLS** with **SELECT-only** policies for `anon, authenticated`.
- **Telemetry scaffold**:
  - `api_usage` table created via `20251120010_stage2_rls_and_api_usage.sql` with indexes on endpoint, user, and IP.
  - `_shared/rateLimit.ts` exposes `logApiUsage()` using `SUPABASE_SERVICE_ROLE_KEY` (server-side only; table is not readable by anon/authenticated).
  - `api-v2-ai-datacentres` calls `logApiUsage()` in a logging-only, best-effort fashion.
- **No enforcement yet**: There is **no active rate limiting** (no `429 Too Many Requests` responses). This is by design for the current stage.

---

## 2. Design Goals

1. **Protect cost & availability**
   - Prevent abuse (e.g., uncontrolled scraping, accidental infinite loops) from exhausting Supabase function and DB quotas.
2. **Stay simple & transparent**
   - Use existing Postgres + `api_usage` table as the primary source of truth.
   - Avoid external dependencies (Redis, Upstash) for this tier.
3. **Opt-in per endpoint**
   - Allow different limits per endpoint (AI vs Carbon vs IESO vs CER).
   - Make it easy to start with gentle limits (e.g., 60 req/min/IP) and tighten later.
4. **Gradual rollout**
   - Phase 1: logging-only (already in place for AI).
   - Phase 2: soft limits with headers (`X-RateLimit-*`) but no 429.
   - Phase 3: hard limits (429) for anonymous access, with higher quotas for authenticated/pro tiers.

---

## 3. Data Model Recap: `api_usage`

```sql
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  user_id uuid,
  api_key text,
  ip_address text,
  method text,
  status_code integer,
  requested_at timestamptz not null default now(),
  response_time_ms integer,
  extra jsonb
);

create index if not exists idx_api_usage_endpoint_time
  on api_usage (endpoint, requested_at desc);

create index if not exists idx_api_usage_user_time
  on api_usage (user_id, requested_at desc);

create index if not exists idx_api_usage_ip_time
  on api_usage (ip_address, requested_at desc);
```

- **RLS**: Enabled and forced; only `service_role` can read/write.
- **Usage**: Each request can log one row with endpoint, method, status, IP, API key, response time, and optional metadata.

Example query (ad-hoc monitoring):

```sql
select endpoint, ip_address, count(*) as count, min(requested_at) as first_seen, max(requested_at) as last_seen
from api_usage
where requested_at > now() - interval '1 hour'
  and endpoint in ('api-v2-ai-datacentres', 'api-v2-carbon-emissions', 'api-v2-ieso-queue', 'api-v2-cer-compliance')
group by endpoint, ip_address
order by count desc
limit 100;
```

---

## 4. Proposed Enforcement Model

### 4.1 Key dimensions

- **Subject**: IP address (primary) + optional anon API key.
- **Scope**: Per endpoint, with the possibility of a global cap.
- **Window**: Sliding or fixed window, starting with simple **fixed windows** in SQL.

Example initial limits (per IP):

| Endpoint | Window | Limit (anon/open) | Notes |
|---------|--------|-------------------|-------|
| `api-v2-ai-datacentres` | 1 minute | 60 req / IP | AI metrics; lower volume expected. |
| `api-v2-carbon-emissions` | 1 minute | 60 req / IP | Heavier queries but read-only public data. |
| `api-v2-ieso-queue` | 1 minute | 60 req / IP | Queue/procurement data. |
| `api-v2-cer-compliance` | 1 minute | 60 req / IP | CER compliance; slightly more sensitive, can be tightened later. |

Later, add **user-tier-aware** limits:

- Free: 60 req/min/IP.
- Edubiz: 600 req/min/IP + higher daily caps.
- Pro: 5,000+ req/min with JWT and per-account quotas.

### 4.2 Helper: `checkRateLimit` (future)

Pattern for a future `_shared/rateLimit.ts` addition (pseudocode, not yet implemented):

```ts
export interface RateLimitConfig {
  endpoint: string;
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: string;
}

export async function checkRateLimit(ip: string | null, cfg: RateLimitConfig): Promise<RateLimitResult> {
  if (!supabase || !ip) {
    return { ok: true, remaining: cfg.maxRequests, resetAt: new Date(Date.now() + cfg.windowSeconds * 1000).toISOString() };
  }

  const windowStart = new Date(Date.now() - cfg.windowSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .gte('requested_at', windowStart)
    .eq('endpoint', cfg.endpoint)
    .eq('ip_address', ip);

  if (error) {
    console.warn('rate limit check failed', error);
    return { ok: true, remaining: cfg.maxRequests, resetAt: new Date(Date.now() + cfg.windowSeconds * 1000).toISOString() };
  }

  const used = typeof data?.length === 'number' ? data.length : 0;
  const remaining = Math.max(0, cfg.maxRequests - used);

  return {
    ok: used < cfg.maxRequests,
    remaining,
    resetAt: new Date(Date.now() + cfg.windowSeconds * 1000).toISOString(),
  };
}
```

### 4.3 Integration pattern in an Edge Function

Example (conceptual) for `api-v2-ai-datacentres`:

```ts
const ipAddress =
  req.headers.get('x-forwarded-for') ||
  req.headers.get('cf-connecting-ip') ||
  null;

const limitCfg = {
  endpoint: 'api-v2-ai-datacentres',
  windowSeconds: 60,
  maxRequests: 60,
};

const rl = await checkRateLimit(ipAddress, limitCfg);
if (!rl.ok) {
  await safeLog(429, { reason: 'rate_limited' });
  return new Response(JSON.stringify({
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(limitCfg.maxRequests),
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': rl.resetAt,
    },
  });
}
```

> **Note:** Do *not* implement this until sponsors or operational constraints require it. For now, logging + monitoring is sufficient.

---

## 5. Rollout Strategy

1. **Phase 0 (Done)**
   - Create `api_usage` table and `_shared/rateLimit.ts` with `logApiUsage()`.
   - Integrate logging into `api-v2-ai-datacentres` (and later, other v2 APIs).

2. **Phase 1 – Monitoring Only**
   - Instrument all four v2 APIs with `logApiUsage()`.
   - Build simple Supabase SQL dashboards/queries to watch high-traffic IPs and endpoints.
   - Define threshold candidates (e.g., P95 of current traffic × 5).

3. **Phase 2 – Soft Limits**
   - Implement `checkRateLimit()` but return **HTTP 200** with rate-limit headers while logging when limits would be exceeded.
   - Use logs to tune `maxRequests` and window sizes.

4. **Phase 3 – Hard Limits**
   - Switch soft-limit paths to return **HTTP 429** for clearly abusive clients.
   - Keep higher internal limits or allowlist for trusted IP ranges or JWT-authenticated tiers.

5. **Phase 4 – Tiered Limits (Edubiz / Pro)**
   - Once JWT auth is wired for account-level access:
     - Use `user_id` from JWT to apply higher per-account quotas.
     - Maintain per-IP guardrails as a backstop.

---

## 6. Operational Playbook

### 6.1 Detecting abuse

- Run periodically in Supabase SQL editor:

```sql
select endpoint, ip_address, count(*) as count
from api_usage
where requested_at > now() - interval '10 minutes'
  and endpoint in ('api-v2-ai-datacentres', 'api-v2-carbon-emissions', 'api-v2-ieso-queue', 'api-v2-cer-compliance')
group by endpoint, ip_address
having count(*) > 500
order by count desc;
```

### 6.2 Emergency response

If you see a single IP hammering an endpoint:

- Temporarily add a stricter limit for that endpoint in code (Phase 3 pattern), or
- Use Cloudflare/Supabase edge controls to block that IP or ASN.

### 6.3 Documentation links

- `README.md` – high-level platform status and table list.
- `SECURITY_AUDIT.md` – prior audit with authentication and rate-limiting findings.
- This file – concrete design and rollout plan for Regulatory API rate limiting.
