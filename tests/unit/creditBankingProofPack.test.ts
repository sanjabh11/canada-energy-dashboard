import { describe, expect, it } from 'vitest';
import { DEFAULT_TIER_PRICING } from '../../src/lib/tierPricing';
import {
  allocateCreditsToLiabilities,
  buildCreditAllocationCsv,
  buildStarterComplianceYears,
  buildStarterCreditHoldings,
  parseComplianceLiabilityCsv,
  parseCreditHoldingsCsv,
  summarizeCreditPortfolio,
} from '../../src/lib/creditBankingSupport';
import {
  buildCreditBankingProofBundle,
  buildCreditPositionDescriptor,
} from '../../src/lib/creditBankingProofPack';

describe('creditBanking proof workflow', () => {
  it('builds allocation outputs from uploaded holdings and liabilities', () => {
    const holdings = parseCreditHoldingsCsv([
      'id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status',
      'lot-1,EPC,2025,2000,24,2026-01-05,2030,active',
      'lot-2,Offset,2024,1000,26,2025-09-02,2029,active',
    ].join('\n'));
    const liabilities = parseComplianceLiabilityCsv([
      'year,liability',
      '2026,2500',
      '2027,1500',
    ].join('\n'));

    const allocations = allocateCreditsToLiabilities(holdings, liabilities);
    const summary = summarizeCreditPortfolio(holdings, liabilities, DEFAULT_TIER_PRICING.marketCreditPrice, DEFAULT_TIER_PRICING.fundPrice);
    const bundle = buildCreditBankingProofBundle('uploaded_ledger', DEFAULT_TIER_PRICING);
    const descriptor = buildCreditPositionDescriptor({
      sourceMode: 'uploaded_ledger',
      pricing: DEFAULT_TIER_PRICING,
      summary,
      allocations,
      holdings,
    });

    expect(bundle.artifacts[0].claimLabel).toBe('owner-supplied');
    expect(allocations[0].allocated).toBe(2500);
    expect(descriptor.sections[1].body).toContain('2026: 2,500t allocated, 0t remaining');
    expect(buildCreditAllocationCsv(allocations, DEFAULT_TIER_PRICING.marketCreditPrice)).toContain('allocated_lots');
  });

  it('keeps starter ledger bundles advisory', () => {
    const holdings = buildStarterCreditHoldings();
    const liabilities = buildStarterComplianceYears();
    const summary = summarizeCreditPortfolio(holdings, liabilities, DEFAULT_TIER_PRICING.marketCreditPrice, DEFAULT_TIER_PRICING.fundPrice);

    expect(summary.totalCredits).toBeGreaterThan(0);
    expect(buildCreditBankingProofBundle('starter_ledger', DEFAULT_TIER_PRICING).artifacts[0].claimLabel).toBe('advisory');
  });
});
