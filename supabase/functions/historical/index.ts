// Supabase Edge Function: historical
// Handles paged historical data exports
// Endpoints:
//  - GET /historical/{dataset}?limit=100&cursor=...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Supported datasets
const SUPPORTED_DATASETS = [
  'ontario-demand',
  'ontario-prices',
  'provincial-generation',
  'hf-electricity-demand'
];

const jsonHeaders = { 'Content-Type': 'application/json' };

async function fetchHistoricalData(dataset: string, limit: number = 100, cursor?: string) {
  if (!supabase) {
    return { error: 'Database not configured' };
  }

  try {
    let query = supabase
      .from('energy_data')
      .select('*')
      .eq('dataset', dataset)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (cursor) {
      // Assuming cursor is a timestamp string
      query = query.lt('timestamp', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return { error: 'Database query failed' };
    }

    // Get next cursor (timestamp of last item)
    const nextCursor = data && data.length === limit ? data[data.length - 1].timestamp : null;

    return {
      rows: data || [],
      next_cursor: nextCursor,
      provenance: {
        source: getDatasetSource(dataset),
        license: 'CC-BY-SA 4.0',
        last_updated: new Date().toISOString(),
        dataset: dataset
      }
    };
  } catch (err) {
    console.error('Historical data fetch error:', err);
    return { error: 'Failed to fetch historical data' };
  }
}

function getDatasetSource(dataset: string): string {
  const sources = {
    'ontario-demand': 'IESO - Independent Electricity System Operator',
    'ontario-prices': 'IESO - Independent Electricity System Operator',
    'provincial-generation': 'Natural Resources Canada',
    'hf-electricity-demand': 'Hugging Face Datasets / Kaggle'
  };
  return sources[dataset as keyof typeof sources] || 'Unknown Source';
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Extract dataset from path: /historical/{dataset}
    if (pathParts.length < 2 || pathParts[0] !== 'historical') {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const dataset = pathParts[1];

    if (!SUPPORTED_DATASETS.includes(dataset)) {
      return new Response(JSON.stringify({
        error: 'Unsupported dataset',
        supported: SUPPORTED_DATASETS
      }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: jsonHeaders
      });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000); // Max 1000
    const cursor = url.searchParams.get('cursor') || undefined;

    const result = await fetchHistoricalData(dataset, limit, cursor);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: jsonHeaders
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders
    });

  } catch (e) {
    console.error('Historical endpoint error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
});