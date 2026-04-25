import { fetchEdgePostJson, type EdgeFetchOptions } from './edge';
import { logFallbackEvent } from './jobExecutionLog';
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
  fallbackEvent?: {
    jobName: string;
    domain?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ data: T; source: 'edge' | 'local_fallback'; error?: string }> {
  try {
    const { json } = await fetchEdgePostJson(pathCandidates, body, options);
    return { data: json as T, source: 'edge' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (fallbackEvent) {
      await logFallbackEvent({
        jobName: fallbackEvent.jobName,
        reason,
        source: fallbackEvent.source ?? 'edge_fallback',
        domain: fallbackEvent.domain,
        metadata: {
          ...(fallbackEvent.metadata ?? {}),
          edge_error: reason,
          path_candidates: pathCandidates,
        },
      });
    }
    return {
      data: fallback(),
      source: 'local_fallback',
      error: reason,
    };
  }
}

export async function runDispatchScenario(
  input: {
    domain: MlForecastDomain | string;
    province: string;
    horizon_hours: number;
    scenario?: Record<string, unknown>;
    force_refresh?: boolean;
  },
  _options: EdgeFetchOptions = {},
) {
  const data = buildLocalMlForecastRun({
    ...input,
    domain: 'dispatch',
  });
  const analysis = data.analysis as {
    runtimeMode?: 'heuristic' | 'trained';
    fallbackReason?: string;
  } | null;

  if (analysis?.runtimeMode !== 'trained') {
    await logFallbackEvent({
      jobName: 'ml-forecast:dispatch-runtime',
      reason: analysis?.fallbackReason ?? 'dispatch_runtime_heuristic',
      source: 'local_dispatch_runtime',
      domain: 'dispatch',
      modelVersion: data.meta?.model_version,
      metadata: {
        claim_label: data.meta?.claim_label ?? null,
        training_data_profile: data.meta?.training_data_profile ?? null,
      },
    });
  }

  return {
    data,
    source: 'local_fallback' as const,
    error: analysis?.runtimeMode === 'trained' ? undefined : analysis?.fallbackReason,
  };
}

export async function runPvFaultScenario(
  input: {
    domain: MlForecastDomain | string;
    province: string;
    horizon_hours: number;
    scenario?: Record<string, unknown>;
    force_refresh?: boolean;
  },
  _options: EdgeFetchOptions = {},
) {
  const data = buildLocalMlForecastRun({
    ...input,
    domain: 'pv_fault',
  });
  const analysis = data.analysis as {
    runtimeMode?: 'heuristic' | 'trained';
    fallbackReason?: string;
  } | null;

  if (analysis?.runtimeMode !== 'trained') {
    await logFallbackEvent({
      jobName: 'ml-forecast:pv-fault-runtime',
      reason: analysis?.fallbackReason ?? 'pv_fault_runtime_heuristic',
      source: 'local_pv_fault_runtime',
      domain: 'pv_fault',
      modelVersion: data.meta?.model_version,
      metadata: {
        claim_label: data.meta?.claim_label ?? null,
        training_data_profile: data.meta?.training_data_profile ?? null,
      },
    });
  }

  return {
    data,
    source: 'local_fallback' as const,
    error: analysis?.runtimeMode === 'trained' ? undefined : analysis?.fallbackReason,
  };
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
  if (input.domain === 'dispatch') {
    return runDispatchScenario(input, options);
  }
  if (input.domain === 'pv_fault') {
    return runPvFaultScenario(input, options);
  }
  return postWithFallback(
    ['ml-forecast/run'],
    input,
    () => buildLocalMlForecastRun(input),
    options,
    {
      jobName: `ml-forecast:${String(input.domain ?? 'load')}`,
      domain: String(input.domain ?? 'load'),
      source: 'edge_fallback',
    },
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
