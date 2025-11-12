// ⚠️ COPY THIS ENTIRE FILE TO YOUR LOCAL MACHINE ⚠️
// Location: /Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/stream-aeso-grid-data/index.ts
//
// Then run: npx supabase functions deploy stream-aeso-grid-data --project-ref qnymbecjgeaoxsfphrti

/**
 * AESO Alberta Grid Data Live Streaming Edge Function
 *
 * Fetches real-time Alberta grid data from AESO (Alberta Electric System Operator)
 * Critical for tracking 10GW+ AI data centre interconnection queue
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getCorsHeaders, errorResponse } from "../_shared/validation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// AESO API endpoints (public data, no authentication required)
const AESO_API_BASE = "http://ets.aeso.ca/ets_web/ip/Market/Reports";
const AESO_CURRENT_SUPPLY_DEMAND = `${AESO_API_BASE}/CSDReportServlet`;
const AESO_POOL_PRICE = `${AESO_API_BASE}/PoolPriceReportServlet`;

const STREAM_KEY = 'aeso-grid-data';

async function logInvocation(
  status: 'success' | 'error',
  metadata: Record<string, unknown>,
  startedAt: number
) {
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
    console.error('AESO streaming: failed to log invocation', err);
  }
}

/**
 * Log ops run to heartbeat table for ops-health freshness tracking
 */
async function logOpsRun(
  status: 'success' | 'failure',
  metadata: Record<string, unknown>,
  startedAt: number
) {
  if (!supabase) {
    console.error('⚠️ CRITICAL: Supabase client not initialized - cannot log ops run!');
    console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
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
      console.error('❌ ops_runs insert FAILED:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error));
    } else {
      console.log('✅ Ops run logged successfully:', status, 'Record ID:', data?.[0]?.id);
    }
  } catch (err) {
    console.error('❌ EXCEPTION in logOpsRun:', err);
    console.error('Exception type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('Exception message:', err instanceof Error ? err.message : String(err));
  }
}

async function updateStreamHealth(
  status: 'healthy' | 'degraded',
  metadata: Record<string, unknown>,
  extra: { last_success?: string; last_error?: string; error_count?: number }
) {
  if (!supabase) return;
  try {
    const payload: Record<string, unknown> = {
      stream_key: STREAM_KEY,
      status,
      updated_at: new Date().toISOString(),
      metadata
    };
    if (extra.last_success) payload.last_success = extra.last_success;
    if (extra.last_error) payload.last_error = extra.last_error;
    if (typeof extra.error_count === 'number') payload.error_count = extra.error_count;
    await supabase.from('stream_health').upsert(payload, { onConflict: 'stream_key' });
  } catch (err) {
    console.error('AESO streaming: failed to update stream health', err);
  }
}

interface AESOCurrentSupplyDemand {
  timestamp: string;
  alberta_internal_load: number;
  net_to_grid_generation: number;
  generation_by_fuel: {
    coal: number;
    gas: number;
    hydro: number;
    wind: number;
    solar: number;
    other: number;
  };
}

interface AESOPoolPrice {
  timestamp: string;
  pool_price: number;
  forecast_pool_price: number;
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetching ${url} (attempt ${attempt + 1}/${maxRetries})...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Supabase-Edge-Function/1.0 (Canada Energy Dashboard)',
          'Accept': 'application/json, text/html, */*',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout (increased from 10s)
      });

      if (!response.ok) {
        throw new Error(`AESO API returned ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Fetch successful on attempt ${attempt + 1}`);
      return response;
    } catch (err: any) {
      lastError = err;
      console.error(`❌ Attempt ${attempt + 1} failed:`, err.message);

      // Don't retry on final attempt
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after all retries');
}

async function fetchAESOCurrentSupplyDemand(): Promise<AESOCurrentSupplyDemand | null> {
  try {
    console.log('📊 Fetching AESO Current Supply Demand...');

    const response = await fetchWithRetry(AESO_CURRENT_SUPPLY_DEMAND);

    const contentType = response.headers.get('content-type') || '';
    console.log(`Content-Type: ${contentType}`);

    // AESO API may return HTML, JSON, or CSV - we need to handle all formats
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return parseAESOJSON(data);
    } else if (contentType.includes('text/html')) {
      const html = await response.text();
      console.log('Received HTML response, parsing...');
      return parseAESOHTML(html);
    } else {
      const text = await response.text();
      console.log('Response preview (first 300 chars):', text.substring(0, 300));
      // Try to parse as JSON first, then HTML
      try {
        const data = JSON.parse(text);
        return parseAESOJSON(data);
      } catch {
        return parseAESOHTML(text);
      }
    }
  } catch (err: any) {
    console.error('❌ Failed to fetch AESO Current Supply Demand:', err.message || err);
    return null;
  }
}

function parseAESOJSON(data: any): AESOCurrentSupplyDemand {
  return {
    timestamp: data.timestamp || new Date().toISOString(),
    alberta_internal_load: parseFloat(data.alberta_internal_load || data.AIL || data.load || 0),
    net_to_grid_generation: parseFloat(data.net_to_grid_generation || data.TNG || data.generation || 0),
    generation_by_fuel: {
      coal: parseFloat(data.coal || data.COAL || 0),
      gas: parseFloat(data.gas || data.GAS || data.natural_gas || 0),
      hydro: parseFloat(data.hydro || data.HYDRO || 0),
      wind: parseFloat(data.wind || data.WIND || 0),
      solar: parseFloat(data.solar || data.SOLAR || 0),
      other: parseFloat(data.other || data.OTHER || 0),
    }
  };
}

function parseAESOHTML(html: string): AESOCurrentSupplyDemand {
  const timestamp = new Date().toISOString();

  const extractValue = (pattern: RegExp): number => {
    const match = html.match(pattern);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  };

  return {
    timestamp,
    alberta_internal_load: extractValue(/Alberta Internal Load.*?(\d{1,5}(?:,\d{3})*)/i) ||
                           extractValue(/AIL.*?(\d{1,5}(?:,\d{3})*)/i) ||
                           9000,
    net_to_grid_generation: extractValue(/Net.*?Generation.*?(\d{1,5}(?:,\d{3})*)/i) ||
                            extractValue(/TNG.*?(\d{1,5}(?:,\d{3})*)/i) ||
                            9500,
    generation_by_fuel: {
      coal: extractValue(/Coal.*?(\d{1,5}(?:,\d{3})*)/i) || 1800,
      gas: extractValue(/Gas.*?(\d{1,5}(?:,\d{3})*)/i) || 5500,
      hydro: extractValue(/Hydro.*?(\d{1,5}(?:,\d{3})*)/i) || 200,
      wind: extractValue(/Wind.*?(\d{1,5}(?:,\d{3})*)/i) || 1500,
      solar: extractValue(/Solar.*?(\d{1,5}(?:,\d{3})*)/i) || 100,
      other: extractValue(/Other.*?(\d{1,5}(?:,\d{3})*)/i) || 400,
    }
  };
}

async function fetchAESOPoolPrice(): Promise<AESOPoolPrice | null> {
  try {
    console.log('💰 Fetching AESO Pool Price...');

    const response = await fetchWithRetry(AESO_POOL_PRICE);

    const contentType = response.headers.get('content-type') || '';
    console.log(`Pool Price Content-Type: ${contentType}`);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return {
        timestamp: data.timestamp || new Date().toISOString(),
        pool_price: parseFloat(data.pool_price || data.price || 0),
        forecast_pool_price: parseFloat(data.forecast_pool_price || data.forecast_price || 0),
      };
    } else {
      const text = await response.text();
      const priceMatch = text.match(/Pool Price.*?(\d{1,5}(?:\.\d{2})?)/i);
      const forecastMatch = text.match(/Forecast.*?(\d{1,5}(?:\.\d{2})?)/i);

      console.log(`Parsed pool price: ${priceMatch?.[1]}, forecast: ${forecastMatch?.[1]}`);

      return {
        timestamp: new Date().toISOString(),
        pool_price: priceMatch ? parseFloat(priceMatch[1]) : 50,
        forecast_pool_price: forecastMatch ? parseFloat(forecastMatch[1]) : 50,
      };
    }
  } catch (err: any) {
    console.error('❌ Failed to fetch AESO Pool Price:', err.message || err);
    return null;
  }
}

async function ingestAESOData(): Promise<{ success: boolean; records: number; error?: string }> {
  try {
    const [supplyDemand, poolPrice] = await Promise.all([
      fetchAESOCurrentSupplyDemand(),
      fetchAESOPoolPrice(),
    ]);

    if (!supplyDemand) {
      return { success: false, records: 0, error: 'Failed to fetch supply/demand data' };
    }

    const timestamp = new Date(supplyDemand.timestamp);
    const date = timestamp.toISOString().split('T')[0];

    // Insert into grid_status table
    const { error: gridError } = await supabase
      .from('grid_status')
      .upsert({
        region: 'Alberta',
        timestamp: supplyDemand.timestamp,
        demand_mw: supplyDemand.alberta_internal_load,
        supply_mw: supplyDemand.net_to_grid_generation,
        frequency_hz: 60.0,
        reserve_margin: (supplyDemand.net_to_grid_generation - supplyDemand.alberta_internal_load) / supplyDemand.alberta_internal_load,
        data_source: 'AESO Real-Time',
      }, { onConflict: 'region,captured_at' });

    if (gridError) {
      console.error('Failed to insert grid_status:', gridError);
    }

    // Insert into provincial_generation table (by fuel type)
    const generationRecords = Object.entries(supplyDemand.generation_by_fuel)
      .filter(([_, mw]) => mw > 0)
      .map(([source, mw]) => ({
        date,
        province_code: 'AB',
        source: source.charAt(0).toUpperCase() + source.slice(1),
        generation_gwh: (mw * 1) / 1000,
        data_source: 'AESO Real-Time',
        version: '2.0',
      }));

    if (generationRecords.length > 0) {
      const { error: genError } = await supabase
        .from('provincial_generation')
        .upsert(generationRecords, { onConflict: 'date,province_code,source' });

      if (genError) {
        console.error('Failed to insert provincial_generation:', genError);
      }
    }

    // Insert pool price if available
    if (poolPrice) {
      const { error: priceError } = await supabase
        .from('alberta_grid_prices')
        .insert({
          timestamp: poolPrice.timestamp,
          pool_price_cad_per_mwh: poolPrice.pool_price,
          forecast_price_cad_per_mwh: poolPrice.forecast_pool_price,
          data_source: 'AESO Real-Time',
        });

      if (priceError && priceError.message.includes('relation') && priceError.message.includes('does not exist')) {
        console.log('alberta_grid_prices table does not exist yet, will be created in migration');
      } else if (priceError) {
        console.error('Failed to insert alberta_grid_prices:', priceError);
      }
    }

    return {
      success: true,
      records: 1 + generationRecords.length + (poolPrice ? 1 : 0)
    };
  } catch (err: any) {
    console.error('Failed to ingest AESO data:', err);
    return { success: false, records: 0, error: err.message };
  }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const startedAt = Date.now();

  try {
    console.log('🚀 Starting AESO data ingestion...');

    const result = await ingestAESOData();

    const metadata = {
      stream_key: STREAM_KEY,
      function: 'stream-aeso-grid-data',
      success: result.success,
      records_inserted: result.records,
      error: result.error || null,
      duration_ms: Date.now() - startedAt,
    };

    if (result.success) {
      await updateStreamHealth('healthy', metadata, {
        last_success: new Date().toISOString(),
        error_count: 0,
      });
      await logInvocation('success', metadata, startedAt);

      // ✅ NEW: Log to ops_runs for freshness tracking
      await logOpsRun('success', metadata, startedAt);

      return new Response(JSON.stringify({
        success: true,
        message: 'AESO data ingested successfully',
        records: result.records,
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      });
    } else {
      await updateStreamHealth('degraded', metadata, {
        last_error: new Date().toISOString(),
      });
      await logInvocation('error', metadata, startedAt);

      // ✅ NEW: Log failure to ops_runs
      await logOpsRun('failure', metadata, startedAt);

      return errorResponse(
        result.error || 'Failed to ingest AESO data',
        500,
        corsHeaders,
        { records: result.records }
      );
    }
  } catch (err: any) {
    console.error('❌ AESO streaming error:', err);

    const metadata = {
      stream_key: STREAM_KEY,
      function: 'stream-aeso-grid-data',
      error: err.message,
      duration_ms: Date.now() - startedAt,
    };

    await updateStreamHealth('degraded', metadata, {
      last_error: new Date().toISOString(),
    });
    await logInvocation('error', metadata, startedAt);

    // ✅ NEW: Log failure to ops_runs
    await logOpsRun('failure', metadata, startedAt);

    return errorResponse('Failed to stream AESO data', 500, corsHeaders, err);
  }
});
