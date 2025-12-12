import { supabase } from './supabaseClient';

export interface CohortStats {
    totalMembers: number;
    activeMembers: number;
    certificatesIssued: number;
    avgCompletion: number;
}

/**
 * Fetch cohort statistics for a creator (edubiz owner)
 */
export async function getCohortStats(userId: string): Promise<CohortStats | null> {
    if (!userId) return null;

    try {
        // 1. Get all cohorts owned by this user
        const { data: cohorts, error: cohortError } = await supabase
            .from('cohorts')
            .select('id')
            .eq('owner_edubiz_user_id', userId);

        if (cohortError || !cohorts || cohorts.length === 0) {
            return {
                totalMembers: 0,
                activeMembers: 0,
                certificatesIssued: 0,
                avgCompletion: 0
            };
        }

        const cohortIds = cohorts.map(c => c.id);

        // 2. Get members stats
        const { data: members, error: memberError } = await supabase
            .from('cohort_members')
            .select('id, completion_status, joined_at')
            .in('cohort_id', cohortIds);

        if (memberError || !members) {
            console.error('Error fetching members for stats:', memberError);
            return null;
        }

        const totalMembers = members.length;

        // Active members: Joined in last 30 days (simple heuristic)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeMembers = members.filter(m =>
            m.joined_at && new Date(m.joined_at) > thirtyDaysAgo
        ).length;

        // Certificates issued: Status is 'certified' (or 'completed')
        const certificatesIssued = members.filter(m =>
            m.completion_status === 'certified' || m.completion_status === 'completed'
        ).length;

        // Avg completion (Mock logic since we don't have granular progress in this table yet)
        // Map status to approximate percentage
        const statusMap: Record<string, number> = {
            'invited': 0,
            'joined': 10,
            'in_progress': 50,
            'completed': 100,
            'certified': 100
        };

        const totalProgress = members.reduce((sum, m) => sum + (statusMap[m.completion_status] || 0), 0);
        const avgCompletion = totalMembers > 0 ? Math.round(totalProgress / totalMembers) : 0;

        return {
            totalMembers,
            activeMembers,
            certificatesIssued,
            avgCompletion
        };

    } catch (error) {
        console.error('Error calculating cohort stats:', error);
        return null;
    }
}
