import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBadgeProgress, type Badge, type UserBadge } from '../../src/lib/gamificationService';

const { supabaseFrom } = vi.hoisted(() => ({ supabaseFrom: vi.fn() }));

vi.mock('../../src/lib/supabaseClient', () => ({
  supabase: { from: supabaseFrom },
}));

const badges: Badge[] = [
  {
    id: 'tour',
    slug: 'first-steps',
    name: 'First Steps',
    description: 'Complete the platform tour',
    tier: 'bronze',
    icon: '🚀',
    criteria: { type: 'tour_complete', required_count: 1 },
    points: 50,
  },
  {
    id: 'module',
    slug: 'module-complete',
    name: 'Module Complete',
    description: 'Complete a learning module',
    tier: 'silver',
    icon: '⚡',
    criteria: { type: 'module_complete', required_count: 3 },
    points: 100,
  },
];

describe('badge progress tracking disclosure', () => {
  beforeEach(() => {
    supabaseFrom.mockImplementation((table: string) => {
      if (table === 'badges') {
        return {
          select: () => ({
            order: () => ({
              order: async () => ({ data: badges, error: null as Error | null }),
            }),
          }),
        };
      }
      if (table === 'user_badges') {
        return {
          select: () => ({
          eq: () => ({ order: async () => ({ data: [] as UserBadge[], error: null as Error | null }) }),
          }),
        };
      }
      if (table === 'edubiz_users') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { tour_completed: false }, error: null as Error | null }) }),
          }),
        };
      }
      throw new Error(`Unexpected Supabase table: ${table}`);
    });
  });

  it('marks every guest sample badge untracked', async () => {
    const result = await getBadgeProgress('guest_preview');
    expect(result.error).toBeNull();
    expect(result.progress.length).toBeGreaterThan(0);
    expect(result.progress.every((badge) => badge.tracked === false)).toBe(true);
    expect(supabaseFrom).not.toHaveBeenCalled();
  });

  it('marks only signed-in badge criteria with a real source as tracked', async () => {
    const result = await getBadgeProgress('member-123');
    expect(result.error).toBeNull();
    expect(result.progress.find((item) => item.badge.id === 'tour')?.tracked).toBe(true);
    expect(result.progress.find((item) => item.badge.id === 'module')?.tracked).toBe(false);
  });
});
