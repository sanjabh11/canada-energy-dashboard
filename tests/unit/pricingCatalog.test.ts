import { describe, it, expect } from 'vitest';
import {
  CEIP_PRICING,
  PLAN_PRICES,
  getPlanPrice,
  formatUsd,
  type DirectPlanCode,
  type WhopPlanCode,
} from '../../src/lib/pricingCatalog';

describe('pricingCatalog', () => {
  describe('CEIP_PRICING', () => {
    it('exports direct plan prices', () => {
      expect(CEIP_PRICING.direct.free).toBe(0);
      expect(CEIP_PRICING.direct.consumer_watchdog).toBe(9);
      expect(CEIP_PRICING.direct.professional).toBe(149);
      expect(CEIP_PRICING.direct.industrial_tier).toBe(1500);
      expect(CEIP_PRICING.direct.municipal).toBe(5900);
      expect(CEIP_PRICING.direct.sovereign).toBe(2500);
    });

    it('exports whop plan prices', () => {
      expect(CEIP_PRICING.whop.whop_basic).toBe(29);
      expect(CEIP_PRICING.whop.whop_pro).toBe(99);
      expect(CEIP_PRICING.whop.whop_team).toBe(299);
    });

    it('uses USD currency', () => {
      expect(CEIP_PRICING.currency).toBe('USD');
    });
  });

  describe('PLAN_PRICES', () => {
    it('contains all 6 direct plan codes', () => {
      const directCodes: DirectPlanCode[] = ['free', 'consumer_watchdog', 'professional', 'industrial_tier', 'municipal', 'sovereign'];
      for (const code of directCodes) {
        expect(PLAN_PRICES[code]).toBeDefined();
        expect(PLAN_PRICES[code].code).toBe(code);
        expect(PLAN_PRICES[code].currency).toBe('USD');
      }
    });

    it('contains all 3 whop plan codes', () => {
      const whopCodes: WhopPlanCode[] = ['whop_basic', 'whop_pro', 'whop_team'];
      for (const code of whopCodes) {
        expect(PLAN_PRICES[code]).toBeDefined();
        expect(PLAN_PRICES[code].code).toBe(code);
        expect(PLAN_PRICES[code].currency).toBe('USD');
        expect(PLAN_PRICES[code].interval).toBe('month');
      }
    });

    it('sets free tier interval to forever', () => {
      expect(PLAN_PRICES.free.interval).toBe('forever');
      expect(PLAN_PRICES.free.price).toBe(0);
    });

    it('sets consumer_watchdog interval to month', () => {
      expect(PLAN_PRICES.consumer_watchdog.interval).toBe('month');
      expect(PLAN_PRICES.consumer_watchdog.price).toBe(9);
    });

    it('sets all paid direct plans to monthly interval', () => {
      expect(PLAN_PRICES.professional.interval).toBe('month');
      expect(PLAN_PRICES.industrial_tier.interval).toBe('month');
      expect(PLAN_PRICES.municipal.interval).toBe('month');
      expect(PLAN_PRICES.sovereign.interval).toBe('month');
    });

    it('matches CEIP_PRICING values', () => {
      expect(PLAN_PRICES.free.price).toBe(CEIP_PRICING.direct.free);
      expect(PLAN_PRICES.consumer_watchdog.price).toBe(CEIP_PRICING.direct.consumer_watchdog);
      expect(PLAN_PRICES.professional.price).toBe(CEIP_PRICING.direct.professional);
      expect(PLAN_PRICES.industrial_tier.price).toBe(CEIP_PRICING.direct.industrial_tier);
      expect(PLAN_PRICES.municipal.price).toBe(CEIP_PRICING.direct.municipal);
      expect(PLAN_PRICES.sovereign.price).toBe(CEIP_PRICING.direct.sovereign);
      expect(PLAN_PRICES.whop_basic.price).toBe(CEIP_PRICING.whop.whop_basic);
      expect(PLAN_PRICES.whop_pro.price).toBe(CEIP_PRICING.whop.whop_pro);
      expect(PLAN_PRICES.whop_team.price).toBe(CEIP_PRICING.whop.whop_team);
    });
  });

  describe('getPlanPrice', () => {
    it('returns correct PlanPrice for free', () => {
      const result = getPlanPrice('free');
      expect(result.code).toBe('free');
      expect(result.price).toBe(0);
      expect(result.currency).toBe('USD');
      expect(result.interval).toBe('forever');
    });

    it('returns correct PlanPrice for professional', () => {
      const result = getPlanPrice('professional');
      expect(result.code).toBe('professional');
      expect(result.price).toBe(149);
      expect(result.interval).toBe('month');
    });

    it('returns correct PlanPrice for whop_team', () => {
      const result = getPlanPrice('whop_team');
      expect(result.code).toBe('whop_team');
      expect(result.price).toBe(299);
    });

    it('returns correct PlanPrice for municipal', () => {
      const result = getPlanPrice('municipal');
      expect(result.price).toBe(5900);
    });

    it('returns correct PlanPrice for sovereign', () => {
      const result = getPlanPrice('sovereign');
      expect(result.price).toBe(2500);
    });
  });

  describe('formatUsd', () => {
    it('formats 0 as $0', () => {
      expect(formatUsd(0)).toBe('$0');
    });

    it('formats 9 as $9', () => {
      expect(formatUsd(9)).toBe('$9');
    });

    it('formats 149 as $149', () => {
      expect(formatUsd(149)).toBe('$149');
    });

    it('formats 1500 with locale separators', () => {
      expect(formatUsd(1500)).toBe('$1,500');
    });

    it('formats 5900 with locale separators', () => {
      expect(formatUsd(5900)).toBe('$5,900');
    });

    it('formats 2500 with locale separators', () => {
      expect(formatUsd(2500)).toBe('$2,500');
    });

    it('formats 299 as $299', () => {
      expect(formatUsd(299)).toBe('$299');
    });
  });
});
