vi.mock('../../src/lib/edge', () => ({
  fetchEdgePostJson: vi.fn(),
  fetchEdgeWithParams: vi.fn(),
}));

vi.mock('../../src/lib/config', () => ({
  isEdgeFetchEnabled: vi.fn(() => true),
}));

import { isEdgeFetchEnabled } from '../../src/lib/config';
import { fetchEdgePostJson, fetchEdgeWithParams } from '../../src/lib/edge';
import {
  getHistory,
  getTransitionAnalyticsInsight,
  getTransitionReport,
} from '../../src/lib/llmClient';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isEdgeFetchEnabled).mockReturnValue(true);
});

describe('llmClient', () => {
  it('unwraps result payloads from transition report responses', async () => {
    vi.mocked(fetchEdgePostJson).mockResolvedValue({
      json: {
        result: { summary: 'transition summary' },
        meta: {
          dataset: 'ontario_demand',
          source: 'supabase-llm/transition-report',
          freshness: '2026-03-24T00:00:00.000Z',
          generated_at: '2026-03-24T00:01:00.000Z',
          is_fallback: false,
          llm_mode: 'active',
          source_count: 1,
        },
      },
      response: {} as Response,
    });

    const result = await getTransitionReport('ontario_demand', '30d');
    const [paths, body, options] = vi.mocked(fetchEdgePostJson).mock.calls[0];

    expect(result.summary).toBe('transition summary');
    expect(result.meta?.source).toBe('supabase-llm/transition-report');
    expect(result.meta?.is_fallback).toBe(false);
    expect(paths).toEqual(expect.arrayContaining(['llm/transition-report', 'llm-lite/transition-report']));
    expect(body).toEqual({ datasetPath: 'ontario_demand', timeframe: '30d' });
    expect(options).toEqual({});
  });

  it('returns the offline analytics payload when edge fetch is disabled', async () => {
    vi.mocked(isEdgeFetchEnabled).mockReturnValue(false);

    const result = await getTransitionAnalyticsInsight('ontario_demand', '7d');

    expect(result.confidence).toBe('offline-mode');
    expect(result.meta?.source).toBe('client-offline-mode');
    expect(result.meta?.is_fallback).toBe(true);
    expect(fetchEdgePostJson).not.toHaveBeenCalled();
  });

  it('unwraps history arrays from edge responses', async () => {
    vi.mocked(fetchEdgeWithParams).mockResolvedValue({
      json: async () => ({
        result: [{ endpoint: 'history' }],
        meta: {
          source: 'supabase-llm/history',
          freshness: '2026-03-24T00:00:00.000Z',
          generated_at: '2026-03-24T00:01:00.000Z',
          is_fallback: false,
          llm_mode: 'history',
          source_count: 0,
        },
      }),
    } as Response);

    const result = await getHistory({ datasetPath: 'ontario_demand', limit: 2 });
    const [paths, params, options] = vi.mocked(fetchEdgeWithParams).mock.calls[0];

    expect(Array.from(result)).toEqual([{ endpoint: 'history' }]);
    expect((result as typeof result & { meta?: { source?: string } }).meta?.source).toBe('supabase-llm/history');
    expect(paths).toEqual(expect.arrayContaining(['llm/history', 'llm-lite/history']));
    expect(params).toEqual({ datasetPath: 'ontario_demand', limit: '2' });
    expect(options).toEqual({});
  });
});
