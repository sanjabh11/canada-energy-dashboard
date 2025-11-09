/**
 * AESO Alberta Grid Data Live Streaming Edge Function
 *
 * Streams real-time Alberta electricity grid data from AESO (Alberta Electric System Operator)
 * Provides current supply/demand data and pool price information
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// CORS headers for Edge Function responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const STREAM_KEY = 'aeso-grid-data';

// AESO API configuration
const AESO_CONFIG = {
  BASE_URL: 'https://api.aeso.ca/report/v1.1',
  ENDPOINTS: {
    CURRENT_SUPPLY_DEMAND: '/csd/summary/current',
    POOL_PRICE: '/price/poolPrice',
  },
  MAX_RETRIES: 3,
  FETCH_TIMEOUT_MS: 30000, // 30 second timeout
};

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = AESO_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`AESO fetch attempt ${attempt + 1}/${maxRetries}: ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(AESO_CONFIG.FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`AESO fetch successful on attempt ${attempt + 1}`);
      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`AESO fetch attempt ${attempt + 1} failed:`, lastError.message);

      // If this isn't the last attempt, wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Fetch failed after all retries');
}

/**
 * Fetch AESO Current Supply/Demand data with retry logic
 */
async function fetchAESOCurrentSupplyDemand(): Promise<any> {
  const url = `${AESO_CONFIG.BASE_URL}${AESO_CONFIG.ENDPOINTS.CURRENT_SUPPLY_DEMAND}`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-API-Key': Deno.env.get('AESO_API_KEY') ?? '',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    console.log('AESO Current Supply/Demand fetched successfully');
    return data;

  } catch (error) {
    console.error('AESO Current Supply/Demand Fetch Error:', error);
    throw error;
  }
}

/**
 * Fetch AESO Pool Price data with retry logic
 */
async function fetchAESOPoolPrice(): Promise<any> {
  const url = `${AESO_CONFIG.BASE_URL}${AESO_CONFIG.ENDPOINTS.POOL_PRICE}`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-API-Key': Deno.env.get('AESO_API_KEY') ?? '',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    console.log('AESO Pool Price fetched successfully');
    return data;

  } catch (error) {
    console.error('AESO Pool Price Fetch Error:', error);
    throw error;
  }
}

/**
 * Transform AESO data to grid format
 */
function transformAESOData(supplyDemand: any, poolPrice: any): any[] {
  const timestamp = new Date().toISOString();
  const records: any[] = [];

  try {
    // Extract current supply/demand data
    if (supplyDemand?.return?.['Current Supply/Demand Summary Report']) {
      const csd = supplyDemand.return['Current Supply/Demand Summary Report'];

      records.push({
        region: 'Alberta',
        demand_mw: parseFloat(csd.total_max_generation) || null,
        supply_mw: parseFloat(csd.total_net_generation) || null,
        timestamp,
        source: 'AESO',
        metadata: {
          available_capacity: parseFloat(csd.available_capacity) || null,
          dispatched_contingency_reserve: parseFloat(csd.dispatched_contingency_reserve) || null,
        }
      });
    }

    // Extract pool price data
    if (poolPrice?.return?.['Pool Price Report']) {
      const prices = poolPrice.return['Pool Price Report'];

      if (Array.isArray(prices)) {
        const latestPrice = prices[0];
        if (latestPrice) {
          records.push({
            region: 'Alberta',
            price_cad_mwh: parseFloat(latestPrice.pool_price) || null,
            timestamp: latestPrice.begin_datetime_mpt || timestamp,
            source: 'AESO',
            price_type: 'pool_price'
          });
        }
      }
    }

    console.log(`Transformed ${records.length} AESO records`);
    return records;

  } catch (error) {
    console.error('Error transforming AESO data:', error);
    return records;
  }
}

/**
 * Log ops run to heartbeat table
 */
async function logOpsRun(
  status: 'success' | 'failure',
  metadata: Record<string, unknown>,
  startedAt: number
) {
  if (!supabase) {
    console.error('CRITICAL: Supabase client not initialized - cannot log ops run!');
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

    console.log('Attempting ops_runs insert:', JSON.stringify(record));

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

/**
 * Persist grid snapshots to database
 */
async function persistGridSnapshots(rows: any[]): Promise<void> {
  if (!supabase || rows.length === 0) return;

  try {
    const upsertRows = rows.map((row: any) => ({
      region: row.region || 'Alberta',
      demand_mw: row.demand_mw,
      supply_mw: row.supply_mw,
      reserve_margin: row.demand_mw && row.supply_mw && row.demand_mw > 0
        ? (row.supply_mw - row.demand_mw) / row.demand_mw
        : null,
      frequency_hz: 60,
      voltage_kv: 138,
      data_source: row.source || 'AESO',
      status: 'stable',
      captured_at: row.timestamp || new Date().toISOString()
    }));

    const { error } = await supabase
      .from('grid_status')
      .upsert(upsertRows, { onConflict: 'region,captured_at' });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`Persisted ${upsertRows.length} grid snapshots`);
  } catch (err) {
    console.error('Failed to persist grid snapshots:', err);
    throw err;
  }
}

/**
 * Main Edge Function handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const startedAt = Date.now();

  try {
    console.log('Starting AESO data collection...');

    // Fetch data in parallel
    const [supplyDemandResult, poolPriceResult] = await Promise.allSettled([
      fetchAESOCurrentSupplyDemand(),
      fetchAESOPoolPrice()
    ]);

    const supplyDemand = supplyDemandResult.status === 'fulfilled' ? supplyDemandResult.value : null;
    const poolPrice = poolPriceResult.status === 'fulfilled' ? poolPriceResult.value : null;

    // Transform and persist data
    const records = transformAESOData(supplyDemand, poolPrice);

    if (records.length > 0) {
      await persistGridSnapshots(records);
    }

    const duration = Date.now() - startedAt;
    console.log(`AESO data collection completed in ${duration}ms`);

    // Log successful ops run for freshness tracking
    await logOpsRun('success', {
      function: 'stream-aeso-grid-data',
      records: records.length,
      duration_ms: duration
    }, startedAt);

    return new Response(JSON.stringify({
      success: true,
      message: 'AESO data ingested successfully',
      records: records.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    console.error(`AESO data collection failed after ${duration}ms:`, message);

    // Log failed ops run
    await logOpsRun('failure', {
      function: 'stream-aeso-grid-data',
      error: message,
      duration_ms: duration
    }, startedAt);

    return new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
