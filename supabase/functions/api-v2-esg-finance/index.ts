import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logApiUsage, checkRateLimit, getClientId, rateLimitHeaders } from "../_shared/rateLimit.ts";

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
        endpoint: 'api-v2-esg-finance',
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

  // Simple per-client rate limiting using shared helper
  const clientId = getClientId(req);
  const rate = checkRateLimit(clientId, 'api-v2-esg-finance');
  if (!rate.allowed) {
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...rateLimitHeaders(rate),
    };
    return new Response(JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }), {
      status: 429,
      headers,
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
    const company = url.searchParams.get('company');
    const sector = url.searchParams.get('sector');

    let payload: unknown;

    switch (dataType) {
      case 'green_bonds': {
        let query = supabase
          .from('green_bonds')
          .select('*')
          .order('issue_date', { ascending: false });

        if (company) {
          query = query.eq('issuer', company);
        }

        const { data, error } = await query;
        if (error) {
          console.error('green_bonds query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load green bonds' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'esg_ratings': {
        let query = supabase
          .from('esg_ratings')
          .select('*')
          .order('rating_date', { ascending: false });

        if (company) {
          query = query.eq('company', company);
        }
        if (sector) {
          query = query.eq('sector', sector);
        }

        const { data, error } = await query;
        if (error) {
          console.error('esg_ratings query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load ESG ratings' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'sustainability_loans': {
        let query = supabase
          .from('sustainability_linked_loans')
          .select('*')
          .order('announcement_date', { ascending: false });

        if (company) {
          query = query.eq('company', company);
        }

        const { data, error } = await query;
        if (error) {
          console.error('sustainability_linked_loans query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load sustainability-linked loans' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'carbon_exposure': {
        let query = supabase
          .from('carbon_pricing_exposure')
          .select('*')
          .order('projected_2030_cost_millions', { ascending: false });

        if (company) {
          query = query.eq('company', company);
        }
        if (sector) {
          query = query.eq('sector', sector);
        }

        const { data, error } = await query;
        if (error) {
          console.error('carbon_pricing_exposure query failed', error);
          return new Response(JSON.stringify({ error: 'Failed to load carbon pricing exposure' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        payload = { rows: data ?? [] };
        break;
      }

      case 'overview':
      default: {
        const [bondsResult, ratingsResult, loansResult, exposureResult] = await Promise.all([
          supabase.from('green_bonds').select('amount_cad'),
          supabase.from('esg_ratings').select('company, sector, msci_score_numeric, sustainalytics_risk_score'),
          supabase.from('sustainability_linked_loans').select('amount_cad'),
          supabase.from('carbon_pricing_exposure').select('projected_2030_cost_millions, revenue_at_risk_percent, company, sector'),
        ]);

        const bonds = bondsResult.data ?? [];
        const ratings = ratingsResult.data ?? [];
        const loans = loansResult.data ?? [];
        const exposure = exposureResult.data ?? [];

        const totalGreenBonds = bonds.reduce((sum, b: any) => sum + Number(b.amount_cad ?? 0), 0);
        const totalSustainabilityLoans = loans.reduce((sum, l: any) => sum + Number(l.amount_cad ?? 0), 0);
        const totalCarbonCost2030 = exposure.reduce((sum, e: any) => sum + Number(e.projected_2030_cost_millions ?? 0), 0);

        const avgESGScore = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + Number(r.msci_score_numeric ?? 0), 0) / ratings.length
          : null;

        const topPerformers = [...ratings]
          .filter((r: any) => typeof r.msci_score_numeric === 'number')
          .sort((a: any, b: any) => (b.msci_score_numeric ?? 0) - (a.msci_score_numeric ?? 0))
          .slice(0, 5);

        const highestCarbonExposure = [...exposure]
          .filter((e: any) => typeof e.revenue_at_risk_percent === 'number')
          .sort((a: any, b: any) => (b.revenue_at_risk_percent ?? 0) - (a.revenue_at_risk_percent ?? 0))
          .slice(0, 5);

        payload = {
          summary: {
            total_green_bonds_cad: totalGreenBonds,
            avg_esg_score: avgESGScore !== null ? avgESGScore.toFixed(1) : null,
            total_sustainability_loans_cad: totalSustainabilityLoans,
            projected_2030_carbon_cost_millions: totalCarbonCost2030.toFixed(0),
          },
          top_performers: topPerformers,
          highest_carbon_exposure: highestCarbonExposure,
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
      company: company ?? null,
      sector: sector ?? null,
    });

    return response;
  } catch (error) {
    console.error('Unhandled ESG finance API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
