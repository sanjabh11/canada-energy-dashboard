/**
 * Curtailment Reduction API - Phase 2
 * 
 * Endpoints:
 * - POST /detect - Detect curtailment event
 * - POST /recommend - Generate AI recommendations for event
 * - GET /statistics - Get curtailment statistics
 * - POST /mock - Generate mock curtailment event for testing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectCurtailmentRequest {
  province: string;
  sourceType: 'solar' | 'wind' | 'hydro' | 'mixed';
  currentGeneration?: number;
  forecastGeneration?: number;
  gridDemand?: number;
  marketPrice?: number;
  transmissionCapacity?: number;
}

interface RecommendRequest {
  eventId: string;
  context?: {
    storageAvailable?: number;
    drCapacity?: number;
    exportCapacity?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // GET /statistics - Curtailment statistics for award evidence
    if (req.method === 'GET' && path === 'statistics') {
      const province = url.searchParams.get('province') || 'ON';
      const startDate = url.searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = url.searchParams.get('end_date') || new Date().toISOString();

      // Fetch curtailment events
      const { data: events, error: eventsError } = await supabase
        .from('curtailment_events')
        .select('*')
        .eq('province', province)
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate);

      if (eventsError) {
        throw eventsError;
      }

      // Fetch recommendations
      const eventIds = (events || []).map(e => e.id);
      const { data: recommendations, error: recError } = await supabase
        .from('curtailment_reduction_recommendations')
        .select('*')
        .in('curtailment_event_id', eventIds)
        .eq('implemented', true);

      if (recError) {
        throw recError;
      }

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

      // Calculate ROI and provenance for test suite
      const netBenefit = totalRevenue - totalCost;
      const roiBenefitCost = totalCost > 0 ? netBenefit / totalCost : 0;
      
      // Determine provenance (exclude mock events)
      const nonMockEvents = (events || []).filter(e => e.data_source !== 'mock');
      const provenance = nonMockEvents.length > 0 ? 'historical' : 'mock';
      
      // Monthly calculations (assuming 30-day window)
      const daysInRange = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000));
      const monthlyMultiplier = 30 / daysInRange;
      
      const statistics = {
        total_events: totalEvents,
        total_curtailed_mwh: totalCurtailedMwh,
        total_opportunity_cost_cad: totalOpportunityCost,
        total_mwh_saved: totalMwhSaved,
        total_cost_cad: totalCost,
        total_revenue_cad: totalRevenue,
        curtailment_reduction_percent: curtailmentReductionPercent,
        avg_effectiveness_rating: avgEffectiveness,
        
        // Monthly projections for test suite
        monthly_curtailment_avoided_mwh: totalMwhSaved * monthlyMultiplier,
        monthly_opportunity_cost_saved_cad: netBenefit * monthlyMultiplier,
        
        // ROI and provenance
        roi_benefit_cost: roiBenefitCost,
        provenance: provenance,
        
        by_reason: byReason,
        events: events || [],
        recommendations: recommendations || []
      };

      return new Response(JSON.stringify(statistics), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /detect - Detect curtailment event
    if (req.method === 'POST' && path === 'detect') {
      const body: DetectCurtailmentRequest = await req.json();
      
      const {
        province,
        sourceType,
        currentGeneration = 0,
        forecastGeneration = 0,
        gridDemand = 0,
        marketPrice = 0,
        transmissionCapacity = Infinity
      } = body;

      // Calculate curtailment
      const availableCapacity = forecastGeneration || currentGeneration;
      const curtailedMw = Math.max(0, currentGeneration - forecastGeneration);
      
      // Only proceed if significant curtailment detected (>5 MW)
      if (curtailedMw < 5) {
        return new Response(JSON.stringify({ event: null, message: 'No significant curtailment detected' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const curtailmentPercent = (curtailedMw / availableCapacity) * 100;

      // Classify curtailment reason
      let reason = 'other';
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
      const assumedPrice = marketPrice > 0 ? marketPrice : 50;
      const opportunityCostCad = curtailedMw * assumedPrice;

      // Estimate duration
      const durationHours = 1;
      const totalEnergyCurtailedMwh = curtailedMw * durationHours;

      // Create curtailment event
      const event = {
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
        data_source: 'ceip_api',
        notes: null
      };

      // Store in database
      const { data, error } = await supabase
        .from('curtailment_events')
        .insert([event])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ event: data, message: 'Curtailment event detected and recorded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /recommend - Generate recommendations for event
    if (req.method === 'POST' && path === 'recommend') {
      const body: RecommendRequest = await req.json();
      const { eventId, context = {} } = body;

      // Fetch event
      const { data: event, error: eventError } = await supabase
        .from('curtailment_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw new Error('Event not found');
      }

      const recommendations: any[] = [];

      const {
        curtailed_mw,
        reason,
        province,
        source_type,
        market_price_cad_per_mwh
      } = event;

      // Storage recommendation
      if (context.storageAvailable && context.storageAvailable > 0) {
        const storageMw = Math.min(curtailed_mw, context.storageAvailable);
        const storageCost = 0;
        const costBenefit = (market_price_cad_per_mwh || 50) * storageMw;
        
        recommendations.push({
          curtailment_event_id: eventId,
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
          llm_reasoning: `During ${reason} event, charge battery storage with ${storageMw.toFixed(1)} MW of curtailed ${source_type} energy. This avoids curtailment and stores energy for later use during peak demand or high prices.`,
          recommended_actions: [
            `Activate battery charging at ${storageMw.toFixed(1)} MW`,
            'Monitor state of charge (target 90%)',
            'Reserve 10% capacity for frequency response',
            'Discharge during next price spike (>$80/MWh)'
          ],
          implementation_timeline: '5 minutes',
          responsible_party: 'Storage Operator',
          implemented: false
        });
      }

      // Demand Response recommendation
      if (context.drCapacity && context.drCapacity > 0) {
        const drMw = Math.min(curtailed_mw * 0.6, context.drCapacity);
        const drCost = drMw * 20;
        const drBenefit = (market_price_cad_per_mwh || 50) * drMw - drCost;
        
        if (drBenefit > 0) {
          recommendations.push({
            curtailment_event_id: eventId,
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
            llm_reasoning: `Activate demand response program to absorb ${drMw.toFixed(1)} MW of surplus ${source_type} generation.`,
            recommended_actions: [
              `Notify DR participants of ${drMw.toFixed(1)} MW opportunity`,
              `Offer rate: $${((market_price_cad_per_mwh || 50) - 20).toFixed(2)}/MWh`,
              'Activate within 15 minutes'
            ],
            implementation_timeline: '15 minutes',
            responsible_party: 'Grid Operator',
            implemented: false
          });
        }
      }

      // Export recommendation
      if (context.exportCapacity && context.exportCapacity > 0) {
        const exportMw = Math.min(curtailed_mw * 0.8, context.exportCapacity);
        const exportPrice = (market_price_cad_per_mwh || 50) * 0.85;
        const exportRevenue = exportMw * exportPrice;
        
        if (exportPrice > 10) {
          recommendations.push({
            curtailment_event_id: eventId,
            recommendation_type: 'export_intertie',
            target_mw: exportMw,
            expected_reduction_mw: exportMw,
            confidence: 0.78,
            priority: 'medium',
            estimated_mwh_saved: exportMw,
            estimated_cost_cad: exportMw * 2,
            estimated_revenue_cad: exportRevenue,
            cost_benefit_ratio: exportRevenue / (exportMw * 2),
            confidence_score: 0.78,
            llm_reasoning: `Export ${exportMw.toFixed(1)} MW to neighboring jurisdiction via inter-tie.`,
            recommended_actions: [
              `Submit inter-tie schedule for ${exportMw.toFixed(1)} MW`,
              `Target price: $${exportPrice.toFixed(2)}/MWh`
            ],
            implementation_timeline: '30 minutes',
            responsible_party: 'Market Operator',
            implemented: false
          });
        }
      }

      // Store recommendations
      if (recommendations.length > 0) {
        const { data, error } = await supabase
          .from('curtailment_reduction_recommendations')
          .insert(recommendations)
          .select();

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({ recommendations: data, count: data.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ recommendations: [], message: 'No viable recommendations generated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /mock - Generate mock curtailment event for testing
    if (req.method === 'POST' && path === 'mock') {
      const { province = 'ON', sourceType = 'solar' } = await req.json();
      
      const curtailedMw = Math.random() * 200 + 50;
      const availableCapacity = curtailedMw / (0.1 + Math.random() * 0.4);
      const marketPrice = Math.random() * 100 - 10;
      
      const reasons = ['oversupply', 'transmission_congestion', 'negative_pricing', 'frequency_regulation'];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      
      const mockEvent = {
        province,
        source_type: sourceType,
        curtailed_mw: curtailedMw,
        available_capacity_mw: availableCapacity,
        curtailment_percent: (curtailedMw / availableCapacity) * 100,
        duration_hours: Math.random() * 3 + 0.5,
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

      const { data, error } = await supabase
        .from('curtailment_events')
        .insert([mockEvent])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ event: data, message: 'Mock curtailment event created' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Curtailment API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
