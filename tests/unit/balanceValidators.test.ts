/**
 * Unit tests for B06 – Balance Validators
 * Tests all three validator families with edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  validateEnergyBalance,
  validateCarbonBalance,
  validateEconomyBalance,
  validateAll,
} from '../../src/lib/validators/balanceValidators.ts';
import type { NormalizedRecord } from '../../src/lib/connectors/index.ts';

function makeRecord(overrides: Partial<NormalizedRecord>): NormalizedRecord {
  return {
    metric: 'electricity_generation_mw',
    geography: 'AB',
    observed_at: '2024-01-01T00:00:00Z',
    value: 1000,
    unit: 'MW',
    sector: 'electricity',
    fuel: null,
    technology: null,
    lineage_id: 'test-run-id',
    source_doc_url: 'https://example.com',
    retrieved_at: '2024-06-01T00:00:00Z',
    is_projection: false,
    ...overrides,
  };
}

// ── Energy Balance Tests ──────────────────────────────────────────────────────

describe('validateEnergyBalance', () => {
  it('passes when generation and demand are balanced (within 15%)', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: 10000, geography: 'AB' }),
      makeRecord({ metric: 'electricity_demand_mw', value: 9500, geography: 'AB' }),
    ];
    const result = await validateEnergyBalance(records);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('warns when imbalance exceeds 15%', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: 10000, geography: 'ON' }),
      makeRecord({ metric: 'electricity_demand_mw', value: 5000, geography: 'ON' }),
    ];
    const result = await validateEnergyBalance(records);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].severity).toBe('warning');
  });

  it('errors on negative generation', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: -500, geography: 'BC' }),
      makeRecord({ metric: 'electricity_demand_mw', value: 1000, geography: 'BC' }),
    ];
    const result = await validateEnergyBalance(records);
    expect(result.passed).toBe(false);
    const errors = result.violations.filter((v) => v.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('skips geo-period group if either side is zero', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: 5000, geography: 'SK' }),
      // No demand record for SK
    ];
    const result = await validateEnergyBalance(records);
    expect(result.violations).toHaveLength(0);
  });

  it('handles multiple geo-period groups independently', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: 10000, geography: 'AB', observed_at: '2024-01-01T00:00:00Z' }),
      makeRecord({ metric: 'electricity_demand_mw', value: 9800, geography: 'AB', observed_at: '2024-01-01T00:00:00Z' }),
      makeRecord({ metric: 'electricity_generation_mw', value: 10000, geography: 'ON', observed_at: '2024-02-01T00:00:00Z' }),
      makeRecord({ metric: 'electricity_demand_mw', value: 5000, geography: 'ON', observed_at: '2024-02-01T00:00:00Z' }),
    ];
    const result = await validateEnergyBalance(records);
    // AB should pass, ON should warn
    expect(result.violations.some((v) => v.geography === 'ON')).toBe(true);
    expect(result.violations.some((v) => v.geography === 'AB')).toBe(false);
  });
});

// ── Carbon Balance Tests ──────────────────────────────────────────────────────

describe('validateCarbonBalance', () => {
  it('passes when implied ≈ reported emissions (within 20%)', async () => {
    // natural_gas: 0.0492 tCO2e/GJ → 1,000,000 GJ → 49,200 tCO2e
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'fuel_consumption_gj', value: 1_000_000, unit: 'GJ', fuel: 'natural_gas', geography: 'AB' }),
      makeRecord({ metric: 'facility_ghg_releases_tco2e', value: 50_000, unit: 'tCO2e', geography: 'AB' }),
    ];
    const result = await validateCarbonBalance(records);
    expect(result.passed).toBe(true);
  });

  it('warns when implied emissions deviate >20% from reported', async () => {
    // natural_gas: 0.0492 tCO2e/GJ → 1,000,000 GJ → 49,200 implied
    // Reported: 100,000 tCO2e → ratio = 0.492 → deviation = 50.8%
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'fuel_consumption_gj', value: 1_000_000, unit: 'GJ', fuel: 'natural_gas', geography: 'ON' }),
      makeRecord({ metric: 'facility_ghg_releases_tco2e', value: 100_000, unit: 'tCO2e', geography: 'ON' }),
    ];
    const result = await validateCarbonBalance(records);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].severity).toBe('warning');
  });

  it('skips if no fuel consumption records present', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'facility_ghg_releases_tco2e', value: 50_000, unit: 'tCO2e' }),
    ];
    const result = await validateCarbonBalance(records);
    expect(result.violations).toHaveLength(0);
  });

  it('skips if no facility GHG records present', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'fuel_consumption_gj', value: 1_000_000, unit: 'GJ', fuel: 'coal' }),
    ];
    const result = await validateCarbonBalance(records);
    expect(result.violations).toHaveLength(0);
  });
});

// ── Economy Balance Tests ─────────────────────────────────────────────────────

describe('validateEconomyBalance', () => {
  it('passes on normal pool price', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: 85, unit: 'CAD/MWh' }),
    ];
    const result = await validateEconomyBalance(records);
    expect(result.passed).toBe(true);
  });

  it('warns on extreme positive price spike', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: 2500, unit: 'CAD/MWh' }),
    ];
    const result = await validateEconomyBalance(records);
    expect(result.violations.some((v) => v.severity === 'warning')).toBe(true);
  });

  it('errors on extreme negative price below bound', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: -1000, unit: 'CAD/MWh' }),
    ];
    const result = await validateEconomyBalance(records);
    expect(result.violations.some((v) => v.severity === 'error')).toBe(true);
  });

  it('flags mild negative price as info (curtailment)', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: -30, unit: 'CAD/MWh' }),
    ];
    const result = await validateEconomyBalance(records);
    const info = result.violations.filter((v) => v.severity === 'info');
    expect(info.length).toBeGreaterThan(0);
    expect(result.passed).toBe(true); // info doesn't fail
  });

  it('warns on LCOE outside technology bounds', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'lcoe_cad_mwh', value: 500, unit: 'CAD/MWh', technology: 'solar_pv' }),
    ];
    const result = await validateEconomyBalance(records);
    expect(result.violations.some((v) => v.severity === 'warning')).toBe(true);
  });

  it('passes LCOE within technology bounds', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'lcoe_cad_mwh', value: 60, unit: 'CAD/MWh', technology: 'solar_pv' }),
    ];
    const result = await validateEconomyBalance(records);
    expect(result.violations.filter((v) => v.metric.includes('lcoe'))).toHaveLength(0);
  });
});

// ── Composite validator ───────────────────────────────────────────────────────

describe('validateAll', () => {
  it('returns combined results for all three validators', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_generation_mw', value: 10000 }),
      makeRecord({ metric: 'electricity_demand_mw', value: 9500 }),
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: 75, unit: 'CAD/MWh' }),
    ];
    const result = await validateAll(records);
    expect(result).toHaveProperty('energy');
    expect(result).toHaveProperty('carbon');
    expect(result).toHaveProperty('economy');
    expect(result).toHaveProperty('allPassed');
    expect(result).toHaveProperty('totalViolations');
    expect(result).toHaveProperty('totalErrors');
  });

  it('allPassed is false when any validator fails', async () => {
    const records: NormalizedRecord[] = [
      makeRecord({ metric: 'electricity_pool_price_cad_mwh', value: -2000, unit: 'CAD/MWh' }),
    ];
    const result = await validateAll(records);
    expect(result.allPassed).toBe(false);
    expect(result.totalErrors).toBeGreaterThan(0);
  });
});
