/**
 * Asset Health Index Scoring Engine
 * 
 * Implements a CBRM-lite (Condition-Based Risk Management) methodology
 * for scoring utility distribution assets from CSV data.
 * 
 * NO SCADA/sensor dependency — works entirely from:
 * - Nameplate data (age, rated capacity, asset type)
 * - Maintenance records (date, type, count)
 * - Load measurements (periodic, from meter reads or manual)
 * - Environmental factors (indoor/outdoor, coastal/inland)
 * 
 * Scoring methodology:
 * - Health Index (HI): 0-100 composite score
 *   - Age Factor (30% weight): Normalized remaining life
 *   - Loading Factor (25% weight): Current load vs rated capacity
 *   - Maintenance Factor (25% weight): Recency and frequency of maintenance
 *   - Environment Factor (20% weight): Exposure and operating conditions
 * 
 * Risk Priority = Probability of Failure (from HI) × Consequence of Failure
 * 
 * References:
 * - OEB Appendix 2-AB: Asset Condition Assessment Methodology
 * - IEEE C57.104-2019: Dissolved Gas Analysis (transformer reference)
 * - IEC 60076: Power transformers assessment standards
 * - CBRM methodology (EA Technology / DNO practice)
 */

// ============================================================================
// TYPES
// ============================================================================

export type AssetType =
  | 'transformer_distribution'
  | 'transformer_power'
  | 'pole_wood'
  | 'pole_concrete'
  | 'pole_steel'
  | 'cable_underground'
  | 'conductor_overhead'
  | 'switchgear'
  | 'recloser'
  | 'capacitor_bank'
  | 'voltage_regulator'
  | 'meter_revenue'
  | 'protection_relay'
  | 'other';

export type EnvironmentFactor = 'indoor' | 'outdoor_sheltered' | 'outdoor_exposed' | 'coastal' | 'industrial' | 'arctic';
export type MaintenanceType = 'preventive' | 'corrective' | 'emergency' | 'inspection' | 'replacement';
export type RiskPriority = 'critical' | 'high' | 'medium' | 'low';
export type ConditionCategory = 'good' | 'fair' | 'poor' | 'very_poor';

export interface AssetRecord {
  asset_id: string;
  asset_name: string;
  asset_type: AssetType;
  install_date: string;
  rated_capacity_kva: number;
  current_load_kva: number;
  environment: EnvironmentFactor;
  last_maintenance_date: string;
  maintenance_count_5yr: number;
  emergency_maintenance_count_5yr: number;
  location: string;
  criticality: 'essential' | 'important' | 'standard';
  notes: string;
}

export interface AssetHealthResult {
  asset_id: string;
  asset_name: string;
  asset_type: AssetType;
  health_index: number;
  condition: ConditionCategory;
  risk_priority: RiskPriority;
  age_years: number;
  age_factor_score: number;
  loading_factor_score: number;
  maintenance_factor_score: number;
  environment_factor_score: number;
  loading_pct: number;
  remaining_life_pct: number;
  recommended_action: string;
  next_inspection_months: number;
}

export interface FleetSummary {
  total_assets: number;
  avg_health_index: number;
  condition_distribution: Record<ConditionCategory, number>;
  risk_distribution: Record<RiskPriority, number>;
  avg_age_years: number;
  avg_loading_pct: number;
  assets_needing_action: number;
  replacement_budget_estimate_cad: number;
  by_type: {
    asset_type: AssetType;
    count: number;
    avg_hi: number;
    avg_age: number;
  }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EXPECTED_LIFE_YEARS: Record<AssetType, number> = {
  transformer_distribution: 35,
  transformer_power: 45,
  pole_wood: 50,
  pole_concrete: 60,
  pole_steel: 70,
  cable_underground: 40,
  conductor_overhead: 45,
  switchgear: 30,
  recloser: 25,
  capacitor_bank: 20,
  voltage_regulator: 30,
  meter_revenue: 20,
  protection_relay: 20,
  other: 30,
};

const REPLACEMENT_COST_CAD: Record<AssetType, number> = {
  transformer_distribution: 15000,
  transformer_power: 250000,
  pole_wood: 1200,
  pole_concrete: 3500,
  pole_steel: 5000,
  cable_underground: 80000,  // per km
  conductor_overhead: 40000, // per km
  switchgear: 45000,
  recloser: 25000,
  capacitor_bank: 12000,
  voltage_regulator: 35000,
  meter_revenue: 250,
  protection_relay: 8000,
  other: 10000,
};

const ENVIRONMENT_MULTIPLIER: Record<EnvironmentFactor, number> = {
  indoor: 1.0,
  outdoor_sheltered: 0.9,
  outdoor_exposed: 0.75,
  coastal: 0.65,
  industrial: 0.7,
  arctic: 0.6,
};

const WEIGHT_AGE = 0.30;
const WEIGHT_LOADING = 0.25;
const WEIGHT_MAINTENANCE = 0.25;
const WEIGHT_ENVIRONMENT = 0.20;

// ============================================================================
// SCORING ENGINE
// ============================================================================

export function scoreAssetHealth(asset: AssetRecord): AssetHealthResult {
  const now = new Date();
  const installDate = new Date(asset.install_date);
  const age_years = Math.max(0, (now.getTime() - installDate.getTime()) / (365.25 * 24 * 3600_000));
  const expectedLife = EXPECTED_LIFE_YEARS[asset.asset_type] || 30;

  // 1. Age Factor (0-100): Higher = healthier
  const age_ratio = age_years / expectedLife;
  const age_factor_score = Math.max(0, Math.min(100,
    age_ratio <= 0.5 ? 100 :
    age_ratio <= 0.75 ? 100 - (age_ratio - 0.5) * 120 :
    age_ratio <= 1.0 ? 70 - (age_ratio - 0.75) * 200 :
    Math.max(0, 20 - (age_ratio - 1.0) * 40)
  ));

  // 2. Loading Factor (0-100): Higher = healthier
  const loading_pct = asset.rated_capacity_kva > 0
    ? (asset.current_load_kva / asset.rated_capacity_kva) * 100
    : 50;
  const loading_factor_score = Math.max(0, Math.min(100,
    loading_pct <= 50 ? 100 :
    loading_pct <= 75 ? 100 - (loading_pct - 50) * 0.8 :
    loading_pct <= 100 ? 80 - (loading_pct - 75) * 1.6 :
    Math.max(0, 40 - (loading_pct - 100) * 2.0)
  ));

  // 3. Maintenance Factor (0-100): Based on recency and emergency ratio
  const lastMaintDate = new Date(asset.last_maintenance_date);
  const monthsSinceMaint = Math.max(0, (now.getTime() - lastMaintDate.getTime()) / (30.44 * 24 * 3600_000));
  const maintenanceRecency = Math.max(0, Math.min(100,
    monthsSinceMaint <= 6 ? 100 :
    monthsSinceMaint <= 12 ? 90 :
    monthsSinceMaint <= 24 ? 70 :
    monthsSinceMaint <= 48 ? 50 :
    Math.max(10, 50 - (monthsSinceMaint - 48) * 0.5)
  ));
  const emergencyRatio = asset.maintenance_count_5yr > 0
    ? asset.emergency_maintenance_count_5yr / asset.maintenance_count_5yr
    : 0;
  const emergencyPenalty = emergencyRatio * 30;
  const maintenance_factor_score = Math.max(0, Math.min(100, maintenanceRecency - emergencyPenalty));

  // 4. Environment Factor (0-100)
  const envMultiplier = ENVIRONMENT_MULTIPLIER[asset.environment] || 0.8;
  const environment_factor_score = envMultiplier * 100;

  // Composite Health Index
  const health_index = Math.round(
    age_factor_score * WEIGHT_AGE +
    loading_factor_score * WEIGHT_LOADING +
    maintenance_factor_score * WEIGHT_MAINTENANCE +
    environment_factor_score * WEIGHT_ENVIRONMENT
  );

  // Condition Category
  const condition: ConditionCategory =
    health_index >= 70 ? 'good' :
    health_index >= 40 ? 'fair' :
    health_index >= 20 ? 'poor' : 'very_poor';

  // Risk Priority (HI-based probability × criticality consequence)
  const criticalityMultiplier = asset.criticality === 'essential' ? 1.5 : asset.criticality === 'important' ? 1.2 : 1.0;
  const riskScore = (100 - health_index) * criticalityMultiplier;
  const risk_priority: RiskPriority =
    riskScore >= 80 ? 'critical' :
    riskScore >= 55 ? 'high' :
    riskScore >= 30 ? 'medium' : 'low';

  // Recommended action
  const recommended_action =
    condition === 'very_poor' ? 'Immediate replacement or major refurbishment required' :
    condition === 'poor' ? 'Schedule replacement within 1-2 years; increase inspection frequency' :
    condition === 'fair' ? 'Monitor closely; plan for replacement in 3-5 years' :
    'Continue routine maintenance program';

  // Next inspection interval
  const next_inspection_months =
    condition === 'very_poor' ? 1 :
    condition === 'poor' ? 3 :
    condition === 'fair' ? 6 : 12;

  const remaining_life_pct = Math.max(0, Math.min(100, (1 - age_ratio) * 100));

  return {
    asset_id: asset.asset_id,
    asset_name: asset.asset_name,
    asset_type: asset.asset_type,
    health_index,
    condition,
    risk_priority,
    age_years: Math.round(age_years * 10) / 10,
    age_factor_score: Math.round(age_factor_score),
    loading_factor_score: Math.round(loading_factor_score),
    maintenance_factor_score: Math.round(maintenance_factor_score),
    environment_factor_score: Math.round(environment_factor_score),
    loading_pct: Math.round(loading_pct * 10) / 10,
    remaining_life_pct: Math.round(remaining_life_pct * 10) / 10,
    recommended_action,
    next_inspection_months,
  };
}

export function scoreFleet(assets: AssetRecord[]): { results: AssetHealthResult[]; summary: FleetSummary } {
  const results = assets.map(scoreAssetHealth);

  const condition_distribution: Record<ConditionCategory, number> = { good: 0, fair: 0, poor: 0, very_poor: 0 };
  const risk_distribution: Record<RiskPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };

  let totalHI = 0, totalAge = 0, totalLoading = 0, replacementCost = 0, needsAction = 0;

  results.forEach(r => {
    totalHI += r.health_index;
    totalAge += r.age_years;
    totalLoading += r.loading_pct;
    condition_distribution[r.condition]++;
    risk_distribution[r.risk_priority]++;
    if (r.condition === 'poor' || r.condition === 'very_poor') {
      needsAction++;
      replacementCost += REPLACEMENT_COST_CAD[r.asset_type] || 10000;
    }
  });

  const n = results.length || 1;

  // Group by type
  const byTypeMap = new Map<AssetType, { count: number; totalHI: number; totalAge: number }>();
  results.forEach(r => {
    const entry = byTypeMap.get(r.asset_type) || { count: 0, totalHI: 0, totalAge: 0 };
    entry.count++;
    entry.totalHI += r.health_index;
    entry.totalAge += r.age_years;
    byTypeMap.set(r.asset_type, entry);
  });

  const by_type = Array.from(byTypeMap.entries()).map(([asset_type, { count, totalHI, totalAge }]) => ({
    asset_type,
    count,
    avg_hi: Math.round(totalHI / count),
    avg_age: Math.round(totalAge / count * 10) / 10,
  }));

  return {
    results,
    summary: {
      total_assets: results.length,
      avg_health_index: Math.round(totalHI / n),
      condition_distribution,
      risk_distribution,
      avg_age_years: Math.round(totalAge / n * 10) / 10,
      avg_loading_pct: Math.round(totalLoading / n * 10) / 10,
      assets_needing_action: needsAction,
      replacement_budget_estimate_cad: replacementCost,
      by_type,
    },
  };
}

// ============================================================================
// CSV PARSING
// ============================================================================

export const CSV_TEMPLATE_HEADERS = [
  'asset_id', 'asset_name', 'asset_type', 'install_date',
  'rated_capacity_kva', 'current_load_kva', 'environment',
  'last_maintenance_date', 'maintenance_count_5yr', 'emergency_maintenance_count_5yr',
  'location', 'criticality', 'notes',
];

export const CSV_TEMPLATE_EXAMPLE = `asset_id,asset_name,asset_type,install_date,rated_capacity_kva,current_load_kva,environment,last_maintenance_date,maintenance_count_5yr,emergency_maintenance_count_5yr,location,criticality,notes
TX-001,Main St Transformer #1,transformer_distribution,2005-06-15,500,380,outdoor_exposed,2025-08-10,6,1,123 Main St,essential,Serves hospital feeder
TX-002,Oak Ave Transformer #2,transformer_distribution,2012-03-20,250,160,outdoor_sheltered,2025-11-15,4,0,456 Oak Ave,standard,Residential area
PL-001,Cedar Rd Pole #47,pole_wood,1998-01-01,0,0,outdoor_exposed,2024-05-20,2,0,Cedar Rd km 3.2,standard,Class 3 CCA treated
SW-001,Station Alpha Switchgear,switchgear,2010-09-01,2000,1650,indoor,2025-06-01,8,2,Station Alpha,essential,15kV vacuum breaker`;

export function parseAssetCSV(csvText: string): { assets: AssetRecord[]; errors: string[] } {
  const errors: string[] = [];
  const lines = csvText.split(/\r\n|\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
  if (lines.length < 2) {
    errors.push('CSV must have at least a header row and one data row.');
    return { assets: [], errors };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim());

  // Validate required columns
  const required = ['asset_id', 'asset_type', 'install_date'];
  for (const req of required) {
    if (!headers.includes(req)) {
      errors.push(`Missing required column: ${req}`);
    }
  }
  if (errors.length > 0) return { assets: [], errors };

  const assets: AssetRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());
    if (cells.length < headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${cells.length}`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = cells[j] || ''; });

    const asset_type = row['asset_type'] as AssetType;
    if (!EXPECTED_LIFE_YEARS[asset_type]) {
      errors.push(`Row ${i + 1}: Unknown asset_type "${row['asset_type']}". Valid types: ${Object.keys(EXPECTED_LIFE_YEARS).join(', ')}`);
      continue;
    }

    assets.push({
      asset_id: row['asset_id'] || `ASSET-${i}`,
      asset_name: row['asset_name'] || row['asset_id'] || `Asset ${i}`,
      asset_type,
      install_date: row['install_date'] || '2010-01-01',
      rated_capacity_kva: parseFloat(row['rated_capacity_kva']) || 0,
      current_load_kva: parseFloat(row['current_load_kva']) || 0,
      environment: (row['environment'] as EnvironmentFactor) || 'outdoor_exposed',
      last_maintenance_date: row['last_maintenance_date'] || '2024-01-01',
      maintenance_count_5yr: parseInt(row['maintenance_count_5yr']) || 0,
      emergency_maintenance_count_5yr: parseInt(row['emergency_maintenance_count_5yr']) || 0,
      location: row['location'] || '',
      criticality: (row['criticality'] as 'essential' | 'important' | 'standard') || 'standard',
      notes: row['notes'] || '',
    });
  }

  return { assets, errors };
}

// ============================================================================
// EXPORT
// ============================================================================

export function resultsToCSV(results: AssetHealthResult[]): string {
  const headers = [
    'asset_id', 'asset_name', 'asset_type', 'health_index', 'condition', 'risk_priority',
    'age_years', 'loading_pct', 'remaining_life_pct',
    'age_score', 'loading_score', 'maintenance_score', 'environment_score',
    'recommended_action', 'next_inspection_months',
  ];
  const rows = results.map(r => [
    r.asset_id, r.asset_name, r.asset_type, r.health_index, r.condition, r.risk_priority,
    r.age_years, r.loading_pct, r.remaining_life_pct,
    r.age_factor_score, r.loading_factor_score, r.maintenance_factor_score, r.environment_factor_score,
    `"${r.recommended_action}"`, r.next_inspection_months,
  ].join(','));

  return [
    '# Asset Health Index Report',
    `# Generated: ${new Date().toISOString()}`,
    '# Methodology: CBRM-lite (OEB Appendix 2-AB compatible)',
    '# Health Index: 0-100 (Good >= 70, Fair 40-69, Poor 20-39, Very Poor < 20)',
    '',
    headers.join(','),
    ...rows,
  ].join('\n');
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

export function generateSampleAssets(): AssetRecord[] {
  return [
    { asset_id: 'TX-001', asset_name: 'Main St Transformer #1', asset_type: 'transformer_distribution', install_date: '2005-06-15', rated_capacity_kva: 500, current_load_kva: 380, environment: 'outdoor_exposed', last_maintenance_date: '2025-08-10', maintenance_count_5yr: 6, emergency_maintenance_count_5yr: 1, location: '123 Main St', criticality: 'essential', notes: 'Serves hospital feeder' },
    { asset_id: 'TX-002', asset_name: 'Oak Ave Transformer #2', asset_type: 'transformer_distribution', install_date: '2012-03-20', rated_capacity_kva: 250, current_load_kva: 160, environment: 'outdoor_sheltered', last_maintenance_date: '2025-11-15', maintenance_count_5yr: 4, emergency_maintenance_count_5yr: 0, location: '456 Oak Ave', criticality: 'standard', notes: 'Residential area' },
    { asset_id: 'TX-003', asset_name: 'Industrial Park Transformer', asset_type: 'transformer_distribution', install_date: '1998-01-10', rated_capacity_kva: 1000, current_load_kva: 920, environment: 'industrial', last_maintenance_date: '2024-02-20', maintenance_count_5yr: 8, emergency_maintenance_count_5yr: 3, location: 'Industrial Park Zone A', criticality: 'essential', notes: 'Heavy loading — monitor' },
    { asset_id: 'TX-004', asset_name: 'School District Sub #4', asset_type: 'transformer_distribution', install_date: '2018-09-01', rated_capacity_kva: 300, current_load_kva: 180, environment: 'outdoor_sheltered', last_maintenance_date: '2025-10-05', maintenance_count_5yr: 3, emergency_maintenance_count_5yr: 0, location: 'District School Complex', criticality: 'important', notes: '' },
    { asset_id: 'PL-001', asset_name: 'Cedar Rd Pole #47', asset_type: 'pole_wood', install_date: '1995-01-01', rated_capacity_kva: 0, current_load_kva: 0, environment: 'outdoor_exposed', last_maintenance_date: '2024-05-20', maintenance_count_5yr: 2, emergency_maintenance_count_5yr: 0, location: 'Cedar Rd km 3.2', criticality: 'standard', notes: 'Class 3 CCA treated' },
    { asset_id: 'PL-002', asset_name: 'Birch Lane Pole #12', asset_type: 'pole_wood', install_date: '1988-06-01', rated_capacity_kva: 0, current_load_kva: 0, environment: 'outdoor_exposed', last_maintenance_date: '2023-09-15', maintenance_count_5yr: 1, emergency_maintenance_count_5yr: 1, location: 'Birch Lane km 1.5', criticality: 'standard', notes: 'Woodpecker damage noted' },
    { asset_id: 'SW-001', asset_name: 'Station Alpha Switchgear', asset_type: 'switchgear', install_date: '2010-09-01', rated_capacity_kva: 2000, current_load_kva: 1650, environment: 'indoor', last_maintenance_date: '2025-06-01', maintenance_count_5yr: 8, emergency_maintenance_count_5yr: 2, location: 'Station Alpha', criticality: 'essential', notes: '15kV vacuum breaker' },
    { asset_id: 'CB-001', asset_name: 'Elm St Capacitor Bank', asset_type: 'capacitor_bank', install_date: '2015-04-15', rated_capacity_kva: 600, current_load_kva: 0, environment: 'outdoor_exposed', last_maintenance_date: '2025-03-10', maintenance_count_5yr: 3, emergency_maintenance_count_5yr: 0, location: 'Elm St Feeder', criticality: 'important', notes: 'VAR support' },
    { asset_id: 'RC-001', asset_name: 'Highway 2 Recloser', asset_type: 'recloser', install_date: '2008-11-20', rated_capacity_kva: 0, current_load_kva: 0, environment: 'outdoor_exposed', last_maintenance_date: '2025-01-15', maintenance_count_5yr: 5, emergency_maintenance_count_5yr: 1, location: 'Hwy 2 km 12', criticality: 'important', notes: 'SEL-651R' },
    { asset_id: 'UG-001', asset_name: 'Downtown Cable Run A', asset_type: 'cable_underground', install_date: '2002-07-01', rated_capacity_kva: 800, current_load_kva: 520, environment: 'outdoor_sheltered', last_maintenance_date: '2024-08-20', maintenance_count_5yr: 2, emergency_maintenance_count_5yr: 0, location: 'Downtown Core', criticality: 'essential', notes: 'XLPE 15kV' },
  ];
}
