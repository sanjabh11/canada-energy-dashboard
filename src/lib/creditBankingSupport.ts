export interface CreditHolding {
  id: string;
  type: 'EPC' | 'Offset';
  vintage: number;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  expiryYear: number;
  status: 'active' | 'allocated' | 'expired';
}

export interface ComplianceYear {
  year: number;
  liability: number;
  allocated: number;
  remaining: number;
}

export interface CreditAllocationRow extends ComplianceYear {
  allocatedLots: Array<{
    holdingId: string;
    vintage: number;
    type: CreditHolding['type'];
    quantity: number;
    expiryYear: number;
  }>;
}

export interface CreditPortfolioSummary {
  totalCredits: number;
  totalInvested: number;
  currentValue: number;
  avgCost: number;
  fundValueSaved: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  expiringSoonCredits: number;
  coverageRatio: number;
}

const STARTER_HOLDINGS: CreditHolding[] = [
  { id: '1', type: 'EPC', vintage: 2024, quantity: 5000, purchasePrice: 22.5, purchaseDate: '2025-03-15', expiryYear: 2029, status: 'active' },
  { id: '2', type: 'EPC', vintage: 2025, quantity: 8000, purchasePrice: 24, purchaseDate: '2025-06-20', expiryYear: 2030, status: 'active' },
  { id: '3', type: 'Offset', vintage: 2024, quantity: 3000, purchasePrice: 26, purchaseDate: '2025-01-10', expiryYear: 2029, status: 'allocated' },
  { id: '4', type: 'EPC', vintage: 2023, quantity: 2000, purchasePrice: 35, purchaseDate: '2024-08-05', expiryYear: 2028, status: 'active' },
];

const STARTER_LIABILITIES: ComplianceYear[] = [
  { year: 2025, liability: 15000, allocated: 0, remaining: 15000 },
  { year: 2026, liability: 16000, allocated: 0, remaining: 16000 },
  { year: 2027, liability: 17000, allocated: 0, remaining: 17000 },
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

export function buildStarterCreditHoldings(): CreditHolding[] {
  return STARTER_HOLDINGS.map((holding) => ({ ...holding }));
}

export function buildStarterComplianceYears(): ComplianceYear[] {
  return STARTER_LIABILITIES.map((year) => ({ ...year }));
}

export function parseCreditHoldingsCsv(text: string): CreditHolding[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Holdings import requires a header row and at least one credit lot row.');
  }

  const headers = splitCsvRow(lines[0]);
  return lines.slice(1).map((line, index) => {
    const row: Record<string, string> = {};
    splitCsvRow(line).forEach((cell, cellIndex) => {
      row[headers[cellIndex] ?? `col_${cellIndex}`] = cell;
    });
    return {
      id: row.id || `holding-${index + 1}`,
      type: row.type === 'Offset' ? 'Offset' : 'EPC',
      vintage: Math.round(toNumber(row.vintage || row.vintage_year)),
      quantity: toNumber(row.quantity),
      purchasePrice: toNumber(row.purchase_price || row.purchasePrice),
      purchaseDate: row.purchase_date || row.purchaseDate || new Date().toISOString().slice(0, 10),
      expiryYear: Math.round(toNumber(row.expiry_year || row.expiryYear)),
      status: row.status === 'expired' ? 'expired' : row.status === 'allocated' ? 'allocated' : 'active',
    };
  });
}

export function parseComplianceLiabilityCsv(text: string): ComplianceYear[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Liability import requires a header row and at least one compliance-year row.');
  }

  const headers = splitCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const row: Record<string, string> = {};
    splitCsvRow(line).forEach((cell, cellIndex) => {
      row[headers[cellIndex] ?? `col_${cellIndex}`] = cell;
    });
    const year = Math.round(toNumber(row.year || row.compliance_year));
    const liability = toNumber(row.liability || row.liability_tonnes);
    const allocated = toNumber(row.allocated || 0);
    return {
      year,
      liability,
      allocated,
      remaining: Math.max(liability - allocated, 0),
    };
  });
}

export function allocateCreditsToLiabilities(
  holdings: CreditHolding[],
  liabilities: ComplianceYear[],
): CreditAllocationRow[] {
  const activeLots = holdings
    .filter((holding) => holding.status !== 'expired' && holding.quantity > 0)
    .sort((left, right) => {
      if (left.expiryYear !== right.expiryYear) return left.expiryYear - right.expiryYear;
      return left.vintage - right.vintage;
    })
    .map((holding) => ({ ...holding, remainingQuantity: holding.quantity }));

  return liabilities
    .slice()
    .sort((left, right) => left.year - right.year)
    .map((year) => {
      let remaining = year.liability;
      const allocatedLots: CreditAllocationRow['allocatedLots'] = [];

      for (const lot of activeLots) {
        if (remaining <= 0) break;
        if (lot.remainingQuantity <= 0) continue;
        const quantity = Math.min(lot.remainingQuantity, remaining);
        if (quantity <= 0) continue;
        lot.remainingQuantity -= quantity;
        remaining -= quantity;
        allocatedLots.push({
          holdingId: lot.id,
          vintage: lot.vintage,
          type: lot.type,
          quantity,
          expiryYear: lot.expiryYear,
        });
      }

      return {
        year: year.year,
        liability: year.liability,
        allocated: year.liability - remaining,
        remaining,
        allocatedLots,
      };
    });
}

export function summarizeCreditPortfolio(
  holdings: CreditHolding[],
  liabilities: ComplianceYear[],
  currentMarketPrice: number,
  fundPrice: number,
): CreditPortfolioSummary {
  const activeHoldings = holdings.filter((holding) => holding.status !== 'expired');
  const totalCredits = activeHoldings.reduce((sum, holding) => sum + holding.quantity, 0);
  const totalInvested = activeHoldings.reduce((sum, holding) => sum + (holding.quantity * holding.purchasePrice), 0);
  const currentValue = activeHoldings.reduce((sum, holding) => sum + (holding.quantity * currentMarketPrice), 0);
  const avgCost = totalCredits > 0 ? totalInvested / totalCredits : 0;
  const fundValueSaved = activeHoldings.reduce((sum, holding) => sum + (holding.quantity * Math.max(fundPrice - holding.purchasePrice, 0)), 0);
  const unrealizedGain = currentValue - totalInvested;
  const totalLiability = liabilities.reduce((sum, year) => sum + year.liability, 0);
  const expiringSoonCredits = activeHoldings
    .filter((holding) => holding.expiryYear <= new Date().getFullYear() + 4)
    .reduce((sum, holding) => sum + holding.quantity, 0);

  return {
    totalCredits,
    totalInvested,
    currentValue,
    avgCost,
    fundValueSaved,
    unrealizedGain,
    unrealizedGainPercent: totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0,
    expiringSoonCredits,
    coverageRatio: totalLiability > 0 ? (totalCredits / totalLiability) * 100 : 0,
  };
}

export function buildCreditAllocationCsv(rows: CreditAllocationRow[], marketPrice: number): string {
  return [
    '# TIER credit allocation schedule',
    `# Generated: ${new Date().toISOString()}`,
    'year,liability_tonnes,allocated_tonnes,remaining_tonnes,estimated_market_cost_cad,allocated_lots',
    ...rows.map((row) => [
      row.year,
      row.liability,
      row.allocated,
      row.remaining,
      (row.remaining * marketPrice).toFixed(2),
      `"${row.allocatedLots.map((lot) => `${lot.holdingId}:${lot.quantity}t(v${lot.vintage})`).join('; ')}"`,
    ].join(',')),
  ].join('\n');
}

export function buildExpiryRiskCsv(holdings: CreditHolding[]): string {
  return [
    '# TIER credit expiry risk register',
    `# Generated: ${new Date().toISOString()}`,
    'holding_id,type,vintage,quantity,expiry_year,status,purchase_price',
    ...holdings.map((holding) => [
      holding.id,
      holding.type,
      holding.vintage,
      holding.quantity,
      holding.expiryYear,
      holding.status,
      holding.purchasePrice.toFixed(2),
    ].join(',')),
  ].join('\n');
}
