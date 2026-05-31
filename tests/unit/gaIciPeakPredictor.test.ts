import { describe, expect, it } from 'vitest';
import {
  buildIciFiveCpDecisionSupportReport,
  buildIciFiveCpRetainedEvidenceExtract,
  iciFiveCpReportToMarkdown,
  parseIesoPeakTrackerSnapshot,
} from '../../src/lib/gaIciPeakPredictor';

describe('gaIciPeakPredictor', () => {
  it('parses copied IESO Peak Tracker tables into canonical 5CP rows', () => {
    const snapshot = [
      'Rank  | Date  | Hour Ending (EST)  | ICI Ontario Demand* (MW)  | Coincident Adjusted AQEW (MWh)  | Status* (Initial, Prelim, Final)',
      '--- | --- | --- | --- | --- | ---',
      '1 | 19 May 2026 | 17 | 20,820 | 20,553 | Initial',
      '2 | 26 May 2026 | 19 | 19,109 | | ',
      '3 | 18 May 2026 | 18 | 18,889 | 18,199 | Final',
      '4 | 25 May 2026 | 19 | 17,561 | | ',
      '5 | 05 May 2026 | 17 | 17,033 | 16,468 | Prelim',
    ].join('\n');

    const rows = parseIesoPeakTrackerSnapshot(snapshot);

    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      timestamp: '2026-05-19T17:00:00.000Z',
      ontario_demand_mw: 20820,
      status: 'initial',
      source: 'https://www.ieso.ca/peaktracker',
    });
    expect(rows[1]).toMatchObject({
      timestamp: '2026-05-26T19:00:00.000Z',
      status: 'candidate',
    });
    expect(rows[2].status).toBe('final');
    expect(rows[4].status).toBe('prelim');
  });

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

  it('builds a validator-ready retained extract without savings guarantee phrasing', () => {
    const systemPeaks = Array.from({ length: 5 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 6, 1 + index, 18)).toISOString(),
      ontario_demand_mw: 22000 - index * 250,
      status: 'candidate' as const,
      source: 'https://www.ieso.ca/peaktracker',
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

    const extract = buildIciFiveCpRetainedEvidenceExtract(report, {
      recordDate: '2026-05-31',
      sourceLabel: 'buyer_supplied_anonymized',
      buyerDataCoveragePct: 84,
      timeToArtifactHours: 18,
      reviewerRole: 'utility planning reviewer',
      reviewerAcceptance: 'accepted',
      reviewerFeedbackStatus: 'complete',
      day14Decision: 'proceed',
      commercialCommitmentStatus: 'letter_of_intent',
    });

    expect(extract).toContain('proof_pack_id: ga_ici_5cp_decision_support_pack');
    expect(extract).toContain('top five 5CP coincident peak windows: 5');
    expect(extract).toContain('peak demand factor PDF estimate:');
    expect(extract).toContain('IESO peak tracker source: https://www.ieso.ca/peaktracker');
    expect(extract).toContain('decision-support settlement boundary:');
    expect(extract).toContain('commercial_commitment_evidence: letter_of_intent');
    expect(extract).not.toMatch(/guaranteed savings/i);
  });
});
