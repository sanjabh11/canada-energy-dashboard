import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type ProvincialGenerationRow = {
  date: string;
  province_code: string;
  source: string | null;
  generation_gwh: number;
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
  return {
    date: String(row.date ?? ''),
    province_code: String(row.province_code ?? ''),
    source: row.source ? String(row.source) : null,
    generation_gwh: Number(row.generation_gwh ?? 0),
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
    const offset = Math.max(Number(url.searchParams.get('offset') ?? url.searchParams.get('cursor') ?? '0'), 0);

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

    const rows = (data ?? []).map(mapRow);
    const total = typeof count === 'number' ? count : offset + rows.length;
    const nextOffset = offset + rows.length;
    const hasMore = nextOffset < total;

    const metadata = {
      streamKey: STREAM_KEY,
      limit,
      offset,
      returned: rows.length,
      totalEstimate: total,
      hasMore
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
    const metadata = { streamKey: STREAM_KEY, error: message };
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
});
