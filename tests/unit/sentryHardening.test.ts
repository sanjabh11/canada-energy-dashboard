import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInit = vi.fn();

vi.mock('@sentry/react', () => ({
  init: mockInit,
}));

describe('Sentry hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockInit.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initSentry returns false when no DSN is set', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    expect(initSentry()).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initSentry calls Sentry.init with hardened config when DSN is present', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    expect(initSentry()).toBe(true);
    expect(mockInit).toHaveBeenCalledOnce();
    const config = mockInit.mock.calls[0][0] as Record<string, unknown>;
    expect(config.sendDefaultPii).toBe(false);
    expect(config.tracesSampleRate).toBe(1.0);
    expect(config.ignoreErrors).toBeDefined();
    expect(Array.isArray(config.ignoreErrors)).toBe(true);
    expect(config.beforeSend).toBeDefined();
    expect(typeof config.beforeSend).toBe('function');
    expect(config.beforeBreadcrumb).toBeDefined();
    expect(typeof config.beforeBreadcrumb).toBe('function');
  });

  it('beforeSend scrubs email addresses from event extra', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeSend: (event: Record<string, unknown>) => Record<string, unknown> };
    const event = {
      extra: { user_input: 'Contact me at john@example.com please' },
    };
    const result = config.beforeSend(event as never) as Record<string, unknown>;
    const extra = result.extra as Record<string, string>;
    expect(extra.user_input).toBe('Contact me at [email] please');
  });

  it('beforeSend scrubs phone numbers from request URL', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeSend: (event: Record<string, unknown>) => Record<string, unknown> };
    const event = {
      request: { url: 'https://app.example.com/contact?phone=416-555-1234' },
    };
    const result = config.beforeSend(event as never) as Record<string, unknown>;
    const request = result.request as { url: string };
    expect(request.url).toContain('[phone]');
    expect(request.url).not.toContain('416-555-1234');
  });

  it('beforeSend scrubs PII from request headers', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeSend: (event: Record<string, unknown>) => Record<string, unknown> };
    const event = {
      request: { headers: { 'X-User-Email': 'admin@energy.ca', Authorization: 'Bearer token123' } },
    };
    const result = config.beforeSend(event as never) as Record<string, unknown>;
    const headers = (result.request as Record<string, Record<string, string>>).headers;
    expect(headers['X-User-Email']).toBe('[email]');
    expect(headers.Authorization).toBe('Bearer token123');
  });

  it('beforeSend preserves non-string values in extra', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeSend: (event: Record<string, unknown>) => Record<string, unknown> };
    const event = {
      extra: { count: 42, flag: true, nested: { email: 'test@test.com' } },
    };
    const result = config.beforeSend(event as never) as Record<string, unknown>;
    const extra = result.extra as Record<string, unknown>;
    expect(extra.count).toBe(42);
    expect(extra.flag).toBe(true);
  });

  it('beforeBreadcrumb scrubs PII from ui.click category', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeBreadcrumb: (crumb: Record<string, unknown>) => Record<string, unknown> };
    const crumb = { category: 'ui.click', message: 'Clicked button by user@energy.ca' };
    const result = config.beforeBreadcrumb(crumb as never) as Record<string, unknown>;
    expect(result.message).toBe('Clicked button by [email]');
  });

  it('beforeBreadcrumb passes through non-ui breadcrumbs unchanged', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { beforeBreadcrumb: (crumb: Record<string, unknown>) => Record<string, unknown> };
    const crumb = { category: 'fetch', message: 'GET /api/data' };
    const result = config.beforeBreadcrumb(crumb as never) as Record<string, unknown>;
    expect(result.message).toBe('GET /api/data');
  });

  it('ignoreErrors does not suppress all network failures globally', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { initSentry } = await import('../../src/instrumentation/sentry');
    initSentry();
    const config = mockInit.mock.calls[0][0] as { ignoreErrors: string[] };
    // Should not contain a blanket 'Network request failed' that would suppress real API outages
    expect(config.ignoreErrors).not.toContain('Network request failed');
  });
});
