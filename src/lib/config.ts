// Centralized configuration and feature flags for streaming

// Vite exposes env vars on import.meta.env
const env = (import.meta as any).env || {};

let warnedMissingSupabase = false;

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    // Don't throw here; callers may choose fallback. Log for visibility, but only once.
    if (!warnedMissingSupabase) {
      console.warn('Supabase config missing: ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      warnedMissingSupabase = true;
    }
  }
  return { url: url || '', anonKey: anonKey || '' };
}

export function getEdgeBaseUrl(): string {
  const { url } = getSupabaseConfig();
  const override = (env.VITE_SUPABASE_EDGE_BASE as string | undefined) || '';
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
  return headers;
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
