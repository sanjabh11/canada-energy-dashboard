/**
 * api-v2-scenarios — Futures Workbench scenario CRUD + run trigger
 *
 * Routes (resolved via URL path suffix after the function name):
 *   GET  /api-v2-scenarios             → list scenarios (filters: province, status, limit)
 *   POST /api-v2-scenarios             → create scenario
 *   GET  /api-v2-scenarios/{id}        → get scenario by id
 *   PUT  /api-v2-scenarios/{id}        → update scenario (assumptions, metadata)
 *   POST /api-v2-scenarios/{id}/runs   → trigger a new scenario run
 *   GET  /api-v2-scenarios/{id}/runs   → list runs for a scenario
 *
 * B04 status: CRUD is fully wired; run execution returns 202 Accepted with a
 * queued status. Real compute integration arrives in B05 (Data Connectors).
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { buildDataProvenance } from "../_shared/dataProvenance.ts";

// ── Environment ────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("EDGE_SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
      })
    : null;

// ── Auth helper ────────────────────────────────────────────────────────────────
function isApiKeyValid(req: Request): boolean {
  const headerKey = req.headers.get("apikey") || "";
  const authHeader = req.headers.get("authorization") || "";
  let token = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }
  const allowedKeys = [
    Deno.env.get("EDGE_SUPABASE_ANON_KEY") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || "",
  ].filter(Boolean);
  if (allowedKeys.length === 0) return true; // dev passthrough if unconfigured
  return allowedKeys.includes(headerKey) || (token && allowedKeys.includes(token));
}

// ── Route helper ───────────────────────────────────────────────────────────────
/**
 * Parse sub-path segments after the function mount point.
 * Supabase routes functions at /functions/v1/<name>/<subpath>
 * but local dev may differ — we split by function name as anchor.
 */
function parseRoute(req: Request): {
  scenarioId: string | null;
  subResource: string | null;
} {
  const url = new URL(req.url);
  const parts = url.pathname.split("/api-v2-scenarios").pop()?.split("/").filter(Boolean) ?? [];
  // parts[0] = scenario UUID (or undefined for list/create)
  // parts[1] = sub-resource e.g. "runs"
  return {
    scenarioId: parts[0] ?? null,
    subResource: parts[1] ?? null,
  };
}

// ── JSON response helper ───────────────────────────────────────────────────────
function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Provenance footer attached to all successful responses ────────────────────
function buildProvenance() {
  return buildDataProvenance({
    source: "CEIP Futures Workbench — user-authored scenario",
    lastUpdated: new Date().toISOString(),
    isFallback: false,
    trustTier: "simulated",
    licenseNotes:
      "Scenario outcomes are model projections; not official government data",
    calculationMethod: "Parametric energy model v0.1 (B05 placeholder)",
  });
}

// ── Main handler ───────────────────────────────────────────────────────────────
serve(async (req) => {
  const rl = applyRateLimit(req, "api-v2-scenarios");
  if (rl.response) return rl.response;

  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  if (!isApiKeyValid(req)) {
    return jsonResponse(
      { error: "Unauthorized", message: "Missing or invalid API key" },
      401,
      corsHeaders,
    );
  }

  if (!supabase) {
    return jsonResponse(
      { error: "Internal configuration error: Supabase client not available" },
      500,
      corsHeaders,
    );
  }

  const { scenarioId, subResource } = parseRoute(req);
  const url = new URL(req.url);
  const method = req.method;

  try {
    // ── GET /api-v2-scenarios  (list) ────────────────────────────────────────
    if (method === "GET" && !scenarioId) {
      const province = url.searchParams.get("province");
      const status = url.searchParams.get("status");
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);

      let q = supabase
        .from("scenarios")
        .select(
          "id, name, description, province_code, status, config_hash, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (province) q = q.eq("province_code", province);
      if (status) q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;

      return jsonResponse(
        {
          scenarios: data ?? [],
          total: (data ?? []).length,
          provenance: buildProvenance(),
        },
        200,
        corsHeaders,
      );
    }

    // ── POST /api-v2-scenarios  (create) ─────────────────────────────────────
    if (method === "POST" && !scenarioId) {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
      }

      const required = ["name", "province_code", "config"];
      for (const field of required) {
        if (!body[field]) {
          return jsonResponse(
            { error: `Missing required field: ${field}` },
            400,
            corsHeaders,
          );
        }
      }

      // Compute a deterministic config hash for reproducibility (server-side)
      const configStr = JSON.stringify(
        Object.fromEntries(
          Object.entries(body.config as Record<string, unknown>).sort(),
        ),
      );
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(configStr),
      );
      const configHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const row = {
        name: body.name,
        description: body.description ?? null,
        province_code: body.province_code,
        horizon_years: body.horizon_years ?? 10,
        config: body.config,
        config_hash: configHash,
        status: "draft",
        created_by: body.created_by ?? null,
        tags: body.tags ?? [],
        is_public: body.is_public ?? false,
      };

      const { data, error } = await supabase
        .from("scenarios")
        .insert(row)
        .select()
        .single();

      if (error) throw error;

      return jsonResponse(
        { scenario: data, provenance: buildProvenance() },
        201,
        corsHeaders,
      );
    }

    // ── GET /api-v2-scenarios/{id}  (get by id) ───────────────────────────────
    if (method === "GET" && scenarioId && !subResource) {
      const { data, error } = await supabase
        .from("scenarios")
        .select("*")
        .eq("id", scenarioId)
        .single();

      if (error?.code === "PGRST116") {
        return jsonResponse(
          { error: "Scenario not found", code: "NOT_FOUND" },
          404,
          corsHeaders,
        );
      }
      if (error) throw error;

      return jsonResponse(
        { scenario: data, provenance: buildProvenance() },
        200,
        corsHeaders,
      );
    }

    // ── PUT /api-v2-scenarios/{id}  (update) ──────────────────────────────────
    if (method === "PUT" && scenarioId && !subResource) {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
      }

      // Only allow safe fields to be updated on a draft scenario
      const updateable: Record<string, unknown> = {};
      for (const k of ["name", "description", "config", "tags", "is_public", "horizon_years"]) {
        if (k in body) updateable[k] = body[k];
      }

      // Recompute hash if config changed
      if (updateable.config) {
        const configStr = JSON.stringify(
          Object.fromEntries(
            Object.entries(updateable.config as Record<string, unknown>).sort(),
          ),
        );
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(configStr),
        );
        updateable.config_hash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }

      const { data, error } = await supabase
        .from("scenarios")
        .update({ ...updateable, updated_at: new Date().toISOString() })
        .eq("id", scenarioId)
        .eq("status", "draft") // prevent updating non-draft scenarios
        .select()
        .single();

      if (error?.code === "PGRST116") {
        return jsonResponse(
          {
            error: "Scenario not found or not in draft status",
            code: "NOT_FOUND_OR_LOCKED",
          },
          404,
          corsHeaders,
        );
      }
      if (error) throw error;

      return jsonResponse(
        { scenario: data, provenance: buildProvenance() },
        200,
        corsHeaders,
      );
    }

    // ── POST /api-v2-scenarios/{id}/runs  (trigger run) ───────────────────────
    if (method === "POST" && scenarioId && subResource === "runs") {
      // Verify scenario exists
      const { data: scenario, error: scenarioErr } = await supabase
        .from("scenarios")
        .select("id, name, config, province_code, status")
        .eq("id", scenarioId)
        .single();

      if (scenarioErr?.code === "PGRST116") {
        return jsonResponse(
          { error: "Scenario not found", code: "NOT_FOUND" },
          404,
          corsHeaders,
        );
      }
      if (scenarioErr) throw scenarioErr;

      let body: Record<string, unknown> = {};
      try {
        body = await req.json();
      } catch {
        // body is optional for run trigger
      }

      // Insert a scenario_run row (B05 will hook real compute here)
      const runRow = {
        scenario_id: scenarioId,
        status: "queued",
        triggered_by: body.triggered_by ?? "api",
        parameters_override: body.parameters_override ?? {},
        started_at: null as string | null,
        completed_at: null as string | null,
        error_message: null as string | null,
        result_summary: null as unknown,
      };

      const { data: run, error: runErr } = await supabase
        .from("scenario_runs")
        .insert(runRow)
        .select()
        .single();

      if (runErr) throw runErr;

      // Update scenario status to 'running'
      await supabase
        .from("scenarios")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", scenarioId);

      return jsonResponse(
        {
          run,
          scenario: { id: scenario.id, name: scenario.name },
          message:
            "Run queued. B05 data-connector integration will begin compute. Poll GET /api-v2-scenarios/{id}/runs for status.",
          provenance: buildProvenance(),
        },
        202,
        corsHeaders,
      );
    }

    // ── GET /api-v2-scenarios/{id}/runs  (list runs) ──────────────────────────
    if (method === "GET" && scenarioId && subResource === "runs") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);

      const { data, error } = await supabase
        .from("scenario_runs")
        .select(
          "id, scenario_id, status, triggered_by, started_at, completed_at, error_message, result_summary, created_at",
        )
        .eq("scenario_id", scenarioId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return jsonResponse(
        {
          runs: data ?? [],
          scenario_id: scenarioId,
          provenance: buildProvenance(),
        },
        200,
        corsHeaders,
      );
    }

    // ── 405 for unsupported method/route combos ────────────────────────────────
    return jsonResponse(
      {
        error: "Method not allowed or route not found",
        supported_routes: [
          "GET /api-v2-scenarios",
          "POST /api-v2-scenarios",
          "GET /api-v2-scenarios/{id}",
          "PUT /api-v2-scenarios/{id}",
          "POST /api-v2-scenarios/{id}/runs",
          "GET /api-v2-scenarios/{id}/runs",
        ],
      },
      405,
      corsHeaders,
    );
  } catch (err) {
    console.error("[api-v2-scenarios] Unhandled error:", err);
    return jsonResponse({ error: "Internal server error" }, 500, corsHeaders);
  }
});
