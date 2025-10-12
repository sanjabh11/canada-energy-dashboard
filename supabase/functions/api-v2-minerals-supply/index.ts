// Supabase Edge Function: api-v2-minerals-supply
// Fetches critical minerals data from NRCan open data sources
// Data Source: Natural Resources Canada - Critical Minerals Projects
// License: Open Government Licence - Canada

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// NRCan Critical Minerals ESRI REST endpoint
const NRCAN_MINERALS_API = "https://geoappext.nrcan.gc.ca/arcgis/rest/services/CRITICAL_MINERALS/critical_minerals_projects/MapServer/0/query";

interface MineralFacility {
  facility_name: string;
  mineral_type: string;
  province: string;
  status: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  production_tonnes?: number;
  last_updated: string;
  source: string;
}

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
    const useCache = url.searchParams.get('cache') !== 'false';

    // Check cache first (30 min TTL)
    if (useCache) {
      const cacheKey = `minerals_${mineral || 'all'}_${province || 'all'}`;
      const { data: cached } = await supabase
        .from('api_cache')
        .select('response_data, cached_at')
        .eq('cache_key', cacheKey)
        .gte('cached_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .single();

      if (cached) {
        return new Response(JSON.stringify({
          ...cached.response_data,
          cached: true,
          cached_at: cached.cached_at
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        });
      }
    }

    // Fetch from NRCan ESRI REST API
    const facilities = await fetchNRCanMinerals(mineral, province);

    // Fetch production statistics from cached StatCan data
    const productionStats = await fetchProductionStats(mineral, province);

    // Calculate risk scores based on supply concentration
    const riskData = calculateSupplyRisk(facilities, productionStats);

    const response = {
      facilities,
      production_stats: productionStats,
      risk_assessment: riskData,
      metadata: {
        source: 'Natural Resources Canada',
        license: 'Open Government Licence - Canada',
        last_updated: new Date().toISOString(),
        facility_count: facilities.length,
        data_url: 'https://open.canada.ca/data/en/dataset/22b2db8a-dc12-47f2-9737-99d3da921751',
        provenance: 'Real'
      }
    };

    // Cache the response
    const cacheKey = `minerals_${mineral || 'all'}_${province || 'all'}`;
    await supabase.from('api_cache').upsert({
      cache_key: cacheKey,
      response_data: response,
      cached_at: new Date().toISOString()
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error('Minerals API error:', err);
    return new Response(JSON.stringify({ 
      error: String(err),
      message: 'Failed to fetch minerals data from NRCan'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    });
  }
});

async function fetchNRCanMinerals(mineral?: string | null, province?: string | null): Promise<MineralFacility[]> {
  try {
    // Build ESRI REST query
    let whereClause = "1=1";
    if (mineral) {
      whereClause += ` AND UPPER(MINERAL_TYPE) LIKE '%${mineral.toUpperCase()}%'`;
    }
    if (province) {
      whereClause += ` AND UPPER(PROVINCE) = '${province.toUpperCase()}'`;
    }

    const params = new URLSearchParams({
      where: whereClause,
      outFields: '*',
      f: 'json',
      returnGeometry: 'true',
      spatialRel: 'esriSpatialRelIntersects',
      outSR: '4326'
    });

    const response = await fetch(`${NRCAN_MINERALS_API}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`NRCan API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    // Transform ESRI features to our schema
    return data.features.map((feature: any) => {
      const attrs = feature.attributes;
      const geom = feature.geometry;

      return {
        facility_name: attrs.FACILITY_NAME || attrs.NAME || 'Unknown',
        mineral_type: attrs.MINERAL_TYPE || attrs.COMMODITY || 'Unknown',
        province: attrs.PROVINCE || attrs.PROV || 'Unknown',
        status: attrs.STATUS || attrs.STAGE || 'Unknown',
        facility_type: attrs.FACILITY_TYPE || attrs.TYPE || 'Mine',
        latitude: geom?.y || 0,
        longitude: geom?.x || 0,
        production_tonnes: attrs.PRODUCTION || null,
        last_updated: new Date().toISOString(),
        source: 'NRCan Critical Minerals'
      };
    });
  } catch (error) {
    console.error('Error fetching NRCan minerals:', error);
    return [];
  }
}

async function fetchProductionStats(mineral?: string | null, province?: string | null) {
  // Query cached production statistics from our database
  // These are backfilled nightly from NRCan/StatCan tables
  try {
    let query = supabase
      .from('mineral_production_stats')
      .select('*')
      .order('year', { ascending: false })
      .limit(10);

    if (mineral) {
      query = query.ilike('mineral', `%${mineral}%`);
    }
    if (province) {
      query = query.eq('province', province);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching production stats:', error);
    return [];
  }
}

function calculateSupplyRisk(facilities: MineralFacility[], productionStats: any[]) {
  const mineralGroups = new Map<string, MineralFacility[]>();
  
  facilities.forEach(f => {
    const mineral = f.mineral_type.toLowerCase();
    if (!mineralGroups.has(mineral)) {
      mineralGroups.set(mineral, []);
    }
    mineralGroups.get(mineral)!.push(f);
  });

  const riskData = Array.from(mineralGroups.entries()).map(([mineral, facilities]) => {
    const activeFacilities = facilities.filter(f => 
      f.status.toLowerCase().includes('active') || 
      f.status.toLowerCase().includes('operating')
    ).length;

    const totalFacilities = facilities.length;
    const provinces = new Set(facilities.map(f => f.province)).size;

    // Risk score: higher when few facilities, concentrated in one province
    let riskScore = 50;
    if (activeFacilities < 3) riskScore += 30;
    if (provinces < 2) riskScore += 20;
    if (totalFacilities < 5) riskScore += 10;

    return {
      mineral,
      risk_score: Math.min(riskScore, 100),
      active_facilities: activeFacilities,
      total_facilities: totalFacilities,
      province_count: provinces,
      risk_level: riskScore > 70 ? 'High' : riskScore > 40 ? 'Medium' : 'Low',
      reason: riskScore > 70 
        ? 'Limited supply sources and geographic concentration'
        : riskScore > 40
        ? 'Moderate supply diversity'
        : 'Good supply diversity'
    };
  });

  return riskData;
}
