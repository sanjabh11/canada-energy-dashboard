import { ENDPOINTS } from './constants';
import { fetchEdgePostJson, fetchEdgeWithParams, EdgeFetchOptions } from './edge';

export interface TransitionReportResponse {
  summary: string;
  progress?: string[];
  risks?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  // backward-compat (older server/UI names)
  key_findings?: string[];
  policy_implications?: string[];
}

export interface DataQualityResponse {
  summary: string;
  issues: Array<{ description: string; severity?: string } | string>;
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export interface TransitionKpisResponse {
  dataset: string;
  timeframe: string;
  kpis: {
    total_mwh: number | null;
    top_source: { type: string; mwh: number } | null;
    renewable_share: number | null;
  };
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export interface EmissionsPlannerResponse {
  summary: string;
  scenarios?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export interface MarketBriefResponse {
  summary: string;
  drivers?: string[];
  forecasts?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export interface CommunityPlanResponse {
  summary: string;
  plans?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export async function getTransitionReport(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<TransitionReportResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.TRANSITION_REPORT],
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as TransitionReportResponse;
}

export async function getDataQuality(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<DataQualityResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.DATA_QUALITY],
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as DataQualityResponse;
}

export async function getTransitionKpis(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<TransitionKpisResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.TRANSITION_KPIS],
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as TransitionKpisResponse;
}

export async function getHistory(
  params: { datasetPath?: string; type?: string; limit?: number },
  options: EdgeFetchOptions = {}
): Promise<any[]> {
  const resp = await fetchEdgeWithParams([
    ENDPOINTS.LLM.HISTORY,
  ], {
    ...(params.datasetPath ? { datasetPath: params.datasetPath } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  }, options);
  const json = await resp.json();
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return Array.isArray(payload) ? payload : [];
}

export async function getEmissionsPlanner(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<EmissionsPlannerResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.EMISSIONS_PLANNER],
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as EmissionsPlannerResponse;
}

export async function getMarketBrief(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<MarketBriefResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.MARKET_BRIEF],
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as MarketBriefResponse;
}

export async function getCommunityPlan(
  datasetPath: string,
  timeframe: string,
  focus?: string,
  options: EdgeFetchOptions = {}
): Promise<CommunityPlanResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.COMMUNITY_PLAN],
    { datasetPath, timeframe, focus },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as CommunityPlanResponse;
}

export interface GridOptimizationResponse {
  summary: string;
  recommendations: Array<{
    id: string;
    type: string;
    priority: string;
    description: string;
    expectedImpact: number;
    implementationTime: number;
    confidence: number;
  }>;
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
}

export async function getGridOptimizationRecommendations(
  datasetPath: string,
  timeframe: string,
  options: EdgeFetchOptions = {}
): Promise<GridOptimizationResponse> {
  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.LLM.GRID_OPTIMIZATION],
    { datasetPath, timeframe },
    options
  );
  const payload = (json && typeof json === 'object' && 'result' in json) ? (json as any).result : json;
  return payload as GridOptimizationResponse;
}
