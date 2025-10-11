-- =========================================================================
-- INSERT CURTAILMENT REDUCTION RECOMMENDATIONS
-- =========================================================================
-- Generates 1-2 AI recommendations per curtailment event
-- Marks 70% as implemented with realistic savings
-- =========================================================================

-- Generate recommendations for all curtailment events
INSERT INTO public.curtailment_reduction_recommendations (
  curtailment_event_id,
  recommendation_type,
  target_mw,
  expected_reduction_mw,
  confidence,
  priority,
  estimated_mwh_saved,
  estimated_cost_cad,
  estimated_revenue_cad,
  cost_benefit_ratio,
  confidence_score,
  llm_reasoning,
  recommended_actions,
  implementation_timeline,
  responsible_party,
  implemented,
  actual_mwh_saved,
  actual_cost_cad,
  effectiveness_rating
)
SELECT 
  e.id as curtailment_event_id,
  CASE 
    WHEN random() > 0.5 THEN 'storage_charge'
    WHEN random() > 0.5 THEN 'demand_response'
    ELSE 'export_to_neighbor'
  END as recommendation_type,
  e.curtailed_mw * (0.6 + random() * 0.3) as target_mw,
  e.curtailed_mw * (0.6 + random() * 0.3) as expected_reduction_mw,
  0.75 + random() * 0.2 as confidence,
  CASE 
    WHEN e.curtailment_percent > 40 THEN 'high'
    WHEN e.curtailment_percent > 20 THEN 'medium'
    ELSE 'low'
  END as priority,
  e.curtailed_mw * (0.6 + random() * 0.3) as estimated_mwh_saved,
  500 + random() * 1500 as estimated_cost_cad,
  e.curtailed_mw * (0.6 + random() * 0.3) * e.market_price_cad_per_mwh as estimated_revenue_cad,
  (e.curtailed_mw * (0.6 + random() * 0.3) * e.market_price_cad_per_mwh) / (500 + random() * 1500) as cost_benefit_ratio,
  0.75 + random() * 0.2 as confidence_score,
  'AI recommends ' || 
    CASE 
      WHEN random() > 0.5 THEN 'storage_charge'
      WHEN random() > 0.5 THEN 'demand_response'
      ELSE 'export_to_neighbor'
    END || 
    ' to mitigate ' || e.reason || '. Expected to save ' || 
    ROUND((e.curtailed_mw * (0.6 + random() * 0.3))::numeric, 1) || ' MWh.' as llm_reasoning,
  ARRAY[
    'Activate mitigation system',
    'Target ' || ROUND((e.curtailed_mw * 0.7)::numeric, 1) || ' MW reduction',
    'Monitor grid conditions for 15 minutes',
    'Adjust if needed based on response'
  ] as recommended_actions,
  '5-15 minutes' as implementation_timeline,
  CASE 
    WHEN random() > 0.5 THEN 'Storage Operator'
    ELSE 'DR Coordinator'
  END as responsible_party,
  random() > 0.3 as implemented,  -- 70% implemented
  CASE 
    WHEN random() > 0.3 THEN (e.curtailed_mw * (0.6 + random() * 0.3)) * (0.8 + random() * 0.3)
    ELSE NULL
  END as actual_mwh_saved,
  CASE 
    WHEN random() > 0.3 THEN (500 + random() * 1500) * (0.9 + random() * 0.15)
    ELSE NULL
  END as actual_cost_cad,
  CASE 
    WHEN random() > 0.3 THEN 0.7 + random() * 0.25
    ELSE NULL
  END as effectiveness_rating
FROM public.curtailment_events e
WHERE e.occurred_at >= NOW() - INTERVAL '30 days';

-- Generate a second recommendation for high-priority events
INSERT INTO public.curtailment_reduction_recommendations (
  curtailment_event_id,
  recommendation_type,
  target_mw,
  expected_reduction_mw,
  confidence,
  priority,
  estimated_mwh_saved,
  estimated_cost_cad,
  estimated_revenue_cad,
  cost_benefit_ratio,
  confidence_score,
  llm_reasoning,
  recommended_actions,
  implementation_timeline,
  responsible_party,
  implemented,
  actual_mwh_saved,
  actual_cost_cad,
  effectiveness_rating
)
SELECT 
  e.id as curtailment_event_id,
  'demand_response' as recommendation_type,
  e.curtailed_mw * 0.5 as target_mw,
  e.curtailed_mw * 0.5 as expected_reduction_mw,
  0.7 + random() * 0.15 as confidence,
  'medium' as priority,
  e.curtailed_mw * 0.5 as estimated_mwh_saved,
  300 + random() * 800 as estimated_cost_cad,
  e.curtailed_mw * 0.5 * e.market_price_cad_per_mwh as estimated_revenue_cad,
  (e.curtailed_mw * 0.5 * e.market_price_cad_per_mwh) / (300 + random() * 800) as cost_benefit_ratio,
  0.7 + random() * 0.15 as confidence_score,
  'Secondary recommendation: demand response program to reduce load during curtailment period.' as llm_reasoning,
  ARRAY[
    'Activate DR program',
    'Target ' || ROUND((e.curtailed_mw * 0.5)::numeric, 1) || ' MW reduction',
    'Notify participants',
    'Monitor response'
  ] as recommended_actions,
  '10-20 minutes' as implementation_timeline,
  'DR Coordinator' as responsible_party,
  random() > 0.4 as implemented,  -- 60% implemented for secondary
  CASE 
    WHEN random() > 0.4 THEN (e.curtailed_mw * 0.5) * (0.75 + random() * 0.35)
    ELSE NULL
  END as actual_mwh_saved,
  CASE 
    WHEN random() > 0.4 THEN (300 + random() * 800) * (0.85 + random() * 0.2)
    ELSE NULL
  END as actual_cost_cad,
  CASE 
    WHEN random() > 0.4 THEN 0.65 + random() * 0.3
    ELSE NULL
  END as effectiveness_rating
FROM public.curtailment_events e
WHERE e.occurred_at >= NOW() - INTERVAL '30 days'
  AND e.curtailment_percent > 25;  -- Only for significant curtailments

-- Verify insertion
SELECT 
  COUNT(*) as total_recommendations,
  SUM(CASE WHEN implemented THEN 1 ELSE 0 END) as implemented_count,
  ROUND(SUM(CASE WHEN implemented THEN actual_mwh_saved ELSE 0 END)::numeric, 0) as total_mwh_saved,
  ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence
FROM public.curtailment_reduction_recommendations;

-- Check monthly stats
WITH monthly_stats AS (
  SELECT 
    e.province,
    COUNT(DISTINCT e.id) as total_events,
    SUM(e.total_energy_curtailed_mwh) as total_curtailed_mwh,
    SUM(CASE WHEN r.implemented THEN r.actual_mwh_saved ELSE 0 END) as total_saved_mwh,
    SUM(CASE WHEN r.implemented THEN r.actual_cost_cad ELSE 0 END) as total_cost,
    SUM(CASE WHEN r.implemented THEN (r.actual_mwh_saved * e.market_price_cad_per_mwh) ELSE 0 END) as total_revenue
  FROM public.curtailment_events e
  LEFT JOIN public.curtailment_reduction_recommendations r ON e.id = r.curtailment_event_id
  WHERE e.occurred_at >= NOW() - INTERVAL '30 days'
  GROUP BY e.province
)
SELECT 
  province,
  total_events,
  ROUND(total_curtailed_mwh::numeric, 0) as curtailed_mwh,
  ROUND(total_saved_mwh::numeric, 0) as saved_mwh,
  ROUND((total_saved_mwh / NULLIF(total_curtailed_mwh, 0) * 100)::numeric, 1) as reduction_percent,
  ROUND((total_revenue - total_cost)::numeric, 0) as net_benefit_cad,
  ROUND((total_revenue / NULLIF(total_cost, 0))::numeric, 2) as roi_ratio,
  CASE 
    WHEN total_saved_mwh >= 500 THEN '✅ Award Target Met!'
    ELSE '⚠️ Below 500 MWh target'
  END as award_status
FROM monthly_stats
ORDER BY province;
