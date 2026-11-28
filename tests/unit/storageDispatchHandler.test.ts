import { describe, expect, it, vi } from 'vitest';
import { createStorageDispatchHandler } from '../../supabase/functions/api-v2-storage-dispatch/handler';

function postDispatch(body: unknown): Request {
  return new Request('https://local.test/api-v2-storage-dispatch/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('storage dispatch request handler', () => {
  it('simulates dispatch from a virtual default and performs no persistent writes', async () => {
    const readBattery = vi.fn(async () => null);
    const readStatusLogs = vi.fn(async () => []);
    const readRevenueLogs = vi.fn(async () => []);
    const readLogs = vi.fn(async () => []);
    const handler = createStorageDispatchHandler({
      readBattery,
      readStatusLogs,
      readRevenueLogs,
      readLogs,
      now: () => new Date('2026-11-14T00:00:00.000Z'),
      corsHeaders: () => ({ 'Access-Control-Allow-Origin': '*' }),
    });

    const response = await handler(postDispatch({
      province: 'ON',
      currentPrice: 10,
      renewableGeneration: 100,
      demand: 50,
      curtailmentRisk: false,
    }));
    const payload = await response.json();
    const secondPayload = await (await handler(postDispatch({
      province: 'ON',
      currentPrice: 10,
      renewableGeneration: 100,
      demand: 50,
      curtailmentRisk: false,
    }))).json();

    expect(response.status).toBe(200);
    expect(payload.battery_before).toMatchObject({ province: 'ON', soc_percent: 50 });
    expect(payload.decision.action).toBe('charge');
    expect(payload.battery_after.soc_percent).toBeGreaterThan(payload.battery_before.soc_percent);
    expect(readBattery).toHaveBeenCalledTimes(2);
    expect(secondPayload.battery_before).toEqual(payload.battery_before);
    expect(secondPayload.persistence).toBe('simulation_only');
  });

  it('returns a virtual default battery for status without inserting a row', async () => {
    const readBattery = vi.fn(async () => null);
    const handler = createStorageDispatchHandler({
      readBattery,
      readStatusLogs: vi.fn(async () => []),
      readRevenueLogs: vi.fn(async () => []),
      readLogs: vi.fn(async () => []),
      now: () => new Date('2026-11-14T00:00:00.000Z'),
      corsHeaders: () => ({}),
    });

    const response = await handler(new Request('https://local.test/status?province=BC'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.battery).toMatchObject({ province: 'BC', soc_percent: 50, capacity_mwh: 80 });
    expect(payload.soc_bounds_ok).toBe(true);
  });

  it('rejects unsupported provinces and malformed numeric fields before reading state', async () => {
    const readBattery = vi.fn(async () => null);
    const handler = createStorageDispatchHandler({
      readBattery,
      readStatusLogs: vi.fn(async () => []),
      readRevenueLogs: vi.fn(async () => []),
      readLogs: vi.fn(async () => []),
      corsHeaders: () => ({}),
    });

    for (const body of ([
      { province: 'ZZ', currentPrice: 10 },
      { province: 'ON', currentPrice: '10' },
      { province: 'ON', demand: -1 },
      { province: 'ON', renewableGeneration: 1_000_001 },
      null,
      [],
    ] as unknown[])) {
      const response = await handler(postDispatch(body));
      expect(response.status).toBe(400);
    }

    expect(readBattery).not.toHaveBeenCalled();
  });

  it('returns controlled errors for malformed JSON and unsupported methods', async () => {
    const handler = createStorageDispatchHandler({
      readBattery: vi.fn(async () => null),
      readStatusLogs: vi.fn(async () => []),
      readRevenueLogs: vi.fn(async () => []),
      readLogs: vi.fn(async () => []),
      corsHeaders: () => ({}),
    });

    const malformed = await handler(new Request('https://local.test/dispatch', {
      method: 'POST',
      body: '{',
    }));
    const wrongMethod = await handler(new Request('https://local.test/dispatch', { method: 'GET' }));

    expect(malformed.status).toBe(400);
    expect(wrongMethod.status).toBe(405);
  });
});
