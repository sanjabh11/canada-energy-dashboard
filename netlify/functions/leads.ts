/**
 * Netlify Function: Lead Capture and Lifecycle Management
 *
 * Handles lead intent tracking and lifecycle state transitions.
 * Part of: PBI-OpenClaw-Monetization-Orchestration-T1
 *
 * Abuse-control notes (audit findings G6 + G7, security remediation):
 *
 * - BODY SIZE: request bodies are bounded to 16 KB and rejected with a
 *   413-equivalent JSON error BEFORE parsing. Content-Length (when present)
 *   and the measured body are both checked.
 * - SCHEMA: the lead-intake payload is validated against an explicit field
 *   allowlist with per-field type and max-length checks. Unknown top-level
 *   fields are DROPPED (not rejected) so that future clients can add fields
 *   without breaking deploy ordering (forward-compatibility). Dropped fields
 *   are never persisted — only validated values reach the database.
 * - THROTTLING: the per-IP token buckets and the global bucket below are
 *   IN-MEMORY and therefore PER-INSTANCE best-effort. Netlify functions scale
 *   horizontally across many isolated instances, so this is NOT a distributed
 *   limiter — a determined attacker rotating across instances gets a fresh
 *   bucket per instance. Real distributed throttling needs infrastructure this
 *   repo does not have (e.g. a Redis/Upstash-backed bucket, a DB counter, or
 *   CDN/WAF rate rules).
 * - DEDUP: identical repeated submissions inside a 24h window return the
 *   generic success response without inserting a second row. Implemented as a
 *   keyed HMAC-SHA-256 token (in-memory cache) PLUS a best-effort
 *   select-before-insert on (email + intent + created_at window).
 *   Migration 20261005001_lead_intake_dedup_token.sql adds a `dedup_token`
 *   column + partial UNIQUE index, making dedup atomic once applied — until
 *   the migration lands, the check-then-insert race window documented below
 *   still applies in deployments without the column.
 *   DEDUP FAIL-CLOSED: when the dedup CHECK cannot be completed (lookup error,
 *   unreachable PostgREST, ambiguous unique-violation), no row is written —
 *   a dedup outage must not become a silent double-write. The response still
 *   returns the generic success body so a checker outage is not a usable
 *   oracle and honest users are not told their submission failed. Tradeoff:
 *   a lead arriving during a dedup-check outage is acknowledged but not
 *   persisted. The HMAC secret is also fail-closed: no dedup token is ever
 *   computed or stored without LEAD_INTAKE_DEDUP_SECRET (503 before any I/O).
 * - HONEYPOT: a non-empty `website` or `company_url` field returns the SAME
 *   generic success shape but skips the insert (bot trap — no oracle leak).
 * - ORACLE SAFETY: accepted, honeypot, deduplicated, and dedup-check-outage
 *   submissions all return an identical generic success body. Validation
 *   failures return 400 with a generic message and never echo field-level
 *   details.
 * - DATA MINIMIZATION + RETENTION (G7): only the validated allowlist columns
 *   plus minimized `metadata` are persisted — no raw request bodies, headers,
 *   IP addresses, or webhook payloads are stored anywhere in this module
 *   (the client IP lives only in the in-memory throttle bucket). Facility-
 *   level metadata requires explicit pilot opt-in. RETENTION POLICY for
 *   lead_intake_submissions rows is owner-gated: there is no in-repo purge
 *   job; retention/erasure windows live in the owner's privacy-ops runbook
 *   and are enforced out of band (e.g. scheduled review/purge of `new` rows).
 */

import { createHmac } from 'node:crypto';

/**
 * Local handler types — this repo deliberately avoids the `@netlify/functions`
 * package (see utility-connector-history.ts). Kept structurally compatible
 * with the Netlify runtime event/response contract.
 */
interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://canada-energy.netlify.app',
  'https://ceip.netlify.app',
];

/** Hard bound on the raw request body for every action on this endpoint. */
export const MAX_INTAKE_BODY_BYTES = 16 * 1024;
/** Bound on the JSON-serialized `metadata` object inside a submission. */
export const MAX_INTAKE_METADATA_BYTES = 4 * 1024;
/** Per-IP intake submission budgets (per function instance — see header note). */
export const INTAKE_MAX_PER_IP_PER_HOUR = 5;
export const INTAKE_MAX_PER_IP_PER_DAY = 20;
/** Blunt global safety cap for the intake action only (per instance). */
export const INTAKE_MAX_GLOBAL_PER_HOUR = 300;
/** Deduplication window: identical (email + intent) within 24h is a duplicate. */
export const INTAKE_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Pragmatic RFC 5322-shaped email check (not full RFC — rejects obvious junk). */
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/**
 * Field allowlist + max lengths for lead intake. Bounds match the client-side
 * clamps in src/lib/leadIntake.ts so legitimate browser submissions can never
 * be rejected for length alone.
 */
const INTAKE_STRING_LIMITS: Record<string, number> = {
  company_name: 200,
  contact_name: 200,
  email: 320,
  phone: 64,
  team_size: 32,
  industry: 64,
  message: 2000,
  source_route: 100,
  channel: 32,
  segment: 100,
  campaign_id: 100,
};

const REQUIRED_INTAKE_FIELDS = [
  'contact_name',
  'email',
  'source_route',
  'segment',
  'campaign_id',
] as const;

/** Honeypot field names — real browsers never render inputs with these names. */
const HONEYPOT_FIELDS = ['website', 'company_url'] as const;

/**
 * Facility-level metadata keys must only be persisted when the submitter
 * explicitly opted into a pilot request (G7 payload minimization). Mirrored
 * server-side as defense-in-depth against hand-rolled clients; keep in sync
 * with src/lib/leadIntake.ts.
 */
const FACILITY_METADATA_EXACT_KEYS = new Set([
  'annual_emissions',
  'emissions',
  'benchmark_exceedance',
  'benchmark_values',
  'direct_invest_capex',
  'capex',
  'compliance_year',
  'scenario',
  'scenario_data',
]);
const LEAD_METADATA_STRING_LIMITS: Readonly<Record<string, number>> = {
  lead_type: 64,
  client_count: 16,
  current_tool: 100,
  target_plan: 64,
};

const LEAD_METADATA_NUMBER_MAXIMUMS: Readonly<Record<string, number>> = {
  annual_emissions: 1_000_000_000,
  benchmark_exceedance: 1_000_000_000,
  direct_invest_capex: 1_000_000_000_000,
  compliance_year: 2100,
};

function isFacilityMetadataKey(key: string): boolean {
  if (FACILITY_METADATA_EXACT_KEYS.has(key)) return true;
  return key.startsWith('facility_') || key.startsWith('emissions_') ||
    key.startsWith('capex_') || key.startsWith('benchmark_') ||
    key.startsWith('scenario_') || key.startsWith('compliance_');
}

interface SlidingWindow {
  count: number;
  resetAt: number;
}

/**
 * In-memory bucket state. Per-instance only — see the header comment for why
 * this cannot be distributed in the current infra.
 */
const ipHourlyBuckets = new Map<string, SlidingWindow>();
const ipDailyBuckets = new Map<string, SlidingWindow>();
const globalIntakeHourly: SlidingWindow = { count: 0, resetAt: 0 };
/** dedup token -> expiry epoch ms (fast path before the DB select). */
const dedupTokenCache = new Map<string, number>();

function consumeWindow(
  bucket: SlidingWindow,
  limit: number,
  windowMs: number,
  nowMs: number,
): boolean {
  if (bucket.resetAt <= nowMs) {
    bucket.count = 0;
    bucket.resetAt = nowMs + windowMs;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

function sweepExpired(map: Map<string, SlidingWindow>, nowMs: number): void {
  if (map.size < 5000) return;
  for (const [key, bucket] of map) {
    if (bucket.resetAt <= nowMs) map.delete(key);
  }
}

function sweepDedupCache(nowMs: number): void {
  if (dedupTokenCache.size < 5000) return;
  for (const [token, expiresAt] of dedupTokenCache) {
    if (expiresAt <= nowMs) dedupTokenCache.delete(token);
  }
}

/**
 * Per-IP token bucket: INTAKE_MAX_PER_IP_PER_HOUR/hour and
 * INTAKE_MAX_PER_IP_PER_DAY/day, plus a global hourly safety cap.
 * Returns true when the request may proceed.
 */
export function allowIntakeRequest(ip: string, nowMs: number = Date.now()): boolean {
  sweepExpired(ipHourlyBuckets, nowMs);
  sweepExpired(ipDailyBuckets, nowMs);

  const hourly = ipHourlyBuckets.get(ip) ?? { count: 0, resetAt: 0 };
  ipHourlyBuckets.set(ip, hourly);
  const daily = ipDailyBuckets.get(ip) ?? { count: 0, resetAt: 0 };
  ipDailyBuckets.set(ip, daily);

  const canConsume = (bucket: SlidingWindow, limit: number, windowMs: number): boolean => {
    if (bucket.resetAt <= nowMs) {
      bucket.count = 0;
      bucket.resetAt = nowMs + windowMs;
    }
    return bucket.count < limit;
  };

  if (
    !canConsume(hourly, INTAKE_MAX_PER_IP_PER_HOUR, HOUR_MS) ||
    !canConsume(daily, INTAKE_MAX_PER_IP_PER_DAY, DAY_MS) ||
    !canConsume(globalIntakeHourly, INTAKE_MAX_GLOBAL_PER_HOUR, HOUR_MS)
  ) {
    return false;
  }

  // Reserve all three buckets only after every limit has capacity. In
  // particular, an already-capped IP cannot consume a remaining global slot.
  consumeWindow(hourly, INTAKE_MAX_PER_IP_PER_HOUR, HOUR_MS, nowMs);
  consumeWindow(daily, INTAKE_MAX_PER_IP_PER_DAY, DAY_MS, nowMs);
  consumeWindow(globalIntakeHourly, INTAKE_MAX_GLOBAL_PER_HOUR, HOUR_MS, nowMs);
  return true;
}

function resolveOrigin(origin: string | undefined): string {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return ALLOWED_ORIGINS[0];
}

function corsHeaders(origin: string | undefined) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

/** Case-insensitive header lookup (Netlify lowercases, tests may not). */
function headerValue(
  headers: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

/**
 * Plausible client-IP token: IPv4, IPv6, IPv4-mapped, and optional zone-id
 * characters only, bounded length. Anything else is treated as untrusted.
 */
const CLIENT_IP_TOKEN = /^[0-9a-fA-F:.%]{3,64}$/;

/**
 * Best-effort client IP for throttling. Never used as an identity proof.
 *
 * Trust order: only the platform-set `x-nf-client-connection-ip` (written by
 * the Netlify edge, not forwardable by the caller). `x-forwarded-for` is
 * deliberately NOT trusted — Netlify preserves caller-supplied XFF entries,
 * so the left-most value is attacker-controlled and trusting it would hand
 * bots unlimited fresh rate-limit buckets. Requests without a trustworthy
 * platform IP — including spoofed or malformed headers — share the single
 * conservative 'unknown' bucket, so spoofing cannot evade throttling.
 */
export function extractClientIp(headers: Record<string, string | undefined>): string {
  const nfIp = headerValue(headers, 'x-nf-client-connection-ip')?.trim() ?? '';
  if (nfIp && nfIp.length <= 64 && CLIENT_IP_TOKEN.test(nfIp)) return nfIp;
  return 'unknown';
}

/** @internal Isolate tests from module-level rate-limit state. */
export function _resetIntakeRateLimitsForTests(): void {
  ipHourlyBuckets.clear();
  ipDailyBuckets.clear();
  dedupTokenCache.clear();
  globalIntakeHourly.count = 0;
  globalIntakeHourly.resetAt = 0;
}

interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

function getSupabaseConfig(env: NodeJS.ProcessEnv = process.env): SupabaseConfig {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SERVICE_ROLE_KEY ||
    env.SB_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Server-side Supabase configuration is missing for lead persistence');
  }

  return { supabaseUrl, supabaseKey };
}

interface LeadIntentPayload {
  email?: string;
  userId?: string;
  intentType: string;
  intentData?: Record<string, any>;
  tier?: string;
  persona?: string;
  source?: string;
}

interface LeadLifecyclePayload {
  email: string;
  userId?: string;
  newState: string;
  tierInterest?: string;
  persona?: string;
  metadata?: Record<string, any>;
}

/**
 * Validated lead intake submission. Every string is trimmed and within its
 * max length; email is normalized to lowercase; metadata is size-bounded and
 * facility keys are stripped unless the submitter opted into a pilot request.
 */
export interface ValidatedLeadIntakeSubmission {
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  team_size: string | null;
  industry: string | null;
  message: string | null;
  source_route: string;
  channel: string | null;
  segment: string;
  campaign_id: string;
  metadata: Record<string, unknown>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Strip facility-level keys and honeypot fields from submission metadata
 * unless the submitter opted into a pilot request. Mirrors the client-side
 * minimization in src/lib/leadIntake.ts (defense in depth).
 */
function sanitizeIntakeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const pilotRequest = raw.pilot_request === true;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'website' || key === 'company_url') continue;
    if (key === 'pilot_request') {
      if (pilotRequest) out[key] = true;
      continue;
    }
    if (!pilotRequest && isFacilityMetadataKey(key)) continue;
    if (Object.prototype.hasOwnProperty.call(LEAD_METADATA_STRING_LIMITS, key) && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed.slice(0, LEAD_METADATA_STRING_LIMITS[key]);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(LEAD_METADATA_NUMBER_MAXIMUMS, key) && typeof value === 'number' && Number.isFinite(value)) {
      if (value < 0 || value > LEAD_METADATA_NUMBER_MAXIMUMS[key]) continue;
      if (key === 'compliance_year' && (!Number.isInteger(value) || value < 2000)) continue;
      out[key] = value;
    }
  }
  return out;
}

export type LeadIntakeValidationResult =
  | { ok: true; submission: ValidatedLeadIntakeSubmission }
  | { ok: false };

/**
 * Strict schema validation for the intake payload.
 *
 * Unknown top-level fields are DROPPED rather than rejected: the form and the
 * function deploy independently, so a newer client sending a field this build
 * does not know yet should not hard-fail. Nothing unvalidated is ever passed
 * through — the returned object contains ONLY allowlisted, type-checked,
 * length-bounded values.
 */
export function validateLeadIntakeSubmission(raw: unknown): LeadIntakeValidationResult {
  if (!isPlainRecord(raw)) return { ok: false };

  const strings: Record<string, string | null> = {};
  for (const [key, maxLength] of Object.entries(INTAKE_STRING_LIMITS)) {
    const value = raw[key];
    if (value === undefined || value === null) {
      strings[key] = null;
      continue;
    }
    if (typeof value !== 'string') return { ok: false };
    const trimmed = value.trim();
    if (trimmed.length > maxLength) return { ok: false };
    strings[key] = trimmed.length > 0 ? trimmed : null;
  }

  for (const key of REQUIRED_INTAKE_FIELDS) {
    if (!strings[key]) return { ok: false };
  }

  const email = (strings.email ?? '').toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false };

  let metadata: Record<string, unknown> = {};
  const rawMetadata = raw.metadata;
  if (rawMetadata !== undefined && rawMetadata !== null) {
    if (!isPlainRecord(rawMetadata)) return { ok: false };
    let serialized: string;
    try {
      serialized = JSON.stringify(rawMetadata);
    } catch {
      return { ok: false };
    }
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_INTAKE_METADATA_BYTES) {
      return { ok: false };
    }
    metadata = sanitizeIntakeMetadata(rawMetadata);
  }

  return {
    ok: true,
    submission: {
      company_name: strings.company_name,
      contact_name: strings.contact_name!,
      email,
      phone: strings.phone,
      team_size: strings.team_size,
      industry: strings.industry,
      message: strings.message,
      source_route: strings.source_route!,
      channel: strings.channel,
      segment: strings.segment!,
      campaign_id: strings.campaign_id!,
      metadata,
    },
  };
}

/**
 * Deterministic dedup key: normalized (email + intent + UTC day bucket).
 * "Intent" is the acquisition intent triple — segment, campaign, source route —
 * so the same person resubmitting the same form today is a duplicate while a
 * genuinely different campaign contact tomorrow is not.
 */
export function computeLeadIntakeDedupToken(
  submission: Pick<
    ValidatedLeadIntakeSubmission,
    'email' | 'segment' | 'campaign_id' | 'source_route'
  >,
  secret: string,
  now: Date = new Date(),
): string {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Lead intake deduplication secret must be at least 32 bytes');
  }
  const dayBucket = now.toISOString().slice(0, 10);
  const intent = [submission.segment, submission.campaign_id, submission.source_route]
    .map((part) => part.toLowerCase())
    .join('|');
  return createHmac('sha256', secret)
    .update(`${submission.email.toLowerCase()}|${intent}|${dayBucket}`)
    .digest('hex');
}

function intakeIsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.LEAD_INTAKE_ENABLED === 'true' && env.LEAD_INTAKE_NOTICE_APPROVED === 'true';
}

function getDedupSecret(env: NodeJS.ProcessEnv): string | null {
  const secret = env.LEAD_INTAKE_DEDUP_SECRET;
  return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
}

/** Returns true when any honeypot field carries a non-empty value. */
export function hasHoneypotValue(raw: unknown): boolean {
  if (!isPlainRecord(raw)) return false;
  return HONEYPOT_FIELDS.some((field) => {
    const value = raw[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

function clamp(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Determine lifecycle state based on intent type
 */
function determineLifecycleState(intentType: string, currentState?: string): string {
  const stateMap: Record<string, string> = {
    'pricing_view': 'visitor',
    'pricing_cta_click': 'engaged',
    'email_captured': 'captured',
    'checkout_initiated': 'checkout_initiated',
    'checkout_abandoned': 'checkout_abandoned',
    'checkout_complete': 'converted',
    'municipal_inquiry': 'engaged',
    'indigenous_inquiry': 'engaged',
    'industrial_inquiry': 'engaged',
    'upgrade_prompt_clicked': 'engaged'
  };

  return stateMap[intentType] || currentState || 'anonymous';
}

/**
 * Store lead intent in Supabase
 */
async function storeLeadIntent(payload: LeadIntentPayload): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/lead_intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      user_id: payload.userId || null,
      email: payload.email || null,
      intent_type: payload.intentType,
      intent_data: payload.intentData || {},
      tier: payload.tier || null,
      persona: payload.persona || null,
      source: payload.source || null
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to store lead intent: ${response.statusText}`);
  }
}

/**
 * Injectable persistence boundary for the intake path so unit tests can stub
 * Supabase without network access.
 */
export interface LeadIntakeDeps {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

/**
 * Outcome of the pre-insert dedup check. `unavailable` means the check could
 * not be trusted (non-OK response, network failure, unreadable body) — the
 * caller must treat that as fail-closed for writes, NOT as "no duplicate".
 */
export type LeadIntakeDedupCheck = 'duplicate' | 'clear' | 'unavailable';

/**
 * Best-effort select-before-insert dedup. NOT ATOMIC: a concurrent identical
 * submission can pass this select before the first insert commits — the
 * partial UNIQUE index on `dedup_token` (migration 20261005001) is the
 * atomic backstop once applied.
 *
 * Returns 'unavailable' whenever the lookup cannot be trusted so the caller
 * can skip the write; an ambiguous check must never be silently promoted to
 * 'clear' (that was the fail-open behavior this replaces).
 */
async function checkRecentLeadIntakeDuplicate(
  submission: ValidatedLeadIntakeSubmission,
  deps: LeadIntakeDeps,
): Promise<LeadIntakeDedupCheck> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const env = deps.env ?? process.env;
  const now = (deps.now ?? (() => new Date()))();
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);

  const since = new Date(now.getTime() - INTAKE_DEDUP_WINDOW_MS).toISOString();
  const url = new URL(`${supabaseUrl}/rest/v1/lead_intake_submissions`);
  url.searchParams.set('select', 'id');
  url.searchParams.set('email', `eq.${submission.email}`);
  url.searchParams.set('source_route', `eq.${submission.source_route}`);
  url.searchParams.set('campaign_id', `eq.${submission.campaign_id}`);
  url.searchParams.set('segment', `eq.${submission.segment}`);
  url.searchParams.set('created_at', `gte.${since}`);
  url.searchParams.set('limit', '1');

  try {
    const response = await fetchImpl(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    if (!response.ok) return 'unavailable';
    const rows: unknown = await response.json().catch(() => null);
    if (!Array.isArray(rows)) return 'unavailable';
    return rows.length > 0 ? 'duplicate' : 'clear';
  } catch {
    return 'unavailable';
  }
}

async function storeLeadIntakeSubmission(
  submission: ValidatedLeadIntakeSubmission,
  deps: LeadIntakeDeps,
): Promise<void> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const env = deps.env ?? process.env;
  const now = (deps.now ?? (() => new Date()))();
  const { supabaseUrl, supabaseKey } = getSupabaseConfig(env);
  const dedupSecret = getDedupSecret(env);
  if (!dedupSecret) {
    throw new Error('Lead intake is not configured');
  }
  const dedupToken = computeLeadIntakeDedupToken(submission, dedupSecret, now);

  const response = await fetchImpl(`${supabaseUrl}/rest/v1/lead_intake_submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      company_name: clamp(submission.company_name, 200),
      contact_name: clamp(submission.contact_name, 200),
      email: clamp(submission.email, 320),
      phone: clamp(submission.phone, 64),
      team_size: clamp(submission.team_size, 32),
      industry: clamp(submission.industry, 64),
      message: clamp(submission.message, 2000),
      source_route: clamp(submission.source_route, 100),
      channel: clamp(submission.channel, 32),
      segment: clamp(submission.segment, 100),
      campaign_id: clamp(submission.campaign_id, 100),
      // dedup_token column exists via supabase/migrations/20261005001 — the
      // partial UNIQUE index makes same-day resubmission idempotent; the
      // metadata copy stays for backward-compat reads.
      dedup_token: dedupToken,
      metadata: { ...submission.metadata, dedup_token: dedupToken }
    })
  });

  if (!response.ok) {
    // The partial UNIQUE index on dedup_token closes the concurrent insert
    // race. Treat its duplicate conflict — PostgREST 409, or SQLSTATE 23505
    // surfaced under a different status — as the same generic idempotent
    // success returned by the in-memory cache and pre-insert lookup.
    if (response.status === 409) return;
    try {
      const errPayload: unknown = await response.json().catch(() => null);
      if (isPlainRecord(errPayload) && errPayload.code === '23505') return;
    } catch {
      // Unreadable error body — fall through to the generic failure below.
    }
    // Any other insert failure fails closed for writes: we never claim
    // success for a row we did not persist (generic 500 to the caller).
    throw new Error(`Failed to store lead intake submission: ${response.statusText}`);
  }
}

/**
 * Update lead lifecycle state
 */
async function updateLeadLifecycle(payload: LeadLifecyclePayload): Promise<void> {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  // First, try to get existing lifecycle record
  const getResponse = await fetch(
    `${supabaseUrl}/rest/v1/lead_lifecycle?email=eq.${encodeURIComponent(payload.email)}&select=*`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  const existing = await getResponse.json();
  const existingRecord = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;

  if (existingRecord) {
    // Update existing record
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/lead_lifecycle?email=eq.${encodeURIComponent(payload.email)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: payload.userId || existingRecord.user_id,
          previous_state: existingRecord.current_state,
          current_state: payload.newState,
          tier_interest: payload.tierInterest || existingRecord.tier_interest,
          persona: payload.persona || existingRecord.persona,
          last_intent_at: new Date().toISOString(),
          state_changed_at: new Date().toISOString(),
          metadata: { ...existingRecord.metadata, ...payload.metadata }
        })
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Failed to update lead lifecycle: ${updateResponse.statusText}`);
    }
  } else {
    // Create new record
    const createResponse = await fetch(`${supabaseUrl}/rest/v1/lead_lifecycle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: payload.userId || null,
        email: payload.email,
        current_state: payload.newState,
        previous_state: 'anonymous',
        tier_interest: payload.tierInterest || null,
        persona: payload.persona || null,
        last_intent_at: new Date().toISOString(),
        metadata: payload.metadata || {}
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create lead lifecycle: ${createResponse.statusText}`);
    }
  }
}

function jsonResponse(
  statusCode: number,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
): HandlerResponse {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

const GENERIC_INTAKE_SUCCESS = { success: true, message: 'Lead intake stored' };
const GENERIC_INTAKE_INVALID = { error: 'Invalid lead intake submission' };

/**
 * Full request pipeline for this function, exported so unit tests can drive
 * it with a stubbed persistence boundary (LeadIntakeDeps.fetchImpl).
 *
 * Order of abuse controls on the intake path (all before any DB write):
 *   body-size bound -> parse -> per-IP + global throttle -> honeypot ->
 *   schema validation -> dedup -> insert.
 * Size must precede parse; parse must precede action dispatch, so the
 * throttle runs right after dispatch on the intake branch.
 */
export async function handleLeadsRequest(
  event: HandlerEvent,
  deps: LeadIntakeDeps = {},
): Promise<HandlerResponse> {
  const headers = corsHeaders(headerValue(event.headers, 'origin'));

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  // Body-size bound BEFORE parsing: honor Content-Length when present AND
  // measure the actual body (a lying or absent Content-Length cannot bypass
  // the measured check).
  const contentLengthHeader = headerValue(event.headers, 'content-length');
  if (contentLengthHeader) {
    const declared = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declared) && declared > MAX_INTAKE_BODY_BYTES) {
      return jsonResponse(413, headers, { error: 'Request body too large' });
    }
  }

  const rawBody = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64')
    : Buffer.from(event.body ?? '', 'utf8');
  if (rawBody.byteLength > MAX_INTAKE_BODY_BYTES) {
    return jsonResponse(413, headers, { error: 'Request body too large' });
  }

  try {
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rawBody.toString('utf8') || '{}');
      body = isPlainRecord(parsed) ? parsed : {};
    } catch {
      return jsonResponse(400, headers, { error: 'Invalid request body' });
    }

    const action = typeof body.action === 'string' ? body.action : 'capture';

    if (action === 'intake') {
      const intakeEnv = deps.env ?? process.env;
      const dedupSecret = getDedupSecret(intakeEnv);
      if (!intakeIsEnabled(intakeEnv) || !dedupSecret) {
        return jsonResponse(503, headers, { error: 'Lead intake is temporarily unavailable' });
      }

      const now = (deps.now ?? (() => new Date()))();
      const nowMs = now.getTime();

      // Per-IP token bucket (per-instance best-effort — see header note).
      const clientIp = extractClientIp(event.headers);
      if (!allowIntakeRequest(clientIp, nowMs)) {
        return jsonResponse(429, headers, { error: 'Too many requests' });
      }

      const rawSubmission = body.submission;

      // Honeypot: a filled trap field means a bot — report generic success,
      // skip persistence entirely.
      if (hasHoneypotValue(rawSubmission) || hasHoneypotValue(body)) {
        return jsonResponse(200, headers, GENERIC_INTAKE_SUCCESS);
      }

      const validation = validateLeadIntakeSubmission(rawSubmission);
      if (!validation.ok) {
        return jsonResponse(400, headers, GENERIC_INTAKE_INVALID);
      }
      const submission = validation.submission;

      // Dedup: in-memory token fast path, then select-before-insert.
      const dedupToken = computeLeadIntakeDedupToken(submission, dedupSecret, now);
      sweepDedupCache(nowMs);
      const cachedExpiry = dedupTokenCache.get(dedupToken);
      if (cachedExpiry !== undefined && cachedExpiry > nowMs) {
        return jsonResponse(200, headers, GENERIC_INTAKE_SUCCESS);
      }

      const dedupCheck = await checkRecentLeadIntakeDuplicate(submission, deps);
      if (dedupCheck !== 'clear') {
        // Confirmed duplicates get cached so the repeat is served in-memory.
        // 'unavailable' is deliberately NOT cached: nothing was written, so
        // caching would suppress a legitimate retry after the outage clears.
        if (dedupCheck === 'duplicate') {
          dedupTokenCache.set(dedupToken, nowMs + INTAKE_DEDUP_WINDOW_MS);
        }
        // FAIL CLOSED for writes on an untrusted dedup check — the response
        // stays byte-identical to a real acceptance so the outage is not a
        // usable oracle (see header note for the acknowledged-loss tradeoff).
        return jsonResponse(200, headers, GENERIC_INTAKE_SUCCESS);
      }

      await storeLeadIntakeSubmission(submission, deps);
      dedupTokenCache.set(dedupToken, nowMs + INTAKE_DEDUP_WINDOW_MS);

      return jsonResponse(200, headers, GENERIC_INTAKE_SUCCESS);
    }

    if (action === 'intent') {
      // Track lead intent
      const intentPayload: LeadIntentPayload = {
        email: body.email as string | undefined,
        userId: body.userId as string | undefined,
        intentType: body.intentType as string,
        intentData: body.intentData as Record<string, any> | undefined,
        tier: body.tier as string | undefined,
        persona: body.persona as string | undefined,
        source: body.source as string | undefined
      };

      await storeLeadIntent(intentPayload);

      // Update lifecycle state if email is present
      if (intentPayload.email) {
        const newState = determineLifecycleState(intentPayload.intentType);
        await updateLeadLifecycle({
          email: intentPayload.email,
          userId: intentPayload.userId,
          newState,
          tierInterest: intentPayload.tier,
          persona: intentPayload.persona,
          metadata: { last_intent_type: intentPayload.intentType }
        });
      }

      return jsonResponse(200, headers, { success: true, message: 'Intent tracked' });
    }

    if (action === 'lifecycle') {
      return jsonResponse(403, headers, {
        error: 'Lifecycle updates are restricted to internal workflow jobs'
      });
    }

    // Legacy email capture endpoint
    if (action === 'capture') {
      const email = body.email as string | undefined;
      const planId = body.planId as string | undefined;

      if (!email) {
        return jsonResponse(400, headers, { error: 'Email is required' });
      }

      // Track as email captured intent
      await storeLeadIntent({
        email,
        intentType: 'email_captured',
        intentData: { plan_id: planId },
        source: (body.source as string | undefined) || 'email_capture_modal'
      });

      // Update lifecycle to captured state
      await updateLeadLifecycle({
        email,
        newState: 'captured',
        tierInterest: planId,
        metadata: { captured_at: new Date().toISOString() }
      });

      return jsonResponse(200, headers, { success: true, message: 'Email captured' });
    }

    return jsonResponse(400, headers, { error: 'Unknown action' });

  } catch (error) {
    console.error('[Leads] Error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
}

export const handler = async (event: HandlerEvent, _context: unknown): Promise<HandlerResponse> => {
  return handleLeadsRequest(event);
};
