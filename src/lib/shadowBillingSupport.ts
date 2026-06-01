export interface ShadowBillRecord {
  id: string;
  billingPeriod: string;
  consumptionKwh: number;
  actualEnergyRateCentsPerKwh: number;
  actualSupplyCostCad: number;
  rolrRateCentsPerKwh: number;
  poolPriceCentsPerKwh: number;
  fixedChargeCad?: number;
  retailerName?: string;
}

export interface ShadowBillingAnalysisRow extends ShadowBillRecord {
  actualDeliveredCostCad: number;
  rolrDeliveredCostCad: number;
  poolSupplyCostCad: number;
  deltaVsRolrCad: number;
  deltaVsPoolCad: number;
}

export interface ShadowBillingSummary {
  rows: ShadowBillingAnalysisRow[];
  totalActualSupplyCostCad: number;
  totalRolrSupplyCostCad: number;
  totalPoolSupplyCostCad: number;
  totalActualDeliveredCostCad: number;
  totalRolrDeliveredCostCad: number;
  totalFixedChargesCad: number;
  deltaVsRolrCad: number;
  deltaVsPoolCad: number;
  monthsOverRolr: number;
  comparisonScope: 'energy_supply_only' | 'delivered_bill';
}

const STARTER_ROWS: Array<Omit<ShadowBillRecord, 'id'>> = [
  { billingPeriod: '2025-01', consumptionKwh: 850, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 120.7, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 8.5, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-02', consumptionKwh: 820, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 116.44, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 7.8, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-03', consumptionKwh: 720, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 102.24, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 6.9, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-04', consumptionKwh: 650, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 92.3, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 5.2, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-05', consumptionKwh: 580, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 82.36, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 4.8, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-06', consumptionKwh: 620, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 88.04, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 6.1, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-07', consumptionKwh: 780, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 110.76, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 9.2, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-08', consumptionKwh: 820, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 116.44, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 11.5, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-09', consumptionKwh: 700, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 99.4, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 8.3, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-10', consumptionKwh: 680, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 96.56, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 7.1, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-11', consumptionKwh: 750, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 106.5, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 8.8, fixedChargeCad: 18, retailerName: 'Sample retailer' },
  { billingPeriod: '2025-12', consumptionKwh: 900, actualEnergyRateCentsPerKwh: 14.2, actualSupplyCostCad: 127.8, rolrRateCentsPerKwh: 12, poolPriceCentsPerKwh: 10.2, fixedChargeCad: 18, retailerName: 'Sample retailer' },
];

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').replace(/[$,%\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeRow(record: Record<string, unknown>, index: number): ShadowBillRecord {
  const billingPeriod = String(record.billing_period ?? record.billingPeriod ?? record.period ?? `period-${index + 1}`);
  const consumptionKwh = toNumber(record.consumption_kwh ?? record.consumptionKwh ?? record.kwh);
  const actualEnergyRateCentsPerKwh = toNumber(record.actual_energy_rate_cents_per_kwh ?? record.actualRate ?? record.actual_energy_rate);
  const actualSupplyCostCad = toNumber(record.actual_supply_cost_cad ?? record.actualSupplyCostCad ?? (consumptionKwh * actualEnergyRateCentsPerKwh) / 100);
  const rolrRateCentsPerKwh = toNumber(record.rolr_rate_cents_per_kwh ?? record.rolrRate ?? 12);
  const poolPriceCentsPerKwh = toNumber(record.pool_price_cents_per_kwh ?? record.poolPrice ?? 8.5);
  const fixedChargeCad = toNumber(record.fixed_charge_cad ?? record.fixedChargeCad ?? 0);
  const retailerName = String(record.retailer_name ?? record.retailerName ?? 'Owner supplied retailer');

  return {
    id: `shadow-bill-${index + 1}`,
    billingPeriod,
    consumptionKwh,
    actualEnergyRateCentsPerKwh,
    actualSupplyCostCad,
    rolrRateCentsPerKwh,
    poolPriceCentsPerKwh,
    fixedChargeCad: fixedChargeCad || undefined,
    retailerName,
  };
}

export function buildStarterShadowBills(): ShadowBillRecord[] {
  return STARTER_ROWS.map((row, index) => ({ id: `shadow-bill-${index + 1}`, ...row }));
}

export function parseShadowBillingCsv(text: string): ShadowBillRecord[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Billing import requires a header row and at least one bill row.');
  }

  const headers = splitCsvRow(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = cells[headerIndex] ?? '';
    });
    return normalizeRow(row, index);
  });
}

export function analyzeShadowBilling(records: ShadowBillRecord[]): ShadowBillingSummary {
  const rows = records.map((record) => {
    const actualDeliveredCostCad = record.actualSupplyCostCad + (record.fixedChargeCad ?? 0);
    const rolrSupplyCostCad = (record.consumptionKwh * record.rolrRateCentsPerKwh) / 100;
    const rolrDeliveredCostCad = rolrSupplyCostCad + (record.fixedChargeCad ?? 0);
    const poolSupplyCostCad = (record.consumptionKwh * record.poolPriceCentsPerKwh) / 100;
    return {
      ...record,
      actualDeliveredCostCad,
      rolrDeliveredCostCad,
      poolSupplyCostCad,
      deltaVsRolrCad: record.actualSupplyCostCad - rolrSupplyCostCad,
      deltaVsPoolCad: record.actualSupplyCostCad - poolSupplyCostCad,
    };
  });

  const totalActualSupplyCostCad = rows.reduce((sum, row) => sum + row.actualSupplyCostCad, 0);
  const totalRolrSupplyCostCad = rows.reduce((sum, row) => sum + ((row.consumptionKwh * row.rolrRateCentsPerKwh) / 100), 0);
  const totalPoolSupplyCostCad = rows.reduce((sum, row) => sum + row.poolSupplyCostCad, 0);
  const totalFixedChargesCad = rows.reduce((sum, row) => sum + (row.fixedChargeCad ?? 0), 0);
  const totalActualDeliveredCostCad = rows.reduce((sum, row) => sum + row.actualDeliveredCostCad, 0);
  const totalRolrDeliveredCostCad = rows.reduce((sum, row) => sum + row.rolrDeliveredCostCad, 0);

  return {
    rows,
    totalActualSupplyCostCad,
    totalRolrSupplyCostCad,
    totalPoolSupplyCostCad,
    totalActualDeliveredCostCad,
    totalRolrDeliveredCostCad,
    totalFixedChargesCad,
    deltaVsRolrCad: totalActualSupplyCostCad - totalRolrSupplyCostCad,
    deltaVsPoolCad: totalActualSupplyCostCad - totalPoolSupplyCostCad,
    monthsOverRolr: rows.filter((row) => row.deltaVsRolrCad > 0).length,
    comparisonScope: 'energy_supply_only',
  };
}

export function buildShadowBillingDeltaCsv(summary: ShadowBillingSummary): string {
  const headers = [
    'billing_period',
    'consumption_kwh',
    'actual_energy_rate_cents_per_kwh',
    'actual_supply_cost_cad',
    'rolr_rate_cents_per_kwh',
    'rolr_supply_cost_cad',
    'delta_vs_rolr_cad',
    'pool_price_cents_per_kwh',
    'delta_vs_pool_cad',
    'fixed_charge_cad',
    'retailer_name',
  ];

  const rows = summary.rows.map((row) => ([
    row.billingPeriod,
    row.consumptionKwh,
    row.actualEnergyRateCentsPerKwh.toFixed(2),
    row.actualSupplyCostCad.toFixed(2),
    row.rolrRateCentsPerKwh.toFixed(2),
    ((row.consumptionKwh * row.rolrRateCentsPerKwh) / 100).toFixed(2),
    row.deltaVsRolrCad.toFixed(2),
    row.poolPriceCentsPerKwh.toFixed(2),
    row.deltaVsPoolCad.toFixed(2),
    (row.fixedChargeCad ?? 0).toFixed(2),
    `"${row.retailerName ?? ''}"`,
  ].join(',')));

  return [
    '# Shadow billing invoice delta export',
    `# Generated: ${new Date().toISOString()}`,
    '# Scope: Energy-supply-only comparison. Fixed charges remain directional and are only included when owner-supplied.',
    '',
    headers.join(','),
    ...rows,
  ].join('\n');
}
