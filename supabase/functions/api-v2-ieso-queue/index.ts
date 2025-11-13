import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://canada-energy.netlify.app",
  "https://*.netlify.app",
];

const envAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envAllowedOrigins,
  ...DEFAULT_ALLOWED_ORIGINS,
]));

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const fallbackOrigin = ALLOWED_ORIGINS[0] ?? DEFAULT_ALLOWED_ORIGINS[0];

  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

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
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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
  const type = url.searchParams.get('type'); // 'queue' or 'programs'
  const projectType = url.searchParams.get('project_type');
  const status = url.searchParams.get('status');

  try {
    // Fetch IESO interconnection queue
    let queueQuery = supabase
      .from('ieso_interconnection_queue')
      .select('*');

    if (projectType) {
      queueQuery = queueQuery.eq('project_type', projectType);
    }

    if (status) {
      queueQuery = queueQuery.eq('status', status);
    }

    const { data: queue, error: queueError } = await queueQuery
      .order('proposed_in_service_date', { ascending: true })
      .limit(100);

    if (queueError) {
      console.error('IESO queue query failed', queueError);
    }

    // Fetch procurement programs
    const { data: programs, error: programsError } = await supabase
      .from('ieso_procurement_programs')
      .select('*')
      .order('target_in_service_year', { ascending: false });

    if (programsError) {
      console.error('IESO programs query failed', programsError);
    }

    // Fetch summary statistics
    const { data: summary, error: summaryError} = await supabase
      .from('ieso_queue_summary')
      .select('*');

    if (summaryError) {
      console.warn('IESO queue summary query failed', summaryError);
    }

    // Calculate totals
    const totalQueueCapacity = (queue ?? []).reduce((sum, p) => sum + (p.capacity_mw ?? 0), 0);
    const batteryStorageCapacity = (queue ?? [])
      .filter(p => p.project_type === 'Battery Storage')
      .reduce((sum, p) => sum + (p.capacity_mw ?? 0), 0);

    const payload = {
      queue: queue ?? [],
      programs: programs ?? [],
      summary: summary ?? [],
      statistics: {
        total_queue_capacity_mw: totalQueueCapacity,
        battery_storage_capacity_mw: batteryStorageCapacity,
        project_count: (queue ?? []).length,
        program_count: (programs ?? []).length,
      },
      metadata: {
        source: 'IESO',
        last_updated: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled IESO queue API error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
