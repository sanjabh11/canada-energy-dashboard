// Supabase Edge Function: api-v2-aeso-queue
// Fetches AESO interconnection queue data with focus on AI data centres
// Critical for tracking Alberta's 10GW+ interconnection requests

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  validateEnum,
  getCorsHeaders,
  errorResponse
} from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Validation constants
const VALID_PROJECT_TYPES = ['AI Data Centre', 'Wind', 'Solar', 'Battery Storage', 'Natural Gas', 'Hydrogen', 'Other'] as const;
const VALID_STUDY_PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'System Impact Study', 'Facility Study', 'Completed'] as const;
const VALID_REGIONS = ['Calgary', 'Edmonton', 'Central', 'South', 'North', 'Northwest', 'Northeast'] as const;
const VALID_STATUSES = ['Active', 'Inactive', 'Completed', 'Withdrawn', 'On Hold'] as const;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);

    // Validate input parameters
    const projectType = validateEnum(url.searchParams.get('project_type'), VALID_PROJECT_TYPES, true);
    const studyPhase = validateEnum(url.searchParams.get('study_phase'), VALID_STUDY_PHASES, true);
    const region = validateEnum(url.searchParams.get('region'), VALID_REGIONS, true);
    const status = validateEnum(url.searchParams.get('status'), VALID_STATUSES, false) || 'Active';

    // Fetch interconnection queue projects
    let queueQuery = supabase
      .from('aeso_interconnection_queue')
      .select('*')
      .eq('status', status)
      .order('requested_capacity_mw', { ascending: false });

    if (projectType) {
      queueQuery = queueQuery.eq('project_type', projectType);
    }
    if (studyPhase) {
      queueQuery = queueQuery.eq('study_phase', studyPhase);
    }
    if (region) {
      queueQuery = queueQuery.eq('region', region);
    }

    const { data: queue, error: queueError } = await queueQuery;

    if (queueError) throw queueError;

    // Calculate queue statistics
    const totalRequestedMW = queue?.reduce((sum, p) => sum + (p.requested_capacity_mw || 0), 0) || 0;
    const phase1AllocatedMW = queue?.filter(p => p.phase_allocation === 'Phase 1 (1200 MW)')
      .reduce((sum, p) => sum + (p.allocated_capacity_mw || 0), 0) || 0;

    // Queue by project type
    const byType = getTypeBreakdown(queue || []);

    // Phase 1 vs Phase 2 breakdown
    const phaseBreakdown = getPhaseBreakdown(queue || []);

    // Regional distribution
    const regionalBreakdown = getRegionalBreakdown(queue || []);

    // Study phase distribution
    const studyPhaseBreakdown = getStudyPhaseBreakdown(queue || []);

    // Calculate wait times and cost estimates
    const avgWaitTime = calculateAverageWaitTime(queue || []);
    const totalNetworkUpgradeCost = queue?.reduce((sum, p) => sum + (p.estimated_network_upgrade_cost_cad || 0), 0) || 0;

    const response = {
      queue: queue || [],
      summary: {
        total_projects: queue?.length || 0,
        total_requested_mw: totalRequestedMW,
        phase1_allocated_mw: phase1AllocatedMW,
        phase1_remaining_mw: Math.max(0, 1200 - phase1AllocatedMW),
        total_network_upgrade_cost_cad: totalNetworkUpgradeCost,
        average_wait_time_days: avgWaitTime,
        by_type: byType,
        by_phase: phaseBreakdown,
        by_region: regionalBreakdown,
        by_study_phase: studyPhaseBreakdown,
      },
      insights: {
        data_centre_dominance: {
          dc_projects: byType['AI Data Centre']?.count || 0,
          dc_mw: byType['AI Data Centre']?.total_mw || 0,
          dc_percentage_of_queue: totalRequestedMW > 0
            ? Math.round((byType['AI Data Centre']?.total_mw || 0) / totalRequestedMW * 100)
            : 0,
        },
        phase1_allocation_status: {
          limit_mw: 1200,
          allocated_mw: phase1AllocatedMW,
          remaining_mw: Math.max(0, 1200 - phase1AllocatedMW),
          utilization_percentage: Math.round((phase1AllocatedMW / 1200) * 100),
          is_fully_allocated: phase1AllocatedMW >= 1200,
        },
        grid_reliability_concern: {
          queue_to_peak_ratio: Math.round((totalRequestedMW / 12100) * 100), // 12100 MW = current Alberta peak
          message: totalRequestedMW > 12000
            ? 'Queue exceeds current provincial peak demand - major grid expansion needed'
            : totalRequestedMW > 6000
            ? 'Queue represents significant portion of provincial demand - reliability planning critical'
            : 'Queue manageable relative to grid capacity',
        }
      },
      metadata: {
        last_updated: new Date().toISOString(),
        data_source: 'AESO Interconnection Queue',
        strategic_context: 'AESO June 2025 phased connection strategy (1,200 MW Phase 1 limit)',
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('AESO Queue API error:', err);
    return errorResponse('Failed to fetch AESO interconnection queue data', corsHeaders, 500, err);
  }
});

function getTypeBreakdown(queue: any[]) {
  const breakdown: Record<string, { count: number; total_mw: number }> = {};
  queue.forEach(p => {
    const type = p.project_type || 'Unknown';
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, total_mw: 0 };
    }
    breakdown[type].count += 1;
    breakdown[type].total_mw += p.requested_capacity_mw || 0;
  });
  return breakdown;
}

function getPhaseBreakdown(queue: any[]) {
  const breakdown: Record<string, { count: number; total_mw: number; allocated_mw: number }> = {};
  queue.forEach(p => {
    const phase = p.phase_allocation || 'Not Allocated';
    if (!breakdown[phase]) {
      breakdown[phase] = { count: 0, total_mw: 0, allocated_mw: 0 };
    }
    breakdown[phase].count += 1;
    breakdown[phase].total_mw += p.requested_capacity_mw || 0;
    breakdown[phase].allocated_mw += p.allocated_capacity_mw || 0;
  });
  return breakdown;
}

function getRegionalBreakdown(queue: any[]) {
  const breakdown: Record<string, { count: number; total_mw: number }> = {};
  queue.forEach(p => {
    const region = p.region || 'Unknown';
    if (!breakdown[region]) {
      breakdown[region] = { count: 0, total_mw: 0 };
    }
    breakdown[region].count += 1;
    breakdown[region].total_mw += p.requested_capacity_mw || 0;
  });
  return breakdown;
}

function getStudyPhaseBreakdown(queue: any[]) {
  const breakdown: Record<string, { count: number; total_mw: number }> = {};
  queue.forEach(p => {
    const phase = p.study_phase || 'Unknown';
    if (!breakdown[phase]) {
      breakdown[phase] = { count: 0, total_mw: 0 };
    }
    breakdown[phase].count += 1;
    breakdown[phase].total_mw += p.requested_capacity_mw || 0;
  });
  return breakdown;
}

function calculateAverageWaitTime(queue: any[]) {
  const projectsWithDates = queue.filter(p =>
    p.submission_date && p.expected_study_completion
  );

  if (projectsWithDates.length === 0) return null;

  const waitTimes = projectsWithDates.map(p => {
    const submit = new Date(p.submission_date).getTime();
    const complete = new Date(p.expected_study_completion).getTime();
    return (complete - submit) / (1000 * 60 * 60 * 24); // Convert to days
  });

  const avgWaitDays = waitTimes.reduce((sum, days) => sum + days, 0) / waitTimes.length;
  return Math.round(avgWaitDays);
}
