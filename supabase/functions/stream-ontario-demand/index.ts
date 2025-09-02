import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

type Row = {
  datetime: string
  hour_ending: number
  total_demand_mw: number
  hourly_demand_gwh: number
  date: string
  source: 'kaggle'
  version: string
}

function makeRows(limit: number, offset: number): Row[] {
  const rows: Row[] = []
  const baseTime = Date.now() - 24 * 60 * 60 * 1000
  for (let i = 0; i < limit; i++) {
    const n = offset + i
    const ts = new Date(baseTime + n * 60 * 60 * 1000) // hourly
    const hour = ts.getUTCHours()
    const demand = 12000 + Math.floor(500 * Math.sin((hour / 24) * Math.PI * 2)) + (n % 200)
    rows.push({
      datetime: ts.toISOString(),
      hour_ending: (hour + 1) % 24,
      total_demand_mw: demand,
      hourly_demand_gwh: Math.round((demand / 1000) * 10) / 10,
      date: ts.toISOString().slice(0, 10),
      source: 'kaggle',
      version: '1.0-stub',
    })
  }
  return rows
}

Deno.serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 1000)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? url.searchParams.get('cursor') ?? '0'), 0)

    const rows = makeRows(limit, offset)
    const nextOffset = rows.length < limit ? null : offset + limit

    const hasMore = nextOffset !== null
    const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders })
    if (hasMore) headers.set('x-next-cursor', String(nextOffset))

    const body = {
      rows,
      metadata: {
        hasMore,
        totalEstimate: 500_000
      }
    }

    return new Response(JSON.stringify(body), { headers, status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as any)?.message ?? err) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    })
  }
})
