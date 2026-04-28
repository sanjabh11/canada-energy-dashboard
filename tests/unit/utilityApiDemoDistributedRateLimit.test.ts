import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUtilityApiDemoRateLimiter } from '../../supabase/functions/_shared/utilityApiDemoDistributedRateLimit';

describe('utilityApiDemoDistributedRateLimit', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno = {
      env: {
        get: (key: string) => {
          switch (key) {
            case 'UPSTASH_REDIS_REST_URL':
              return 'https://demo-upstash.example';
            case 'UPSTASH_REDIS_REST_TOKEN':
              return 'rest-token';
            default:
              return undefined;
          }
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { Deno?: unknown }).Deno;
    vi.restoreAllMocks();
  });

  it('executes Upstash multi-exec transactions for operator and ip buckets', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([
        { result: 0 },
        { result: 1 },
        { result: 1 },
        { result: 1 },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { result: 0 },
        { result: 1 },
        { result: 1 },
        { result: 1 },
      ]));
    const fetchImpl = fetchSpy as unknown as typeof fetch;

    const limiter = createUtilityApiDemoRateLimiter({ fetchImpl });
    const result = await limiter.check({
      action: 'start_demo',
      operatorId: 'operator-1',
      ipAddress: '203.0.113.10',
      now: 1_717_171_700_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.operator.limit).toBe(2);
    expect(result.operator.remaining).toBe(1);
    expect(result.ip.remaining).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'https://demo-upstash.example/multi-exec',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer rest-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const firstInit = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(firstInit?.body));
    expect(body[0][0]).toBe('ZREMRANGEBYSCORE');
    expect(body[1][0]).toBe('ZADD');
    expect(body[2]).toEqual(['ZCARD', 'utilityapi-demo:rate-limit:operator:start_demo:operator-1']);
    expect(body[3]).toEqual(['PEXPIRE', 'utilityapi-demo:rate-limit:operator:start_demo:operator-1', 660000]);
  });

  it('throws when Upstash returns a command error', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([
        { result: 0 },
        { error: 'ERR simulated failure' },
        { result: 0 },
        { result: 1 },
      ]));
    const fetchImpl = fetchSpy as unknown as typeof fetch;

    const limiter = createUtilityApiDemoRateLimiter({ fetchImpl });

    await expect(limiter.check({
      action: 'poll_demo',
      operatorId: 'operator-1',
      ipAddress: '203.0.113.10',
      now: 1_717_171_700_000,
    })).rejects.toThrow('Upstash transaction command 1 failed');
  });
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}
