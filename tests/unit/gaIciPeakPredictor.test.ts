import { describe, expect, it } from 'vitest';
import {
  buildIciFiveCpDecisionSupportReport,
  iciFiveCpReportToMarkdown,
} from '../../src/lib/gaIciPeakPredictor';

describe('gaIciPeakPredictor', () => {
  it('estimates five coincident peak exposure while preserving decision-support boundaries', () => {
    const systemPeaks = Array.from({ length: 10 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 6, 1 + index, 18)).toISOString(),
      ontario_demand_mw: 22000 - index * 250,
      status: index < 5 ? 'candidate' as const : 'forecast' as const,
      source: 'IESO peak tracker sample',
    }));
    const customerLoad = systemPeaks.map((peak, index) => ({
      timestamp: peak.timestamp,
      load_mw: 8 - index * 0.2,
    }));

    const report = buildIciFiveCpDecisionSupportReport({
      systemPeaks,
      customerLoad,
      basePeriodStart: '2026-05-01',
      basePeriodEnd: '2027-04-30',
      generatedAt: '2026-05-31T00:00:00.000Z',
    });
    const markdown = iciFiveCpReportToMarkdown(report);

    expect(report.version).toBe('ga-ici-5cp-decision-support-v1');
    expect(report.top_five_peak_hours).toHaveLength(5);
    expect(report.watchlist).toHaveLength(10);
    expect(report.estimated_peak_demand_factor).toBeGreaterThan(0);
    expect(report.top_five_peak_hours[0]).toMatchObject({
      rank: 1,
      action_label: 'curtail_if_operationally_safe',
    });
    expect(report.claim_boundary).toContain('decision support only');
    expect(report.do_not_claim).toContain('Guaranteed GA savings');
    expect(markdown).toContain('Ontario GA/ICI 5CP decision-support report');
    expect(markdown).toContain('Do Not Claim');
  });
});
