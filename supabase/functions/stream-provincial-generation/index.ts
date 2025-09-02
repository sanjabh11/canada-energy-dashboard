import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

type Row = {
  date: string
  province: string
  producer: string
  generation_type: string
  megawatt_hours: number
  source: 'kaggle'
  version: string
}

const provinces = ['ON','QC','BC','AB','MB','SK','NS','NB','NL','PE']
const genTypes = ['Hydro','Nuclear','Wind','Solar','Gas','Coal']

function makeRows(limit: number, offset: number): Row[] {
  const rows: Row[] = []
  const start = new Date('2022-01-01T00:00:00Z')
  for (let i = 0; i < limit; i++) {
    const n = offset + i
    const d = new Date(start.getTime() + (n % 365) * 24 * 60 * 60 * 1000)
    rows.push({
      date: d.toISOString().slice(0,10),
      province: provinces[n % provinces.length],
      producer: `Producer_${(n % 20) + 1}`,
      generation_type: genTypes[n % genTypes.length],
      megawatt_hours: 1000 + (n % 300) * 5,
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
        totalEstimate: 50_000
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
