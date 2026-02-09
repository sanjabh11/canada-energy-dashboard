/**
 * AI Data Centre Dashboard — shared types, constants, and fallback data
 */

export interface AIDataCentre {
  id: string;
  facility_name: string;
  operator: string;
  location_city: string;
  province: string;
  status: string;
  contracted_capacity_mw: number;
  average_load_mw: number;
  pue_design: number;
  pue_actual: number;
  cooling_technology: string;
  power_source: string;
  renewable_percentage: number;
  capital_investment_cad: number;
  offgrid: boolean;
  latitude: number;
  longitude: number;
}

export interface QueueProject {
  id: string;
  project_name: string;
  proponent: string;
  project_type: string;
  requested_capacity_mw: number;
  phase_allocation: string;
  allocated_capacity_mw: number;
  study_phase: string;
  expected_in_service_date: string;
  status: string;
}

export interface DashboardData {
  data_centres: AIDataCentre[];
  summary: {
    total_count: number;
    total_contracted_capacity_mw: number;
    operational_capacity_mw: number;
    queued_capacity_mw: number;
    by_status: Record<string, number>;
    by_operator: Record<string, { count: number; total_capacity_mw: number }>;
    average_pue: number;
  };
  grid_impact: {
    current_peak_demand_mw: number;
    total_dc_load_mw: number;
    dc_percentage_of_peak: number;
    total_queue_mw: number;
    dc_queue_mw: number;
    reliability_rating: string;
    phase1_allocated_mw: number;
    phase1_remaining_mw: number;
  };
  power_consumption: any[];
}

export interface QueueData {
  queue: QueueProject[];
  summary: {
    total_projects: number;
    total_requested_mw: number;
    phase1_allocated_mw: number;
    phase1_remaining_mw: number;
    by_type: Record<string, { count: number; total_mw: number }>;
    by_phase: Record<string, { count: number; total_mw: number; allocated_mw: number }>;
  };
  insights: {
    data_centre_dominance: {
      dc_projects: number;
      dc_mw: number;
      dc_percentage_of_queue: number;
    };
    phase1_allocation_status: {
      limit_mw: number;
      allocated_mw: number;
      remaining_mw: number;
      utilization_percentage: number;
      is_fully_allocated: boolean;
    };
    grid_reliability_concern: {
      queue_to_peak_ratio: number;
      message: string;
    };
  };
}

export interface QueueHistorySnapshot {
  id: string;
  snapshot_date: string;
  snapshot_month: string;
  total_projects: number;
  total_requested_mw: number;
  total_allocated_mw: number;
  dc_projects: number;
  dc_requested_mw: number;
  dc_allocated_mw: number;
  dc_percentage_of_queue: number;
  phase1_allocated_mw: number;
  phase1_remaining_mw: number;
  phase1_utilization_percent: number;
  queue_to_peak_ratio: number;
  average_wait_time_days: number;
  by_project_type: Record<string, { count: number; total_mw: number }>;
  data_source: string;
  notes: string;
}

export interface QueueHistoryData {
  history: QueueHistorySnapshot[];
  metadata: {
    last_updated: string;
    data_source: string;
    snapshots_available: number;
  };
}

export interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

export const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
};

export const STATUS_COLORS: Record<string, string> = {
  'Operational': COLORS.success,
  'Under Construction': COLORS.warning,
  'Interconnection Queue': COLORS.primary,
  'Proposed': '#94a3b8',
  'Commissioning': COLORS.teal,
};

export const PROVINCE_NAMES: Record<string, string> = {
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'ON': 'Ontario',
  'QC': 'Quebec',
  'MB': 'Manitoba',
  'SK': 'Saskatchewan',
  'NS': 'Nova Scotia',
  'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador',
  'PE': 'Prince Edward Island',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut',
  'YT': 'Yukon',
};

export function getProvinceName(code: string): string {
  return PROVINCE_NAMES[code] || code;
}

export const STATIC_FALLBACK_DC_DATA: DashboardData = {
  data_centres: [
    {
      id: 'demo-1',
      facility_name: 'Aurora Data Campus',
      operator: 'Amazon Web Services',
      location_city: 'Calgary',
      province: 'AB',
      status: 'Operational',
      contracted_capacity_mw: 250,
      average_load_mw: 185,
      pue_design: 1.25,
      pue_actual: 1.28,
      cooling_technology: 'Free-air cooling',
      power_source: 'Grid + Solar PPA',
      renewable_percentage: 45,
      capital_investment_cad: 850000000,
      offgrid: false,
      latitude: 51.0447,
      longitude: -114.0719,
    },
    {
      id: 'demo-2',
      facility_name: 'Chinook AI Facility',
      operator: 'Google',
      location_city: 'Edmonton',
      province: 'AB',
      status: 'Under Construction',
      contracted_capacity_mw: 400,
      average_load_mw: 0,
      pue_design: 1.20,
      pue_actual: 0,
      cooling_technology: 'Evaporative cooling',
      power_source: 'Grid + Wind PPA',
      renewable_percentage: 60,
      capital_investment_cad: 1200000000,
      offgrid: false,
      latitude: 53.5461,
      longitude: -113.4937,
    },
    {
      id: 'demo-3',
      facility_name: 'Northern Lights DC',
      operator: 'Microsoft',
      location_city: 'Red Deer',
      province: 'AB',
      status: 'Interconnection Queue',
      contracted_capacity_mw: 350,
      average_load_mw: 0,
      pue_design: 1.18,
      pue_actual: 0,
      cooling_technology: 'Liquid cooling',
      power_source: 'Grid + Renewable PPAs',
      renewable_percentage: 75,
      capital_investment_cad: 980000000,
      offgrid: false,
      latitude: 52.2681,
      longitude: -113.8112,
    },
    {
      id: 'demo-4',
      facility_name: 'Prairie AI Hub',
      operator: 'Meta',
      location_city: 'Lethbridge',
      province: 'AB',
      status: 'Proposed',
      contracted_capacity_mw: 500,
      average_load_mw: 0,
      pue_design: 1.15,
      pue_actual: 0,
      cooling_technology: 'Immersion cooling',
      power_source: 'Grid + Solar/Wind',
      renewable_percentage: 80,
      capital_investment_cad: 1500000000,
      offgrid: false,
      latitude: 49.6935,
      longitude: -112.8418,
    },
  ],
  summary: {
    total_count: 12,
    total_contracted_capacity_mw: 3850,
    operational_capacity_mw: 1250,
    queued_capacity_mw: 2600,
    by_status: {
      'Operational': 4,
      'Under Construction': 3,
      'Interconnection Queue': 3,
      'Proposed': 2,
    },
    by_operator: {
      'Amazon Web Services': { count: 3, total_capacity_mw: 750 },
      'Google': { count: 2, total_capacity_mw: 600 },
      'Microsoft': { count: 3, total_capacity_mw: 850 },
      'Meta': { count: 2, total_capacity_mw: 900 },
      'Other': { count: 2, total_capacity_mw: 750 },
    },
    average_pue: 1.28,
  },
  grid_impact: {
    current_peak_demand_mw: 12100,
    total_dc_load_mw: 425,
    dc_percentage_of_peak: 3.51,
    total_queue_mw: 10500,
    dc_queue_mw: 4200,
    reliability_rating: 'Strained',
    phase1_allocated_mw: 1200,
    phase1_remaining_mw: 0,
  },
  power_consumption: [],
};

export const STATIC_FALLBACK_QUEUE_DATA: QueueData = {
  queue: [],
  summary: {
    total_projects: 85,
    total_requested_mw: 10500,
    phase1_allocated_mw: 1200,
    phase1_remaining_mw: 0,
    by_type: {
      'AI Data Centre': { count: 23, total_mw: 4200 },
      'Solar': { count: 28, total_mw: 2100 },
      'Wind': { count: 18, total_mw: 2500 },
      'Battery Storage': { count: 16, total_mw: 1700 },
    },
    by_phase: {
      'Phase 1 (1200 MW)': { count: 12, total_mw: 1200, allocated_mw: 1200 },
      'Phase 2': { count: 73, total_mw: 9300, allocated_mw: 0 },
    },
  },
  insights: {
    data_centre_dominance: {
      dc_projects: 23,
      dc_mw: 4200,
      dc_percentage_of_queue: 40,
    },
    phase1_allocation_status: {
      limit_mw: 1200,
      allocated_mw: 1200,
      remaining_mw: 0,
      utilization_percentage: 100,
      is_fully_allocated: true,
    },
    grid_reliability_concern: {
      queue_to_peak_ratio: 87,
      message: 'Queue represents significant portion of provincial demand - reliability planning critical',
    },
  },
};
