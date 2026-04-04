const now = Date.now();

export const DEMO_DATA: Record<string, unknown[]> = {
  grid_snapshots: [
    { province: 'AB', timestamp: new Date(now - 3600000).toISOString(), demand_mw: 10850, supply_mw: 11200, imports_mw: 150, exports_mw: 450 },
    { province: 'AB', timestamp: new Date(now - 7200000).toISOString(), demand_mw: 10500, supply_mw: 10900, imports_mw: 120, exports_mw: 380 },
    { province: 'ON', timestamp: new Date(now - 3600000).toISOString(), demand_mw: 18500, supply_mw: 19200, imports_mw: 1200, exports_mw: 200 },
    { province: 'ON', timestamp: new Date(now - 7200000).toISOString(), demand_mw: 17800, supply_mw: 18500, imports_mw: 1100, exports_mw: 150 },
  ],
  alberta_grid_prices: [
    { timestamp: new Date(now - 3600000).toISOString(), pool_price: 45.50, rolling_30d_avg: 52.30 },
    { timestamp: new Date(now - 7200000).toISOString(), pool_price: 52.25, rolling_30d_avg: 52.28 },
    { timestamp: new Date(now - 10800000).toISOString(), pool_price: 78.90, rolling_30d_avg: 52.35 },
    { timestamp: new Date(now - 14400000).toISOString(), pool_price: 85.40, rolling_30d_avg: 52.40 },
  ],
  carbon_emissions: [
    { province: 'AB', timestamp: new Date(now - 86400000).toISOString(), emissions_tons: 850.5 },
    { province: 'AB', timestamp: new Date(now - 172800000).toISOString(), emissions_tons: 920.3 },
    { province: 'ON', timestamp: new Date(now - 86400000).toISOString(), emissions_tons: 420.2 },
    { province: 'ON', timestamp: new Date(now - 172800000).toISOString(), emissions_tons: 445.8 },
    { province: 'BC', timestamp: new Date(now - 86400000).toISOString(), emissions_tons: 85.3 },
    { province: 'QC', timestamp: new Date(now - 86400000).toISOString(), emissions_tons: 42.1 },
  ],
  curtailment_events: [
    { id: '550e8400-e29b-41d4-a716-446655440000', province: 'AB', source_type: 'WIND', curtailed_mw: 125.5, total_energy_curtailed_mwh: 376.5, reason: 'Transmission Constraint', occurred_at: new Date(now - 172800000).toISOString() },
    { id: '550e8400-e29b-41d4-a716-446655440001', province: 'AB', source_type: 'SOLAR', curtailed_mw: 45.2, total_energy_curtailed_mwh: 135.6, reason: 'Overgeneration', occurred_at: new Date(now - 259200000).toISOString() },
  ],
};

export function getDemoDataForQuery(sql: string, maxResults: number): unknown[] {
  const fromMatch = sql.match(/\bFROM\s+(\w+)/i);
  if (!fromMatch) return [];

  const tableName = fromMatch[1].toLowerCase();
  const demoData = DEMO_DATA[tableName];

  if (!demoData) return [];

  let filtered = demoData;
  const provinceMatch = sql.match(/province\s*=\s*['"](\w{2})['"]/i);
  if (provinceMatch) {
    filtered = demoData.filter((row) => (row as any).province === provinceMatch[1].toUpperCase());
  }

  return filtered.slice(0, maxResults);
}
