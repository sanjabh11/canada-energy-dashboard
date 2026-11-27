import { describe, expect, it } from 'vitest';
import {
  buildUtilityForecastPackage,
  type UtilityPlanningScenario,
} from '../../src/lib/utilityForecasting';
import type { UtilityHistoricalLoadRow } from '../../src/lib/types/utilityForecasting';
import {
  persistenceForecast,
  seasonalNaiveForecast,
} from '../../src/lib/forecastBaselines';

function buildScenario(jurisdiction: 'Ontario' | 'Alberta'): UtilityPlanningScenario {
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.4 : 1.7,
    committed_load_mw: 4,
    ev_growth_mw: 3,
    heat_pump_growth_mw: 2,
    der_offset_mw: 1.5,
    demand_response_reduction_mw: 1,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
  };
}

function hourlyRows(
  count: number,
  entities: Array<{ geography_level: 'feeder' | 'substation' | 'system'; geography_id: string; demand_mw: number }>,
  sourceSystem = 'scope-fixture',
): UtilityHistoricalLoadRow[] {
  return Array.from({ length: count }, (_, index) => {
    const timestamp = new Date(Date.UTC(2025, 0, 1) + index * 3_600_000).toISOString();
    return entities.map((entity) => ({
      timestamp,
      geography_level: entity.geography_level,
      geography_id: entity.geography_id,
      customer_class: 'general',
      demand_mw: entity.demand_mw,
      gross_load_mw: entity.demand_mw,
      source_system: sourceSystem,
    }));
  }).flat();
}

function monthlyRows(
  count: number,
  geographyId = 'SUB-M1',
): UtilityHistoricalLoadRow[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: new Date(Date.UTC(2020 + Math.floor(index / 12), index % 12, 1)).toISOString(),
    geography_level: 'substation' as const,
    geography_id: geographyId,
    customer_class: 'general',
    demand_mw: 100 + (index % 12) * 2,
    gross_load_mw: 100 + (index % 12) * 2,
    source_system: 'monthly-scope-fixture',
  }));
}

describe('forecast completeness scope', () => {
  it('never claims a complete hierarchy when a child entity could be wholly absent', () => {
    // Feeder-level input only. F1 and F2 cover every timestamp, but a third
    // feeder absent at every timestamp would never enter the entity inventory —
    // the scope must stay "observed_entities", not "complete".
    const rows = hourlyRows(600, [
      { geography_level: 'feeder', geography_id: 'F1', demand_mw: 40 },
      { geography_level: 'feeder', geography_id: 'F2', demand_mw: 60 },
    ]);

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'feeder-only.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.evidence_report.hierarchy_completeness_scope).toBe('observed_entities');
    expect(forecastPackage.warnings.some((warning) => warning.includes('no authoritative entity inventory'))).toBe(true);
    expect(forecastPackage.warnings.some((warning) => warning.includes('complete feeder geography/customer-class grid'))).toBe(false);
    expect(forecastPackage.warnings.some((warning) => /\bcomplete\b/i.test(warning) && warning.includes('grid'))).toBe(false);
  });

  it('reports unknown scope when even the observed entity grid has missing intervals', () => {
    const rows = hourlyRows(48, [
      { geography_level: 'feeder', geography_id: 'F1', demand_mw: 40 },
    ]).concat(
      // F2 reports only half of the observed timestamps.
      hourlyRows(24, [{ geography_level: 'feeder', geography_id: 'F2', demand_mw: 60 }]),
    );

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'feeder-gappy.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.evidence_report.hierarchy_completeness_scope).toBe('unknown');
    expect(forecastPackage.warnings.some((warning) => warning.includes('missing'))).toBe(true);
    expect(forecastPackage.warnings.some((warning) => warning.includes('geography/customer-class grid'))).toBe(false);
  });

  it('claims complete_system only for a measured system-level series', () => {
    const rows = hourlyRows(48, [
      { geography_level: 'system', geography_id: 'SYSTEM', demand_mw: 100 },
      { geography_level: 'feeder', geography_id: 'F1', demand_mw: 40 },
    ]);

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'system-and-feeder.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.evidence_report.hierarchy_completeness_scope).toBe('complete_system');
    expect(forecastPackage.summary.geographies).toEqual(['SYSTEM']);
  });
});

describe('short-history seasonal baseline availability', () => {
  it('marks the seasonal baseline unavailable for short hourly history and excludes it from comparisons', () => {
    const rows = hourlyRows(40, [
      { geography_level: 'feeder', geography_id: 'SHORT-F1', demand_mw: 50 },
    ]);

    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'short-hourly.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.evidence_report.baseline_status).toBe('insufficient_history');
    expect(forecastPackage.benchmark.seasonal_naive_mae).toBeNaN();
    expect(Number.isNaN(forecastPackage.benchmark.skill_score_vs_seasonal)).toBe(true);
    expect(forecastPackage.evidence_report.champion_challenger.challenger).toBe('persistence');
    expect(forecastPackage.warnings.some((warning) => warning.includes('Seasonal-naive baseline unavailable'))).toBe(true);
  });

  it('marks the seasonal baseline unavailable for short monthly history', () => {
    const forecastPackage = buildUtilityForecastPackage({
      rows: monthlyRows(14),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'short-monthly.csv',
      sourceKind: 'uploaded_historical',
    });

    expect(forecastPackage.summary.granularity).toBe('monthly');
    expect(forecastPackage.evidence_report.baseline_status).toBe('insufficient_history');
    expect(forecastPackage.benchmark.seasonal_naive_mae).toBeNaN();
    expect(forecastPackage.evidence_report.champion_challenger.challenger).toBe('persistence');
  });
});

describe('fixed-origin comparison windows', () => {
  it('scores model and both baselines on identical 24-step and 72-step test windows', () => {
    const rows = hourlyRows(600, [
      { geography_level: 'feeder', geography_id: 'ORIGIN-F1', demand_mw: 100 },
    ]);
    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'fixed-origin-windows.csv',
      sourceKind: 'uploaded_historical',
    });

    // 72-step primary holdout: model and both baselines scored on the same window.
    expect(forecastPackage.benchmark.sample_size).toBe(72);
    expect(Number.isFinite(forecastPackage.benchmark.mae)).toBe(true);
    expect(Number.isFinite(forecastPackage.benchmark.persistence_mae)).toBe(true);
    expect(Number.isFinite(forecastPackage.benchmark.seasonal_naive_mae)).toBe(true);
    expect(forecastPackage.evidence_report.baseline_status).toBe('measured');

    // 24-step rolling fold: same-window scoring for model and both baselines.
    const lastSplit = forecastPackage.evidence_report.rolling_origin_splits.at(-1);
    expect(lastSplit?.test_window_steps).toBe(24);
    expect(lastSplit?.baseline_status).toBe('measured');
    expect(Number.isFinite(lastSplit?.mae)).toBe(true);
    expect(Number.isFinite(lastSplit?.persistence_mae)).toBe(true);
    expect(lastSplit?.seasonal_naive_mae).not.toBeNull();
    expect(Number.isFinite(lastSplit?.seasonal_naive_mae)).toBe(true);

    // Baseline forecast builders emit exactly the test-window length requested.
    const trainValues = rows.slice(0, 408).map((row) => row.demand_mw);
    expect(seasonalNaiveForecast(trainValues, 24, 24, 168).values).toHaveLength(24);
    expect(persistenceForecast(trainValues.at(-1) ?? 0, 24).values).toHaveLength(24);
  });
});

describe('per-fold forecast lead ranges', () => {
  it('reports hourly folds at leads 169-192 for a 168-step calibration tail', () => {
    const rows = hourlyRows(600, [
      { geography_level: 'feeder', geography_id: 'LEAD-F1', demand_mw: 100 },
    ]);
    const forecastPackage = buildUtilityForecastPackage({
      rows,
      scenario: buildScenario('Ontario'),
      sourceLabel: 'lead-ranges.csv',
      sourceKind: 'uploaded_historical',
    });

    const splits = forecastPackage.evidence_report.rolling_origin_splits;
    expect(splits).toHaveLength(3);
    splits.forEach((split) => {
      expect(split.test_window_steps).toBe(split.test_count);
      expect(split.forecast_lead_start).toBe(split.calibration_count + 1);
      expect(split.forecast_lead_end).toBe(split.forecast_lead_start + split.test_window_steps - 1);
      expect(split.forecast_lead_start).toBe(169);
      expect(split.forecast_lead_end).toBe(192);
    });
  });

  it('reports monthly fold leads from the fit origin, falling back to leads 1-3 without a calibration tail', () => {
    const longHistory = buildUtilityForecastPackage({
      rows: monthlyRows(75),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'monthly-leads.csv',
      sourceKind: 'uploaded_historical',
    });
    const longSplits = longHistory.evidence_report.rolling_origin_splits;
    expect(longSplits.length).toBeGreaterThan(0);
    longSplits.forEach((split) => {
      expect(split.test_window_steps).toBe(3);
      expect(split.forecast_lead_start).toBe(31);
      expect(split.forecast_lead_end).toBe(33);
    });

    const shortHistory = buildUtilityForecastPackage({
      rows: monthlyRows(45),
      scenario: buildScenario('Ontario'),
      sourceLabel: 'monthly-leads-short.csv',
      sourceKind: 'uploaded_historical',
    });
    const shortSplits = shortHistory.evidence_report.rolling_origin_splits;
    expect(shortSplits.length).toBeGreaterThan(0);
    shortSplits.forEach((split) => {
      expect(split.test_window_steps).toBe(3);
      expect(split.forecast_lead_start).toBe(1);
      expect(split.forecast_lead_end).toBe(3);
    });
  });
});
