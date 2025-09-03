// Project-level named constants (P5)

export const ENDPOINTS = {
  LLM_BASE: 'llm',
  LLM: {
    EXPLAIN_CHART: 'llm/explain-chart',
    ANALYTICS_INSIGHT: 'llm/analytics-insight',
    TRANSITION_REPORT: 'llm/transition-report',
    DATA_QUALITY: 'llm/data-quality',
    FEEDBACK: 'llm/feedback',
    HEALTH: 'llm/health',
    TRANSITION_KPIS: 'llm/transition-kpis',
    HISTORY: 'llm/history',
    EMISSIONS_PLANNER: 'llm/emissions-planner',
    MARKET_BRIEF: 'llm/market-brief',
    COMMUNITY_PLAN: 'llm/community-plan',
    GRID_OPTIMIZATION: 'llm/grid-optimization'
  },
  STREAM: {
    MANIFEST_DASHED: (dataset: string) => `manifest-${dataset}`,
    STREAM_DASHED: (dataset: string) => `stream-${dataset}`,
    MANIFEST_NESTED: (provider: string, dataset: string) => `manifest/${provider}/${dataset}`,
    STREAM_NESTED: (provider: string, dataset: string) => `stream/${provider}/${dataset}`
  }
} as const;

export const FEATURE_FLAGS = {
  USE_STREAMING: 'VITE_USE_STREAMING_DATASETS'
} as const;

export const SAFETY = {
  HTTP_FORBIDDEN: 403,
  HTTP_INDIGENOUS_GUARD: 451
} as const;
