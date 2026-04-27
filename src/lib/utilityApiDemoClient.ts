import { getEdgeBaseUrl, getSupabaseConfig, isEdgeFetchEnabled } from './config';
import { supabase } from './supabaseClient';
import type { UtilityApiDemoEdgePayload, UtilityApiDemoScenario } from './utilityApiDemo';

async function buildUtilityApiDemoHeaders(): Promise<Record<string, string>> {
  const { anonKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (anonKey) {
    headers.apikey = anonKey;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token?.trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function postDemoAction(body: Record<string, unknown>): Promise<UtilityApiDemoEdgePayload> {
  if (!isEdgeFetchEnabled()) {
    return {
      error: 'Supabase Edge fetch disabled via configuration (VITE_ENABLE_EDGE_FETCH=false).',
    };
  }

  const base = getEdgeBaseUrl();
  if (!base) {
    return {
      error: 'Supabase Edge base URL is not configured for UtilityAPI demo actions.',
    };
  }

  const response = await fetch(`${base}/utilityapi-demo`, {
    method: 'POST',
    headers: await buildUtilityApiDemoHeaders(),
    body: JSON.stringify(body ?? {}),
  });

  let payload: UtilityApiDemoEdgePayload = {};
  try {
    payload = await response.json() as UtilityApiDemoEdgePayload;
  } catch {
    payload = {};
  }

  const retryAfterHeader = Number(response.headers.get('Retry-After') ?? '0');
  const rateLimitLimit = Number(response.headers.get('X-RateLimit-Limit') ?? '0');
  const rateLimitRemaining = Number(response.headers.get('X-RateLimit-Remaining') ?? '0');
  const rateLimitReset = Number(response.headers.get('X-RateLimit-Reset') ?? '0');

  const nextPayload: UtilityApiDemoEdgePayload = {
    ...payload,
    retry_after_seconds: payload.retry_after_seconds ?? (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : undefined),
    rate_limit_limit: Number.isFinite(rateLimitLimit) && rateLimitLimit > 0 ? rateLimitLimit : undefined,
    rate_limit_remaining: Number.isFinite(rateLimitRemaining) ? rateLimitRemaining : undefined,
    rate_limit_reset: Number.isFinite(rateLimitReset) && rateLimitReset > 0 ? rateLimitReset : undefined,
  };

  if (!response.ok && !nextPayload.error) {
    return {
      ...nextPayload,
      error: `UtilityAPI demo action failed: ${response.status} ${response.statusText}.`,
    };
  }

  return nextPayload;
}

export function startUtilityApiDemo(scenario: UtilityApiDemoScenario = 'commercial') {
  return postDemoAction({
    action: 'start_demo',
    scenario,
  });
}

export function pollUtilityApiDemo(params: { referral?: string | null; authorizationUid?: string | null }) {
  return postDemoAction({
    action: 'poll_demo',
    referral: params.referral ?? undefined,
    authorization_uid: params.authorizationUid ?? undefined,
  });
}

export function activateUtilityApiDemo(params: { authorizationUid: string; meterUids: string[] }) {
  return postDemoAction({
    action: 'activate_demo',
    authorization_uid: params.authorizationUid,
    meter_uids: params.meterUids,
  });
}

export function syncUtilityApiDemo(params: { authorizationUid: string }) {
  return postDemoAction({
    action: 'sync_demo',
    authorization_uid: params.authorizationUid,
  });
}

export function revokeUtilityApiDemo(params: { authorizationUid: string }) {
  return postDemoAction({
    action: 'revoke_demo',
    authorization_uid: params.authorizationUid,
  });
}
