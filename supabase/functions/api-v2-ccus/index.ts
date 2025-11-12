// Supabase Edge Function: api-v2-ccus
// Comprehensive CCUS project data: facilities, pipelines, storage, Pathways Alliance
// Strategic Priority: Alberta's $30B CCUS corridor, Pathways Alliance $16.5B proposal

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  validateProvince,
  validateEnum,
  getCorsHeaders,
  errorResponse
} from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Validation constants
const VALID_CCUS_STATUSES = ['Proposed', 'Under Development', 'Under Construction', 'Commissioning', 'Operational', 'Paused', 'Decommissioned'] as const;
const VALID_PATHWAYS_STATUSES = ['Proposed', 'Awaiting Federal Decision', 'Approved', 'Under Construction', 'Operational', 'On Hold', 'Cancelled'] as const;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    // Route to specific endpoints
    if (endpoint === 'pathways') {
      return await handlePathwaysAlliance(corsHeaders);
    } else if (endpoint === 'pipelines') {
      return await handlePipelines(corsHeaders);
    } else if (endpoint === 'storage') {
      return await handleStorage(corsHeaders);
    } else if (endpoint === 'economics') {
      return await handleEconomics(corsHeaders);
    } else {
      // Default: comprehensive dashboard data
      return await handleDashboard(url, corsHeaders);
    }

  } catch (error: any) {
    console.error('CCUS API Error:', error);
    return errorResponse(
      'Internal server error',
      500,
      corsHeaders,
      { error: error.message }
    );
  }
});

/**
 * Main dashboard endpoint - comprehensive CCUS data
 */
async function handleDashboard(url: URL, corsHeaders: Record<string, string>) {
  const province = validateProvince(url.searchParams.get('province'), 'AB');
  const status = validateEnum(url.searchParams.get('status'), VALID_CCUS_STATUSES, true);

  // Fetch facilities
  let facilitiesQuery = supabase
    .from('ccus_facilities')
    .select('*')
    .eq('province', province)
    .order('design_capture_capacity_mt_per_year', { ascending: false });

  if (status) {
    facilitiesQuery = facilitiesQuery.eq('status', status);
  }

  const { data: facilities, error: facilitiesError } = await facilitiesQuery;

  if (facilitiesError) {
    return errorResponse('Failed to fetch CCUS facilities', 500, corsHeaders, facilitiesError);
  }

  // Fetch Pathways Alliance projects
  const { data: pathways, error: pathwaysError } = await supabase
    .from('pathways_alliance_projects')
    .select('*')
    .order('capex_cad', { ascending: false });

  if (pathwaysError) {
    return errorResponse('Failed to fetch Pathways Alliance data', 500, corsHeaders, pathwaysError);
  }

  // Fetch pipelines
  const { data: pipelines, error: pipelinesError } = await supabase
    .from('ccus_pipelines')
    .select('*')
    .order('design_capacity_mt_per_year', { ascending: false });

  if (pipelinesError) {
    console.error('Pipeline fetch error:', pipelinesError);
  }

  // Fetch storage sites
  const { data: storage, error: storageError } = await supabase
    .from('ccus_storage_sites')
    .select('*')
    .eq('province', province)
    .order('remaining_capacity_mt', { ascending: false });

  if (storageError) {
    console.error('Storage fetch error:', storageError);
  }

  // Calculate summary statistics
  const summary = calculateSummary(facilities || [], pathways || [], storage || []);

  const response = {
    facilities: facilities || [],
    pathways_alliance: {
      total_investment: pathways?.reduce((sum, p) => sum + (p.capex_cad || 0), 0) || 0,
      total_capacity: pathways?.reduce((sum, p) => sum + (p.capture_capacity_mt_per_year || 0), 0) || 0,
      federal_tax_credit_requested: pathways?.reduce((sum, p) => sum + (p.federal_tax_credit_requested_cad || 0), 0) || 0,
      projects: pathways || [],
      project_count: pathways?.length || 0,
      member_companies: [...new Set(pathways?.map(p => p.member_company) || [])].length
    },
    pipelines: pipelines || [],
    storage_sites: storage || [],
    summary,
    metadata: {
      timestamp: new Date().toISOString(),
      province,
      status_filter: status
    }
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Pathways Alliance specific endpoint
 */
async function handlePathwaysAlliance(corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('pathways_alliance_projects')
    .select('*')
    .order('capex_cad', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch Pathways Alliance data', 500, corsHeaders, error);
  }

  // Group by company
  const byCompany = data.reduce((acc: any, project: any) => {
    const company = project.member_company;
    if (!acc[company]) {
      acc[company] = {
        company,
        projects: [],
        total_investment: 0,
        total_capacity: 0
      };
    }
    acc[company].projects.push(project);
    acc[company].total_investment += project.capex_cad || 0;
    acc[company].total_capacity += project.capture_capacity_mt_per_year || 0;
    return acc;
  }, {});

  const response = {
    total_investment: data.reduce((sum, p) => sum + (p.capex_cad || 0), 0),
    total_capacity: data.reduce((sum, p) => sum + (p.capture_capacity_mt_per_year || 0), 0),
    federal_tax_credit_requested: data.reduce((sum, p) => sum + (p.federal_tax_credit_requested_cad || 0), 0),
    member_companies: Object.values(byCompany),
    projects: data,
    status_breakdown: groupByStatus(data),
    metadata: {
      timestamp: new Date().toISOString(),
      project_count: data.length,
      unique_companies: Object.keys(byCompany).length
    }
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Pipelines endpoint
 */
async function handlePipelines(corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('ccus_pipelines')
    .select('*')
    .order('design_capacity_mt_per_year', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch pipeline data', 500, corsHeaders, error);
  }

  const response = {
    pipelines: data,
    summary: {
      total_capacity: data.reduce((sum, p) => sum + (p.design_capacity_mt_per_year || 0), 0),
      total_length_km: data.reduce((sum, p) => sum + (p.total_length_km || 0), 0),
      total_investment: data.reduce((sum, p) => sum + (p.capital_cost_cad || 0), 0),
      operational_count: data.filter((p: any) => p.status === 'Operational').length
    },
    metadata: {
      timestamp: new Date().toISOString(),
      count: data.length
    }
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Storage sites endpoint
 */
async function handleStorage(corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('ccus_storage_sites')
    .select('*')
    .order('remaining_capacity_mt', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch storage data', 500, corsHeaders, error);
  }

  const response = {
    storage_sites: data,
    summary: {
      total_capacity: data.reduce((sum, s) => sum + (s.total_storage_capacity_mt || 0), 0),
      cumulative_stored: data.reduce((sum, s) => sum + (s.cumulative_injected_mt || 0), 0),
      remaining_capacity: data.reduce((sum, s) => sum + (s.remaining_capacity_mt || 0), 0),
      utilization_percent: calculateUtilization(data)
    },
    metadata: {
      timestamp: new Date().toISOString(),
      site_count: data.length
    }
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Economics endpoint
 */
async function handleEconomics(corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('ccus_economics')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    return errorResponse('Failed to fetch economics data', 500, corsHeaders, error);
  }

  const response = {
    economics: data,
    summary: {
      total_federal_tax_credits: data.reduce((sum, e) => sum + (e.federal_tax_credit_cad || 0), 0),
      total_carbon_credit_revenue: data.reduce((sum, e) => sum + (e.carbon_credit_revenue_cad || 0), 0),
      average_capture_cost_per_tonne: calculateAverage(data, 'capture_cost_per_tonne_cad')
    },
    metadata: {
      timestamp: new Date().toISOString(),
      years_covered: [...new Set(data.map(e => e.year))].sort()
    }
  };

  return new Response(
    JSON.stringify(response),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Calculate summary statistics
 */
function calculateSummary(facilities: any[], pathways: any[], storage: any[]) {
  const operationalFacilities = facilities.filter(f => f.status === 'Operational');
  const proposedFacilities = facilities.filter(f => f.status === 'Proposed');

  return {
    total_operational_capacity_mt: operationalFacilities.reduce((sum, f) => sum + (f.current_capture_capacity_mt_per_year || 0), 0),
    total_proposed_capacity_mt: proposedFacilities.reduce((sum, f) => sum + (f.design_capture_capacity_mt_per_year || 0), 0) +
                                  pathways.reduce((sum, p) => sum + (p.capture_capacity_mt_per_year || 0), 0),
    total_cumulative_stored_mt: facilities.reduce((sum, f) => sum + (f.cumulative_stored_mt || 0), 0),
    total_storage_capacity_mt: storage.reduce((sum, s) => sum + (s.total_storage_capacity_mt || 0), 0),
    total_federal_investment: facilities.reduce((sum, f) => sum + (f.federal_tax_credit_value_cad || 0), 0),
    pathways_total_investment: pathways.reduce((sum, p) => sum + (p.capex_cad || 0), 0),
    facility_count: {
      operational: operationalFacilities.length,
      under_construction: facilities.filter(f => f.status === 'Under Construction').length,
      proposed: proposedFacilities.length,
      total: facilities.length
    }
  };
}

/**
 * Group projects by status
 */
function groupByStatus(data: any[]) {
  return data.reduce((acc: any, item: any) => {
    const status = item.status;
    if (!acc[status]) {
      acc[status] = { count: 0, total_investment: 0, total_capacity: 0 };
    }
    acc[status].count++;
    acc[status].total_investment += item.capex_cad || 0;
    acc[status].total_capacity += item.capture_capacity_mt_per_year || 0;
    return acc;
  }, {});
}

/**
 * Calculate storage utilization percentage
 */
function calculateUtilization(storage: any[]): number {
  const total = storage.reduce((sum, s) => sum + (s.total_storage_capacity_mt || 0), 0);
  const stored = storage.reduce((sum, s) => sum + (s.cumulative_injected_mt || 0), 0);
  return total > 0 ? (stored / total) * 100 : 0;
}

/**
 * Calculate average of a numeric field
 */
function calculateAverage(data: any[], field: string): number {
  const values = data.map(d => d[field]).filter(v => v != null && v > 0);
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}
