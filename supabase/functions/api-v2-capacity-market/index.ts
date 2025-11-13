import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

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

  const url = new URL(req.url);
  const province = url.searchParams.get('province') ?? 'ON';
  const auctionYear = url.searchParams.get('year');

  try {
    // Fetch capacity auctions
    let auctionsQuery = supabase
      .from('capacity_market_auctions')
      .select('*')
      .eq('province_code', province);

    if (auctionYear) {
      auctionsQuery = auctionsQuery.eq('auction_year', parseInt(auctionYear));
    }

    const { data: auctions, error: auctionsError } = await auctionsQuery
      .order('auction_date', { ascending: false });

    if (auctionsError) {
      console.error('Capacity auctions query failed', auctionsError);
    }

    // Fetch price history
    const { data: priceHistory, error: priceError } = await supabase
      .from('capacity_market_price_history')
      .select('*')
      .eq('province_code', province)
      .order('delivery_year', { ascending: false })
      .limit(10);

    if (priceError) {
      console.error('Price history query failed', priceError);
    }

    // Fetch capacity trends view
    const { data: trends, error: trendsError } = await supabase
      .from('capacity_auction_trends')
      .select('*')
      .eq('province_code', province);

    if (trendsError) {
      console.warn('Capacity trends query failed', trendsError);
    }

    // Fetch resource mix
    const { data: resourceMix, error: mixError } = await supabase
      .from('capacity_resource_mix')
      .select('*')
      .eq('province_code', province);

    if (mixError) {
      console.warn('Resource mix query failed', mixError);
    }

    // Calculate statistics
    const latestAuction = auctions && auctions.length > 0 ? auctions[0] : null;
    const avgClearingPrice = (priceHistory ?? []).length > 0
      ? (priceHistory ?? []).reduce((sum, p) => sum + (p.clearing_price_cad_per_mw_day ?? 0), 0) / (priceHistory ?? []).length
      : null;

    const payload = {
      auctions: auctions ?? [],
      price_history: priceHistory ?? [],
      trends: trends ?? [],
      resource_mix: resourceMix ?? [],
      statistics: {
        latest_auction: latestAuction,
        avg_clearing_price_cad_per_mw_day: avgClearingPrice,
        total_auctions: (auctions ?? []).length,
      },
      metadata: {
        province: province,
        iso_operator: province === 'ON' ? 'IESO' : 'AESO',
        source: 'IESO Capacity Auction Results',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled capacity market API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
