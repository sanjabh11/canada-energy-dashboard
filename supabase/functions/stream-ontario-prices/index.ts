import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

type Row = {
  datetime: string
  node_name: string
  lmp_price: number
  energy_price: number
  congestion_price: number
  loss_price: number
  zone: string
  market_date: string
  interval_ending: string
  source: 'kaggle'
  version: string
}

function makeRows(limit: number, offset: number): Row[] {
  const rows: Row[] = []
  const baseTime = Date.now() - 6 * 60 * 60 * 1000
  for (let i = 0; i < limit; i++) {
    const n = offset + i
    const ts = new Date(baseTime + n * 5 * 60 * 1000)
    const price = Math.round((30 + Math.sin(n / 10) * 10) * 100) / 100
    rows.push({
      datetime: ts.toISOString(),
      node_name: `ON_NODE_${(n % 10) + 1}`,
      lmp_price: price,
      energy_price: price - 2,
      congestion_price: 1.1,
      loss_price: 0.3,
      zone: 'ON',
      market_date: ts.toISOString().slice(0,10),
      interval_ending: new Date(ts.getTime() + 5*60*1000).toISOString(),
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
        totalEstimate: 2_500_000
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
