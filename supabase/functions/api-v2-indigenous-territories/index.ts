import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type GeometryPoint = {
  type: string;
  coordinates?: [number, number];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
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

  try {
    const { data, error } = await supabase
      .from("indigenous_territories")
      .select(`id, name, province, community, consultation_status, fpic_status, governance_status, traditional_territory, updated_at, centroid`)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const territories = (data ?? []).map((row) => {
      const centroid = row.centroid as GeometryPoint | null;
      const coordinates = Array.isArray(centroid?.coordinates) ? centroid?.coordinates : [null, null];
      const [longitude, latitude] = coordinates;

      return {
        id: row.id,
        name: row.name,
        province: row.province,
        community: row.community,
        consultation_status: row.consultation_status,
        fpic_status: row.fpic_status,
        governance_status: row.governance_status,
        traditional_territory: row.traditional_territory,
        updated_at: row.updated_at,
        latitude,
        longitude,
      };
    });

    return new Response(JSON.stringify({ territories }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to load indigenous territories", err);
    return new Response(JSON.stringify({ error: "Failed to load indigenous territories" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
