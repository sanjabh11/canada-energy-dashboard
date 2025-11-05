// Supabase Edge Function: api-v2-minerals-supply-chain
// Enhanced critical minerals supply chain intelligence with pricing, trade flows, and battery integration
// Strategic Priority: $6.4B federal investment, 30% tax credit, national security priority

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PRIORITY_MINERALS = ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Copper', 'Rare Earth Elements'];

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
    const mineral = url.searchParams.get('mineral');
    const province = url.searchParams.get('province');
    const priorityOnly = url.searchParams.get('priority') === 'true';

    // Fetch critical minerals projects
    let projectsQuery = supabase
      .from('critical_minerals_projects')
      .select('*')
      .order('design_capacity_tonnes_per_year', { ascending: false });

    if (mineral) {
      projectsQuery = projectsQuery.eq('primary_mineral', mineral);
    }
    if (province) {
      projectsQuery = projectsQuery.eq('province', province);
    }
    if (priorityOnly) {
      projectsQuery = projectsQuery.eq('is_priority_mineral', true);
    }

    const { data: projects, error: projectsError } = await projectsQuery;
    if (projectsError) throw projectsError;

    // Fetch supply chain stages
    let supplyChainQuery = supabase
      .from('minerals_supply_chain')
      .select('*')
      .order('stage');

    if (mineral) {
      supplyChainQuery = supplyChainQuery.eq('mineral', mineral);
    }

    const { data: supplyChain, error: scError } = await supplyChainQuery;
    if (scError) throw scError;

    // Fetch battery supply chain facilities
    const { data: batteryFacilities } = await supabase
      .from('battery_supply_chain')
      .select('*')
      .eq('country', 'Canada')
      .order('annual_capacity_gwh', { ascending: false });

    // Fetch recent prices for requested mineral or all priority minerals
    const mineralsToPrice = mineral ? [mineral] : PRIORITY_MINERALS;
    const { data: prices } = await supabase
      .from('minerals_prices')
      .select('*')
      .in('mineral', mineralsToPrice)
      .gte('timestamp', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(500);

    // Fetch trade flows (current year)
    const currentYear = new Date().getFullYear();
    let tradeQuery = supabase
      .from('minerals_trade_flows')
      .select('*')
      .eq('year', currentYear)
      .order('volume_tonnes', { ascending: false });

    if (mineral) {
      tradeQuery = tradeQuery.eq('mineral', mineral);
    }

    const { data: tradeFlows } = await tradeQuery;

    // Fetch EV demand forecast
    let evDemandQuery = supabase
      .from('ev_minerals_demand_forecast')
      .select('*')
      .eq('scenario', 'Base Case')
      .gte('year', currentYear)
      .lte('year', currentYear + 10)
      .order('year');

    const { data: evDemand } = await evDemandQuery;

    // Fetch strategic stockpile status
    const { data: stockpile } = await supabase
      .from('minerals_strategic_stockpile')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);

    // Calculate summary statistics
    const summary = {
      projects: {
        total_count: projects?.length || 0,
        priority_mineral_count: projects?.filter(p => p.is_priority_mineral).length || 0,
        total_design_capacity: projects?.reduce((sum, p) => sum + (p.design_capacity_tonnes_per_year || 0), 0) || 0,
        by_stage: getStageBreakdown(projects || []),
        by_province: getProvinceBreakdown(projects || []),
        by_mineral: getMineralBreakdown(projects || []),
        total_investment_cad: projects?.reduce((sum, p) => sum + (p.capital_cost_cad || 0), 0) || 0,
        federal_funding_cad: projects?.reduce((sum, p) => sum + (p.federal_funding_cad || 0), 0) || 0,
        indigenous_partnerships: projects?.filter(p => p.indigenous_partnership).length || 0,
        national_security_priority_count: projects?.filter(p => p.national_security_priority).length || 0,
      },
      supply_chain: {
        completeness: calculateSupplyChainCompleteness(supplyChain || [], mineral),
        domestic_gaps: supplyChain?.filter(sc => sc.is_domestic_gap) || [],
        total_processing_capacity: supplyChain?.reduce((sum, sc) => sum + (sc.output_capacity_tonnes_per_year || 0), 0) || 0,
        by_stage: getSupplyChainStageBreakdown(supplyChain || []),
      },
      battery_facilities: {
        total_count: batteryFacilities?.length || 0,
        total_capacity_gwh: batteryFacilities?.reduce((sum, f) => sum + (f.annual_capacity_gwh || 0), 0) || 0,
        minerals_demand: calculateBatteryMineralsDemand(batteryFacilities || []),
        domestic_sourcing_avg: calculateAverageDomesticSourcing(batteryFacilities || []),
      },
      pricing: prices ? {
        current_prices: getCurrentPrices(prices),
        price_volatility: calculatePriceVolatility(prices),
      } : null,
      trade: tradeFlows ? {
        total_imports_tonnes: tradeFlows.filter(t => t.flow_type === 'Import')
          .reduce((sum, t) => sum + (t.volume_tonnes || 0), 0) || 0,
        total_exports_tonnes: tradeFlows.filter(t => t.flow_type === 'Export')
          .reduce((sum, t) => sum + (t.volume_tonnes || 0), 0) || 0,
        china_dependency: calculateChinaDependency(tradeFlows),
        trade_balance: calculateTradeBalance(tradeFlows),
      } : null,
      stockpile: stockpile ? {
        minerals_stockpiled: new Set(stockpile.map(s => s.mineral)).size,
        critical_status_count: stockpile.filter(s => s.stockpile_adequacy === 'Critical').length,
        low_status_count: stockpile.filter(s => s.stockpile_adequacy === 'Low').length,
      } : null,
    };

    const response = {
      projects: projects || [],
      supply_chain: supplyChain || [],
      battery_facilities: batteryFacilities || [],
      prices: prices || [],
      trade_flows: tradeFlows || [],
      ev_demand_forecast: evDemand || [],
      stockpile: stockpile || [],
      summary,
      insights: {
        strategic_recommendations: generateStrategicRecommendations(projects || [], supplyChain || [], tradeFlows || []),
        supply_chain_gaps: identifyGaps(supplyChain || []),
        investment_opportunities: identifyInvestmentOpportunities(projects || [], evDemand || []),
      },
      metadata: {
        last_updated: new Date().toISOString(),
        data_source: 'NRCan, Statistics Canada, Canada Energy Dashboard',
        strategic_context: '$6.4B federal investment, 30% exploration tax credit, national security priority',
        priority_minerals: PRIORITY_MINERALS,
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('Minerals Supply Chain API error:', err);
    return new Response(JSON.stringify({
      error: String(err),
      message: 'Failed to fetch critical minerals supply chain data'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});

function getStageBreakdown(projects: any[]) {
  const breakdown: Record<string, number> = {};
  projects.forEach(p => {
    const stage = p.stage || 'Unknown';
    breakdown[stage] = (breakdown[stage] || 0) + 1;
  });
  return breakdown;
}

function getProvinceBreakdown(projects: any[]) {
  const breakdown: Record<string, { count: number; capacity: number }> = {};
  projects.forEach(p => {
    const prov = p.province || 'Unknown';
    if (!breakdown[prov]) breakdown[prov] = { count: 0, capacity: 0 };
    breakdown[prov].count += 1;
    breakdown[prov].capacity += p.design_capacity_tonnes_per_year || 0;
  });
  return breakdown;
}

function getMineralBreakdown(projects: any[]) {
  const breakdown: Record<string, { count: number; capacity: number }> = {};
  projects.forEach(p => {
    const mineral = p.primary_mineral || 'Unknown';
    if (!breakdown[mineral]) breakdown[mineral] = { count: 0, capacity: 0 };
    breakdown[mineral].count += 1;
    breakdown[mineral].capacity += p.design_capacity_tonnes_per_year || 0;
  });
  return breakdown;
}

function getSupplyChainStageBreakdown(supplyChain: any[]) {
  const breakdown: Record<string, number> = {};
  supplyChain.forEach(sc => {
    const stage = sc.stage || 'Unknown';
    breakdown[stage] = (breakdown[stage] || 0) + 1;
  });
  return breakdown;
}

function calculateSupplyChainCompleteness(supplyChain: any[], mineral?: string | null) {
  const stages = ['Mining', 'Concentration', 'Refining', 'Processing', 'Manufacturing', 'Recycling'];
  const completeness: Record<string, any> = {};

  const relevantSC = mineral
    ? supplyChain.filter(sc => sc.mineral === mineral)
    : supplyChain;

  stages.forEach(stage => {
    const stageData = relevantSC.filter(sc => sc.stage === stage && sc.status !== 'Closed');
    completeness[stage] = {
      has_capacity: stageData.length > 0,
      facility_count: stageData.length,
      domestic_capacity: stageData.filter(sc => sc.country === 'Canada').length,
      has_gap: stageData.some(sc => sc.is_domestic_gap),
    };
  });

  return completeness;
}

function calculateBatteryMineralsDemand(facilities: any[]) {
  return {
    lithium_tonnes_per_year: facilities.reduce((sum, f) => sum + (f.lithium_required_tonnes_per_year || 0), 0),
    cobalt_tonnes_per_year: facilities.reduce((sum, f) => sum + (f.cobalt_required_tonnes_per_year || 0), 0),
    nickel_tonnes_per_year: facilities.reduce((sum, f) => sum + (f.nickel_required_tonnes_per_year || 0), 0),
    graphite_tonnes_per_year: facilities.reduce((sum, f) => sum + (f.graphite_required_tonnes_per_year || 0), 0),
  };
}

function calculateAverageDomesticSourcing(facilities: any[]) {
  const withSourcing = facilities.filter(f => f.domestic_sourcing_percentage != null);
  if (withSourcing.length === 0) return 0;
  return Math.round(withSourcing.reduce((sum, f) => sum + f.domestic_sourcing_percentage, 0) / withSourcing.length);
}

function getCurrentPrices(prices: any[]) {
  const latestPrices: Record<string, any> = {};
  const mineralGroups = new Map<string, any[]>();

  prices.forEach(p => {
    if (!mineralGroups.has(p.mineral)) {
      mineralGroups.set(p.mineral, []);
    }
    mineralGroups.get(p.mineral)!.push(p);
  });

  mineralGroups.forEach((priceList, mineral) => {
    const latest = priceList[0];
    latestPrices[mineral] = {
      price_usd_per_tonne: latest.price_usd_per_tonne,
      timestamp: latest.timestamp,
      monthly_change_percentage: latest.monthly_change_percentage,
    };
  });

  return latestPrices;
}

function calculatePriceVolatility(prices: any[]) {
  const volatility: Record<string, number> = {};
  const mineralGroups = new Map<string, any[]>();

  prices.forEach(p => {
    if (!mineralGroups.has(p.mineral)) {
      mineralGroups.set(p.mineral, []);
    }
    mineralGroups.get(p.mineral)!.push(p);
  });

  mineralGroups.forEach((priceList, mineral) => {
    const pricesOnly = priceList.map(p => p.price_usd_per_tonne);
    const avg = pricesOnly.reduce((sum, p) => sum + p, 0) / pricesOnly.length;
    const variance = pricesOnly.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pricesOnly.length;
    const stdDev = Math.sqrt(variance);
    volatility[mineral] = Math.round((stdDev / avg) * 100); // Coefficient of variation
  });

  return volatility;
}

function calculateChinaDependency(tradeFlows: any[]) {
  const imports = tradeFlows.filter(t => t.flow_type === 'Import');
  const totalImports = imports.reduce((sum, t) => sum + (t.volume_tonnes || 0), 0);
  const chinaImports = imports.filter(t => t.is_china_sourced || t.origin_country === 'China')
    .reduce((sum, t) => sum + (t.volume_tonnes || 0), 0);

  return totalImports > 0 ? Math.round((chinaImports / totalImports) * 100) : 0;
}

function calculateTradeBalance(tradeFlows: any[]) {
  const exports = tradeFlows.filter(t => t.flow_type === 'Export')
    .reduce((sum, t) => sum + (t.volume_tonnes || 0), 0);
  const imports = tradeFlows.filter(t => t.flow_type === 'Import')
    .reduce((sum, t) => sum + (t.volume_tonnes || 0), 0);

  return {
    exports_tonnes: exports,
    imports_tonnes: imports,
    net_balance_tonnes: exports - imports,
    is_net_exporter: exports > imports,
  };
}

function identifyGaps(supplyChain: any[]) {
  return supplyChain
    .filter(sc => sc.is_domestic_gap)
    .map(sc => ({
      mineral: sc.mineral,
      stage: sc.stage,
      gap_description: `Missing ${sc.stage.toLowerCase()} capacity for ${sc.mineral}`,
      strategic_impact: 'High - creates supply chain vulnerability',
    }));
}

function generateStrategicRecommendations(projects: any[], supplyChain: any[], tradeFlows: any[]) {
  const recommendations: string[] = [];

  // Check for downstream processing gaps
  const refiningGaps = supplyChain.filter(sc => sc.stage === 'Refining' && sc.is_domestic_gap);
  if (refiningGaps.length > 0) {
    recommendations.push(`Invest in domestic refining capacity for ${refiningGaps.map(g => g.mineral).join(', ')} to reduce import dependency`);
  }

  // Check for concentration in production
  const inProductionCount = projects.filter(p => p.stage === 'Production').length;
  const inExplorationCount = projects.filter(p => p.stage === 'Exploration').length;
  if (inExplorationCount < inProductionCount * 3) {
    recommendations.push('Accelerate exploration programs to maintain production pipeline');
  }

  // Check China dependency
  const imports = tradeFlows.filter(t => t.flow_type === 'Import');
  const chinaPercentage = calculateChinaDependency(tradeFlows);
  if (chinaPercentage > 50) {
    recommendations.push(`High China dependency (${chinaPercentage}%) - diversify supply sources and accelerate domestic production`);
  }

  return recommendations;
}

function identifyInvestmentOpportunities(projects: any[], evDemand: any[]) {
  const opportunities: any[] = [];

  // Identify minerals with growing demand but limited projects
  if (evDemand && evDemand.length > 0) {
    const latestDemand = evDemand[evDemand.length - 1];

    PRIORITY_MINERALS.forEach(mineral => {
      const projectCount = projects.filter(p =>
        p.primary_mineral === mineral && ['Production', 'Construction', 'Feasibility'].includes(p.stage)
      ).length;

      if (projectCount < 3) {
        opportunities.push({
          mineral,
          reason: 'Limited active projects vs growing EV demand',
          priority: 'High',
        });
      }
    });
  }

  return opportunities;
}
