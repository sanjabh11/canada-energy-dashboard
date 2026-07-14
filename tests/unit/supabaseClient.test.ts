import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/config', () => ({
  getSupabaseConfig: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { signOut: vi.fn(), getSession: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn() })),
  })),
}));

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates a client with config url and anonKey', async () => {
    const { getSupabaseConfig } = await import('../../src/lib/config');
    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(getSupabaseConfig).mockReturnValue({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    });

    await import('../../src/lib/supabaseClient');

    expect(getSupabaseConfig).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
  });

  it('handles empty config gracefully', async () => {
    const { getSupabaseConfig } = await import('../../src/lib/config');
    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(getSupabaseConfig).mockReturnValue({ url: '', anonKey: '' });

    await import('../../src/lib/supabaseClient');

    expect(createClient).toHaveBeenCalledWith('', '');
  });

  it('exports supabase as a client object', async () => {
    const { getSupabaseConfig } = await import('../../src/lib/config');
    vi.mocked(getSupabaseConfig).mockReturnValue({
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
    });

    const { supabase } = await import('../../src/lib/supabaseClient');
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
