/**
 * Read-only storage status API and stateless dispatch simulation.
 * Learner dispatch requests return a simulated before/after state and never
 * persist battery state or dispatch logs.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
import { applyRateLimit } from '../_shared/rateLimit.ts';
import {
  createStorageDispatchHandler,
  type BatteryState,
  type DispatchLog,
  type RevenueLog,
  type StorageDispatchReader,
} from './handler.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  const rateLimit = applyRateLimit(req, 'api-v2-storage-dispatch');
  if (rateLimit.response) return rateLimit.response;
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const reader: StorageDispatchReader = {
      readBattery: (province) => readBattery(supabase, province),
      readStatusLogs: (province) => readLogs(supabase, province, 100),
      readRevenueLogs: (province, since) => readRevenueLogs(supabase, province, since),
      readLogs: (province, limit) => readLogs(supabase, province, limit),
    };
    const handler = createStorageDispatchHandler({
      ...reader,
      corsHeaders: () => corsHeaders,
    });
    return await handler(req);
  } catch (error) {
    console.error('Storage dispatch error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface StorageQueryResult<T> {
  data: T | null;
  error: { code?: string } | null;
}

interface StorageSelectQuery<T> extends PromiseLike<StorageQueryResult<T>> {
  eq(column: string, value: string): StorageSelectQuery<T>;
  gte(column: string, value: string): StorageSelectQuery<T>;
  order(column: string, options: { ascending: boolean }): StorageSelectQuery<T>;
  limit(count: number): StorageSelectQuery<T>;
  single(): PromiseLike<StorageQueryResult<T>>;
}

interface StorageReadClient {
  from(table: string): {
    select<T = unknown>(columns?: string): StorageSelectQuery<T>;
  };
}

function storageReadClient(client: unknown): StorageReadClient {
  return client as StorageReadClient;
}

async function readBattery(
  supabase: unknown,
  province: string,
): Promise<BatteryState | null> {
  const { data, error } = await storageReadClient(supabase)
    .from('batteries_state')
    .select<BatteryState>('*')
    .eq('province', province)
    .order('last_updated', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function readLogs(
  supabase: unknown,
  province: string,
  limit: number,
): Promise<DispatchLog[]> {
  const { data, error } = await storageReadClient(supabase)
    .from('storage_dispatch_logs')
    .select<DispatchLog[]>('*')
    .eq('province', province)
    .order('dispatched_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

async function readRevenueLogs(
  supabase: unknown,
  province: string,
  since: string,
): Promise<RevenueLog[]> {
  const { data, error } = await storageReadClient(supabase)
    .from('storage_dispatch_logs')
    .select<RevenueLog[]>('expected_revenue_cad, actual_revenue_cad, dispatched_at')
    .eq('province', province)
    .gte('dispatched_at', since)
    .order('dispatched_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data ?? [];
}
