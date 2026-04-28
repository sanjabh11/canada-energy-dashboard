import { buildUtilityForecastPackage, type UtilityForecastPackage, type UtilityHistoricalLoadRow, type UtilityPlanningScenario } from './utilityForecasting';
import { upsampleToQuarterHour } from './intervalUpsampler';
import { parseGreenButtonXml } from './utilityLiveData';

export type UtilityApiDemoMode = 'live' | 'fixture';
export type UtilityApiDemoStatus =
  | 'idle'
  | 'auth_pending'
  | 'meters_discovered'
  | 'collection_pending'
  | 'collection_ready'
  | 'pending_manual'
  | 'wait_to_login'
  | 'no_intervals'
  | 'synced'
  | 'replayed'
  | 'revoked'
  | 'error';

export type UtilityApiDemoScenario =
  | 'commercial'
  | 'residential'
  | 'nointervals'
  | 'partialintervals'
  | 'pending_manual_after'
  | 'wait_to_login_after'
  | 'revoked'
  | 'badlogin'
  | 'badlogin_after'
  | 'empty';

export type UtilityApiDemoPollPhase = 'idle' | 'authorization' | 'collection' | 'sync' | 'stopped';

export interface UtilityApiDemoMeterState {
  uid: string | null;
  status: string | null;
  status_message: string | null;
  status_ts: string | null;
  interval_count: number;
  bill_count: number;
  service_tariff: string | null;
  note_types: string[];
}

export interface UtilityApiDemoSummary {
  intervalRowCount: number;
  meterCount: number;
  coverageStart: string | null;
  coverageEnd: string | null;
  peakDemandMw: number | null;
  averageDemandMw: number | null;
  latestObservedAt: string | null;
  warningCount: number;
  warnings: string[];
}

export interface UtilityApiDemoSessionPointer {
  sessionId: string;
  mode: UtilityApiDemoMode;
  status: UtilityApiDemoStatus;
}

export interface UtilityApiDemoSessionRecord extends UtilityApiDemoSessionPointer {
  scenario: UtilityApiDemoScenario;
  referral: string | null;
  authorizationUid: string | null;
  meterUids: string[];
  meterStates: UtilityApiDemoMeterState[];
  updatedAt: string;
  rawXml: string | null;
  parsedRows: UtilityHistoricalLoadRow[];
  forecastPackage: UtilityForecastPackage | null;
  summary: UtilityApiDemoSummary | null;
  revoked: boolean;
  lastError: string | null;
  collectionDurationMonths: number | null;
  nextPollAt: string | null;
  pollPhase: UtilityApiDemoPollPhase;
  terminalReason: string | null;
  canSync: boolean;
  canActivate: boolean;
  phaseStartedAt: string | null;
  phaseAttemptCount: number;
  retryAfterSeconds: number | null;
}

export interface UtilityApiDemoEdgePayload {
  ok?: boolean;
  pending?: boolean;
  stage?: string;
  code?: string;
  reused?: boolean;
  referral?: string | null;
  authorization_uid?: string | null;
  meter_uids?: string[];
  meter_states?: UtilityApiDemoMeterState[];
  meter_count?: number;
  interval_count?: number;
  collection_duration_months?: number;
  monthly_start_budget?: number;
  monthly_start_count?: number;
  raw_xml?: string;
  retry_after_seconds?: number;
  revoked?: boolean;
  authorization_status?: string | null;
  authorization_status_message?: string | null;
  user_status?: string | null;
  next_poll_after_seconds?: number;
  can_activate?: boolean;
  can_sync?: boolean;
  terminal_reason?: string | null;
  rate_limit_limit?: number;
  rate_limit_remaining?: number;
  rate_limit_reset?: number;
  error?: string;
}

export const DEFAULT_UTILITY_API_DEMO_SCENARIO: UtilityApiDemoScenario = 'commercial';

export function createUtilityApiDemoSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `utilityapi-demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createUtilityApiDemoScenario(): UtilityPlanningScenario {
  return {
    jurisdiction: 'Ontario',
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: 1.45,
    committed_load_mw: 4,
    ev_growth_mw: 3.5,
    heat_pump_growth_mw: 2.8,
    der_offset_mw: 1.6,
    demand_response_reduction_mw: 1.2,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
    stress_test_mode: 'none',
    hosting_capacity_limit_mw: 3.5,
    large_point_loads: [{
      name: 'Committed large point-load',
      geography_id: 'ON-GREEN-BUTTON-77',
      geography_level: 'feeder',
      mw: 0,
      load_factor_pct: 72,
    }],
    industrial_opt_outs: [{
      name: 'Industrial self-supply',
      geography_id: 'ON-GREEN-BUTTON-77',
      geography_level: 'feeder',
      mw: 0,
    }],
    tou_shift_rules: [{
      name: 'Evening EV shift',
      from_hour_start: 17,
      from_hour_end: 21,
      to_hour_start: 0,
      to_hour_end: 5,
      shift_pct: 0,
    }],
  };
}

export function createEmptyUtilityApiDemoSession(
  sessionId: string,
  mode: UtilityApiDemoMode,
  status: UtilityApiDemoStatus,
  scenario: UtilityApiDemoScenario = DEFAULT_UTILITY_API_DEMO_SCENARIO,
): UtilityApiDemoSessionRecord {
  return {
    sessionId,
    mode,
    status,
    scenario,
    referral: null,
    authorizationUid: null,
    meterUids: [],
    meterStates: [],
    updatedAt: new Date().toISOString(),
    rawXml: null,
    parsedRows: [],
    forecastPackage: null,
    summary: null,
    revoked: false,
    lastError: null,
    collectionDurationMonths: null,
    nextPollAt: null,
    pollPhase: 'idle',
    terminalReason: null,
    canSync: false,
    canActivate: false,
    phaseStartedAt: null,
    phaseAttemptCount: 0,
    retryAfterSeconds: null,
  };
}

export function hydrateUtilityApiDemoSession(
  session: UtilityApiDemoSessionRecord,
  patch: Partial<UtilityApiDemoSessionRecord>,
): UtilityApiDemoSessionRecord {
  return {
    ...session,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function buildUtilityApiDemoSessionFromXml(params: {
  sessionId: string;
  mode: UtilityApiDemoMode;
  status: Extract<UtilityApiDemoStatus, 'synced' | 'replayed' | 'no_intervals'>;
  scenario?: UtilityApiDemoScenario;
  rawXml: string;
  referral?: string | null;
  authorizationUid?: string | null;
  meterUids?: string[];
  meterStates?: UtilityApiDemoMeterState[];
  revoked?: boolean;
  collectionDurationMonths?: number | null;
}): UtilityApiDemoSessionRecord {
  const parseResult = parseGreenButtonXml(params.rawXml, {
    jurisdiction: 'Ontario',
  });
  const upsampleResult = upsampleToQuarterHour(parseResult.rows);
  const rows = upsampleResult.rows;
  if (upsampleResult.wasUpsampled) {
    parseResult.warnings.push(
      `AI upsampled: ${upsampleResult.originalIntervalCount} hourly intervals → ${upsampleResult.upsampledIntervalCount} 15-minute intervals (60m → 15m).`,
    );
  }

  const sourceLabel = params.mode === 'fixture'
    ? 'Bundled UtilityAPI Green Button XML fixture'
    : 'UtilityAPI DEMO Green Button XML';
  const forecastPackage = rows.length > 0
    ? buildUtilityForecastPackage({
        rows,
        scenario: createUtilityApiDemoScenario(),
        sourceLabel,
        isSampleData: params.mode === 'fixture',
        sourceKind: 'green_button_cmd',
      })
    : null;

  return {
    sessionId: params.sessionId,
    mode: params.mode,
    status: rows.length > 0 ? params.status : 'no_intervals',
    scenario: params.scenario ?? DEFAULT_UTILITY_API_DEMO_SCENARIO,
    referral: params.referral ?? null,
    authorizationUid: params.authorizationUid ?? null,
    meterUids: params.meterUids ?? [],
    meterStates: params.meterStates ?? [],
    updatedAt: new Date().toISOString(),
    rawXml: params.rawXml,
    parsedRows: rows,
    forecastPackage,
    summary: buildUtilityApiDemoSummary(rows, forecastPackage, parseResult.warnings, params.meterUids?.length ?? params.meterStates?.length ?? 1),
    revoked: params.revoked ?? false,
    lastError: null,
    collectionDurationMonths: params.collectionDurationMonths ?? null,
    nextPollAt: null,
    pollPhase: 'idle',
    terminalReason: rows.length > 0 ? null : 'no_intervals',
    canSync: false,
    canActivate: false,
    phaseStartedAt: null,
    phaseAttemptCount: 0,
    retryAfterSeconds: null,
  };
}

export function buildUtilityApiDemoSummary(
  rows: UtilityHistoricalLoadRow[],
  forecastPackage: UtilityForecastPackage | null,
  warnings: string[],
  meterCount: number,
): UtilityApiDemoSummary {
  const demandValues = rows.map((row) => row.demand_mw);
  const totalDemand = demandValues.reduce((sum, value) => sum + value, 0);
  const forecastWarnings = forecastPackage?.warnings ?? [];

  return {
    intervalRowCount: rows.length,
    meterCount,
    coverageStart: rows[0]?.timestamp ?? null,
    coverageEnd: rows.at(-1)?.timestamp ?? null,
    peakDemandMw: demandValues.length > 0 ? Math.max(...demandValues) : null,
    averageDemandMw: demandValues.length > 0 ? Number((totalDemand / demandValues.length).toFixed(4)) : null,
    latestObservedAt: rows.at(-1)?.timestamp ?? null,
    warningCount: warnings.length + forecastWarnings.length,
    warnings: [...warnings, ...forecastWarnings],
  };
}

export function deriveUtilityApiDemoStatus(payload: UtilityApiDemoEdgePayload, currentStatus: UtilityApiDemoStatus): UtilityApiDemoStatus {
  if (payload.revoked) return 'revoked';
  if (payload.error) return 'error';
  if (payload.stage === 'authorization_pending') return 'auth_pending';
  if (payload.stage === 'meters_discovered') {
    return 'meters_discovered';
  }
  if (payload.stage === 'collection_pending') return 'collection_pending';
  if (payload.stage === 'collection_ready') return 'collection_ready';
  if (payload.stage === 'pending_manual') return 'pending_manual';
  if (payload.stage === 'wait_to_login') return 'wait_to_login';
  if (payload.stage === 'no_intervals') return 'no_intervals';
  if (payload.stage === 'errored') return 'error';
  return currentStatus;
}

export function trimUtilityApiDemoError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'UtilityAPI demo action failed.';
}
