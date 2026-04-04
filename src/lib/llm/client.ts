// LLM Client
// Main client functions for LLM operations

import { ENDPOINTS } from '../constants';
import { fetchEdgePostJson, fetchEdgeWithParams, type EdgeFetchOptions } from '../edge';
import { isEdgeFetchEnabled } from '../config';
import { orderCandidates, attachMeta, attachMetaToArray } from './utils';
import type {
  TransitionAnalyticsInsight,
  TransitionReportResponse,
  DataQualityResponse,
  TransitionKpisResponse,
  EmissionsPlannerResponse,
  MarketBriefResponse,
  CommunityPlanResponse,
  GridOptimizationResponse,
  GridOptimizationParams,
} from './types';

export async function getTransitionReport(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<TransitionReportResponse> {
  if (!isEdgeFetchEnabled()) {
    return {
      summary: 'Transition report requires Supabase Edge access. Offline mode is currently active with mock data.',
      progress: [
        'Ontario grid achieved 67% zero-carbon generation in recent period',
        'Coal phase-out completed ahead of 2014 target',
        'Nuclear refurbishment program on schedule'
      ],
      risks: [
        'Natural gas dependency remains elevated during peak demand',
        'Intertie capacity constraints limit import flexibility'
      ],
      recommendations: [
        'Accelerate storage deployment to offset gas peaker usage',
        'Expand Quebec intertie for additional hydro imports'
      ]
    };
  }
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.TRANSITION_REPORT, ENDPOINTS.LLM_LITE.TRANSITION_REPORT),
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as TransitionReportResponse);
}

export async function getDataQuality(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<DataQualityResponse> {
  if (!isEdgeFetchEnabled()) {
    return {
      summary: 'Data quality report requires Supabase Edge access. Offline mode with mock metrics.',
      issues: [
        'Live edge functions unavailable in offline mode',
        'Using cached fallback data samples'
      ],
      recommendations: [
        'Enable VITE_ENABLE_EDGE_FETCH for real-time quality metrics',
        'Verify Supabase credentials for full data access'
      ]
    };
  }
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.DATA_QUALITY, ENDPOINTS.LLM_LITE.DATA_QUALITY),
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as DataQualityResponse);
}

export async function getTransitionKpis(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<TransitionKpisResponse> {
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.TRANSITION_KPIS, ENDPOINTS.LLM_LITE.TRANSITION_KPIS),
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as TransitionKpisResponse);
}

export async function getTransitionAnalyticsInsight(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<TransitionAnalyticsInsight> {
  if (!isEdgeFetchEnabled()) {
    return {
      summary: 'Live analytics insights require Supabase Edge access. Offline mode is currently active, so mock datasets are displayed without LLM commentary.',
      key_findings: [
        'Streaming datasets are running on local fallback samples.',
        'Enable `VITE_ENABLE_EDGE_FETCH` with valid Supabase credentials to retrieve real-time insights.'
      ],
      policy_implications: [
        'Offline review mode only provides static summaries.',
        'Re-connect to Supabase to unlock transition impact insights.'
      ],
      confidence: 'offline-mode',
      meta: {
        dataset: datasetPath,
        source: 'client-offline-mode',
        freshness: new Date().toISOString(),
        generated_at: new Date().toISOString(),
        is_fallback: true,
        llm_mode: 'offline',
        source_count: 0,
        grid_context_used: false,
      }
    };
  }

  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.ANALYTICS_INSIGHT, ENDPOINTS.LLM_LITE.ANALYTICS_INSIGHT),
    { datasetPath, timeframe, queryType: 'overview' },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as TransitionAnalyticsInsight);
}

export async function getHistory(
  params: { datasetPath?: string; type?: string; limit?: number },
  options: EdgeFetchOptions = {}
): Promise<any[]> {
  const resp = await fetchEdgeWithParams(orderCandidates(ENDPOINTS.LLM.HISTORY, ENDPOINTS.LLM_LITE.HISTORY), {
    ...(params.datasetPath ? { datasetPath: params.datasetPath } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  }, options);
  const json = await resp.json();
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMetaToArray(json, Array.isArray(payload) ? payload : []);
}

export async function getEmissionsPlanner(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<EmissionsPlannerResponse> {
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.EMISSIONS_PLANNER, ENDPOINTS.LLM_LITE.EMISSIONS_PLANNER),
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as EmissionsPlannerResponse);
}

export async function getMarketBrief(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<MarketBriefResponse> {
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.MARKET_BRIEF, ENDPOINTS.LLM_LITE.MARKET_BRIEF),
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as MarketBriefResponse);
}

export async function getCommunityPlan(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<CommunityPlanResponse> {
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.COMMUNITY_PLAN, ENDPOINTS.LLM_LITE.COMMUNITY_PLAN),
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as CommunityPlanResponse);
}

export async function getGridOptimizationRecommendations(
  datasetPath: string,
  timeframe: string,
  params: GridOptimizationParams = {},
  options: EdgeFetchOptions = {}
): Promise<GridOptimizationResponse> {
  const { json } = await fetchEdgePostJson(
    orderCandidates(ENDPOINTS.LLM.GRID_OPTIMIZATION, ENDPOINTS.LLM_LITE.GRID_OPTIMIZATION),
    { datasetPath, timeframe, ...params },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return attachMeta(json, payload as GridOptimizationResponse);
}

// Re-export types for convenience
export type {
  TransitionAnalyticsInsight,
  TransitionReportResponse,
  DataQualityResponse,
  TransitionKpisResponse,
  EmissionsPlannerResponse,
  MarketBriefResponse,
  CommunityPlanResponse,
  GridOptimizationResponse,
  GridOptimizationParams,
} from './types';
