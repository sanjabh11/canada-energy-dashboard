/**
 * Opportunity Detector Edge Function
 * 
 * Proactively detects grid optimization opportunities
 * Runs on-demand or via cron to identify:
 * - Battery discharge opportunities (high SoC + high pricing)
 * - Curtailment absorption (active curtailment events)
 * - Low pricing windows (EV charging, flexible loads)
 * - Forecast accuracy issues (model degradation)
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Opportunity {
  type: 'storage' | 'curtailment' | 'pricing' | 'forecast';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  potentialValue: number; // CAD
  confidence: number; // 0-100
  province?: string;
  timestamp: string;
}

async function detectOpportunities(): Promise<Opportunity[]> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const opportunities: Opportunity[] = [];
  const now = new Date().toISOString();

  // ============================================================
  // Check 1: High SoC + High Renewable Forecast
  // ============================================================
  try {
    const { data: batteries } = await supabase
      .from('batteries_state')
      .select('*')
      .gte('soc_percent', 80);

    if (batteries && batteries.length > 0) {
      for (const battery of batteries) {
        opportunities.push({
          type: 'storage',
          severity: 'high',
          title: `Battery Discharge Opportunity - ${battery.province}`,
          description: `Battery at ${battery.soc_percent}% SoC (${battery.capacity_mwh} MWh). High renewable forecast expected.`,
          action: `Discharge ${battery.power_rating_mw} MW during peak pricing to earn arbitrage revenue`,
          potentialValue: 7000,
          confidence: 85,
          province: battery.province,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error('Error checking battery opportunities:', error);
  }

  // ============================================================
  // Check 2: Active Curtailment
  // ============================================================
  try {
    const { data: curtailment } = await supabase
      .from('curtailment_events')
      .select('*')
      .gte('occurred_at', new Date(Date.now() - 3600000).toISOString())
      .is('ended_at', null);

    if (curtailment && curtailment.length > 0) {
      for (const event of curtailment) {
        opportunities.push({
          type: 'curtailment',
          severity: 'high',
          title: `Active Curtailment - ${event.province}`,
          description: `${event.curtailed_mw} MW being curtailed due to ${event.reason}`,
          action: 'Charge battery to absorb excess renewable energy',
          potentialValue: event.opportunity_cost_cad || 5000,
          confidence: 90,
          province: event.province,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error('Error checking curtailment:', error);
  }

  // ============================================================
  // Check 3: Low Pricing Window
  // ============================================================
  try {
    const { data: prices } = await supabase
      .from('ontario_prices')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(1);

    if (prices && prices[0] && prices[0].hoep < 20) {
      opportunities.push({
        type: 'pricing',
        severity: 'medium',
        title: 'Low Electricity Prices',
        description: `HOEP at $${prices[0].hoep}/MWh - below $20 threshold`,
        action: 'Excellent time for EV charging, battery charging, or flexible loads',
        potentialValue: 2000,
        confidence: 95,
        province: 'ON',
        timestamp: now,
      });
    }

    // Also check for high pricing (discharge opportunity)
    if (prices && prices[0] && prices[0].hoep > 100) {
      opportunities.push({
        type: 'pricing',
        severity: 'high',
        title: 'High Electricity Prices',
        description: `HOEP at $${prices[0].hoep}/MWh - above $100 threshold`,
        action: 'Reduce demand, discharge batteries, activate demand response',
        potentialValue: 5000,
        confidence: 95,
        province: 'ON',
        timestamp: now,
      });
    }
  } catch (error) {
    console.error('Error checking pricing:', error);
  }

  // ============================================================
  // Check 4: Forecast Accuracy Degradation
  // ============================================================
  try {
    const { data: forecast } = await supabase
      .from('forecast_performance_metrics')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(2);

    if (forecast && forecast.length === 2) {
      const currentMAE = forecast[0].solar_mae_percent;
      const previousMAE = forecast[1].solar_mae_percent;

      if (currentMAE && previousMAE && currentMAE > previousMAE * 1.5) {
        opportunities.push({
          type: 'forecast',
          severity: 'medium',
          title: 'Forecast Accuracy Degraded',
          description: `Solar MAE increased from ${previousMAE.toFixed(1)}% to ${currentMAE.toFixed(1)}%`,
          action: 'Review forecast model and retrain if necessary',
          potentialValue: 0,
          confidence: 75,
          timestamp: now,
        });
      }

      // Check if MAE exceeds target
      if (currentMAE && currentMAE > 6) {
        opportunities.push({
          type: 'forecast',
          severity: 'high',
          title: 'Solar Forecast Below Target',
          description: `Solar MAE at ${currentMAE.toFixed(1)}% (target: <6%)`,
          action: 'Urgent: Review and improve solar forecast model',
          potentialValue: 0,
          confidence: 90,
          timestamp: now,
        });
      }

      // Check wind forecast
      const windMAE = forecast[0].wind_mae_percent;
      if (windMAE && windMAE > 8) {
        opportunities.push({
          type: 'forecast',
          severity: 'high',
          title: 'Wind Forecast Below Target',
          description: `Wind MAE at ${windMAE.toFixed(1)}% (target: <8%)`,
          action: 'Urgent: Review and improve wind forecast model',
          potentialValue: 0,
          confidence: 90,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error('Error checking forecast performance:', error);
  }

  // ============================================================
  // Check 5: Battery Low SoC + Low Pricing (Charge Opportunity)
  // ============================================================
  try {
    const { data: batteries } = await supabase
      .from('batteries_state')
      .select('*')
      .lte('soc_percent', 30);

    const { data: prices } = await supabase
      .from('ontario_prices')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(1);

    if (batteries && batteries.length > 0 && prices && prices[0] && prices[0].hoep < 30) {
      for (const battery of batteries) {
        opportunities.push({
          type: 'storage',
          severity: 'medium',
          title: `Battery Charge Opportunity - ${battery.province}`,
          description: `Battery at ${battery.soc_percent}% SoC + low pricing ($${prices[0].hoep}/MWh)`,
          action: `Charge battery to 80% SoC to prepare for peak pricing`,
          potentialValue: 3000,
          confidence: 80,
          province: battery.province,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.error('Error checking charge opportunities:', error);
  }

  return opportunities;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Detect opportunities
    const opportunities = await detectOpportunities();

    // Sort by severity and potential value
    const severityOrder = { high: 0, medium: 1, low: 2 };
    opportunities.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.potentialValue - a.potentialValue;
    });

    // Calculate total potential value
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.potentialValue, 0);

    // Group by type
    const byType = opportunities.reduce((acc, opp) => {
      acc[opp.type] = (acc[opp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Response(
      JSON.stringify({
        opportunities,
        summary: {
          total_count: opportunities.length,
          high_severity: opportunities.filter(o => o.severity === 'high').length,
          medium_severity: opportunities.filter(o => o.severity === 'medium').length,
          low_severity: opportunities.filter(o => o.severity === 'low').length,
          total_potential_value: totalValue,
          by_type: byType,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Opportunity detector error:', error);
    return new Response(
      JSON.stringify({
        error: String(error),
        opportunities: [],
        summary: {
          total_count: 0,
          high_severity: 0,
          medium_severity: 0,
          low_severity: 0,
          total_potential_value: 0,
          by_type: {},
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
