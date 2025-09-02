// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Shape expected by frontend (see src/lib/dataStreamers.ts -> HFElectricityDemandStreamer)
// Response body should be: { rows: HfRow[], metadata: { hasMore: boolean, totalEstimate?: number } }
// Header should include: 'x-next-cursor' when more pages exist

type HfRow = {
  datetime: string // ISO timestamp
  electricity_demand: number
  temperature: number
  humidity: number
  wind_speed: number
  solar_irradiance: number
  household_id: string
  location: string
  day_of_week: number
  hour: number
  source: 'huggingface'
  version: string
}

function makeFakeRows(limit: number, offset: number): HfRow[] {
  const rows: HfRow[] = []
  const baseTime = Date.now() - 6 * 60 * 60 * 1000 // last 6 hours
  for (let i = 0; i < limit; i++) {
    const n = offset + i
    const ts = new Date(baseTime + n * 5 * 60 * 1000) // 5-min intervals
    const hour = ts.getUTCHours()
    const dow = ts.getUTCDay()
    const demandBase = 950 + (hour % 6) * 20
    const demand = demandBase + (n % 15) * 3
    const temperature = 20 + Math.sin(n / 10) * 5
    const humidity = 40 + (n % 20)
    const wind = 5 + (n % 7)
    const solar = Math.max(0, 800 * Math.sin(((hour - 6) / 12) * Math.PI))

    rows.push({
      datetime: ts.toISOString(),
      electricity_demand: Math.round(demand),
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity),
      wind_speed: Math.round(wind * 10) / 10,
      solar_irradiance: Math.round(solar),
      household_id: `hh-${(n % 1000).toString().padStart(3, '0')}`,
      location: 'hf_demo',
      day_of_week: dow,
      hour,
      source: 'huggingface',
      version: '1.0-stub'
    })
  }
  return rows
}

Deno.serve(async (req: Request) => {
  // CORS preflight support
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
    const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0)

    const rows = makeFakeRows(limit, offset)
    const nextOffset = rows.length < limit ? null : offset + limit

    const hasMore = nextOffset !== null
    const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders })
    if (hasMore) headers.set('x-next-cursor', String(nextOffset))

    const body = {
      rows,
      metadata: {
        hasMore,
        totalEstimate: 10_000
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stream-hf-electricity-demand' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
