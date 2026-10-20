import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExportJob } from '../../src/lib/exportJobsClient';
import {
  clearExportApiKey,
  DEFAULT_EXPORT_CREDENTIAL_TTL_MS,
  MAX_EXPORT_CREDENTIAL_TTL_MS,
  setExportApiKeyForSession,
} from '../../src/lib/exportJobsClient';

afterEach(() => {
  clearExportApiKey();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // This suite runs in Vitest's Node environment. Provide the browser storage
  // surface the production module expects without relying on an opaque origin.
  vi.stubGlobal('window', {
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
  });
});

describe('session-only export credentials', () => {
  it('stores credentials in sessionStorage and removes legacy persistent copies', () => {
    localStorage.setItem('ceip_export_api_key', 'synthetic-legacy-canary');
    localStorage.setItem('ceip_api_key', 'synthetic-legacy-canary');

    expect(setExportApiKeyForSession(' synthetic-session-canary ')).toBe(true);

    expect(localStorage.getItem('ceip_export_api_key')).toBeNull();
    expect(localStorage.getItem('ceip_api_key')).toBeNull();
    const record = JSON.parse(sessionStorage.getItem('ceip_export_api_key_session') ?? '{}') as {
      value?: string;
      expiresAt?: number;
    };
    expect(record.value).toBe('synthetic-session-canary');
    expect(record.expiresAt).toBeGreaterThan(Date.now());
    expect(record.expiresAt).toBeLessThanOrEqual(Date.now() + DEFAULT_EXPORT_CREDENTIAL_TTL_MS + 100);
  });

  it('bounds lifetime, rejects empty values, and clears session plus legacy copies', () => {
    const before = Date.now();
    expect(setExportApiKeyForSession('synthetic-bounded-canary', Number.MAX_SAFE_INTEGER)).toBe(true);
    const record = JSON.parse(sessionStorage.getItem('ceip_export_api_key_session') ?? '{}') as { expiresAt?: number };
    expect(record.expiresAt).toBeLessThanOrEqual(before + MAX_EXPORT_CREDENTIAL_TTL_MS + 100);
    expect(setExportApiKeyForSession('   ')).toBe(false);

    localStorage.setItem('ceip_export_api_key', 'synthetic-legacy-canary');
    clearExportApiKey();
    expect(sessionStorage.getItem('ceip_export_api_key_session')).toBeNull();
    expect(localStorage.getItem('ceip_export_api_key')).toBeNull();
  });

  it('removes expired credentials before building an export request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jobId: 'job-1', status: 'queued' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    sessionStorage.setItem('ceip_export_api_key_session', JSON.stringify({
      value: 'synthetic-expired-canary',
      expiresAt: Date.now() - 1,
    }));

    await createExportJob({ template: 'scenario' });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).not.toContain('synthetic-expired-canary');
    expect(headers.apikey).not.toBe('synthetic-expired-canary');
    expect(sessionStorage.getItem('ceip_export_api_key_session')).toBeNull();
  });
});
