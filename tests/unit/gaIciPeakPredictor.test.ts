import { describe, expect, it } from 'vitest';
import {
  buildIciFiveCpHistoricalBacktestReport,
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

  it('backtests candidate peak watchlists against historical top-five actuals without claiming buyer accuracy', () => {
    const candidatePeaks = [
      ['2026-07-01T18:00:00.000Z', 22000],
      ['2026-07-02T18:00:00.000Z', 21750],
      ['2026-07-03T18:00:00.000Z', 21500],
      ['2026-07-04T18:00:00.000Z', 21250],
      ['2026-07-05T18:00:00.000Z', 21000],
      ['2026-07-06T18:00:00.000Z', 20800],
    ].map(([timestamp, demand]) => ({
      timestamp: String(timestamp),
      ontario_demand_mw: Number(demand),
      status: 'candidate' as const,
    }));
    const actualTopFivePeaks = [
      ['2026-07-01T18:00:00.000Z', 22000],
      ['2026-07-02T18:00:00.000Z', 21750],
      ['2026-07-03T18:00:00.000Z', 21500],
      ['2026-07-04T18:00:00.000Z', 21250],
      ['2026-07-10T18:00:00.000Z', 20950],
    ].map(([timestamp, demand]) => ({
      timestamp: String(timestamp),
      ontario_demand_mw: Number(demand),
      status: 'final' as const,
    }));

    const backtest = buildIciFiveCpHistoricalBacktestReport({
      candidatePeaks,
      actualTopFivePeaks,
      basePeriodStart: '2026-05-01',
      basePeriodEnd: '2027-04-30',
      generatedAt: '2026-05-31T00:00:00.000Z',
    });

    expect(backtest.candidate_peak_count).toBe(6);
    expect(backtest.actual_top_five_count).toBe(5);
    expect(backtest.candidate_top_five_capture_count).toBe(4);
    expect(backtest.candidate_top_five_capture_rate).toBe(0.8);
    expect(backtest.watchlist_capture_count).toBe(4);
    expect(backtest.watchlist_capture_rate).toBe(0.8);
    expect(backtest.missed_actual_peak_hours).toHaveLength(1);
    expect(backtest.false_positive_candidate_top_five_hours).toHaveLength(1);
    expect(backtest.claim_boundary).toContain('not a buyer-specific accuracy claim');
    expect(backtest.do_not_claim).toContain('Guaranteed capture of future 5CP peaks');
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
    const historicalBacktest = buildIciFiveCpHistoricalBacktestReport({
      candidatePeaks: systemPeaks,
      actualTopFivePeaks: systemPeaks.map((peak) => ({ ...peak, status: 'final' as const })),
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
      historicalBacktest,
    });

    expect(extract).toContain('proof_pack_id: ga_ici_5cp_decision_support_pack');
    expect(extract).toContain('top five 5CP coincident peak windows: 5');
    expect(extract).toContain('peak demand factor PDF estimate:');
    expect(extract).toContain('IESO peak tracker source: https://www.ieso.ca/peaktracker');
    expect(extract).toContain('decision-support settlement boundary:');
    expect(extract).toContain('Historical Backtest Summary');
    expect(extract).toContain('watchlist capture rate: 1');
    expect(extract).toContain('backtest claim boundary:');
    expect(extract).toContain('commercial_commitment_evidence: letter_of_intent');
    expect(extract).not.toMatch(/guaranteed savings/i);
  });
});
