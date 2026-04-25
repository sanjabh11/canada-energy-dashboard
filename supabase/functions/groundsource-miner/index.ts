import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { buildMeta } from "../_shared/mlForecasting.ts";
import { callLLM } from "../llm/call_llm_adapter.ts";
import { finishOpsRun, logJobExecution, startOpsRun } from "../_shared/jobLogging.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const GROUNDSOURCE_DAILY_TOKEN_BUDGET = Number(Deno.env.get("GROUNDSOURCE_DAILY_TOKEN_BUDGET") ?? 180000);
const GROUNDSOURCE_MAX_DURATION_MS = Number(Deno.env.get("GROUNDSOURCE_MAX_DURATION_MS") ?? 120000);
const GROUNDSOURCE_MAX_EVENTS_PER_DAY = 200;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { "Content-Type": "application/json" };
const SOURCE_ALLOWLIST: Record<string, Array<{ name: string; url: string; latitude?: number; longitude?: number }>> = {
  utility_public: [
    { name: "AESO", url: "https://www.aeso.ca/", latitude: 51.0447, longitude: -114.0719 },
    { name: "IESO", url: "https://www.ieso.ca/", latitude: 43.6532, longitude: -79.3832 },
    { name: "Alberta Utilities Commission", url: "https://www.auc.ab.ca/", latitude: 51.0447, longitude: -114.0719 },
    { name: "UCA Alberta", url: "https://ucahelps.alberta.ca/", latitude: 51.0447, longitude: -114.0719 },
    { name: "ENMAX", url: "https://www.enmax.com/", latitude: 51.0447, longitude: -114.0719 },
    { name: "ATCOenergy", url: "https://www.atcoenergy.com/", latitude: 51.0447, longitude: -114.0719 },
    { name: "EPCOR", url: "https://www.epcor.com/", latitude: 53.5461, longitude: -113.4938 },
    { name: "Hydro-Quebec", url: "https://www.hydroquebec.com/", latitude: 45.5017, longitude: -73.5673 },
  ],
  policy_public: [
    { name: "Alberta News", url: "https://www.alberta.ca/news", latitude: 53.5461, longitude: -113.4938 },
    { name: "Government of Canada News", url: "https://www.canada.ca/en/news.html", latitude: 45.4215, longitude: -75.6972 },
    { name: "CBC Alberta", url: "https://www.cbc.ca/news/canada/calgary", latitude: 51.0447, longitude: -114.0719 },
    { name: "CBC Ontario", url: "https://www.cbc.ca/news/canada/toronto", latitude: 43.6532, longitude: -79.3832 },
    { name: "Calgary Herald Energy", url: "https://calgaryherald.com/tag/energy", latitude: 51.0447, longitude: -114.0719 },
    { name: "Edmonton Journal Energy", url: "https://edmontonjournal.com/tag/energy", latitude: 53.5461, longitude: -113.4938 },
    { name: "Globe and Mail Energy", url: "https://www.theglobeandmail.com/topics/energy/", latitude: 43.6532, longitude: -79.3832 },
  ],
};

type SourceDescriptor = {
  name: string;
  url: string;
  latitude?: number;
  longitude?: number;
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

function coerceNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
    latitude: coerceNumber(raw.latitude ?? raw.lat ?? source.latitude),
    longitude: coerceNumber(raw.longitude ?? raw.lng ?? source.longitude),
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
    '{ "source_confidence": 0.0-1.0, "provenance_notes": [string], "events": [ { "event_type": "outage|delay|interconnection|price_spike|policy|weather|other", "province": "AB|ON|BC|QC|MB|SK|NS|NB|NL|PE|NT|NU|YT|null", "location_name": string|null, "latitude": number|null, "longitude": number|null, "affected_asset": string|null, "severity": "low|medium|high|critical", "event_timestamp": string|null, "confidence_score": 0.0-1.0, "summary": string } ] }',
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

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    || authHeader === `Bearer ${CRON_SECRET}`
    || req.headers.get("x-supabase-cron") === "true";
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

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }

  const startedAt = Date.now();
  let opsRunId: string | null = null;
  let opsRunStartedAt: string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const sourceGroup = String(body.source_group ?? body.sourceGroup ?? "utility_public");
    const allowIndigenous = Boolean(body.allow_indigenous_consent ?? body.allowIndigenousConsent);
    const scheduledRun = Boolean(body.scheduled_run ?? body.scheduledRun);
    const maxSources = Math.min(15, Math.max(1, Number(body.max_items ?? body.maxItems ?? 5)));
    const requestedEvents = Math.min(GROUNDSOURCE_MAX_EVENTS_PER_DAY, Math.max(1, Number(body.max_events ?? body.maxEvents ?? GROUNDSOURCE_MAX_EVENTS_PER_DAY)));
    const sampleSources = Array.isArray(body.sample_sources)
      ? body.sample_sources.slice(0, maxSources).map((entry: any, index: number) => ({
        name: String(entry?.name ?? `Sample ${index + 1}`),
        url: String(entry?.url ?? `sample://${index + 1}`),
        latitude: Number.isFinite(Number(entry?.latitude)) ? Number(entry.latitude) : undefined,
        longitude: Number.isFinite(Number(entry?.longitude)) ? Number(entry.longitude) : undefined,
        title: entry?.title ? String(entry.title) : undefined,
        text: entry?.text ? String(entry.text) : undefined,
        html: entry?.html ? String(entry.html) : undefined,
      }))
      : null;
    const allowlistedSources = (SOURCE_ALLOWLIST[sourceGroup] ?? []).slice(0, maxSources);
    const sources: SourceDescriptor[] = sampleSources?.length ? sampleSources : allowlistedSources;
    if (sources.length === 0) {
      return new Response(JSON.stringify({ error: "source_group is not allowlisted" }), { status: 400, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
    }

    let remainingEventBudget = requestedEvents;
    let remainingDurationBudgetMs = GROUNDSOURCE_MAX_DURATION_MS;
    let todayEventCount = 0;
    if (supabase) {
      const opsRun = await startOpsRun(supabase, {
        jobName: "groundsource-miner",
        runType: "ingestion",
        metadata: {
          source_group: sourceGroup,
          scheduled_run: scheduledRun,
          requested_sources: sources.length,
        },
      });
      opsRunId = opsRun.id;
      opsRunStartedAt = opsRun.started_at;

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const [eventsTodayResult, todayRunsResult] = await Promise.all([
        supabase.from("ml_intelligence_events").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("ops_runs").select("duration_ms").eq("job_name", "groundsource-miner").gte("started_at", todayStart.toISOString()),
      ]);
      todayEventCount = Number(eventsTodayResult.count ?? 0);
      const durationUsedMs = Array.isArray(todayRunsResult.data)
        ? todayRunsResult.data.reduce((sum, row) => sum + Number(row.duration_ms ?? 0), 0)
        : 0;
      remainingEventBudget = Math.min(
        requestedEvents,
        Math.max(0, GROUNDSOURCE_MAX_EVENTS_PER_DAY - todayEventCount),
      );
      remainingDurationBudgetMs = Math.max(0, GROUNDSOURCE_MAX_DURATION_MS - durationUsedMs);
    }

    if (remainingEventBudget <= 0) {
      const response = {
        source_group: sourceGroup,
        scheduled_run: scheduledRun,
        documents: [],
        events: [],
        provenance_score: 0,
        extraction_mode: "budget_exhausted",
        warnings: ["Daily intelligence event budget has been exhausted."],
        meta: buildMeta({
          modelVersion: "groundsource-miner-v1",
          validAt: new Date().toISOString(),
          confidenceScore: 0,
          dataSources: sources.map((source) => ({ name: source.name, url: source.url })),
          isFallback: true,
          methodology: "Groundsource ingestion halted because the daily event budget was exhausted.",
          warnings: ["Daily intelligence event budget has been exhausted."],
        }),
      };

      if (supabase && opsRunId) {
        await finishOpsRun(supabase, opsRunId, "success", {
          jobName: "groundsource-miner",
          startedAt: opsRunStartedAt,
          metadata: {
            source_group: sourceGroup,
            scheduled_run: scheduledRun,
            today_event_count: todayEventCount,
            remaining_event_budget: 0,
            token_budget_used: 0,
            duration_budget_ms: remainingDurationBudgetMs,
          },
        }).catch(() => null);
        await logJobExecution(supabase, {
          jobName: "groundsource-miner",
          jobType: "cron",
          status: "success",
          durationMs: Math.max(0, Date.now() - startedAt),
          metadata: {
            source_group: sourceGroup,
            scheduled_run: scheduledRun,
            extraction_mode: "budget_exhausted",
            today_event_count: todayEventCount,
          },
        }).catch(() => null);
      }

      return new Response(JSON.stringify(response), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
    }

    const documents: any[] = [];
    const events: any[] = [];
    const provenanceScores: number[] = [];
    const heuristicsUsed: string[] = [];
    const warnings: string[] = [];
    let estimatedTokensUsed = 0;

    for (const source of sources) {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= remainingDurationBudgetMs) {
        warnings.push("Groundsource duration budget reached; remaining sources were skipped.");
        break;
      }
      if (events.length >= remainingEventBudget) {
        warnings.push("Groundsource daily event budget reached; remaining sources were skipped.");
        break;
      }
      if (estimatedTokensUsed >= GROUNDSOURCE_DAILY_TOKEN_BUDGET) {
        warnings.push("Groundsource token budget reached; remaining sources were skipped.");
        break;
      }

      const fetched = source.text || source.html
        ? { ok: true, text: async () => source.text ?? stripHtml(source.html ?? "") }
        : await fetch(source.url, {
          headers: { "User-Agent": "CEIPGroundsourceMiner/1.0 (+public-source-allowlist)" },
        }).catch(() => null);
      if (!fetched?.ok) continue;

      const html = source.html ?? (source.text ? source.text : await fetched.text());
      const text = stripHtml(html).slice(0, 5000);
      estimatedTokensUsed += Math.ceil(text.length / 4);
      if (estimatedTokensUsed >= GROUNDSOURCE_DAILY_TOKEN_BUDGET) {
        warnings.push("Groundsource token budget reached while processing source text.");
        break;
      }

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
          latitude: source.latitude ?? null,
          longitude: source.longitude ?? null,
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
          token_budget_used: estimatedTokensUsed,
          duration_budget_remaining_ms: Math.max(0, remainingDurationBudgetMs - elapsedMs),
        },
      };

      const documentRecord = supabase
        ? (await supabase.from("ml_source_documents").upsert(documentPayload, { onConflict: "source_url,content_hash" }).select("id, source_url").single()).data
        : { id: crypto.randomUUID(), source_url: source.url };
      if (!documentRecord) continue;
      documents.push(documentRecord);

      for (const eventPayload of eventPayloads) {
        if (events.length >= remainingEventBudget) break;
        const confidence = clamp(Number(eventPayload.confidence_score ?? sourceConfidence), 0, 1);
        provenanceScores.push(clamp(confidence * sourceWeight(sourceGroup, source.url), 0, 1));
        const eventRecord = {
          source_document_id: documentRecord.id,
          event_type: String(eventPayload.event_type ?? fallbackEvent.eventType),
          province: eventPayload.province ?? fallbackEvent.province,
          location_name: eventPayload.location_name ?? null,
          latitude: coerceNumber(eventPayload.latitude ?? source.latitude),
          longitude: coerceNumber(eventPayload.longitude ?? source.longitude),
          affected_asset: eventPayload.affected_asset ?? null,
          severity: String(eventPayload.severity ?? fallbackEvent.severity),
          event_timestamp: parseTimestamp(eventPayload.event_timestamp ?? eventPayload.timestamp),
          confidence_score: confidence,
          summary: String(eventPayload.summary ?? `${source.name}: ${title}`).slice(0, 500),
          source_url: source.url,
          synthetic: false,
        };

        const insertedEvent = supabase
          ? (await supabase.from("ml_intelligence_events").insert(eventRecord).select("id, event_type, province, severity, summary, source_url, latitude, longitude, event_timestamp").single()).data
          : {
            id: crypto.randomUUID(),
            event_type: eventRecord.event_type,
            province: eventRecord.province,
            severity: eventRecord.severity,
            summary: eventRecord.summary,
            source_url: eventRecord.source_url,
            latitude: eventRecord.latitude,
            longitude: eventRecord.longitude,
            event_timestamp: eventRecord.event_timestamp,
          };
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
      isFallback: heuristicsUsed.length > 0 || warnings.length > 0,
      methodology: "Allowlisted public-source fetch, content hash deduplication, and structured LLM extraction with heuristic fallback.",
      warnings: [
        "No Indigenous/community microgrid data is ingested unless explicit consent is supplied.",
        scheduledRun ? "Scheduled ingestion mode enabled." : "Manual ingestion mode.",
        heuristicsUsed.length > 0 ? "One or more sources fell back to heuristic extraction." : "LLM structured extraction used for all processed sources.",
        ...warnings,
      ],
      claimLabel: heuristicsUsed.length > 0 ? "advisory" : "validated",
    });

    if (supabase && opsRunId) {
      await finishOpsRun(supabase, opsRunId, "success", {
        jobName: "groundsource-miner",
        startedAt: opsRunStartedAt,
        metadata: {
          source_group: sourceGroup,
          scheduled_run: scheduledRun,
          documents: documents.length,
          events: events.length,
          heuristics_used: heuristicsUsed.length,
          token_budget_used: estimatedTokensUsed,
          duration_budget_ms: remainingDurationBudgetMs,
        },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "groundsource-miner",
        jobType: "cron",
        status: "success",
        durationMs: Math.max(0, Date.now() - startedAt),
        metadata: {
          source_group: sourceGroup,
          scheduled_run: scheduledRun,
          documents: documents.length,
          events: events.length,
          heuristics_used: heuristicsUsed.length,
          token_budget_used: estimatedTokensUsed,
        },
      }).catch(() => null);
    }

    return new Response(JSON.stringify({
      source_group: sourceGroup,
      scheduled_run: scheduledRun,
      documents,
      events,
      provenance_score: confidenceScore,
      extraction_mode: heuristicsUsed.length > 0 ? "mixed" : "llm",
      budget: {
        requested_events: requestedEvents,
        remaining_events: remainingEventBudget,
        token_budget_used: estimatedTokensUsed,
        token_budget_limit: GROUNDSOURCE_DAILY_TOKEN_BUDGET,
        duration_budget_remaining_ms: remainingDurationBudgetMs,
      },
      warnings: meta.warnings,
      meta,
    }), { status: 200, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  } catch (error) {
    if (supabase && opsRunId) {
      await finishOpsRun(supabase, opsRunId, "failure", {
        jobName: "groundsource-miner",
        startedAt: opsRunStartedAt,
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: {
          source_group: "unknown",
          scheduled_run: false,
        },
      }).catch(() => null);
      await logJobExecution(supabase, {
        jobName: "groundsource-miner",
        jobType: "cron",
        status: "failed",
        durationMs: Math.max(0, Date.now() - startedAt),
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { error: error instanceof Error ? error.message : String(error) },
      }).catch(() => null);
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { ...cors, ...jsonHeaders, ...rl.headers } });
  }
});
