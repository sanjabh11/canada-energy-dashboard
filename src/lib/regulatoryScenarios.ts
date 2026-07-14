/**
 * CER EF2026 & OEB Regulatory Scenario Mapping
 *
 * Maps forecast outputs to CER (Canada Energy Regulator) EF2026 scenarios
 * and generates OEB (Ontario Energy Board) filing bundles with required
 * forecast evidence packages.
 *
 * References:
 *   - CER "Canada's Energy Future 2026" scenarios
 *   - OEB Filing Requirements for Integrated Resource Plans
 *   - Perplx deep research: regulatory alignment gaps
 */

export type CERScenarioType =
  'net_zero_2050' | 'current_measures' | 'high_demand' | 'low_demand' | 'global_net_zero';

export type OEBFilingType =
  'irr' | 'rate_application' | 'capex_plan' | 'conservation_plan' | 'distributed_energy_plan';

export interface CERScenarioMapping {
  scenarioType: CERScenarioType;
  scenarioName: string;
  description: string;
  demandGrowthAnnualPct: number;
  renewableShareTargetPct: number;
  carbonPriceCadPerTonne: number;
  gasDemandChangePct: number;
  electrificationIndex: number;
  keyAssumptions: string[];
  forecastHorizonYears: number;
}

export interface OEBFilingBundle {
  filingType: OEBFilingType;
  filingName: string;
  requiredComponents: string[];
  forecastMetrics: {
    mape: number;
    crps: number;
    coverageRate: number;
    pinballLoss: number;
  };
  scenarioAlignment: CERScenarioType[];
  evidencePackage: string[];
  submissionDeadline?: string;
}

export const CER_EF2026_SCENARIOS: Record<CERScenarioType, CERScenarioMapping> = {
  net_zero_2050: {
    scenarioType: 'net_zero_2050',
    scenarioName: 'CER EF2026 Net-Zero by 2050',
    description:
      'Canada achieves net-zero emissions by 2050 through accelerated electrification and decarbonization.',
    demandGrowthAnnualPct: 1.8,
    renewableShareTargetPct: 85,
    carbonPriceCadPerTonne: 170,
    gasDemandChangePct: -45,
    electrificationIndex: 0.78,
    keyAssumptions: [
      'Federal carbon price reaches $170/t by 2030',
      'EV adoption reaches 60% of new sales by 2035',
      'Heat pump adoption reaches 50% of heating stock by 2040',
      'Grid capacity doubles by 2050',
    ],
    forecastHorizonYears: 25,
  },
  current_measures: {
    scenarioType: 'current_measures',
    scenarioName: 'CER EF2026 Current Measures',
    description: 'Continuation of currently announced policies without additional measures.',
    demandGrowthAnnualPct: 0.9,
    renewableShareTargetPct: 55,
    carbonPriceCadPerTonne: 80,
    gasDemandChangePct: -10,
    electrificationIndex: 0.42,
    keyAssumptions: [
      'Carbon price plateaus at $80/t post-2030',
      'Moderate EV adoption (~30% by 2035)',
      'Gradual renewable buildout continues',
      'Gas retains significant share in power generation',
    ],
    forecastHorizonYears: 25,
  },
  high_demand: {
    scenarioType: 'high_demand',
    scenarioName: 'CER EF2026 High Demand',
    description: 'Higher economic growth and population increase drive elevated energy demand.',
    demandGrowthAnnualPct: 2.5,
    renewableShareTargetPct: 65,
    carbonPriceCadPerTonne: 120,
    gasDemandChangePct: 5,
    electrificationIndex: 0.55,
    keyAssumptions: [
      'Higher GDP growth (2.5%/yr)',
      'Increased immigration levels',
      'AI/data center demand surge',
      'Industrial electrification accelerates',
    ],
    forecastHorizonYears: 25,
  },
  low_demand: {
    scenarioType: 'low_demand',
    scenarioName: 'CER EF2026 Low Demand',
    description: 'Economic slowdown and efficiency gains reduce demand growth.',
    demandGrowthAnnualPct: 0.3,
    renewableShareTargetPct: 60,
    carbonPriceCadPerTonne: 95,
    gasDemandChangePct: -25,
    electrificationIndex: 0.48,
    keyAssumptions: [
      'Lower GDP growth (1.0%/yr)',
      'Aggressive efficiency standards',
      'Demand response programs reduce peak',
      'Industrial output declines in energy-intensive sectors',
    ],
    forecastHorizonYears: 25,
  },
  global_net_zero: {
    scenarioType: 'global_net_zero',
    scenarioName: 'CER EF2026 Global Net-Zero',
    description: 'Coordinated global action achieves net-zero emissions by 2050.',
    demandGrowthAnnualPct: 1.5,
    renewableShareTargetPct: 90,
    carbonPriceCadPerTonne: 200,
    gasDemandChangePct: -60,
    electrificationIndex: 0.85,
    keyAssumptions: [
      'Global carbon price convergence',
      'Technology transfer accelerates',
      'Canadian LNG exports decline post-2035',
      'Hydrogen economy emerges at scale',
    ],
    forecastHorizonYears: 25,
  },
};

export const OEB_FILING_TEMPLATES: Record<OEBFilingType, OEBFilingBundle> = {
  irr: {
    filingType: 'irr',
    filingName: 'Integrated Resource Plan',
    requiredComponents: [
      'demand_forecast_20yr',
      'supply_resource_plan',
      'transmission_plan',
      'distribution_plan',
      'conservation_demand_management',
      'uncertainty_analysis',
      'indigenous_engagement_plan',
    ],
    forecastMetrics: { mape: 0.05, crps: 0.03, coverageRate: 0.9, pinballLoss: 0.02 },
    scenarioAlignment: ['net_zero_2050', 'current_measures', 'high_demand'],
    evidencePackage: [
      'rolling_origin_backtest_results',
      'conformal_prediction_coverage',
      'weather_feature_validation',
      'drift_detection_monitoring_plan',
    ],
  },
  rate_application: {
    filingType: 'rate_application',
    filingName: 'Rate Application',
    requiredComponents: [
      'cost_of_service_analysis',
      'rate_design_proposal',
      'demand_forecast_5yr',
      'load_forecast_methodology',
      'sensitivity_analysis',
    ],
    forecastMetrics: { mape: 0.03, crps: 0.02, coverageRate: 0.9, pinballLoss: 0.015 },
    scenarioAlignment: ['current_measures', 'high_demand', 'low_demand'],
    evidencePackage: [
      'backtest_3yr_horizon',
      'baseline_accuracy_comparison',
      'weather_adjustment_validation',
    ],
  },
  capex_plan: {
    filingType: 'capex_plan',
    filingName: 'Capital Expenditure Plan',
    requiredComponents: [
      'project_list_justification',
      'demand_growth_justification',
      'long_term_forecast',
      'risk_assessment',
      'alternative_analysis',
    ],
    forecastMetrics: { mape: 0.08, crps: 0.05, coverageRate: 0.85, pinballLoss: 0.03 },
    scenarioAlignment: ['net_zero_2050', 'high_demand', 'current_measures'],
    evidencePackage: [
      'scenario_comparison_analysis',
      'strategic_consequence_analysis',
      'regret_matrix',
    ],
  },
  conservation_plan: {
    filingType: 'conservation_plan',
    filingName: 'Conservation and Demand Management Plan',
    requiredComponents: [
      'program_portfolio',
      'savings_forecast',
      'cost_effectiveness_analysis',
      'equity_considerations',
      'measurement_verification_plan',
    ],
    forecastMetrics: { mape: 0.06, crps: 0.04, coverageRate: 0.9, pinballLoss: 0.025 },
    scenarioAlignment: ['net_zero_2050', 'current_measures'],
    evidencePackage: [
      'program_savings_backtest',
      'incremental_savings_analysis',
      'TRC_test_results',
    ],
  },
  distributed_energy_plan: {
    filingType: 'distributed_energy_plan',
    filingName: 'Distributed Energy Resources Plan',
    requiredComponents: [
      'der_forecast',
      'hosting_capacity_analysis',
      'interconnection_plan',
      'grid_impact_study',
      'storage_integration_plan',
    ],
    forecastMetrics: { mape: 0.07, crps: 0.05, coverageRate: 0.85, pinballLoss: 0.03 },
    scenarioAlignment: ['net_zero_2050', 'global_net_zero', 'current_measures'],
    evidencePackage: [
      'der_adoption_forecast',
      'locational_marginal_impact',
      'reverse_power_flow_analysis',
    ],
  },
};

export function mapForecastToCERScenarios(input: {
  demandGrowthPct: number;
  renewableSharePct: number;
  carbonPriceCadPerTonne: number;
  gasDemandChangePct: number;
}): Array<{ scenario: CERScenarioType; alignmentScore: number; name: string }> {
  const results = Object.values(CER_EF2026_SCENARIOS).map((s) => {
    const demandDiff = Math.abs(s.demandGrowthAnnualPct - input.demandGrowthPct) / 3;
    const renewableDiff = Math.abs(s.renewableShareTargetPct - input.renewableSharePct) / 100;
    const carbonDiff = Math.abs(s.carbonPriceCadPerTonne - input.carbonPriceCadPerTonne) / 200;
    const gasDiff = Math.abs(s.gasDemandChangePct - input.gasDemandChangePct) / 100;
    const avgDiff = (demandDiff + renewableDiff + carbonDiff + gasDiff) / 4;
    const alignmentScore = Math.max(0, 1 - avgDiff);
    return {
      scenario: s.scenarioType,
      alignmentScore: Math.round(alignmentScore * 1000) / 1000,
      name: s.scenarioName,
    };
  });
  return results.sort((a, b) => b.alignmentScore - a.alignmentScore);
}

export function generateOEBFilingBundle(
  filingType: OEBFilingType,
  forecastMetrics: { mape: number; crps: number; coverageRate: number; pinballLoss: number },
  alignedScenarios: CERScenarioType[],
): OEBFilingBundle {
  const template = OEB_FILING_TEMPLATES[filingType];
  const meetsThreshold = forecastMetrics.mape <= template.forecastMetrics.mape;
  return {
    ...template,
    forecastMetrics,
    scenarioAlignment: alignedScenarios,
    evidencePackage: meetsThreshold
      ? template.evidencePackage
      : [...template.evidencePackage, 'metric_threshold_warning'],
  };
}
