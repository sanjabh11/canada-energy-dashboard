// Centralized configuration and feature flags for streaming

// Vite exposes env vars on import.meta.env
import { debug } from '@/lib/debug';

const env = import.meta.env;
const DEBUG = env.DEV;

let warnedMissingSupabase = false;

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (DEBUG) debug.log('getSupabaseConfig - VITE_SUPABASE_URL:', url, 'VITE_SUPABASE_ANON_KEY loaded:', !!anonKey);
  if (!url || !anonKey) {
    // Don't throw here; callers may choose fallback. Log for visibility, but only once.
    if (!warnedMissingSupabase) {
      debug.warn('Supabase config missing: ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      warnedMissingSupabase = true;
    }
  }
  return { url: url || '', anonKey: anonKey || '' };
}

export function getEdgeBaseUrl(): string {
  const { url } = getSupabaseConfig();
  const override = (env.VITE_SUPABASE_EDGE_BASE as string | undefined) || '';
  if (DEBUG) debug.log('getEdgeBaseUrl - override:', override, 'url:', url, 'final base:', override || `${url}/functions/v1`);
  if (override) return override; // explicit override
  if (!url) return '';
  // If user provided the functions subdomain directly, use as-is
  if (/\.functions\.supabase\.co\b/.test(url)) return url;
  // Default legacy path on main domain
  return `${url}/functions/v1`;
}

export function getEdgeHeaders(): Record<string, string> {
  const { anonKey } = getSupabaseConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (anonKey) {
    headers['Authorization'] = `Bearer ${anonKey}`;
    headers['apikey'] = anonKey;
  }
  if (DEBUG) debug.log('getEdgeHeaders - anonKey:', !!anonKey, 'Authorization header sent:', 'Authorization' in headers);
  return headers;
}

export function isEdgeFetchEnabled(): boolean {
  const raw = env.VITE_ENABLE_EDGE_FETCH as string | boolean | undefined;
  
  if (DEBUG) debug.log('isEdgeFetchEnabled - raw value:', raw, 'type:', typeof raw);

  // If explicitly set, honor that setting (works for both localhost and production)
  if (typeof raw === 'boolean') {
    if (DEBUG) debug.log('isEdgeFetchEnabled - returning boolean:', raw);
    return raw;
  }
  if (typeof raw === 'string') {
    const result = raw.toLowerCase() === 'true';
    if (DEBUG) debug.log('isEdgeFetchEnabled - returning string parsed:', result);
    return result;
  }

  // If not explicitly set, disable on localhost to avoid noisy CORS failures during development
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1') {
      if (DEBUG) debug.log('isEdgeFetchEnabled - localhost detected, no explicit setting, returning false');
      return false;
    }
  }

  // For production deployments without explicit setting, enable if Supabase is configured
  const fallback = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  if (DEBUG) debug.log('isEdgeFetchEnabled - using fallback:', fallback);
  return fallback;
}

export function getFeatureFlagUseStreaming(): boolean {
  const raw = env.VITE_USE_STREAMING_DATASETS as string | boolean | undefined;

  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true';
  return false; // default off unless explicitly enabled
}

// True only if both env is configured and feature flag is enabled
export function isStreamingConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

export function canUseStreaming(): boolean {
  return getFeatureFlagUseStreaming() && isStreamingConfigured();
}
