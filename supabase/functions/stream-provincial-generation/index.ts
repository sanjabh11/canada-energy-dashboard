import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { getProvincialGenerationSample, paginateSampleData } from "../_shared/sampleDataLoader.ts";

type ProvincialGenerationRow = {
  date: string;
  province: string;
  province_code: string;
  producer: string | null;
  generation_type: string | null;
  megawatt_hours: number;
  generation_gwh: number;
  source: string | null;
  created_at: string | null;
  version: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const STREAM_KEY = 'provincial-generation';

async function logInvocation(
  status: 'success' | 'error',
  metadata: Record<string, unknown>,
  startedAt: number
) {
  if (!supabase) return;
  try {
    const duration = Math.max(0, Date.now() - startedAt);
    await supabase.from('edge_invocation_log').insert({
      function_name: 'stream-provincial-generation',
      status,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      metadata
    });
  } catch (err) {
    console.error('Provincial generation: failed to log invocation', err);
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
    console.error('Provincial generation: failed to update stream health', err);
  }
}

function mapRow(row: Record<string, unknown>): ProvincialGenerationRow {
  const gwhValue = Number(row.generation_gwh ?? 0);
  const mwhValue = Number(row.megawatt_hours ?? 0);
  return {
    date: String(row.date ?? ''),
    province: String(row.province ?? row.province_code ?? ''),
    province_code: String(row.province_code ?? ''),
    producer: row.producer ? String(row.producer) : null,
    generation_type: row.generation_type ? String(row.generation_type) : null,
    megawatt_hours: mwhValue > 0 ? mwhValue : gwhValue * 1000,
    generation_gwh: gwhValue > 0 ? gwhValue : mwhValue / 1000,
    source: row.source ? String(row.source) : 'kaggle',
    created_at: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    version: '1.0'
  };
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase client not configured' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500
    });
  }

  const startedAt = Date.now();
  let errorCount = 0;

  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 1000);
    const cursor = url.searchParams.get('cursor');
    const offset = cursor ? parseInt(cursor, 10) : 0;

    let rows: any[] = [];
    let usedSample = false;
    let total = 0;

    // Try to get data from database first
    try {
      const query = supabase
        .from('provincial_generation')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('province_code', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      rows = (data ?? []).map(mapRow);
      total = typeof count === 'number' ? count : offset + rows.length;
      console.log(`Database query returned ${rows.length} records`);
    } catch (dbError) {
      console.warn('Database query failed, using sample data:', dbError);
      usedSample = true;
    }

    // If database returned empty or failed, use sample data
    if (rows.length === 0) {
      console.log('Database empty, loading sample data...');
      const sampleData = await getProvincialGenerationSample();
      const paginated = paginateSampleData(sampleData, limit, cursor || undefined);
      
      const metadata = {
        streamKey: STREAM_KEY,
        limit,
        offset,
        returned: paginated.rows.length,
        totalEstimate: sampleData.length,
        hasMore: paginated.hasMore,
        usingSampleData: true
      };

      await updateStreamHealth('healthy', metadata, {
        last_success: new Date().toISOString(),
        error_count: 0
      });
      await logInvocation('success', metadata, startedAt);

      const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders });
      if (paginated.nextCursor) {
        headers.set('x-next-cursor', paginated.nextCursor);
      }

      return new Response(JSON.stringify({ 
        rows: paginated.rows, 
        metadata 
      }), { headers, status: 200 });
    }

    // Return database data
    const nextOffset = offset + rows.length;
    const hasMore = nextOffset < total;

    const metadata = {
      streamKey: STREAM_KEY,
      limit,
      offset,
      returned: rows.length,
      totalEstimate: total,
      hasMore,
      usingSampleData: usedSample
    };

    await updateStreamHealth('healthy', metadata, {
      last_success: new Date().toISOString(),
      error_count: errorCount
    });
    await logInvocation('success', metadata, startedAt);

    const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders });
    if (hasMore) {
      headers.set('x-next-cursor', String(nextOffset));
    }

    const body = { rows, metadata };
    return new Response(JSON.stringify(body), { headers, status: 200 });
  } catch (err) {
    errorCount++;
    const message = err instanceof Error ? err.message : String(err);
    
    // Last resort: try to return sample data even on critical error
    try {
      console.error('Critical error, attempting sample data fallback:', message);
      const sampleData = await getProvincialGenerationSample();
      const url = new URL(req.url);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 1000);
      const paginated = paginateSampleData(sampleData, limit);
      
      const metadata = {
        streamKey: STREAM_KEY,
        error: message,
        usingSampleData: true,
        returned: paginated.rows.length
      };

      await logInvocation('error', metadata, startedAt);

      return new Response(JSON.stringify({ 
        rows: paginated.rows, 
        metadata 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    } catch (sampleError) {
      // Complete failure
      const metadata = { streamKey: STREAM_KEY, error: message, sampleError: String(sampleError) };
      await updateStreamHealth('degraded', metadata, {
        last_error: new Date().toISOString(),
        error_count: errorCount
      });
      await logInvocation('error', metadata, startedAt);

      return new Response(JSON.stringify({ error: message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }
  }
});
