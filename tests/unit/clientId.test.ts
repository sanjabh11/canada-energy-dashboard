import { describe, expect, it } from 'vitest';
import { getClientId, getRateLimitIdentity, hashClientKey, parseClientId } from '../../supabase/functions/_shared/clientId';

const stubReq = (headers: Record<string, string>) =>
  ({ headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } }) as unknown as Request;

const KEY = 'anon-public-key-1234567';

describe('hashClientKey — privacy-safe attribution', () => {
  it('is deterministic and produces a 16-hex fingerprint', () => {
    expect(hashClientKey(KEY)).toBe(hashClientKey(KEY));
    expect(hashClientKey(KEY)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('separates credentials that share a prefix — the old 12-char slice collided', () => {
    const jwtA = 'eyJhbGciOiJIUzI1NiJ9.aaa_signature_a';
    const jwtB = 'eyJhbGciOiJIUzI1NiJ9.bbb_signature_b';
    expect(jwtA.slice(0, 12)).toBe(jwtB.slice(0, 12));
    expect(hashClientKey(jwtA)).not.toBe(hashClientKey(jwtB));
  });
});

describe('getClientId — bucket identity', () => {
  it('combines hashed apikey + ip so the shared anon key cannot collapse all callers into one bucket', () => {
    const a = getClientId(stubReq({ apikey: KEY, 'x-forwarded-for': '1.2.3.4' }));
    const b = getClientId(stubReq({ apikey: KEY, 'x-forwarded-for': '9.9.9.9' }));
    expect(a).toBe(`key-ip:${hashClientKey(KEY)}@1.2.3.4`);
    expect(b).toBe(`key-ip:${hashClientKey(KEY)}@9.9.9.9`);
    expect(a).not.toBe(b);
  });

  it('never embeds raw key material in the composite', () => {
    const id = getClientId(stubReq({ apikey: KEY, 'x-forwarded-for': '1.2.3.4' }));
    expect(id).not.toContain(KEY);
    expect(id).not.toContain(KEY.slice(0, 8));
  });

  it('falls back to ip: when the key is absent or too short', () => {
    expect(getClientId(stubReq({ 'x-real-ip': '5.6.7.8' }))).toBe('ip:5.6.7.8');
    expect(getClientId(stubReq({ apikey: 'short', 'x-real-ip': '5.6.7.8' }))).toBe('ip:5.6.7.8');
  });
});

describe('getClientId — X-Forwarded-For trust', () => {
  it('uses the LAST hop — a gateway-appended hop cannot be forged by injecting earlier hops', () => {
    expect(
      getClientId(stubReq({ 'x-forwarded-for': '  1.1.1.1 , 2.2.2.2 ', apikey: 'k'.repeat(20) })),
    ).toBe(`key-ip:${hashClientKey('k'.repeat(20))}@2.2.2.2`);
  });

  it('first-hop rotation cannot rotate buckets when the real client IP is appended last', () => {
    const a = getClientId(stubReq({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1' }));
    const b = getClientId(stubReq({ 'x-forwarded-for': '7.7.7.7, 10.0.0.1' }));
    expect(a).toBe(b);
    expect(a).toBe('ip:10.0.0.1');
  });

  it('handles malformed, empty and absent forwarding headers with a stable fallback', () => {
    expect(getClientId(stubReq({ 'x-forwarded-for': ' , , ' }))).toBe('ip:unknown');
    expect(getClientId(stubReq({}))).toBe('ip:unknown');
    expect(getClientId(stubReq({ 'x-forwarded-for': '', 'x-real-ip': '3.3.3.3' }))).toBe('ip:3.3.3.3');
  });
});

describe('parseClientId — usage-log attribution', () => {
  it('decodes key-ip composites into both columns', () => {
    expect(parseClientId('key-ip:0123456789abcdef@1.2.3.4')).toEqual({
      apiKey: '0123456789abcdef',
      ipAddress: '1.2.3.4',
    });
  });

  it('decodes legacy key: and ip: formats', () => {
    expect(parseClientId('key:abcdef123456')).toEqual({ apiKey: 'abcdef123456', ipAddress: null });
    expect(parseClientId('ip:5.6.7.8')).toEqual({ apiKey: null, ipAddress: '5.6.7.8' });
  });

  it('never returns the composite string as an ip_address', () => {
    const composite = getClientId(
      stubReq({ apikey: KEY, 'x-forwarded-for': '1.2.3.4' }),
    );
    const { apiKey, ipAddress } = parseClientId(composite);
    expect(ipAddress).not.toContain('key-ip:');
    expect(ipAddress).not.toContain('@');
    expect(apiKey).toBe(hashClientKey(KEY));
  });

  it('round-trips keyless requests', () => {
    const { apiKey, ipAddress } = parseClientId(getClientId(stubReq({ 'x-real-ip': '8.8.8.8' })));
    expect(apiKey).toBeNull();
    expect(ipAddress).toBe('8.8.8.8');
  });
});

describe('getRateLimitIdentity — rotation-proof bucket identity', () => {
  it('bearer/apikey rotation cannot reset the bucket when an IP is observable', () => {
    const a = getRateLimitIdentity(
      stubReq({ authorization: 'Bearer aaa_token_long_enough', 'x-forwarded-for': '1.2.3.4' }),
    );
    const b = getRateLimitIdentity(
      stubReq({ authorization: 'Bearer bbb_token_long_enough', 'x-forwarded-for': '1.2.3.4' }),
    );
    const c = getRateLimitIdentity(stubReq({ apikey: KEY, 'x-forwarded-for': '1.2.3.4' }));
    expect(a).toBe(b);
    expect(c).toBe(b);
    expect(a).toBe('ip:1.2.3.4');
  });

  it('still separates callers on different IPs', () => {
    const a = getRateLimitIdentity(stubReq({ 'x-forwarded-for': '1.2.3.4' }));
    const b = getRateLimitIdentity(stubReq({ 'x-forwarded-for': '9.9.9.9' }));
    expect(a).not.toBe(b);
  });

  it('uses a shared fallback when no IP is observable, regardless of credential', () => {
    expect(getRateLimitIdentity(stubReq({ apikey: KEY }))).toBe('ip:unknown');
    expect(getRateLimitIdentity(stubReq({ authorization: `Bearer ${KEY}` }))).toBe(
      'ip:unknown',
    );
  });

  it('keyless, ip-less requests share the anonymous bucket', () => {
    expect(getRateLimitIdentity(stubReq({}))).toBe('ip:unknown');
    expect(getRateLimitIdentity(stubReq({ apikey: 'short' }))).toBe('ip:unknown');
  });

  it('key: fallback decodes through parseClientId for usage logging', () => {
    expect(parseClientId(`key:${hashClientKey(KEY)}`)).toEqual({
      apiKey: hashClientKey(KEY),
      ipAddress: null,
    });
  });

  it('never embeds raw bearer material in the bucket identity', () => {
    const secret = 'rotating-secret-bearer-token-123456789';
    const id = getRateLimitIdentity(stubReq({ authorization: `Bearer ${secret}` }));
    expect(id).not.toContain(secret);
    expect(id).not.toContain(secret.slice(0, 8));
  });
});
