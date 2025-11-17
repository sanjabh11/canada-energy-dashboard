/**
 * Gamification Service
 *
 * Handles badge checking, awarding, and progress tracking for the educational gamification system.
 * Integrates with Supabase database tables: badges, user_badges
 */

import { supabase } from './supabaseClient';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  criteria: {
    type: 'module_complete' | 'tour_complete' | 'certificate_complete' | 'webinar_attend' | 'streak_days';
    required_count?: number;
    specific_ids?: string[];
  };
  points: number;
  created_at?: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  progress_data?: {
    current?: number;
    total?: number;
    completed_ids?: string[];
  };
  badge?: Badge;
}

export interface BadgeProgress {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<{ badges: Badge[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('tier', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return { badges: data || [], error: null };
  } catch (error) {
    console.error('Error fetching badges:', error);
    return { badges: [], error: error as Error };
  }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<{ userBadges: UserBadge[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    return { userBadges: data || [], error: null };
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return { userBadges: [], error: error as Error };
  }
}

/**
 * Get badge progress for a user across all badges
 */
export async function getBadgeProgress(userId: string): Promise<{ progress: BadgeProgress[]; error: Error | null }> {
  try {
    // Fetch all badges
    const { badges, error: badgesError } = await getAllBadges();
    if (badgesError) throw badgesError;

    // Fetch user's earned badges
    const { userBadges, error: userBadgesError } = await getUserBadges(userId);
    if (userBadgesError) throw userBadgesError;

    // Fetch user's progress data
    const { data: edubizUser, error: userError } = await supabase
      .from('edubiz_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError) throw userError;

    // Calculate progress for each badge
    const progress: BadgeProgress[] = badges.map(badge => {
      const userBadge = userBadges.find(ub => ub.badge_id === badge.id);

      if (userBadge) {
        // Badge already earned
        return {
          badge,
          earned: true,
          earnedAt: userBadge.earned_at,
          progress: {
            current: badge.criteria.required_count || 1,
            total: badge.criteria.required_count || 1,
            percentage: 100
          }
        };
      }

      // Calculate current progress based on criteria type
      let current = 0;
      const total = badge.criteria.required_count || 1;

      switch (badge.criteria.type) {
        case 'tour_complete':
          // Check if tour completion is tracked (you'll implement this)
          current = edubizUser?.tour_completed ? 1 : 0;
          break;
        case 'module_complete':
          // Count completed modules (you'll implement this)
          current = 0; // TODO: Implement module tracking
          break;
        case 'certificate_complete':
          // Count completed certificates
          current = 0; // TODO: Implement certificate tracking
          break;
        case 'webinar_attend':
          // Count attended webinars
          current = 0; // TODO: Implement webinar tracking
          break;
        case 'streak_days':
          // Calculate login streak
          current = 0; // TODO: Implement streak tracking
          break;
      }

      return {
        badge,
        earned: false,
        progress: {
          current: Math.min(current, total),
          total,
          percentage: Math.min((current / total) * 100, 100)
        }
      };
    });

    return { progress, error: null };
  } catch (error) {
    console.error('Error calculating badge progress:', error);
    return { progress: [], error: error as Error };
  }
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId: string,
  badgeSlug: string,
  progressData?: { current?: number; total?: number; completed_ids?: string[] }
): Promise<{ userBadge: UserBadge | null; alreadyEarned: boolean; error: Error | null }> {
  try {
    // Get badge by slug
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('*')
      .eq('slug', badgeSlug)
      .single();

    if (badgeError) throw badgeError;
    if (!badge) throw new Error(`Badge not found: ${badgeSlug}`);

    // Check if user already has this badge
    const { data: existing, error: existingError } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .single();

    if (existing) {
      return { userBadge: null, alreadyEarned: true, error: null };
    }

    // Award the badge
    const { data: userBadge, error: insertError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id,
        progress_data: progressData || {}
      })
      .select(`
        *,
        badge:badges(*)
      `)
      .single();

    if (insertError) throw insertError;

    return { userBadge, alreadyEarned: false, error: null };
  } catch (error) {
    console.error('Error awarding badge:', error);
    return { userBadge: null, alreadyEarned: false, error: error as Error };
  }
}

/**
 * Check if user should earn a badge based on an event
 * This is the main function to call after user actions
 */
export async function checkAndAwardBadge(
  userId: string,
  eventType: 'tour_complete' | 'module_complete' | 'certificate_complete' | 'webinar_attend' | 'login',
  eventData?: { moduleId?: string; certificateId?: string; webinarId?: string }
): Promise<{ awarded: boolean; badge?: Badge; error: Error | null }> {
  try {
    // Get all badges that match this event type
    const { data: matchingBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('criteria->>type', eventType);

    if (badgesError) throw badgesError;
    if (!matchingBadges || matchingBadges.length === 0) {
      return { awarded: false, error: null };
    }

    // Get user's current badges
    const { userBadges, error: userBadgesError } = await getUserBadges(userId);
    if (userBadgesError) throw userBadgesError;

    const earnedBadgeIds = userBadges.map(ub => ub.badge_id);

    // Check each matching badge
    for (const badge of matchingBadges) {
      // Skip if already earned
      if (earnedBadgeIds.includes(badge.id)) continue;

      // Check if criteria is met
      let criteriaMet = false;

      switch (eventType) {
        case 'tour_complete':
          criteriaMet = true; // Tour completion is a one-time event
          break;
        case 'module_complete':
          // TODO: Check if required number of modules completed
          criteriaMet = false;
          break;
        case 'certificate_complete':
          // TODO: Check if required certificate completed
          criteriaMet = false;
          break;
        case 'webinar_attend':
          // TODO: Check if required number of webinars attended
          criteriaMet = false;
          break;
        case 'login':
          // TODO: Check login streak
          criteriaMet = false;
          break;
      }

      if (criteriaMet) {
        const { userBadge, alreadyEarned, error: awardError } = await awardBadge(
          userId,
          badge.slug
        );

        if (awardError) throw awardError;
        if (!alreadyEarned && userBadge) {
          return { awarded: true, badge: userBadge.badge as Badge, error: null };
        }
      }
    }

    return { awarded: false, error: null };
  } catch (error) {
    console.error('Error checking and awarding badge:', error);
    return { awarded: false, error: error as Error };
  }
}

/**
 * Get badge tier configuration for display
 */
export function getBadgeTierConfig(tier: 'bronze' | 'silver' | 'gold' | 'platinum') {
  const configs = {
    bronze: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-orange-600',
      icon: '🥉'
    },
    silver: {
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      gradientFrom: 'from-slate-400',
      gradientTo: 'to-slate-600',
      icon: '🥈'
    },
    gold: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      gradientFrom: 'from-yellow-400',
      gradientTo: 'to-yellow-600',
      icon: '🥇'
    },
    platinum: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-300',
      gradientFrom: 'from-purple-400',
      gradientTo: 'to-purple-600',
      icon: '💎'
    }
  };

  return configs[tier] || configs.bronze;
}
