import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  authorizeUtilityConnectorRequest,
  getUtilityConnectorClient,
  logUtilityConnectorRun,
  sha256Hex,
  upsertUtilityConnectorAccount,
} from "../_shared/utilityConnector.ts";

type Jurisdiction = "Ontario" | "Alberta";
type SourceKind = "utility_system_batch" | "utility_settlement_batch";

interface NormalizedIntervalRow {
  observed_at: string;
  geography_level: "system" | "substation" | "feeder";
  geography_id: string;
  customer_class: string;
  demand_mw: number;
  weather_zone?: string | null;
  temperature_c?: number | null;
  net_load_mw?: number | null;
  gross_load_mw?: number | null;
  customer_count?: number | null;
  source_system?: string | null;
  feeder_id?: string | null;
  substation_id?: string | null;
  quality_flags: string[];
  gross_reconstituted_mw?: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, corsHeaders);
  }

  const authError = authorizeUtilityConnectorRequest(req);
  if (authError) {
    return json({ error: authError }, 401, corsHeaders);
  }

  try {
    const body = await req.json();
    const jurisdiction = body?.jurisdiction as Jurisdiction;
    const sourceKind = (body?.source_kind ?? (jurisdiction === "Alberta" ? "utility_settlement_batch" : "utility_system_batch")) as SourceKind;
    const utilityName = String(body?.utility_name ?? "").trim();
    const displayName = String(body?.display_name ?? utilityName).trim();

    if (!jurisdiction || (jurisdiction !== "Ontario" && jurisdiction !== "Alberta")) {
      return json({ error: "jurisdiction must be Ontario or Alberta." }, 400, corsHeaders);
    }
    if (!utilityName || !displayName) {
      return json({ error: "utility_name and display_name are required." }, 400, corsHeaders);
    }

    const rows = Array.isArray(body?.manifest?.records)
      ? normalizeManifestRows(body.manifest.records, jurisdiction, body.manifest.source_system ?? body.source_system)
      : normalizeCsvRows(String(body?.csv_text ?? ""), jurisdiction, sourceKind, body?.source_system);

    if (rows.length === 0) {
      return json({ error: "No valid interval rows were found in the provided payload." }, 400, corsHeaders);
    }

    const supabase = getUtilityConnectorClient();
    const connectorAccount = await upsertUtilityConnectorAccount(supabase, {
      connector_kind: sourceKind === "utility_settlement_batch" ? "alberta_settlement_batch" : "utility_batch_csv",
      source_kind: sourceKind,
      status: "active",
      jurisdiction,
      utility_name: utilityName,
      display_name: displayName,
      account_holder_ref: body?.account_holder_ref ?? null,
      last_synced_at: rows.at(-1)?.observed_at ?? new Date().toISOString(),
      last_error: null,
      metadata: body?.metadata ?? {},
    });
    const connectorAccountId = String(connectorAccount?.id ?? "");

    const payloadFingerprint = await sha256Hex(JSON.stringify(body?.manifest ?? body?.csv_text ?? {}));
    await supabase.from("utility_connector_payload_audit").insert({
      connector_account_id: connectorAccountId,
      payload_kind: Array.isArray(body?.manifest?.records) ? "batch_json" : "batch_csv",
      payload_sha256: payloadFingerprint,
      raw_payload: typeof body?.csv_text === "string" ? body.csv_text : null,
      metadata: {
        source_kind: sourceKind,
        record_count: rows.length,
      },
    });

    const insertRows = rows.map((row) => ({
      connector_account_id: connectorAccountId,
      jurisdiction,
      source_kind: sourceKind,
      source_system: row.source_system ?? null,
      observed_at: row.observed_at,
      geography_level: row.geography_level,
      geography_id: row.geography_id,
      customer_class: row.customer_class,
      demand_mw: row.demand_mw,
      weather_zone: row.weather_zone ?? null,
      temperature_c: row.temperature_c ?? null,
      net_load_mw: row.net_load_mw ?? null,
      gross_load_mw: row.gross_load_mw ?? null,
      gross_reconstituted_mw: row.gross_reconstituted_mw ?? null,
      customer_count: row.customer_count ?? null,
      feeder_id: row.feeder_id ?? null,
      substation_id: row.substation_id ?? null,
      quality_flags: row.quality_flags,
      metadata: {
        imported_via: "utility-connector-batch-sync",
      },
    }));

    const { error: intervalError } = await supabase.from("utility_interval_history").insert(insertRows);
    if (intervalError) throw intervalError;

    await logUtilityConnectorRun(supabase, {
      connector_account_id: connectorAccountId,
      run_type: "batch_import",
      status: "success",
      observed_at: rows.at(-1)?.observed_at ?? null,
      row_count: rows.length,
      warning_count: rows.filter((row) => row.quality_flags.length > 0).length,
      metadata: {
        source_kind: sourceKind,
        utility_name: utilityName,
      },
    });

    return json({
      ok: true,
      connector_account_id: connectorAccountId,
      inserted_rows: rows.length,
      source_kind: sourceKind,
    }, 200, corsHeaders);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Batch sync failed.",
    }, 500, corsHeaders);
  }
});

function normalizeManifestRows(records: any[], jurisdiction: Jurisdiction, sourceSystem?: string): NormalizedIntervalRow[] {
  return records
    .map((record) => {
      const timestamp = toIsoTimestamp(record?.timestamp);
      const demandMw = Number(record?.demand_mw);
      if (!timestamp || !Number.isFinite(demandMw)) return null;
      return {
        observed_at: timestamp,
        geography_level: normalizeGeographyLevel(record?.geography_level, record?.geography_id),
        geography_id: String(record?.geography_id ?? "system"),
        customer_class: String(record?.customer_class ?? "mixed"),
        demand_mw: demandMw,
        weather_zone: record?.weather_zone ?? (jurisdiction === "Ontario" ? "south" : "central"),
        temperature_c: toNullableNumber(record?.temperature_c),
        net_load_mw: toNullableNumber(record?.net_load_mw),
        gross_load_mw: toNullableNumber(record?.gross_load_mw),
        customer_count: toNullableNumber(record?.customer_count),
        source_system: String(record?.source_system ?? sourceSystem ?? "ami_mdm"),
        feeder_id: record?.feeder_id ?? null,
        substation_id: record?.substation_id ?? null,
        quality_flags: Array.isArray(record?.quality_flags) ? record.quality_flags.map(String) : [],
      } satisfies NormalizedIntervalRow;
    })
    .filter(Boolean) as NormalizedIntervalRow[];
}

function normalizeCsvRows(text: string, jurisdiction: Jurisdiction, sourceKind: SourceKind, sourceSystem?: string): NormalizedIntervalRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const lookup = (aliases: string[]) => headers.findIndex((header) => aliases.includes(header));

  const timestampIndex = lookup(["timestamp", "datetime", "interval_start", "date"]);
  const demandIndex = lookup(["demand_mw", "load_mw", "mw", "demand"]);
  const geographyLevelIndex = lookup(["geography_level", "level", "asset_level"]);
  const geographyIdIndex = lookup(["geography_id", "zone", "zone_id", "feeder", "substation", "system_id"]);
  const customerClassIndex = lookup(["customer_class", "class", "rate_class", "customer_segment"]);
  const weatherZoneIndex = lookup(["weather_zone", "weather", "temperature_zone"]);
  const temperatureIndex = lookup(["temperature_c", "temp_c", "temperature"]);
  const netLoadIndex = lookup(["net_load_mw", "net_mw"]);
  const grossLoadIndex = lookup(["gross_load_mw", "gross_mw"]);
  const customerCountIndex = lookup(["customer_count", "customers", "account_count"]);
  const sourceSystemIndex = lookup(["source_system", "system_source", "connector"]);
  const feederIdIndex = lookup(["feeder_id", "feeder_name"]);
  const substationIdIndex = lookup(["substation_id", "substation_name"]);
  const veeStatusIndex = lookup(["vee_status", "validation_status", "estimated_flag"]);
  const settlementStatusIndex = lookup(["settlement_status", "settlement_flag", "quality_code"]);

  if (timestampIndex < 0 || demandIndex < 0) return [];

  return lines.slice(1).map((line) => {
    const columns = splitCsvLine(line);
    const timestamp = toIsoTimestamp(columns[timestampIndex]);
    const demandMw = Number(columns[demandIndex]);
    if (!timestamp || !Number.isFinite(demandMw)) return null;

    const qualityFlags = sourceKind === "utility_settlement_batch"
      ? settlementQualityFlags(`${columns[veeStatusIndex] ?? ""} ${columns[settlementStatusIndex] ?? ""}`)
      : [];

    return {
      observed_at: timestamp,
      geography_level: normalizeGeographyLevel(columns[geographyLevelIndex], columns[geographyIdIndex]),
      geography_id: String(columns[geographyIdIndex] ?? "system"),
      customer_class: String(columns[customerClassIndex] ?? "mixed"),
      demand_mw: demandMw,
      weather_zone: columns[weatherZoneIndex] || (jurisdiction === "Ontario" ? "south" : "central"),
      temperature_c: toNullableNumber(columns[temperatureIndex]),
      net_load_mw: toNullableNumber(columns[netLoadIndex]),
      gross_load_mw: toNullableNumber(columns[grossLoadIndex]),
      customer_count: toNullableNumber(columns[customerCountIndex]),
      source_system: String(columns[sourceSystemIndex] ?? sourceSystem ?? (sourceKind === "utility_settlement_batch" ? "settlement_mdm" : "ami_mdm")),
      feeder_id: columns[feederIdIndex] || null,
      substation_id: columns[substationIdIndex] || null,
      quality_flags: qualityFlags,
    } satisfies NormalizedIntervalRow;
  }).filter(Boolean) as NormalizedIntervalRow[];
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeGeographyLevel(input: unknown, geographyId: unknown): "system" | "substation" | "feeder" {
  const raw = String(input ?? "").toLowerCase();
  if (raw === "system" || raw === "substation" || raw === "feeder") return raw;
  const id = String(geographyId ?? "").toLowerCase();
  if (id.includes("feed")) return "feeder";
  if (id.includes("sub")) return "substation";
  return "system";
}

function settlementQualityFlags(statusText: string): string[] {
  const normalized = statusText.toLowerCase();
  const flags = new Set<string>();
  if (normalized.includes("estimate")) flags.add("vee_estimated");
  if (normalized.includes("edit")) flags.add("vee_edited");
  if (normalized.includes("gap") || normalized.includes("fill")) flags.add("meter_gap_filled");
  return Array.from(flags);
}

function toIsoTimestamp(value: unknown): string | null {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
