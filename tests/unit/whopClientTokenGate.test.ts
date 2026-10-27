/**
 * @vitest-environment jsdom
 *
 * Client token-gate contract tests (Codex audit pass 6).
 *
 * `verifyWhopToken` is a SHAPE GATE ONLY: it decides whether a credential
 * is well-formed enough to hand to `whopClient.loginFromToken()` →
 * `POST /api/auth/login` → server-side `verifyWhopSessionToken()`. It must
 * never call the Whop API from the browser (`/v5/me` is NOT a documented
 * client verification target) and must never return a tier — a
 * client-derived tier cannot be trusted and reintroduces the
 * unrelated-product membership defect removed server-side.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('../../src/lib/pricingCatalog', () => ({
  CEIP_PRICING: {
    direct: { free: 0, consumer_watchdog: 9, professional: 149, industrial_tier: 1500, municipal: 5900, sovereign: 2500 },
    whop: { whop_basic: 29, whop_pro: 99, whop_team: 299 },
    currency: 'USD',
  },
}));

const repoRoot = path.resolve(__dirname, '../..');
const readSource = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

/** Import src/lib/whop fresh with the given mode envs applied. */
async function importWhop(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import('../../src/lib/whop');
}

describe('verifyWhopToken — client shape gate (no trust, no client Whop API)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects empty and blank tokens', async () => {
    const { verifyWhopToken } = await importWhop({ VITE_WHOP_MODE: 'simulated' });
    expect((await verifyWhopToken('')).valid).toBe(false);
    expect((await verifyWhopToken('   ')).valid).toBe(false);
  });

  it('rejects everything in standalone mode', async () => {
    const { verifyWhopToken } = await importWhop({ VITE_WHOP_MODE: 'standalone' });
    const result = await verifyWhopToken('any.token.here');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/standalone/i);
  });

  it('live mode: accepts a non-empty credential WITHOUT any network call and returns no tier', async () => {
    const fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchSpy);
    const { verifyWhopToken } = await importWhop({
      VITE_WHOP_MODE: 'live',
      VITE_WHOP_CLIENT_ID: 'test-client-id',
    });

    const result = await verifyWhopToken('opaque-whop-user-token');

    // Shape gate only: well-formed credential is handed to the server
    // login path for real verification — the client calls NO Whop API.
    expect(result).toEqual({ valid: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect('tier' in result).toBe(false);
  });

  it('simulated mode: decodes the dev mock token but never returns a tier', async () => {
    const fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchSpy);
    const { verifyWhopToken } = await importWhop({ VITE_WHOP_MODE: 'simulated' });

    // A forged payload claiming a paid tier — the decoded tier must be
    // dropped; only display metadata (sub/email) survives.
    const payload = Buffer.from(
      JSON.stringify({ sub: 'attacker', email: 'a@b.c', tier: 'team' }),
    ).toString('base64');
    const result = await verifyWhopToken(`header.${payload}.signature`);

    expect(result.valid).toBe(true);
    expect(result.userId).toBe('attacker');
    expect(result.email).toBe('a@b.c');
    expect('tier' in result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('simulated mode: rejects a malformed token without calling fetch', async () => {
    const fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchSpy);
    const { verifyWhopToken } = await importWhop({ VITE_WHOP_MODE: 'simulated' });

    const result = await verifyWhopToken('not-a-jwt');
    expect(result.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('whop client surfaces — source contract', () => {
  const whopLib = readSource('src/lib/whop.ts');
  const experiencePage = readSource('src/components/WhopExperiencePage.tsx');

  it('src/lib/whop.ts contains no client-side Whop API call', () => {
    // /v5/me is NOT a documented client verification target and was removed.
    expect(whopLib).not.toContain('v5/me');
    expect(whopLib).not.toContain('api.whop.com');
    // Client-side product→tier mapping was removed with it.
    expect(whopLib).not.toContain('mapWhopProductToTier');
  });

  it('WhopExperiencePage scrubs credential params from the address bar', () => {
    // Token params must be dropped via history.replaceState once captured
    // (same pattern as the whop-mini app) so they cannot linger in history.
    expect(experiencePage).toContain('history.replaceState');
    for (const param of ['whop_token', 'token']) {
      expect(experiencePage).toContain(`'${param}'`);
    }
    expect(experiencePage).toContain('params.delete(key)');
    // And it performs no client-side Whop API call either.
    expect(experiencePage).not.toContain('api.whop.com');
  });

  it('no file under src/ calls the unconfirmed /v5/me endpoint', () => {
    for (const rel of ['src/lib/whop.ts', 'src/components/WhopExperiencePage.tsx']) {
      expect(readSource(rel)).not.toContain('v5/me');
    }
  });
});
