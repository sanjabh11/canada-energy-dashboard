import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta } from "../_shared/mlForecasting.ts";
import { callLLM } from "../llm/call_llm_adapter.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };
const SOURCE_ALLOWLIST: Record<string, Array<{ name: string; url: string }>> = {
  utility_public: [
    { name: "AESO", url: "https://www.aeso.ca/" },
    { name: "IESO", url: "https://www.ieso.ca/" },
    { name: "Alberta Utilities Commission", url: "https://www.auc.ab.ca/" },
  ],
  policy_public: [
    { name: "Alberta TIER", url: "https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation" },
    { name: "UCA Alberta", url: "https://ucahelps.alberta.ca/regulated-rates.aspx" },
  ],
};

type SourceDescriptor = {
  name: string;
  url: string;
  title?: string;
  text?: string;
  html?: string;
};

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}

function parseJsonLike(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(stripCodeFences(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function inferEvent(text: string, sourceUrl: string) {
  const lower = text.toLowerCase();
  const eventType = lower.includes("outage") || lower.includes("interruption")
    ? "outage"
    : lower.includes("interconnect") || lower.includes("queue") || lower.includes("connection")
      ? "interconnection"
    : lower.includes("delay") || lower.includes("queue")
      ? "delay"
    : lower.includes("price") || lower.includes("rate")
      ? "price_spike"
    : lower.includes("tier") || lower.includes("regulation")
          ? "policy"
          : "other";
  const province = lower.includes("alberta") || sourceUrl.includes("aeso") || sourceUrl.includes("alberta") ? "AB" : lower.includes("ontario") || sourceUrl.includes("ieso") ? "ON" : null;
  const severity = eventType === "outage" ? "high" : eventType === "price_spike" ? "medium" : "low";
  return { eventType, province, severity };
}

function sourceWeight(sourceGroup: string, sourceUrl: string): number {
  const lower = `${sourceGroup} ${sourceUrl}`.toLowerCase();
  if (lower.includes("aeso")) return 0.95;
  if (lower.includes("ieso")) return 0.9;
  if (lower.includes("auc")) return 0.88;
  if (lower.includes("uca") || lower.includes("alberta")) return 0.84;
  return 0.8;
}

function normalizeEventType(value: unknown, fallback: string): string {
  const lower = String(value ?? fallback ?? "").toLowerCase();
  if (lower.includes("outage")) return "outage";
  if (lower.includes("interconnect") || lower.includes("queue") || lower.includes("connection")) return "interconnection";
  if (lower.includes("delay")) return "delay";
  if (lower.includes("price")) return "price_spike";
  if (lower.includes("policy") || lower.includes("regulat")) return "policy";
  if (lower.includes("weather")) return "weather";
  return "other";
}

function normalizeSeverity(value: unknown, fallbackType: string): "low" | "medium" | "high" | "critical" {
  const lower = String(value ?? "").toLowerCase();
  if (lower === "critical" || lower === "high" || lower === "medium" || lower === "low") {
    return lower;
  }
  if (fallbackType === "outage") return "high";
  if (fallbackType === "price_spike" || fallbackType === "interconnection") return "medium";
  return "low";
}

function normalizeProvince(value: unknown, text: string, sourceUrl: string): string | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw.length === 2) return raw;
  const lower = `${text} ${sourceUrl}`.toLowerCase();
  if (lower.includes("alberta") || lower.includes("aeso")) return "AB";
  if (lower.includes("ontario") || lower.includes("ieso")) return "ON";
  if (lower.includes("british columbia")) return "BC";
  if (lower.includes("quebec")) return "QC";
  return null;
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function coerceEvent(
  raw: Record<string, unknown>,
  source: SourceDescriptor,
  text: string,
  sourceConfidence: number,
  fallbackSummary: string,
) {
  const inferred = inferEvent(text, source.url);
  const eventType = normalizeEventType(raw.event_type ?? raw.eventType, inferred.eventType);
  const summary = String(raw.summary ?? raw.description ?? fallbackSummary).trim().slice(0, 500);
  return {
    event_type: eventType,
    province: normalizeProvince(raw.province, text, source.url) ?? inferred.province,
    location_name: String(raw.location_name ?? raw.locationName ?? "").trim() || null,
    affected_asset: String(raw.affected_asset ?? raw.affectedAsset ?? "").trim() || null,
    severity: normalizeSeverity(raw.severity, eventType),
    event_timestamp: String(raw.event_timestamp ?? raw.timestamp ?? raw.eventTimestamp ?? "").trim() || null,
    confidence_score: clamp(Number(raw.confidence_score ?? raw.confidence ?? raw.score ?? sourceConfidence), 0, 1),
    summary,
  };
}

async function extractStructuredEvents(
  source: SourceDescriptor,
  text: string,
  scheduledRun: boolean,
  sourceGroup: string,
) {
  const prompt = [
    "You extract public energy intelligence from allowlisted utility and policy text.",
    "Return JSON only, with this shape:",
    '{ "source_confidence": 0.0-1.0, "provenance_notes": [string], "events": [ { "event_type": "outage|delay|interconnection|price_spike|policy|weather|other", "province": "AB|ON|BC|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT|null", "location_name": string|null, "affected_asset": string|null, "severity": "low|medium|high|critical", "event_timestamp": string|null, "confidence_score": 0.0-1.0, "summary": string } ] }',
    `source_group: ${sourceGroup}`,
    `scheduled_run: ${scheduledRun ? "true" : "false"}`,
    `source_name: ${source.name}`,
    `source_url: ${source.url}`,
    "Source text:",
    text.slice(0, 4500),
  ].join("\n");

  const llmResponse = await callLLM({
    messages: [
      {
        role: "system",
        content: "You are a structured extraction engine for energy operations. Do not invent facts. If nothing relevant is present, return an empty events array.",
      },
      { role: "user", content: prompt },
    ],
    maxTokens: 700,
  });

  const parsed = parseJsonLike(llmResponse);
  if (!parsed) return null;

  const rawEvents = Array.isArray(parsed.events)
    ? parsed.events.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[]
    : parsed.event_type
      ? [parsed]
      : [];
  const sourceConfidence = clamp(Number(parsed.source_confidence ?? parsed.confidence ?? 0.7), 0, 1);
  const provenanceNotes = Array.isArray(parsed.provenance_notes)
    ? parsed.provenance_notes.map((note) => String(note)).filter(Boolean).slice(0, 5)
    : [];

  return {
    mode: "llm" as const,
    sourceConfidence,
    provenanceNotes,
    events: rawEvents.map((event) => coerceEvent(
      event,
      source,
      text,
      sourceConfidence,
      `${source.name}: allowlisted structured extraction`,
    )),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const rl = applyRateLimit(req, "groundsource-miner");
  if (rl.response) return rl.response;
  const cors = createCorsHeaders(req);
  const path = new URL(req.url).pathname.replace(/\/functions\/v1\/groundsource-miner\b/, "") || "/";

  if (req.method !== "POST" || !["/ingest", "/"].includes(path)) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const body = await req.json().catch(() => ({}));
  const sourceGroup = String(body.source_group ?? body.sourceGroup ?? "utility_public");
  const allowIndigenous = Boolean(body.allow_indigenous_consent ?? body.allowIndigenousConsent);
  const scheduledRun = Boolean(body.scheduled_run ?? body.scheduledRun);
  const maxItems = Math.min(10, Math.max(1, Number(body.max_items ?? body.maxItems ?? 3)));
  const sampleSources = Array.isArray(body.sample_sources)
    ? body.sample_sources.slice(0, maxItems).map((entry: any, index: number) => ({
      name: String(entry?.name ?? `Sample ${index + 1}`),
      url: String(entry?.url ?? `sample://${index + 1}`),
      title: entry?.title ? String(entry.title) : undefined,
      text: entry?.text ? String(entry.text) : undefined,
      html: entry?.html ? String(entry.html) : undefined,
    }))
    : null;
  const allowlistedSources = (SOURCE_ALLOWLIST[sourceGroup] ?? []).slice(0, maxItems);
  const sources: SourceDescriptor[] = sampleSources?.length ? sampleSources : allowlistedSources;
  if (sources.length === 0) {
    return new Response(JSON.stringify({ error: "source_group is not allowlisted" }), { status: 400, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const documents: any[] = [];
  const events: any[] = [];
  const provenanceScores: number[] = [];
  const heuristicsUsed: string[] = [];
  for (const source of sources) {
    const fetched = source.text || source.html
      ? { ok: true, text: async () => source.text ?? stripHtml(source.html ?? "") }
      : await fetch(source.url, {
        headers: { "User-Agent": "CEIPGroundsourceMiner/1.0 (+public-source-allowlist)" },
      }).catch(() => null);
    if (!fetched?.ok) continue;
    const html = source.html ?? (source.text ? source.text : await fetched.text());
    const text = stripHtml(html).slice(0, 5000);
    const lower = text.toLowerCase();
    if (!allowIndigenous && (lower.includes("first nation") || lower.includes("indigenous") || lower.includes("metis") || lower.includes("inuit"))) {
      continue;
    }
    const contentHash = await sha256(`${source.url}:${text}`);
    const title = source.title ?? html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? source.name;
    const llmExtraction = await extractStructuredEvents(source, text, scheduledRun, sourceGroup).catch(() => null);
    const fallbackEvent = inferEvent(text, source.url);
    const sourceConfidence = clamp(llmExtraction?.sourceConfidence ?? 0.55, 0, 1);
    const eventPayloads = llmExtraction?.events?.length
      ? llmExtraction.events
      : [{
        event_type: fallbackEvent.eventType,
        province: fallbackEvent.province,
        location_name: null,
        affected_asset: null,
        severity: fallbackEvent.severity,
        event_timestamp: null,
        confidence_score: 0.55,
        summary: `${source.name}: ${title}`.slice(0, 500),
      }];
    if (!llmExtraction?.events?.length) heuristicsUsed.push(source.url);

    const documentPayload = {
      source_group: sourceGroup,
      source_url: source.url,
      source_name: source.name,
      content_hash: contentHash,
      title,
      excerpt: text.slice(0, 800),
      consent_scope: "public",
      metadata: {
        robots_policy: "allowlist_only",
        fetched_by: "groundsource-miner",
        extraction_mode: llmExtraction?.mode ?? "heuristic",
        scheduled_run: scheduledRun,
        source_confidence: sourceConfidence,
        provenance_notes: llmExtraction?.provenanceNotes ?? [],
      },
    };

    const documentRecord = supabase
      ? (await supabase.from("ml_source_documents").upsert(documentPayload, { onConflict: "source_url,content_hash" }).select("id, source_url").single()).data
      : { id: crypto.randomUUID(), source_url: source.url };
    if (!documentRecord) continue;
    documents.push(documentRecord);

    for (const eventPayload of eventPayloads) {
      const confidence = clamp(Number(eventPayload.confidence_score ?? sourceConfidence), 0, 1);
      provenanceScores.push(clamp(confidence * sourceWeight(sourceGroup, source.url), 0, 1));
      const eventRecord = {
        source_document_id: documentRecord.id,
        event_type: String(eventPayload.event_type ?? fallbackEvent.eventType),
        province: eventPayload.province ?? fallbackEvent.province,
        location_name: eventPayload.location_name ?? null,
        affected_asset: eventPayload.affected_asset ?? null,
        severity: String(eventPayload.severity ?? fallbackEvent.severity),
        event_timestamp: parseTimestamp(eventPayload.event_timestamp),
        confidence_score: confidence,
        summary: String(eventPayload.summary ?? `${source.name}: ${title}`).slice(0, 500),
        source_url: source.url,
        synthetic: false,
      };

      const insertedEvent = supabase
        ? (await supabase.from("ml_intelligence_events").insert(eventRecord).select("id, event_type, province, severity, summary, source_url").single()).data
        : { id: crypto.randomUUID(), event_type: eventRecord.event_type, province: eventRecord.province, severity: eventRecord.severity, summary: eventRecord.summary, source_url: eventRecord.source_url };
      if (insertedEvent) events.push(insertedEvent);
    }
  }

  const averageProvenance = provenanceScores.length
    ? provenanceScores.reduce((sum, value) => sum + value, 0) / provenanceScores.length
    : 0.55;
  const confidenceScore = clamp(averageProvenance, 0.35, 0.95);
  const meta = buildMeta({
    modelVersion: "groundsource-miner-v1",
    validAt: new Date().toISOString(),
    confidenceScore,
    dataSources: sources.map((source) => ({ name: source.name, url: source.url })),
    isFallback: heuristicsUsed.length > 0,
    methodology: "Allowlisted public-source fetch, content hash deduplication, and structured LLM extraction with heuristic fallback.",
    warnings: [
      "No Indigenous/community microgrid data is ingested unless explicit consent is supplied.",
      scheduledRun ? "Scheduled ingestion mode enabled." : "Manual ingestion mode.",
      heuristicsUsed.length > 0 ? "One or more sources fell back to heuristic extraction." : "LLM structured extraction used for all processed sources.",
    ],
  });

  return new Response(JSON.stringify({
    source_group: sourceGroup,
    scheduled_run: scheduledRun,
    documents,
    events,
    provenance_score: confidenceScore,
    extraction_mode: heuristicsUsed.length > 0 ? "mixed" : "llm",
    meta,
  }), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
});
