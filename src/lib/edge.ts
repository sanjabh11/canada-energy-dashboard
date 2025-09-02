import { getEdgeBaseUrl, getEdgeHeaders } from './config';

export interface EdgeFetchOptions {
  signal?: AbortSignal;
}

function isAbortError(err: any): boolean {
  return !!err && (err.name === 'AbortError' || (typeof err.message === 'string' && /aborted/i.test(err.message)));
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

export async function fetchEdgeJson(pathCandidates: string[], options: EdgeFetchOptions = {}): Promise<{ json: any; response: Response }> {
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error('Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.');
  }
  let lastError: any = null;

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  for (const path of pathCandidates) {
    if (options.signal?.aborted) {
      throw createAbortError();
    }
    const url = `${base}/${path}`;
    try {
      const resp = await fetch(url, { headers, signal: options.signal });
      if (!resp.ok) {
        lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
        continue;
      }
      const json = await resp.json();
      return { json, response: resp };
    } catch (err) {
      if (isAbortError(err)) {
        throw err as any;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All edge endpoint candidates failed');
}

export async function fetchEdgePostJson(
  pathCandidates: string[],
  body: any,
  options: EdgeFetchOptions = {}
): Promise<{ json: any; response: Response }> {
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error('Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.');
  }
  let lastError: any = null;

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  for (const path of pathCandidates) {
    if (options.signal?.aborted) {
      throw createAbortError();
    }
    const url = `${base}/${path}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {}),
        signal: options.signal,
      });
      if (!resp.ok) {
        lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
        continue;
      }
      const json = await resp.json();
      return { json, response: resp };
    } catch (err) {
      if (isAbortError(err)) {
        throw err as any;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All edge endpoint candidates failed');
}

export async function fetchEdgeWithParams(pathCandidates: string[], params: Record<string, string>, options: EdgeFetchOptions = {}): Promise<Response> {
  const base = getEdgeBaseUrl();
  const headers = getEdgeHeaders();
  if (!base) {
    throw new Error('Supabase Edge base URL is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and enable VITE_USE_STREAMING_DATASETS if desired.');
  }
  let lastError: any = null;

  if (options.signal?.aborted) {
    throw createAbortError();
  }

  for (const path of pathCandidates) {
    if (options.signal?.aborted) {
      throw createAbortError();
    }
    const urlObj = new URL(`${base}/${path}`);
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    try {
      const resp = await fetch(urlObj.toString(), { headers, signal: options.signal });
      if (!resp.ok) {
        lastError = new Error(`Request failed: ${resp.status} ${resp.statusText}`);
        continue;
      }
      return resp;
    } catch (err) {
      if (isAbortError(err)) {
        throw err as any;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All edge endpoint candidates failed');
}
