// LLM Client - Barrel Exports
// Main entry point for LLM client operations

// Types
export type {
  LlmResponseMeta,
  TransitionAnalyticsInsight,
  TransitionReportResponse,
  DataQualityResponse,
  TransitionKpisResponse,
  EmissionsPlannerResponse,
  MarketBriefResponse,
  CommunityPlanResponse,
  GridOptimizationResponse,
  GridOptimizationParams,
  RagSearchResponse,
  RagSearchResult,
  RagSearchMeta,
} from './types';

// Client functions
export {
  getTransitionReport,
  getDataQuality,
  getTransitionKpis,
  getTransitionAnalyticsInsight,
  getHistory,
  getEmissionsPlanner,
  getMarketBrief,
  getCommunityPlan,
  getGridOptimizationRecommendations,
} from './client';

// RAG functions
export { searchEnergyRag } from './rag';

// Utilities (exported for advanced use cases)
export { orderCandidates, attachMeta, attachMetaToArray } from './utils';
