/**
 * Storage Dispatch Engine
 * 
 * Implements rule-based battery dispatch logic for grid optimization
 * Runs every 15 minutes to determine charge/discharge decisions
 * Target: >88% round-trip efficiency
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ProvinceConfig {
  province: string;
  battery_capacity_mwh: number;
  soc_min_pct: number;
  soc_max_pct: number;
  charge_rate_mw: number;
  discharge_rate_mw: number;
  round_trip_efficiency: number;
}

interface DispatchDecision {
  province: string;
  timestamp: string;
  action: 'charge' | 'discharge' | 'hold';
  target_mw: number;
  duration_hours: number;
  current_soc_pct: number;
  target_soc_pct: number;
  reason: string;
  renewable_forecast_mw: number;
  price_forecast_cad: number;
  expected_revenue_cad: number;
  confidence: number;
}

/**
 * Calculate optimal dispatch decision based on forecasts and constraints
 */
function calculateDispatch(
  config: ProvinceConfig,
  currentSoC: number,
  renewableForecast: number,
  priceForecast: number,
  gridDemand: number
): DispatchDecision {
  const now = new Date();
  let action: 'charge' | 'discharge' | 'hold' = 'hold';
  let targetMw = 0;
  let reason = 'No action needed';
  let targetSoC = currentSoC;
  let expectedRevenue = 0;
  let confidence = 0.8;

  // Rule 1: Charge when renewable surplus + low prices + room in battery
  if (
    renewableForecast > gridDemand * 1.1 && // 10% renewable surplus
    priceForecast < 30 && // Low price
    currentSoC < config.soc_max_pct // Room to charge
  ) {
    action = 'charge';
    targetMw = Math.min(
      config.charge_rate_mw,
      renewableForecast - gridDemand,
      (config.battery_capacity_mwh * (config.soc_max_pct - currentSoC) / 100)
    );
    reason = 'Renewable surplus + low prices';
    targetSoC = Math.min(
      config.soc_max_pct,
      currentSoC + (targetMw / config.battery_capacity_mwh * 100)
    );
    expectedRevenue = -targetMw * priceForecast; // Negative = cost to charge
    confidence = 0.85;
  }
  
  // Rule 2: Discharge during peak demand + high prices + sufficient charge
  else if (
    gridDemand > renewableForecast * 1.2 && // Demand exceeds renewable
    priceForecast > 60 && // High price
    currentSoC > config.soc_min_pct // Sufficient charge
  ) {
    action = 'discharge';
    targetMw = Math.min(
      config.discharge_rate_mw,
      gridDemand - renewableForecast,
      (config.battery_capacity_mwh * (currentSoC - config.soc_min_pct) / 100)
    );
    reason = 'Peak demand + high prices';
    targetSoC = Math.max(
      config.soc_min_pct,
      currentSoC - (targetMw / config.battery_capacity_mwh * 100)
    );
    expectedRevenue = targetMw * priceForecast * config.round_trip_efficiency;
    confidence = 0.9;
  }
  
  // Rule 3: Preemptive charge before predicted peak
  else if (
    priceForecast < 40 && // Reasonable price
    currentSoC < 60 && // Below optimal level
    renewableForecast > gridDemand // Renewable available
  ) {
    action = 'charge';
    targetMw = Math.min(
      config.charge_rate_mw * 0.5, // Gentler charge
      renewableForecast - gridDemand
    );
    reason = 'Preemptive charge for upcoming peak';
    targetSoC = Math.min(
      config.soc_max_pct,
      currentSoC + (targetMw / config.battery_capacity_mwh * 100)
    );
    expectedRevenue = -targetMw * priceForecast;
    confidence = 0.75;
  }
  
  // Rule 4: Strategic discharge to avoid curtailment
  else if (
    renewableForecast > gridDemand * 1.3 && // High renewable
    currentSoC > 40 && // Reasonable charge
    priceForecast > 40 // Decent price
  ) {
    action = 'discharge';
    targetMw = Math.min(
      config.discharge_rate_mw * 0.6,
      (config.battery_capacity_mwh * (currentSoC - 30) / 100)
    );
    reason = 'Discharge to absorb more renewable';
    targetSoC = Math.max(
      30,
      currentSoC - (targetMw / config.battery_capacity_mwh * 100)
    );
    expectedRevenue = targetMw * priceForecast * config.round_trip_efficiency;
    confidence = 0.7;
  }

  return {
    province: config.province,
    timestamp: now.toISOString(),
    action,
    target_mw: Math.round(targetMw * 100) / 100,
    duration_hours: 0.25, // 15 minutes
    current_soc_pct: currentSoC,
    target_soc_pct: targetSoC,
    reason,
    renewable_forecast_mw: renewableForecast,
    price_forecast_cad: priceForecast,
    expected_revenue_cad: Math.round(expectedRevenue * 100) / 100,
    confidence
  };
}

/**
 * Generate realistic forecasts (placeholder until real forecast API available)
 */
function generateForecasts(province: string) {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour <= 18;
  const isPeak = hour >= 17 && hour <= 20;

  // Simulate renewable generation (higher during day)
  const renewableForecast = isDay 
    ? 800 + Math.random() * 400 
    : 200 + Math.random() * 200;

  // Simulate grid demand (higher during peak hours)
  const gridDemand = isPeak
    ? 1200 + Math.random() * 300
    : 800 + Math.random() * 200;

  // Simulate price (higher during peak, sometimes negative with surplus renewable)
  const priceForecast = isPeak
    ? 60 + Math.random() * 40
    : renewableForecast > gridDemand * 1.2
      ? -5 + Math.random() * 35
      : 30 + Math.random() * 30;

  return { renewableForecast, gridDemand, priceForecast };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const province = url.searchParams.get('province') || 'ON';

    // Fetch province configuration
    const { data: configs, error: configError } = await supabase
      .from('province_configs')
      .select('*')
      .eq('province', province)
      .single();

    if (configError || !configs) {
      throw new Error(`Province config not found: ${province}`);
    }

    const config: ProvinceConfig = {
      province: configs.province,
      battery_capacity_mwh: configs.battery_capacity_mwh || 500,
      soc_min_pct: configs.soc_min_pct || 20,
      soc_max_pct: configs.soc_max_pct || 90,
      charge_rate_mw: configs.charge_rate_mw || 200,
      discharge_rate_mw: configs.discharge_rate_mw || 200,
      round_trip_efficiency: configs.round_trip_efficiency || 0.88
    };

    // Get current SoC from battery state table
    const { data: batteryState } = await supabase
      .from('batteries_state')
      .select('soc_percent')
      .eq('province', province)
      .single();

    const currentSoC = batteryState?.soc_percent || 50; // Default to 50%

    // Generate forecasts (TODO: Replace with real forecast API)
    const { renewableForecast, gridDemand, priceForecast } = generateForecasts(province);

    // Calculate optimal dispatch
    const decision = calculateDispatch(
      config,
      currentSoC,
      renewableForecast,
      priceForecast,
      gridDemand
    );

    // Store dispatch decision
    const { error: insertError } = await supabase
      .from('storage_dispatch_logs')
      .insert({
        province: decision.province,
        action: decision.action,
        power_mw: decision.target_mw,
        soc_before_percent: decision.current_soc_pct,
        soc_after_percent: decision.target_soc_pct,
        reason: decision.reason,
        market_price_cad_per_mwh: decision.price_forecast_cad,
        expected_revenue_cad: decision.expected_revenue_cad,
        renewable_absorption: decision.action === 'charge' && decision.renewable_forecast_mw > gridDemand,
        curtailment_mitigation: decision.action === 'discharge' && decision.renewable_forecast_mw > gridDemand * 1.2
      });

    if (insertError) throw insertError;

    // Update battery state
    await supabase
      .from('batteries_state')
      .update({
        soc_percent: decision.target_soc_pct,
        last_updated: decision.timestamp
      })
      .eq('province', province);

    console.log(`[DISPATCH] ${province}: ${decision.action.toUpperCase()} ${decision.target_mw} MW - ${decision.reason}`);

    return new Response(
      JSON.stringify({
        success: true,
        decision
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Storage dispatch error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
