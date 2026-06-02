import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));
  return { insert, from };
});

vi.mock('../../src/lib/supabaseClient', () => ({
  supabase: { from: mockSupabase.from },
}));

import { logFallbackEvent } from '../../src/lib/jobExecutionLog';

describe('job execution fallback telemetry', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key');
    mockSupabase.insert.mockReset();
    mockSupabase.from.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('writes fallback telemetry to job_execution_log with provenance metadata', async () => {
    mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null });

    await logFallbackEvent({
      jobName: 'ml-forecast:dispatch-runtime',
      reason: 'dispatch_runtime_heuristic',
      source: 'local_dispatch_runtime',
      domain: 'dispatch',
      modelVersion: 'pinn-dispatch-v2',
      metadata: {
        claim_label: 'advisory',
      },
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('job_execution_log');
    expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    const payload = mockSupabase.insert.mock.calls[0][0];
    expect(payload.job_type).toBe('fallback');
    expect(payload.status).toBe('success');
    expect(payload.metadata).toMatchObject({
      fallback: true,
      source: 'local_dispatch_runtime',
      reason: 'dispatch_runtime_heuristic',
      domain: 'dispatch',
      model_version: 'pinn-dispatch-v2',
      claim_label: 'advisory',
    });
  });

  it('swallows telemetry write failures so fallback paths stay non-blocking', async () => {
    mockSupabase.insert.mockRejectedValueOnce(new Error('write failed'));

    await expect(
      logFallbackEvent({
        jobName: 'ml-forecast:dispatch-runtime',
        reason: 'dispatch_runtime_heuristic',
      }),
    ).resolves.toBeUndefined();
  });

  it('no-ops when Supabase telemetry config is absent', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(
      logFallbackEvent({
        jobName: 'ml-forecast:dispatch-runtime',
        reason: 'dispatch_runtime_heuristic',
      }),
    ).resolves.toBeUndefined();

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });
});
