/**
 * Storage Dispatch Scheduler
 * 
 * Runs periodic dispatch ticks (every 30 min) to:
 * - Evaluate grid conditions
 * - Make charge/discharge decisions
 * - Log actions to storage_dispatch_log
 * - Update battery SoC
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatteryState {
  id: string;
  province: string;
  soc_percent: number;
  soc_mwh: number;
  capacity_mwh: number;
  power_rating_mw: number;
}

interface GridSnapshot {
  indicativePrice: number;
  curtailmentRisk: boolean;
  renewableGeneration: number;
  demand: number;
}

interface DispatchDecision {
  action: 'charge' | 'discharge' | 'hold';
  mw: number;
  reason: string;
}

/**
 * Get current battery state
 */
async function getBatteryState(supabase: any, province: string): Promise<BatteryState | null> {
  const { data, error } = await supabase
    .from('batteries_state')
    .select('*')
    .eq('province', province)
    .order('last_updated', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching battery state:', error);
    return null;
  }

  return data;
}

/**
 * Get grid snapshot for decision making
 */
async function getGridSnapshot(supabase: any, province: string): Promise<GridSnapshot> {
  // Get latest price (from ontario_prices or alberta equivalent)
  const { data: priceData } = await supabase
    .from('ontario_prices')
    .select('hoep')
    .order('datetime_et', { ascending: false })
    .limit(1)
    .single();

  // Get renewable generation
  const { data: genData } = await supabase
    .from('provincial_generation')
    .select('value_mwh, source_type')
    .eq('province', province)
    .in('source_type', ['SOLAR', 'WIND', 'HYDRO'])
    .order('period_start', { ascending: false })
    .limit(10);

  const renewableGen = genData?.reduce((sum, g) => sum + (g.value_mwh || 0), 0) || 0;
  const indicativePrice = priceData?.hoep || 50; // fallback to $50/MWh

  // Curtailment risk if price < $10 or renewable > threshold
  const curtailmentRisk = indicativePrice < 10 || renewableGen > 5000;

  return {
    indicativePrice,
    curtailmentRisk,
    renewableGeneration: renewableGen,
    demand: 15000 // placeholder
  };
}

function decideDispatch(batt: any, price: number, curtail: boolean) {
  const cheap = price < 25, expensive = price > 90;
  if ((curtail || cheap) && batt.socPct < 95) {
    return { action: 'charge', mw: Math.min(batt.maxChargeMW, Math.max(batt.capacityMWh * (100 - batt.socPct) / 100, 0)), reason: 'Absorb surplus / cheap period' };
  }
  if (expensive && batt.socPct > 10) {
    return { action: 'discharge', mw: Math.min(batt.maxDischargeMW, Math.max(batt.capacityMWh * batt.socPct / 100 * batt.efficiency, 0)), reason: 'Peak shaving / high price' };
  }
  return { action: 'hold', mw: 0, reason: 'Neutral conditions' };
}
function estimateRevenue(decision: any, grid: any) {
  const p = Number(grid.price_cad_mwh ?? 0);
  if (decision.action === 'discharge') return Math.max(0, decision.mw * p * 0.5); // simple proxy
  if (decision.action === 'charge') return Math.max(0, decision.mw * Math.max(0, 20 - p) * 0.25);
  return 0;
}

/**
 * Run dispatch tick - main scheduler function
 */
export async function runDispatchTick(supabase: any, province: string) {
  const batt = await getBatteryState(supabase, province);
  if (!batt) {
    console.error(`No battery state found for ${province}`);
    return { error: 'Battery state not found' };
  }

  const grid = await getGridSnapshot(supabase, province);
  const curtailmentRisk = (grid as any).curtailment_risk || false;
  const decision = decideDispatch(batt, (grid as any).price_cad_mwh || 50, curtailmentRisk);

  // Calculate new SoC
  let socDelta = 0;
  if (decision.action === 'charge') {
    socDelta = (decision.mw * 0.5) / batt.capacity_mwh * 100; // 30min charge
  } else if (decision.action === 'discharge') {
    socDelta = -(decision.mw * 0.5) / batt.capacity_mwh * 100;
  }

  const socAfter = Math.min(95, Math.max(5, batt.soc_percent + socDelta));

  // Log dispatch action
  const { error: logError } = await supabase
    .from('storage_dispatch_log')
    .insert({
      battery_id: batt.id,
      decision_timestamp: new Date().toISOString(),
      action: decision.action,
      magnitude_mw: decision.mw,
      soc_before_pct: batt.soc_percent,
      soc_after_pct: socAfter,
      renewable_absorption: grid.curtailmentRisk && decision.action === 'charge',
      expected_revenue_cad: estimateRevenue(decision, grid),
      reasoning: decision.reason,
      grid_price_cad_per_mwh: grid.indicativePrice,
      curtailment_risk_detected: grid.curtailmentRisk
    });

  if (logError) {
    console.error('Error logging dispatch:', logError);
    return { error: 'Failed to log dispatch' };
  }

  // Update battery state
  const { error: updateError } = await supabase
    .from('batteries_state')
    .update({
      soc_percent: socAfter,
      soc_mwh: (socAfter / 100) * batt.capacity_mwh,
      last_updated: new Date().toISOString()
    })
    .eq('id', batt.id);

  if (updateError) {
    console.error('Error updating battery state:', updateError);
    return { error: 'Failed to update battery state' };
  }

  return {
    success: true,
    province,
    action: decision.action,
    mw: decision.mw,
    soc_before: batt.soc_percent,
    soc_after: socAfter,
    reason: decision.reason,
    revenue: estimateRevenue(decision, grid)
  };
}

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const provinces = ['ON','AB','BC','SK'];
  for (const p of provinces) {
    const battRes = await fetch(`${supabaseUrl}/rest/v1/batteries?select=*&province=eq.${p}`, { headers });
    const battery = (await battRes.json())[0];
    if (!battery) continue;

    const stateRes = await fetch(`${supabaseUrl}/rest/v1/batteries_state?select=*&battery_id=eq.${battery.id}`, { headers });
    const state = (await stateRes.json())[0];
    const gridRes = await fetch(`${supabaseUrl}/rest/v1/grid_snapshots?select=*&province=eq.${p}&order=observed_at.desc&limit=1`, { headers });
    const grid = (await gridRes.json())[0] ?? {};
    const decision = decideDispatch(
      { socPct: state?.soc_pct ?? 50, capacityMWh: Number(battery.capacity_mwh), maxChargeMW: Number(battery.max_charge_mw), maxDischargeMW: Number(battery.max_discharge_mw), efficiency: Number(battery.round_trip_efficiency) },
      Number(grid.price_cad_mwh ?? 0),
      Boolean(grid.curtailment_risk)
    );

    const socAfter = Math.min(95, Math.max(5, (state?.soc_pct ?? 50) + (decision.action === 'charge' ? +2 : decision.action === 'discharge' ? -2 : 0)));
    await fetch(`${supabaseUrl}/rest/v1/storage_dispatch_log`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        battery_id: battery.id,
        decision_timestamp: new Date().toISOString(),
        action: decision.action,
        magnitude_mw: decision.mw,
        duration_minutes: 30,
        soc_before_pct: state?.soc_pct ?? 50,
        soc_after_pct: socAfter,
        renewable_absorption: grid.curtailment_risk && decision.action === 'charge',
        expected_revenue_cad: estimateRevenue(decision, grid),
        grid_service: decision.action === 'charge' ? 'renewable_absorption' : decision.action === 'discharge' ? 'arbitrage' : 'peak_shaving',
        reasoning: decision.reason
      })
    });
    await fetch(`${supabaseUrl}/rest/v1/batteries_state?battery_id=eq.${battery.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ soc_pct: socAfter, updated_at: new Date().toISOString() })
    });
  }
  return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
});
