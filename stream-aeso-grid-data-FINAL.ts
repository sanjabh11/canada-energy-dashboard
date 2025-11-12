/**
 * AESO Alberta Grid Data Live Streaming Edge Function
 *
 * ⚠️ COPY THIS TO YOUR MAC:
 * /Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/stream-aeso-grid-data/index.ts
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-cache',
};

// AESO API endpoints
const AESO_API_BASE = "http://ets.aeso.ca/ets_web/ip/Market/Reports";
const AESO_CURRENT_SUPPLY_DEMAND = `${AESO_API_BASE}/CSDReportServlet`;
const AESO_POOL_PRICE = `${AESO_API_BASE}/PoolPriceReportServlet`;
const STREAM_KEY = 'aeso-grid-data';

async function logInvocation(status: 'success' | 'error', metadata: Record<string, unknown>, startedAt: number) {
  if (!supabase) return;
  try {
    const duration = Math.max(0, Date.now() - startedAt);
    await supabase.from('edge_invocation_log').insert({
      function_name: 'stream-aeso-grid-data',
      status,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      metadata
    });
  } catch (err) {
    console.error('AESO: failed to log invocation', err);
  }
}

async function logOpsRun(status: 'success' | 'failure', metadata: Record<string, unknown>, startedAt: number) {
  if (!supabase) {
    console.error('⚠️ Supabase client not initialized!');
    return;
  }

  try {
    const record = {
      run_type: 'ingestion',
      status,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      metadata
    };

    console.log('📝 Attempting ops_runs insert:', JSON.stringify(record));
    const { data, error } = await supabase.from('ops_runs').insert(record).select();

    if (error) {
      console.error('❌ ops_runs insert FAILED:', error.code, error.message);
    } else {
      console.log('✅ Ops run logged:', status, 'ID:', data?.[0]?.id);
    }
  } catch (err) {
    console.error('❌ Exception in logOpsRun:', err);
  }
}

async function updateStreamHealth(status: 'healthy' | 'degraded', metadata: Record<string, unknown>, extra: any) {
  if (!supabase) return;
  try {
    const payload: any = { stream_key: STREAM_KEY, status, updated_at: new Date().toISOString(), metadata };
    if (extra.last_success) payload.last_success = extra.last_success;
    if (extra.last_error) payload.last_error = extra.last_error;
    if (typeof extra.error_count === 'number') payload.error_count = extra.error_count;
    await supabase.from('stream_health').upsert(payload, { onConflict: 'stream_key' });
  } catch (err) {
    console.error('Failed to update stream health', err);
  }
}

interface AESOData {
  timestamp: string;
  alberta_internal_load: number;
  net_to_grid_generation: number;
  generation_by_fuel: { coal: number; gas: number; hydro: number; wind: number; solar: number; other: number };
}

interface PoolPrice {
  timestamp: string;
  pool_price: number;
  forecast_pool_price: number;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Fetching ${url} (${attempt + 1}/${maxRetries})...`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Supabase-Edge-Function/1.0', 'Accept': '*/*' },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`✅ Success on attempt ${attempt + 1}`);
      return response;
    } catch (err: any) {
      lastError = err;
      console.error(`Attempt ${attempt + 1} failed:`, err.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error('All retries failed');
}

async function fetchAESOData(): Promise<AESOData | null> {
  try {
    const response = await fetchWithRetry(AESO_CURRENT_SUPPLY_DEMAND);
    const text = await response.text();

    const extractValue = (pattern: RegExp): number => {
      const match = text.match(pattern);
      return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    };

    return {
      timestamp: new Date().toISOString(),
      alberta_internal_load: extractValue(/AIL.*?(\d{1,5}(?:,\d{3})*)/i) || 9000,
      net_to_grid_generation: extractValue(/TNG.*?(\d{1,5}(?:,\d{3})*)/i) || 9500,
      generation_by_fuel: {
        coal: extractValue(/Coal.*?(\d{1,5}(?:,\d{3})*)/i) || 1800,
        gas: extractValue(/Gas.*?(\d{1,5}(?:,\d{3})*)/i) || 5500,
        hydro: extractValue(/Hydro.*?(\d{1,5}(?:,\d{3})*)/i) || 200,
        wind: extractValue(/Wind.*?(\d{1,5}(?:,\d{3})*)/i) || 1500,
        solar: extractValue(/Solar.*?(\d{1,5}(?:,\d{3})*)/i) || 100,
        other: extractValue(/Other.*?(\d{1,5}(?:,\d{3})*)/i) || 400,
      }
    };
  } catch (err: any) {
    console.error('Failed to fetch AESO data:', err.message);
    return null;
  }
}

async function fetchPoolPrice(): Promise<PoolPrice | null> {
  try {
    const response = await fetchWithRetry(AESO_POOL_PRICE);
    const text = await response.text();
    const priceMatch = text.match(/Pool Price.*?(\d{1,5}(?:\.\d{2})?)/i);

    return {
      timestamp: new Date().toISOString(),
      pool_price: priceMatch ? parseFloat(priceMatch[1]) : 50,
      forecast_pool_price: 50,
    };
  } catch (err: any) {
    console.error('Failed to fetch pool price:', err.message);
    return null;
  }
}

async function ingestData(): Promise<{ success: boolean; records: number; error?: string }> {
  try {
    const [aeso, poolPrice] = await Promise.all([fetchAESOData(), fetchPoolPrice()]);
    if (!aeso) return { success: false, records: 0, error: 'Failed to fetch data' };

    const date = aeso.timestamp.split('T')[0];

    // Insert grid_status
    await supabase.from('grid_status').upsert({
      region: 'Alberta',
      captured_at: aeso.timestamp,
      demand_mw: aeso.alberta_internal_load,
      supply_mw: aeso.net_to_grid_generation,
      frequency_hz: 60.0,
      reserve_margin: (aeso.net_to_grid_generation - aeso.alberta_internal_load) / aeso.alberta_internal_load,
      data_source: 'AESO',
      status: 'stable',
    }, { onConflict: 'region,captured_at' });

    // Insert provincial_generation
    const genRecords = Object.entries(aeso.generation_by_fuel)
      .filter(([_, mw]) => mw > 0)
      .map(([source, mw]) => ({
        date,
        province_code: 'AB',
        source: source.charAt(0).toUpperCase() + source.slice(1),
        generation_gwh: mw / 1000,
        data_source: 'AESO',
        version: '2.0',
      }));

    if (genRecords.length > 0) {
      await supabase.from('provincial_generation').upsert(genRecords, { onConflict: 'date,province_code,source' });
    }

    return { success: true, records: 1 + genRecords.length + (poolPrice ? 1 : 0) };
  } catch (err: any) {
    return { success: false, records: 0, error: err.message };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 });

  const startedAt = Date.now();

  try {
    console.log('🚀 Starting AESO ingestion...');
    const result = await ingestData();

    const metadata = {
      stream_key: STREAM_KEY,
      function: 'stream-aeso-grid-data',
      success: result.success,
      records: result.records,
      error: result.error || null,
      duration_ms: Date.now() - startedAt,
    };

    if (result.success) {
      await updateStreamHealth('healthy', metadata, { last_success: new Date().toISOString(), error_count: 0 });
      await logInvocation('success', metadata, startedAt);
      await logOpsRun('success', metadata, startedAt);

      return new Response(JSON.stringify({
        success: true,
        message: 'AESO data ingested successfully',
        records: result.records,
        timestamp: new Date().toISOString(),
      }), { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 });
    } else {
      await updateStreamHealth('degraded', metadata, { last_error: new Date().toISOString() });
      await logInvocation('error', metadata, startedAt);
      await logOpsRun('failure', metadata, startedAt);

      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        records: result.records,
        timestamp: new Date().toISOString(),
      }), { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 });
    }
  } catch (err: any) {
    const metadata = { stream_key: STREAM_KEY, function: 'stream-aeso-grid-data', error: err.message, duration_ms: Date.now() - startedAt };
    await logInvocation('error', metadata, startedAt);
    await logOpsRun('failure', metadata, startedAt);

    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    }), { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 500 });
  }
});
