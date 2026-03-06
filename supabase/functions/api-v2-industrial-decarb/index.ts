import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logApiUsage } from "../_shared/rateLimit.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateApiKeyAccess } from "../_shared/apiKeyAccess.ts";

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("EDGE_SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const safeLog = async (statusCode: number, metadata: Record<string, unknown>) => {
  try {
    await logApiUsage({
      endpoint: 'api-v2-industrial-decarb',
      method: 'GET',
      statusCode,
      extra: metadata,
    });
  } catch {
    // Silently fail logging
  }
};

serve(async (req) => {
  const rl = applyRateLimit(req, 'api-v2-industrial-decarb');
  if (rl.response) return rl.response;

  const corsHeaders = createCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase client not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const access = await validateApiKeyAccess(req, supabase, 'api-v2-industrial-decarb');
  if (!access.allowed) {
    const statusCode = access.status || 401;
    await safeLog(statusCode, {
      reason: statusCode === 429 ? 'daily_limit_exceeded' : 'unauthorized',
      tier: access.tier || null,
      daily_limit: access.dailyLimit ?? null,
      remaining: access.remaining ?? null,
    });

    return new Response(JSON.stringify({
      error: access.error || 'Unauthorized',
      message: access.message || 'Missing or invalid API key',
      tier: access.tier || null,
      daily_limit: access.dailyLimit ?? null,
      remaining: access.remaining ?? null,
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const dataType = url.searchParams.get('type') ?? 'summary';
  const province = url.searchParams.get('province');
  const year = url.searchParams.get('year');
  const company = url.searchParams.get('company');
  const sector = url.searchParams.get('sector');
  const facility = url.searchParams.get('facility');
  const projectType = url.searchParams.get('project_type');

  let payload: Record<string, unknown> = {};

  try {
    switch (dataType) {
      case 'summary': {
        // Fetch data from multiple tables
        const [facilityResult, methaneResult, obpsResult, efficiencyResult] = await Promise.all([
          supabase.from('industrial_facilities').select('*').eq('status', 'active'),
          supabase.from('methane_reduction_projects').select('*'),
          supabase.from('obps_compliance').select('*'),
          supabase.from('energy_efficiency_projects').select('*'),
        ]);

        const facilities = facilityResult.data ?? [];
        const methane = methaneResult.data ?? [];
        const obps = obpsResult.data ?? [];
        const efficiency = efficiencyResult.data ?? [];

        const totalFacilityEmissions = facilities.reduce((sum: number, f: any) => sum + Number(f.emissions_tonnes ?? 0), 0);
        const facilityCount = facilities.length;

        const avgEmissionIntensity = facilities.length > 0
          ? facilities.reduce((sum: number, f: any) => sum + Number(f.emission_intensity ?? 0), 0) / facilities.length
          : null;

        const totalMethaneBaseline = methane.reduce((sum: number, m: any) => sum + Number(m.baseline_methane_tonnes ?? 0), 0);
        const totalMethaneCurrent = methane.reduce((sum: number, m: any) => sum + Number(m.current_methane_tonnes ?? 0), 0);
        const totalMethaneReduction = totalMethaneBaseline - totalMethaneCurrent;

        const totalObpsSurplus = obps
          .filter((o: any) => o.compliance_status === 'surplus')
          .reduce((sum: number, o: any) => sum + Number(o.credits_debits_tonnes ?? 0), 0);
        const totalObpsDeficit = obps
          .filter((o: any) => o.compliance_status === 'deficit')
          .reduce((sum: number, o: any) => sum + Number(o.credits_debits_tonnes ?? 0), 0);

        const totalEffAvoided = efficiency.reduce((sum: number, e: any) => sum + Number(e.annual_emissions_avoided_tonnes ?? 0), 0);

        const topFacilities = [...facilities]
          .sort((a: any, b: any) => Number(b.emissions_tonnes ?? 0) - Number(a.emissions_tonnes ?? 0))
          .slice(0, 10);

        const methaneLeaders = [...methane]
          .filter((m: any) => typeof m.reduction_percent === 'number')
          .sort((a: any, b: any) => Number(b.reduction_percent ?? 0) - Number(a.reduction_percent ?? 0))
          .slice(0, 5);

        const topEfficiencyProjects = [...efficiency]
          .sort((a: any, b: any) => Number(b.annual_emissions_avoided_tonnes ?? 0) - Number(a.annual_emissions_avoided_tonnes ?? 0))
          .slice(0, 5);

        payload = {
          summary: {
            total_facility_emissions_tonnes: totalFacilityEmissions,
            facility_count: facilityCount,
            avg_emission_intensity: avgEmissionIntensity,
            total_methane_reduction_tonnes: totalMethaneReduction,
            total_obps_surplus_tonnes: totalObpsSurplus,
            total_obps_deficit_tonnes: totalObpsDeficit,
            total_efficiency_avoided_tonnes: totalEffAvoided,
          },
          top_facilities: topFacilities,
          methane_leaders: methaneLeaders,
          top_efficiency_projects: topEfficiencyProjects,
        };
        break;
      }
    }

    const statusCode = 200;
    const response = new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    await safeLog(statusCode, {
      type: dataType,
      province: province ?? null,
      year: year ?? null,
      company: company ?? null,
      sector: sector ?? null,
      facility: facility ?? null,
      project_type: projectType ?? null,
    });

    return response;
  } catch (error) {
    console.error('Unhandled industrial decarb API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
