import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/config', () => ({
  isEdgeFetchEnabled: () => true,
  getEdgeBaseUrl: () => 'https://edge.test',
  getEdgeHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

import { fetchEdgeJson, fetchEdgePostJson, fetchEdgeWithParams } from '../../src/lib/edge';

const abortErr = () => {
  const e: any = new Error('Aborted');
  e.name = 'AbortError';
  return e;
};

/** Fetch stub that behaves like a real fetch under abort: pending until the signal fires. */
const pendingFetch = () =>
  vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(abortErr()));
    }),
  );

const okResponse = (json: any = { ok: true }) =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => json }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('edge fetch — caller abort', () => {
  it('rejects immediately when the caller signal is already aborted and never fetches', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    caller.abort();
    await expect(fetchEdgeJson(['a'], { signal: caller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates a mid-flight caller abort', async () => {
    const fetchMock = pendingFetch();
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    const promise = fetchEdgePostJson(['a'], { x: 1 }, { signal: caller.signal });
    caller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('forwards the caller abort reason into the composed signal', async () => {
    let seenReason: unknown;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          seenReason = init?.signal?.reason;
          reject(abortErr());
        });
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    const promise = fetchEdgeJson(['a'], { signal: caller.signal });
    caller.abort('cancelled-by-user');
    await expect(promise).rejects.toBeTruthy();
    expect(seenReason).toBe('cancelled-by-user');
  });

  it('a late caller abort after successful completion is a no-op', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const caller = new AbortController();
    const res = await fetchEdgeJson(['a'], { signal: caller.signal });
    expect(res.json).toEqual({ ok: true });
    caller.abort(); // must not throw or poison anything
  });
});

describe('edge fetch — timeout', () => {
  it('aborts a hanging request after timeoutMs', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    await expect(fetchEdgeJson(['a'], { timeoutMs: 20 })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('timeout on POST aborts identically', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    await expect(fetchEdgePostJson(['a'], {}, { timeoutMs: 20 })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('fetchEdgeWithParams aborts on timeout', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    await expect(fetchEdgeWithParams(['a'], { q: '1' }, { timeoutMs: 20 })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('edge fetch — candidate fallback', () => {
  it('an ordinary fetch failure falls through to the next candidate', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(okResponse({ from: 'second' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await fetchEdgeJson(['first', 'second']);
    expect(res.json).toEqual({ from: 'second' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('non-OK responses fall through; all-failed rejects with the last error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, statusText: 'ISE' }) as unknown as Response),
    );
    await expect(fetchEdgeJson(['a', 'b'])).rejects.toThrow('500');
  });
});
