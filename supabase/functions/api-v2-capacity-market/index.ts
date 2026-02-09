import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

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
  const rl = applyRateLimit(req, 'api-v2-capacity-market');
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

    // Calculate statistics from auction data
    const latestAuction = auctions && auctions.length > 0 ? auctions[0] : null;
    const avgClearingPrice = (auctions ?? []).length > 0
      ? (auctions ?? []).reduce((sum, p) => sum + (p.clearing_price_cad_per_mw_day ?? 0), 0) / (auctions ?? []).length
      : null;

    // Build price history from auctions
    const priceHistory = (auctions ?? []).map(a => ({
      auction_year: a.auction_year,
      clearing_price_cad_per_mw_day: a.clearing_price_cad_per_mw_day,
      cleared_capacity_mw: a.cleared_capacity_mw
    }));

    const trends = [];
    const resourceMix = [];

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
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
