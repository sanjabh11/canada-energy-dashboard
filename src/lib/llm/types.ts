// LLM Client Types
// All interfaces and types for LLM client operations

export interface LlmResponseMeta {
  dataset?: string;
  source: string;
  freshness: string;
  generated_at: string;
  is_fallback: boolean;
  llm_mode: string;
  source_count: number;
  grid_context_used?: boolean;
}

export interface TransitionAnalyticsInsight {
  summary: string;
  key_findings?: string[];
  policy_implications?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  meta?: LlmResponseMeta;
}

export interface TransitionReportResponse {
  summary: string;
  progress?: string[];
  risks?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  key_findings?: string[];
  policy_implications?: string[];
  meta?: LlmResponseMeta;
}

export interface DataQualityResponse {
  summary: string;
  issues: Array<{ description: string; severity?: string } | string>;
  recommendations?: string[];
  alerts?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  meta?: LlmResponseMeta;
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
  meta?: LlmResponseMeta;
}

export interface EmissionsPlannerResponse {
  summary: string;
  key_findings?: string[];
  policy_implications?: string[];
  scenario_explainers?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  meta?: LlmResponseMeta;
}

export interface MarketBriefResponse {
  summary: string;
  drivers?: string[];
  forecasts?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  meta?: LlmResponseMeta;
}

export interface CommunityPlanResponse {
  summary: string;
  plans?: string[];
  recommendations?: string[];
  confidence?: string | number;
  sources?: Array<{ id: string; last_updated?: string; excerpt?: string; snippets?: Array<{ text: string; context?: string }> }>;
  meta?: LlmResponseMeta;
}

export interface RagSearchResult {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  title?: string;
  content: string;
  source_url?: string;
  source_updated_at?: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
  rank?: number;
}

export interface RagSearchMeta {
  usedEmbedding: boolean;
  fallbackReason: string | null;
  limit: number;
  resultCount: number;
  sourceTypes: string[];
}

export interface RagSearchResponse {
  query: string;
  mode: 'vector' | 'lexical';
  results: RagSearchResult[];
  meta: RagSearchMeta;
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
  meta?: LlmResponseMeta;
}

export interface GridOptimizationParams {
  goal?: string;
  scenario?: string;
  region?: string;
}
