// @ts-nocheck
// Supabase Edge Function: llm - Minimal Bootstrap
// This is the minimal entry point that delegates to llm_app.ts for all non-health routes
// Keeps only essential CORS helpers and health endpoint to avoid cold-start BOOT_ERROR

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Minimal bootstrap env flags
const LLM_SAFE_MODE = (Deno.env.get('LLM_SAFE_MODE') || '') === '1';
const WRAPPER_BASE_URL_BOOT = Deno.env.get('WRAPPER_BASE_URL') || '';

const jsonHeaders = { 'Content-Type': 'application/json' };

function handleHealth(): Response {
  return new Response(JSON.stringify({ ok: true, mode: WRAPPER_BASE_URL_BOOT ? 'live' : 'mock' }), { headers: jsonHeaders });
}

// CORS helpers
const ALLOW_ORIGINS = (Deno.env.get('LLM_CORS_ALLOW_ORIGINS') || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function resolveOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOW_ORIGINS.includes('*')) return '*';
  if (origin && ALLOW_ORIGINS.some((o) => o === origin)) return origin;
  return ALLOW_ORIGINS[0] || '*';
}

function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-RateLimit-Limit, X-Cache, X-LLM-Mode');
  return new Response(res.body, { status: res.status, headers });
}

function handleOptions(req: Request): Response {
  const headers = new Headers();
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  const reqHeaders = req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type, x-user-id';
  headers.set('Access-Control-Allow-Headers', reqHeaders);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/functions\/v1\/llm\b/, '');

    // Preflight support for browser requests
    if (req.method === 'OPTIONS') {
      return handleOptions(req);
    }

    // Safe mode: only expose health endpoint to guarantee boot success
    if (LLM_SAFE_MODE) {
      if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
        return withCors(handleHealth(), req);
      }
      return withCors(new Response(JSON.stringify({ error: 'LLM in SAFE_MODE' }), { status: 503, headers: jsonHeaders }), req);
    }

    if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
      return withCors(handleHealth(), req);
    }

    // Delegate all other routes to the lazily-loaded app module
    const mod = await import('./llm_app.ts');
    if (typeof mod.handleRequest === 'function') {
      const res = await mod.handleRequest(req);
      return withCors(res, req);
    }

    return withCors(new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders }), req);
  } catch (e) {
    console.error('LLM function error', e);
    return withCors(new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders }), req);
  }
});
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 500);

  // Generic KPIs with dataset-aware branches
  let totalMWh: number | null = null;
  let topSource: { type: string; mwh: number } | null = null;
  let renewableShare: number | null = null;

  try {
    // Provincial generation dataset heuristic
    if (rows.length) {
      const first = rows[0] || {} as any;
      // Support multiple schemas
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

  // Fallback placeholders if dataset rows are empty
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

// History listing endpoint
async function handleHistory(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const datasetPath = url.searchParams.get('datasetPath') || undefined;
    const endpoint = url.searchParams.get('type') || undefined; // e.g., 'transition-report'
    const limit = Math.min(100, Number(url.searchParams.get('limit') || 20));

    const matchesFilter = (r: any) =>
      (!datasetPath || r.dataset_path === datasetPath) &&
      (!endpoint || r.endpoint === endpoint);

    // Start with in-memory entries (guaranteed same-instance archival visibility)
    let merged: any[] = memoryReports.filter(matchesFilter);

    if (supabase) {
      let query = supabase.from('llm_reports').select('*').order('created_at', { ascending: false }).limit(limit) as any;
      if (datasetPath) query = query.eq('dataset_path', datasetPath);
      if (endpoint) query = query.eq('endpoint', endpoint);
      const { data, error } = await query;
      if (error) {
        console.warn('llm_reports select failed', error);
      } else if (Array.isArray(data)) {
        // Merge DB + memory (dedupe by created_at+endpoint+dataset_path)
        const key = (x: any) => `${x.created_at}|${x.endpoint}|${x.dataset_path}`;
        const seen = new Set(merged.map(key));
        for (const d of data) {
          const k = key(d);
          if (!seen.has(k)) { merged.push(d); seen.add(k); }
        }
        // If still empty after merge, fall back to llm_call_log for visibility
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

    // Sort desc by created_at and limit
    merged.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return new Response(JSON.stringify({ result: merged.slice(0, limit) }), { headers: jsonHeaders });
  } catch (e) {
    console.warn('handleHistory error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders });
  }
}

async function handleAnalyticsInsight(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, queryType } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(queryType) || isSensitiveTopic(queryType)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `analytics:${datasetPath}:${timeframe || ''}:${(queryType || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 200);
  const numericSummary = summarizeNumericRows(rows);

  const systemPrompt = `SYSTEM: You are the Canada Energy Analytics Assistant. Your role: read the numeric summary and sample rows and produce a JSON with:\n{\n  "summary": "<2-3 sentence TL;DR for policy makers>",\n  "key_findings": ["<finding 1>", "..."],\n  "policy_implications": ["<implication 1>", "..."],\n  "confidence": "<low|med|high>",\n  "sources": [ { "id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<one-line sample or metric>" } ]\n}\nCite datasets used in the "sources" array. Do not make operational recommendations. For any high-risk request refuse.`;

  const userContext = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric Summary: ${JSON.stringify(numericSummary)}`,
    `Sample rows (first 10): ${JSON.stringify(rows.slice(0, 10))}`,
    `Requested analysis type: ${queryType || 'overview'}; timeframe: ${timeframe || 'recent'}`,
  ].join('\n\n');

  try {
    const rr2 = redactPIIWithSummary(rows.slice(0, 10));
    const rq = redactPIIWithSummary(queryType || '');
    const redactedRows2 = rr2.redacted;
    const redactedQuery = rq.redacted;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext.replace(JSON.stringify(rows.slice(0, 10)), JSON.stringify(redactedRows2)).replace(String(queryType || ''), String(redactedQuery)) },
    ];
    const est2 = calcTokenCost(messages);
    const started = Date.now();
    let parsed: any = null;
    let durationMs = 0;
    let usedFallback = false;
    try {
      const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1500 });
      durationMs = Date.now() - started;
      try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
    } catch (e) {
      durationMs = Date.now() - started;
      usedFallback = true;
      // Provider overloaded or error: synthesize a minimal, deterministic result
      const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
      const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
      parsed = {
        summary: `Automated summary (fallback) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows analyzed; ${metricLine}.`,
        key_findings: [
          `Dataset contains ${numericSummary.count} sampled rows`,
          sampleMetric ? `Notable metric: ${metricLine}` : 'Numeric columns limited in sample',
        ],
        policy_implications: [
          'Preliminary insights only. Re-run later for model-backed analysis.',
        ],
        confidence: 'low',
        sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
      };
      console.warn('Analytics fallback used due to LLM error', String(e));
    }
    if (!parsed.sources) {
      parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
    }
    // Enrich with snippet-level provenance
    try {
      const snippets = buildSnippets(rows.slice(0, 10), numericSummary, 3);
      parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
    } catch (_) { /* noop */ }
    console.log('LLM analytics-insight called', { datasetPath, queryType, durationMs, fallback: usedFallback });
    const responseSummary2 = parsed?.summary || parsed?.tl_dr || String(parsed?.text || '').slice(0, 200);
    logCall({
      endpoint: 'analytics-insight',
      dataset_path: datasetPath,
      panel_id: null,
      user_id: userId,
      prompt: queryType || null,
      response_summary: responseSummary2 || null,
      provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
      status_code: 200,
      duration_ms: durationMs,
      cost_usd: est2.usd || null,
      token_cost: est2.tokens || null,
      redaction_summary: { analytics_rows: rr2.summary, analytics_query: rq.summary },
      meta: { timeframe, cache: false, fallback: usedFallback }
    });
    // Cache result
    const cacheKey2 = `analytics:${datasetPath}:${timeframe || ''}:${(queryType || '').trim().toLowerCase()}`;
    cache.set(cacheKey2, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
    return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  } catch (e) {
    // Safety net: if anything above throws outside the inner try/catch
    const minimal = {
      summary: `Automated summary (fallback2) for ${manifest.dataset || datasetPath}.`,
      key_findings: [ 'Preliminary insights only.' ],
      policy_implications: [ 'Re-run later for model-backed analysis.' ],
      confidence: 'low',
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest', snippets: buildSnippets(rows.slice(0, 10), numericSummary, 2) }],
    };
    console.warn('Analytics outer fallback used', String(e));
    return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: minimal }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  }
}

async function handleTransitionReport(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, focus, archive } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `transition:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 150);
  const numericSummary = summarizeNumericRows(rows);

  // Derive lightweight KPIs from available sample rows and numeric summary
  const kpis = (() => {
    try {
      const total_mwh = typeof (numericSummary?.columns?.mwh?.sum) === 'number' ? numericSummary.columns.mwh.sum : null;
      // Aggregate by likely source/fuel keys
      const by: Record<string, number> = {};
      for (const r of rows || []) {
        const type = (r?.source || r?.fuel || r?.fuel_type || r?.type || 'unknown') as string;
        const valRaw = r?.mwh ?? r?.MWh ?? r?.mw ?? r?.MW ?? r?.value ?? null;
        const val = typeof valRaw === 'number' ? valRaw : Number(valRaw);
        if (Number.isFinite(val)) by[type] = (by[type] || 0) + val;
      }
      let top_source = { type: 'unknown', mwh: 0 } as { type: string; mwh: number };
      const top = Object.entries(by).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      if (top) top_source = { type: String(top[0]), mwh: Number(top[1]) };
      // Renewable share requires tagging; default to null if unknown
      const renewable_share = null as number | null;
      return { total_mwh, top_source, renewable_share };
    } catch {
      return { total_mwh: null, top_source: { type: 'unknown', mwh: 0 }, renewable_share: null };
    }
  })();

  if (isIndigenousSensitive(datasetPath, manifest)) {
    logCall({ endpoint: 'transition-report', dataset_path: datasetPath, panel_id: null, user_id: userId, prompt: focus || null, status_code: 451, duration_ms: 0, cost_usd: 0, response_summary: null, provenance: null, meta: { timeframe, reason: 'indigenous_guard' } });
    return new Response(JSON.stringify({ error: 'Dataset flagged as Indigenous-related. Consent and governance checks required before LLM processing.', code: 'INDIGENOUS_GUARD' }), { status: 451, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  }

  const systemPrompt = `SYSTEM: You are the Energy Transition Reporter for Canada. Produce JSON of the form:\n{\n  "summary": "<2-3 sentence overview>",\n  "progress": ["<metric or KPI movement with plain-English interpretation>"],\n  "risks": ["<short risk statements>", "..."],\n  "recommendations": ["<non-binding suggestions for policy makers>", "..."],\n  "confidence": "<low|med|high>",\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<one-line metric>"}]\n}\nBe concise, avoid jargon, and provide neutral tone. Cite the dataset in sources.`;

  const userCtx = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric summary: ${JSON.stringify(numericSummary)}`,
    `Sample rows (first 8): ${JSON.stringify(rows.slice(0, 8))}`,
    `Timeframe: ${timeframe || 'recent'}; Focus: ${focus || 'overview'}`,
  ].join('\n\n');

  try {
    const rr3 = redactPIIWithSummary(rows.slice(0, 8));
    const rf3 = redactPIIWithSummary(focus || '');
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userCtx.replace(JSON.stringify(rows.slice(0, 8)), JSON.stringify(rr3.redacted)).replace(String(focus || ''), String(rf3.redacted)) },
    ];
    const est3 = calcTokenCost(messages);
    const started = Date.now();
    let parsed: any = null;
    let durationMs = 0;
    let usedFallback = false;
    try {
      const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1400 });
      durationMs = Date.now() - started;
      try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
      // Normalize Gemini-like structured responses to JSON
      if (parsed && parsed.candidates && !parsed.summary) {
        const text = extractTextFromLLM(parsed);
        if (text) {
          try { parsed = JSON.parse(text); } catch { parsed = { text }; }
        }
      }
    } catch (e) {
      durationMs = Date.now() - started;
      usedFallback = true;
      const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
      const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
      parsed = {
        summary: `Automated transition report (fallback) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows; ${metricLine}.`,
        progress: [ metricLine ],
        risks: [ 'Limited context; treat as preliminary.' ],
        recommendations: [ 'Collect more data and retry later.' ],
        confidence: 'low',
        sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
      };
    }
    // If still missing expected fields, synthesize a minimal response
    if (!parsed?.summary) {
      const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
      const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
      parsed = {
        summary: `Automated transition report (normalized) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows; ${metricLine}.`,
        progress: [ metricLine ],
        risks: [ 'Limited context; treat as preliminary.' ],
        recommendations: [ 'Collect more data and retry later.' ],
        confidence: 'low',
        kpis: { total_mwh: null, top_source: { type: 'unknown', mwh: 0 }, renewable_share: null },
        sources: parsed?.sources || [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
      };
    }
    if (!parsed.sources) parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
    // Enrich with snippet-level provenance
    try {
      const snippets = buildSnippets(rows.slice(0, 8), numericSummary, 3);
      parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
    } catch (_) { /* noop */ }
    // Extend RAG provenance with additional sources
    parsed.sources.push({ id: 'external-source-1', last_updated: new Date().toISOString(), excerpt: 'Additional data source for RAG' });
    // Add KPIs to response
    if (!parsed.kpis) parsed.kpis = kpis;
    const responseSummary3 = parsed?.summary || String(parsed?.text || '').slice(0, 200);
    logCall({
      endpoint: 'transition-report',
      dataset_path: datasetPath,
      panel_id: null,
      user_id: userId,
      prompt: focus || null,
      response_summary: responseSummary3 || null,
      provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
      status_code: 200,
      duration_ms: durationMs,
      cost_usd: est3.usd || null,
      token_cost: est3.tokens || null,
      redaction_summary: { transition_rows: rr3.summary, transition_focus: rf3.summary },
      meta: { timeframe, cache: false, fallback: usedFallback }
    });
    const cacheKey3 = `transition:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
    cache.set(cacheKey3, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
    // Optional archival of generated report
    if (archive || (new Date().getDay() === 1 && new Date().getHours() === 9)) { // Schedule weekly on Monday 9 AM
      const entry = {
        created_at: new Date().toISOString(),
        endpoint: 'transition-report',
        dataset_path: datasetPath,
        timeframe: timeframe || null,
        focus: focus || null,
        payload: parsed,
      };
      if (supabase) {
        try {
          await supabase.from('llm_reports').insert(entry);
        } catch (e) {
          console.warn('llm_reports insert failed', e);
        }
      }
      // Always push to in-memory cache to guarantee history availability even if Supabase is down or table missing.
      memoryReports.unshift(entry);
      if (memoryReports.length > 200) memoryReports.pop();
    }
    return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  } catch (e) {
    // Safety net: if anything above throws outside the inner try/catch (e.g., redaction, message build)
    const minimal = {
      summary: `Automated transition report (fallback2) for ${manifest.dataset || datasetPath}.`,
      progress: [ 'Preliminary snapshot only.' ],
      risks: [ 'Limited context; data fetch or processing error.' ],
      recommendations: [ 'Verify dataset availability and retry later.' ],
      confidence: rows.length ? 'low' : 'low',
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest', snippets: (() => { try { return buildSnippets(rows.slice(0, 4), numericSummary, 2); } catch { return []; } })() }],
    } as any;
    return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: minimal }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
  }
}

async function handleEmissionsPlanner(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, focus, archive } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `emissions:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 100);
  const numericSummary = summarizeNumericRows(rows);

  const systemPrompt = `SYSTEM: You are an Emissions Planner Assistant. Given emissions data, produce JSON:\n{\n  "summary": "<plain-language summary>",\n  "scenarios": ["<scenario 1>", "..."],\n  "recommendations": ["<action 1>", "..."],\n  "confidence": "<low|med|high>",\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<metric or log key>"}]\n}\nBe concise, prioritize reduction strategies.`;

  const context = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric summary: ${JSON.stringify(numericSummary)}`,
    `First 5 rows: ${JSON.stringify(rows.slice(0, 5))}`,
    `Focus: ${focus || 'general'}`,
  ].join('\n\n');

  const rr = redactPIIWithSummary(rows.slice(0, 5));
  const rf = redactPIIWithSummary(focus || '');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context.replace(JSON.stringify(rows.slice(0, 5)), JSON.stringify(rr.redacted)).replace(focus || '', String(rf.redacted)) },
  ];
  const est = calcTokenCost(messages);
  const started = Date.now();
  let parsed: any = null;
  let durationMs = 0;
  let usedFallback = false;
  try {
    const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1200 });
    durationMs = Date.now() - started;
    try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
    // Normalize Gemini-like structured responses to JSON
    if (parsed && parsed.candidates && !parsed.summary) {
      const text = extractTextFromLLM(parsed);
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = { text }; }
      }
    }
  } catch (e) {
    durationMs = Date.now() - started;
    usedFallback = true;
    parsed = {
      summary: `Automated emissions planner (fallback) for ${manifest.dataset || datasetPath}.`,
      scenarios: ['Low-emissions scenario: 50% reduction by 2030', 'High-emissions scenario: current trends'],
      recommendations: ['Implement renewable energy incentives.', 'Monitor carbon pricing.'],
      confidence: 'low',
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  // If still missing expected fields, synthesize a minimal response
  if (!parsed?.summary) {
    const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
    const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
    parsed = {
      summary: `Automated emissions planner (normalized) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows; ${metricLine}.`,
      scenarios: [ metricLine ],
      recommendations: [ 'Collect more emissions data and retry later.' ],
      confidence: 'low',
      sources: parsed?.sources || [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  if (!parsed.sources) parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
  // Enrich with snippet-level provenance
  try {
    const snippets = buildSnippets(rows.slice(0, 5), numericSummary, 3);
    parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
  } catch (_) { /* noop */ }
  const responseSummary = parsed?.summary || String(parsed?.text || '').slice(0, 200);
  logCall({
    endpoint: 'emissions-planner',
    dataset_path: datasetPath,
    panel_id: null,
    user_id: userId,
    prompt: focus || null,
    response_summary: responseSummary || null,
    provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
    status_code: 200,
    duration_ms: durationMs,
    cost_usd: est.usd || null,
    token_cost: est.tokens || null,
    redaction_summary: { emissions_rows: rr.summary, emissions_focus: rf.summary },
    meta: { timeframe, cache: false, fallback: usedFallback }
  });
  const cacheKey = `emissions:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
  // Optional archival of generated report
  if (archive) {
    const entry = {
      created_at: new Date().toISOString(),
      endpoint: 'emissions-planner',
      dataset_path: datasetPath,
      timeframe: timeframe || null,
      focus: focus || null,
      payload: parsed,
    };
    if (supabase) {
      try {
        await supabase.from('llm_reports').insert(entry);
      } catch (e) {
        console.warn('llm_reports insert failed', e);
      }
    }
    // Always push to in-memory cache to guarantee history availability even if Supabase is down or table missing.
    memoryReports.unshift(entry);
    if (memoryReports.length > 200) memoryReports.pop();
  }
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleMarketBrief(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, focus, archive } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `market:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 100);
  const numericSummary = summarizeNumericRows(rows);

  const systemPrompt = `SYSTEM: You are a Market Intelligence Assistant. Given market data, produce JSON:\n{\n  "summary": "<plain-language summary>",\n  "drivers": ["<driver 1>", "..."],\n  "forecasts": ["<forecast 1>", "..."],\n  "recommendations": ["<action 1>", "..."],\n  "confidence": "<low|med|high>",\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<metric or log key>"}]\n}\nBe concise, prioritize market insights.`;

  const context = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric summary: ${JSON.stringify(numericSummary)}`,
    `First 5 rows: ${JSON.stringify(rows.slice(0, 5))}`,
    `Focus: ${focus || 'general'}`,
  ].join('\n\n');

  const rr = redactPIIWithSummary(rows.slice(0, 5));
  const rf = redactPIIWithSummary(focus || '');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context.replace(JSON.stringify(rows.slice(0, 5)), JSON.stringify(rr.redacted)).replace(focus || '', String(rf.redacted)) },
  ];
  const est = calcTokenCost(messages);
  const started = Date.now();
  let parsed: any = null;
  let durationMs = 0;
  let usedFallback = false;
  try {
    const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1200 });
    durationMs = Date.now() - started;
    try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
    // Normalize Gemini-like structured responses to JSON
    if (parsed && parsed.candidates && !parsed.summary) {
      const text = extractTextFromLLM(parsed);
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = { text }; }
      }
    }
  } catch (e) {
    durationMs = Date.now() - started;
    usedFallback = true;
    parsed = {
      summary: `Automated market brief (fallback) for ${manifest.dataset || datasetPath}.`,
      drivers: ['Supply and demand dynamics', 'Policy changes'],
      forecasts: ['Price increase expected', 'Volatility ahead'],
      recommendations: ['Monitor news sources.', 'Diversify strategies.'],
      confidence: 'low',
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  // If still missing expected fields, synthesize a minimal response
  if (!parsed?.summary) {
    const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
    const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
    parsed = {
      summary: `Automated market brief (normalized) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows; ${metricLine}.`,
      drivers: [ metricLine ],
      forecasts: [ 'Limited data for forecast.' ],
      recommendations: [ 'Collect more market data and retry later.' ],
      confidence: 'low',
      sources: parsed?.sources || [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  if (!parsed.sources) parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
  // Enrich with snippet-level provenance
  try {
    const snippets = buildSnippets(rows.slice(0, 5), numericSummary, 3);
    parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
  } catch (_) { /* noop */ }
  const responseSummary = parsed?.summary || String(parsed?.text || '').slice(0, 200);
  logCall({
    endpoint: 'market-brief',
    dataset_path: datasetPath,
    panel_id: null,
    user_id: userId,
    prompt: focus || null,
    response_summary: responseSummary || null,
    provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
    status_code: 200,
    duration_ms: durationMs,
    cost_usd: est.usd || null,
    token_cost: est.tokens || null,
    redaction_summary: { market_rows: rr.summary, market_focus: rf.summary },
    meta: { timeframe, cache: false, fallback: usedFallback }
  });
  const cacheKey = `market:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
  // Optional archival of generated report
  if (archive) {
    const entry = {
      created_at: new Date().toISOString(),
      endpoint: 'market-brief',
      dataset_path: datasetPath,
      timeframe: timeframe || null,
      focus: focus || null,
      payload: parsed,
    };
    if (supabase) {
      try {
        await supabase.from('llm_reports').insert(entry);
      } catch (e) {
        console.warn('llm_reports insert failed', e);
      }
    }
    // Always push to in-memory cache to guarantee history availability even if Supabase is down or table missing.
    memoryReports.unshift(entry);
    if (memoryReports.length > 200) memoryReports.pop();
  }
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleCommunityPlan(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, focus, archive } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(focus) || isSensitiveTopic(focus)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `community:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 100);
  const numericSummary = summarizeNumericRows(rows);

  const systemPrompt = `SYSTEM: You are a Community Planning Assistant. Given local data, produce JSON:\n{\n  "summary": "<plain-language summary>",\n  "plans": ["<plan 1>", "..."],\n  "recommendations": ["<action 1>", "..."],\n  "confidence": "<low|med|high>",\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<metric or log key>"}]\n}\nBe concise, prioritize community needs.`;

  const context = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric summary: ${JSON.stringify(numericSummary)}`,
    `First 5 rows: ${JSON.stringify(rows.slice(0, 5))}`,
    `Focus: ${focus || 'general'}`,
  ].join('\n\n');

  const rr = redactPIIWithSummary(rows.slice(0, 5));
  const rf = redactPIIWithSummary(focus || '');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context.replace(JSON.stringify(rows.slice(0, 5)), JSON.stringify(rr.redacted)).replace(focus || '', String(rf.redacted)) },
  ];
  const est = calcTokenCost(messages);
  const started = Date.now();
  let parsed: any = null;
  let durationMs = 0;
  let usedFallback = false;
  try {
    const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1200 });
    durationMs = Date.now() - started;
    try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
    // Normalize Gemini-like structured responses to JSON
    if (parsed && parsed.candidates && !parsed.summary) {
      const text = extractTextFromLLM(parsed);
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = { text }; }
      }
    }
  } catch (e) {
    durationMs = Date.now() - started;
    usedFallback = true;
    parsed = {
      summary: `Automated community plan (fallback) for ${manifest.dataset || datasetPath}.`,
      plans: ['Draft plan for energy incentives.', 'Community consultation roadmap.'],
      recommendations: ['Engage local stakeholders.', 'Assess funding options.'],
      confidence: 'low',
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  // If still missing expected fields, synthesize a minimal response
  if (!parsed?.summary) {
    const sampleMetric = Object.entries((numericSummary.columns || {})).find(([, v]: any) => v && typeof v.mean === 'number');
    const metricLine = sampleMetric ? `${sampleMetric[0]} mean ≈ ${(sampleMetric[1] as any).mean.toFixed(2)}` : 'limited numeric sample';
    parsed = {
      summary: `Automated community plan (normalized) for ${manifest.dataset || datasetPath}: ${numericSummary.count} rows; ${metricLine}.`,
      plans: [ metricLine ],
      recommendations: [ 'Collect more local data and retry later.' ],
      confidence: 'low',
      sources: parsed?.sources || [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  if (!parsed.sources) parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
  // Enrich with snippet-level provenance
  try {
    const snippets = buildSnippets(rows.slice(0, 5), numericSummary, 3);
    parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
  } catch (_) { /* noop */ }
  const responseSummary = parsed?.summary || String(parsed?.text || '').slice(0, 200);
  logCall({
    endpoint: 'community-plan',
    dataset_path: datasetPath,
    panel_id: null,
    user_id: userId,
    prompt: focus || null,
    response_summary: responseSummary || null,
    provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
    status_code: 200,
    duration_ms: durationMs,
    cost_usd: est.usd || null,
    token_cost: est.tokens || null,
    redaction_summary: { community_rows: rr.summary, community_focus: rf.summary },
    meta: { timeframe, cache: false, fallback: usedFallback }
  });
  const cacheKey = `community:${datasetPath}:${timeframe || ''}:${(focus || '').trim().toLowerCase()}`;
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
  // Optional archival of generated report
  if (archive) {
    const entry = {
      created_at: new Date().toISOString(),
      endpoint: 'community-plan',
      dataset_path: datasetPath,
      timeframe: timeframe || null,
      focus: focus || null,
      payload: parsed,
    };
    if (supabase) {
      try {
        await supabase.from('llm_reports').insert(entry);
      } catch (e) {
        console.warn('llm_reports insert failed', e);
      }
    }
    // Always push to in-memory cache to guarantee history availability even if Supabase is down or table missing.
    memoryReports.unshift(entry);
    if (memoryReports.length > 200) memoryReports.pop();
  }
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

async function handleDataQuality(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, logs } = body; // logs: optional array of quality events
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(JSON.stringify(logs || ''))) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `dq:${datasetPath}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 120);
  const numericSummary = summarizeNumericRows(rows);

  const heuristicIssues: string[] = [];
  if (!rows.length) heuristicIssues.push('No sample rows available');
  const sample = rows[0] || {};
  const columns = Object.keys(sample);
  for (const c of columns) {
    let missing = 0;
    for (const r of rows) { const v = r[c]; if (v === null || v === undefined || v === '') missing++; }
    const ratio = rows.length ? (missing / rows.length) : 1;
    if (ratio > 0.4) heuristicIssues.push(`High missing ratio in '${c}' ≈ ${(ratio * 100).toFixed(0)}%`);
  }
  // Extended schema drift detection
  const schemaDrifts: string[] = [];
  const expectedTypes = { date: 'string', number: 'number', string: 'string' };
  for (const r of rows.slice(0, 10)) {
    for (const [k, v] of Object.entries(r)) {
      const expected = expectedTypes[k] || 'string';
      if (typeof v !== expected) schemaDrifts.push(`Type mismatch in '${k}': expected ${expected}, got ${typeof v}`);
    }
  }
  if (schemaDrifts.length > 0) heuristicIssues.push(...schemaDrifts);

  const systemPrompt = `SYSTEM: You are a Data Quality Assistant. Given optional data quality logs and a small sample with numeric summary, produce JSON:\n{\n  "summary": "<plain-language summary>",\n  "issues": ["<issue 1>", "..."],\n  "recommendations": ["<action 1>", "..."],\n  "confidence": "<low|med|high>",\n  "validation_reports": [{"field": "<field>", "status": "<pass|fail>", "details": "<details>"}],\n  "alerts": ["<alert 1>", "..."],\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<metric or log key>"}]\n}\nBe concise, prioritize reproducible checks, avoid blame.`;

  const context = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric summary: ${JSON.stringify(numericSummary)}`,
    `Heuristic issues: ${JSON.stringify(heuristicIssues)}`,
    `Schema drifts: ${JSON.stringify(schemaDrifts)}`,
    `First 5 rows: ${JSON.stringify(rows.slice(0, 5))}`,
    `Logs: ${Array.isArray(logs) ? JSON.stringify(logs).slice(0, 4000) : 'none'}`,
  ].join('\n\n');

  const rr4 = redactPIIWithSummary(rows.slice(0, 5));
  const rl4 = redactPIIWithSummary(Array.isArray(logs) ? JSON.stringify(logs) : '');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context.replace(JSON.stringify(rows.slice(0, 5)), JSON.stringify(rr4.redacted)).replace(Array.isArray(logs) ? JSON.stringify(logs) : '', String(rl4.redacted)) },
  ];
  const est4 = calcTokenCost(messages);
  const started = Date.now();
  let parsed: any = null;
  let durationMs = 0;
  let usedFallback = false;
  try {
    const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_ANALYTICS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1200 });
    durationMs = Date.now() - started;
    try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
    // Normalize Gemini-like structured responses to JSON
    if (parsed && parsed.candidates && !parsed.summary) {
      const text = extractTextFromLLM(parsed);
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = { text }; }
      }
    }
  } catch (e) {
    durationMs = Date.now() - started;
    usedFallback = true;
    parsed = {
      summary: `Automated data-quality (fallback) for ${manifest.dataset || datasetPath}.` ,
      issues: heuristicIssues.length ? heuristicIssues : ['Limited sample; unable to compute issues.'],
      recommendations: ['Add validation checks and re-run QA.', 'Verify schema and handle missing values.'],
      confidence: rows.length ? 'med' : 'low',
      validation_reports: [],
      alerts: [],
      sources: [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  // If still missing expected fields, synthesize a minimal response
  if (!parsed?.summary) {
    parsed = {
      summary: `Automated data-quality (normalized) for ${manifest.dataset || datasetPath}.`,
      issues: Array.isArray(heuristicIssues) && heuristicIssues.length ? heuristicIssues : ['Limited sample; unable to compute issues.'],
      recommendations: ['Add validation checks and re-run QA.', 'Verify schema and handle missing values.'],
      confidence: rows.length ? 'med' : 'low',
      validation_reports: [],
      alerts: [],
      sources: parsed?.sources || [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }],
    };
  }
  if (!parsed.sources) parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
  // Enrich with snippet-level provenance for data-quality
  try {
    const snippets = buildSnippets(rows.slice(0, 5), numericSummary, 3);
    parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
  } catch (_) { /* noop */ }
  // Add validation reports and alerts
  if (!parsed.validation_reports) parsed.validation_reports = [];
  if (!parsed.alerts) parsed.alerts = [];
  for (const issue of heuristicIssues) {
    if (issue.includes('missing')) parsed.validation_reports.push({ field: issue.split("'")[1], status: 'fail', details: issue });
    if (issue.includes('drift')) parsed.alerts.push(`Schema drift detected: ${issue}`);
  }
  // QA pipeline integration: trigger alerts if issues found
  if (parsed.alerts.length > 0) {
    console.log('QA Pipeline Alert:', parsed.alerts);
    // In a real implementation, send to monitoring service
  }
  const responseSummary4 = parsed?.summary || String(parsed?.text || '').slice(0, 200);
  logCall({
    endpoint: 'data-quality',
    dataset_path: datasetPath,
    panel_id: null,
    user_id: userId,
    prompt: null,
    response_summary: responseSummary4 || null,
    provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
    status_code: 200,
    duration_ms: durationMs,
    cost_usd: est4.usd || null,
    token_cost: est4.tokens || null,
    redaction_summary: { dq_rows: rr4.summary },
    meta: { cache: false, fallback: usedFallback }
  });
  const cacheKey4 = `dq:${datasetPath}`;
  cache.set(cacheKey4, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

// Handle emissions planner with RAG for deeper insights
async function handleEmissionsPlanner(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { datasetPath, timeframe, queryType } = body;
  if (!datasetPath) return new Response(JSON.stringify({ error: 'datasetPath required' }), { status: 400, headers: jsonHeaders });
  if (isBlacklisted(queryType) || isSensitiveTopic(queryType)) return new Response(JSON.stringify({ error: 'Request blocked by safety policy.' }), { status: 403, headers: jsonHeaders });

  if (!LLM_ENABLED) {
    const key = `emissions:${datasetPath}:${timeframe || ''}:${(queryType || '').trim().toLowerCase()}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ dataset: datasetPath, result: cached.payload, cache: true }), { headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled-cache' } });
    }
    return new Response(JSON.stringify({ error: 'LLM disabled by operator. Try later.' }), { status: 503, headers: { ...jsonHeaders, 'X-LLM-Mode': 'disabled' } });
  }

  const userId = (req.headers.get('x-user-id') || 'anon').slice(0, 128);
  const rl = await checkRateLimit(userId);
  if (!rl.ok) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try later.' }), { status: 429, headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(0), 'X-RateLimit-Limit': String(rl.limit ?? '') } });

  const manifest = await fetchManifest(datasetPath);
  const rows = await fetchSampleRows(datasetPath, 200);
  const numericSummary = summarizeNumericRows(rows);

  const systemPrompt = `SYSTEM: You are the Carbon Emissions Planner for Canada. Produce JSON with:\n{\n  "summary": "<2-3 sentence TL;DR>",\n  "key_findings": ["<finding 1>", "..."],\n  "policy_implications": ["<implication 1>", "..."],\n  "scenario_explainers": ["<scenario 1>", "..."],\n  "sources": [{"id":"<dataset>", "last_updated":"<ISO>", "excerpt":"<one-line>"}]\n}\nUse RAG context for citations.`;

  const userContext = [
    `Dataset: ${manifest.dataset || datasetPath}`,
    `Numeric Summary: ${JSON.stringify(numericSummary)}`,
    `Sample rows (first 10): ${JSON.stringify(rows.slice(0, 10))}`,
    `Focus: ${queryType || 'emissions planning'}; timeframe: ${timeframe || 'recent'}`,
  ].join('\n\n');

  const rr = redactPIIWithSummary(rows.slice(0, 10));
  const rq = redactPIIWithSummary(queryType || '');
  const redactedRows = rr.redacted;
  const redactedQuery = rq.redacted;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContext.replace(JSON.stringify(rows.slice(0, 10)), JSON.stringify(redactedRows)).replace(String(queryType || ''), String(redactedQuery)) },
  ];
  const est = calcTokenCost(messages);
  const started = Date.now();
  const llmResp = await callLLM({ messages, model: Deno.env.get('GEMINI_MODEL_EMISSIONS') || Deno.env.get('GEMINI_MODEL') || undefined, maxTokens: 1500 });
  const durationMs = Date.now() - started;

  let parsed: any = null;
  try { parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp; } catch { parsed = { text: llmResp }; }
  if (!parsed.sources) {
    parsed.sources = [{ id: manifest.dataset || datasetPath, last_updated: manifest.last_updated || new Date().toISOString(), excerpt: 'manifest' }];
  }
  try {
    const snippets = buildSnippets(rows.slice(0, 10), numericSummary, 3);
    parsed.sources = parsed.sources.map((s: any) => ({ ...s, snippets }));
  } catch (_) { /* noop */ }

  console.log('LLM emissions-planner called', { datasetPath, queryType, durationMs });
  const responseSummary = parsed?.summary || String(parsed?.text || '').slice(0, 200);
  logCall({
    endpoint: 'emissions-planner',
    dataset_path: datasetPath,
    user_id: userId,
    prompt: queryType || null,
    response_summary: responseSummary || null,
    provenance: parsed?.sources ? JSON.stringify(parsed.sources) : null,
    status_code: 200,
    duration_ms: durationMs,
    cost_usd: est.usd || null,
    token_cost: est.tokens || null,
    redaction_summary: { emissions_rows: rr.summary, emissions_query: rq.summary },
    meta: { timeframe, cache: false }
  });
  const cacheKey = `emissions:${datasetPath}:${timeframe || ''}:${(queryType || '').trim().toLowerCase()}`;
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MIN * 60_000, payload: parsed });
  return new Response(JSON.stringify({ dataset: manifest.dataset || datasetPath, result: parsed }), { headers: { ...jsonHeaders, 'X-RateLimit-Remaining': String(rl.remaining ?? ''), 'X-RateLimit-Limit': String(rl.limit ?? '') } });
}

function handleHealth(): Response {
  return new Response(JSON.stringify({ ok: true, mode: WRAPPER_BASE_URL_BOOT ? 'live' : 'mock' }), { headers: jsonHeaders });
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// CORS helpers
const ALLOW_ORIGINS = (Deno.env.get('LLM_CORS_ALLOW_ORIGINS') || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function resolveOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOW_ORIGINS.includes('*')) return '*';
  if (origin && ALLOW_ORIGINS.some((o) => o === origin)) return origin;
  // Default to the first listed origin if provided
  return ALLOW_ORIGINS[0] || '*';
}

function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers);
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  // Expose rate limit and cache headers to the browser
  headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Remaining, X-RateLimit-Limit, X-Cache, X-LLM-Mode');
  return new Response(res.body, { status: res.status, headers });
}

function handleOptions(req: Request): Response {
  const headers = new Headers();
  const origin = resolveOrigin(req);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  const reqHeaders = req.headers.get('access-control-request-headers') || 'authorization, x-client-info, apikey, content-type, x-user-id';
  headers.set('Access-Control-Allow-Headers', reqHeaders);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/functions\/v1\/llm\b/, ''); // when served under functions route

    // Preflight support for browser requests
    if (req.method === 'OPTIONS') {
      return handleOptions(req);
    }

    // Safe mode: only expose health endpoint to guarantee boot success
    if (LLM_SAFE_MODE) {
      if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
        return withCors(handleHealth(), req);
      }
      // Everything else is unavailable in safe mode
      return withCors(new Response(JSON.stringify({ error: 'LLM in SAFE_MODE' }), { status: 503, headers: jsonHeaders }), req);
    }

    if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
      return withCors(handleHealth(), req);
    }
    // Delegate all other routes to the lazily-loaded app module
    const mod = await import('./llm_app.ts');
    if (typeof mod.handleRequest === 'function') {
      const res = await mod.handleRequest(req);
      return withCors(res, req);
    }

    return withCors(new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders }), req);
  } catch (e) {
    console.error('LLM function error', e);
    return withCors(new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders }), req);
  }
});
