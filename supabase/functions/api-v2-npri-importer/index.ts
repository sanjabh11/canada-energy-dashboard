import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://canada-energy.netlify.app",
  "https://*.netlify.app",
];

const envAllowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envAllowedOrigins,
  ...DEFAULT_ALLOWED_ORIGINS,
]));

function buildCorsHeaders(originHeader: string | null): Record<string, string> {
  const fallbackOrigin = ALLOWED_ORIGINS[0] ?? DEFAULT_ALLOWED_ORIGINS[0];

  const origin = originHeader && ALLOWED_ORIGINS.includes(originHeader)
    ? originHeader
    : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("EDGE_SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const NPRI_API_BASE = "https://data.ec.gc.ca/api/records/1.0/search/";

const VALID_PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"];

function isAuthorized(req: Request): boolean {
  const configuredToken = Deno.env.get("NPRI_IMPORT_TOKEN") ?? "";
  if (!configuredToken) {
    // If no token configured, allow all (e.g. local/dev usage)
    return true;
  }

  const headerToken = req.headers.get("x-import-token") ?? "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token") ?? "";

  const token = headerToken || queryToken;
  return token === configuredToken;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({
      error: "Unauthorized",
      message: "Missing or invalid NPRI import token",
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const province = (body.province ?? url.searchParams.get("province") ?? "").toString().toUpperCase() || null;
    const yearParam = body.year ?? url.searchParams.get("year");

    const year = yearParam ? parseInt(String(yearParam), 10) : NaN;

    if (!Number.isFinite(year) || year < 1990 || year > 2100) {
      return new Response(JSON.stringify({ error: "Invalid or missing year parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (province && !VALID_PROVINCES.includes(province)) {
      return new Response(JSON.stringify({ error: "Invalid province parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchParams = new URLSearchParams();
    searchParams.set("dataset", "greenhouse-gas-emissions");

    const queryParts = [`reporting_year:${year}`];
    if (province) {
      queryParts.push(`province:${province}`);
    }
    searchParams.set("q", queryParts.join(" AND "));
    searchParams.set("rows", "5000");

    const npResponse = await fetch(`${NPRI_API_BASE}?${searchParams.toString()}`);
    if (!npResponse.ok) {
      return new Response(JSON.stringify({
        error: "Failed to fetch NPRI data",
        status: npResponse.status,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const npData = await npResponse.json() as any;
    const records: any[] = Array.isArray(npData.records) ? npData.records : [];

    const facilities = records.map((record) => {
      const fields = record.fields ?? {};

      const emissions = toNumber(fields.total_ghg_emissions ?? fields.total_emissions) ?? 0;
      const facProvince = (fields.province ?? fields.province_code ?? "").toString().toUpperCase();
      const reportingYear = Number(fields.reporting_year ?? year);

      return {
        facility_name: String(fields.facility_name ?? fields.facility ?? "").trim(),
        operator: String(fields.operator ?? fields.company_name ?? "").trim(),
        province_code: facProvince || null,
        city: fields.city ?? null,
        latitude: toNumber(fields.latitude),
        longitude: toNumber(fields.longitude),
        sector: fields.sector ?? fields.naics_description ?? "oil_gas",
        emissions_tonnes: emissions,
        co2_tonnes: toNumber(fields.co2),
        ch4_tonnes: toNumber(fields.ch4_co2e),
        n2o_tonnes: toNumber(fields.n2o_co2e),
        hfc_tonnes: toNumber(fields.hfcs_co2e),
        reporting_year: reportingYear,
        emission_intensity: null,
        production_unit: null,
      };
    }).filter((f) => f.facility_name && f.operator && f.emissions_tonnes > 0);

    if (facilities.length === 0) {
      return new Response(JSON.stringify({
        imported: 0,
        year,
        province,
        message: "No facilities found for given filters",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("facility_emissions")
      .upsert(facilities, { onConflict: "facility_name,reporting_year" });

    if (error) {
      console.error("facility_emissions upsert failed", error);
      return new Response(JSON.stringify({ error: "Failed to upsert facility_emissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      imported: facilities.length,
      year,
      province,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled NPRI importer error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
