import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { logApiUsage, applyRateLimit } from "../_shared/rateLimit.ts";
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

serve(async (req) => {
  const rl = applyRateLimit(req, 'api-v2-esg-finance');
  if (rl.response) return rl.response;

  const corsHeaders = createCorsHeaders(req);
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

  const access = await validateApiKeyAccess(req, supabase, 'api-v2-esg-finance');
  if (!access.allowed) {
    const statusCode = access.status || 401;
    const response = new Response(JSON.stringify({
      error: access.error || 'Unauthorized',
      message: access.message || 'Missing or invalid API key',
      tier: access.tier || null,
      daily_limit: access.dailyLimit ?? null,
      remaining: access.remaining ?? null,
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    await safeLog(statusCode, {
      reason: statusCode === 429 ? 'daily_limit_exceeded' : 'unauthorized',
      tier: access.tier || null,
      daily_limit: access.dailyLimit ?? null,
      remaining: access.remaining ?? null,
    });

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
