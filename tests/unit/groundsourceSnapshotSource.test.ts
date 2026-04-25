import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockMaybeSingle,
  queryBuilder,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const queryBuilder = {
    eq: vi.fn(() => queryBuilder),
    maybeSingle: mockMaybeSingle,
  };
  const mockSelect = vi.fn(() => queryBuilder);
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return {
    mockMaybeSingle,
    queryBuilder,
    mockSelect,
    mockFrom,
  };
});

vi.mock('../../src/lib/supabaseClient', () => ({
  supabase: {
    from: mockFrom,
  },
}));

import {
  buildGroundsourceSnapshotFallback,
  getGroundsourceSnapshot,
} from '../../src/lib/groundsourceSnapshotSource';

afterEach(() => {
  vi.clearAllMocks();
  queryBuilder.eq.mockClear();
  mockSelect.mockClear();
  mockFrom.mockClear();
});

describe('groundsourceSnapshotSource', () => {
  it('returns a no-snapshot fallback when no persisted snapshot exists', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getGroundsourceSnapshot('utility_public');

    expect(result.available).toBe(false);
    expect(result.payload.fallback_reason).toBe('no_snapshot_available');
    expect(result.payload.meta.claim_label).toBe('advisory');
  });

  it('returns a snapshot-read-failed fallback when Supabase returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });

    const result = await getGroundsourceSnapshot('utility_public');

    expect(result.available).toBe(false);
    expect(result.payload.fallback_reason).toBe('snapshot_read_failed');
    expect(result.payload.warnings).toContain(
      'Groundsource snapshot could not be read from Supabase; provenance is advisory only.',
    );
  });

  it('normalizes a persisted snapshot payload for browser rendering', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        summary_payload: {
          source_group: 'utility_public',
          source_count: 3,
          llm_source_count: 2,
          heuristic_source_count: 1,
          extraction_mode: 'mixed',
          fallback_reason: null,
          documents: [{ id: 'doc-1' }],
          events: [{ id: 'event-1' }],
          event_count: 1,
          provenance_score: 0.72,
          meta: {
            generated_at: '2026-04-25T00:00:00.000Z',
            valid_at: '2026-04-25T00:00:00.000Z',
            warnings: ['structured extraction partially fell back'],
            claim_label: 'validated',
          },
        },
        snapshot_stored_at: '2026-04-25T01:00:00.000Z',
        source_updated_at: '2026-04-25T00:00:00.000Z',
        source_label: 'groundsource-miner',
      },
      error: null,
    });

    const result = await getGroundsourceSnapshot('utility_public');

    expect(result.available).toBe(true);
    expect(result.snapshotStoredAt).toBe('2026-04-25T01:00:00.000Z');
    expect(result.payload.source_count).toBe(3);
    expect(result.payload.llm_source_count).toBe(2);
    expect(result.payload.heuristic_source_count).toBe(1);
    expect(result.payload.meta.claim_label).toBe('validated');
    expect(result.payload.meta.warnings).toEqual(['structured extraction partially fell back']);
  });

  it('builds explicit fallback copy for no-snapshot and read-failed states', () => {
    expect(buildGroundsourceSnapshotFallback('utility_public', 'no_snapshot_available').meta.claim_label).toBe('advisory');
    expect(buildGroundsourceSnapshotFallback('utility_public', 'snapshot_read_failed').fallback_reason).toBe('snapshot_read_failed');
  });
});
