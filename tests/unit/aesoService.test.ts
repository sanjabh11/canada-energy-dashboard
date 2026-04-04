import {
  type AESORRORate,
  calculateSavings,
  getAllRROProviders,
  getCurrentPoolPrice,
} from '../../src/lib/aesoService';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('aesoService', () => {
  it('calculates monthly, yearly, and percentage savings', () => {
    expect(calculateSavings(15, 10, 1000)).toEqual({
      monthlySavings: 50,
      yearlySavings: 600,
      percentSavings: 33.3,
    });
  });

  it('falls back to cached pool prices when the live request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await getCurrentPoolPrice();

    expect(result).not.toBeNull();
    expect(result?.priceType).toBe('actual');
    expect(result?.poolPrice).toBeGreaterThanOrEqual(50);
    expect(result?.poolPrice).toBeLessThanOrEqual(120);
  });

  it('returns the current provider list with positive rates', async () => {
    const providers = await getAllRROProviders();

    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((provider: AESORRORate) => provider.rroRate > 0)).toBe(true);
    expect(providers[0]?.year).toBe(2026);
  });
});
