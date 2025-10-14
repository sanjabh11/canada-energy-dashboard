/**
 * Storage Dispatch Engine - Phase 5 Minimal Implementation
 * 
 * Rule-based battery dispatch tied to curtailment events and price signals.
 * Tracks State of Charge (SoC) and logs decisions for award evidence.
 * 
 * Endpoints:
 * - POST /dispatch - Run dispatch decision for current conditions
 * - GET /status - Get current battery status
 * - GET /logs - Get dispatch history
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DispatchRequest {
  province: string;
  currentPrice?: number;
  renewableGeneration?: number;
  demand?: number;
  curtailmentRisk?: boolean;
}

interface BatteryState {
  province: string;
  soc_percent: number;
  soc_mwh: number;
  capacity_mwh: number;
  power_rating_mw: number;
  last_updated: string;
}

interface DispatchDecision {
  action: 'charge' | 'discharge' | 'hold';
  power_mw: number;
  duration_hours: number;
  reason: string;
  expected_revenue_cad?: number;
  renewable_absorption?: boolean;
  curtailment_mitigation?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /status - Current battery status
    if (req.method === 'GET' && path === 'status') {
      const province = url.searchParams.get('province') || 'ON';
      
      const { data: battery, error } = await supabase
        .from('batteries_state')
        .select('*')
        .eq('province', province)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Calculate alignment metrics for test suite
      const { data: logs } = await supabase
        .from('storage_dispatch_logs')
        .select('*')
        .eq('province', province)
        .order('dispatched_at', { ascending: false })
        .limit(100);

      const totalActions = logs?.length || 0;
      const renewableAbsorptionCount = logs?.filter(l => l.renewable_absorption).length || 0;
      const alignmentPct = totalActions > 0 ? (renewableAbsorptionCount / totalActions) * 100 : 0;
      
      const now = new Date();
      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: rev24h } = await supabase
        .from('storage_dispatch_logs')
        .select('expected_revenue_cad, actual_revenue_cad, dispatched_at')
        .eq('province', province)
        .gte('dispatched_at', since24h);

      const { data: rev7d } = await supabase
        .from('storage_dispatch_logs')
        .select('expected_revenue_cad, actual_revenue_cad, dispatched_at')
        .eq('province', province)
        .gte('dispatched_at', since7d);

      const expectedRevenue24h = (rev24h || []).reduce((sum, r: any) => sum + Number(r.actual_revenue_cad ?? r.expected_revenue_cad ?? 0), 0);
      const expectedRevenue7d = (rev7d || []).reduce((sum, r: any) => sum + Number(r.actual_revenue_cad ?? r.expected_revenue_cad ?? 0), 0);

      const currentBattery = battery || await initializeBattery(supabase, province);
      const socBoundsOk = currentBattery.soc_percent >= 5 && currentBattery.soc_percent <= 95;

      return new Response(JSON.stringify({ 
        battery: currentBattery,
        alignment_pct_renewable_absorption: alignmentPct,
        soc_bounds_ok: socBoundsOk,
        actions_count: totalActions,
        expected_revenue_24h: expectedRevenue24h,
        expected_revenue_7d: expectedRevenue7d,
        provenance: (rev7d && rev7d.length > 0) ? 'storage_dispatch_logs' : 'batteries_state',
        last_updated: currentBattery?.last_updated || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /logs - Dispatch history
    if (req.method === 'GET' && path === 'logs') {
      const province = url.searchParams.get('province') || 'ON';
      const limit = parseInt(url.searchParams.get('limit') || '50');

      const { data: logs, error } = await supabase
        .from('storage_dispatch_logs')
        .select('*')
        .eq('province', province)
        .order('dispatched_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Calculate aggregate metrics
      const totalCycles = logs?.length || 0;
      const chargeEvents = logs?.filter(l => l.action === 'charge').length || 0;
      const dischargeEvents = logs?.filter(l => l.action === 'discharge').length || 0;
      const renewableAbsorption = logs?.filter(l => l.renewable_absorption).length || 0;
      const totalRevenue = logs?.reduce((sum, l) => sum + (l.actual_revenue_cad || l.expected_revenue_cad || 0), 0) || 0;

      return new Response(JSON.stringify({
        logs: logs || [],
        summary: {
          total_cycles: totalCycles,
          charge_events: chargeEvents,
          discharge_events: dischargeEvents,
          renewable_absorption_events: renewableAbsorption,
          total_revenue_cad: totalRevenue,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /dispatch - Run dispatch decision
    if (req.method === 'POST' && path === 'dispatch') {
      const body: DispatchRequest = await req.json();
      const { province, currentPrice, renewableGeneration, demand, curtailmentRisk } = body;

      // Get current battery state
      let battery = await getCurrentBatteryState(supabase, province);
      if (!battery) {
        battery = await initializeBattery(supabase, province);
      }

      // Make dispatch decision
      const decision = makeDispatchDecision(
        battery,
        currentPrice,
        curtailmentRisk,
        renewableGeneration,
        demand
      );

      // Execute decision and update SoC
      const updatedBattery = await executeDispatch(
        supabase,
        battery,
        decision
      );

      return new Response(JSON.stringify({
        decision,
        battery_before: battery,
        battery_after: updatedBattery,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Storage dispatch error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Get current battery state from database
 */
async function getCurrentBatteryState(supabase: any, province: string): Promise<BatteryState | null> {
  const { data, error } = await supabase
    .from('batteries_state')
    .select('*')
    .eq('province', province)
    .order('last_updated', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Initialize battery for province
 */
async function initializeBattery(supabase: any, province: string): Promise<BatteryState> {
  // Default configs per province (from provinceConfig.ts)
  const configs: Record<string, { capacity: number; power: number }> = {
    ON: { capacity: 250, power: 100 },
    AB: { capacity: 120, power: 60 },
    BC: { capacity: 80, power: 40 },
    QC: { capacity: 60, power: 30 },
  };

  const config = configs[province] || { capacity: 100, power: 50 };
  const initialSoc = 50; // Start at 50%

  const battery: BatteryState = {
    province,
    soc_percent: initialSoc,
    soc_mwh: (config.capacity * initialSoc) / 100,
    capacity_mwh: config.capacity,
    power_rating_mw: config.power,
    last_updated: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('batteries_state')
    .insert([battery])
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Make dispatch decision based on rule-based policy
 * 
 * Rules:
 * 1. Charge when curtailment risk OR price < $25/MWh
 * 2. Discharge when price > $90/MWh
 * 3. Hold otherwise
 * 4. Respect SoC limits (10-90%)
 */
function makeDispatchDecision(
  battery: BatteryState,
  price: number = 50,
  curtailmentRisk: boolean = false,
  renewableGen?: number,
  demand?: number
): DispatchDecision {
  const { soc_percent, power_rating_mw, capacity_mwh } = battery;

  // Decision thresholds
  const CHARGE_PRICE_THRESHOLD = 25;
  const DISCHARGE_PRICE_THRESHOLD = 90;
  const MIN_SOC = 10;
  const MAX_SOC = 90;

  // Rule 1: Charge during curtailment or cheap prices
  if ((curtailmentRisk || price < CHARGE_PRICE_THRESHOLD) && soc_percent < MAX_SOC) {
    const availableCapacity = ((MAX_SOC - soc_percent) / 100) * capacity_mwh;
    const chargePower = Math.min(power_rating_mw, availableCapacity);
    
    return {
      action: 'charge',
      power_mw: chargePower,
      duration_hours: 1,
      reason: curtailmentRisk 
        ? `Curtailment risk detected - absorb surplus renewable energy`
        : `Low price ($${price.toFixed(2)}/MWh) - opportunistic charging`,
      expected_revenue_cad: chargePower * (DISCHARGE_PRICE_THRESHOLD - price),
      renewable_absorption: curtailmentRisk,
      curtailment_mitigation: curtailmentRisk,
    };
  }

  // Rule 2: Discharge during high prices
  if (price > DISCHARGE_PRICE_THRESHOLD && soc_percent > MIN_SOC) {
    const availableEnergy = ((soc_percent - MIN_SOC) / 100) * capacity_mwh;
    const dischargePower = Math.min(power_rating_mw, availableEnergy);
    
    return {
      action: 'discharge',
      power_mw: dischargePower,
      duration_hours: 1,
      reason: `High price ($${price.toFixed(2)}/MWh) - arbitrage opportunity`,
      expected_revenue_cad: dischargePower * price,
      renewable_absorption: false,
      curtailment_mitigation: false,
    };
  }

  // Rule 3: Hold
  return {
    action: 'hold',
    power_mw: 0,
    duration_hours: 1,
    reason: `Price ($${price.toFixed(2)}/MWh) within neutral range - holding`,
    expected_revenue_cad: 0,
    renewable_absorption: false,
    curtailment_mitigation: false,
  };
}

/**
 * Execute dispatch decision and update battery state
 */
async function executeDispatch(
  supabase: any,
  battery: BatteryState,
  decision: DispatchDecision
): Promise<BatteryState> {
  const ROUND_TRIP_EFFICIENCY = 0.88;
  
  let newSocMwh = battery.soc_mwh;

  if (decision.action === 'charge') {
    newSocMwh += decision.power_mw * decision.duration_hours * ROUND_TRIP_EFFICIENCY;
  } else if (decision.action === 'discharge') {
    newSocMwh -= decision.power_mw * decision.duration_hours;
  }

  // Clamp to capacity limits
  newSocMwh = Math.max(0, Math.min(battery.capacity_mwh, newSocMwh));
  let newSocPercent = (newSocMwh / battery.capacity_mwh) * 100;
  if (newSocPercent < 5) newSocPercent = 5;
  if (newSocPercent > 95) newSocPercent = 95;

  const updatedBattery: BatteryState = {
    ...battery,
    soc_percent: newSocPercent,
    soc_mwh: newSocMwh,
    last_updated: new Date().toISOString(),
  };

  // Update state in database
  const { data: stateData, error: stateError } = await supabase
    .from('batteries_state')
    .upsert([updatedBattery], { onConflict: 'province' })
    .select()
    .single();

  if (stateError) throw stateError;

  // Log dispatch action
  const log = {
    province: battery.province,
    action: decision.action,
    power_mw: decision.power_mw,
    duration_hours: decision.duration_hours,
    soc_before_percent: battery.soc_percent,
    soc_after_percent: newSocPercent,
    soc_before_mwh: battery.soc_mwh,
    soc_after_mwh: newSocMwh,
    reason: decision.reason,
    expected_revenue_cad: decision.expected_revenue_cad || 0,
    renewable_absorption: decision.renewable_absorption || false,
    curtailment_mitigation: decision.curtailment_mitigation || false,
    dispatched_at: new Date().toISOString(),
  };

  const { error: logError } = await supabase
    .from('storage_dispatch_logs')
    .insert([log]);

  if (logError) {
    console.error('Failed to log dispatch:', logError);
  }

  return stateData;
}
