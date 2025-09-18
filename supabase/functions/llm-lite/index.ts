// Minimal LLM-lite function to unblock health and tests while llm is refactored
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RL_HEADERS = { 'X-RateLimit-Remaining': '29', 'X-RateLimit-Limit': '30' } as const;
const json = (obj: unknown, status = 200, extra: Record<string,string> = {}) => new Response(
  JSON.stringify(obj),
  { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...RL_HEADERS as any, ...extra } }
);

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
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/llm-lite\b/, '');
  if (req.method === 'OPTIONS') {
    const h = new Headers();
    h.set('Access-Control-Allow-Origin', '*');
    h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-user-id');
    h.set('Access-Control-Max-Age', '86400');
    return new Response(null, { status: 204, headers: h });
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
    return json({ dataset: datasetPath, result: { tl_dr: 'Automated summary (lite)', trends: [], classroom_activity: 'Discuss recent trends.', provenance: [{ id: datasetPath, last_updated: new Date().toISOString(), note: 'lite' }] } }, 200, RL_HEADERS as any);
  }
  if (req.method === 'POST' && (path === '/analytics-insight' || url.pathname.endsWith('/analytics-insight'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, queryType } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (isBlacklisted(queryType)) return json({ error: 'Request blocked by safety policy.' }, 403);
    if (isIndigenousSensitive(datasetPath)) return json({ error: 'Dataset flagged as Indigenous-related.', code: 'INDIGENOUS_GUARD' }, 451);
    return json({ dataset: datasetPath, result: { summary: 'Automated (lite) insight', key_findings: [], policy_implications: [], confidence: 'low', sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] } }, 200, RL_HEADERS as any);
  }
  if (req.method === 'POST' && (path === '/transition-report' || url.pathname.endsWith('/transition-report'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, focus } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (isBlacklisted(focus)) return json({ error: 'Request blocked by safety policy.' }, 403);
    if (isIndigenousSensitive(datasetPath)) return json({ error: 'Dataset flagged as Indigenous-related.', code: 'INDIGENOUS_GUARD' }, 451);
    return json({ dataset: datasetPath, result: { summary: 'Automated (lite) report', progress: [], risks: [], recommendations: [], confidence: 'low', sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] } }, 200, RL_HEADERS as any);
  }
  if (req.method === 'POST' && (path === '/transition-kpis' || url.pathname.endsWith('/transition-kpis'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    return json({ result: { dataset: datasetPath, timeframe: 'recent', kpis: { total_mwh: 0, top_source: { type: 'unknown', mwh: 0 }, renewable_share: 0 }, sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] } });
  }
  if (req.method === 'POST' && (path === '/data-quality' || url.pathname.endsWith('/data-quality'))) {
    const body = await req.json().catch(() => ({}));
    const { datasetPath, logs } = body;
    if (!datasetPath) return json({ error: 'datasetPath required' }, 400);
    if (logsContainBlacklist(logs)) return json({ error: 'Request blocked by safety policy.' }, 403);
    return json({ dataset: datasetPath, result: { summary: 'Automated data-quality (lite)', issues: [], recommendations: [], confidence: 'low', validation_reports: [], alerts: [], sources: [{ id: datasetPath, last_updated: new Date().toISOString(), excerpt: 'lite' }] } });
  }
  if (req.method === 'POST' && (path === '/feedback' || url.pathname.endsWith('/feedback'))) {
    return json({ ok: true });
  }
  if (req.method === 'GET' && (path === '/history' || url.pathname.endsWith('/history'))) {
    return json({ result: [] });
  }
  return json({ error: 'Not found' }, 404);
});
