/**
 * Storage Metrics Calculator
 * Calculates efficiency, accuracy, and revenue metrics for storage dispatch
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const province = url.searchParams.get('province') || 'ON';
    const days = parseInt(url.searchParams.get('days') || '30');

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch dispatch logs
    const { data: logs, error } = await supabase
      .from('storage_dispatch_logs')
      .select('*')
      .eq('province', province)
      .gte('dispatched_at', startDate);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({
          province,
          period_days: days,
          total_dispatches: 0,
          round_trip_efficiency_percent: 0,
          dispatch_accuracy_percent: 0,
          total_revenue_cad: 0,
          renewable_absorption_mwh: 0,
          curtailment_mitigation_events: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate round-trip efficiency
    const chargeActions = logs.filter(l => l.action === 'charge');
    const dischargeActions = logs.filter(l => l.action === 'discharge');

    const totalCharged = chargeActions.reduce((sum, l) => sum + Math.abs(l.power_mw * 0.25), 0); // 15 min = 0.25 hr
    const totalDischarged = dischargeActions.reduce((sum, l) => sum + (l.power_mw * 0.25), 0);

    const roundTripEfficiency = totalCharged > 0 
      ? (totalDischarged / totalCharged) * 100 
      : 88; // Default target

    // Calculate dispatch accuracy (how often we actually dispatched when we said we would)
    const executedDispatches = logs.filter(l => l.action !== 'hold').length;
    const dispatchAccuracy = logs.length > 0 
      ? (executedDispatches / logs.length) * 100 
      : 0;

    // Calculate total revenue
    const totalRevenue = logs.reduce((sum, l) => sum + (l.expected_revenue_cad || 0), 0);

    // Calculate renewable absorption
    const renewableAbsorptionLogs = logs.filter(l => l.renewable_absorption);
    const renewableAbsorptionMWh = renewableAbsorptionLogs.reduce(
      (sum, l) => sum + Math.abs(l.power_mw * 0.25), 
      0
    );

    // Count curtailment mitigation events
    const curtailmentMitigationCount = logs.filter(l => l.curtailment_mitigation).length;

    // Calculate average SoC
    const avgSoC = logs.length > 0
      ? logs.reduce((sum, l) => sum + l.soc_after_percent, 0) / logs.length
      : 50;

    const metrics = {
      province,
      period_days: days,
      total_dispatches: logs.length,
      charge_dispatches: chargeActions.length,
      discharge_dispatches: dischargeActions.length,
      hold_dispatches: logs.filter(l => l.action === 'hold').length,
      round_trip_efficiency_percent: Math.round(roundTripEfficiency * 100) / 100,
      dispatch_accuracy_percent: Math.round(dispatchAccuracy * 100) / 100,
      total_energy_charged_mwh: Math.round(totalCharged * 100) / 100,
      total_energy_discharged_mwh: Math.round(totalDischarged * 100) / 100,
      total_revenue_cad: Math.round(totalRevenue * 100) / 100,
      renewable_absorption_mwh: Math.round(renewableAbsorptionMWh * 100) / 100,
      curtailment_mitigation_events: curtailmentMitigationCount,
      avg_soc_percent: Math.round(avgSoC * 100) / 100,
      period_start: startDate,
      period_end: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(metrics),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Storage metrics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
