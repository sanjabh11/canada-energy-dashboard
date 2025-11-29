import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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
    const { data: projects, error: projectsError } = await supabase
      .from("indigenous_projects_v2")
      .select("id, energy_type, stage, consultation_status, fpic_status, governance_status, revenue_share_percent");

    if (projectsError) {
      throw projectsError;
    }

    const list = projects ?? [];

    const totalProjects = list.length;

    const byStage: Record<string, number> = {};
    const byEnergyType: Record<string, number> = {};
    const byConsultationStatus: Record<string, number> = {};
    const byFPICStatus: Record<string, number> = {};

    let totalRevenueSharePercent = 0;

    for (const p of list as any[]) {
      const stage = p.stage || 'unknown';
      const energyType = p.energy_type || 'unknown';
      const consultation = p.consultation_status || 'unknown';
      const fpic = p.fpic_status || 'unknown';

      byStage[stage] = (byStage[stage] ?? 0) + 1;
      byEnergyType[energyType] = (byEnergyType[energyType] ?? 0) + 1;
      byConsultationStatus[consultation] = (byConsultationStatus[consultation] ?? 0) + 1;
      byFPICStatus[fpic] = (byFPICStatus[fpic] ?? 0) + 1;

      if (typeof p.revenue_share_percent === 'number') {
        totalRevenueSharePercent += p.revenue_share_percent;
      }
    }

    const payload = {
      summary: {
        total_projects: totalProjects,
        by_stage: byStage,
        by_energy_type: byEnergyType,
        by_consultation_status: byConsultationStatus,
        by_fpic_status: byFPICStatus,
        total_revenue_share_percent: totalRevenueSharePercent,
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to compute Indigenous reporting metrics", err);
    return new Response(JSON.stringify({ error: "Failed to compute Indigenous reporting metrics" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
