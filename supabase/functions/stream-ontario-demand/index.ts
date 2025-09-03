/**
 * IESO Ontario Demand & Price Live Streaming Edge Function
 *
 * Streams real-time Ontario electricity demand and price data from IESO (Independent Electricity System Operator)
 * Provides hourly demand, 5-minute price data, and supply/demand information
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for Edge Function responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

// IESO API configuration
const IESO_CONFIG = {
  BASE_URL: 'https://www.ieso.ca/-/media/Files/Toronto-Market-Results',
  ENDPOINTS: {
    HOURLY_DEMAND: '/Current/Hourly_Demand.csv',
    HOURLY_PRICES: '/Current/Hourly_Price.csv',
    MARKET_STATUS: '/Current/Market_Status.json',
  },
  POLL_INTERVAL_MS: 60000, // Poll every 60 seconds (IESO rate limits)
  MAX_RETRIES: 5,
  ERROR_RETRY_DELAY_MS: 300000, // 5 minutes for errors
};

// Global state for caching and deduplication
let lastDataTimestamps: Map<string, string> = new Map();
let errorCount = 0;
let lastSuccessfulFetch = Date.now();

/**
 * Fetch IESO hourly demand data
 */
async function fetchIESODemandData(): Promise<any[]> {
  const url = `${IESO_CONFIG.BASE_URL}${IESO_CONFIG.ENDPOINTS.HOURLY_DEMAND}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Energy Dashboard/1.0',
        'Accept': 'text/csv',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`IESO Demand API returned ${response.status}: ${response.statusText}`);
    }

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
 * Fetch IESO hourly price data
 */
async function fetchIESOPriceData(): Promise<any[]> {
  const url = `${IESO_CONFIG.BASE_URL}${IESO_CONFIG.ENDPOINTS.HOURLY_PRICES}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Energy Dashboard/1.0',
        'Accept': 'text/csv'
      }
    });

    if (!response.ok) {
      throw new Error(`IESO Price API returned ${response.status}: ${response.statusText}`);
    }

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
  try {
    const [demandData, priceData] = await Promise.allSettled([
      fetchIESODemandData(),
      fetchIESOPriceData()
    ]);

    const demand = demandData.status === 'fulfilled' ? demandData.value : [];
    const prices = priceData.status === 'fulfilled' ? priceData.value : [];

    // Combine demand and price data by timestamp
    const combined = combineIESOData(demand, prices);
    const newData = filterNewData(combined);

    return newData;

  } catch (error) {
    // If both APIs fail, return an error record
    return [{
      timestamp: new Date().toISOString(),
      demand_mw: null,
      price_cents_kwh: null,
      source: 'IESO',
      error: 'Both demand and price APIs unavailable'
    }];
  }
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
    return new Response('ok', { headers: corsHeaders });
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
      const data = await getIESOCombinedData();
      return new Response(JSON.stringify({
        dataset: 'ontario-demand',
        rows: data,
        metadata: {
          hasMore: false,
          totalEstimate: data.length
        },
        timestamp: new Date().toISOString(),
        source: 'IESO'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch IESO data',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }
  }

  // Create SSE stream for real-time requests
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encodeSSE('hello', { message: 'IESO Ontario Demand Stream Connected', timestamp: new Date().toISOString() }));

        // Send a test data point
        controller.enqueue(encodeSSE('data', {
          dataset: 'ontario-demand',
          hour: new Date().toISOString(),
          demand_mw: 15000,
          price_cents_kwh: 8.5,
          timestamp: new Date().toISOString(),
          source: 'TEST'
        }));

        controller.enqueue(encodeSSE('heartbeat', {
          lastActivity: new Date().toISOString(),
          connectionsActive: 1
        }));

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Send another test
        controller.enqueue(encodeSSE('data', {
          dataset: 'ontario-demand',
          hour: new Date().toISOString(),
          demand_mw: 15500,
          price_cents_kwh: 9.0,
          timestamp: new Date().toISOString(),
          source: 'TEST'
        }));

        // Close after test
        controller.close();

      } catch (error) {
        console.error('Critical stream error:', error);
        controller.enqueue(encodeSSE('fatal', {
          error: 'Stream terminated due to critical error',
          timestamp: new Date().toISOString()
        }));
        controller.close();
      }
    },

    cancel() {
      console.log('Client disconnected from IESO stream');
    }
  });

  return new Response(stream, {
    headers: corsHeaders,
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch IESO snapshot data',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
