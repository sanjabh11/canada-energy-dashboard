import { describe, expect, it } from 'vitest';
import {
  allocateCreditsToLiabilities,
  buildStarterComplianceYears,
  buildStarterCreditHoldings,
  parseCreditHoldingsCsv,
  type ComplianceYear,
  type CreditHolding,
} from '../../src/lib/creditBankingSupport';

function holding(overrides: Partial<CreditHolding>): CreditHolding {
  return {
    id: 'lot-x',
    type: 'EPC',
    vintage: 2025,
    quantity: 1000,
    purchasePrice: 25,
    purchaseDate: '2026-01-01',
    expiryYear: 2030,
    status: 'available',
    ...overrides,
  };
}

function year(yearNumber: number, liability: number, allocated = 0): ComplianceYear {
  return { year: yearNumber, liability, allocated, remaining: liability - allocated };
}

function totalAllocatedPerLot(rows: ReturnType<typeof allocateCreditsToLiabilities>) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const lot of row.allocatedLots) {
      totals.set(lot.holdingId, (totals.get(lot.holdingId) ?? 0) + lot.quantity);
    }
  }
  return totals;
}

describe('credit allocator lot-state discipline (audit G9b)', () => {
  it('never offers an allocated lot again in the same or a later year', () => {
    const holdings = buildStarterCreditHoldings();
    // Starter lot '3' is already allocated elsewhere; it must stay committed.
    expect(holdings.find((h) => h.id === '3')?.status).toBe('allocated');

    const rows = allocateCreditsToLiabilities(holdings, buildStarterComplianceYears());
    const totals = totalAllocatedPerLot(rows);
    expect(totals.has('3')).toBe(false);

    // The three-year liability stack exceeds the starter supply only because
    // the allocated lot is correctly excluded from the pool.
    const allocatedSum = rows.reduce((sum, row) => sum + row.allocated, 0);
    expect(allocatedSum).toBeLessThanOrEqual(5000 + 8000 + 2000);
  });

  it('excludes retired and expired lots from the allocation pool', () => {
    const holdings = [
      holding({ id: 'retired-lot', status: 'retired', quantity: 9000 }),
      holding({ id: 'expired-lot', status: 'expired', quantity: 9000 }),
      holding({ id: 'free-lot', status: 'available', quantity: 500 }),
    ];
    const rows = allocateCreditsToLiabilities(holdings, [year(2026, 2000)]);
    const totals = totalAllocatedPerLot(rows);
    expect(totals.has('retired-lot')).toBe(false);
    expect(totals.has('expired-lot')).toBe(false);
    expect(totals.get('free-lot')).toBe(500);
    expect(rows[0].allocated).toBe(500);
    expect(rows[0].remaining).toBe(1500);
  });

  it('never allocates more of a lot than exists, across all years', () => {
    const holdings = [
      holding({ id: 'lot-a', quantity: 1200, expiryYear: 2031 }),
      holding({ id: 'lot-b', quantity: 800, expiryYear: 2029 }),
    ];
    const liabilities = [year(2026, 1500), year(2027, 1500), year(2028, 1500)];
    const rows = allocateCreditsToLiabilities(holdings, liabilities);
    const totals = totalAllocatedPerLot(rows);
    expect(totals.get('lot-b')).toBe(800); // fully consumed, earliest expiry first
    expect(totals.get('lot-a')).toBe(1200); // capped at lot size — never doubled
    // Total allocated cannot exceed available supply.
    expect(rows.reduce((sum, row) => sum + row.allocatedLots.reduce((s, l) => s + l.quantity, 0), 0))
      .toBeLessThanOrEqual(2000);
  });

  it('does not double-count a carried-forward allocation for a later run', () => {
    const holdings = [holding({ id: 'lot-a', quantity: 1000 })];
    // The buyer already recorded 600t allocated for 2026 in a prior schedule;
    // only the 400t gap should draw down the lot.
    const rows = allocateCreditsToLiabilities(holdings, [year(2026, 1000, 600)]);
    expect(rows[0].allocated).toBe(1000); // prior 600 + 400 newly allocated
    expect(rows[0].allocatedLots).toHaveLength(1);
    expect(rows[0].allocatedLots[0].quantity).toBe(400);
    expect(rows[0].remaining).toBe(0);

    // A fully pre-allocated year consumes nothing from the pool.
    const full = allocateCreditsToLiabilities(holdings, [year(2026, 1000, 1000)]);
    expect(full[0].allocatedLots).toHaveLength(0);
    expect(full[0].allocated).toBe(1000);
  });

  it('never offers a lot that expires before the compliance year', () => {
    const holdings = [
      holding({ id: 'short-lived', expiryYear: 2026, quantity: 5000 }),
      holding({ id: 'long-lived', expiryYear: 2032, quantity: 300 }),
    ];
    const rows = allocateCreditsToLiabilities(holdings, [year(2028, 1000)]);
    const totals = totalAllocatedPerLot(rows);
    expect(totals.has('short-lived')).toBe(false);
    expect(totals.get('long-lived')).toBe(300);
    expect(rows[0].remaining).toBe(700);
  });

  it('parses legacy active CSV rows as available and keeps non-available lots out of the pool', () => {
    const holdings = parseCreditHoldingsCsv([
      'id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status',
      'lot-a,EPC,2025,500,24,2026-01-01,2030,active',
      'lot-b,EPC,2025,500,24,2026-01-01,2030,retired',
      'lot-c,EPC,2025,500,24,2026-01-01,2030,allocated',
    ].join('\n'));
    expect(holdings.map((h) => h.status)).toEqual(['available', 'retired', 'allocated']);
    const rows = allocateCreditsToLiabilities(holdings, [year(2026, 1200)]);
    const totals = totalAllocatedPerLot(rows);
    expect(totals.get('lot-a')).toBe(500);
    expect(totals.size).toBe(1);
    expect(rows[0].remaining).toBe(700);
  });
});
