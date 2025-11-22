/**
 * Curtailment Detection and Reduction Engine
 * 
 * Phase 2: AI for Renewable Energy Award
 * Detects curtailment events, generates AI recommendations,
 * and tracks effectiveness
 */

import { supabase } from './supabaseClient';
import type {
  CurtailmentEvent,
  CurtailmentReductionRecommendation,
  RenewableForecast,
  WeatherObservation
} from './types/renewableForecast';

/**
 * Curtailment detection options
 */
export interface DetectCurtailmentOptions {
  province: string;
  sourceType: 'solar' | 'wind' | 'hydro' | 'mixed';
  currentGeneration?: number;
  forecastGeneration?: number;
  gridDemand?: number;
  marketPrice?: number;
  transmissionCapacity?: number;
}

/**
 * Curtailment reason classification
 */
export type CurtailmentReason =
  | 'transmission_congestion'
  | 'oversupply'
  | 'negative_pricing'
  | 'frequency_regulation'
  | 'voltage_constraint'
  | 'other';

/**
 * Mitigation action types
 */
export interface MitigationAction {
  action: 'dr_activation' | 'storage_charge' | 'export' | 'load_shift' | 'market_bid';
  mw_potential: number;
  cost_cad?: number;
  implementation_time_mins: number;
  effectiveness_score: number; // 0-1
  details: string;
}

/**
 * Detect curtailment event based on real-time grid conditions
 */
export async function detectCurtailmentEvent(
  options: DetectCurtailmentOptions
): Promise<CurtailmentEvent | null> {
  const {
    province,
    sourceType,
    currentGeneration = 0,
    forecastGeneration = 0,
    gridDemand = 0,
    marketPrice = 0,
    transmissionCapacity = Infinity
  } = options;

  // Calculate curtailment
  const availableCapacity = forecastGeneration || currentGeneration;
  const curtailedMw = Math.max(0, currentGeneration - forecastGeneration);
  
  // Only proceed if significant curtailment detected (>5 MW)
  if (curtailedMw < 5) {
    return null;
  }

  const curtailmentPercent = (curtailedMw / availableCapacity) * 100;

  // Classify curtailment reason
  let reason: CurtailmentReason = 'other';
  let reasonDetail = '';

  if (currentGeneration > transmissionCapacity) {
    reason = 'transmission_congestion';
    reasonDetail = `Generation ${currentGeneration.toFixed(1)} MW exceeds transmission capacity ${transmissionCapacity.toFixed(1)} MW`;
  } else if (currentGeneration > gridDemand * 1.15) {
    reason = 'oversupply';
    reasonDetail = `Generation ${currentGeneration.toFixed(1)} MW exceeds demand ${gridDemand.toFixed(1)} MW by >15%`;
  } else if (marketPrice < 0) {
    reason = 'negative_pricing';
    reasonDetail = `Market price ${marketPrice.toFixed(2)} CAD/MWh is negative`;
  } else if (curtailmentPercent > 20) {
    reason = 'frequency_regulation';
    reasonDetail = `High curtailment rate ${curtailmentPercent.toFixed(1)}% suggests frequency control`;
  }

  // Calculate opportunity cost
  const assumedPrice = marketPrice > 0 ? marketPrice : 50; // Default $50/MWh if unknown
  const opportunityCostCad = curtailedMw * assumedPrice;

  // Estimate duration (default 1 hour, can be updated later)
  const durationHours = 1;
  const totalEnergyCurtailedMwh = curtailedMw * durationHours;

  // Create curtailment event
  const event: Omit<CurtailmentEvent, 'id' | 'detected_at'> = {
    province,
    source_type: sourceType,
    curtailed_mw: curtailedMw,
    available_capacity_mw: availableCapacity,
    curtailment_percent: curtailmentPercent,
    duration_hours: durationHours,
    total_energy_curtailed_mwh: totalEnergyCurtailedMwh,
    reason,
    reason_detail: reasonDetail,
    market_price_cad_per_mwh: marketPrice || null,
    opportunity_cost_cad: opportunityCostCad,
    grid_demand_mw: gridDemand || null,
    mitigation_actions: null,
    mitigation_effective: null,
    occurred_at: new Date().toISOString(),
    ended_at: null,
    data_source: 'ceip_realtime',
    notes: null
  };

  // Store in database
  const { data, error } = await supabase
    .from('curtailment_events')
    .insert([event])
    .select()
    .single();

  if (error) {
    console.error('Failed to store curtailment event:', error);
    return null;
  }

  return data as CurtailmentEvent;
}

/**
 * Generate AI-powered curtailment reduction recommendations
 */
export async function generateCurtailmentRecommendations(
  event: CurtailmentEvent,
  context?: {
    forecast?: RenewableForecast;
    weather?: WeatherObservation;
    storageAvailable?: number;
    drCapacity?: number;
    exportCapacity?: number;
  }
): Promise<CurtailmentReductionRecommendation[]> {
  const recommendations: Omit<CurtailmentReductionRecommendation, 'id' | 'generated_at'>[] = [];

  const {
    curtailed_mw,
    reason,
    province,
    source_type,
    market_price_cad_per_mwh
  } = event;

  // Storage recommendation
  if (context?.storageAvailable && context.storageAvailable > 0) {
    const storageMw = Math.min(curtailed_mw, context.storageAvailable);
    const storageCost = 0; // No cost to charge storage during curtailment
    const costBenefit = (market_price_cad_per_mwh || 50) * storageMw;
    
    recommendations.push({
      curtailment_event_id: event.id,
      recommendation_type: 'storage_charge',
      target_mw: storageMw,
      expected_reduction_mw: storageMw,
      confidence: 0.92,
      priority: storageMw > 50 ? 'high' : 'medium',
      estimated_mwh_saved: storageMw,
      estimated_cost_cad: storageCost,
      estimated_revenue_cad: costBenefit,
      cost_benefit_ratio: costBenefit / Math.max(storageCost, 0.01),
      confidence_score: 0.92,
      recommendation_status: null,
      llm_reasoning: `During ${reason} event, charge battery storage with ${storageMw.toFixed(1)} MW of curtailed ${source_type} energy. This avoids curtailment and stores energy for later use during peak demand or high prices.`,
      recommended_actions: [
        `Activate battery charging at ${storageMw.toFixed(1)} MW`,
        'Monitor state of charge (target 90%)',
        'Reserve 10% capacity for frequency response',
        'Discharge during next price spike (>$80/MWh)'
      ],
      implementation_timeline: '5 minutes',
      responsible_party: 'Storage Operator',
      implemented: false,
      actual_mwh_saved: null,
      actual_cost_cad: null,
      effectiveness_rating: null,
      notes: null
    });
  }

  // Demand Response recommendation
  if (context?.drCapacity && context.drCapacity > 0) {
    const drMw = Math.min(curtailed_mw * 0.6, context.drCapacity); // Can absorb up to 60% via DR
    const drCost = drMw * 20; // $20/MWh incentive to shift load
    const drBenefit = (market_price_cad_per_mwh || 50) * drMw - drCost;
    
    if (drBenefit > 0) {
      recommendations.push({
        curtailment_event_id: event.id,
        recommendation_type: 'demand_response',
        target_mw: drMw,
        expected_reduction_mw: drMw,
        confidence: 0.85,
        priority: drMw > 80 ? 'high' : 'medium',
        estimated_mwh_saved: drMw,
        estimated_cost_cad: drCost,
        estimated_revenue_cad: drBenefit + drCost,
        cost_benefit_ratio: (drBenefit + drCost) / drCost,
        confidence_score: 0.85,
        recommendation_status: null,
        llm_reasoning: `Activate demand response program to absorb ${drMw.toFixed(1)} MW of surplus ${source_type} generation. Offer industrial consumers discounted rates to shift flexible loads to this period, reducing curtailment and maximizing renewable throughput.`,
        recommended_actions: [
          `Notify DR participants of ${drMw.toFixed(1)} MW opportunity`,
          `Offer rate: $${((market_price_cad_per_mwh || 50) - 20).toFixed(2)}/MWh`,
          'Activate within 15 minutes',
          'Target aluminum smelters, data centers, hydrogen production'
        ],
        implementation_timeline: '15 minutes',
        responsible_party: 'Grid Operator (IESO/AESO)',
        implemented: false,
        actual_mwh_saved: null,
        actual_cost_cad: null,
        effectiveness_rating: null,
        notes: null
      });
    }
  }

  // Export recommendation
  if (context?.exportCapacity && context.exportCapacity > 0) {
    const exportMw = Math.min(curtailed_mw * 0.8, context.exportCapacity);
    const exportPrice = (market_price_cad_per_mwh || 50) * 0.85; // 15% discount for export
    const exportRevenue = exportMw * exportPrice;
    
    if (exportPrice > 10) { // Only export if price >$10/MWh
      recommendations.push({
        curtailment_event_id: event.id,
        recommendation_type: 'export_intertie',
        target_mw: exportMw,
        expected_reduction_mw: exportMw,
        confidence: 0.78,
        priority: 'medium',
        estimated_mwh_saved: exportMw,
        estimated_cost_cad: exportMw * 2, // $2/MWh wheeling charge
        estimated_revenue_cad: exportRevenue,
        cost_benefit_ratio: exportRevenue / (exportMw * 2),
        confidence_score: 0.78,
        recommendation_status: null,
        llm_reasoning: `Export ${exportMw.toFixed(1)} MW to neighboring jurisdiction via inter-tie. ${province === 'ON' ? 'Options: Quebec (HQ), Michigan (MISO), New York (NYISO)' : 'Check available tie capacity'}. Avoid curtailment while generating export revenue.`,
        recommended_actions: [
          `Submit inter-tie schedule for ${exportMw.toFixed(1)} MW`,
          `Target price: $${exportPrice.toFixed(2)}/MWh`,
          'Coordinate with neighboring ISO',
          'Monitor transmission constraints'
        ],
        implementation_timeline: '30 minutes',
        responsible_party: 'Market Operator',
        implemented: false,
        actual_mwh_saved: null,
        actual_cost_cad: null,
        effectiveness_rating: null,
        notes: null
      });
    }
  }

  // Market bidding recommendation (if price forecast available)
  if (market_price_cad_per_mwh && market_price_cad_per_mwh < 20) {
    const bidMw = curtailed_mw * 0.5;
    const bidPrice = 15; // Bid at $15/MWh even if market is lower
    
    recommendations.push({
      curtailment_event_id: event.id,
      recommendation_type: 'industrial_load_shift',
      target_mw: bidMw,
      expected_reduction_mw: bidMw,
      confidence: 0.65,
      priority: 'low',
      estimated_mwh_saved: bidMw,
      estimated_cost_cad: 0,
      estimated_revenue_cad: bidMw * bidPrice,
      cost_benefit_ratio: Infinity,
      confidence_score: 0.65,
      recommendation_status: null,
      llm_reasoning: `Current market price ${market_price_cad_per_mwh.toFixed(2)} CAD/MWh is very low. Reduce bid price to $${bidPrice}/MWh for ${bidMw.toFixed(1)} MW to remain economic. Accept lower revenue to avoid full curtailment.`,
      recommended_actions: [
        `Rebid ${bidMw.toFixed(1)} MW at $${bidPrice}/MWh`,
        'Update hourly based on demand forecast',
        'Consider must-run contracts for future',
        'Track curtailment frequency for planning'
      ],
      implementation_timeline: '10 minutes',
      responsible_party: 'Renewable Producer',
      implemented: false,
      actual_mwh_saved: null,
      actual_cost_cad: null,
      effectiveness_rating: null,
      notes: null
    });
  }

  // Sort by priority and cost-benefit ratio
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.cost_benefit_ratio - a.cost_benefit_ratio;
  });

  // Store top 3 recommendations
  const topRecommendations = recommendations.slice(0, 3);
  
  if (topRecommendations.length > 0) {
    const { error } = await supabase
      .from('curtailment_reduction_recommendations')
      .insert(topRecommendations);

    if (error) {
      console.error('Failed to store recommendations:', error);
    }
  }

  // Return with generated IDs from database
  const { data } = await supabase
    .from('curtailment_reduction_recommendations')
    .select('*')
    .eq('event_id', event.id)
    .order('priority', { ascending: false });

  return (data || []) as CurtailmentReductionRecommendation[];
}

/**
 * Record mitigation action implementation and effectiveness
 */
export async function recordMitigationAction(
  eventId: string,
  actions: MitigationAction[]
): Promise<boolean> {
  // Update event with mitigation actions
  const { error: eventError } = await supabase
    .from('curtailment_events')
    .update({
      mitigation_actions: actions,
      mitigation_effective: actions.some(a => a.effectiveness_score > 0.7)
    })
    .eq('id', eventId);

  if (eventError) {
    console.error('Failed to record mitigation actions:', eventError);
    return false;
  }

  return true;
}

/**
 * Update recommendation with actual results
 */
export async function updateRecommendationResults(
  recommendationId: string,
  results: {
    implemented: boolean;
    actual_mwh_saved?: number;
    actual_cost_cad?: number;
    effectiveness_rating?: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('curtailment_reduction_recommendations')
    .update(results)
    .eq('id', recommendationId);

  if (error) {
    console.error('Failed to update recommendation results:', error);
    return false;
  }

  return true;
}

/**
 * Get curtailment statistics for award evidence
 */
export async function getCurtailmentStatistics(
  province: string,
  startDate: string,
  endDate: string
): Promise<{
  total_events: number;
  total_curtailed_mwh: number;
  total_opportunity_cost_cad: number;
  total_mwh_saved: number;
  total_cost_cad: number;
  total_revenue_cad: number;
  curtailment_reduction_percent: number;
  avg_effectiveness_rating: number;
  by_reason: Record<CurtailmentReason, { events: number; mwh: number; cost_cad: number }>;
}> {
  // Fetch curtailment events
  const { data: events } = await supabase
    .from('curtailment_events')
    .select('*')
    .eq('province', province)
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate);

  // Fetch recommendations
  const eventIds = (events || []).map(e => e.id);
  const { data: recommendations } = await supabase
    .from('curtailment_reduction_recommendations')
    .select('*')
    .in('event_id', eventIds)
    .eq('implemented', true);

  const totalEvents = (events || []).length;
  const totalCurtailedMwh = (events || []).reduce((sum, e) => sum + (e.total_energy_curtailed_mwh || 0), 0);
  const totalOpportunityCost = (events || []).reduce((sum, e) => sum + (e.opportunity_cost_cad || 0), 0);
  
  const totalMwhSaved = (recommendations || []).reduce((sum, r) => sum + (r.actual_mwh_saved || r.estimated_mwh_saved || 0), 0);
  const totalCost = (recommendations || []).reduce((sum, r) => sum + (r.actual_cost_cad || r.estimated_cost_cad || 0), 0);
  const totalRevenue = (recommendations || []).reduce((sum, r) => sum + (r.estimated_revenue_cad || 0), 0);
  
  const curtailmentReductionPercent = totalCurtailedMwh > 0 
    ? (totalMwhSaved / totalCurtailedMwh) * 100 
    : 0;

  const avgEffectiveness = (recommendations || [])
    .filter(r => r.effectiveness_rating)
    .reduce((sum, r, _, arr) => sum + (r.effectiveness_rating || 0) / arr.length, 0);

  // Group by reason
  const byReason: Record<string, { events: number; mwh: number; cost_cad: number }> = {};
  (events || []).forEach(e => {
    if (!byReason[e.reason]) {
      byReason[e.reason] = { events: 0, mwh: 0, cost_cad: 0 };
    }
    byReason[e.reason].events += 1;
    byReason[e.reason].mwh += e.total_energy_curtailed_mwh || 0;
    byReason[e.reason].cost_cad += e.opportunity_cost_cad || 0;
  });

  return {
    total_events: totalEvents,
    total_curtailed_mwh: totalCurtailedMwh,
    total_opportunity_cost_cad: totalOpportunityCost,
    total_mwh_saved: totalMwhSaved,
    total_cost_cad: totalCost,
    total_revenue_cad: totalRevenue,
    curtailment_reduction_percent: curtailmentReductionPercent,
    avg_effectiveness_rating: avgEffectiveness,
    by_reason: byReason as any
  };
}

/**
 * Generate mock curtailment event for testing
 */
export function generateMockCurtailmentEvent(province: string, sourceType: 'solar' | 'wind'): Omit<CurtailmentEvent, 'id' | 'detected_at'> {
  const curtailedMw = Math.random() * 200 + 50; // 50-250 MW
  const availableCapacity = curtailedMw / (0.1 + Math.random() * 0.4); // 10-50% curtailment
  const marketPrice = Math.random() * 100 - 10; // -10 to 90 CAD/MWh
  
  const reasons: CurtailmentReason[] = ['oversupply', 'transmission_congestion', 'negative_pricing', 'frequency_regulation'];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  
  return {
    province,
    source_type: sourceType,
    curtailed_mw: curtailedMw,
    available_capacity_mw: availableCapacity,
    curtailment_percent: (curtailedMw / availableCapacity) * 100,
    duration_hours: Math.random() * 3 + 0.5, // 0.5-3.5 hours
    total_energy_curtailed_mwh: curtailedMw * (Math.random() * 3 + 0.5),
    reason,
    reason_detail: `Mock ${reason} event`,
    market_price_cad_per_mwh: marketPrice,
    opportunity_cost_cad: curtailedMw * Math.max(marketPrice, 30),
    grid_demand_mw: Math.random() * 15000 + 10000,
    mitigation_actions: null,
    mitigation_effective: null,
    occurred_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    ended_at: null,
    data_source: 'mock',
    notes: 'Generated for testing'
  };
}
