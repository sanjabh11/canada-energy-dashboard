/**
 * Regulatory Filing Template Engine
 * 
 * Generates structured export data for Canadian energy regulatory filings:
 * 
 * ALBERTA:
 * - AUC Rule 005: Annual Information Return (AIR)
 *   - Schedule 4.2: Capital Additions
 *   - Schedule 10: Income Statement
 *   - Schedule 17: Rate Base
 *   - Schedule 22: Operating & Maintenance Expenses
 * 
 * ONTARIO:
 * - OEB Chapter 5: Distribution System Plan (DSP)
 *   - Section 5.2: Asset Condition Assessment
 *   - Section 5.3: System Capability (Load Forecast)
 *   - Section 5.4: Customer Focus (Reliability Metrics)
 *   - Appendix 2-AB: Asset Condition Assessment Methodology
 * 
 * References:
 * - AUC Rule 005 (Alberta Utilities Commission, 2024 revision)
 * - OEB Filing Requirements for Electricity Distribution Rate Applications (Ch. 5)
 * - IEEE C57.104-2019 (Dissolved Gas Analysis for transformers)
 * - IEC 60076 (Power transformers assessment standards)
 */

// ============================================================================
// TYPES — AUC RULE 005
// ============================================================================

export interface Rule005Schedule4_2_Row {
  asset_category: string;
  asset_description: string;
  in_service_date: string;
  original_cost_cad: number;
  accumulated_depreciation_cad: number;
  net_book_value_cad: number;
  depreciation_rate_pct: number;
  expected_life_years: number;
  additions_current_year_cad: number;
  retirements_current_year_cad: number;
}

export interface Rule005Schedule10_Row {
  line_item: string;
  category: 'revenue' | 'expense' | 'tax' | 'net_income';
  current_year_cad: number;
  prior_year_cad: number;
  variance_cad: number;
  variance_pct: number;
  notes: string;
}

export interface Rule005Schedule17_Row {
  rate_base_component: string;
  mid_year_value_cad: number;
  opening_balance_cad: number;
  closing_balance_cad: number;
  additions_cad: number;
  retirements_cad: number;
  depreciation_cad: number;
}

export interface Rule005Schedule22_Row {
  expense_category: string;
  account_number: string;
  current_year_cad: number;
  prior_year_cad: number;
  budget_cad: number;
  variance_to_budget_cad: number;
  fte_count: number;
  notes: string;
}

// ============================================================================
// TYPES — OEB CHAPTER 5 DSP
// ============================================================================

export interface OEB_DSP_AssetCondition_Row {
  asset_class: string;
  asset_category: string;
  total_units: number;
  avg_age_years: number;
  expected_life_years: number;
  health_index_avg: number;
  condition_poor_pct: number;
  condition_fair_pct: number;
  condition_good_pct: number;
  replacement_cost_cad: number;
  planned_replacements: number;
  risk_priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface OEB_DSP_LoadForecast_Row {
  year: number;
  zone: string;
  peak_demand_mw: number;
  energy_gwh: number;
  customer_count: number;
  growth_rate_pct: number;
  capacity_mw: number;
  utilization_pct: number;
  load_transfer_capability_mw: number;
  notes: string;
}

export interface OEB_DSP_Reliability_Row {
  metric: string;
  unit: string;
  current_year: number;
  prior_year_1: number;
  prior_year_2: number;
  prior_year_3: number;
  oeb_target: number | null;
  industry_avg: number | null;
  trend: 'improving' | 'stable' | 'declining';
}

export interface OEB_DSP_ScenarioMatrix_Row {
  horizon_year: number;
  scenario: 'low' | 'base' | 'high';
  peak_demand_mw: number;
  annual_energy_gwh: number;
  delta_vs_base_mw: number;
  reliability_proxy_score: number;
  notes: string;
}

export interface AUC_DSP_DataSchedule_Row {
  horizon_year: number;
  geography_id: string;
  geography_level: string;
  peak_demand_mw: number;
  annual_energy_gwh: number;
  customer_count: number;
  growth_rate_pct: number;
  large_point_load_mw: number;
  industrial_opt_out_mw: number;
  der_offset_mw: number;
  deferred_peak_load_mw: number;
  reliability_proxy_score: number;
  hosting_capacity_limit_mw: number;
  notes: string;
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export type TemplateType =
  | 'rule005_schedule_4_2'
  | 'rule005_schedule_10'
  | 'rule005_schedule_17'
  | 'rule005_schedule_22'
  | 'oeb_dsp_asset_condition'
  | 'oeb_dsp_load_forecast'
  | 'oeb_dsp_reliability'
  | 'oeb_dsp_scenario_matrix'
  | 'auc_dsp_data_schedule';

export interface TemplateDefinition {
  id: TemplateType;
  name: string;
  jurisdiction: 'Alberta' | 'Ontario';
  regulation: string;
  description: string;
  columns: { key: string; label: string; type: 'string' | 'number' | 'date' | 'percent' }[];
  notes: string[];
}

export const REGULATORY_TEMPLATES: Record<TemplateType, TemplateDefinition> = {
  rule005_schedule_4_2: {
    id: 'rule005_schedule_4_2',
    name: 'Schedule 4.2 — Capital Additions',
    jurisdiction: 'Alberta',
    regulation: 'AUC Rule 005',
    description: 'Details of capital additions, retirements, and accumulated depreciation for utility property, plant, and equipment.',
    columns: [
      { key: 'asset_category', label: 'Asset Category', type: 'string' },
      { key: 'asset_description', label: 'Description', type: 'string' },
      { key: 'in_service_date', label: 'In-Service Date', type: 'date' },
      { key: 'original_cost_cad', label: 'Original Cost ($)', type: 'number' },
      { key: 'accumulated_depreciation_cad', label: 'Accum. Depreciation ($)', type: 'number' },
      { key: 'net_book_value_cad', label: 'Net Book Value ($)', type: 'number' },
      { key: 'depreciation_rate_pct', label: 'Depreciation Rate (%)', type: 'percent' },
      { key: 'expected_life_years', label: 'Expected Life (yrs)', type: 'number' },
      { key: 'additions_current_year_cad', label: 'Current Year Additions ($)', type: 'number' },
      { key: 'retirements_current_year_cad', label: 'Current Year Retirements ($)', type: 'number' },
    ],
    notes: [
      'Per AUC Rule 005, Section 3.2: All capital additions must be itemized for projects exceeding $50,000.',
      'Depreciation rates must align with AUC-approved rates per Decision 20414-D01-2016.',
      'Net book value = Original cost − Accumulated depreciation.',
    ],
  },
  rule005_schedule_10: {
    id: 'rule005_schedule_10',
    name: 'Schedule 10 — Income Statement',
    jurisdiction: 'Alberta',
    regulation: 'AUC Rule 005',
    description: 'Summarized income statement for the regulated utility operations, including revenue, operating expenses, and net income.',
    columns: [
      { key: 'line_item', label: 'Line Item', type: 'string' },
      { key: 'category', label: 'Category', type: 'string' },
      { key: 'current_year_cad', label: 'Current Year ($)', type: 'number' },
      { key: 'prior_year_cad', label: 'Prior Year ($)', type: 'number' },
      { key: 'variance_cad', label: 'Variance ($)', type: 'number' },
      { key: 'variance_pct', label: 'Variance (%)', type: 'percent' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    notes: [
      'Per AUC Rule 005, Section 4.1: Income statement must separate regulated and non-regulated operations.',
      'All amounts in Canadian dollars. Revenue includes distribution tariff revenue, transmission revenue, and other regulated revenue.',
      'Variances exceeding ±5% require explanatory notes.',
    ],
  },
  rule005_schedule_17: {
    id: 'rule005_schedule_17',
    name: 'Schedule 17 — Rate Base',
    jurisdiction: 'Alberta',
    regulation: 'AUC Rule 005',
    description: 'Rate base calculation showing mid-year net plant in service, working capital, and other rate base components.',
    columns: [
      { key: 'rate_base_component', label: 'Component', type: 'string' },
      { key: 'opening_balance_cad', label: 'Opening Balance ($)', type: 'number' },
      { key: 'additions_cad', label: 'Additions ($)', type: 'number' },
      { key: 'retirements_cad', label: 'Retirements ($)', type: 'number' },
      { key: 'depreciation_cad', label: 'Depreciation ($)', type: 'number' },
      { key: 'closing_balance_cad', label: 'Closing Balance ($)', type: 'number' },
      { key: 'mid_year_value_cad', label: 'Mid-Year Value ($)', type: 'number' },
    ],
    notes: [
      'Mid-year rate base = (Opening balance + Closing balance) / 2.',
      'Per AUC Rule 005, rate base determines the return on equity component of revenue requirement.',
      'Working capital allowance calculated per AUC-approved methodology.',
    ],
  },
  rule005_schedule_22: {
    id: 'rule005_schedule_22',
    name: 'Schedule 22 — O&M Expenses',
    jurisdiction: 'Alberta',
    regulation: 'AUC Rule 005',
    description: 'Operating and maintenance expenses by USOA account, including staffing levels and budget variance analysis.',
    columns: [
      { key: 'expense_category', label: 'Expense Category', type: 'string' },
      { key: 'account_number', label: 'USOA Account', type: 'string' },
      { key: 'current_year_cad', label: 'Current Year ($)', type: 'number' },
      { key: 'prior_year_cad', label: 'Prior Year ($)', type: 'number' },
      { key: 'budget_cad', label: 'Budget ($)', type: 'number' },
      { key: 'variance_to_budget_cad', label: 'Variance to Budget ($)', type: 'number' },
      { key: 'fte_count', label: 'FTEs', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    notes: [
      'Expenses classified per Uniform System of Accounts (USOA) for electric utilities.',
      'FTE counts represent full-time equivalent employees assigned to each expense category.',
      'Budget variances exceeding ±10% require explanatory notes per AUC Rule 005 Section 5.3.',
    ],
  },
  oeb_dsp_asset_condition: {
    id: 'oeb_dsp_asset_condition',
    name: 'Section 5.2 — Asset Condition Assessment',
    jurisdiction: 'Ontario',
    regulation: 'OEB Chapter 5 DSP',
    description: 'Asset condition summary by asset class, including health index scores, age demographics, and replacement planning per OEB Appendix 2-AB methodology.',
    columns: [
      { key: 'asset_class', label: 'Asset Class', type: 'string' },
      { key: 'asset_category', label: 'Category', type: 'string' },
      { key: 'total_units', label: 'Total Units', type: 'number' },
      { key: 'avg_age_years', label: 'Avg Age (yrs)', type: 'number' },
      { key: 'expected_life_years', label: 'Expected Life (yrs)', type: 'number' },
      { key: 'health_index_avg', label: 'Avg Health Index', type: 'number' },
      { key: 'condition_poor_pct', label: 'Poor (%)', type: 'percent' },
      { key: 'condition_fair_pct', label: 'Fair (%)', type: 'percent' },
      { key: 'condition_good_pct', label: 'Good (%)', type: 'percent' },
      { key: 'replacement_cost_cad', label: 'Replacement Cost ($)', type: 'number' },
      { key: 'planned_replacements', label: 'Planned Replacements', type: 'number' },
      { key: 'risk_priority', label: 'Risk Priority', type: 'string' },
    ],
    notes: [
      'Health Index scored 0-100 per OEB Appendix 2-AB Condition-Based Risk Management methodology.',
      'Condition categories: Good (HI ≥ 70), Fair (40-69), Poor (< 40).',
      'Risk Priority based on probability of failure × consequence of failure (OEB Chapter 5, Section 5.2.4).',
      'Replacement costs based on most recent engineering estimates, escalated by CPI where applicable.',
    ],
  },
  oeb_dsp_load_forecast: {
    id: 'oeb_dsp_load_forecast',
    name: 'Section 5.3 — System Capability (Load Forecast)',
    jurisdiction: 'Ontario',
    regulation: 'OEB Chapter 5 DSP',
    description: 'Five-year load forecast by planning zone, including peak demand, energy consumption, customer growth, and capacity utilization.',
    columns: [
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'zone', label: 'Planning Zone', type: 'string' },
      { key: 'peak_demand_mw', label: 'Peak Demand (MW)', type: 'number' },
      { key: 'energy_gwh', label: 'Energy (GWh)', type: 'number' },
      { key: 'customer_count', label: 'Customers', type: 'number' },
      { key: 'growth_rate_pct', label: 'Growth Rate (%)', type: 'percent' },
      { key: 'capacity_mw', label: 'Capacity (MW)', type: 'number' },
      { key: 'utilization_pct', label: 'Utilization (%)', type: 'percent' },
      { key: 'load_transfer_capability_mw', label: 'Load Transfer (MW)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    notes: [
      'Load forecast methodology per OEB Chapter 5, Section 5.3.1: multivariate regression with weather normalization.',
      'Peak demand weather-normalized to 1-in-10 year extreme temperature (Environment Canada data).',
      'Customer growth projections based on municipal planning data and building permit trends.',
      'Utilization > 80% triggers planning review per OEB capacity planning guidelines.',
    ],
  },
  oeb_dsp_reliability: {
    id: 'oeb_dsp_reliability',
    name: 'Section 5.4 — Customer Focus (Reliability)',
    jurisdiction: 'Ontario',
    regulation: 'OEB Chapter 5 DSP',
    description: 'Reliability performance metrics including SAIDI, SAIFI, CAIDI, and customer satisfaction indicators with multi-year trends.',
    columns: [
      { key: 'metric', label: 'Metric', type: 'string' },
      { key: 'unit', label: 'Unit', type: 'string' },
      { key: 'current_year', label: 'Current Year', type: 'number' },
      { key: 'prior_year_1', label: 'Year -1', type: 'number' },
      { key: 'prior_year_2', label: 'Year -2', type: 'number' },
      { key: 'prior_year_3', label: 'Year -3', type: 'number' },
      { key: 'oeb_target', label: 'OEB Target', type: 'number' },
      { key: 'industry_avg', label: 'Industry Avg', type: 'number' },
      { key: 'trend', label: 'Trend', type: 'string' },
    ],
    notes: [
      'SAIDI: System Average Interruption Duration Index (minutes/customer/year).',
      'SAIFI: System Average Interruption Frequency Index (interruptions/customer/year).',
      'CAIDI: Customer Average Interruption Duration Index = SAIDI / SAIFI.',
      'Excludes Major Event Days (MEDs) per IEEE 1366-2012 methodology.',
      'OEB targets based on 3rd quartile of Ontario LDC peer group performance.',
    ],
  },
  oeb_dsp_scenario_matrix: {
    id: 'oeb_dsp_scenario_matrix',
    name: 'Scenario Matrix — Low / Base / High',
    jurisdiction: 'Ontario',
    regulation: 'OEB Chapter 5 DSP',
    description: 'Side-by-side demand scenarios for planning and sensitivity review, aligned to low, base, and high growth assumptions.',
    columns: [
      { key: 'horizon_year', label: 'Horizon Year', type: 'number' },
      { key: 'scenario', label: 'Scenario', type: 'string' },
      { key: 'peak_demand_mw', label: 'Peak Demand (MW)', type: 'number' },
      { key: 'annual_energy_gwh', label: 'Energy (GWh)', type: 'number' },
      { key: 'delta_vs_base_mw', label: 'Delta vs Base (MW)', type: 'number' },
      { key: 'reliability_proxy_score', label: 'Reliability Proxy Score', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    notes: [
      'Scenario matrix supports low, base, and high planning cases for sensitivity analysis and filing support.',
      'Base scenario reflects the primary utility planning assumption pack; low and high cases must reference the same historical baseline.',
      'Reliability proxy score is advisory and should be supported with feeder-specific engineering review for major capital decisions.',
    ],
  },
  auc_dsp_data_schedule: {
    id: 'auc_dsp_data_schedule',
    name: 'Distribution Plan Data Schedule',
    jurisdiction: 'Alberta',
    regulation: 'AUC Distribution System Plan',
    description: 'Planning data schedule for Alberta distribution-system submissions, including growth, reliability, DER, and large-load overlays.',
    columns: [
      { key: 'horizon_year', label: 'Horizon Year', type: 'number' },
      { key: 'geography_id', label: 'Geography ID', type: 'string' },
      { key: 'geography_level', label: 'Geography Level', type: 'string' },
      { key: 'peak_demand_mw', label: 'Peak Demand (MW)', type: 'number' },
      { key: 'annual_energy_gwh', label: 'Energy (GWh)', type: 'number' },
      { key: 'customer_count', label: 'Customers', type: 'number' },
      { key: 'growth_rate_pct', label: 'Growth Rate (%)', type: 'percent' },
      { key: 'large_point_load_mw', label: 'Large Point-Load (MW)', type: 'number' },
      { key: 'industrial_opt_out_mw', label: 'Industrial Opt-Out (MW)', type: 'number' },
      { key: 'der_offset_mw', label: 'DER Offset (MW)', type: 'number' },
      { key: 'deferred_peak_load_mw', label: 'Deferred Peak Load (MW)', type: 'number' },
      { key: 'reliability_proxy_score', label: 'Reliability Proxy Score', type: 'number' },
      { key: 'hosting_capacity_limit_mw', label: 'Hosting Capacity Limit (MW)', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'string' },
    ],
    notes: [
      'Aligned to the Alberta distribution-system planning reporting direction introduced in Bulletin 2026-02.',
      'Large point-load, industrial opt-out, and DER fields isolate non-organic drivers of system need.',
      'Reliability proxy and hosting-capacity fields are advisory planning metrics and do not replace formal utility engineering studies.',
    ],
  },
};

// ============================================================================
// SAMPLE DATA GENERATORS
// ============================================================================

export function generateSampleRule005_4_2(): Rule005Schedule4_2_Row[] {
  return [
    { asset_category: 'Distribution Lines', asset_description: '25kV Overhead Primary', in_service_date: '2024-06-15', original_cost_cad: 2450000, accumulated_depreciation_cad: 735000, net_book_value_cad: 1715000, depreciation_rate_pct: 3.0, expected_life_years: 33, additions_current_year_cad: 450000, retirements_current_year_cad: 85000 },
    { asset_category: 'Distribution Lines', asset_description: '15kV Underground Cable', in_service_date: '2023-09-01', original_cost_cad: 1850000, accumulated_depreciation_cad: 370000, net_book_value_cad: 1480000, depreciation_rate_pct: 2.5, expected_life_years: 40, additions_current_year_cad: 320000, retirements_current_year_cad: 0 },
    { asset_category: 'Substations', asset_description: 'Distribution Substation — 72kV/25kV', in_service_date: '2020-03-20', original_cost_cad: 4200000, accumulated_depreciation_cad: 630000, net_book_value_cad: 3570000, depreciation_rate_pct: 2.5, expected_life_years: 40, additions_current_year_cad: 180000, retirements_current_year_cad: 0 },
    { asset_category: 'Transformers', asset_description: 'Pole-mount 25kV/240V (fleet)', in_service_date: '2015-01-01', original_cost_cad: 3100000, accumulated_depreciation_cad: 1085000, net_book_value_cad: 2015000, depreciation_rate_pct: 3.5, expected_life_years: 29, additions_current_year_cad: 275000, retirements_current_year_cad: 120000 },
    { asset_category: 'Meters', asset_description: 'AMI Smart Meters', in_service_date: '2022-01-15', original_cost_cad: 1200000, accumulated_depreciation_cad: 240000, net_book_value_cad: 960000, depreciation_rate_pct: 5.0, expected_life_years: 20, additions_current_year_cad: 150000, retirements_current_year_cad: 45000 },
    { asset_category: 'Vehicles & Equipment', asset_description: 'Bucket Trucks & Service Vehicles', in_service_date: '2023-04-01', original_cost_cad: 890000, accumulated_depreciation_cad: 178000, net_book_value_cad: 712000, depreciation_rate_pct: 10.0, expected_life_years: 10, additions_current_year_cad: 210000, retirements_current_year_cad: 95000 },
    { asset_category: 'IT Systems', asset_description: 'SCADA/DMS and OT Network', in_service_date: '2021-07-01', original_cost_cad: 650000, accumulated_depreciation_cad: 195000, net_book_value_cad: 455000, depreciation_rate_pct: 14.3, expected_life_years: 7, additions_current_year_cad: 120000, retirements_current_year_cad: 0 },
    { asset_category: 'Land & Buildings', asset_description: 'Operations Centre', in_service_date: '2005-01-01', original_cost_cad: 1500000, accumulated_depreciation_cad: 600000, net_book_value_cad: 900000, depreciation_rate_pct: 2.0, expected_life_years: 50, additions_current_year_cad: 0, retirements_current_year_cad: 0 },
  ];
}

export function generateSampleRule005_10(): Rule005Schedule10_Row[] {
  return [
    { line_item: 'Distribution Tariff Revenue', category: 'revenue', current_year_cad: 8500000, prior_year_cad: 8100000, variance_cad: 400000, variance_pct: 4.9, notes: 'Rate increase per AUC Decision' },
    { line_item: 'Transmission Revenue', category: 'revenue', current_year_cad: 2100000, prior_year_cad: 2050000, variance_cad: 50000, variance_pct: 2.4, notes: '' },
    { line_item: 'Other Regulated Revenue', category: 'revenue', current_year_cad: 350000, prior_year_cad: 320000, variance_cad: 30000, variance_pct: 9.4, notes: 'Includes pole attachment fees' },
    { line_item: 'Operating & Maintenance', category: 'expense', current_year_cad: 4200000, prior_year_cad: 3950000, variance_cad: 250000, variance_pct: 6.3, notes: 'Vegetation management increase' },
    { line_item: 'Depreciation & Amortization', category: 'expense', current_year_cad: 1800000, prior_year_cad: 1720000, variance_cad: 80000, variance_pct: 4.7, notes: '' },
    { line_item: 'Property & Other Taxes', category: 'tax', current_year_cad: 420000, prior_year_cad: 400000, variance_cad: 20000, variance_pct: 5.0, notes: '' },
    { line_item: 'Income Tax', category: 'tax', current_year_cad: 650000, prior_year_cad: 620000, variance_cad: 30000, variance_pct: 4.8, notes: '' },
    { line_item: 'Net Income', category: 'net_income', current_year_cad: 3880000, prior_year_cad: 3780000, variance_cad: 100000, variance_pct: 2.6, notes: '' },
  ];
}

export function generateSampleOEB_AssetCondition(): OEB_DSP_AssetCondition_Row[] {
  return [
    { asset_class: 'Overhead System', asset_category: 'Wood Poles', total_units: 4200, avg_age_years: 28, expected_life_years: 50, health_index_avg: 62, condition_poor_pct: 12, condition_fair_pct: 35, condition_good_pct: 53, replacement_cost_cad: 5040000, planned_replacements: 85, risk_priority: 'medium' },
    { asset_class: 'Overhead System', asset_category: 'Conductor (Primary)', total_units: 185, avg_age_years: 22, expected_life_years: 45, health_index_avg: 71, condition_poor_pct: 5, condition_fair_pct: 28, condition_good_pct: 67, replacement_cost_cad: 2960000, planned_replacements: 12, risk_priority: 'low' },
    { asset_class: 'Underground System', asset_category: 'Underground Cable', total_units: 95, avg_age_years: 18, expected_life_years: 40, health_index_avg: 75, condition_poor_pct: 3, condition_fair_pct: 22, condition_good_pct: 75, replacement_cost_cad: 1900000, planned_replacements: 5, risk_priority: 'low' },
    { asset_class: 'Stations', asset_category: 'Distribution Transformers', total_units: 320, avg_age_years: 24, expected_life_years: 35, health_index_avg: 58, condition_poor_pct: 18, condition_fair_pct: 32, condition_good_pct: 50, replacement_cost_cad: 4800000, planned_replacements: 45, risk_priority: 'high' },
    { asset_class: 'Stations', asset_category: 'Switchgear', total_units: 48, avg_age_years: 20, expected_life_years: 30, health_index_avg: 65, condition_poor_pct: 10, condition_fair_pct: 30, condition_good_pct: 60, replacement_cost_cad: 1440000, planned_replacements: 8, risk_priority: 'medium' },
    { asset_class: 'Stations', asset_category: 'Protection & Control', total_units: 96, avg_age_years: 12, expected_life_years: 20, health_index_avg: 72, condition_poor_pct: 5, condition_fair_pct: 23, condition_good_pct: 72, replacement_cost_cad: 960000, planned_replacements: 10, risk_priority: 'low' },
    { asset_class: 'Metering', asset_category: 'Revenue Meters', total_units: 12500, avg_age_years: 8, expected_life_years: 20, health_index_avg: 82, condition_poor_pct: 2, condition_fair_pct: 12, condition_good_pct: 86, replacement_cost_cad: 3125000, planned_replacements: 200, risk_priority: 'low' },
  ];
}

export function generateSampleOEB_LoadForecast(): OEB_DSP_LoadForecast_Row[] {
  const baseYear = 2026;
  const zones = ['North', 'South', 'Central'];
  const rows: OEB_DSP_LoadForecast_Row[] = [];
  zones.forEach(zone => {
    const basePeak = zone === 'North' ? 45 : zone === 'South' ? 78 : 62;
    const baseEnergy = zone === 'North' ? 195 : zone === 'South' ? 340 : 270;
    const baseCustomers = zone === 'North' ? 3200 : zone === 'South' ? 5800 : 4500;
    const growth = zone === 'North' ? 0.8 : zone === 'South' ? 1.5 : 1.2;
    const capacity = zone === 'North' ? 60 : zone === 'South' ? 95 : 80;

    for (let y = 0; y < 5; y++) {
      const yearMultiplier = Math.pow(1 + growth / 100, y);
      rows.push({
        year: baseYear + y,
        zone,
        peak_demand_mw: Math.round(basePeak * yearMultiplier * 10) / 10,
        energy_gwh: Math.round(baseEnergy * yearMultiplier * 10) / 10,
        customer_count: Math.round(baseCustomers * yearMultiplier),
        growth_rate_pct: growth,
        capacity_mw: capacity,
        utilization_pct: Math.round((basePeak * yearMultiplier / capacity) * 1000) / 10,
        load_transfer_capability_mw: Math.round(capacity * 0.15),
        notes: (basePeak * yearMultiplier / capacity) > 0.8 ? 'Capacity trigger — planning review required' : '',
      });
    }
  });
  return rows;
}

export function generateSampleOEB_Reliability(): OEB_DSP_Reliability_Row[] {
  return [
    { metric: 'SAIDI (excl. MED)', unit: 'minutes/customer', current_year: 1.82, prior_year_1: 1.95, prior_year_2: 2.10, prior_year_3: 2.25, oeb_target: 2.30, industry_avg: 2.45, trend: 'improving' },
    { metric: 'SAIFI (excl. MED)', unit: 'interruptions/customer', current_year: 1.15, prior_year_1: 1.22, prior_year_2: 1.28, prior_year_3: 1.35, oeb_target: 1.40, industry_avg: 1.52, trend: 'improving' },
    { metric: 'CAIDI', unit: 'hours', current_year: 1.58, prior_year_1: 1.60, prior_year_2: 1.64, prior_year_3: 1.67, oeb_target: null, industry_avg: 1.61, trend: 'improving' },
    { metric: 'Worst Performing Feeders', unit: 'count', current_year: 3, prior_year_1: 4, prior_year_2: 5, prior_year_3: 6, oeb_target: null, industry_avg: null, trend: 'improving' },
    { metric: 'Customer Satisfaction', unit: '% satisfied', current_year: 87.5, prior_year_1: 85.2, prior_year_2: 84.0, prior_year_3: 82.8, oeb_target: 80.0, industry_avg: 83.5, trend: 'improving' },
    { metric: 'Billing Accuracy', unit: '%', current_year: 99.85, prior_year_1: 99.80, prior_year_2: 99.78, prior_year_3: 99.72, oeb_target: 99.70, industry_avg: 99.75, trend: 'stable' },
    { metric: 'Telephone Accessibility', unit: '% answered < 30s', current_year: 78.5, prior_year_1: 76.0, prior_year_2: 74.5, prior_year_3: 72.0, oeb_target: 65.0, industry_avg: 72.0, trend: 'improving' },
  ];
}

export function generateSampleOEB_ScenarioMatrix(): OEB_DSP_ScenarioMatrix_Row[] {
  return [
    { horizon_year: 1, scenario: 'low', peak_demand_mw: 72.5, annual_energy_gwh: 315.2, delta_vs_base_mw: -2.8, reliability_proxy_score: 88, notes: 'Lower electrification and stronger DER offset.' },
    { horizon_year: 1, scenario: 'base', peak_demand_mw: 75.3, annual_energy_gwh: 320.1, delta_vs_base_mw: 0, reliability_proxy_score: 84, notes: 'Base planning case.' },
    { horizon_year: 1, scenario: 'high', peak_demand_mw: 79.4, annual_energy_gwh: 329.6, delta_vs_base_mw: 4.1, reliability_proxy_score: 78, notes: 'Higher committed loads and faster EV adoption.' },
    { horizon_year: 5, scenario: 'low', peak_demand_mw: 78.1, annual_energy_gwh: 333.4, delta_vs_base_mw: -4.6, reliability_proxy_score: 84, notes: 'Lower growth sensitivity case.' },
    { horizon_year: 5, scenario: 'base', peak_demand_mw: 82.7, annual_energy_gwh: 341.8, delta_vs_base_mw: 0, reliability_proxy_score: 79, notes: 'Base planning case.' },
    { horizon_year: 5, scenario: 'high', peak_demand_mw: 89.6, annual_energy_gwh: 358.0, delta_vs_base_mw: 6.9, reliability_proxy_score: 72, notes: 'Large-load and electrification upside.' },
  ];
}

export function generateSampleAucDspDataSchedule(): AUC_DSP_DataSchedule_Row[] {
  return [
    { horizon_year: 1, geography_id: 'AB-FEEDER-1', geography_level: 'feeder', peak_demand_mw: 24.5, annual_energy_gwh: 97.2, customer_count: 4800, growth_rate_pct: 1.7, large_point_load_mw: 6, industrial_opt_out_mw: 0, der_offset_mw: 1.4, deferred_peak_load_mw: 1.1, reliability_proxy_score: 82, hosting_capacity_limit_mw: 3.5, notes: 'Residential feeder with EV growth.' },
    { horizon_year: 1, geography_id: 'AB-FEEDER-3', geography_level: 'feeder', peak_demand_mw: 28.8, annual_energy_gwh: 108.6, customer_count: 190, growth_rate_pct: 1.7, large_point_load_mw: 8, industrial_opt_out_mw: 2, der_offset_mw: 0.8, deferred_peak_load_mw: 0.9, reliability_proxy_score: 76, hosting_capacity_limit_mw: 4.5, notes: 'Industrial feeder with BYOP sensitivity.' },
    { horizon_year: 5, geography_id: 'AB-FEEDER-1', geography_level: 'feeder', peak_demand_mw: 27.4, annual_energy_gwh: 102.4, customer_count: 5120, growth_rate_pct: 1.7, large_point_load_mw: 8, industrial_opt_out_mw: 0, der_offset_mw: 2.1, deferred_peak_load_mw: 1.4, reliability_proxy_score: 77, hosting_capacity_limit_mw: 3.5, notes: 'Peak review required before reinforcement deferral.' },
    { horizon_year: 5, geography_id: 'AB-FEEDER-3', geography_level: 'feeder', peak_demand_mw: 32.5, annual_energy_gwh: 115.8, customer_count: 205, growth_rate_pct: 1.7, large_point_load_mw: 10, industrial_opt_out_mw: 3, der_offset_mw: 1.1, deferred_peak_load_mw: 1.0, reliability_proxy_score: 69, hosting_capacity_limit_mw: 4.5, notes: 'BYOP and industrial self-supply both materially affect planning case.' },
  ];
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function templateToCSV(template: TemplateDefinition, data: Record<string, unknown>[]): string {
  const headers = template.columns.map(c => c.label);
  const rows = data.map(row =>
    template.columns.map(col => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (col.type === 'number') return typeof val === 'number' ? val.toFixed(2) : String(val);
      if (col.type === 'percent') return typeof val === 'number' ? val.toFixed(1) : String(val);
      return String(val);
    }).join(',')
  );

  const noteLines = template.notes.map((n, i) => `# Note ${i + 1}: ${n}`);
  const header = [
    `# ${template.regulation} — ${template.name}`,
    `# Jurisdiction: ${template.jurisdiction}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Description: ${template.description}`,
    ...noteLines,
    '',
  ];

  return [...header, headers.join(','), ...rows].join('\n');
}

export function generateAllTemplatesZip(): { filename: string; content: string }[] {
  return [
    { filename: 'AUC_Rule005_Schedule_4_2_Capital_Additions.csv', content: templateToCSV(REGULATORY_TEMPLATES.rule005_schedule_4_2, generateSampleRule005_4_2() as unknown as Record<string, unknown>[]) },
    { filename: 'AUC_Rule005_Schedule_10_Income_Statement.csv', content: templateToCSV(REGULATORY_TEMPLATES.rule005_schedule_10, generateSampleRule005_10() as unknown as Record<string, unknown>[]) },
    { filename: 'AUC_DSP_Data_Schedule.csv', content: templateToCSV(REGULATORY_TEMPLATES.auc_dsp_data_schedule, generateSampleAucDspDataSchedule() as unknown as Record<string, unknown>[]) },
    { filename: 'OEB_DSP_Section_5_2_Asset_Condition.csv', content: templateToCSV(REGULATORY_TEMPLATES.oeb_dsp_asset_condition, generateSampleOEB_AssetCondition() as unknown as Record<string, unknown>[]) },
    { filename: 'OEB_DSP_Section_5_3_Load_Forecast.csv', content: templateToCSV(REGULATORY_TEMPLATES.oeb_dsp_load_forecast, generateSampleOEB_LoadForecast() as unknown as Record<string, unknown>[]) },
    { filename: 'OEB_DSP_Section_5_4_Reliability.csv', content: templateToCSV(REGULATORY_TEMPLATES.oeb_dsp_reliability, generateSampleOEB_Reliability() as unknown as Record<string, unknown>[]) },
    { filename: 'OEB_DSP_Scenario_Matrix.csv', content: templateToCSV(REGULATORY_TEMPLATES.oeb_dsp_scenario_matrix, generateSampleOEB_ScenarioMatrix() as unknown as Record<string, unknown>[]) },
  ];
}
