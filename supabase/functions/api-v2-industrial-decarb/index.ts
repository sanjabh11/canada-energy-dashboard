import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logApiUsage } from "../_shared/rateLimit.ts";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://canada-energy.netlify.app",
  "https://*.netlify.app",
];

const envAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envAllowedOrigins,
  ...DEFAULT_ALLOWED_ORIGINS,
]));

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const fallbackOrigin = ALLOWED_ORIGINS[0] ?? DEFAULT_ALLOWED_ORIGINS[0];

  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("EDGE_SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const VALID_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK', 'YT', 'NT', 'NU'];
async function validateApiKey(req: Request, supabaseClient: any): Promise<boolean> {
  const headerKey = req.headers.get('apikey') || '';
  const authHeader = req.headers.get('authorization') || '';
  let token = '';
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim();
  }

  const candidate = headerKey || token;

  const allowedAnonKeys = [
    Deno.env.get('EDGE_SUPABASE_ANON_KEY') || '',
    Deno.env.get('SUPABASE_ANON_KEY') || '',
  ].filter(Boolean);

  // Fast path: accept the configured anon key(s) so the first-party dashboard keeps working
  if (allowedAnonKeys.length > 0 && candidate && allowedAnonKeys.includes(candidate)) {
    return true;
  }

  // If no key is provided and no anon keys are configured, maintain previous behavior (do not hard fail)
  if (!candidate) {
    return allowedAnonKeys.length === 0;
  }

  if (!supabaseClient) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from('api_keys')
      .select('id, is_active, expires_at')
      .eq('api_key', candidate)
      .maybeSingle();

    if (error) {
      console.error('api_keys lookup failed', error);
      return false;
    }

    if (!data || !data.is_active) {
      return false;
    }

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('api_keys validation threw', err);
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')
    || req.headers.get('cf-connecting-ip')
    || null;

  async function safeLog(statusCode: number, extra?: Record<string, unknown>) {
    try {
      const headerKey = req.headers.get('apikey') || '';
      const authHeader = req.headers.get('authorization') || '';
      let token = '';
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      }

      const apiKey = headerKey || token || null;

      await logApiUsage({
        endpoint: 'api-v2-industrial-decarb',
        method: req.method,
        statusCode,
        apiKey,
        ipAddress,
        responseTimeMs: Date.now() - startTime,
        extra,
      });
    } catch (_err) {
      // Logging failures must never affect main response path
    }
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

  if (!(await validateApiKey(req, supabase))) {
    const statusCode = 401;
    const response = new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Missing or invalid API key',
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    await safeLog(statusCode, { reason: 'unauthorized' });

    return response;
  }

  try {
    const url = new URL(req.url);
    const dataType = url.searchParams.get('type') || 'overview';
    const province = url.searchParams.get('province');
    const year = url.searchParams.get('year');
    const company = url.searchParams.get('company');
    const sector = url.searchParams.get('sector');
    const facility = url.searchParams.get('facility');
    const projectType = url.searchParams.get('project_type');

    if (province && !VALID_PROVINCES.includes(province)) {
      return new Response(JSON.stringify({ error: 'Invalid province parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      if (!Number.isFinite(parsedYear) || parsedYear < 1990 || parsedYear > 2100) {
        return new Response(JSON.stringify({ error: 'Invalid year parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let payload: unknown;

    switch (dataType) {
      case 'facility_emissions': {
        let query = supabase
          .from('facility_emissions')
          .select('*');

        if (province) {
          query = query.eq('province_code', province);
        }
        if (year) {
          query = query.eq('reporting_year', parseInt(year, 10));
        }
        if (sector) {
          query = query.eq('sector', sector);
        }

        const { data, error } = await query
          .order('emissions_tonnes', { ascending: false })
          .limit(500);

        if (error) {
          console.error('facility_emissions query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load facility emissions' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'methane_reduction': {
        let query = supabase
          .from('methane_reduction_tracker')
          .select('*');

        if (company) {
          query = query.eq('company', company);
        }
        if (sector) {
          query = query.eq('sector', sector);
        }

        const { data, error } = await query
          .order('current_year', { ascending: false });

        if (error) {
          console.error('methane_reduction_tracker query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load methane reduction data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'obps_compliance': {
        let query = supabase
          .from('obps_compliance')
          .select('*');

        if (facility) {
          query = query.eq('facility_name', facility);
        }
        if (company) {
          query = query.eq('operator', company);
        }
        if (province) {
          query = query.eq('province_code', province);
        }
        if (year) {
          query = query.eq('reporting_year', parseInt(year, 10));
        }

        const { data, error } = await query
          .order('reporting_year', { ascending: false });

        if (error) {
          console.error('obps_compliance query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load OBPS compliance data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'efficiency_projects': {
        let query = supabase
          .from('efficiency_projects')
          .select('*');

        if (company) {
          query = query.eq('company', company);
        }
        if (province) {
          query = query.eq('province_code', province);
        }
        if (projectType) {
          query = query.eq('project_type', projectType);
        }

        const { data, error } = await query
          .order('annual_emissions_avoided_tonnes', { ascending: false });

        if (error) {
          console.error('efficiency_projects query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load efficiency projects' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'overview':
      default: {
        const [facilityResult, methaneResult, obpsResult, efficiencyResult] = await Promise.all([
          supabase.from('facility_emissions').select('facility_name, operator, sector, province_code, emissions_tonnes, reporting_year').limit(500),
          supabase.from('methane_reduction_tracker').select('*'),
          supabase.from('obps_compliance').select('*'),
          supabase.from('efficiency_projects').select('*'),
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
