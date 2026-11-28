import { describe, expect, it } from 'vitest';
import { formatUsd } from '../../src/lib/pricingCatalog';
import { formatTierAmount } from '../../src/lib/tierCalculations';
import { formatPricingWithProvenance, DEFAULT_TIER_PRICING } from '../../src/lib/tierPricing';

describe('currency labeling (audit G11)', () => {
  it('formats catalog prices with the USD code and no bare or duplicated symbols', () => {
    const formatted = formatUsd(1500);
    expect(formatted).toBe('USD 1,500');
    expect(formatted).not.toContain('$');
    expect(formatted.match(/USD/g)).toHaveLength(1);
    expect(formatted).not.toContain('USD $');
    expect(formatted).not.toContain('USD USD');
  });

  it('labels TIER amounts with an explicit currency code and no bare $', () => {
    for (const currency of ['USD', 'CAD'] as const) {
      const formatted = formatTierAmount(18000, currency);
      expect(formatted).toContain(currency);
      expect(formatted).not.toContain('$');
      expect(formatted).not.toMatch(/USD \$|CAD \$/);
    }
  });

  it('labels TIER pricing provenance strings with CAD instead of bare $', () => {
    const formatted = formatPricingWithProvenance(DEFAULT_TIER_PRICING);
    expect(formatted).toContain('Fund: CAD 95/t');
    expect(formatted).toContain('Market: CAD 25/t');
    expect(formatted).not.toMatch(/(?<![A-Z])\$/); // no bare dollar sign
    expect(formatted).not.toContain('CAD $');
  });
});
