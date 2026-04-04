// Minimal LLM-lite function to unblock health and tests while llm is refactored
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

const RL_HEADERS = { 'X-RateLimit-Remaining': '29', 'X-RateLimit-Limit': '30' } as const;
let _corsHeaders: Record<string, string> = {};
const json = (obj: unknown, status = 200, extra: Record<string,string> = {}) => new Response(
  JSON.stringify(obj),
  { status, headers: { 'Content-Type': 'application/json', ..._corsHeaders, ...RL_HEADERS as any, ...extra } }
);

type ResponseMeta = {
  dataset?: string;
  source: string;
  freshness: string;
  generated_at: string;
  is_fallback: boolean;
  llm_mode: string;
  source_count: number;
};

function buildMeta(params: { dataset?: string; result?: unknown; source: string; llmMode: string; isFallback: boolean }): ResponseMeta {
  const nowIso = new Date().toISOString();
  const resultObject = params.result && typeof params.result === 'object' && !Array.isArray(params.result)
    ? params.result as Record<string, unknown>
    : null;
  const sources = Array.isArray(resultObject?.sources)
    ? resultObject.sources
    : Array.isArray(resultObject?.provenance)
      ? resultObject.provenance
      : [];
  const firstSource = sources[0] as { last_updated?: string } | undefined;

  return {
    dataset: params.dataset,
    source: params.source,
    freshness: firstSource?.last_updated || nowIso,
    generated_at: nowIso,
    is_fallback: params.isFallback,
    llm_mode: params.llmMode,
    source_count: sources.length,
  };
}

function jsonResult(params: { dataset?: string; result: unknown; source: string; llmMode: string; isFallback: boolean; status?: number }) {
  return json({
    dataset: params.dataset,
    result: params.result,
    meta: buildMeta({
      dataset: params.dataset,
      result: params.result,
      source: params.source,
      llmMode: params.llmMode,
      isFallback: params.isFallback,
    }),
  }, params.status ?? 200, { 'X-LLM-Mode': params.llmMode });
}

function isBlacklisted(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const bad = ["sabotage","attack","disable the grid","exploit","bomb","malware","ddos","poison"];
  return bad.some(k => lower.includes(k));
}

function isIndigenousSensitive(datasetPath?: string): boolean {
  const markers = ["indigenous","first_nations","first-nations","inuit","metis","fnmi"];
  const t = (datasetPath || '').toLowerCase();
  return markers.some(m => t.includes(m));
}

function logsContainBlacklist(logs: any): boolean {
  try {
    const s = typeof logs === 'string' ? logs : JSON.stringify(logs || '');
    return isBlacklisted(s);
  } catch { return false; }
}

serve(async (req) => {
  const rl = applyRateLimit(req, 'llm-lite');
  if (rl.response) return rl.response;

  _corsHeaders = createCorsHeaders(req);
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/llm-lite\b/, '');
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }
  if (req.method === 'GET' && (path === '/health' || url.pathname.endsWith('/health'))) {
    return json({ ok: true, mode: 'lite' });
  }
  if (req.method === 'POST' && (path === '/explain-chart' || url.pathname.endsWith('/explain-chart'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, userPrompt } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (isBlacklisted(userPrompt)) return json({ error: 'Request blocked by safety policy.' }, 403);
    if (isIndigenousSensitive(datasetPath)) return json({ error: 'Dataset flagged as Indigenous-related.', code: 'INDIGENOUS_GUARD' }, 451);
    return jsonResult({ dataset: datasetPath, result: { tl_dr: 'Automated summary (lite)', trends: [], classroom_activity: 'Discuss recent trends.', provenance: [{ id: datasetPath, last_updated: new Date().toISOString(), note: 'lite' }] }, source: 'supabase-llm-lite/explain-chart', llmMode: 'lite', isFallback: true });
  }
  if (req.method === 'POST' && (path === '/analytics-insight' || url.pathname.endsWith('/analytics-insight'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, queryType } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (isBlacklisted(queryType)) return json({ error: 'Request blocked by safety policy.' }, 403);
    if (isIndigenousSensitive(datasetPath)) return json({ error: 'Dataset flagged as Indigenous-related.', code: 'INDIGENOUS_GUARD' }, 451);
    return jsonResult({ dataset: datasetPath, result: { summary: 'Automated (lite) insight', key_findings: [], policy_implications: [], confidence: 'low', sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] }, source: 'supabase-llm-lite/analytics-insight', llmMode: 'lite', isFallback: true });
  }
  if (req.method === 'POST' && (path === '/transition-report' || url.pathname.endsWith('/transition-report'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, focus } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (isBlacklisted(focus)) return json({ error: 'Request blocked by safety policy.' }, 403);
    if (isIndigenousSensitive(datasetPath)) return json({ error: 'Dataset flagged as Indigenous-related.', code: 'INDIGENOUS_GUARD' }, 451);
    return jsonResult({ dataset: datasetPath, result: { summary: 'Automated (lite) report', progress: [], risks: [], recommendations: [], confidence: 'low', sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] }, source: 'supabase-llm-lite/transition-report', llmMode: 'lite', isFallback: true });
  }
  if (req.method === 'POST' && (path === '/transition-kpis' || url.pathname.endsWith('/transition-kpis'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    return jsonResult({ dataset: datasetPath, result: { dataset: datasetPath, timeframe: 'recent', kpis: { total_mwh: 0, top_source: { type: 'unknown', mwh: 0 }, renewable_share: 0 }, sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] }, source: 'supabase-llm-lite/transition-kpis', llmMode: 'lite', isFallback: true });
  }
  if (req.method === 'POST' && (path === '/data-quality' || url.pathname.endsWith('/data-quality'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, logs } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (logsContainBlacklist(logs)) return json({ error: 'Request blocked by safety policy.' }, 403);
    return jsonResult({ dataset: datasetPath, result: { summary: 'Automated data-quality (lite)', issues: [], recommendations: [], confidence: 'low', validation_reports: [], alerts: [], sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] }, source: 'supabase-llm-lite/data-quality', llmMode: 'lite', isFallback: true });
  }
  if (req.method === 'POST' && (path === '/feedback' || url.pathname.endsWith('/feedback'))) {
    return json({ ok: true });
  }
  if (req.method === 'GET' && (path === '/history' || url.pathname.endsWith('/history'))) {
    return jsonResult({ result: [], source: 'supabase-llm-lite/history', llmMode: 'history', isFallback: true });
  }
  return json({ error: 'Not found' }, 404);
});
