export type GroundsourceExtractionMode = 'llm' | 'heuristic' | 'mixed' | 'budget_exhausted';

export type GroundsourceExtractionPayload = {
  mode: 'llm' | 'heuristic';
  sourceConfidence: number;
  provenanceNotes: string[];
  events: Array<Record<string, unknown>>;
  fallbackReason?: string;
};

export type GroundsourceRunSummary = {
  extraction_mode: GroundsourceExtractionMode;
  fallback_reason?: string;
  llm_source_count: number;
  heuristic_source_count: number;
  source_count: number;
  event_count: number;
  claim_label: 'advisory' | 'validated';
  warnings: string[];
  provenance_score: number;
};

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
}

function extractJsonObject(value: string): string | null {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return value.slice(start, end + 1);
}

function parseJsonLike(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  const stripped = stripCodeFences(value);
  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    const extracted = extractJsonObject(stripped);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function uniqueReasons(reasons: Array<string | undefined>): string[] {
  return [...new Set(reasons.filter((reason): reason is string => Boolean(reason && reason.trim())))];
}

export function normalizeGroundsourceExtractionPayload(value: unknown): GroundsourceExtractionPayload {
  const parsed = parseJsonLike(value);
  if (!parsed) {
    return {
      mode: 'heuristic',
      sourceConfidence: 0.55,
      provenanceNotes: [],
      events: [],
      fallbackReason: 'llm_parse_failed',
    };
  }

  const rawEvents = Array.isArray(parsed.events)
    ? parsed.events.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>
    : parsed.event_type
      ? [parsed]
      : [];
  const sourceConfidence = clamp(Number(parsed.source_confidence ?? parsed.confidence ?? 0.7), 0, 1);
  const provenanceNotes = Array.isArray(parsed.provenance_notes)
    ? parsed.provenance_notes.map((note) => String(note)).filter(Boolean).slice(0, 5)
    : [];

  if (rawEvents.length === 0) {
    return {
      mode: 'heuristic',
      sourceConfidence,
      provenanceNotes,
      events: [],
      fallbackReason: 'llm_returned_no_events',
    };
  }

  return {
    mode: 'llm',
    sourceConfidence,
    provenanceNotes,
    events: rawEvents,
  };
}

export function summarizeGroundsourceRun(params: {
  sourceCount: number;
  eventCount: number;
  llmSourceCount: number;
  heuristicSourceCount: number;
  fallbackReasons?: Array<string | undefined>;
  budgetExhausted?: boolean;
  warnings?: string[];
  provenanceScores?: number[];
}): GroundsourceRunSummary {
  const fallbackReasons = uniqueReasons(params.fallbackReasons ?? []);
  if (params.budgetExhausted) {
    fallbackReasons.unshift('daily_event_budget_exhausted');
  }
  const extraction_mode: GroundsourceExtractionMode = params.budgetExhausted
    ? 'budget_exhausted'
    : params.heuristicSourceCount === 0
      ? 'llm'
      : params.llmSourceCount === 0
        ? 'heuristic'
        : 'mixed';
  const claim_label: 'advisory' | 'validated' = extraction_mode === 'llm' ? 'validated' : 'advisory';
  const provenance_score = params.provenanceScores?.length
    ? round(params.provenanceScores.reduce((sum, value) => sum + value, 0) / params.provenanceScores.length, 4)
    : 0;

  return {
    extraction_mode,
    fallback_reason: fallbackReasons.length ? fallbackReasons.join('; ') : undefined,
    llm_source_count: params.llmSourceCount,
    heuristic_source_count: params.heuristicSourceCount,
    source_count: params.sourceCount,
    event_count: params.eventCount,
    claim_label,
    warnings: params.warnings ?? [],
    provenance_score,
  };
}
