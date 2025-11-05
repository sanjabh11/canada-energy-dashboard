// Supabase Edge Function: api-v2-hydrogen-hub
// Comprehensive hydrogen economy data: facilities, production, projects, pricing
// Strategic Priority: $300M federal investment, Edmonton/Calgary hubs

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const province = url.searchParams.get('province') || 'AB';
    const hub = url.searchParams.get('hub'); // 'Edmonton Hub' or 'Calgary Hub'
    const hydrogenType = url.searchParams.get('type'); // 'Green', 'Blue', etc.
    const includeTimeseries = url.searchParams.get('timeseries') === 'true';

    // Fetch hydrogen facilities
    let facilitiesQuery = supabase
      .from('hydrogen_facilities')
      .select('*')
      .eq('province', province)
      .order('design_capacity_kg_per_day', { ascending: false });

    if (hub) {
      facilitiesQuery = facilitiesQuery.eq('part_of_hub', hub);
    }
    if (hydrogenType) {
      facilitiesQuery = facilitiesQuery.eq('hydrogen_type', hydrogenType);
    }

    const { data: facilities, error: facilitiesError } = await facilitiesQuery;
    if (facilitiesError) throw facilitiesError;

    // Fetch hydrogen projects
    let projectsQuery = supabase
      .from('hydrogen_projects')
      .select('*')
      .eq('province', province)
      .order('capital_investment_cad', { ascending: false });

    if (hub) {
      projectsQuery = projectsQuery.eq('part_of_hub', hub);
    }

    const { data: projects, error: projectsError } = await projectsQuery;
    if (projectsError) throw projectsError;

    // Fetch infrastructure
    const { data: infrastructure } = await supabase
      .from('hydrogen_infrastructure')
      .select('*')
      .eq('province', province)
      .order('commissioning_date', { ascending: false });

    // Fetch recent production data
    let productionData = null;
    if (includeTimeseries && facilities && facilities.length > 0) {
      const { data: production } = await supabase
        .from('hydrogen_production')
        .select('*')
        .in('facility_id', facilities.map(f => f.id))
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(200);

      productionData = production || [];
    }

    // Fetch latest pricing
    const { data: pricing } = await supabase
      .from('hydrogen_prices')
      .select('*')
      .eq('region', 'Alberta')
      .order('timestamp', { ascending: false })
      .limit(52); // Last year of weekly data

    // Fetch demand forecast
    const { data: demand } = await supabase
      .from('hydrogen_demand')
      .select('*')
      .eq('province', province)
      .eq('is_forecast', true)
      .order('timestamp', { ascending: true })
      .limit(60); // 5 years monthly

    // Calculate summary statistics
    const summary = {
      facilities: {
        total_count: facilities?.length || 0,
        operational_count: facilities?.filter(f => f.status === 'Operational').length || 0,
        total_design_capacity_kg_per_day: facilities?.reduce((sum, f) => sum + (f.design_capacity_kg_per_day || 0), 0) || 0,
        operational_capacity_kg_per_day: facilities?.filter(f => f.status === 'Operational')
          .reduce((sum, f) => sum + (f.actual_capacity_kg_per_day || 0), 0) || 0,
        by_type: getHydrogenTypeBreakdown(facilities || []),
        by_production_method: getProductionMethodBreakdown(facilities || []),
        ccus_integrated_count: facilities?.filter(f => f.ccus_integrated).length || 0,
      },
      projects: {
        total_count: projects?.length || 0,
        total_investment_cad: projects?.reduce((sum, p) => sum + (p.capital_investment_cad || 0), 0) || 0,
        federal_funding_cad: projects?.reduce((sum, p) => sum + (p.federal_funding_cad || 0), 0) || 0,
        by_status: getProjectStatusBreakdown(projects || []),
        by_type: getProjectTypeBreakdown(projects || []),
      },
      infrastructure: {
        refueling_stations: infrastructure?.filter(i => i.infrastructure_type === 'Refueling Station').length || 0,
        pipelines_km: infrastructure?.filter(i => i.infrastructure_type === 'Pipeline')
          .reduce((sum, i) => sum + (i.pipeline_length_km || 0), 0) || 0,
        total_refueling_capacity: infrastructure?.filter(i => i.infrastructure_type === 'Refueling Station')
          .reduce((sum, i) => sum + (i.refueling_capacity_kg_per_day || 0), 0) || 0,
      },
      production: productionData ? {
        recent_daily_average_kg: calculateRecentAverage(productionData),
        average_carbon_intensity: calculateAverageCarbonIntensity(productionData),
        average_efficiency: calculateAverageEfficiency(productionData),
      } : null,
      pricing: pricing && pricing.length > 0 ? {
        current_price_cad_per_kg: pricing[0]?.price_cad_per_kg || null,
        weekly_change_percentage: pricing.length > 1
          ? ((pricing[0].price_cad_per_kg - pricing[1].price_cad_per_kg) / pricing[1].price_cad_per_kg * 100)
          : null,
        yearly_average: pricing.reduce((sum, p) => sum + (p.price_cad_per_kg || 0), 0) / pricing.length,
      } : null,
    };

    const response = {
      facilities: facilities || [],
      projects: projects || [],
      infrastructure: infrastructure || [],
      production: productionData,
      pricing: pricing || [],
      demand_forecast: demand || [],
      summary,
      insights: {
        hub_status: {
          edmonton_hub: {
            capacity_kg_per_day: calculateHubCapacity(facilities || [], 'Edmonton Hub'),
            project_count: projects?.filter(p => p.part_of_hub === 'Edmonton Hub').length || 0,
            investment_cad: projects?.filter(p => p.part_of_hub === 'Edmonton Hub')
              .reduce((sum, p) => sum + (p.capital_investment_cad || 0), 0) || 0,
          },
          calgary_hub: {
            capacity_kg_per_day: calculateHubCapacity(facilities || [], 'Calgary Hub'),
            project_count: projects?.filter(p => p.part_of_hub === 'Calgary Hub').length || 0,
            investment_cad: projects?.filter(p => p.part_of_hub === 'Calgary Hub')
              .reduce((sum, p) => sum + (p.capital_investment_cad || 0), 0) || 0,
          },
        },
        color_distribution: {
          green_percentage: calculateColorPercentage(facilities || [], 'Green'),
          blue_percentage: calculateColorPercentage(facilities || [], 'Blue'),
          grey_percentage: calculateColorPercentage(facilities || [], 'Grey'),
        },
        strategic_projects: {
          air_products_complex: projects?.find(p => p.id === 'h2proj-003') || null,
          azetec_trucks: projects?.find(p => p.id === 'h2proj-001') || null,
          calgary_banff_rail: projects?.find(p => p.id === 'h2proj-002') || null,
        }
      },
      metadata: {
        province,
        last_updated: new Date().toISOString(),
        data_source: 'Canada Energy Dashboard',
        strategic_context: '$300M federal investment, Edmonton/Calgary hydrogen hubs',
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('Hydrogen Hub API error:', err);
    return new Response(JSON.stringify({
      error: String(err),
      message: 'Failed to fetch hydrogen economy data'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});

function getHydrogenTypeBreakdown(facilities: any[]) {
  const breakdown: Record<string, { count: number; capacity_kg_per_day: number }> = {};
  facilities.forEach(f => {
    const type = f.hydrogen_type || 'Unknown';
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, capacity_kg_per_day: 0 };
    }
    breakdown[type].count += 1;
    breakdown[type].capacity_kg_per_day += f.design_capacity_kg_per_day || 0;
  });
  return breakdown;
}

function getProductionMethodBreakdown(facilities: any[]) {
  const breakdown: Record<string, number> = {};
  facilities.forEach(f => {
    const method = f.production_method || 'Unknown';
    breakdown[method] = (breakdown[method] || 0) + 1;
  });
  return breakdown;
}

function getProjectStatusBreakdown(projects: any[]) {
  const breakdown: Record<string, number> = {};
  projects.forEach(p => {
    const status = p.status || 'Unknown';
    breakdown[status] = (breakdown[status] || 0) + 1;
  });
  return breakdown;
}

function getProjectTypeBreakdown(projects: any[]) {
  const breakdown: Record<string, number> = {};
  projects.forEach(p => {
    const type = p.project_type || 'Unknown';
    breakdown[type] = (breakdown[type] || 0) + 1;
  });
  return breakdown;
}

function calculateRecentAverage(productionData: any[]) {
  if (!productionData || productionData.length === 0) return 0;
  const totalProduction = productionData.reduce((sum, p) => sum + (p.production_kg || 0), 0);
  return Math.round(totalProduction / productionData.length);
}

function calculateAverageCarbonIntensity(productionData: any[]) {
  const withCI = productionData.filter(p => p.carbon_intensity_kg_co2_per_kg_h2 != null);
  if (withCI.length === 0) return null;
  const avgCI = withCI.reduce((sum, p) => sum + p.carbon_intensity_kg_co2_per_kg_h2, 0) / withCI.length;
  return Math.round(avgCI * 100) / 100;
}

function calculateAverageEfficiency(productionData: any[]) {
  const withEff = productionData.filter(p => p.production_efficiency_percentage != null);
  if (withEff.length === 0) return null;
  const avgEff = withEff.reduce((sum, p) => sum + p.production_efficiency_percentage, 0) / withEff.length;
  return Math.round(avgEff * 10) / 10;
}

function calculateHubCapacity(facilities: any[], hub: string) {
  return facilities
    .filter(f => f.part_of_hub === hub)
    .reduce((sum, f) => sum + (f.design_capacity_kg_per_day || 0), 0);
}

function calculateColorPercentage(facilities: any[], color: string) {
  const totalCapacity = facilities.reduce((sum, f) => sum + (f.design_capacity_kg_per_day || 0), 0);
  if (totalCapacity === 0) return 0;

  const colorCapacity = facilities
    .filter(f => f.hydrogen_type === color)
    .reduce((sum, f) => sum + (f.design_capacity_kg_per_day || 0), 0);

  return Math.round((colorCapacity / totalCapacity) * 100);
}
