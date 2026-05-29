import type { ConstructedScenarioBundle } from '../components/ConstructedScenarioPanel';
import {
  utilityRowsToCsv,
  type UtilityHistoricalLoadRow,
  type UtilityJurisdiction,
  type UtilityPlanningScenario,
} from './utilityForecasting';

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function buildUtilityRows(jurisdiction: UtilityJurisdiction, variant: 'ontario_ldc' | 'alberta_municipal'): UtilityHistoricalLoadRow[] {
  const rows: UtilityHistoricalLoadRow[] = [];
  const startYear = 2024;
  const baseDemand = variant === 'ontario_ldc' ? 84 : 69;
  const monthlyGrowth = variant === 'ontario_ldc' ? 0.007 : 0.009;
  const shockMonth = variant === 'ontario_ldc' ? 14 : 11;
  const feeders = variant === 'ontario_ldc'
    ? [
        { geography_id: 'ON-LDC-SUB-1', customer_class: 'residential', share: 0.37, customerCount: 6900 },
        { geography_id: 'ON-LDC-SUB-2', customer_class: 'commercial', share: 0.33, customerCount: 2100 },
        { geography_id: 'ON-LDC-SUB-3', customer_class: 'industrial', share: 0.30, customerCount: 310 },
      ]
    : [
        { geography_id: 'AB-MUNI-SUB-1', customer_class: 'residential', share: 0.32, customerCount: 5400 },
        { geography_id: 'AB-MUNI-SUB-2', customer_class: 'commercial', share: 0.29, customerCount: 1750 },
        { geography_id: 'AB-MUNI-SUB-3', customer_class: 'industrial', share: 0.39, customerCount: 160 },
      ];

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const timestamp = new Date(Date.UTC(startYear + Math.floor(monthIndex / 12), monthIndex % 12, 1)).toISOString();
    const seasonal = 1 + Math.sin(((monthIndex % 12) / 12) * Math.PI * 2) * (variant === 'ontario_ldc' ? 0.08 : 0.06);
    const trend = 1 + (monthIndex * monthlyGrowth);
    const growthShock = monthIndex >= shockMonth ? (variant === 'ontario_ldc' ? 1.065 : 1.082) : 1;
    const weatherStress = variant === 'ontario_ldc'
      ? (monthIndex === 1 || monthIndex === 13 ? 1.07 : monthIndex === 7 ? 1.03 : 1)
      : (monthIndex === 0 || monthIndex === 12 ? 1.06 : monthIndex === 6 ? 1.04 : 1);
    const efficiencyOffset = variant === 'ontario_ldc' ? 0.985 : 0.99;

    for (const feeder of feeders) {
      const demandMw = round(baseDemand * feeder.share * seasonal * trend * growthShock * weatherStress * efficiencyOffset);
      rows.push({
        timestamp,
        geography_level: 'substation',
        geography_id: feeder.geography_id,
        customer_class: feeder.customer_class,
        demand_mw: demandMw,
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        temperature_c: null,
        net_load_mw: null,
        gross_load_mw: null,
        customer_count: feeder.customerCount,
        source_system: 'constructed_commercial_scenario',
        substation_id: feeder.geography_id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

export interface UtilityConstructedScenarioBundle extends ConstructedScenarioBundle {
  sourceLabel: string;
  scenarioOverrides: Partial<UtilityPlanningScenario>;
}

const ontarioUtilityRows = buildUtilityRows('Ontario', 'ontario_ldc');
const albertaUtilityRows = buildUtilityRows('Alberta', 'alberta_municipal');

export const UTILITY_CONSTRUCTED_SCENARIOS: UtilityConstructedScenarioBundle[] = [
  {
    id: 'ontario-ldc-dsp',
    title: 'Ontario LDC DSP planning case',
    buyerType: 'Ontario LDC planning director or Chapter 5 consultant',
    jurisdiction: 'Ontario',
    summary: '24 months of substation-level monthly history with winter peaking, electrification growth, and one medium-voltage load step-up.',
    realisticBasis: 'Built to resemble a rebasing-cycle Ontario LDC case under OEB Chapter 5 and IESO 2026 demand-growth conditions, including one visible load-growth shock and seasonal weather pressure.',
    expectedArtifact: 'Board-ready planning memo, benchmark appendix, OEB scenario matrix, and utility-security attachment.',
    disclosure: 'Constructed commercial scenario. Based on realistic Ontario utility-planning assumptions, but not a customer file, production approval artifact, or audited utility record.',
    loadLabel: 'Load Ontario DSP case',
    downloads: [
      {
        id: 'ontario-ldc-dsp-csv',
        label: 'Download Ontario scenario CSV',
        filename: 'constructed_ontario_ldc_dsp_case.csv',
        mimeType: 'text/csv;charset=utf-8;',
        content: utilityRowsToCsv(ontarioUtilityRows),
        description: 'Monthly utility history for the Ontario LDC DSP scenario.',
      },
    ],
    sourceLabel: 'Constructed Ontario LDC DSP planning case',
    scenarioOverrides: {
      jurisdiction: 'Ontario',
      annual_load_growth_pct: 1.85,
      committed_load_mw: 5.8,
      ev_growth_mw: 3.9,
      heat_pump_growth_mw: 3.2,
      der_offset_mw: 1.3,
      demand_response_reduction_mw: 1.1,
      demand_response_shift_pct: 4.5,
      capacity_buffer_pct: 18,
    },
  },
  {
    id: 'alberta-municipal-utility',
    title: 'Alberta municipal / utility planning case',
    buyerType: 'Municipal utility manager, REA planner, or Alberta distribution consultant',
    jurisdiction: 'Alberta',
    summary: '24 months of substation-level monthly history with winter demand, electrification growth, one treatment-plant step load, and moderate DER offsets.',
    realisticBasis: 'Built to resemble an Alberta municipal or regional utility planning file under current Alberta load-growth and large-load discussion conditions, with one explicit planning shock and stable monthly reporting cadence.',
    expectedArtifact: 'Planning memo PDF/HTML, benchmark appendix, AUC DSP data schedule, and utility-security attachment.',
    disclosure: 'Constructed commercial scenario. Based on realistic Alberta utility-planning assumptions, but not a customer file, production approval artifact, or audited engineering study.',
    loadLabel: 'Load Alberta municipal case',
    downloads: [
      {
        id: 'alberta-municipal-csv',
        label: 'Download Alberta scenario CSV',
        filename: 'constructed_alberta_municipal_planning_case.csv',
        mimeType: 'text/csv;charset=utf-8;',
        content: utilityRowsToCsv(albertaUtilityRows),
        description: 'Monthly utility history for the Alberta municipal planning scenario.',
      },
    ],
    sourceLabel: 'Constructed Alberta municipal utility planning case',
    scenarioOverrides: {
      jurisdiction: 'Alberta',
      annual_load_growth_pct: 2.15,
      committed_load_mw: 7.4,
      ev_growth_mw: 2.1,
      heat_pump_growth_mw: 1.2,
      der_offset_mw: 2.4,
      demand_response_reduction_mw: 1.5,
      demand_response_shift_pct: 5.2,
      capacity_buffer_pct: 20,
    },
  },
];

export const SHADOW_BILLING_CONSTRUCTED_SCENARIO: ConstructedScenarioBundle = {
  id: 'shadow-billing-municipal',
  title: 'Alberta municipal invoice comparison case',
  buyerType: 'Municipal facilities lead or public-sector energy manager',
  jurisdiction: 'Alberta',
  summary: '12 months of energy-supply invoice history with stable fixed charges, RoLR reference rates, and a visible savings gap in several winter months.',
  realisticBasis: 'Designed to resemble a small-public-sector bill file where the first paid question is supply-cost delta versus Alberta RoLR, not a full rider reconstruction project.',
  expectedArtifact: 'Invoice comparison memo, monthly delta CSV, and CFO summary.',
  disclosure: 'Constructed commercial scenario. Based on realistic Alberta municipal billing assumptions. It is not a customer invoice book, full tariff reconstruction, or audited procurement record.',
  loadLabel: 'Load municipal billing case',
  downloads: [
    {
      id: 'shadow-billing-csv',
      label: 'Download bill comparison CSV',
      filename: 'constructed_shadow_billing_case.csv',
      mimeType: 'text/csv;charset=utf-8;',
      content: [
        'billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad,fixed_charge_cad,retailer_name,rolr_rate_cents_per_kwh,pool_price_cents_per_kwh',
        '2026-01,24500,14.9,3650.50,275.00,Constructed municipal retailer,12.00,8.80',
        '2026-02,23100,14.9,3441.90,275.00,Constructed municipal retailer,12.00,8.30',
        '2026-03,21200,14.7,3116.40,275.00,Constructed municipal retailer,12.00,7.60',
        '2026-04,19850,14.5,2878.25,275.00,Constructed municipal retailer,12.00,6.90',
        '2026-05,18600,14.3,2659.80,275.00,Constructed municipal retailer,12.00,6.10',
        '2026-06,19150,14.1,2700.15,275.00,Constructed municipal retailer,12.00,6.40',
        '2026-07,21400,14.4,3081.60,275.00,Constructed municipal retailer,12.00,7.50',
        '2026-08,22350,14.6,3263.10,275.00,Constructed municipal retailer,12.00,8.20',
        '2026-09,20100,14.4,2894.40,275.00,Constructed municipal retailer,12.00,7.30',
        '2026-10,19450,14.5,2820.25,275.00,Constructed municipal retailer,12.00,6.80',
        '2026-11,20700,14.8,3063.60,275.00,Constructed municipal retailer,12.00,7.70',
        '2026-12,23950,15.1,3616.45,275.00,Constructed municipal retailer,12.00,8.90',
      ].join('\n'),
    },
  ],
};

export const CREDIT_BANKING_CONSTRUCTED_SCENARIO: ConstructedScenarioBundle = {
  id: 'credit-banking-industrial',
  title: 'Alberta industrial TIER credit-banking case',
  buyerType: 'Industrial compliance lead or CFO',
  jurisdiction: 'Alberta',
  summary: 'Constructed registry holdings with expiring lots and a three-year liability stack that leaves a visible coverage gap after allocation.',
  realisticBasis: 'Designed to mirror a medium-complexity Alberta industrial facility deciding whether to bank, allocate, or top up credits under current TIER planning conditions.',
  expectedArtifact: 'Credit position memo, compliance-year allocation schedule, and expiry-risk register.',
  disclosure: 'Constructed commercial scenario. Based on realistic Alberta TIER compliance assumptions. It is not a registry extract, broker quote, or verified compliance ledger.',
  loadLabel: 'Load industrial banking case',
  downloads: [
    {
      id: 'credit-holdings-csv',
      label: 'Download holdings ledger CSV',
      filename: 'constructed_credit_holdings.csv',
      mimeType: 'text/csv;charset=utf-8;',
      content: [
        'id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status',
        'lot-1,EPC,2024,2400,22.50,2025-01-14,2028,active',
        'lot-2,EPC,2025,5100,24.20,2025-09-08,2030,active',
        'lot-3,Offset,2024,1800,27.10,2025-02-11,2028,active',
        'lot-4,EPC,2023,950,33.80,2024-07-16,2027,active',
      ].join('\n'),
    },
    {
      id: 'credit-liabilities-csv',
      label: 'Download liability CSV',
      filename: 'constructed_credit_liabilities.csv',
      mimeType: 'text/csv;charset=utf-8;',
      content: [
        'year,liability',
        '2026,3200',
        '2027,4100',
        '2028,4900',
      ].join('\n'),
    },
  ],
};

const aiceiJsonRows = [
  {
    id: 'aicei-constructed-1',
    name: 'Treaty 8 Community Solar Expansion',
    reporting_period: 'Q1 2026',
    community: 'Wood Buffalo region',
    technology: 'solar-storage',
    generation_kwh: 68400,
    baseline_ghg: 38,
    actual_ghg: 19,
    capacity_building_activities: ['Energy steward training', 'Electrical apprenticeship intake'],
    participants_count: 18,
    participants_hours: 42,
    community_approval_status: 'approved',
    owner_supplied_notes: 'Community energy office confirmed approval in January review cycle.',
  },
  {
    id: 'aicei-constructed-2',
    name: 'Northern Heat Recovery Upgrade',
    reporting_period: 'Q1 2026',
    community: 'Treaty 8 region',
    technology: 'heat-recovery',
    generation_kwh: 40200,
    baseline_ghg: 29,
    actual_ghg: 17,
    capacity_building_activities: ['Operations refresher'],
    participants_count: 9,
    participants_hours: 16,
    community_approval_status: 'pending',
    owner_supplied_notes: 'Chief and Council sign-off pending at quarter close.',
  },
  {
    id: 'aicei-constructed-3',
    name: 'Community Battery Readiness Pilot',
    reporting_period: 'Q1 2026',
    community: 'Northern Alberta Nation',
    technology: 'battery-storage',
    generation_kwh: 18500,
    baseline_ghg: 14,
    actual_ghg: 13,
    capacity_building_activities: [],
    participants_count: 5,
    participants_hours: 8,
    community_approval_status: 'owner_supplied',
    owner_supplied_notes: 'Reporting gap left visible on purpose to demonstrate approval and activity checklist behavior.',
  },
];

export const AICEI_CONSTRUCTED_SCENARIO: ConstructedScenarioBundle = {
  id: 'aicei-portfolio',
  title: 'Constructed AICEI Alberta portfolio',
  buyerType: 'Indigenous clean-energy project manager or grant coordinator',
  jurisdiction: 'Alberta',
  summary: 'Three-project Alberta reporting cycle with one approved project, one pending approval, and one visible reporting gap.',
  realisticBasis: 'Designed to mirror quarterly AICEI reporting pressure: generation, GHG reduction, training, and governance review in one Alberta-specific pack.',
  expectedArtifact: 'Quarterly report PDF/HTML, metrics CSV, and missing-approvals checklist.',
  disclosure: 'Constructed commercial scenario. Based on realistic Alberta Indigenous clean-energy reporting assumptions. It is not a Nation-owned project file or approved community governance record.',
  loadLabel: 'Load AICEI reporting case',
  downloads: [
    {
      id: 'aicei-json',
      label: 'Download AICEI JSON',
      filename: 'constructed_aicei_portfolio.json',
      mimeType: 'application/json;charset=utf-8;',
      content: JSON.stringify(aiceiJsonRows, null, 2),
    },
    {
      id: 'aicei-csv',
      label: 'Download AICEI CSV',
      filename: 'constructed_aicei_portfolio.csv',
      mimeType: 'text/csv;charset=utf-8;',
      content: [
        'id,name,reporting_period,community,technology,generation_kwh,baseline_ghg,actual_ghg,capacity_building_activities,participants_count,participants_hours,community_approval_status,owner_supplied_notes',
        ...aiceiJsonRows.map((row) => [
          row.id,
          `"${row.name}"`,
          row.reporting_period,
          `"${row.community}"`,
          row.technology,
          row.generation_kwh,
          row.baseline_ghg,
          row.actual_ghg,
          `"${row.capacity_building_activities.join('|')}"`,
          row.participants_count,
          row.participants_hours,
          row.community_approval_status,
          `"${row.owner_supplied_notes ?? ''}"`,
        ].join(',')),
      ].join('\n'),
    },
  ],
};

const funderJsonProjects = [
  {
    id: 'wah-constructed-1',
    name: 'Remote Solar and Storage Expansion',
    community: 'Mikisew Cree First Nation',
    territory_name: 'Treaty 8 Territory',
    energy_type: 'solar-storage',
    capacity_kw: 1200,
    project_status: 'construction',
    start_date: '2025-07-01',
    operational_date: '2026-10-15',
    total_budget: 3400000,
    actual_cost: 1960000,
    funding_sources: [
      { source: 'Wah-ila-toos', amount: 1800000 },
      { source: 'Community capital', amount: 650000 },
      { source: 'Provincial support', amount: 950000 },
    ],
    fpic_status: 'owner_supplied',
    jobs_created: 19,
    emissions_avoided_tonnes_co2: 1650,
    households_served: 235,
    milestones: [
      { name: 'Detailed design complete', date: '2025-11-18', completed: true },
      { name: 'Procurement awarded', date: '2026-01-22', completed: true },
      { name: 'Site civil works', date: '2026-04-11', completed: false },
    ],
    challenges: ['Winter access delays', 'Transformer delivery risk'],
    next_quarter_plans: ['Complete civil works', 'Finalize commissioning schedule'],
  },
  {
    id: 'wah-constructed-2',
    name: 'Diesel Displacement Heat Loop',
    community: 'Peerless Trout First Nation',
    territory_name: 'Treaty 8 Territory',
    energy_type: 'district-heat',
    capacity_kw: 650,
    project_status: 'planning',
    start_date: '2026-01-12',
    total_budget: 1850000,
    actual_cost: 420000,
    funding_sources: [
      { source: 'Wah-ila-toos', amount: 900000 },
      { source: 'Nation contribution', amount: 275000 },
    ],
    fpic_status: 'owner_supplied',
    jobs_created: 8,
    emissions_avoided_tonnes_co2: 510,
    households_served: 96,
    milestones: [
      { name: 'Community energy survey', date: '2026-02-08', completed: true },
      { name: 'Design options review', date: '2026-04-25', completed: false },
    ],
    challenges: ['Final budget confirmation pending'],
    next_quarter_plans: ['Close design review', 'Confirm partner procurement path'],
  },
];

export const FUNDER_REPORTING_CONSTRUCTED_SCENARIO: ConstructedScenarioBundle = {
  id: 'wah-ila-toos-constructed',
  title: 'Constructed Wah-ila-toos reporting case',
  buyerType: 'Community energy team or Wah-ila-toos reporting lead',
  jurisdiction: 'Canada',
  summary: 'Two-project Wah-ila-toos-first reporting set with visible FPIC, budget, milestone, and next-quarter fields ready for a quarterly review cycle.',
  realisticBasis: 'Designed to resemble the quarterly narrative and milestone pressure facing Indigenous clean-energy teams that need one clean report pack without adopting a full grant CRM.',
  expectedArtifact: 'Funder-ready quarterly report plus outreach-ready cover note.',
  disclosure: 'Constructed commercial scenario. Based on realistic clean-energy reporting assumptions, but not a community-approved submission package or official program-officer record.',
  loadLabel: 'Load Wah-ila-toos case',
  downloads: [
    {
      id: 'wah-ila-toos-json',
      label: 'Download project-set JSON',
      filename: 'constructed_wah_ila_toos_projects.json',
      mimeType: 'application/json;charset=utf-8;',
      content: JSON.stringify(funderJsonProjects, null, 2),
    },
  ],
};

export const LARGE_LOAD_CONSTRUCTED_SCENARIO = {
  id: 'large-load-readiness',
  title: 'Constructed Alberta large-load readiness case',
  buyerType: 'Large-load sponsor, site-selection lead, or utility planner',
  jurisdiction: 'Alberta',
  summary: 'One Alberta screening case sized for a large industrial or data-centre conversation with on-site generation and BYOP/storage offsets.',
  realisticBasis: 'Aligned to the current AESO large-load context where queue pressure, interim limits, and owner-entered assumptions shape the earliest commercial conversation.',
  expectedArtifact: 'Readiness summary and backlog checklist for one Alberta scenario.',
  disclosure: 'Constructed commercial scenario. This is a planning narrative only, not an engineering approval, queue position, or utility commitment.',
  loadLabel: 'Reload Alberta screening case',
  input: {
    requestedMw: 220,
    timelineBand: '12-24 months' as const,
    onSiteGenerationMw: 40,
    byopStorageContributionMw: 25,
  },
  downloads: [
    {
      id: 'large-load-json',
      label: 'Download scenario assumptions',
      filename: 'constructed_large_load_scenario.json',
      mimeType: 'application/json;charset=utf-8;',
      content: JSON.stringify({
        requested_mw: 220,
        timeline_band: '12-24 months',
        on_site_generation_mw: 40,
        byop_storage_contribution_mw: 25,
      }, null, 2),
    },
  ],
};
