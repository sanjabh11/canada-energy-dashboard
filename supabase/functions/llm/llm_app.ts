// @ts-nocheck
// LLM App Module - All handlers and utilities moved from index.ts
// This is lazily imported by the minimal bootstrap in index.ts

// Local adapter within this function (defer import to avoid cold start failures)
let __callLLM: any = null;
async function getCallLLM() {
  if (!__callLLM) {
    const mod = await import("./call_llm_adapter.ts");
    __callLLM = mod.callLLM;
  }
  return __callLLM;
}

// Environment
const WRAPPER_BASE_URL = Deno.env.get("WRAPPER_BASE_URL") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  || Deno.env.get("PROJECT_URL")
  || Deno.env.get("SB_URL")
  || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  || Deno.env.get("SERVICE_ROLE_KEY")
  || Deno.env.get("SB_SERVICE_ROLE_KEY")
  || "";
let supabase: any = null;
async function ensureSupabase() {
  if (supabase || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return supabase;
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  } catch (e) {
    console.warn('Failed to initialize Supabase client (deferred):', String(e));
    supabase = null;
  }
  return supabase;
}

const COST_PER_1K_TOKENS = Number(Deno.env.get('LLM_COST_PER_1K') || 0);
const LLM_ENABLED = (Deno.env.get('LLM_ENABLED') ?? 'true') !== 'false';
const CACHE_TTL_MIN = Number(Deno.env.get('LLM_CACHE_TTL_MIN') || 15);
const cache = new Map<string, { expires: number; payload: any }>();
const memoryReports: any[] = [];

const jsonHeaders = { 'Content-Type': 'application/json' };

// Build small snippet array from numeric summary and sample rows for provenance depth
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

// Redact basic PII from text/rows and provide a short summary of redactions performed
function redactPIIWithSummary(input: unknown): { redacted: any; summary: Record<string, number> } {
  const summary: Record<string, number> = { emails: 0, phones: 0, numbers: 0 };
  const redactText = (txt: string) => {
    let out = txt;
    out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => { summary.emails++; return '[redacted-email]'; });
    out = out.replace(/\b(?:\+?\d[\s-]?){7,15}\b/g, (m) => {
      const digits = (m.match(/\d/g) || []).length;
      if (digits >= 7) { summary.phones++; return '[redacted-phone]'; }
      return m;
    });
    out = out.replace(/\b\d{6,}\b/g, () => { summary.numbers++; return '[redacted-number]'; });
    return out;
  };
  const walk = (val: any): any => {
    if (val == null) return val;
    if (typeof val === 'string') return redactText(val);
    if (Array.isArray(val)) return val.map(walk);
    if (typeof val === 'object') {
      const o: Record<string, any> = {};
      for (const k of Object.keys(val)) o[k] = walk(val[k]);
      return o;
    }
    return val;
  };
  const redacted = walk(input);
  return { redacted, summary };
}

function extractTextFromLLM(resp: any): string | null {
  try {
    if (!resp) return null;
    if (typeof resp === 'string') return resp;
    const parts = resp?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const text = parts.map((p: any) => p?.text || '').join('').trim();
      return text || null;
    }
    if (typeof resp.output_text === 'string' && resp.output_text.trim()) {
      return resp.output_text.trim();
    }
  } catch (_) { /* ignore */ }
  return null;
}

function calcTokenCost(messages: Array<{ role: string; content: string }>): { tokens: number; usd: number } {
  try {
    const COST_PER_1K = COST_PER_1K_TOKENS || 0;
    const text = messages.map(m => m.content || '').join('\n');
    const approxTokens = Math.ceil(text.length / 4);
    const usd = (approxTokens / 1000) * COST_PER_1K;
    return { tokens: approxTokens, usd: Number(usd.toFixed(6)) };
  } catch (_) {
    return { tokens: 0, usd: 0 };
  }
}

const SAFETY_BLACKLIST = [
  "sabotage", "attack", "how to sabotage", "disable the grid", "exploit", "bomb",
  "kill the grid", "hack the", "malware", "exploit the", "ddos", "denial of service", "poison"
];

const SENSITIVE_TOPICS = [
  "terror", "bioweapon", "radiological", "critical infrastructure mapping", "zero-day"
];

function isBlacklisted(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SAFETY_BLACKLIST.some((kw) => lower.includes(kw));
}

const MAX_REQS_PER_MINUTE = Number(Deno.env.get('LLM_MAX_RPM') || 30);
type RateLimitResult = { ok: boolean; remaining?: number; limit?: number };
async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  await ensureSupabase();
  if (!supabase) return { ok: true };
  try {
    const now = Date.now();
    const windowMs = Math.floor(now / 60000) * 60000;
    const windowIso = new Date(windowMs).toISOString();
    const { data, error } = await (supabase as any).rpc('llm_rl_increment', {
      p_user_id: userId,
      p_window: windowIso,
      p_default_limit: MAX_REQS_PER_MINUTE,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const used = Number(row?.count ?? 0);
    const limit = Number(row?.user_quota ?? MAX_REQS_PER_MINUTE) || MAX_REQS_PER_MINUTE;
    const ok = used <= limit;
    return ok ? { ok: true, remaining: Math.max(0, limit - used), limit } : { ok: false, remaining: 0, limit };
  } catch (e) {
    console.warn('rate limit check failed', e);
    return { ok: true };
  }
}

function isSensitiveTopic(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SENSITIVE_TOPICS.some((kw) => lower.includes(kw));
}

function isIndigenousSensitive(datasetPath?: string, manifest?: any): boolean {
  const markers = ["indigenous", "first_nations", "first-nations", "firstnations", "inuit", "metis", "fnmi"];
  const target = `${datasetPath || ''} ${manifest?.dataset || ''} ${(manifest?.tags || []).join(' ')}`.toLowerCase();
  return markers.some(m => target.includes(m));
}

async function logCall(entry: any) {
  try {
    await ensureSupabase();
    if (!supabase) return;
    await supabase.from('llm_call_log').insert(entry);
  } catch (e) {
    console.warn('llm_call_log insert failed', e);
  }
}

async function logFeedback(entry: any) {
  try {
    await ensureSupabase();
    if (!supabase) return;
    await supabase.from('llm_feedback').insert(entry);
  } catch (e) {
    console.warn('llm_feedback insert failed', e);
  }
}

async function fetchManifest(datasetPath: string): Promise<any> {
  if (!WRAPPER_BASE_URL) {
    try {
      const url = new URL(`./mock-data/manifest_${datasetPath.replaceAll('/', '_')}.json`, import.meta.url);
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json();
        return json || { dataset: datasetPath };
      }
    } catch (_) { /* ignore and fallback */ }
    return { dataset: datasetPath, schema: [], sampleRows: [], license: 'unknown', estimatedRows: 0, last_updated: new Date().toISOString() };
  }
  const url = `${WRAPPER_BASE_URL}/api/manifest/${datasetPath}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.warn('manifest fetch failed', url, r.status);
    return { dataset: datasetPath, schema: [], sampleRows: [], license: 'unknown', estimatedRows: 0 };
  }
  return r.json();
}

async function fetchSampleRows(datasetPath: string, limit = 50): Promise<any[]> {
  if (!WRAPPER_BASE_URL) {
    try {
      const url = new URL(`./mock-data/sample_${datasetPath.replaceAll('/', '_')}.json`, import.meta.url);
      const resp = await fetch(url);
      if (resp.ok) {
        const arr = await resp.json();
        return Array.isArray(arr) ? arr.slice(0, limit) : [];
      }
    } catch (_) { /* ignore */ }
    return [];
  }
  const url = `${WRAPPER_BASE_URL}/api/stream/${datasetPath}?limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.warn('sample fetch failed', url, r.status);
    return [];
  }
  const json = await r.json();
  let out: any[] = Array.isArray(json) ? json.slice(0, limit) : (json.rows || []).slice(0, limit);
  let sampleUrl = '';
  if (datasetPath === 'hf_electricity_demand') sampleUrl = 'https://qnymbecjgeaoxsfphrti.supabase.co/data/hf_electricity_demand_sample.json';
  if (datasetPath === 'ontario_demand') sampleUrl = 'https://qnymbecjgeaoxsfphrti.supabase.co/data/ontario_demand_sample.json';
  if (datasetPath === 'ontario_prices') sampleUrl = 'https://qnymbecjgeaoxsfphrti.supabase.co/data/ontario_prices_sample.json';
  if (!out || out.length === 0) {
    try {
      const resp = await fetch(sampleUrl);
      if (resp.ok) {
        const arr = await resp.json();
        if (Array.isArray(arr) && arr.length) out = arr.slice(0, limit);
      }
    } catch (_) { /* ignore */ }
  }
  return out || [];
}

function summarizeNumericRows(rows: any[], numericColumns: string[] = []) {
  if (!rows || rows.length === 0) return { count: 0, columns: {} as Record<string, any> };
  const sample = rows[0];
  if (!numericColumns.length) {
    numericColumns = Object.keys(sample).filter((k) => {
      const v = sample[k];
      return (typeof v === 'number') || (!Number.isNaN(Number(v)) && v !== '');
    });
  }
  const columns: Record<string, any> = {};
  for (const c of numericColumns) {
    const vals: number[] = [];
    for (const r of rows) {
      const v = r[c];
      const n = (typeof v === 'number') ? v : (v === null || v === undefined || v === '') ? NaN : Number(v);
      if (!Number.isNaN(n)) vals.push(n);
    }
    if (vals.length) {
      const sum = vals.reduce((a, b) => a + b, 0);
      columns[c] = { min: Math.min(...vals), max: Math.max(...vals), mean: sum / vals.length, count: vals.length };
    } else {
      columns[c] = null;
    }
  }
  return { count: rows.length, columns };
}

async function callLLM(params: any): Promise<any> {
  const fn = await getCallLLM();
  return await fn(params);
}

// Handler functions
async function handleTransitionKpis(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 500);

  let totalMWh: number | null = null;
  let topSource: { type: string; mwh: number } | null = null;
  let renewableShare: number | null = null;

  try {
    if (rows.length) {
      const first = rows[0] || {} as any;
      const typeKey = 'generation_type' in first ? 'generation_type'
                     : 'source' in first ? 'source'
                     : null;
      const mwhKey = 'megawatt_hours' in first ? 'megawatt_hours'
                    : 'generation_mwh' in first ? 'generation_mwh'
                    : null;
      if (typeKey && mwhKey) {
        const agg: Record<string, number> = {};
        for (const r of rows) {
          const t = String(r[typeKey] || '').toLowerCase();
          const v = Number(r[mwhKey] || 0);
          if (!Number.isFinite(v)) continue;
          agg[t] = (agg[t] || 0) + v;
        }
        totalMWh = Object.values(agg).reduce((a, b) => a + b, 0);
        const top = Object.entries(agg).sort((a, b) => b[1] - a[1])[0];
        if (top) topSource = { type: top[0], mwh: top[1] };
        const renewableKeys = ['hydro', 'wind', 'solar', 'biomass', 'geothermal'];
        const ren = Object.entries(agg).filter(([k]) => renewableKeys.some(r => k.includes(r))).reduce((a, [, v]) => a + v, 0);
        renewableShare = totalMWh && totalMWh > 0 ? ren / totalMWh : null;
      }
    }
  } catch (_) { /* noop */ }

  if (rows.length === 0) {
    totalMWh ??= 0;
    topSource ??= { type: 'unknown', mwh: 0 };
    renewableShare ??= 0;
  }

  const result = {
    dataset: manifest.dataset || datasetPath,
    timeframe: timeframe || 'recent',
    kpis: {
      total_mwh: totalMWh,
      top_source: topSource,
      renewable_share: renewableShare,
    },
    sources: [{
      id: manifest.dataset || datasetPath,
      last_updated: manifest.last_updated || new Date().toISOString(),
      excerpt: rows[0] ? JSON.stringify(rows[0]).slice(0, 200) : 'manifest',
      snippets: buildSnippets(rows.slice(0, 5), summarizeNumericRows(rows), 3)
    }],
  };
  return new Response(JSON.stringify({ result }), { headers: jsonHeaders });
}

async function handleHistory(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const datasetPath = url.searchParams.get('datasetPath') || undefined;
    const endpoint = url.searchParams.get('type') || undefined;
    const limit = Math.min(100, Number(url.searchParams.get('limit') || 20));

    const matchesFilter = (r: any) =>
      (!datasetPath || r.dataset_path === datasetPath) &&
      (!endpoint || r.endpoint === endpoint);

    let merged: any[] = memoryReports.filter(matchesFilter);

    await ensureSupabase();
    if (supabase) {
      let query = supabase.from('llm_reports').select('*').order('created_at', { ascending: false }).limit(limit) as any;
      if (datasetPath) query = query.eq('dataset_path', datasetPath);
      if (endpoint) query = query.eq('endpoint', endpoint);
      const { data, error } = await query;
      if (error) {
        console.warn('llm_reports select failed', error);
      } else if (Array.isArray(data)) {
        const key = (x: any) => `${x.created_at}|${x.endpoint}|${x.dataset_path}`;
        const seen = new Set(merged.map(key));
        for (const d of data) {
          const k = key(d);
          if (!seen.has(k)) { merged.push(d); seen.add(k); }
        }
        if (merged.length === 0) {
          try {
            let q2 = supabase.from('llm_call_log').select('*').order('created_at', { ascending: false }).limit(limit) as any;
            if (datasetPath) q2 = q2.eq('dataset_path', datasetPath);
            if (endpoint) q2 = q2.eq('endpoint', endpoint);
            const { data: logRows, error: logErr } = await q2;
            if (!logErr && Array.isArray(logRows)) {
              const mapped = logRows.map((r: any) => ({
                created_at: r.created_at,
                endpoint: r.endpoint,
                dataset_path: r.dataset_path,
                timeframe: r.meta?.timeframe || null,
                focus: r.prompt || null,
                payload: r.response_summary ? { summary: r.response_summary } : null,
              }));
              merged = mapped;
            }
          } catch (e) {
            console.warn('history fallback to llm_call_log failed', e);
          }
        }
      }
    }

    merged.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return new Response(JSON.stringify({ result: merged.slice(0, limit) }), { headers: jsonHeaders });
  } catch (e) {
    console.warn('handleHistory error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders });
  }
}

async function handleExplainChart(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, panelId, timeframe, userPrompt } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(userPrompt) || isSensitiveTopic(userPrompt)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 50);
  const numericSummary = summarizeNumericRows(rows);

  if (isIndigenousSensitive(datasetPath, manifest)) {
    logCall({ endpoint: 'explain-chart', dataset_path: datasetPath, panel_id: panelId, user_id: userId, prompt: userPrompt || null, status_code: 451, duration_ms: 0, cost_usd: 0, response_summary: null, provenance: null, meta: { timeframe, reason: 'indigenous_guard' } });
    return new Response(JSON.stringify({ error: 'Dataset flagged as Indigenous-related. Consent and governance checks required before LLM processing.', code: 'INDIGENOUS_GUARD' }), { status: 451, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  }

  const result = {
    tl_dr: `Chart data for ${manifest.dataset || datasetPath} with ${rows.length} sample rows.`,
    trends: [`Sample contains ${numericSummary.count} rows`, 'Data appears to be energy-related'],
    classroom_activity: 'Analyze the energy data trends and create a simple chart showing the main patterns.',
    provenance: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), note: 'manifest' }]
  };
  
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleAnalyticsInsight(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, queryType } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(queryType) || isSensitiveTopic(queryType)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 200);
  const numericSummary = summarizeNumericRows(rows);

  const result = {
    summary: `Analytics insight for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows analyzed.`,
    key_findings: [`Dataset contains ${numericSummary.count} sampled rows`, 'Energy data patterns detected'],
    policy_implications: ['Preliminary insights only. Re-run later for model-backed analysis.'],
    confidence: 'low',
    sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }]
  };

  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleTransitionReport(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, focus } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 150);
  const numericSummary = summarizeNumericRows(rows);

  if (isIndigenousSensitive(datasetPath, manifest)) {
    logCall({ endpoint: 'transition-report', dataset_path: datasetPath, panel_id: null, user_id: userId, prompt: focus || null, status_code: 451, duration_ms: 0, cost_usd: 0, response_summary: null, provenance: null, meta: { timeframe, reason: 'indigenous_guard' } });
    return new Response(JSON.stringify({ error: 'Dataset flagged as Indigenous-related. Consent and governance checks required before LLM processing.', code: 'INDIGENOUS_GUARD' }), { status: 451, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  }

  const result = {
    summary: `Transition report for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows analyzed.`,
    progress: ['Energy transition metrics analyzed'],
    risks: ['Limited context; treat as preliminary.'],
    recommendations: ['Collect more data and retry later.'],
    confidence: 'low',
    sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }]
  };

  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleDataQuality(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, focus, logs } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  
  // Check focus field for blacklisted content
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });
  
  // Check logs array for blacklisted content
  if (logs && Array.isArray(logs)) {
    for (const log of logs) {
      const logText = log?.msg || log?.message || String(log);
      if (isBlacklisted(logText) || isSensitiveTopic(logText)) {
        return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });
      }
    }
  }

  if (!LLM_ENABLED) {
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 100);
  const numericSummary = summarizeNumericRows(rows);

  const result = {
    summary: `Data quality assessment for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows checked.`,
    quality_score: 0.75,
    issues: ['Sample size limited', 'Full validation pending'],
    recommendations: ['Increase sample size', 'Run comprehensive validation'],
    sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }]
  };

  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/llm\b/, '');

  if (req.method === 'POST' && (path === '/transition-kpis' || url.pathname.endsWith('/transition-kpis'))) {
    return await handleTransitionKpis(req);
  }
  if (req.method === 'GET' && (path === '/history' || url.pathname.endsWith('/history'))) {
    return await handleHistory(req);
  }
  if (req.method === 'POST' && (path === '/explain-chart' || url.pathname.endsWith('/explain-chart'))) {
    return await handleExplainChart(req);
  }
  if (req.method === 'POST' && (path === '/analytics-insight' || url.pathname.endsWith('/analytics-insight'))) {
    return await handleAnalyticsInsight(req);
  }
  if (req.method === 'POST' && (path === '/transition-report' || url.pathname.endsWith('/transition-report'))) {
    return await handleTransitionReport(req);
  }
  if (req.method === 'POST' && (path === '/data-quality' || url.pathname.endsWith('/data-quality'))) {
    return await handleDataQuality(req);
  }

  return new Response(JSON.stringify({ error: 'Route not implemented yet' }), { status: 503, headers: jsonHeaders });
}
