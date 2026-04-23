import { fetchEdgePostJson, type EdgeFetchOptions } from './edge';
import {
  buildLocalMlForecastRun,
  calculateTierScenario,
  evaluateGridRisk,
  detectWassersteinDrift,
  evaluateRateWatchdog,
  type MlForecastDomain,
  type TierScenarioInput,
  type RetailerOfferInput,
} from './mlForecasting';

async function postWithFallback<T>(
  pathCandidates: string[],
  body: unknown,
  fallback: () => T,
  options: EdgeFetchOptions = {},
): Promise<{ data: T; source: 'edge' | 'local_fallback'; error?: string }> {
  try {
    const { json } = await fetchEdgePostJson(pathCandidates, body, options);
    return { data: json as T, source: 'edge' };
  } catch (error) {
    return {
      data: fallback(),
      source: 'local_fallback',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function evaluateTierScenario(
  input: TierScenarioInput,
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['tier-simulator/evaluate'],
    input,
    () => calculateTierScenario(input),
    options,
  );
}

export function evaluateRateWatchdogScenario(
  input: {
    province: string;
    usageKwh: number;
    currentRateCadPerKwh: number;
    provider: string;
    retailerOffers: RetailerOfferInput[];
    asOfDate?: string;
  },
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['rate-watchdog/evaluate'],
    input,
    () => evaluateRateWatchdog(input),
    options,
  );
}

export function runMlForecast(
  input: {
    domain: MlForecastDomain | string;
    province: string;
    horizon_hours: number;
    scenario?: Record<string, unknown>;
    force_refresh?: boolean;
  },
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['ml-forecast/run'],
    input,
    () => buildLocalMlForecastRun(input),
    options,
  );
}

export function evaluateGridRiskScenario(
  input: Parameters<typeof evaluateGridRisk>[0],
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['grid-risk/evaluate'],
    input,
    () => evaluateGridRisk(input),
    options,
  );
}

export function evaluateForecastDrift(
  input: Parameters<typeof detectWassersteinDrift>[0] & { domain?: string; province?: string; model_key?: string },
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['model-monitor/drift'],
    input,
    () => detectWassersteinDrift(input),
    options,
  );
}

export function ingestGroundsourceEvents(
  input: { source_group?: string; max_items?: number; allow_indigenous_consent?: boolean },
  options?: EdgeFetchOptions,
) {
  return postWithFallback(
    ['groundsource-miner/ingest'],
    input,
    () => ({
      source_group: input.source_group ?? 'utility_public',
      documents: [],
      events: [],
      meta: {
        model_version: 'groundsource-miner-v1',
        generated_at: new Date().toISOString(),
        valid_at: new Date().toISOString(),
        confidence_score: 0,
        data_sources: [],
        is_fallback: true,
        staleness_status: 'unknown',
        methodology: 'Groundsource Edge endpoint unavailable.',
        warnings: ['No public intelligence events were ingested in fallback mode.'],
      },
    }),
    options,
  );
}
