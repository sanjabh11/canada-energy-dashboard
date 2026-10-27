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

  it('never writes job_execution_log from the browser client — server-side ops only', async () => {
    // Security contract (RLS hardening): operational telemetry is written only
    // by trusted server-side jobs; the browser anon key must never gain write
    // access. logFallbackEvent must no-op against Supabase even when env is set.
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

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
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
