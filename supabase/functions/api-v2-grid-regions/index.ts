// Supabase Edge Function: api-v2-grid-regions
// Serves Canadian grid regions reference data from database
// Replaces hardcoded arrays in realDataService.ts and enhancedDataService.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  validateProvince,
  getCorsHeaders,
  errorResponse
} from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);

    // Validate input parameters
    const province = url.searchParams.get('province')
      ? validateProvince(url.searchParams.get('province'))
      : null;
    const includeInactive = url.searchParams.get('include_inactive') === 'true';

    // Build query
    let query = supabase
      .from('grid_regions')
      .select('*')
      .order('base_load_mw', { ascending: false });

    // Filter by province if specified
    if (province) {
      query = query.eq('province_code', province);
    }

    // Filter active only unless specified otherwise
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: regions, error: regionsError } = await query;

    if (regionsError) throw regionsError;

    // Calculate summary statistics
    const summary = {
      total_regions: regions?.length || 0,
      total_capacity_mw: regions?.reduce((sum, r) => sum + (r.design_capacity_mw || 0), 0) || 0,
      total_base_load_mw: regions?.reduce((sum, r) => sum + (r.base_load_mw || 0), 0) || 0,
      total_peak_load_mw: regions?.reduce((sum, r) => sum + (r.peak_load_mw || 0), 0) || 0,
      avg_renewable_percentage: regions && regions.length > 0
        ? regions.reduce((sum, r) => sum + (r.renewable_percentage || 0), 0) / regions.length
        : 0,
      by_operator: getOperatorBreakdown(regions || []),
      renewable_leaders: getTopRenewableRegions(regions || []),
      capacity_leaders: getTopCapacityRegions(regions || []),
    };

    const response = {
      regions: regions || [],
      summary,
      metadata: {
        last_updated: new Date().toISOString(),
        data_source: 'Grid Operators (IESO, AESO, Hydro-Québec, BC Hydro, etc.)',
        notes: 'Reference data for Canadian electricity grid regions',
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('Grid Regions API error:', err);
    return errorResponse('Failed to fetch grid regions data', 500, corsHeaders, err);
  }
});

function getOperatorBreakdown(regions: any[]) {
  const breakdown: Record<string, { count: number; total_capacity_mw: number }> = {};
  regions.forEach(r => {
    const operator = r.grid_operator || 'Unknown';
    if (!breakdown[operator]) {
      breakdown[operator] = { count: 0, total_capacity_mw: 0 };
    }
    breakdown[operator].count += 1;
    breakdown[operator].total_capacity_mw += r.design_capacity_mw || 0;
  });
  return breakdown;
}

function getTopRenewableRegions(regions: any[]) {
  return regions
    .sort((a, b) => (b.renewable_percentage || 0) - (a.renewable_percentage || 0))
    .slice(0, 5)
    .map(r => ({
      region: r.region_name,
      province: r.province_code,
      renewable_percentage: r.renewable_percentage,
      hydro_percentage: r.hydro_percentage,
      wind_percentage: r.wind_percentage,
      solar_percentage: r.solar_percentage,
    }));
}

function getTopCapacityRegions(regions: any[]) {
  return regions
    .sort((a, b) => (b.design_capacity_mw || 0) - (a.design_capacity_mw || 0))
    .slice(0, 5)
    .map(r => ({
      region: r.region_name,
      province: r.province_code,
      capacity_mw: r.design_capacity_mw,
      base_load_mw: r.base_load_mw,
      peak_load_mw: r.peak_load_mw,
    }));
}
