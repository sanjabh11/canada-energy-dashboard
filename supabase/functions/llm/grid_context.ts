/**
 * Grid Context Module
 * 
 * Fetches real-time grid state data for LLM context injection
 * Enables grid-aware, optimization-focused AI responses
 */

export interface GridContext {
  batteries: Array<{
    province: string;
    soc_percent: number;
    capacity_mwh: number;
    power_rating_mw: number;
    last_updated: string;
  }>;
  curtailment: Array<{
    province: string;
    curtailed_mw: number;
    reason: string;
    occurred_at: string;
    opportunity_cost_cad: number | null;
  }>;
  forecast: {
    solar_mae_percent: number | null;
    wind_mae_percent: number | null;
    confidence_score: number | null;
    calculated_at: string | null;
  } | null;
  dispatch: {
    action: string;
    power_mw: number;
    renewable_absorption: boolean;
    dispatched_at: string;
  } | null;
  pricing: {
    hoep: number | null;
    global_adjustment: number | null;
    datetime: string | null;
  } | null;
}

/**
 * Fetch real-time grid context from database
 */
export async function fetchGridContext(supabase: any): Promise<GridContext> {
  try {
    // Fetch battery state
    const { data: batteries } = await supabase
      .from('batteries_state')
      .select('province, soc_percent, capacity_mwh, power_rating_mw, last_updated')
      .order('last_updated', { ascending: false })
      .limit(4);

    // Fetch recent curtailment
    const { data: curtailment } = await supabase
      .from('curtailment_events')
      .select('province, curtailed_mw, reason, occurred_at, opportunity_cost_cad')
      .order('occurred_at', { ascending: false })
      .limit(5);

    // Fetch forecast performance
    const { data: forecast } = await supabase
      .from('forecast_performance_metrics')
      .select('solar_mae_percent, wind_mae_percent, confidence_score, calculated_at')
      .order('calculated_at', { ascending: false })
      .limit(1);

    // Fetch recent dispatch
    const { data: dispatch } = await supabase
      .from('storage_dispatch_logs')
      .select('action, power_mw, renewable_absorption, dispatched_at')
      .order('dispatched_at', { ascending: false })
      .limit(1);

    // Fetch market prices
    const { data: prices } = await supabase
      .from('ontario_prices')
      .select('hoep, global_adjustment, datetime')
      .order('datetime', { ascending: false })
      .limit(1);

    return {
      batteries: batteries || [],
      curtailment: curtailment || [],
      forecast: forecast?.[0] || null,
      dispatch: dispatch?.[0] || null,
      pricing: prices?.[0] || null,
    };
  } catch (error) {
    console.error('Error fetching grid context:', error);
    return {
      batteries: [],
      curtailment: [],
      forecast: null,
      dispatch: null,
      pricing: null,
    };
  }
}

/**
 * Format grid context as human-readable string for LLM prompts
 */
export function formatGridContext(context: GridContext): string {
  const lines: string[] = [];

  lines.push('=== REAL-TIME GRID STATE ===\n');

  // Battery Storage
  lines.push('BATTERY STORAGE:');
  if (context.batteries.length > 0) {
    context.batteries.forEach(b => {
      lines.push(`- ${b.province}: ${b.soc_percent}% SoC, ${b.capacity_mwh} MWh capacity, ${b.power_rating_mw} MW power`);
    });
  } else {
    lines.push('- No battery data available');
  }
  lines.push('');

  // Curtailment Status
  lines.push('CURTAILMENT STATUS:');
  if (context.curtailment.length > 0) {
    lines.push(`- ${context.curtailment.length} events in last 24 hours`);
    const latest = context.curtailment[0];
    lines.push(`- Latest: ${latest.curtailed_mw} MW curtailed (${latest.reason})`);
    if (latest.opportunity_cost_cad) {
      lines.push(`- Opportunity cost: $${latest.opportunity_cost_cad.toLocaleString()} CAD`);
    }
  } else {
    lines.push('- No active curtailment');
  }
  lines.push('');

  // Forecast Performance
  lines.push('FORECAST PERFORMANCE:');
  if (context.forecast) {
    lines.push(`- Solar MAE: ${context.forecast.solar_mae_percent?.toFixed(1) || 'N/A'}%`);
    lines.push(`- Wind MAE: ${context.forecast.wind_mae_percent?.toFixed(1) || 'N/A'}%`);
    lines.push(`- Confidence: ${context.forecast.confidence_score?.toFixed(0) || 'N/A'}%`);
  } else {
    lines.push('- No forecast data available');
  }
  lines.push('');

  // Last Storage Dispatch
  lines.push('LAST STORAGE DISPATCH:');
  if (context.dispatch) {
    lines.push(`- Action: ${context.dispatch.action.toUpperCase()} at ${context.dispatch.power_mw} MW`);
    lines.push(`- Renewable absorption: ${context.dispatch.renewable_absorption ? 'YES' : 'NO'}`);
    lines.push(`- Time: ${new Date(context.dispatch.dispatched_at).toLocaleString()}`);
  } else {
    lines.push('- No recent dispatch data');
  }
  lines.push('');

  // Market Pricing
  lines.push('MARKET PRICING:');
  if (context.pricing) {
    lines.push(`- Current HOEP: $${context.pricing.hoep?.toFixed(2) || 'N/A'}/MWh`);
    lines.push(`- Global Adjustment: $${context.pricing.global_adjustment?.toFixed(2) || 'N/A'}/MWh`);
    lines.push(`- Total: $${((context.pricing.hoep || 0) + (context.pricing.global_adjustment || 0)).toFixed(2)}/MWh`);
  } else {
    lines.push('- No pricing data available');
  }
  lines.push('');

  lines.push('=== END GRID STATE ===');

  return lines.join('\n');
}

/**
 * Analyze grid context for optimization opportunities
 */
export function analyzeOpportunities(context: GridContext): string[] {
  const opportunities: string[] = [];

  // Check battery discharge opportunity
  const highSocBattery = context.batteries.find(b => b.soc_percent >= 80);
  if (highSocBattery && context.pricing && context.pricing.hoep && context.pricing.hoep > 100) {
    opportunities.push(`🔋 DISCHARGE OPPORTUNITY: ${highSocBattery.province} battery at ${highSocBattery.soc_percent}% SoC + high pricing ($${context.pricing.hoep}/MWh) → Discharge for ~$7,000 revenue`);
  }

  // Check curtailment absorption
  const activeCurtailment = context.curtailment.find(c => {
    const age = Date.now() - new Date(c.occurred_at).getTime();
    return age < 3600000; // Within last hour
  });
  if (activeCurtailment) {
    opportunities.push(`⚡ CURTAILMENT ACTIVE: ${activeCurtailment.curtailed_mw} MW being wasted → Charge battery to absorb excess renewable energy`);
  }

  // Check low pricing opportunity
  if (context.pricing && context.pricing.hoep && context.pricing.hoep < 20) {
    opportunities.push(`💰 LOW PRICING: HOEP at $${context.pricing.hoep}/MWh → Excellent time for EV charging, battery charging, or flexible loads`);
  }

  // Check forecast degradation
  if (context.forecast && context.forecast.solar_mae_percent && context.forecast.solar_mae_percent > 10) {
    opportunities.push(`📊 FORECAST ALERT: Solar MAE at ${context.forecast.solar_mae_percent.toFixed(1)}% (target: <6%) → Review and retrain forecast model`);
  }

  return opportunities;
}

/**
 * Get data sources for provenance tracking
 */
export function getDataSources(context: GridContext): Array<{
  type: string;
  table: string;
  timestamp: string;
  confidence: number;
  record_count: number;
}> {
  const sources: Array<any> = [];

  if (context.batteries.length > 0) {
    sources.push({
      type: 'real-time',
      table: 'batteries_state',
      timestamp: context.batteries[0].last_updated,
      confidence: 95,
      record_count: context.batteries.length,
    });
  }

  if (context.curtailment.length > 0) {
    sources.push({
      type: 'real-time',
      table: 'curtailment_events',
      timestamp: context.curtailment[0].occurred_at,
      confidence: 90,
      record_count: context.curtailment.length,
    });
  }

  if (context.forecast) {
    sources.push({
      type: 'forecast',
      table: 'forecast_performance_metrics',
      timestamp: context.forecast.calculated_at || new Date().toISOString(),
      confidence: context.forecast.confidence_score || 85,
      record_count: 1,
    });
  }

  if (context.dispatch) {
    sources.push({
      type: 'historical',
      table: 'storage_dispatch_logs',
      timestamp: context.dispatch.dispatched_at,
      confidence: 100,
      record_count: 1,
    });
  }

  if (context.pricing) {
    sources.push({
      type: 'real-time',
      table: 'ontario_prices',
      timestamp: context.pricing.datetime || new Date().toISOString(),
      confidence: 100,
      record_count: 1,
    });
  }

  return sources;
}
