import { asJsonObject, readBoundedJson } from '../_shared/boundedBody.ts';

export interface BatteryState {
  province: string;
  soc_percent: number;
  soc_mwh: number;
  capacity_mwh: number;
  power_rating_mw: number;
  last_updated: string;
}

interface DispatchDecision {
  action: 'charge' | 'discharge' | 'hold';
  power_mw: number;
  duration_hours: number;
  reason: string;
  expected_revenue_cad: number;
  renewable_absorption: boolean;
  curtailment_mitigation: boolean;
}

export interface DispatchLog {
  action: 'charge' | 'discharge' | 'hold';
  renewable_absorption?: boolean;
  expected_revenue_cad?: number | string | null;
  actual_revenue_cad?: number | string | null;
  dispatched_at?: string;
}

export interface RevenueLog {
  expected_revenue_cad?: number | string | null;
  actual_revenue_cad?: number | string | null;
  dispatched_at?: string;
}

export interface StorageDispatchReader {
  readBattery(province: string): Promise<BatteryState | null>;
  readStatusLogs(province: string): Promise<DispatchLog[]>;
  readRevenueLogs(province: string, since: string): Promise<RevenueLog[]>;
  readLogs(province: string, limit: number): Promise<DispatchLog[]>;
}

interface StorageDispatchHandlerDependencies extends StorageDispatchReader {
  corsHeaders(req: Request): HeadersInit;
  now?: () => Date;
}

const PROVINCES = new Set(['ON', 'AB', 'BC', 'QC']);
const MAX_DISPATCH_VALUE = 1_000_000;
const MAX_LOG_LIMIT = 100;

const BATTERY_CONFIG: Record<string, { capacity: number; power: number }> = {
  ON: { capacity: 250, power: 100 },
  AB: { capacity: 120, power: 60 },
  BC: { capacity: 80, power: 40 },
  QC: { capacity: 60, power: 30 },
};

export function isSupportedStorageProvince(value: unknown): value is string {
  return typeof value === 'string' && PROVINCES.has(value);
}

export function createDefaultBatteryState(province: string, now = new Date()): BatteryState {
  const config = BATTERY_CONFIG[province] ?? BATTERY_CONFIG.ON!;
  const initialSoc = 50;
  return {
    province,
    soc_percent: initialSoc,
    soc_mwh: (config.capacity * initialSoc) / 100,
    capacity_mwh: config.capacity,
    power_rating_mw: config.power,
    last_updated: now.toISOString(),
  };
}

function jsonResponse(
  payload: unknown,
  status: number,
  corsHeaders: HeadersInit,
): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(payload), { status, headers });
}

function invalidRequest(message: string, status: number, corsHeaders: HeadersInit): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}

function readNumericField(
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): { ok: true; value: number | undefined } | { ok: false } {
  const raw = body[key];
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) {
    return { ok: false };
  }
  return { ok: true, value: raw };
}

function makeDispatchDecision(
  battery: BatteryState,
  price = 50,
  curtailmentRisk = false,
  renewableGeneration?: number,
  demand?: number,
): DispatchDecision {
  const { soc_percent, power_rating_mw, capacity_mwh } = battery;
  const chargePriceThreshold = 25;
  const dischargePriceThreshold = 90;
  const minSoc = 10;
  const maxSoc = 90;

  if ((curtailmentRisk || price < chargePriceThreshold) && soc_percent < maxSoc) {
    const availableCapacity = ((maxSoc - soc_percent) / 100) * capacity_mwh;
    const chargePower = Math.min(power_rating_mw, availableCapacity);
    return {
      action: 'charge',
      power_mw: chargePower,
      duration_hours: 1,
      reason: curtailmentRisk
        ? 'Curtailment risk detected - absorb surplus renewable energy'
        : `Low price ($${price.toFixed(2)}/MWh) - opportunistic charging`,
      expected_revenue_cad: chargePower * (dischargePriceThreshold - price),
      renewable_absorption: curtailmentRisk,
      curtailment_mitigation: curtailmentRisk,
    };
  }

  if (price > dischargePriceThreshold && soc_percent > minSoc) {
    const availableEnergy = ((soc_percent - minSoc) / 100) * capacity_mwh;
    const dischargePower = Math.min(power_rating_mw, availableEnergy);
    return {
      action: 'discharge',
      power_mw: dischargePower,
      duration_hours: 1,
      reason: `High price ($${price.toFixed(2)}/MWh) - arbitrage opportunity`,
      expected_revenue_cad: dischargePower * price,
      renewable_absorption: false,
      curtailment_mitigation: false,
    };
  }

  // Keep these inputs in the decision signature for the existing request contract.
  void renewableGeneration;
  void demand;
  return {
    action: 'hold',
    power_mw: 0,
    duration_hours: 1,
    reason: `Price ($${price.toFixed(2)}/MWh) within neutral range - holding`,
    expected_revenue_cad: 0,
    renewable_absorption: false,
    curtailment_mitigation: false,
  };
}

function simulateDispatch(
  battery: BatteryState,
  decision: DispatchDecision,
  now: Date,
): BatteryState {
  const efficiency = 0.88;
  let newSocMwh = battery.soc_mwh;
  if (decision.action === 'charge') {
    newSocMwh += decision.power_mw * decision.duration_hours * efficiency;
  } else if (decision.action === 'discharge') {
    newSocMwh -= decision.power_mw * decision.duration_hours;
  }

  newSocMwh = Math.max(0, Math.min(battery.capacity_mwh, newSocMwh));
  const newSocPercent = Math.max(5, Math.min(95, (newSocMwh / battery.capacity_mwh) * 100));
  return {
    ...battery,
    soc_percent: newSocPercent,
    soc_mwh: newSocMwh,
    last_updated: now.toISOString(),
  };
}

function sumRevenue(logs: RevenueLog[]): number {
  return logs.reduce((sum, log) => {
    const raw = log.actual_revenue_cad ?? log.expected_revenue_cad ?? 0;
    const amount = Number(raw);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function parseLogLimit(raw: string | null): number {
  if (raw === null) return 50;
  const value = Number(raw);
  if (!Number.isInteger(value)) return 50;
  return Math.max(1, Math.min(MAX_LOG_LIMIT, value));
}

export function createStorageDispatchHandler(
  dependencies: StorageDispatchHandlerDependencies,
): (req: Request) => Promise<Response> {
  const now = dependencies.now ?? (() => new Date());

  return async (req: Request): Promise<Response> => {
    const corsHeaders = dependencies.corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    try {
      if (req.method === 'GET' && path === 'status') {
        const province = url.searchParams.get('province') || 'ON';
        if (!isSupportedStorageProvince(province)) {
          return invalidRequest('Unsupported province', 400, corsHeaders);
        }

        const clock = now();
        const since24h = new Date(clock.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const since7d = new Date(clock.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const [storedBattery, logs, revenue24h, revenue7d] = await Promise.all([
          dependencies.readBattery(province),
          dependencies.readStatusLogs(province),
          dependencies.readRevenueLogs(province, since24h),
          dependencies.readRevenueLogs(province, since7d),
        ]);
        const battery = storedBattery ?? createDefaultBatteryState(province, clock);
        const totalActions = logs.length;
        const renewableAbsorptionCount = logs.filter((log) => log.renewable_absorption).length;
        return jsonResponse({
          battery,
          alignment_pct_renewable_absorption: totalActions > 0
            ? (renewableAbsorptionCount / totalActions) * 100
            : 0,
          soc_bounds_ok: battery.soc_percent >= 5 && battery.soc_percent <= 95,
          actions_count: totalActions,
          expected_revenue_24h: sumRevenue(revenue24h),
          expected_revenue_7d: sumRevenue(revenue7d),
          provenance: revenue7d.length > 0 ? 'storage_dispatch_logs' : 'batteries_state',
          last_updated: battery.last_updated,
        }, 200, corsHeaders);
      }

      if (req.method === 'GET' && path === 'logs') {
        const province = url.searchParams.get('province') || 'ON';
        if (!isSupportedStorageProvince(province)) {
          return invalidRequest('Unsupported province', 400, corsHeaders);
        }
        const logs = await dependencies.readLogs(province, parseLogLimit(url.searchParams.get('limit')));
        const chargeEvents = logs.filter((log) => log.action === 'charge').length;
        const dischargeEvents = logs.filter((log) => log.action === 'discharge').length;
        const renewableAbsorptionEvents = logs.filter((log) => log.renewable_absorption).length;
        return jsonResponse({
          logs,
          summary: {
            total_cycles: logs.length,
            charge_events: chargeEvents,
            discharge_events: dischargeEvents,
            renewable_absorption_events: renewableAbsorptionEvents,
            total_revenue_cad: sumRevenue(logs),
          },
        }, 200, corsHeaders);
      }

      if (req.method === 'POST' && path === 'dispatch') {
        const parsed = await readBoundedJson(req);
        if (!parsed.ok) {
          const status = parsed.reason === 'too_large' ? 413 : 400;
          return invalidRequest(status === 413 ? 'Payload too large' : 'Invalid JSON body', status, corsHeaders);
        }
        const body = asJsonObject(parsed.json);
        if (!body || !isSupportedStorageProvince(body.province)) {
          return invalidRequest('Body must include a supported province', 400, corsHeaders);
        }

        const price = readNumericField(body, 'currentPrice', -MAX_DISPATCH_VALUE, MAX_DISPATCH_VALUE);
        const renewable = readNumericField(body, 'renewableGeneration', 0, MAX_DISPATCH_VALUE);
        const demand = readNumericField(body, 'demand', 0, MAX_DISPATCH_VALUE);
        if (!price.ok || !renewable.ok || !demand.ok) {
          return invalidRequest('Dispatch values must be finite and within supported bounds', 400, corsHeaders);
        }
        if (body.curtailmentRisk !== undefined && typeof body.curtailmentRisk !== 'boolean') {
          return invalidRequest('curtailmentRisk must be a boolean', 400, corsHeaders);
        }

        const battery = await dependencies.readBattery(body.province)
          ?? createDefaultBatteryState(body.province, now());
        const decision = makeDispatchDecision(
          battery,
          price.value,
          body.curtailmentRisk === true,
          renewable.value,
          demand.value,
        );
        const batteryAfter = simulateDispatch(battery, decision, now());
        return jsonResponse({
          decision,
          battery_before: battery,
          battery_after: batteryAfter,
          persistence: 'simulation_only',
        }, 200, corsHeaders);
      }

      if (path === 'dispatch' || path === 'status' || path === 'logs') {
        return invalidRequest('Method not allowed', 405, corsHeaders);
      }

      return invalidRequest('Endpoint not found', 404, corsHeaders);
    } catch (error) {
      console.error('Storage dispatch request failed:', error);
      return invalidRequest('Internal error', 500, corsHeaders);
    }
  };
}
