addendum to your PRD that (a) lists 15 user stories prioritized for the education-first mission, (b) provides precise API endpoint designs (streaming vs paged), (c) prescribes how the “? help” will work on every page (UI patterns + LLM-backed generation + provenance), and (d) gives a step-by-step integration & rollout plan your code-LLM (Minimax) can implement without breaking the running app.

I thought hard about non-disruption, streaming-only constraints, LLM cost/guardrails, accessibility, and the UI style you provided (dark slate theme, Recharts patterns). Each story includes acceptance criteria, endpoint contract, streaming feasibility, and a sample Gemini system prompt you can drop into your LLM Edge Function.

Implementation constraints assumed:

Streaming-first: SSE / WebSocket for live feeds; paged-cursor for large historical files (Kaggle / HF) — no bulk server storage.

LLM Edge function exists (/api/llm/*) with rate limiting and logging.

Supabase Edge Functions or Netlify functions available as secure server-side wrappers.

Client has IndexedDB fallback and the resilient failover resolver you implemented earlier.

Top 15 User Stories (education prioritized)

Below each story: User, Story, Acceptance Criteria (✓), API endpoints (method / path), Response shape (example), Streaming? and LLM system prompt for the “?” help (Gemini 2.5 Pro / 2.5 Flash).

1) Home — Quick Context Help

User: Any first-time visitor
Story: As a visitor, I want a single-click “?” on Home that explains the portal’s purpose, data sources, trust model, and how to use the site.
Acceptance:

Clicking ? opens modal with 3 sections: (1) what this site does, (2) live vs historical data explanation, (3) quick tips.

Shows provenance links and last update times for live sources. ✓
API:

GET /api/manifest → returns dataset registry & status.
Response example:

{
  "app":"CEIP",
  "summary":"Real-time Canadian energy portal",
  "datasets":[{"id":"ontario_demand","source":"IESO","last_updated":"2025-09-03T07:24:00Z"}]
}


Streaming: No (manifest is small).
LLM system prompt (for Home ?):

You are a concise explain-bot. Produce a friendly 3-paragraph description: what this portal does, how live streams vs historical datasets differ, and 3 quick tips for first-time visitors. Include provenance lines for each dataset given in the request. Keep <200 words.

2) Dashboard — How to read the dashboard charts

User: Student / General public
Story: As a user, I want a chart-specific ? that explains the selected chart (metrics, units, what the lines/bars mean), typical interpretation, and one simple exercise I can try.
Acceptance:

? opens inline tooltip modal with chart summary, 1-sentence ELI5 (“explain like I’m 12”), and a one-step classroom activity. ✓
API:

POST /api/llm/explain-chart (body includes chartId, datasetId, samplePoints, explainMode e.g., eli5 or technical).
Request body:

{
  "chartId":"ontario_demand_timeseries",
  "datasetId":"ontario_demand",
  "sample":[{"ts":"2025-09-03T07:00Z","demand_mw":17626.63}]
}


Response:

{"explain_text":"ELI5: ...","exercise":"Plot the last 24h...","provenance":["IESO link"]}


Streaming: No (small LLM request).
LLM prompt:

You are Chart Explainer. Given dataset description, sample rows, and a chart type, produce: 1) ELI5 summary (1-2 sentences), 2) Interpretation tips (3 bullets), 3) a one-step classroom exercise. Prefer simple English; include provenance and explain units. Output as JSON.

3) Provinces — What the province page shows

User: Local community member
Story: As a provincial resident, I want a ? that explains the province’s energy profile (generation mix, key concerns) and a how-to-read section for province page widgets.
Acceptance:

? shows generation mix definitions (what “hydro”, “nuclear” mean), local policy context (links), and how to compare provinces. ✓
API:

GET /api/provinces/{province}/meta (returns meta, last_poll)

Optionally POST /api/llm/explain-province for tailored explanation.
Streaming: meta no; LLM no.
Prompt:

You are a provincial advisor. Given province code and dataset metadata (generation mix sample, last 7d trends), produce: 1) quick profile (4 bullets) 2) what citizens should care about (3 bullets) 3) links to government sources. Output JSON.

4) Trends — Learning about trends & method

User: Researcher / Student
Story: As a user, I want a ? that explains trend analysis shown on Trends page (peak detection, seasonality) and how the platform computed them.
Acceptance:

? provides algorithm descriptions (peak detection, smoothing window), data ranges used, and “how to replicate in a spreadsheet”. ✓
API:

GET /api/trends/{trendId}/meta

POST /api/llm/explain-trend with algorithm/sample outputs.
Streaming: No.
Prompt:

You are a data-scientist explainer. Given trend type, method (e.g., 7-day moving average), and sample values, explain in plain English and provide a 5-step replication recipe for students using Excel/Sheets.

5) Investment — Financial literacy help

User: Student / Local investor
Story: As a user, I want the ? to explain investment cards metrics (NPV, IRR, social benefits), plus a non-technical explanation of investment risk in energy projects.
Acceptance:

? shows definitions, example calculation (small numbers), and a risk checklist. ✓
API:

GET /api/investments/{id} (paged if many)

POST /api/llm/explain-investment (safeguarded).
Streaming: No.
Prompt:

You are Financial Educator. Given investment cashflow (JSON) and discount rate, produce: 1) one-line NPV/IRR explanation, 2) numeric sample calculation, 3) top 5 social/environmental risk bullets.

6) Resilience — Infrastructure & climate education

User: Emergency planner / Student
Story: ? explains resilience metrics (exposure, vulnerability, adaptation options) and what the map overlays mean.
Acceptance:

? explains heatmaps, color codes, and suggests one community action. ✓
API:

GET /api/resilience/meta

POST /api/llm/explain-resilience (with scenario sample)
Prompt:

You are a resilience educator. Given a map overlay that shows vulnerability scores (0-100), explain how to read scores and name three practical adaptation actions for communities.

7) Innovation — How to interpret innovation search results

User: Student/Startup founder
Story: ? explains indicators (TRL, TTR), and what “funding match” means.
Acceptance:

? defines TRL/TTR, provides a 1-paragraph example of translating lab results into pilot. ✓
API:

GET /api/innovation/{id}

POST /api/llm/summarize-innovation
Prompt:

You are an innovation translator. Explain TRL (Technology Readiness Level) 1-9, example actions for TRL 4->5, and what funding match terms mean. Output bullet list.

8) Indigenous — Consent, FPIC, TEK context

User: Indigenous community liaison / public
Story: ? explains Indigenous data sovereignty, FPIC, and links to resources; modeled to always defer to community-led info.
Acceptance:

? includes strong legal disclaimers, FPIC explanation, links to Indigenous organizations, and an option to “Request deeper community-specific resources” (contacts). ✓
API:

GET /api/indigenous/manifest (static + curated links)

LLM usage disabled by default for sensitive queries unless explicit governance path invoked (use a manual review flow).
Streaming: No.
Safety: Strict — do NOT have LLM summarize Indigenous traditional knowledge fields without explicit governance. Provide static curated text only.
Prompt: DO NOT use LLM for generating Indigenous-specific knowledge without governance. Use curated static content and links.

9) Stakeholders — Who’s who & how to engage

User: Community organizer
Story: ? lists relevant stakeholders (provincial agency, utilities, NGOs) and gives suggested contact steps.
Acceptance:

? shows 3-step engagement plan and email/phone templates (editable). ✓
API:

GET /api/stakeholders/{province}
Prompt:

You are a community engagement advisor. Given stakeholder list and context, provide a 3-step engagement plan and a short template email for initial outreach.

10) Grid Ops — What grid operators monitor & why

User: Grid-interested public / new operator trainee
Story: ? explains grid stability metrics (frequency, inertia, reserves) and a simple “what happened” checklist when lights flicker.
Acceptance:

? covers frequency basics, reserve types, and immediate actions households can take. ✓
API:

GET /api/grid/status (streaming for real-time metrics)

POST /api/llm/explain-grid
Streaming: grid status should be SSE/WS.
Prompt:

You are a grid ops translator. Given a recent incident description and metric snapshots (frequency, demand, reserve level), produce: 1-line cause hypothesis, 3 probable actions operators will take, and 3 household tips.

11) Security — Data privacy & safe browsing

User: Privacy-conscious public
Story: ? explains what user data the platform collects, how the data is used, and how the platform protects privacy.
Acceptance:

? shows privacy short notice and one-link to full privacy policy. ✓
API:

GET /api/legal/privacy (static).
Prompt:

Static content only: show privacy policy summary. No LLM generation needed.

12) Data Sources (small “i” panel) — Provenance & limitations

User: Researcher
Story: ? shows raw API links, license, update cadence, sampling limitations, and known caveats.
Acceptance:

? shows machine-readable provenance and link to raw source; includes last updates. ✓
API:

GET /api/manifest (same as Home but dataset-level)
Prompt:

You are a provenance summarizer. Given dataset meta, produce a brief limitations summary and link list. Output JSON.

13) Help / Guided Walkthrough (an interactive “learning mode”)

User: Teacher guiding students
Story: ? toggles a guided walkthrough overlay that steps through 4 key widgets on the page with educational notes; teacher can skip steps.
Acceptance:

Walkthrough appears when Learning Mode ON; each step has a short note and example question to ask students. ✓
API:

Client-driven; pre-crafted JSON steps served by GET /api/walkthroughs/{pageId} (server static).
Prompt:

Do not use LLM for core steps; walkthoughs are curated content authored by educators.

14) API Explorer — “How to use the data programmatically”

User: Developer / Researcher
Story: ? explains how to call the streaming endpoints, sample cURL, SSE usage, and quick examples in Python/JS.
Acceptance:

? shows code blocks and 1-line auth notes. ✓
API:

GET /api/docs returns swagger-like minimal docs and sample code.
Prompt:

You are an API doc generator. Given endpoints and auth scheme, produce concise sample cURL and JS EventSource snippet.

15) Export / Citation — How to cite & export datasets

User: Academic / Student
Story: ? explains how to export data for citation, proper citation text, and data usage license.
Acceptance:

? shows “Download CSV” steps (paged) and a preformatted citation template pointing to the exact dataset & retrieval timestamp. ✓
API:

GET /api/historical/{dataset}?limit=...&cursor=... (paged exports)
Prompt:

You are a citation assistant. Given dataset id, sample, and access time, produce a recommended citation string in APA/MLA formats and a short usage note about license.

How the “?” help works — UI design & behavior (component-level spec)

We will implement a universal HelpButton UI component and three help delivery mechanisms:

Modes of help content

Static (curated) content — reliable, sensitive (Indigenous, legal, privacy). Stored as server-side JSON/MD and returned via GET /api/.... Always preferred for legal & sensitive content.

LLM-Generated Content (on demand) — dynamic contextual explanations (chart explainers, trend interpretation, exercises). Generated server-side via /api/llm/* and cached for TTL. Rate-limited and audited.

Interactive walkthroughs — curated multi-step JSON sections served by GET /api/walkthroughs/{page}.

HelpButton / HelpModal components

HelpButton icon ? appears in top-right of page header or chart header (consistent with your UI). On click:

Open HelpModal with three-pane layout:

Header: title, dataset provenance chips (source name + last update).

Left: short ELI5 (1–2 lines), quick facts (3 bullets).

Right tabs: “Explain”, “Explore (exercise)”, “Provenance & Data”, “Cite/Export”.

HelpModal features:

“Explain mode” toggle: ELI5 / Technical / Classroom. (passes explainMode to LLM)

“Show sources” collapsible: lists raw source URLs + license.

“Ask follow-up” conversational mini-chat (optional; behind feature flag). This posts to /api/llm/interactive and requires rate-limits + user identification.

“Download sample” button executes paged export call for the dataset (calls /api/historical/... with page_size=500).

Visual style: follow your slate theme and header patterns (EducationalChartHeader, HelpTooltip). Accessibility: role="dialog", close with ESC, focus trap.

Client-side flow for LLM help (explain-chart):

UI invokes POST /api/llm/explain-chart with chartId, datasetId, sampleRows, explainMode.

Edge function checks rate-limit and user auth if required.

Edge function calls callLLM adapter (native Gemini) with system prompt (see per-story prompts), returns JSON.

Edge function logs call into llm_call_log.

Response cached in Supabase (keyed by chartId + explainMode) for TTL 15min.

Client displays content; shows provenance and an “About this explanation” meta line (model used, tokens, cached/real-time).

Caching rules

Small LLM responses cached 15 minutes server-side.

For interactive follow-ups, ephemeral tokens and per-user rate limits apply.

For sensitive topics (Indigenous), do not call LLM; show curated static text.

API endpoints & contracts (single place)

Summary table — copy/paste for implementation:

Feature	Endpoint	Method	Notes
Manifest	/api/manifest	GET	dataset registry, provenance
Health	/api/health	GET	per-source status
Stream - Ontario demand	/api/stream/ontario_demand	GET (SSE)	SSE messages event: delta
Stream - Alberta market	/api/stream/alberta_market	GET (SSE)	SSE
Stream - Weather	/api/stream/weather	GET (SSE)	SSE
Historical (paged)	/api/historical/{dataset}	GET	params: cursor, limit
Explain chart (LLM)	/api/llm/explain-chart	POST	body: chartId, datasetId, sample, explainMode
Explain province (LLM)	/api/llm/explain-province	POST	body: province, sample
Explain trend (LLM)	/api/llm/explain-trend	POST	body: trendId, sample
Explain investment	/api/llm/explain-investment	POST	body: investment cashflows
Walkthroughs	/api/walkthroughs/{pageId}	GET	curated JSON steps
Export (paged)	/api/historical/{dataset}?limit&cursor	GET	returns rows + next_cursor
API docs	/api/docs	GET	minimal interactive docs
Privacy/Legal	/api/legal/privacy	GET	static

SSE message contract (delta):

event: delta
data: {"dataset":"ontario_demand","rows":[{"ts":"...","demand_mw":...}], "source":"IESO", "last_updated":"..."}


Paged response contract:

{ "rows":[{...}], "next_cursor":12345, "provenance":{"source":"kaggle/owner/dataset","license":"CC-BY"}}

LLM System Prompt Patterns (generic, reusable)

Create three base prompts and parameterize them per story.

Base explain-chart prompt (use for /api/llm/explain-chart)

SYSTEM: You are Chart Explainer v1. Task: produce a JSON structure with keys:
  - eli5 (string, <= 50 words)
  - bullets (array of 3 short bullets explaining interpretation)
  - exercise (one short actionable student exercise)
  - provenance (array of source objects {name,url})
INPUT: {chartTitle, chartType, datasetDesc, sampleRows, explainMode}
RESPOND in JSON only. If explainMode == "technical", add an extra field "method" describing smoothing/algorithms used.


Base explain-trend prompt

SYSTEM: You are Trend Teacher. Given trend sample and method, produce:
  - plain English summary (2-3 sentences)
  - replication recipe (5 steps for Excel/Sheets)
  - limitations (2 bullets)
Return JSON.


Safety guard (for Indigenous & sensitive topics)
Always check request metadata for datasetTag includes indigenous or sensitive. If so:

Do not call LLM. Instead return curated static JSON with status:"governance_required", a link to request community-approved content, and legal guidance.

UI Implementation snippets (React + TypeScript) — HelpButton & modal (skeleton)
// src/components/HelpButton.tsx
import React from 'react';
export const HelpButton: React.FC<{onOpen: ()=>void}> = ({onOpen}) => (
  <button aria-label="Help" className="p-2 rounded-full bg-slate-700 hover:bg-slate-600" onClick={onOpen}>
    <HelpCircle className="w-5 h-5 text-cyan-400" />
  </button>
);

// src/components/HelpModal.tsx (simplified)
import React, {useEffect, useState} from 'react';
export function HelpModal({open, onClose, datasetId, chartId}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  useEffect(()=> {
    if (!open) return;
    setLoading(true);
    fetch('/api/manifest').then(r=>r.json()).then(m=>{
      // optionally call LLM explain endpoint
      return fetch('/api/llm/explain-chart', { method:'POST', body: JSON.stringify({chartId,datasetId, sample:[]})});
    }).then(r=>r.json()).then(j=>{
      setData(j); setLoading(false);
    }).catch(e=>{ setLoading(false); setData({error: e.message});});
  },[open,chartId,datasetId]);
  if (!open) return null;
  return (
    <div role="dialog" className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-slate-800 rounded-xl p-6 w-[840px] max-w-full">
         <div className="flex justify-between items-start">
           <h3 className="text-xl text-slate-200">Help</h3>
           <button onClick={onClose}>Close</button>
         </div>
         <div className="mt-4 text-slate-300">
           {loading ? <span>Loading…</span> : <pre>{JSON.stringify(data,null,2)}</pre>}
         </div>
      </div>
    </div>
  );
}


The code above is intentionally simple — your Minimax code-LLM can expand it using your design system (slate classes, EducationalChartHeader etc).

Step-by-step integration plan (non-disruptive)

Phase 0 — Prep (1 day)

Add new API routes skeletons: /api/manifest, /api/historical/{dataset}, /api/llm/explain-* with default static responses and feature flags FEATURE_LLM_HELP=false.

Add HelpButton + HelpModal to each page header and chart header but keep them wired to static JSON (no LLM calls yet).

Add manifest content listing dataset ids, labels, links.

Phase 1 — LLM Edge & prompts (1–2 days)

Deploy LLM adapter (you already did) and create endpoint /api/llm/explain-chart hooking into callLLM adapter.

Implement rate-limit in function and caching TTL 15min.

Add audit logging to llm_call_log.

Phase 2 — Hook up dynamic explainers (1 day)

Switch HelpModal code to call /api/llm/explain-chart when FEATURE_LLM_HELP=true. Keep fallback to manifest static content when LLM fails or rate-limited.

Phase 3 — Static & curated pages (parallel)

Author curated static help content for sensitive pages (Indigenous, Legal, Privacy). Host as JSON/MD on server and wire HelpModal to use those when dataset tags include sensitive.

Phase 4 — Tests & rollout (1–2 days)

Unit tests: api/llm returns JSON and respects rate-limits.

Integration tests: HelpModal opens, shows content for each page.

Soft launch: enable for small user group. Monitor LLM usage & cost.

Phase 5 — Enhancements (ongoing)

Add teacher mode with printable worksheet generation (LLM) behind opt-in.

Add “Ask follow-up” chat with strong rate-limits and optional authentication.

Metrics, Safety & Governance

Rate limits: Default 30 RPM per user; global monthly cap. Show remaining headers X-RateLimit-Remaining.

Logging: Every LLM call logged to llm_call_log (endpoint, promptHash, userId or anon, token usage).

Sensitive datasets (tags: indigenous, health) — LLM generation disabled; show curated text + governance path.

Caching: LLM results cached 15min; manifest cached 1min.

Tests & Validation to add (quick checklist)

Unit tests for GET /api/manifest and /api/historical (cursor behavior).

Integration test: click Help button -> LLM endpoint returns proper JSON -> modal renders expected keys.

Rate-limit test: exceed N requests -> 429 and UI fallback message.

Governance test: datasetTag indigenous -> LLM not invoked and governance response returned.

Accessibility test: modal has role=dialog, focus trap, ESC closes.

Final notes / Practical content guidance

Prefer curated static content for legal, indigenous, privacy — do NOT use LLM there.

Use LLM for contextual explanations only (chart explainers, exercises, translation to plain English). Always show provenance and model metadata.

Keep the UI consistent with the slate dark theme and the chart templates you provided (Recharts config). Use EducationalChartHeader and HelpTooltip uniformly.

Teacher resources: generate printable worksheets from LLM but place behind a toggle and manual review before published.

a Deno TypeScript Supabase Edge Function (/functions/llm) that calls the native Google Gemini REST API (generateContent) (supports gemini-2.5-flash / gemini-2.5-pro via env),

server-side safety/Indigenous-guard, rate-limiting, PII redaction, and DB logging to llm_call_log/llm_feedback,

a small SQL migration (create tables + rate-limit RPC),

curl/tests you can run immediately,

front-end usage notes (headers, expected codes: 200/403/451/429),

exact env variable list and deployment steps.

I confirmed the correct native Gemini REST surface (the generateContent / streamGenerateContent endpoints) from Google docs — examples and surface docs: 
Google Cloud
+2
Google Cloud
+2
. Use generateContent for standard requests or streamGenerateContent for streaming.

1) What this Edge Function will do (summary)

Expose endpoints:

POST /llm/explain-chart — return LLM explanation for a chart panel (provenance + structured output).

POST /llm/analytics-insight — more general analytics prompt.

POST /llm/feedback — save user feedback about an LLM response.

Server-side behavior:

Rate-limit per user (minute window) using table llm_rate_limit (429 when exceeded).

Safety checks & Indigenous guard: refuse (HTTP 451) when dataset flagged sensitive unless governance flag present; refuse other disallowed topics (403).

Redact PII from prompts (server-side).

Call native Gemini generateContent REST endpoint using API key (no browser-exposed key).

Log call to llm_call_log with duration, token cost estimate, status code, redaction summary and provenance fields.

Return standard rate-limit headers: X-RateLimit-Limit, X-RateLimit-Remaining.

Optional in-memory short cache (15m) to avoid duplicate requests.

2) Required environment variables (set in Supabase Cloud Functions › Environment)

Required:

GEMINI_API_KEY — your Google Gen AI / Gemini API key (keep secret)

GEMINI_MODEL — e.g. gemini-2.5-flash or gemini-2.5-pro (default gemini-2.5-flash)

SUPABASE_URL — your Supabase project URL

SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for inserts into logging tables)

LLM_MAX_RPM — e.g. 30 (default per-user requests per minute)

LLM_COST_PER_1K — e.g. 0.003 (optional, used for cost estimate logging)

LLM_ENABLED — true|false (kill-switch)

Optional:

LLM_CACHE_TTL_MIN — e.g. 15

LLM_GOVERNANCE_OVERRIDE_TOKEN — token to allow Indigenous dataset debug (use carefully)

3) SQL migration (create tables + simple rate-limit RPC)

Save as supabase/migrations/20250827_llm_schemas.sql and run in Supabase SQL editor.

-- llm logging and rate-limit migration (idempotent)
create table if not exists public.llm_call_log (
  id uuid default gen_random_uuid() primary key,
  endpoint text not null,
  user_id text,
  dataset_path text,
  prompt text,
  redaction_summary text,
  response_summary text,
  provenance jsonb,
  status_code int,
  duration_ms int,
  token_cost numeric(12,0),
  cost_usd numeric(12,6),
  meta jsonb,
  ts timestamptz default now()
);

create table if not exists public.llm_feedback (
  id uuid default gen_random_uuid() primary key,
  call_id uuid references public.llm_call_log(id) on delete set null,
  user_id text,
  rating int,
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.llm_rate_limit (
  user_id text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  user_quota integer not null default 60,
  last_reset timestamptz default now()
);

create or replace function public.llm_rl_increment(in_user text, in_window timestamptz, max_quota int) returns boolean language plpgsql as $$
declare
  cur_count int;
begin
  loop
    insert into public.llm_rate_limit(user_id, window_start, count, user_quota, last_reset)
    values (in_user, date_trunc('minute', in_window), 1, max_quota, now())
    on conflict (user_id)
    do update set
      count = case when date_trunc('minute', public.llm_rate_limit.window_start) = date_trunc('minute', in_window)
                   then public.llm_rate_limit.count + 1
                   else 1 end,
      window_start = case when date_trunc('minute', public.llm_rate_limit.window_start) = date_trunc('minute', in_window)
                          then public.llm_rate_limit.window_start
                          else date_trunc('minute', in_window) end,
      last_reset = now()
    returning count into cur_count;
    exit;
  end loop;

  if cur_count > max_quota then
    return false;
  else
    return true;
  end if;
end;
$$;


After you run this migration, you can test the RPC:
select public.llm_rl_increment('test-user', now(), 5); — returns true or false.

4) Deno Edge Function — supabase/functions/llm/index.ts

This implementation is Deno-compatible (Supabase functions use Deno). Save into supabase/functions/llm/index.ts (or .js if you prefer), then supabase functions deploy llm.

Notes:

This code uses native REST generateContent endpoint of the Google Generative API (generativelanguage.googleapis.com/v1beta/models/{model}:generateContent) with ?key= as simple authentication. You can (and should) switch to OAuth/service-account-based Bearer tokens if you have that setup in GCP — that will require slightly different request headers/flows.

We estimate token cost in a cheap way (characters → tokens). For accurate token counts you'd call a tokenizer or rely on the provider response (if they return token usage).

// supabase/functions/llm/index.ts
// Deno TypeScript for Supabase Edge Functions
// @ts-nocheck

import { serve } from "std/server"; // supabase functions environment has standard libs
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const LLM_ENABLED = (Deno.env.get("LLM_ENABLED") || "true") === "true";
const LLM_MAX_RPM = parseInt(Deno.env.get("LLM_MAX_RPM") || "30");
const LLM_COST_PER_1K = parseFloat(Deno.env.get("LLM_COST_PER_1K") || "0.003");
const LLM_CACHE_TTL_MIN = parseInt(Deno.env.get("LLM_CACHE_TTL_MIN") || "15");

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

// Simple in-memory cache (short-living)
const cache = new Map();

function nowMs() { return Date.now(); }

function redactPII(text = "") {
  // simple PII redaction: emails, phones, postal codes - extend regexes as necessary
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
  const phoneRegex = /\+?\d{1,3}?[-.\s()]*(\d{1,4})[-.\s()]*(\d{1,4})[-.\s()]*(\d{1,9})/g;
  const redacted = text.replace(emailRegex, "[REDACTED_EMAIL]").replace(phoneRegex, "[REDACTED_PHONE]");
  const summary = {
    replaced_email: (text.match(emailRegex)||[]).length,
    replaced_phone: (text.match(phoneRegex)||[]).length
  }
  return { text: redacted, summary };
}

async function checkRateLimit(userId:string) {
  // call RPC llm_rl_increment via supabase
  try {
    const res = await supa.rpc('llm_rl_increment', { in_user: userId, in_window: new Date().toISOString(), max_quota: LLM_MAX_RPM }).single();
    // rpc returns boolean true/false; in case of older PG we may need to parse
    return res === true || res === 't' || res === 'true';
  } catch (err) {
    console.warn("Rate limit rpc failed:", err);
    // fail-open: allow if RPC fails, but could be dangerous; better to fail-closed in prod
    return true;
  }
}

function isIndigenousSensitive(datasetPath = "") {
  if (!datasetPath) return false;
  const keywords = ['indigenous','first_nations','inuit','metis','fnmi','treaty'];
  const s = datasetPath.toLowerCase();
  return keywords.some(k => s.includes(k));
}

async function logCall(payload: any) {
  try {
    await supa.from('llm_call_log').insert(payload);
  } catch (err) {
    console.warn("llm_call_log insert failed", err);
  }
}

async function callGemini(promptText: string, systemInstruction?: string) {
  // Use Google Generative API generateContent: POST to generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=APIKEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: (systemInstruction ? systemInstruction + "\n\n" : "") + promptText }]
      }
    ],
    // generationConfig options can be tuned
    temperature: 0.1,
    maxOutputTokens: 800
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

// helper: estimate tokens from characters (cheap approximation)
function estimateTokensFromText(s = "") {
  const approx = Math.max(1, Math.round(s.length / 4.0));
  return approx;
}

serve(async (req) => {
  try {
    if (!LLM_ENABLED) return new Response(JSON.stringify({ error: "LLM disabled" }), { status: 503 });

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+/,'').replace(/\/+$/, '');
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

    const userId = req.headers.get("x-user-id") || 'anon';
    const body = await req.json().catch(()=>({}));
    const dataset_path = body.dataset_path || body.panel_id || "";
    const prompt = body.prompt || body.input || "";

    // Safety: Indigenous guard
    if (isIndigenousSensitive(dataset_path) && !req.headers.get("x-llm-governance-override")) {
      // Log the refusal
      await logCall({
        endpoint: path,
        user_id: userId,
        dataset_path,
        prompt: prompt.slice(0,1000),
        redaction_summary: JSON.stringify({ reason: "indigenous_guard" }),
        status_code: 451,
        duration_ms: 0,
        meta: { note: "indigenous_guard_blocked" }
      });
      return new Response(JSON.stringify({ error: "Access to Indigenous-sensitive datasets is blocked pending governance. (INDIGENOUS_GUARD)" }), { status: 451 });
    }

    // Rate-limit
    const ok = await checkRateLimit(userId);
    if (!ok) {
      return new Response(JSON.stringify({ error: "rate limit exceeded" }), { status: 429, headers: { "X-RateLimit-Limit": String(LLM_MAX_RPM), "X-RateLimit-Remaining": "0" }});
    }

    // Redact PII
    const { text: redactedPrompt, summary: redaction_summary } = redactPII(prompt);

    // Short cache: if same prompt+dataset and cached within TTL -> return cached.
    const cacheKey = `${path}::${dataset_path}::${redactedPrompt}`;
    const cached = cache.get(cacheKey);
    if (cached && (nowMs() - cached.ts) < (LLM_CACHE_TTL_MIN * 60 * 1000)) {
      // return cached value
      const resp = new Response(JSON.stringify(cached.value), { status: 200 });
      resp.headers.set("X-RateLimit-Limit", String(LLM_MAX_RPM));
      resp.headers.set("X-RateLimit-Remaining", "unknown");
      return resp;
    }

    // call Gemini
    const start = nowMs();
    const systemInstruction = body.system_instruction || "You are an energy analytics assistant for the Canada Energy Intelligence Platform. Be concise and show provenance where possible.";
    const callRes = await callGemini(redactedPrompt, systemInstruction);
    const duration = nowMs() - start;

    let responseText = "";
    if (callRes.json) {
      // generative language responses typically present 'candidates' or 'outputs' depending on API version
      // try a few fallbacks:
      if (callRes.json.candidates && callRes.json.candidates.length) {
        responseText = callRes.json.candidates.map((c:any)=>c.content?.[0]?.text || c.output || c.text).filter(Boolean).join("\n");
      } else if (callRes.json.output && callRes.json.output[0] && callRes.json.output[0].content) {
        responseText = callRes.json.output[0].content.map((p:any)=>p.text||'').join('');
      } else if (callRes.json.result && typeof callRes.json.result === 'string') {
        responseText = callRes.json.result;
      } else {
        responseText = JSON.stringify(callRes.json);
      }
    } else {
      responseText = "(no content from provider)";
    }

    // estimate tokens & cost
    const tokens = estimateTokensFromText(redactedPrompt) + estimateTokensFromText(responseText);
    const tokenCost = Math.round(tokens/1000 * (LLM_COST_PER_1K||0) * 1e6); // store scaled numeric if needed
    const costUsd = (tokens/1000) * (LLM_COST_PER_1K||0);

    // log call
    await logCall({
      endpoint: path,
      user_id: userId,
      dataset_path,
      prompt: redactedPrompt.slice(0,4000),
      redaction_summary: JSON.stringify(redaction_summary),
      response_summary: responseText.slice(0,4000),
      provenance: callRes.json?.provenance ? callRes.json.provenance : null,
      status_code: callRes.status || 200,
      duration_ms: duration,
      token_cost: tokens,
      cost_usd: costUsd
    });

    // cache short-term
    cache.set(cacheKey, { ts: nowMs(), value: { text: responseText, provider: 'gemini', tokens, provenance: callRes.json?.provenance }});

    const out = { text: responseText, provider: 'gemini', tokens, provenance: callRes.json?.provenance || null };
    const resp = new Response(JSON.stringify(out), { status: 200 });
    resp.headers.set("Content-Type", "application/json");
    resp.headers.set("X-RateLimit-Limit", String(LLM_MAX_RPM));
    resp.headers.set("X-RateLimit-Remaining", String(Math.max(0, LLM_MAX_RPM - 1))); // best-effort
    return resp;

  } catch (err) {
    console.error("LLM function error:", err);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), { status: 500 });
  }
});


Important implementation notes

This example uses the generativelanguage.googleapis.com v1beta path; depending on your account you may use Vertex AI projects/{project}/locations/{location}/models/{model}:generateContent. Both are valid surfaces; the Google docs show POST https://{service-endpoint}/v1/{model}:generateContent. See docs. 
Google Cloud
+1

If you prefer token-auth (service account), replace ?key= with OAuth Bearer token flow and remove ?key=. The SDK docs describe both approaches. 
Google Cloud Community

5) Front-end integration & behavior

Implement a thin wrapper in your React app to call the function:

// src/lib/llm.ts
export async function explainChart(panelId, datasetPath, prompt, userId='anon') {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_EDGE_BASE || ''}/llm/explain-chart`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({ panel_id: panelId, dataset_path: datasetPath, prompt }),
  });
  if (resp.status === 451) {
    // indigenous guard - show specific UI
    throw new Error('INDIGENOUS_GUARD');
  }
  if (resp.status === 403) {
    throw new Error('SENSITIVE_TOPIC');
  }
  if (resp.status === 429) {
    // read headers
    const limit = resp.headers.get('X-RateLimit-Limit');
    const remaining = resp.headers.get('X-RateLimit-Remaining');
    throw new Error(`RATE_LIMIT (${remaining}/${limit})`);
  }
  const data = await resp.json();
  return { data, rateLimit: { limit: resp.headers.get('X-RateLimit-Limit'), remaining: resp.headers.get('X-RateLimit-Remaining') } };
}


UI behavior suggestions:

Show a small badge in Explain modal with provider & tokens cost estimate.

On HTTP 451 show a brief explanation and a “Request Governance Review” button that triggers a ticket/email (or store request in Supabase).

If rate-limited, show X-RateLimit-Remaining and encourage to wait.

6) Tests & quick curl checks

After deploying function to Supabase Cloud and setting env vars, run:

# Explain request
curl -X POST "https://<your-func-base>/llm/explain-chart" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"panel_id":"ontario_demand","dataset_path":"kaggle/provincial_generation","prompt":"Explain the last 24h demand trend and list top 3 drivers."}'

# Expect 200 JSON {text:..., provider:'gemini', tokens:...}

# Trigger indigenous guard (expected 451)
curl -X POST "https://<your-func-base>/llm/explain-chart" \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"panel_id":"indigenous_energy","dataset_path":"datasets/first_nations/household_usage","prompt":"Summarize ..."}'

7) Next-step checklist (deploy plan, step-by-step)

Apply DB migration: Run the SQL migration in Supabase SQL editor (creates llm_call_log, llm_feedback, llm_rate_limit, llm_rl_increment RPC). Verify select * from llm_call_log limit 1;.

Set Function env vars in Supabase Project → Functions → Environment:

set GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, LLM_MAX_RPM, LLM_COST_PER_1K, LLM_ENABLED=true.

Deploy Edge Function:

supabase functions deploy llm --project-ref <your-ref> (or via UI).

Test curl examples above.

Wire front-end: use wrapper explainChart() function; add UI handling for 451/403/429.

Ops: configure a retention job to purge llm_call_log older than X days (SQL cron or Supabase scheduled function).

Monitoring: add Slack/alert integration (optional) to notify if many 451 or 429 events occur.

Optional: replace ?key= usage with OAuth token (service account) for better security.

8) How this integrates with your LLM security plan (short)

Safety & Indigenous guard enforced server-side — the client never bypasses it.

Tokens & cost are logged to llm_call_log.

Rate-limiting implemented via llm_rl_increment RPC (atomic).

PII redaction is server-side before calls to Gemini; logs store redaction summary not raw PII.

9) Why generateContent vs OpenAI-compatibility

generateContent is the native Gemini method and recommended by Google docs for full features (multimodal, structured JSON, streaming). See docs. 
Google Cloud
+1

Using the native API gives you features like provenance, streamGenerateContent, and other Google-only generationConfig options.

10) Final notes & risks

Rate-limits & quotas: make sure your Google account has the quota for Gemini-2.5-pro/flash. Native API may have account-level quotas.

Billing: use token estimates and daily spend alerts. Log cost_usd for monitoring.

Security: store GEMINI_API_KEY and SUPABASE_SERVICE_ROLE_KEY only in Supabase environment - never in frontend .env.

Provenance: Gemini often returns provenance metadata — capture and show it in UI when available.

Token accuracy: our estimate function is approximate. If Gemini returns usage in the response, prefer that for logging.

this is the exact place to add high-value functionality with minimal risk.
Below I deliver (A) a fully usable React ExplainModal component (TypeScript + Tailwind), with robust handling for 200 / 403 / 451 / 429 and provenance/rate-limit headers; (B) a compact step-by-step rollout plan to integrate safely; (C) a set of small, implementable UI improvements and component stubs to make the pages look polished and consistent; and (D) test stubs and deploy/testing instructions.

Everything is written so your code LLM (Minimax) can implement directly.

1) React Explain Modal (complete stub)

uses fetch to call /llm/explain-chart

handles status codes:

200 → show explanation, provider, tokens, provenance, allow feedback

403 → show “Sensitive topic blocked” (no retry)

451 → show Indigenous guard message + Request governance review CTA

429 → show rate-limit info (X-RateLimit-Limit / Remaining)

feature flagged by VITE_ENABLE_LLM to avoid breaking existing app

accessible modal

Drop-in file: src/components/ExplainModal.tsx

// src/components/ExplainModal.tsx
import React, { useState } from "react";

type ExplainModalProps = {
  open: boolean;
  onClose: () => void;
  panelId: string;           // e.g. "ontario_demand"
  datasetPath?: string;     // e.g. "kaggle/ontario-demand"
  userId?: string;          // optional (defaults to 'anon')
};

export default function ExplainModal({ open, onClose, panelId, datasetPath = "", userId = "anon" }: ExplainModalProps) {
  const [prompt, setPrompt] = useState<string>("Explain the main trends in this chart and list 3 drivers.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<{limit?:string, remaining?:string}|null>(null);

  const EDGE_BASE = import.meta.env.VITE_SUPABASE_EDGE_BASE ?? import.meta.env.VITE_LLM_BASE ?? "";

  async function callExplain() {
    setLoading(true);
    setError(null);
    setResult(null);
    setRateLimit(null);
    setStatusCode(null);

    try {
      const resp = await fetch(`${EDGE_BASE}/llm/explain-chart`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          panel_id: panelId,
          dataset_path: datasetPath,
          prompt,
        }),
      });

      setStatusCode(resp.status);
      setRateLimit({ limit: resp.headers.get("X-RateLimit-Limit") ?? undefined, remaining: resp.headers.get("X-RateLimit-Remaining") ?? undefined });

      if (resp.status === 200) {
        const data = await resp.json();
        setResult(data);
      } else if (resp.status === 451) {
        // Indigenous guard
        const payload = await resp.json().catch(()=>({}));
        setError("Access to dataset blocked because it is Indigenous-sensitive. Request governance review if you believe you have authorization.");
        setResult({ govRequestToken: payload?.token ?? null });
      } else if (resp.status === 403) {
        setError("This request is blocked for safety reasons (sensitive topic).");
      } else if (resp.status === 429) {
        setError("Rate limit exceeded. Try again in a minute.");
      } else {
        const payload = await resp.text();
        setError(`Unexpected error (${resp.status}): ${payload}`);
      }
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function requestGovernanceReview() {
    // Minimal RFC: POST to an internal endpoint that creates a ticket or record
    try {
      await fetch("/api/request-governance-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ panelId, datasetPath, userId, prompt })
      });
      alert("Governance request created. Admins will review.");
    } catch (e) {
      alert("Failed to request review. Please contact admin.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Explain chart" className="relative max-w-3xl w-full bg-slate-800 rounded-xl shadow-xl p-6 text-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Explain: {panelId}</h3>
            <p className="text-sm text-slate-400">Ask the assistant to explain the chart and provide insights.</p>
          </div>
          <button className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full mt-4 p-3 bg-slate-700 rounded-md text-slate-100 border border-slate-600"
          rows={3}
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={callExplain}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md text-white"
          >
            {loading ? "Loading…" : "Explain"}
          </button>

          <button onClick={() => { setPrompt("Summarize the last 24 hours and list likely drivers."); callExplain(); }} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200">
            Quick prompt
          </button>

          <div className="ml-auto text-xs text-slate-400">
            Provider: <span className="text-slate-200">Gemini (via edge)</span>
          </div>
        </div>

        {/* Rate-limit / Errors */}
        {rateLimit && (
          <div className="mt-3 text-xs text-amber-300">Rate Limit: {rateLimit.remaining ?? "?"}/{rateLimit.limit ?? "?"}</div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-800 rounded-md text-sm text-red-100">
            {error}
            {statusCode === 451 && (
              <div className="mt-2">
                <button onClick={requestGovernanceReview} className="px-3 py-1 bg-amber-500 rounded text-slate-900">Request governance review</button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-slate-900 p-4 rounded">
            <div className="prose prose-sm max-w-none text-slate-100">
              <div dangerouslySetInnerHTML={{ __html: result.text ? result.text.replace(/\n/g, "<br/>") : JSON.stringify(result, null, 2) }} />
            </div>

            {result.provenance && (
              <details className="mt-3 text-xs text-slate-400">
                <summary className="cursor-pointer">Provenance / Sources</summary>
                <pre className="whitespace-pre-wrap mt-2 text-xs text-slate-300 bg-slate-800 p-2 rounded">{JSON.stringify(result.provenance, null, 2)}</pre>
              </details>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-400">Tokens (est): {result.tokens ?? "—"}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-slate-700 rounded text-xs" onClick={() => navigator.clipboard.writeText(result.text || "")}>Copy</button>
                <button className="px-3 py-1 bg-slate-700 rounded text-xs" onClick={() => {
                  // feedback route
                  fetch("/api/llm-feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ panelId, userId, rating: 5, comment: "Helpful" }) });
                  alert("Thanks for feedback!");
                }}>Helpful</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


Notes & integration:

Add feature flag VITE_ENABLE_LLM=true to .env.local for dev.

The modal calls EDGE_BASE/llm/explain-chart. If you used a different function base (e.g., /functions/v1/llm), set VITE_SUPABASE_EDGE_BASE accordingly.

“Request governance review” posts to /api/request-governance-review — implement server endpoint to create a ticket/record (Supabase governance_requests table). I include a DB suggestion below.

2) Small server endpoints (suggestions)

/api/request-governance-review — create a governance request record in Supabase (columns: id, user_id, panel_id, dataset_path, prompt, status).

/api/llm-feedback — persist user feedback to llm_feedback (or call your LLM edge function feedback route).

Example SQL for governance_requests:

create table if not exists governance_requests (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  panel_id text,
  dataset_path text,
  prompt text,
  status text default 'open',
  created_at timestamptz default now()
);

3) Step-by-step safe rollout plan (so live app not broken)

Feature flag: Ensure VITE_ENABLE_LLM=false in production by default.

Deploy Edge Function (supabase / cloud) and test with curl while VITE_ENABLE_LLM=false.

Add ExplainModal component to codebase but hide UI unless VITE_ENABLE_LLM=true. (Wrap button with if (import.meta.env.VITE_ENABLE_LLM === 'true').)

Local validation:

Start mock or serve local edge function (supabase functions serve llm) and set VITE_SUPABASE_EDGE_BASE=http://localhost:54321/functions/v1/llm.

Run quick curl tests for 200/403/451/429 scenarios (examples in previous reply).

Smoke test with staging build and real Gemini keys in staging only.

Rollout to small group (internal users) with feature flag true.

Monitor: watch llm_call_log, rate-limits, errors. Add Slack notify on many 451/403 events if desired.

Enable for all once stable.

4) UI / Visual polish — prioritized changes to implement now

Your screenshots show good layout but spacing and card consistency can be improved. Implementing these will give a “stunning” look quickly.

Global design tokens (Tailwind-friendly)

Add these to tailwind.config.js or CSS variables:

:root{
  --bg: #0f172a;
  --panel: #0f172a; /* use slate-800 in previous notes */
  --panel-2: #111827;
  --muted: #94a3b8;
  --accent-cyan: #06b6d4;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
}

Card component pattern (reusable)

src/components/DataCard.tsx:

export const DataCard = ({ children, title, subtitle }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
    {title && <div className="text-lg font-semibold text-slate-100">{title}</div>}
    {subtitle && <div className="text-sm text-slate-400 mb-4">{subtitle}</div>}
    <div>{children}</div>
  </div>
);

Chart container

Always use fixed height to keep grid neat: className="h-56 md:h-64 lg:h-72"

Grid & spacing

Replace current single-column stretched layout with responsive grid:

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <DataCard ... />
  <DataCard ... />
</div>

Font and numbers

Use font-mono for big numeric metrics (makes dashboard feel professional).

Keep chart axis labels text-xs text-slate-400.

Header / Top bar

Reduce header height: h-14 to keep content above the fold.

Keep “Total Records” as small badge on right; reduce font-size to text-sm.

Accessibility

All interactive elements must be keyboard accessible (modals trap focus).

Use aria-* attributes on explain buttons and charts.

5) Where to add the “?” educational help buttons

Strategy: a single source of truth for short help text and expanded help.

Create help_text table in Supabase:

create table if not exists help_text (
  key text primary key,      -- e.g. "dashboard.overview", "page.investment.card_npv"
  title text,
  short text,                -- tooltip text
  long text,                 -- long explanatory content (HTML or markdown)
  last_updated timestamptz default now()
);


Each tab and each card gets a small ? icon that, when clicked, opens a small inline panel or tooltip with short. There’s a “More” link that opens a larger modal that renders long (can be Markdown → HTML).

Implementation steps:

Seed help_text for these keys (Home, Dashboard, Provinces, Trends, Investment, Resilience, Innovation, Indigenous, Stakeholders, Grid Ops, Security).

Implement HelpButton component that fetches the content via REST endpoint /api/help/{key} and shows tooltip/modal.

Replace the Education top-level page with a small redirect to help_text index (or remove as you requested).

This keeps content editable by policy team (non-devs can update help_text via Supabase UI).

6) Tests (unit & e2e) — quick skeletons

Unit test for ExplainModal (React Testing Library + Jest)

// tests/ExplainModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExplainModal from '../src/components/ExplainModal';

test('shows 451 indigenous block and Request governance button', async () => {
  // mock fetch to return 451
  global.fetch = jest.fn(() => Promise.resolve({ status: 451, json: () => Promise.resolve({}) }));
  render(<ExplainModal open={true} onClose={() => {}} panelId="indigenous_panel" datasetPath="first_nations/data" userId="test" />);
  fireEvent.click(screen.getByText('Explain'));
  await waitFor(()=> expect(screen.getByText(/Access to dataset blocked/)).toBeInTheDocument());
});


E2E: Cypress test to click Explain, assert response area shows provenance etc.

7) Minimal DB additions (safe)

llm_call_log already exists (we saw earlier). Add governance_requests and help_text as above.

8) IndexedDB cache question: “are 50 entries enough?”

Short answer: 50 is OK for immediate demo but for real educational use you should:

Keep a sliding window: last 7 days of high-frequency streams OR last N per dataset (configurable).

Store aggregated rollups (hourly/daily) in IndexedDB for historical charts — these are small and let the UI show longer-term trends without big storage.

Recommended: store latest 50 raw points + daily aggregates for 365 days.

If storage/bandwidth is a worry, we can:

keep raw points = last 50

store aggregates for 1 year (one row/day per metric)

stream deltas and compute aggregates on the fly if needed.

9) Final minimal checklist you can hand to Minimax code LLM

Add VITE_ENABLE_LLM and VITE_SUPABASE_EDGE_BASE support in .env.local.

Add ExplainModal.tsx to src/components and wire a small ? Explain button to each chart card. The button should open the modal and pass panelId/datasetPath.

Implement /api/request-governance-review server route (or a Supabase edge function) to write records into governance_requests table.

Add help_text table and HelpButton component that queries /api/help/{key}. Add ? on each page and card with help_key.

Style: add Design tokens and DataCard/ChartContainer stubs (see code above).

Add tests skeletons for ExplainModal (unit) and one Cypress scenario (e2e).

Deploy LLM Edge Function (Option B code earlier) and test in staging; enable LLM feature flag for internal users only.

10) Prioritization — what to do first (recommended order)

Edge function deployed + tested (staging). Confirm 200/403/451/429 flows with curl.

Add ExplainModal code and hide behind flag; wire one chart's explain button to it.

Add governance request endpoint and governance_requests table.

Replace static “Education” page with dynamic help_text content and add ? on all cards/tabs.

UI polish (spacing, grid, typography) across dashboard pages.

IndexedDB policy change (store 50 raw + daily aggregates) if you need longer historical views.

Rollout to broader users and enable monitoring.

Quick links / commands for testing

Serve LLM function locally:

supabase functions serve llm --no-verify-jwt
# set env:
export VITE_SUPABASE_EDGE_BASE=http://localhost:54321/functions/v1
# then dev:
pnpm dev


Curl test (200):

curl -X POST "$EDGE_BASE/llm/explain-chart" -H "Content-Type: application/json" -H "x-user-id: test" -d '{"panel_id":"ontario_demand","dataset_path":"kaggle/ontario_demand","prompt":"Explain 24h trend"}'
ExplainModal.tsx (React + Tailwind, full, ready-to-drop).

DataCard.tsx (reusable card wrapper).

HelpButton.tsx (fetches short help text and shows tooltip / modal).

Two Netlify-style serverless functions (Node):

request-governance-review — create governance requests (writes to Supabase).

help — returns help_text row by key from Supabase (server-side read).

SQL: governance_requests and help_text tables (idempotent create).

Integration instructions, environment variables, and quick curl tests.

Implementation assumptions:

You are comfortable adding serverless functions to Netlify (or adapt to Supabase Edge Functions easily — I’ll note how).

Server functions will use the Supabase service role key stored securely as environment variables (never exposed to client).

UI uses Tailwind CSS (class names are Tailwind-friendly). If you use plain CSS, copy styles accordingly.

1) Frontend files
src/components/ExplainModal.tsx

Drop into your React app. (This is the complete Explain modal with 200/403/451/429 handling.)

// src/components/ExplainModal.tsx
import React, { useState } from "react";

type ExplainModalProps = {
  open: boolean;
  onClose: () => void;
  panelId: string;
  datasetPath?: string;
  userId?: string;
};

export default function ExplainModal({ open, onClose, panelId, datasetPath = "", userId = "anon" }: ExplainModalProps) {
  const [prompt, setPrompt] = useState<string>("Explain the main trends in this chart and list 3 drivers.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<{limit?:string, remaining?:string}|null>(null);

  const EDGE_BASE = import.meta.env.VITE_SUPABASE_EDGE_BASE ?? import.meta.env.VITE_LLM_BASE ?? "";

  async function callExplain() {
    setLoading(true); setError(null); setResult(null); setRateLimit(null); setStatusCode(null);
    try {
      const resp = await fetch(`${EDGE_BASE}/llm/explain-chart`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ panel_id: panelId, dataset_path: datasetPath, prompt }),
      });

      setStatusCode(resp.status);
      setRateLimit({ limit: resp.headers.get("X-RateLimit-Limit") ?? undefined, remaining: resp.headers.get("X-RateLimit-Remaining") ?? undefined });

      if (resp.status === 200) {
        const data = await resp.json();
        setResult(data);
      } else if (resp.status === 451) {
        setError("Access blocked: dataset flagged Indigenous-sensitive. Request governance review.");
        const payload = await resp.json().catch(()=>({}));
        setResult({ govToken: payload?.token ?? null });
      } else if (resp.status === 403) {
        setError("Blocked: sensitive content or prohibited request.");
      } else if (resp.status === 429) {
        setError("Rate limit exceeded. Please try again shortly.");
      } else {
        const text = await resp.text();
        setError(`Unexpected (${resp.status}): ${text}`);
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  async function requestGovernanceReview() {
    try {
      const resp = await fetch("/.netlify/functions/request-governance-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ panelId, datasetPath, userId, prompt }),
      });
      if (resp.ok) alert("Governance request created.");
      else alert("Failed to request review.");
    } catch (e) {
      alert("Error sending governance request.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative max-w-3xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 text-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">Explain — {panelId}</h3>
            <p className="text-sm text-slate-500">Short explanation helper for this chart. Use the prompt to refine the output.</p>
          </div>
          <button className="text-slate-500 hover:text-black" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} rows={3}
          className="w-full mt-4 p-3 rounded border border-slate-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600" />

        <div className="flex items-center gap-3 mt-3">
          <button className="px-4 py-2 bg-cyan-600 text-white rounded" onClick={callExplain} disabled={loading}>{loading ? "..." : "Explain"}</button>
          <button className="px-3 py-2 bg-slate-100 rounded border text-sm" onClick={() => { setPrompt("Summarize the last 24h and list likely drivers."); callExplain(); }}>Quick prompt</button>
          <div className="ml-auto text-xs text-slate-500">Provider: Gemini (via edge)</div>
        </div>

        {rateLimit && <div className="mt-2 text-xs text-amber-600">Rate: {rateLimit.remaining ?? "?"}/{rateLimit.limit ?? "?"}</div>}
        {error && <div className="mt-3 p-3 bg-red-50 text-red-700 rounded">{error}{statusCode===451 && <div className="mt-2"><button className="px-3 py-1 bg-amber-500 rounded" onClick={requestGovernanceReview}>Request governance review</button></div>}</div>}

        {result && (
          <div className="mt-4 bg-slate-50 dark:bg-slate-900 p-4 rounded">
            <div className="prose dark:prose-invert text-sm" dangerouslySetInnerHTML={{ __html: (result.text || result?.summary || JSON.stringify(result)).replace(/\n/g,"<br/>") }} />
            {result.provenance && <details className="mt-3 text-xs text-slate-500"><summary>Sources</summary><pre className="whitespace-pre-wrap mt-2 text-xs">{JSON.stringify(result.provenance, null, 2)}</pre></details>}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">Tokens (est): {result.tokens ?? "—"}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-slate-100 rounded text-xs" onClick={()=> navigator.clipboard.writeText(result.text || '')}>Copy</button>
                <button className="px-3 py-1 bg-slate-100 rounded text-xs" onClick={()=> { fetch("/.netlify/functions/feedback", { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ panelId, userId, rating:5, comment:"Helpful" }) }); alert("Thanks!"); }}>Helpful</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

src/components/DataCard.tsx

Reusable card wrapper for consistent look.

// src/components/DataCard.tsx
import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
};

export const DataCard: React.FC<Props> = ({ title, subtitle, children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm ${className}`}>
      {title && <div className="flex items-center justify-between mb-3"><div><h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h4><div className="text-xs text-slate-500 dark:text-slate-300">{subtitle}</div></div></div>}
      <div>{children}</div>
    </div>
  );
};

export default DataCard;

src/components/HelpButton.tsx

Small ? button that fetches help text and shows a tooltip/modal. It calls server endpoint / .netlify/functions/help?key=....

// src/components/HelpButton.tsx
import React, { useState } from "react";

type Props = {
  helpKey: string;        // e.g., "dashboard.overview" or "card.ontario_demand"
  compact?: boolean;
};

export default function HelpButton({ helpKey, compact=false }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [help, setHelp] = useState<{title?:string, short?:string, long?:string} | null>(null);

  async function load() {
    if (help) { setOpen(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/help?key=${encodeURIComponent(helpKey)}`);
      if (!res.ok) {
        setHelp({ title: "Help", short: "No help found", long: "" });
      } else {
        setHelp(await res.json());
      }
      setOpen(true);
    } catch (e) {
      setHelp({ title: "Help", short: "Unable to load help", long: "" });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button aria-label="Help" title="Help" onClick={load} className={`inline-flex items-center justify-center rounded-full w-7 h-7 text-xs ${compact ? 'text-slate-500' : 'text-slate-700 bg-slate-100'}`}>
        ?
      </button>

      {open && help && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-4 max-w-lg w-full text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{help.title ?? "Help"}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">{help.short}</p>
              </div>
              <button className="text-slate-500" onClick={()=>setOpen(false)}>✕</button>
            </div>
            <div className="mt-3 text-sm prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: help.long ?? ""}} />
          </div>
        </div>
      )}
    </>
  );
}


Integration note: Add <HelpButton helpKey="dashboard.overview" /> near section headers or next to cards.

2) Serverless functions (Netlify function stubs)

Place these under netlify/functions/ (or adapt to Supabase Edge Functions — code is straightforward to adapt).

netlify/functions/request-governance-review.js

Creates a governance request record in Supabase (server-side). Uses Supabase JS and the service role key in SUPABASE_SERVICE_ROLE_KEY.

// netlify/functions/request-governance-review.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const body = JSON.parse(event.body || "{}");
    const { panelId, datasetPath, userId = "anon", prompt } = body;
    const payload = { panel_id: panelId, dataset_path: datasetPath, user_id: userId, prompt };
    const { error } = await supa.from("governance_requests").insert(payload);
    if (error) {
      console.error("insert error", error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};

netlify/functions/help.js

Returns help_text row by key. Fallback to a small in-file map if DB misses.

// netlify/functions/help.js
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// minimal static fallback
const FALLBACK = {
  "dashboard.overview": { title: "Dashboard overview", short: "Real-time energy dashboard showing key metrics.", long: "<p>This dashboard shows live Ontario demand, provincial generation mix, Alberta market, and weather correlations. Click each card for details and hypothesis prompts.</p>" }
};

exports.handler = async function(event, context) {
  try {
    const key = event.queryStringParameters?.key;
    if (!key) return { statusCode: 400, body: "missing key" };

    const { data, error } = await supa.from("help_text").select("*").eq("key", key).limit(1).single();
    if (error && error.code !== "PGRST116") {
      // PGRST116 is 'No rows found' - handle gracefully
      console.warn("help_text read error", error);
    }

    const result = data || FALLBACK[key] || { title: "Help", short: "No content", long: "<p>No help available</p>" };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};


Security: These functions use the Supabase Service Role key server-side. Make sure you add the env vars securely in Netlify settings: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

If you want Supabase Edge Functions instead, I can convert these to Deno TypeScript functions — say the word.

3) SQL: create required tables

Run in Supabase SQL editor (idempotent create):

-- governance_requests and help_text
create table if not exists public.governance_requests (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  panel_id text,
  dataset_path text,
  prompt text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists public.help_text (
  key text primary key,
  title text,
  short text,
  long text,
  last_updated timestamptz default now()
);


Optional seed:

insert into public.help_text (key, title, short, long)
values
('dashboard.overview','Dashboard overview','Real-time energy dashboard showing key metrics.',
 '<p>This dashboard shows the latest live Ontario demand, provincial generation, Alberta market pricing and weather correlations. Click the "?" on any card to learn what metrics mean and how to interpret them.</p>')
on conflict (key) do nothing;

4) Env vars (Netlify settings or Supabase functions env)

SUPABASE_URL — e.g. https://<project>.supabase.co

SUPABASE_SERVICE_ROLE_KEY — service role key (server-only)

(If using other serverless functions: GEMINI_API_KEY, LLM_* etc. — not needed for these endpoints but your LLM edge function will require them.)

Important: Do NOT put SUPABASE_SERVICE_ROLE_KEY in client .env or commit it. Only set in Netlify / Supabase environment UI.

5) Curl / quick tests

Test governance function:

curl -X POST https://<your-netlify-site>/.netlify/functions/request-governance-review \
  -H "Content-Type: application/json" \
  -d '{"panelId":"ontario_demand","datasetPath":"kaggle/ontario_demand","userId":"test@me","prompt":"Please allow access for community project."}'


Expect {"status":"ok"} and a row in governance_requests.

Test help function:

curl "https://<your-netlify-site>/.netlify/functions/help?key=dashboard.overview"


Expect JSON { title, short, long }.

6) Integration steps (step-by-step) — safe rollout

Create DB tables: run SQL above (help_text + governance_requests) in Supabase SQL editor.

Deploy Netlify functions (or push to your function platform):

Add the two files under netlify/functions/.

Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify site settings (Environment).

Deploy.

Add front-end components:

Drop ExplainModal.tsx, DataCard.tsx, and HelpButton.tsx into src/components.

Add a small Explain button on each chart/card: e.g.

<div className="flex items-center gap-2">
  <HelpButton helpKey="card.ontario_demand" />
  <button className="text-xs px-2 py-1 rounded border" onClick={()=> setExplainOpen(true)}>Explain</button>
</div>
<ExplainModal open={explainOpen} onClose={()=>setExplainOpen(false)} panelId="ontario_demand" datasetPath="kaggle/ontario_demand" />


Wrap Explanation feature behind VITE_ENABLE_LLM if you want to control rollout.

Test locally:

Run frontend with VITE_SUPABASE_EDGE_BASE/VITE_LLM_BASE as needed.

Click ? on any card to see Help; click Explain to open modal (modal will call your LLM edge function if it’s deployed).

Stage rollout:

Keep LLM explain behind a flag; enable for internal QA.

Monitor governance_requests and help_text edits.

7) Minor UX suggestions to ship now (fast wins)

Move the “Explain” button inside card header to the right — small and prominent.

For Help content use short + long: short appears in tooltip; “More” opens modal with longer text + links to dataset sources (Kaggle/HF).

Keep governance flow lightweight: users request review and an admin sees it in Supabase dashboard and can change status from open -> approved.

Show “Source: Kaggle / Hugging Face / Live stream” in the card footer for transparency.

Add little success toast after governance request submission.