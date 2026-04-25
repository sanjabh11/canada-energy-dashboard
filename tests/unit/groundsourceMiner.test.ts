import { describe, expect, it } from 'vitest';
import {
  normalizeGroundsourceExtractionPayload,
  summarizeGroundsourceRun,
} from '../../supabase/functions/groundsource-miner/groundsource';

describe('groundsource miner extraction helpers', () => {
  it('normalizes valid Gemini JSON into LLM-backed extraction payloads', () => {
    const payload = normalizeGroundsourceExtractionPayload({
      source_confidence: 0.92,
      provenance_notes: ['structured extraction used'],
      events: [
        { event_type: 'policy', summary: 'policy shift', confidence_score: 0.88 },
      ],
    });

    expect(payload.mode).toBe('llm');
    expect(payload.sourceConfidence).toBeCloseTo(0.92, 4);
    expect(payload.provenanceNotes).toEqual(['structured extraction used']);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].event_type).toBe('policy');
  });

  it('falls back cleanly when Gemini output is malformed or empty', () => {
    const malformed = normalizeGroundsourceExtractionPayload('```json\nnot-json\n```');
    expect(malformed.mode).toBe('heuristic');
    expect(malformed.fallbackReason).toBe('llm_parse_failed');

    const empty = normalizeGroundsourceExtractionPayload({ source_confidence: 0.9, events: [] });
    expect(empty.mode).toBe('heuristic');
    expect(empty.fallbackReason).toBe('llm_returned_no_events');
  });

  it('summarizes mixed runs as advisory and preserves provenance counts', () => {
    const summary = summarizeGroundsourceRun({
      sourceCount: 4,
      eventCount: 3,
      llmSourceCount: 2,
      heuristicSourceCount: 2,
      fallbackReasons: ['llm_parse_failed', 'llm_parse_failed', 'llm_unavailable'],
      warnings: ['Scheduled ingestion mode enabled.'],
      provenanceScores: [0.82, 0.74, 0.79],
    });

    expect(summary.extraction_mode).toBe('mixed');
    expect(summary.claim_label).toBe('advisory');
    expect(summary.source_count).toBe(4);
    expect(summary.event_count).toBe(3);
    expect(summary.llm_source_count).toBe(2);
    expect(summary.heuristic_source_count).toBe(2);
    expect(summary.fallback_reason).toBe('llm_parse_failed; llm_unavailable');
    expect(summary.provenance_score).toBeCloseTo(0.7833, 3);
  });

  it('marks fully LLM-backed runs as validated', () => {
    const summary = summarizeGroundsourceRun({
      sourceCount: 3,
      eventCount: 3,
      llmSourceCount: 3,
      heuristicSourceCount: 0,
      warnings: [],
      provenanceScores: [0.91, 0.89, 0.87],
    });

    expect(summary.extraction_mode).toBe('llm');
    expect(summary.claim_label).toBe('validated');
  });

  it('marks budget-exhausted runs explicitly', () => {
    const summary = summarizeGroundsourceRun({
      sourceCount: 5,
      eventCount: 0,
      llmSourceCount: 0,
      heuristicSourceCount: 0,
      budgetExhausted: true,
      warnings: ['Groundsource daily event budget reached; remaining sources were skipped.'],
    });

    expect(summary.extraction_mode).toBe('budget_exhausted');
    expect(summary.claim_label).toBe('advisory');
    expect(summary.fallback_reason).toBe('daily_event_budget_exhausted');
  });
});
