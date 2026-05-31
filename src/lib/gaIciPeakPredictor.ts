export const GA_ICI_PREDICTOR_VERSION = 'ga-ici-5cp-decision-support-v1';

export interface IciSystemPeakHour {
  timestamp: string;
  ontario_demand_mw: number;
  status?: 'initial' | 'prelim' | 'final' | 'forecast' | 'candidate';
  source?: string;
}

export interface IciCustomerLoadHour {
  timestamp: string;
  load_mw: number;
}

export interface IciPeakRiskWindow {
  timestamp: string;
  rank: number;
  ontario_demand_mw: number;
  customer_load_mw: number | null;
  estimated_peak_demand_factor: number | null;
  status: IciSystemPeakHour['status'];
  action_label: 'watch' | 'curtail_if_operationally_safe' | 'history_only';
}

export interface IciFiveCpDecisionSupportReport {
  version: string;
  generated_at: string;
  base_period: {
    start: string;
    end: string;
  };
  top_five_peak_hours: IciPeakRiskWindow[];
  watchlist: IciPeakRiskWindow[];
  estimated_peak_demand_factor: number | null;
  top_five_customer_load_mwh: number | null;
  top_five_system_demand_mwh: number | null;
  source_urls: string[];
  claim_boundary: string;
  do_not_claim: string[];
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function buildCustomerLoadLookup(rows: IciCustomerLoadHour[]): Map<string, number> {
  const lookup = new Map<string, number>();
  rows.forEach((row) => {
    const timestamp = normalizeTimestamp(row.timestamp);
    lookup.set(timestamp, (lookup.get(timestamp) ?? 0) + row.load_mw);
  });
  return lookup;
}

function toRiskWindow(
  peak: IciSystemPeakHour,
  rank: number,
  customerLoadLookup: Map<string, number>,
): IciPeakRiskWindow {
  const timestamp = normalizeTimestamp(peak.timestamp);
  const customerLoad = customerLoadLookup.get(timestamp) ?? null;
  const estimatedPdf = customerLoad !== null && peak.ontario_demand_mw > 0
    ? round(customerLoad / peak.ontario_demand_mw)
    : null;
  const status = peak.status ?? 'candidate';

  return {
    timestamp,
    rank,
    ontario_demand_mw: peak.ontario_demand_mw,
    customer_load_mw: customerLoad !== null ? round(customerLoad, 3) : null,
    estimated_peak_demand_factor: estimatedPdf,
    status,
    action_label: status === 'forecast' || status === 'candidate'
      ? rank <= 10 ? 'curtail_if_operationally_safe' : 'watch'
      : 'history_only',
  };
}

export function buildIciFiveCpDecisionSupportReport(params: {
  systemPeaks: IciSystemPeakHour[];
  customerLoad: IciCustomerLoadHour[];
  basePeriodStart: string;
  basePeriodEnd: string;
  generatedAt?: string;
  sourceUrls?: string[];
}): IciFiveCpDecisionSupportReport {
  const customerLoadLookup = buildCustomerLoadLookup(params.customerLoad);
  const ranked = [...params.systemPeaks]
    .filter((peak) => Number.isFinite(peak.ontario_demand_mw) && peak.ontario_demand_mw > 0)
    .sort((left, right) => right.ontario_demand_mw - left.ontario_demand_mw)
    .map((peak, index) => toRiskWindow(peak, index + 1, customerLoadLookup));

  const topFive = ranked.slice(0, 5);
  const topFiveCustomerLoad = topFive.every((peak) => peak.customer_load_mw !== null)
    ? topFive.reduce((sum, peak) => sum + (peak.customer_load_mw ?? 0), 0)
    : null;
  const topFiveSystemDemand = topFive.length === 5
    ? topFive.reduce((sum, peak) => sum + peak.ontario_demand_mw, 0)
    : null;

  return {
    version: GA_ICI_PREDICTOR_VERSION,
    generated_at: params.generatedAt ?? new Date().toISOString(),
    base_period: {
      start: params.basePeriodStart,
      end: params.basePeriodEnd,
    },
    top_five_peak_hours: topFive,
    watchlist: ranked.slice(0, 10),
    estimated_peak_demand_factor: topFiveCustomerLoad !== null && topFiveSystemDemand && topFiveSystemDemand > 0
      ? round(topFiveCustomerLoad / topFiveSystemDemand)
      : null,
    top_five_customer_load_mwh: topFiveCustomerLoad !== null ? round(topFiveCustomerLoad, 3) : null,
    top_five_system_demand_mwh: topFiveSystemDemand !== null ? round(topFiveSystemDemand, 3) : null,
    source_urls: params.sourceUrls ?? [
      'https://www.ieso.ca/en/Learn/Electricity-Pricing-Explained/Global-Adjustment',
      'https://www.ieso.ca/en/Sector-Participants/Settlements/Global-Adjustment-Class-A-Eligibility',
      'https://www.ieso.ca/peaktracker',
    ],
    claim_boundary: 'Ontario GA/ICI 5CP decision support only. This report estimates exposure from supplied load and public/candidate peak records; it is not a savings guarantee, settlement statement, or legal/regulatory opinion.',
    do_not_claim: [
      'Guaranteed GA savings',
      'Final IESO settlement result',
      'Eligibility determination',
      'Operational curtailment instruction',
      'Customer-specific accuracy without buyer-supplied load and reviewer acceptance',
    ],
  };
}

export function iciFiveCpReportToMarkdown(report: IciFiveCpDecisionSupportReport): string {
  return [
    '# Ontario GA/ICI 5CP decision-support report',
    '',
    `- Version: ${report.version}`,
    `- Generated: ${report.generated_at}`,
    `- Base period: ${report.base_period.start} to ${report.base_period.end}`,
    `- Estimated peak demand factor: ${report.estimated_peak_demand_factor ?? 'not available'}`,
    `- Claim boundary: ${report.claim_boundary}`,
    '',
    '| Rank | Timestamp | Ontario demand MW | Customer load MW | Estimated PDF | Status | Action label |',
    '|---:|---|---:|---:|---:|---|---|',
    ...report.watchlist.map((peak) => [
      peak.rank,
      peak.timestamp,
      peak.ontario_demand_mw.toFixed(2),
      peak.customer_load_mw?.toFixed(3) ?? 'missing',
      peak.estimated_peak_demand_factor?.toFixed(6) ?? 'missing',
      peak.status ?? 'candidate',
      peak.action_label,
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Do Not Claim',
    ...report.do_not_claim.map((claim) => `- ${claim}`),
    '',
    '## Sources',
    ...report.source_urls.map((url) => `- ${url}`),
  ].join('\n');
}
