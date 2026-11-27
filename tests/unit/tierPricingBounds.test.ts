import { describe, expect, it } from 'vitest';
import {
  calculateArbitrageSpread,
  calculateComplianceCosts,
  calculateSavingsPercentage,
} from '../../src/lib/tierPricing';

const cfg = (fundPrice: number, marketCreditPrice: number) =>
  ({ fundPrice, marketCreditPrice }) as any;

describe('pricing helper numeric bounds', () => {
  it('keeps every output finite for an extreme finite exceedance', () => {
    const out = calculateComplianceCosts(1e308);
    for (const v of [out.fundPayment, out.marketCredits, out.arbitrageSavings, out.savingsPercentage]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(out.fundPayment).toBeLessThanOrEqual(1e12 * 1e6);
  });

  it.each([NaN, Infinity, -Infinity, -5])('clamps hostile exceedance %p to zero cost', (bad) => {
    const out = calculateComplianceCosts(bad);
    expect(out.fundPayment).toBe(0);
    expect(out.marketCredits).toBe(0);
    expect(out.arbitrageSavings).toBe(0);
  });

  it('clamps unbounded config prices instead of propagating them', () => {
    const out = calculateComplianceCosts(10, cfg(1e9, -10));
    expect(out.fundPayment).toBe(10 * 1e6);
    expect(Number.isFinite(out.marketCredits)).toBe(true);
  });

  it('bounds the arbitrage helpers', () => {
    expect(calculateArbitrageSpread(cfg(1e9, 0))).toBe(1e6);
    expect(calculateArbitrageSpread(cfg(100, 20))).toBe(80);
    expect(calculateSavingsPercentage(cfg(0, 5))).toBe(0);
    expect(calculateSavingsPercentage(cfg(100, 20))).toBe(80);
    expect(calculateSavingsPercentage(cfg(1e9, -1e9))).toBe(100);
  });

  it('produces exact expected values for zero and fractional inputs', () => {
    const zero = calculateComplianceCosts(0);
    expect(zero).toEqual({
      fundPayment: 0,
      marketCredits: 0,
      arbitrageSavings: 0,
      savingsPercentage: 0,
      creditUseLimit: 0.9, // current-year schedule step (>= 2026)
    });
    const frac = calculateComplianceCosts(100, cfg(100, 20), 2026);
    // 2026 credit use limit = 0.9 → market = 100*0.9*20 + 100*0.1*100 = 2800
    expect(frac.fundPayment).toBe(10_000);
    expect(frac.marketCredits).toBe(2_800);
    expect(frac.arbitrageSavings).toBe(7_200);
  });
});
