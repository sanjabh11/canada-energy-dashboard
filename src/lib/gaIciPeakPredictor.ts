import {
  resolveCommercialCommitmentEvidence,
  type CommercialCommitmentStatus,
} from './commercialCommitmentEvidence';
import {
  cqrCalibrate,
  type QuantileForecast,
  type ConformalInterval,
} from './conformalPrediction';

export const GA_ICI_PREDICTOR_VERSION = 'ga-ici-5cp-decision-support-v1';
export const IESO_PEAK_TRACKER_SOURCE_URL = 'https://www.ieso.ca/peaktracker';

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

export interface IciBacktestPeakHour {
  timestamp: string;
  rank: number;
  ontario_demand_mw: number;
  status: IciSystemPeakHour['status'];
  matched_candidate_rank: number | null;
}

export interface IciFiveCpHistoricalBacktestReport {
  version: string;
  generated_at: string;
  base_period: {
    start: string;
    end: string;
  };
  candidate_peak_count: number;
  actual_top_five_count: number;
  candidate_top_five_capture_count: number;
  candidate_top_five_capture_rate: number | null;
  watchlist_capture_count: number;
  watchlist_capture_rate: number | null;
  missed_actual_peak_hours: IciBacktestPeakHour[];
  false_positive_candidate_top_five_hours: IciBacktestPeakHour[];
  claim_boundary: string;
  do_not_claim: string[];
}

export interface IciFiveCpRetainedEvidenceExtractParams {
  recordDate: string;
  sourceLabel: string;
  buyerDataCoveragePct: number;
  timeToArtifactHours: number;
  reviewerRole: string;
  reviewerAcceptance: 'accepted' | 'approved' | 'signed';
  reviewerFeedbackStatus: 'complete' | 'accepted' | 'approved' | 'signed';
  day14Decision: 'proceed' | 'park' | 'pivot' | 'reject' | 'pending';
  commercialCommitmentStatus: CommercialCommitmentStatus;
  commercialCommitmentEvidence?: string;
  route?: string;
  proofPackId?: string;
  piiScreenResult?: 'redacted' | 'screened' | 'no personal data' | 'no personal data or meter identifiers found';
  artifactTitle?: string;
  claimBoundary?: string;
  doNotClaim?: string;
  historicalBacktest?: IciFiveCpHistoricalBacktestReport;
}

export interface IesoPeakTrackerParseOptions {
  sourceUrl?: string;
}

type ParsedTable = {
  headers: string[];
  rows: string[][];
};

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeColumn(value: string): string {
  return normalizeText(value)
    .replace(/\*/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseLooseNumber(value: string): number | null {
  const normalized = value.replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDelimitedRows(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function parsePipeTables(text: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  let group: string[] = [];
  const flushGroup = () => {
    const rows = group
      .map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()))
      .filter((row) => row.some((cell) => cell.length > 0))
      .filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
    if (rows.length >= 2) tables.push({ headers: rows[0], rows: rows.slice(1) });
    group = [];
  };

  text.split(/\r?\n/).forEach((line) => {
    if (line.includes('|')) {
      group.push(line);
      return;
    }
    if (group.length > 0) flushGroup();
  });
  if (group.length > 0) flushGroup();

  return tables;
}

function parseHtmlTables(text: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableMatches = text.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  tableMatches.forEach((tableText) => {
    const rows = Array.from(tableText.matchAll(/<tr[\s\S]*?<\/tr>/gi))
      .map(([rowText]) => Array.from(rowText.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi))
        .map(([, cell]) => stripHtml(cell)))
      .filter((row) => row.some((cell) => cell.length > 0));
    if (rows.length >= 2) tables.push({ headers: rows[0], rows: rows.slice(1) });
  });

  return tables;
}

function parseDelimitedTable(text: string): ParsedTable[] {
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ',';
  const rows = parseDelimitedRows(text, delimiter);
  if (rows.length < 2) return [];
  return [{ headers: rows[0], rows: rows.slice(1) }];
}

function isPeakTrackerTable(headers: string[]): boolean {
  const normalizedHeaders = headers.map(normalizeColumn);
  const hasRank = normalizedHeaders.includes('rank');
  const hasDate = normalizedHeaders.some((header) => ['date', 'trade_date', 'delivery_date', 'peak_date'].includes(header));
  const hasIciDemand = normalizedHeaders.some((header) => (
    header.includes('ici_ontario_demand') || header.includes('ontario_demand')
  ));
  return hasDate && hasIciDemand && (hasRank || normalizedHeaders.some((header) => header.startsWith('ici_')));
}

function valueForColumn(row: string[], headers: string[], candidates: string[]): string {
  const normalizedHeaders = headers.map(normalizeColumn);
  const index = normalizedHeaders.findIndex((header) => candidates.includes(header));
  return index >= 0 ? row[index]?.trim() ?? '' : '';
}

function valueForColumnContaining(row: string[], headers: string[], fragments: string[]): string {
  const normalizedHeaders = headers.map(normalizeColumn);
  const index = normalizedHeaders.findIndex((header) => fragments.every((fragment) => header.includes(fragment)));
  return index >= 0 ? row[index]?.trim() ?? '' : '';
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
    };
  }

  const monthNames = new Map([
    ['jan', 0], ['january', 0],
    ['feb', 1], ['february', 1],
    ['mar', 2], ['march', 2],
    ['apr', 3], ['april', 3],
    ['may', 4],
    ['jun', 5], ['june', 5],
    ['jul', 6], ['july', 6],
    ['aug', 7], ['august', 7],
    ['sep', 8], ['sept', 8], ['september', 8],
    ['oct', 9], ['october', 9],
    ['nov', 10], ['november', 10],
    ['dec', 11], ['december', 11],
  ]);
  const dayMonthMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dayMonthMatch) {
    const month = monthNames.get(dayMonthMatch[2].toLowerCase());
    if (month !== undefined) {
      return { year: Number(dayMonthMatch[3]), month, day: Number(dayMonthMatch[1]) };
    }
  }
  const monthDayMatch = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayMatch) {
    const month = monthNames.get(monthDayMatch[1].toLowerCase());
    if (month !== undefined) {
      return { year: Number(monthDayMatch[3]), month, day: Number(monthDayMatch[2]) };
    }
  }

  return null;
}

function timestampFromHourEnding(dateText: string, hourText: string): string | null {
  const dateParts = parseDateParts(dateText);
  const hour = parseLooseNumber(hourText);
  if (!dateParts || hour === null || hour < 1 || hour > 24 || !Number.isInteger(hour)) return null;
  const timestamp = new Date(Date.UTC(dateParts.year, dateParts.month, dateParts.day, hour === 24 ? 24 : hour));
  return timestamp.toISOString();
}

function normalizePeakTrackerStatus(value: string): IciSystemPeakHour['status'] {
  const normalized = normalizeText(value);
  if (!normalized) return 'candidate';
  if (normalized.includes('prelim')) return 'prelim';
  if (normalized.includes('initial')) return 'initial';
  if (normalized.includes('final')) return 'final';
  if (normalized.includes('forecast')) return 'forecast';
  return 'candidate';
}

export function parseIesoPeakTrackerSnapshot(
  text: string,
  options: IesoPeakTrackerParseOptions = {},
): IciSystemPeakHour[] {
  const source = options.sourceUrl ?? IESO_PEAK_TRACKER_SOURCE_URL;
  const tables = [
    ...parseHtmlTables(text),
    ...parsePipeTables(text),
    ...parseDelimitedTable(text),
  ];
  const peaks: IciSystemPeakHour[] = [];

  tables
    .filter((table) => isPeakTrackerTable(table.headers))
    .forEach((table) => {
      table.rows.forEach((row) => {
        const explicitTimestamp = valueForColumn(row, table.headers, ['timestamp', 'datetime', 'date_time']);
        const dateText = valueForColumn(row, table.headers, ['date', 'trade_date', 'delivery_date', 'peak_date']);
        const hourText = valueForColumn(row, table.headers, ['hour_ending', 'hour_ending_est', 'hour_ending_edt', 'he', 'hour']);
        const demandText = valueForColumn(row, table.headers, [
          'ici_ontario_demand',
          'ici_ontario_demand_mw',
          'ontario_demand',
          'ontario_demand_mw',
          'demand_mw',
          'system_demand_mw',
        ]) || valueForColumnContaining(row, table.headers, ['ontario', 'demand']);
        const statusText = valueForColumn(row, table.headers, [
          'status',
          'status_initial_prelim_final',
          'ici_ontario_demand_status',
        ]);
        const sourceText = valueForColumn(row, table.headers, ['source', 'source_url', 'url']);
        const timestamp = explicitTimestamp || timestampFromHourEnding(dateText, hourText);
        const demand = parseLooseNumber(demandText);

        if (!timestamp || demand === null || demand <= 0) return;
        peaks.push({
          timestamp,
          ontario_demand_mw: demand,
          status: normalizePeakTrackerStatus(statusText),
          source: sourceText || source,
        });
      });
    });

  const deduped = new Map<string, IciSystemPeakHour>();
  peaks.forEach((peak) => {
    deduped.set(`${normalizeTimestamp(peak.timestamp)}:${peak.ontario_demand_mw}`, {
      ...peak,
      timestamp: normalizeTimestamp(peak.timestamp),
    });
  });

  const result = Array.from(deduped.values());
  if (result.length === 0) {
    throw new Error('No IESO Peak Tracker rows found. Expected Rank, Date, Hour Ending, ICI Ontario Demand (MW), and Status columns.');
  }
  return result;
}

function buildCustomerLoadLookup(rows: IciCustomerLoadHour[]): Map<string, number> {
  const lookup = new Map<string, number>();
  rows.forEach((row) => {
    const timestamp = normalizeTimestamp(row.timestamp);
    lookup.set(timestamp, (lookup.get(timestamp) ?? 0) + row.load_mw);
  });
  return lookup;
}

function rankSystemPeaks(rows: IciSystemPeakHour[]): Array<IciSystemPeakHour & { rank: number }> {
  return [...rows]
    .filter((peak) => Number.isFinite(peak.ontario_demand_mw) && peak.ontario_demand_mw > 0)
    .map((peak) => ({
      ...peak,
      timestamp: normalizeTimestamp(peak.timestamp),
      status: peak.status ?? 'candidate',
    }))
    .sort((left, right) => right.ontario_demand_mw - left.ontario_demand_mw)
    .map((peak, index) => ({
      ...peak,
      rank: index + 1,
    }));
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
  const ranked = rankSystemPeaks(params.systemPeaks)
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
      IESO_PEAK_TRACKER_SOURCE_URL,
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

export function buildIciFiveCpHistoricalBacktestReport(params: {
  candidatePeaks: IciSystemPeakHour[];
  actualTopFivePeaks: IciSystemPeakHour[];
  basePeriodStart: string;
  basePeriodEnd: string;
  generatedAt?: string;
}): IciFiveCpHistoricalBacktestReport {
  const candidates = rankSystemPeaks(params.candidatePeaks);
  const candidateTopFive = candidates.slice(0, 5);
  const candidateWatchlist = candidates.slice(0, 10);
  const actualTopFive = rankSystemPeaks(params.actualTopFivePeaks).slice(0, 5);
  const candidateTopFiveRanks = new Map(candidateTopFive.map((peak) => [peak.timestamp, peak.rank]));
  const watchlistRanks = new Map(candidateWatchlist.map((peak) => [peak.timestamp, peak.rank]));
  const actualTopFiveSet = new Set(actualTopFive.map((peak) => peak.timestamp));
  const toBacktestPeak = (
    peak: IciSystemPeakHour & { rank: number },
    candidateRank: number | null,
  ): IciBacktestPeakHour => ({
    timestamp: peak.timestamp,
    rank: peak.rank,
    ontario_demand_mw: round(peak.ontario_demand_mw, 3),
    status: peak.status ?? 'candidate',
    matched_candidate_rank: candidateRank,
  });
  const candidateTopFiveCaptureCount = actualTopFive
    .filter((peak) => candidateTopFiveRanks.has(peak.timestamp))
    .length;
  const watchlistCaptureCount = actualTopFive
    .filter((peak) => watchlistRanks.has(peak.timestamp))
    .length;

  return {
    version: `${GA_ICI_PREDICTOR_VERSION}:historical-backtest-v1`,
    generated_at: params.generatedAt ?? new Date().toISOString(),
    base_period: {
      start: params.basePeriodStart,
      end: params.basePeriodEnd,
    },
    candidate_peak_count: candidates.length,
    actual_top_five_count: actualTopFive.length,
    candidate_top_five_capture_count: candidateTopFiveCaptureCount,
    candidate_top_five_capture_rate: actualTopFive.length > 0
      ? round(candidateTopFiveCaptureCount / actualTopFive.length, 4)
      : null,
    watchlist_capture_count: watchlistCaptureCount,
    watchlist_capture_rate: actualTopFive.length > 0
      ? round(watchlistCaptureCount / actualTopFive.length, 4)
      : null,
    missed_actual_peak_hours: actualTopFive
      .filter((peak) => !watchlistRanks.has(peak.timestamp))
      .map((peak) => toBacktestPeak(peak, null)),
    false_positive_candidate_top_five_hours: candidateTopFive
      .filter((peak) => !actualTopFiveSet.has(peak.timestamp))
      .map((peak) => toBacktestPeak(peak, null)),
    claim_boundary: 'Historical GA/ICI 5CP backtest compares public/candidate peak watchlists with supplied historical top-five peak records only. It is not a buyer-specific accuracy claim or settlement-quality audit.',
    do_not_claim: [
      'Guaranteed capture of future 5CP peaks',
      'Buyer-specific savings or curtailment outcome',
      'Final IESO settlement verification',
      'Eligibility determination',
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

export function buildIciFiveCpRetainedEvidenceExtract(
  report: IciFiveCpDecisionSupportReport,
  params: IciFiveCpRetainedEvidenceExtractParams,
): string {
  const topFiveWithLoadCount = report.top_five_peak_hours.filter((peak) => peak.customer_load_mw !== null).length;
  const peakTrackerSource = report.source_urls.find((url) => /peaktracker/i.test(url)) ?? report.source_urls[0] ?? 'IESO source not supplied';
  const claimBoundary = params.claimBoundary
    ?? 'Buyer supplied redacted Ontario load planning support only; GA/ICI output is decision support workflow only.';
  const doNotClaim = params.doNotClaim
    ?? 'No savings guarantee, final IESO settlement, eligibility determination, or operational curtailment instruction.';
  const commercialCommitmentEvidence = resolveCommercialCommitmentEvidence(
    params.commercialCommitmentStatus,
    params.commercialCommitmentEvidence,
  );

  return [
    `# ${params.artifactTitle ?? 'CEIP Ontario GA/ICI 5CP retained evidence extract'}`,
    '',
    'This retained artifact is a redacted text-inspectable extract for the pilot evidence gate.',
    'Sensitive originals, facility names, account numbers, and meter identifiers stay outside the repository.',
    '',
    `record_date: ${params.recordDate}`,
    `route: ${params.route ?? '/ga-ici-5cp'}`,
    `proof_pack_id: ${params.proofPackId ?? 'ga_ici_5cp_decision_support_pack'}`,
    `source_label: ${params.sourceLabel}`,
    `pii_screen_result: ${params.piiScreenResult ?? 'redacted'}`,
    `buyer_data_coverage_pct: ${params.buyerDataCoveragePct}`,
    `time_to_artifact_hours: ${params.timeToArtifactHours}`,
    `reviewer_role: ${params.reviewerRole}`,
    `reviewer_acceptance: ${params.reviewerAcceptance}`,
    `reviewer_feedback_status: ${params.reviewerFeedbackStatus}`,
    `day_14_decision: ${params.day14Decision}`,
    `commercial_commitment_status: ${params.commercialCommitmentStatus}`,
    `commercial_commitment_evidence: ${commercialCommitmentEvidence}`,
    `claim_boundary: ${claimBoundary}`,
    `do_not_claim: ${doNotClaim}`,
    '',
    '## GA/ICI Diagnostic Summary',
    `- top five 5CP coincident peak windows: ${report.top_five_peak_hours.length}`,
    `- top-five customer load coverage: ${topFiveWithLoadCount} of ${report.top_five_peak_hours.length}`,
    `- peak demand factor PDF estimate: ${report.estimated_peak_demand_factor ?? 'not available'}`,
    `- IESO peak tracker source: ${peakTrackerSource}`,
    `- decision-support settlement boundary: ${report.claim_boundary}`,
    `- base period: ${report.base_period.start} to ${report.base_period.end}`,
    ...(params.historicalBacktest ? [
      '',
      '## Historical Backtest Summary',
      `- candidate peak rows: ${params.historicalBacktest.candidate_peak_count}`,
      `- actual top-five rows: ${params.historicalBacktest.actual_top_five_count}`,
      `- candidate top-five capture rate: ${params.historicalBacktest.candidate_top_five_capture_rate ?? 'not available'}`,
      `- watchlist capture rate: ${params.historicalBacktest.watchlist_capture_rate ?? 'not available'}`,
      `- missed actual peak hours: ${params.historicalBacktest.missed_actual_peak_hours.length}`,
      `- false positive candidate top-five hours: ${params.historicalBacktest.false_positive_candidate_top_five_hours.length}`,
      `- backtest claim boundary: ${params.historicalBacktest.claim_boundary}`,
    ] : []),
    '',
    '## Top Five Peak Windows',
    '| Rank | Timestamp | Ontario demand MW | Customer load MW | Estimated PDF | Status |',
    '|---:|---|---:|---:|---:|---|',
    ...report.top_five_peak_hours.map((peak) => [
      peak.rank,
      peak.timestamp,
      peak.ontario_demand_mw.toFixed(2),
      peak.customer_load_mw?.toFixed(3) ?? 'missing',
      peak.estimated_peak_demand_factor?.toFixed(6) ?? 'missing',
      peak.status ?? 'candidate',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Source URLs',
    ...report.source_urls.map((url) => `- ${url}`),
    '',
  ].join('\n');
}

// ============================================================================
// Conformal Prediction Augmentation for GA/ICI 5CP
// ============================================================================

export type PeakAlertTier = 'curtail' | 'watch' | 'monitor' | 'history_only';

export interface IciPeakRiskWindowProbabilistic extends IciPeakRiskWindow {
  conformalInterval?: ConformalInterval;
  p10DemandMw?: number;
  p50DemandMw?: number;
  p90DemandMw?: number;
  alertTier: PeakAlertTier;
  alertRationale: string;
}

export interface IciFiveCpProbabilisticReport extends IciFiveCpDecisionSupportReport {
  top_five_peak_hours_probabilistic: IciPeakRiskWindowProbabilistic[];
  watchlist_probabilistic: IciPeakRiskWindowProbabilistic[];
  conformalCalibration: {
    alpha: number;
    nCalibrationSamples: number;
    conformalQuantile: number;
    coverageRate: number;
    method: string;
  };
  probabilisticClaimBoundary: string;
}

/**
 * Augment an existing GA/ICI 5CP decision support report with CQR conformal
 * prediction intervals for probabilistic multi-tier peak alerts.
 *
 * @param report The existing deterministic 5CP report
 * @param calibrationData Historical calibration data: forecast vs actual peak demands
 * @param alpha Target miscoverage rate (default 0.10 → 90% coverage)
 * @param curtailThresholdMW Demand level above which curtail is recommended at P90
 */
export function augmentPeakReportWithCP(
  report: IciFiveCpDecisionSupportReport,
  calibrationData: { forecasts: QuantileForecast[]; actuals: number[] },
  alpha: number = 0.1,
  curtailThresholdMW?: number,
): IciFiveCpProbabilisticReport {
  const { forecasts, actuals } = calibrationData;
  const nCalibration = Math.min(forecasts.length, actuals.length);

  // Calibrate CQR on historical data
  const calibrationForecasts = forecasts.slice(0, nCalibration);
  const calibrationActuals = actuals.slice(0, nCalibration);

  // Process each peak hour
  const augmentWindow = (window: IciPeakRiskWindow): IciPeakRiskWindowProbabilistic => {
    // Create a QuantileForecast from the deterministic prediction
    // Use the demand as point forecast with estimated spread
    const pointForecast = window.ontario_demand_mw;
    const estimatedStd = pointForecast * 0.03; // 3% coefficient of variation
    const targetForecast: QuantileForecast = {
      lower: pointForecast - 1.645 * estimatedStd,
      median: pointForecast,
      upper: pointForecast + 1.645 * estimatedStd,
    };

    // Calibrate using CQR
    const calibration = cqrCalibrate(
      calibrationForecasts,
      calibrationActuals,
      targetForecast,
      alpha,
    );

    const p10 = calibration.interval.lower;
    const p50 = pointForecast;
    const p90 = calibration.interval.upper;

    // Determine alert tier based on probabilistic thresholds
    const threshold = curtailThresholdMW ?? report.top_five_peak_hours[0]?.ontario_demand_mw ?? 0;
    let alertTier: PeakAlertTier = 'history_only';
    let alertRationale = 'Historical data only — no probabilistic assessment.';

    if (window.status === 'forecast' || window.status === 'candidate') {
      if (p90 >= threshold) {
        alertTier = 'curtail';
        alertRationale = `P90 demand (${round(p10, 1)} MW) ≥ threshold (${round(threshold, 1)} MW). High probability of top-5 peak. Curtail recommended if operationally safe.`;
      } else if (p50 >= threshold * 0.97) {
        alertTier = 'watch';
        alertRationale = `P50 demand (${round(p50, 1)} MW) near threshold (${round(threshold, 1)} MW). Monitor closely — may enter top-5.`;
      } else if (p10 >= threshold * 0.92) {
        alertTier = 'monitor';
        alertRationale = `P10 demand (${round(p10, 1)} MW) approaching threshold (${round(threshold, 1)} MW). Low but non-zero probability of top-5 peak.`;
      } else {
        alertTier = 'monitor';
        alertRationale = `P10 demand (${round(p10, 1)} MW) below threshold (${round(threshold, 1)} MW). Unlikely to enter top-5.`;
      }
    }

    return {
      ...window,
      conformalInterval: calibration.interval,
      p10DemandMw: round(p10, 1),
      p50DemandMw: round(p50, 1),
      p90DemandMw: round(p90, 1),
      alertTier,
      alertRationale,
    };
  };

  const topFiveProbabilistic = report.top_five_peak_hours.map(augmentWindow);
  const watchlistProbabilistic = report.watchlist.map(augmentWindow);

  // Compute coverage rate from calibration
  let covered = 0;
  for (let i = 0; i < nCalibration; i++) {
    const interval = cqrCalibrate(
      calibrationForecasts.slice(0, i),
      calibrationActuals.slice(0, i),
      calibrationForecasts[i],
      alpha,
    );
    if (calibrationActuals[i] >= interval.interval.lower && calibrationActuals[i] <= interval.interval.upper) {
      covered++;
    }
  }
  const coverageRate = nCalibration > 0 ? covered / nCalibration : 0;

  return {
    ...report,
    top_five_peak_hours_probabilistic: topFiveProbabilistic,
    watchlist_probabilistic: watchlistProbabilistic,
    conformalCalibration: {
      alpha,
      nCalibrationSamples: nCalibration,
      conformalQuantile: 0,
      coverageRate: round(coverageRate, 4),
      method: `CQR conformal calibration (alpha=${alpha}, n=${nCalibration}). Multi-tier alerts: curtail (P90≥threshold), watch (P50 near threshold), monitor (P10 near threshold).`,
    },
    probabilisticClaimBoundary: 'Probabilistic intervals provide coverage guarantees on the calibration set. Alert tiers are decision-support only — not operational curtailment instructions. Coverage rate reflects historical calibration, not future guarantees.',
  };
}
