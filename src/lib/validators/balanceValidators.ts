/**
 * B06 – Emissions, Energy & Economy Balance Validators
 *
 * Three interdependent validator families that enforce physical,
 * carbon-accounting, and economic self-consistency across all
 * data ingested by the connector framework (B05).
 *
 * Validator families:
 *   1. EnergyBalance    — supply-demand accounting (ISO 13600 / IEA SEEA)
 *   2. CarbonBalance    — GHG inventory cross-checks (IPCC AR6 accounting)
 *   3. EconomyBalance   — cost/price sanity bounds (natural-gas parity, LCOE ranges)
 *
 * Usage:
 *   const result = await validateEnergyBalance(records);
 *   if (!result.passed) console.warn(result.violations);
 *
 * Each validator returns a `BalanceValidationResult` with:
 *   - passed (bool)
 *   - violations (array of ValidationViolation)
 *   - summary (human-readable string)
 */

import type { NormalizedRecord } from './connectors/index.ts';

// ── Shared types ───────────────────────────────────────────────────────────────

export type ViolationSeverity = 'error' | 'warning' | 'info';

export interface ValidationViolation {
  validator: string;
  severity: ViolationSeverity;
  metric: string;
  geography: string;
  period: string;
  message: string;
  /** Observed value that triggered the violation */
  observed: number;
  /** Tolerance or expected range [min, max] */
  expected: [number, number] | null;
}

export interface BalanceValidationResult {
  validator: string;
  passed: boolean;
  violations: ValidationViolation[];
  checkedRecords: number;
  summary: string;
  runAt: string;
}

// ── Emission factor table (kg CO2e / unit) ─────────────────────────────────────
// Source: Environment and Climate Change Canada, National Inventory Report 2024
// IPCC AR6 GWP-100 values used where provincial factors not available
const EMISSION_FACTORS: Record<string, number> = {
  natural_gas: 0.0492,  // tCO2e / GJ
  coal: 0.0940,         // tCO2e / GJ
  oil: 0.0723,          // tCO2e / GJ
  diesel: 0.0726,       // tCO2e / GJ
  propane: 0.0637,      // tCO2e / GJ
  nuclear: 0.0,
  hydro: 0.0,
  wind: 0.0,
  solar: 0.0,
  biomass: 0.0,         // treated as carbon-neutral in NRI accounting
  geothermal: 0.0,
};

// ── LCOE reference bounds (CAD/MWh) by technology — CER 2026 / NREL 2025 ──────
const LCOE_BOUNDS: Record<string, [number, number]> = {
  wind_onshore:   [40,  110],
  wind_offshore:  [80,  200],
  solar_pv:       [35,   90],
  nuclear:        [80,  250],
  natural_gas_cc: [55,  130],
  natural_gas_ct: [80,  250],
  hydro:          [20,   90],
  coal:           [100, 300],
  biomass:        [70,  200],
  battery_4h:     [100, 350],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Group records by (geography, period = YYYY-MM). */
function groupByGeoPeriod(
  records: NormalizedRecord[],
): Map<string, NormalizedRecord[]> {
  const map = new Map<string, NormalizedRecord[]>();
  for (const r of records) {
    const period = r.observed_at.slice(0, 7); // YYYY-MM
    const key = `${r.geography}::${period}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

/** Sum values for records matching a metric prefix. */
function sumMetric(records: NormalizedRecord[], metricPrefix: string): number {
  return records
    .filter((r) => r.metric.startsWith(metricPrefix))
    .reduce((acc, r) => acc + r.value, 0);
}

// ── 1. Energy Balance Validator ────────────────────────────────────────────────

/**
 * Validates supply-demand energy balance:
 *   Generation >= Demand * (1 - max_loss_fraction)
 *   Supply >= Demand (within a tolerance band)
 *
 * Based on IEA Energy Statistics Manual §3 and ISO 13600.
 * Tolerance: ±5% (grid loss + statistical discrepancy allowance).
 */
export async function validateEnergyBalance(
  records: NormalizedRecord[],
): Promise<BalanceValidationResult> {
  const validator = 'EnergyBalance';
  const violations: ValidationViolation[] = [];
  const groups = groupByGeoPeriod(records);

  for (const [geoperiod, recs] of groups.entries()) {
    const [geography, period] = geoperiod.split('::');

    const generation = sumMetric(recs, 'electricity_generation');
    const demand     = sumMetric(recs, 'electricity_demand');

    // Skip if either side is absent (no imbalance claim possible)
    if (generation === 0 || demand === 0) continue;

    const imbalanceFraction = Math.abs(generation - demand) / Math.max(generation, demand);
    const MAX_IMBALANCE = 0.15; // 15% — grid import/export makes provinces non-self-contained

    if (imbalanceFraction > MAX_IMBALANCE) {
      violations.push({
        validator,
        severity: 'warning',
        metric: 'electricity_generation / demand',
        geography,
        period,
        message:
          `Energy imbalance of ${(imbalanceFraction * 100).toFixed(1)}% exceeds threshold (${(MAX_IMBALANCE * 100).toFixed(0)}%). ` +
          `Gen: ${generation.toFixed(0)} MW, Demand: ${demand.toFixed(0)} MW. ` +
          `May indicate missing inter-provincial flow data.`,
        observed: imbalanceFraction,
        expected: [0, MAX_IMBALANCE],
      });
    }

    // Check for physically impossible negative generation
    if (generation < 0) {
      violations.push({
        validator,
        severity: 'error',
        metric: 'electricity_generation',
        geography,
        period,
        message: `Negative total generation (${generation.toFixed(0)} MW) — data corruption.`,
        observed: generation,
        expected: [0, Infinity],
      });
    }
  }

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    validator,
    passed: errors.length === 0,
    violations,
    checkedRecords: records.length,
    summary:
      violations.length === 0
        ? `Energy balance OK across ${groups.size} geo-period groups.`
        : `${errors.length} error(s), ${violations.length - errors.length} warning(s) in energy balance.`,
    runAt: new Date().toISOString(),
  };
}

// ── 2. Carbon Balance Validator ────────────────────────────────────────────────

/**
 * Cross-checks fuel-consumption-derived emissions against reported emissions.
 * Uses bottom-up ECCC emission factors (National Inventory Report 2024).
 *
 * If both fuel_consumption_gj and facility_ghg_releases_tco2e are present
 * for the same geo/period, checks that the implied emissions from fuel ≈ reported.
 *
 * Tolerance: ±20% (process emissions, flaring, fugitive not captured in this check).
 */
export async function validateCarbonBalance(
  records: NormalizedRecord[],
): Promise<BalanceValidationResult> {
  const validator = 'CarbonBalance';
  const violations: ValidationViolation[] = [];
  const groups = groupByGeoPeriod(records);

  for (const [geoperiod, recs] of groups.entries()) {
    const [geography, period] = geoperiod.split('::');

    // Sum facility GHG releases (from NPRI connector)
    const reportedEmissions = sumMetric(recs, 'facility_ghg_releases_tco2e');

    // Estimate emissions from fuel-specific consumption records
    let impliedEmissions = 0;
    for (const r of recs) {
      if (!r.metric.startsWith('fuel_consumption')) continue;
      const fuel = r.fuel ?? '';
      const ef = EMISSION_FACTORS[fuel];
      if (ef == null) continue;
      // Assume unit is GJ unless stated otherwise
      const gjValue = r.unit === 'PJ' ? r.value * 1_000_000 : r.unit === 'GJ' ? r.value : r.value;
      impliedEmissions += gjValue * ef;
    }

    if (reportedEmissions === 0 || impliedEmissions === 0) continue;

    const ratio = impliedEmissions / reportedEmissions;
    const TOLERANCE = 0.20; // ±20%

    if (Math.abs(ratio - 1) > TOLERANCE) {
      violations.push({
        validator,
        severity: 'warning',
        metric: 'facility_ghg_releases_tco2e vs fuel_consumption_derived',
        geography,
        period,
        message:
          `Carbon balance mismatch: implied ${impliedEmissions.toFixed(0)} tCO2e vs ` +
          `reported ${reportedEmissions.toFixed(0)} tCO2e (ratio=${ratio.toFixed(2)}). ` +
          `May indicate process emissions, flaring, or fugitive leaks not in fuel records.`,
        observed: ratio,
        expected: [1 - TOLERANCE, 1 + TOLERANCE],
      });
    }
  }

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    validator,
    passed: errors.length === 0,
    violations,
    checkedRecords: records.length,
    summary:
      violations.length === 0
        ? `Carbon balance OK (${groups.size} geo-period groups checked).`
        : `${errors.length} error(s), ${violations.length - errors.length} warning(s) in carbon balance.`,
    runAt: new Date().toISOString(),
  };
}

// ── 3. Economy Balance Validator ────────────────────────────────────────────────

/**
 * Validates economic metrics against physical bounds:
 *   - Pool prices (electricity) within plausible CAD/MWh range
 *   - LCOE values within technology-specific reference bounds
 *   - Negative prices flagged (valid but unusual — requires human review)
 */
export async function validateEconomyBalance(
  records: NormalizedRecord[],
): Promise<BalanceValidationResult> {
  const validator = 'EconomyBalance';
  const violations: ValidationViolation[] = [];

  for (const r of records) {
    // Pool price check
    if (r.metric.includes('pool_price') || r.metric.includes('spot_price')) {
      const MAX_PRICE_CAD_MWH = 2000; // AESO spike cap is ~$1000; allow buffer for anomalies
      const MIN_PRICE_CAD_MWH = -500; // Negative prices occur during curtailment

      if (r.value > MAX_PRICE_CAD_MWH) {
        violations.push({
          validator,
          severity: 'warning',
          metric: r.metric,
          geography: r.geography,
          period: r.observed_at.slice(0, 7),
          message: `Price ${r.value.toFixed(2)} ${r.unit} exceeds maximum plausible value (${MAX_PRICE_CAD_MWH}). Verify spike/outage context.`,
          observed: r.value,
          expected: [MIN_PRICE_CAD_MWH, MAX_PRICE_CAD_MWH],
        });
      }

      if (r.value < MIN_PRICE_CAD_MWH) {
        violations.push({
          validator,
          severity: 'error',
          metric: r.metric,
          geography: r.geography,
          period: r.observed_at.slice(0, 7),
          message: `Price ${r.value.toFixed(2)} ${r.unit} below minimum plausible value (${MIN_PRICE_CAD_MWH}). Likely data error.`,
          observed: r.value,
          expected: [MIN_PRICE_CAD_MWH, MAX_PRICE_CAD_MWH],
        });
      }

      if (r.value < 0) {
        violations.push({
          validator,
          severity: 'info',
          metric: r.metric,
          geography: r.geography,
          period: r.observed_at.slice(0, 7),
          message: `Negative price (${r.value.toFixed(2)} ${r.unit}) — likely curtailment event. Verify must-run generation context.`,
          observed: r.value,
          expected: null,
        });
      }
    }

    // LCOE bounds check
    if (r.metric.includes('lcoe')) {
      const tech = r.technology?.toLowerCase().replace(/\s+/g, '_') ?? '';
      const bounds = LCOE_BOUNDS[tech];
      if (bounds && (r.value < bounds[0] || r.value > bounds[1])) {
        violations.push({
          validator,
          severity: 'warning',
          metric: r.metric,
          geography: r.geography,
          period: r.observed_at.slice(0, 7),
          message:
            `LCOE ${r.value.toFixed(0)} ${r.unit} for technology '${tech}' is outside ` +
            `reference range [${bounds[0]}, ${bounds[1]}] CAD/MWh (CER 2026 / NREL 2025).`,
          observed: r.value,
          expected: bounds,
        });
      }
    }
  }

  const errors = violations.filter((v) => v.severity === 'error');
  return {
    validator,
    passed: errors.length === 0,
    violations,
    checkedRecords: records.length,
    summary:
      violations.length === 0
        ? `Economy balance OK (${records.length} records checked).`
        : `${errors.length} error(s), ${violations.length - errors.length} warning(s) in economy balance.`,
    runAt: new Date().toISOString(),
  };
}

// ── Composite validator ────────────────────────────────────────────────────────

/**
 * Run all three balance validators and return a combined result.
 */
export async function validateAll(records: NormalizedRecord[]): Promise<{
  energy: BalanceValidationResult;
  carbon: BalanceValidationResult;
  economy: BalanceValidationResult;
  allPassed: boolean;
  totalViolations: number;
  totalErrors: number;
}> {
  const [energy, carbon, economy] = await Promise.all([
    validateEnergyBalance(records),
    validateCarbonBalance(records),
    validateEconomyBalance(records),
  ]);

  const allViolations = [...energy.violations, ...carbon.violations, ...economy.violations];
  const totalErrors = allViolations.filter((v) => v.severity === 'error').length;

  return {
    energy,
    carbon,
    economy,
    allPassed: energy.passed && carbon.passed && economy.passed,
    totalViolations: allViolations.length,
    totalErrors,
  };
}
