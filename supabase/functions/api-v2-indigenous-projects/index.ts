import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
    const { data: projects, error } = await supabase
      .from("indigenous_projects_v2")
      .select("id, territory_id, name, community, energy_type, stage, consultation_status, fpic_status, governance_status, revenue_share_percent, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const projectList = projects ?? [];
    const projectIds = projectList.map((p: any) => p.id).filter(Boolean);

    let consentByProject: Record<string, { consent_type: string | null }> = {};

    if (projectIds.length > 0) {
      const { data: consents, error: consentError } = await supabase
        .from("indigenous_project_consent")
        .select("project_id, consent_type")
       .in("project_id", projectIds);

      if (!consentError && Array.isArray(consents)) {
        consentByProject = consents.reduce((acc: Record<string, { consent_type: string | null }>, row: any) => {
          if (row && row.project_id) {
            acc[row.project_id as string] = { consent_type: row.consent_type ?? null };
          }
          return acc;
        }, {});
      }
    }

    const filtered = projectList
      .filter((p: any) => {
        const consent = consentByProject[p.id as string];
        if (!consent || !consent.consent_type) {
          // No explicit consent record yet: treat as public for current seed data
          return true;
        }
        if (consent.consent_type === "private") {
          return false;
        }
        // "public" or "aggregated" are currently both exposed; future work can
        // implement aggregated views if needed.
        return true;
      })
      .map((p: any) => {
        const consent = consentByProject[p.id as string];
        return {
          ...p,
          consent_type: consent?.consent_type ?? "public",
        };
      });

    return new Response(JSON.stringify({ projects: filtered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to load indigenous projects", err);
    return new Response(JSON.stringify({ error: "Failed to load indigenous projects" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
