import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { callLLM } from "../llm/call_llm_adapter.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Add cache and complex logic similar to LLM function
const cache = new Map<string, { expires: number; payload: any }>();
const memoryReports: any[] = [];

// Complex array operations that might be failing
function buildSnippets(rows: any[], numericSummary: any, maxSnippets = 3): Array<{ text: string; context?: string }>{
  const out: Array<{ text: string; context?: string }> = [];
  try {
    const cols = Object.entries((numericSummary?.columns || {})) as Array<[string, any]>;
    const metric = cols.find(([, v]) => v && typeof v.mean === 'number');
    if (metric) {
      const [name, v] = metric;
      out.push({ text: `${name} mean ≈ ${Number(v.mean).toFixed(2)} (n=${v.count})`, context: 'numeric_summary' });
    }
    const take = Math.max(0, maxSnippets - out.length);
    for (let i = 0; i < Math.min(take, rows.length); i++) {
      const r = rows[i];
      out.push({ text: JSON.stringify(r).slice(0, 240), context: 'sample_row' });
    }
  } catch (_) { /* noop */ }
  return out;
}

// Complex regex patterns that might be failing
const SENSITIVE_TOPICS = [
  "terror", "bioweapon", "radiological", "critical infrastructure mapping", "zero-day"
];

function isSensitiveTopic(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SENSITIVE_TOPICS.some((kw) => lower.includes(kw));
}

serve(async (req: Request) => {
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
    console.log('Step 4: Testing complex operations...');

    // Test complex array operations
    const testRows = [{ id: 1, text: "test" }, { id: 2, text: "sensitive topic" }];
    const numericSummary = { count: 2, columns: { count: { min: 1, max: 2, mean: 1.5, count: 2 }}};

    const snippets = buildSnippets(testRows, numericSummary, 3);
    const sensitiveCheck = isSensitiveTopic(testRows[1].text);

    // Test deep object access patterns
    const testObj = {
      candidates: [{
        content: {
          parts: [{ text: "test response" }]
        }
      }]
    };

    const deepAccess = testObj?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Test cache operations
    const cacheKey = `test:${Date.now()}`;
    cache.set(cacheKey, {
      expires: Date.now() + 1000 * 60 * 15,
      payload: { result: "cached test" }
    });

    const cachedItem = cache.get(cacheKey);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Step 4: Complex operations test",
        snippets: snippets.length,
        sensitiveCheck,
        deepAccess,
        cacheWorking: !!cachedItem,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      }
    );
  } catch (err) {
    console.error('Step 4 error:', err);
    return new Response(
      JSON.stringify({ error: String(err), step: "step4" }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});