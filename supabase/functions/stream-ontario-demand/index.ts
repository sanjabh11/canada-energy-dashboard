/**
 * IESO Ontario Demand & Price Live Streaming Edge Function
 *
 * Streams real-time Ontario electricity demand and price data from IESO (Independent Electricity System Operator)
 * Provides hourly demand, 5-minute price data, and supply/demand information
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { getOntarioDemandSample, paginateSampleData } from "../_shared/sampleDataLoader.ts";

// CORS headers for Edge Function responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const STREAM_KEY = 'ontario-demand';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type IESODataResult = {
  rows: any[];
  metadata: Record<string, unknown>;
  hadError: boolean;
};

async function logInvocation(
  status: 'success' | 'error',
  metadata: Record<string, unknown>,
  startedAt: number
) {
  if (!supabase) return;
  try {
    const duration = Math.max(0, Date.now() - startedAt);
    await supabase.from('edge_invocation_log').insert({
      function_name: 'stream-ontario-demand',
      status,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      metadata
    });
  } catch (err) {
    console.error('Failed to log invocation', err);
  }
}

async function logOpsRun(
  status: 'success' | 'failure',
  metadata: Record<string, unknown>,
  startedAt: number
) {
  if (!supabase) return;
  try {
    await supabase.from('ops_runs').insert({
      run_type: 'ingestion',
      status,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      metadata
    });
    console.log(`Ops run logged: ${status}`);
  } catch (err) {
    console.error('Failed to log ops run:', err);
  }
}

async function collectIESOData(options: { skipFilter?: boolean } = {}): Promise<IESODataResult> {
  const { skipFilter = false } = options;
  const [demandData, priceData] = await Promise.allSettled([
    fetchIESODemandData(),
    fetchIESOPriceData()
  ]);

  const demand = demandData.status === 'fulfilled' ? demandData.value : [];
  const prices = priceData.status === 'fulfilled' ? priceData.value : [];

  const hadError = demandData.status === 'rejected' || priceData.status === 'rejected';
  const combined = combineIESOData(demand, prices);
  const rows = skipFilter ? combined : filterNewData(combined);

  const metadata: Record<string, unknown> = {
    streamKey: STREAM_KEY,
    demandStatus: demandData.status === 'fulfilled' ? 'ok' : 'error',
    priceStatus: priceData.status === 'fulfilled' ? 'ok' : 'error',
    demandRows: demand.length,
    priceRows: prices.length,
    combinedRows: combined.length,
    skipFilter
  };

  return { rows, metadata, hadError };
}

async function fetchAndPersistIESOData(options: { skipFilter?: boolean } = {}): Promise<IESODataResult> {
  const startedAt = Date.now();
  const { rows, metadata, hadError } = await collectIESOData(options);

  try {
    if (rows.length > 0) {
      await persistGridSnapshots(rows);
      lastSuccessfulFetch = Date.now();
    }

    if (hadError) {
      errorCount++;
      const degradedMeta = { ...metadata, rowsPersisted: rows.length };
      await updateStreamHealth('degraded', degradedMeta, {
        last_error: new Date().toISOString(),
        error_count: errorCount
      });
      await logInvocation('error', degradedMeta, startedAt);
      if (rows.length === 0) {
        throw new Error('IESO demand and price data unavailable');
      }
    } else {
      errorCount = 0;
      const successMeta = { ...metadata, rowsPersisted: rows.length };
      await updateStreamHealth('healthy', successMeta, {
        last_success: new Date(lastSuccessfulFetch).toISOString(),
        error_count: errorCount
      });
      await logInvocation('success', successMeta, startedAt);
      await logOpsRun('success', successMeta, startedAt);
    }

    return { rows, metadata: { ...metadata, rowsPersisted: rows.length }, hadError };
  } catch (err) {
    errorCount++;
    const message = err instanceof Error ? err.message : String(err);
    const failureMeta = { ...metadata, rowsPersisted: rows.length, error: message };
    await updateStreamHealth('degraded', failureMeta, {
      last_error: new Date().toISOString(),
      error_count: errorCount
    });
    await logInvocation('error', failureMeta, startedAt);
    throw err;
  }
}

async function updateStreamHealth(
  status: 'healthy' | 'degraded',
  metadata: Record<string, unknown>,
  timestamps: { last_success?: string; last_error?: string; error_count?: number }
) {
  if (!supabase) return;
  try {
    const payload: Record<string, unknown> = {
      stream_key: STREAM_KEY,
      status,
      updated_at: new Date().toISOString(),
      metadata
    };
    if (timestamps.last_success) payload.last_success = timestamps.last_success;
    if (timestamps.last_error) payload.last_error = timestamps.last_error;
    if (typeof timestamps.error_count === 'number') payload.error_count = timestamps.error_count;
    await supabase.from('stream_health').upsert(payload, { onConflict: 'stream_key' });
  } catch (err) {
    console.error('Failed to update stream health', err);
  }
}

async function persistGridSnapshots(rows: any[]) {
  if (!supabase || rows.length === 0) return;
  try {
    const upsertRows = rows.map((row: any) => {
      const demand = typeof row.demand_mw === 'number' ? row.demand_mw : null;
      const supply = row.supply_mw ?? (demand !== null ? demand * 1.05 : null);
      const reserve = demand !== null && supply !== null && demand > 0
        ? (supply - demand) / demand
        : null;
      return {
        region: row.region || 'Ontario',
        demand_mw: demand,
        supply_mw: supply,
        reserve_margin: reserve,
        frequency_hz: row.frequency_hz ?? 60,
        voltage_kv: row.voltage_kv ?? 120,
        congestion_index: row.congestion_index ?? null,
        data_source: row.source || 'IESO',
        status: row.status || 'stable',
        captured_at: row.timestamp || new Date().toISOString()
      };
    });
    const { error } = await supabase.from('grid_status').upsert(upsertRows, {
      onConflict: 'region,captured_at'
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (err) {
    console.error('Failed to persist grid snapshots', err);
    throw err;
  }
}

// IESO API configuration
const IESO_CONFIG = {
  BASE_URL: 'https://www.ieso.ca/-/media/Files/Toronto-Market-Results',
  ENDPOINTS: {
    HOURLY_DEMAND: '/Current/Hourly_Demand.csv',
    HOURLY_PRICES: '/Current/Hourly_Price.csv',
    MARKET_STATUS: '/Current/Market_Status.json',
  },
  POLL_INTERVAL_MS: 60000, // Poll every 60 seconds (IESO rate limits)
  MAX_RETRIES: 3,
  ERROR_RETRY_DELAY_MS: 300000, // 5 minutes for errors
  FETCH_TIMEOUT_MS: 30000, // 30 second timeout
};

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = IESO_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`IESO fetch attempt ${attempt + 1}/${maxRetries}: ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(IESO_CONFIG.FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`IESO fetch successful on attempt ${attempt + 1}`);
      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`IESO fetch attempt ${attempt + 1} failed:`, lastError.message);

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

// Global state for caching and deduplication
const lastDataTimestamps: Map<string, string> = new Map();
let errorCount = 0;
let lastSuccessfulFetch = Date.now();

/**
 * Fetch IESO hourly demand data with retry logic
 */
async function fetchIESODemandData(): Promise<any[]> {
  const url = `${IESO_CONFIG.BASE_URL}${IESO_CONFIG.ENDPOINTS.HOURLY_DEMAND}`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Energy Dashboard/1.0',
        'Accept': 'text/csv',
        'Cache-Control': 'no-cache'
      }
    });

    const csvText = await response.text();
    const data = parseIESOCSV(csvText);
    lastSuccessfulFetch = Date.now();
    errorCount = 0;

    return data;

  } catch (error) {
    console.error('IESO Demand Fetch Error:', error);
    errorCount++;
    throw error;
  }
}

/**
 * Fetch IESO hourly price data with retry logic
 */
async function fetchIESOPriceData(): Promise<any[]> {
  const url = `${IESO_CONFIG.BASE_URL}${IESO_CONFIG.ENDPOINTS.HOURLY_PRICES}`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Energy Dashboard/1.0',
        'Accept': 'text/csv'
      }
    });

    const csvText = await response.text();
    const data = parseIESOCSV(csvText);
    return data;

  } catch (error) {
    console.error('IESO Price Fetch Error:', error);
    throw error;
  }
}

/**
 * Combine and enrich IESO data
 */
async function getIESOCombinedData(): Promise<any[]> {
  const { rows } = await collectIESOData();
  return rows;
}

/**
 * Parse IESO CSV format to JSON
 */
function parseIESOCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Find last valid data row (IESO may have metadata/comments)
  let dataIndex = lines.length - 1;

  // Look for actual data row (contains numbers)
  for (let i = lines.length - 1; i >= 1; i--) {
    const cells = lines[i].split(',');
    if (cells.length >= 2 && !isNaN(parseFloat(cells[cells.length - 1]))) {
      dataIndex = i;
      break;
    }
  }

  const lastDataRow = lines[dataIndex];
  const cells = lastDataRow.split(',');

  // IESO CSV typically has:
  // Hour, Ontario Demand, Market Price (Weighted Avg)

  return [{
    hour: cells[0]?.trim(),
    demand_mw: parseFloat(cells[1]) || 10000, // Default to 10GW if parsing fails
    price_cents_kwh: (parseFloat(cells[2]) / 10) || 8.0, // Convert $/MWh to $/kWh
    timestamp: new Date().toISOString(), // IESO doesn't provide timestamps in this format
    source: 'IESO'
  }];
}

/**
 * Combine demand and price data
 */
function combineIESOData(demandData: any[], priceData: any[]): any[] {
  if (demandData.length === 0 && priceData.length === 0) return [];

  const latestDemand = demandData[0] || { demand_mw: 10000 };
  const latestPrice = priceData[0] || { price_cents_kwh: 8.0 };

  return [{
    ...latestDemand,
    ...latestPrice,
    timestamp: new Date().toISOString(),
    region: 'Ontario',
    source: 'IESO'
  }];
}

/**
 * Filter out data we've already sent
 */
function filterNewData(data: any[]): any[] {
  const lastTimestamp = lastDataTimestamps.get('ontario-demand');
  const newData = data.filter(item => !lastTimestamp || item.timestamp > lastTimestamp);

  if (newData.length > 0) {
    lastDataTimestamps.set('ontario-demand', newData[newData.length - 1].timestamp);
  }

  return newData;
}

/**
 * Handle health check requests with ?since=YYYY-MM-DDTHH:mm:ssZ
 */
function handleSinceParameter(request: Request): string | null {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get('since');

  if (sinceParam) {
    try {
      const sinceDate = new Date(sinceParam);
      if (isNaN(sinceDate.getTime())) {
        throw new Error('Invalid date format');
      }
      return sinceParam;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Main Edge Function handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
  }

  // Handle health check or static snapshot requests
  const sinceTimestamp = handleSinceParameter(req);
  if (req.method === 'GET' && req.url.includes('health')) {
    return handleHealthRequest();
  }

  if (req.method === 'GET' && sinceTimestamp) {
    return handleSnapshotRequest(sinceTimestamp);
  }

  // Main endpoint
  if (req.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  // Check if this is a batch request (has query parameters)
  const url = new URL(req.url);
  const hasParams = Array.from(url.searchParams.keys()).length > 0;

  if (hasParams) {
    // Return JSON for batch requests
    try {
      // Parse query parameters
      const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
      const cursor = url.searchParams.get('cursor') || undefined;
      
      let data: any[] = [];
      let source = 'IESO';
      let usedSample = false;

      // Try to get real IESO data first
      try {
        data = await getIESOCombinedData();
        console.log(`IESO API returned ${data.length} records`);
      } catch (iesoError) {
        console.warn('IESO API unavailable, using sample data:', iesoError);
        usedSample = true;
      }

      // If IESO returned empty or failed, use sample data
      if (data.length === 0) {
        console.log('IESO data empty, loading sample data...');
        const sampleData = await getOntarioDemandSample();
        const paginated = paginateSampleData(sampleData, limit, cursor);
        
        // Transform sample data to match expected format
        const transformedRows = paginated.rows.map((row: any) => ({
          datetime: row.datetime || new Date().toISOString(),
          hour_ending: row.hour_ending || new Date().getHours(),
          total_demand_mw: row.total_demand_mw || row.demand_mw || 15000,
          hourly_demand_gwh: row.hourly_demand_gwh || (row.total_demand_mw || 15000) / 1000,
          date: row.date || new Date().toISOString().split('T')[0],
          source: 'kaggle',
          version: '1.0-sample'
        }));
        
        return new Response(JSON.stringify({
          dataset: 'ontario-demand',
          rows: transformedRows,
          metadata: {
            hasMore: paginated.hasMore,
            totalEstimate: sampleData.length,
            usingSampleData: true
          },
          timestamp: new Date().toISOString(),
          source: 'Sample Data (IESO unavailable)'
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Next-Cursor': paginated.nextCursor || ''
          },
          status: 200
        });
      }

      // Transform and return IESO data
      const transformedData = data.map((row: any) => ({
        datetime: row.timestamp || new Date().toISOString(),
        hour_ending: row.hour || new Date().getHours(),
        total_demand_mw: row.demand_mw || 15000,
        hourly_demand_gwh: (row.demand_mw || 15000) / 1000,
        date: (row.timestamp || new Date().toISOString()).split('T')[0],
        source: 'kaggle',
        version: '1.0-ieso'
      }));
      
      return new Response(JSON.stringify({
        dataset: 'ontario-demand',
        rows: transformedData,
        metadata: {
          hasMore: false,
          totalEstimate: transformedData.length,
          usingSampleData: usedSample
        },
        timestamp: new Date().toISOString(),
        source: usedSample ? 'Sample Data' : 'IESO'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('Critical error in stream-ontario-demand:', error);
      return new Response(JSON.stringify({
        error: 'Failed to fetch data',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  // Create SSE stream for real-time requests
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeSSE('hello', { message: 'IESO Ontario Demand Stream Connected', timestamp: new Date().toISOString() }));

      while (true) {
        try {
          const { rows, metadata } = await fetchAndPersistIESOData({ skipFilter: true });

          if (rows.length > 0) {
            controller.enqueue(encodeSSE('data', {
              dataset: STREAM_KEY,
              rows,
              metadata,
              timestamp: new Date().toISOString()
            }));
          }

          controller.enqueue(encodeSSE('heartbeat', {
            lastActivity: new Date().toISOString(),
            connectionsActive: 1,
            metadata
          }));

          await delay(IESO_CONFIG.POLL_INTERVAL_MS);
        } catch (err) {
          console.error('IESO stream loop error', err);
          controller.enqueue(encodeSSE('error', {
            timestamp: new Date().toISOString(),
            message: err instanceof Error ? err.message : String(err)
          }));

          await delay(IESO_CONFIG.ERROR_RETRY_DELAY_MS ?? 300000);
        }
      }
    },

    cancel() {
      console.log('Client disconnected from IESO stream');
    }
  });

  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    status: 200
  });
});

/**
 * Handle health status requests
 */
function handleHealthRequest(): Response {
  const health = {
    service: 'ieso-ontario-stream',
    status: errorCount === 0 ? 'healthy' : 'degraded',
    lastSuccessfulFetch: new Date(lastSuccessfulFetch).toISOString(),
    errorCount,
    errorRatePercent: errorCount === 0 ? 0.0 : Math.round((errorCount / (Date.now() - lastSuccessfulFetch + 60000) * 100) * 100) / 100,
    uptime: timeSince(lastSuccessfulFetch),
    timestamp: new Date().toISOString(),
    provenance: {
      source: 'Independent Electricity System Operator (IESO)',
      endpoint: 'https://www.ieso.ca',
      dataType: 'Ontario electricity demand and pricing',
      refreshFrequency: 'every 60 seconds',
      terms: 'IESO Public Data'
    }
  };

  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

/**
 * Handle snapshot requests since a specific time
 */
async function handleSnapshotRequest(sinceISOString: string): Promise<Response> {
  try {
    const historicalData = await getIESOCombinedData();
    const latestData = historicalData.filter(item =>
      new Date(item.timestamp) >= new Date(sinceISOString)
    );

    return new Response(JSON.stringify({
      dataset: 'ontario-demand',
      rows: latestData,
      requested_since: sinceISOString,
      count: latestData.length,
      source: 'IESO',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch IESO snapshot data',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

/**
 * Encode data as SSE event
 */
function encodeSSE(event: string, data: any): Uint8Array {
  const eventStr = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(eventStr);
}

/**
 * Calculate uptime string
 */
function timeSince(startTime: number): string {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Error handler for the edge function
 */
addEventListener('error', (event) => {
  console.error('Uncaught error in IESO edge function:', event.error);
});

// Export for testing
export { parseIESOCSV, combineIESOData };
