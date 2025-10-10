/**
 * Forecast Performance API - Phase 5
 * 
 * Endpoints:
 * - GET /award-evidence - Get award submission evidence
 * - GET /daily - Get daily performance metrics
 * - GET /comparison - Get baseline comparisons
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // GET /award-evidence - Award submission evidence
    if (req.method === 'GET' && path === 'award-evidence') {
      const province = url.searchParams.get('province') || 'ON';
      const startDate = url.searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = url.searchParams.get('end_date') || new Date().toISOString().split('T')[0];

      // Fetch forecast performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('forecast_performance_metrics')
        .select('*')
        .eq('province', province)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('horizon_hours', 1); // Use 1-hour horizon for headline metrics

      if (metricsError) {
        throw metricsError;
      }

      // Calculate aggregates
      const solarMetrics = (metrics || []).filter(m => m.source_type === 'solar');
      const windMetrics = (metrics || []).filter(m => m.source_type === 'wind');

      const avgSolarMAE = solarMetrics.length > 0
        ? solarMetrics.reduce((sum, m) => sum + m.mae_mw, 0) / solarMetrics.length
        : 0;

      const avgWindMAE = windMetrics.length > 0
        ? windMetrics.reduce((sum, m) => sum + m.mae_mw, 0) / windMetrics.length
        : 0;

      const avgSolarMAPE = solarMetrics.length > 0
        ? solarMetrics.reduce((sum, m) => sum + m.mape_percent, 0) / solarMetrics.length
        : 0;

      const avgWindMAPE = windMetrics.length > 0
        ? windMetrics.reduce((sum, m) => sum + m.mape_percent, 0) / windMetrics.length
        : 0;

      // Baseline comparisons
      const avgSolarPersistenceUplift = solarMetrics.length > 0
        ? solarMetrics.reduce((sum, m) => sum + (m.improvement_vs_persistence_percent || 0), 0) / solarMetrics.length
        : 0;

      const avgSolarSeasonalUplift = solarMetrics.length > 0
        ? solarMetrics.reduce((sum, m) => sum + (m.improvement_vs_seasonal_percent || 0), 0) / solarMetrics.length
        : 0;

      const avgWindPersistenceUplift = windMetrics.length > 0
        ? windMetrics.reduce((sum, m) => sum + (m.improvement_vs_persistence_percent || 0), 0) / windMetrics.length
        : 0;

      const avgWindSeasonalUplift = windMetrics.length > 0
        ? windMetrics.reduce((sum, m) => sum + (m.improvement_vs_seasonal_percent || 0), 0) / windMetrics.length
        : 0;

      // Data completeness
      const avgCompleteness = (metrics || []).length > 0
        ? (metrics || []).reduce((sum, m) => sum + (m.data_completeness_percent || 100), 0) / (metrics || []).length
        : 100;

      // Sample counts
      const totalSamples = (metrics || []).reduce((sum, m) => sum + (m.sample_count || 0), 0);

      // Fetch curtailment stats for context
      const { data: curtailmentEvents, error: curtailmentError } = await supabase
        .from('curtailment_events')
        .select('*')
        .eq('province', province)
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate);

      const totalCurtailedMwh = (curtailmentEvents || []).reduce((sum, e) => sum + (e.total_energy_curtailed_mwh || 0), 0);
      
      // Fetch recommendations
      const eventIds = (curtailmentEvents || []).map(e => e.id);
      const { data: recommendations } = await supabase
        .from('curtailment_reduction_recommendations')
        .select('*')
        .in('curtailment_event_id', eventIds)
        .eq('implemented', true);

      const totalMwhSaved = (recommendations || []).reduce((sum, r) => sum + (r.actual_mwh_saved || r.estimated_mwh_saved || 0), 0);
      const totalCostSaved = (recommendations || []).reduce((sum, r) => sum + ((r.estimated_revenue_cad || 0) - (r.actual_cost_cad || r.estimated_cost_cad || 0)), 0);

      const evidence = {
        province,
        date_range: { start: startDate, end: endDate },
        
        // Forecast accuracy
        solar_forecast_mae_mw: avgSolarMAE,
        solar_forecast_mae_percent: avgSolarMAPE,
        wind_forecast_mae_mw: avgWindMAE,
        wind_forecast_mae_percent: avgWindMAPE,
        
        // Baseline improvements
        baseline_uplift_persistence_pct: (avgSolarPersistenceUplift + avgWindPersistenceUplift) / 2,
        baseline_uplift_seasonal_pct: (avgSolarSeasonalUplift + avgWindSeasonalUplift) / 2,
        solar_uplift_persistence_pct: avgSolarPersistenceUplift,
        solar_uplift_seasonal_pct: avgSolarSeasonalUplift,
        wind_uplift_persistence_pct: avgWindPersistenceUplift,
        wind_uplift_seasonal_pct: avgWindSeasonalUplift,
        
        // Data quality
        data_completeness_percent: avgCompleteness,
        total_forecast_samples: totalSamples,
        solar_samples: solarMetrics.reduce((sum, m) => sum + (m.sample_count || 0), 0),
        wind_samples: windMetrics.reduce((sum, m) => sum + (m.sample_count || 0), 0),
        
        // Curtailment reduction
        monthly_curtailment_avoided_mwh: totalMwhSaved,
        monthly_opportunity_cost_saved_cad: totalCostSaved,
        total_curtailment_events: (curtailmentEvents || []).length,
        curtailment_reduction_percent: totalCurtailedMwh > 0 ? (totalMwhSaved / totalCurtailedMwh) * 100 : 0,
        
        // Implementation
        implementation_rate_percent: eventIds.length > 0 ? ((recommendations || []).length / eventIds.length) * 100 : 0,
        
        // ROI
        roi_benefit_cost: totalCostSaved > 0 ? totalCostSaved / Math.max((recommendations || []).reduce((sum, r) => sum + (r.actual_cost_cad || r.estimated_cost_cad || 0), 0), 1) : 0,
        
        // Metadata
        model_name: 'Weather-Informed XGBoost Ensemble',
        model_version: '1.0.0',
        provenance: 'historical_archive',
        generated_at: new Date().toISOString()
      };

      return new Response(JSON.stringify(evidence), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /daily - Daily performance metrics
    if (req.method === 'GET' && path === 'daily') {
      const province = url.searchParams.get('province') || 'ON';
      const sourceType = url.searchParams.get('source_type');
      const horizon = parseInt(url.searchParams.get('horizon') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '30');

      let query = supabase
        .from('forecast_performance_metrics')
        .select('*')
        .eq('province', province)
        .eq('horizon_hours', horizon)
        .order('date', { ascending: false })
        .limit(limit);

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ metrics: data || [], count: (data || []).length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /comparison - Baseline comparisons
    if (req.method === 'GET' && path === 'comparison') {
      const province = url.searchParams.get('province') || 'ON';
      const sourceType = url.searchParams.get('source_type') || 'solar';

      const { data: metrics, error } = await supabase
        .from('forecast_performance_metrics')
        .select('*')
        .eq('province', province)
        .eq('source_type', sourceType)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      // Group by horizon
      const byHorizon: Record<number, any[]> = {};
      (metrics || []).forEach(m => {
        if (!byHorizon[m.horizon_hours]) {
          byHorizon[m.horizon_hours] = [];
        }
        byHorizon[m.horizon_hours].push(m);
      });

      const comparison = Object.entries(byHorizon).map(([horizon, data]) => {
        const avgMAE = data.reduce((sum, m) => sum + m.mae_mw, 0) / data.length;
        const avgPersistenceMAE = data.reduce((sum, m) => sum + (m.baseline_persistence_mae_mw || 0), 0) / data.length;
        const avgSeasonalMAE = data.reduce((sum, m) => sum + (m.baseline_seasonal_mae_mw || 0), 0) / data.length;
        const avgUpliftPersistence = data.reduce((sum, m) => sum + (m.improvement_vs_persistence_percent || 0), 0) / data.length;
        const avgUpliftSeasonal = data.reduce((sum, m) => sum + (m.improvement_vs_seasonal_percent || 0), 0) / data.length;

        return {
          horizon_hours: parseInt(horizon),
          our_model_mae_mw: avgMAE,
          persistence_baseline_mae_mw: avgPersistenceMAE,
          seasonal_baseline_mae_mw: avgSeasonalMAE,
          improvement_vs_persistence_pct: avgUpliftPersistence,
          improvement_vs_seasonal_pct: avgUpliftSeasonal,
          sample_count: data.reduce((sum, m) => sum + (m.sample_count || 0), 0)
        };
      });

      return new Response(JSON.stringify({ province, source_type: sourceType, comparison }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Forecast Performance API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
