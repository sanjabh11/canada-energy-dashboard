import { getEdgeBaseUrl, getEdgeHeaders, isEdgeFetchEnabled } from './config';

export interface EdgeFetchOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isAbortError(err: any): boolean {
  return (
    !!err &&
    (err.name === 'AbortError' || (typeof err.message === 'string' && /aborted/i.test(err.message)))
  );
}

function createAbortError(): any {
  try {
    // Browser environments
    return new DOMException('Aborted', 'AbortError');
  } catch (_) {
    // Fallback
    const e: any = new Error('Aborted');
    e.name = 'AbortError';
    return e;
  }
}

export async function fetchEdgeJson(
  pathCandidates: string[],
  options: EdgeFetchOptions = {},
): Promise<{ json: any; response: Response }> {
  if (!isEdgeFetchEnabled()) {
    throw new Error(
      'Supabase Edge fetch disabled via configuration (VITE_ENABLE_EDGE_FETCH=false)',
    );
  }
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error(
      'Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.',
    );
  }
  let lastError: any = null;

  // Timeout + caller cancellation are composed so neither bypasses the other.
  const { signal, cleanup } = composeTimeoutSignal(options);
  if (signal.aborted) {
    cleanup();
    throw createAbortError();
  }

  try {
    for (const path of pathCandidates) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      const url = `${base}/${path}`;
      try {
        const resp = await fetch(url, { headers, signal });
        if (!resp.ok) {
          lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
          continue;
        }
        const json = await resp.json();
        return { json, response: resp };
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          throw err as any;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All edge endpoint candidates failed');
  } finally {
    cleanup();
  }
}

/**
 * Compose the request timeout with a caller-supplied AbortSignal. A caller
 * signal must not bypass the timeout, and the timeout must not swallow a
 * caller abort — both sources abort one shared controller signal, and the
 * caller's abort `reason` is forwarded so cancellation semantics survive.
 * `timeoutMs` 0/undefined resolves to the 15s default (a finite bound is
 * mandatory); use a large explicit value only if a longer budget is needed.
 */
function composeTimeoutSignal(options: EdgeFetchOptions): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  // 0/undefined → 15s default (a finite bound is mandatory). Non-finite or
  // negative values must not collapse to an instant abort — setTimeout clamps
  // them to ~1ms, silently inverting "no timeout" into "immediate cancel".
  const timeoutMs =
    typeof options.timeoutMs === 'number' &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const caller = options.signal;
  const onCallerAbort = () => controller.abort(caller?.reason);
  if (caller) {
    if (caller.aborted) {
      controller.abort(caller.reason);
    } else {
      caller.addEventListener('abort', onCallerAbort, { once: true });
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      caller?.removeEventListener('abort', onCallerAbort);
    },
  };
}

export async function fetchEdgePostJson(
  pathCandidates: string[],
  body: any,
  options: EdgeFetchOptions = {},
): Promise<{ json: any; response: Response }> {
  if (!isEdgeFetchEnabled()) {
    throw new Error(
      'Supabase Edge fetch disabled via configuration (VITE_ENABLE_EDGE_FETCH=false)',
    );
  }
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error(
      'Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.',
    );
  }
  let lastError: any = null;

  const { signal, cleanup } = composeTimeoutSignal(options);
  if (signal.aborted) {
    cleanup();
    throw createAbortError();
  }

  try {
    for (const path of pathCandidates) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      const url = `${base}/${path}`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body ?? {}),
          signal,
        });
        if (!resp.ok) {
          lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
          continue;
        }
        const json = await resp.json();
        return { json, response: resp };
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          throw err as any;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All edge endpoint candidates failed');
  } finally {
    cleanup();
  }
}

export async function fetchEdgeWithParams(
  pathCandidates: string[],
  params: Record<string, string>,
  options: EdgeFetchOptions = {},
): Promise<Response> {
  if (!isEdgeFetchEnabled()) {
    throw new Error(
      'Supabase Edge fetch disabled via configuration (VITE_ENABLE_EDGE_FETCH=false)',
    );
  }
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error(
      'Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.',
    );
  }
  let lastError: any = null;

  const { signal, cleanup } = composeTimeoutSignal(options);
  if (signal.aborted) {
    cleanup();
    throw createAbortError();
  }

  try {
    for (const path of pathCandidates) {
      if (signal.aborted) {
        throw createAbortError();
      }
      const urlObj = new URL(`${base}/${path}`);
      Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
      try {
        const resp = await fetch(urlObj.toString(), { headers, signal });
        if (!resp.ok) {
          lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
          continue;
        }
        return resp;
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          throw err as any;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('All edge endpoint candidates failed');
  } finally {
    cleanup();
  }
}
