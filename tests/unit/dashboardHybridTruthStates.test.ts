import { describe, expect, it } from 'vitest';
import { resolveEsgOverviewChartStates } from '../../src/components/ESGFinanceDashboard';
import { resolveRenewableTruthState } from '../../src/components/RenewableOptimizationHub';

describe('dashboard hybrid truth states', () => {
  it('marks ESG overview charts as reference-backed when overview rows are missing', () => {
    const state = resolveEsgOverviewChartStates(
      {
        summary: {
          total_green_bonds_cad: 1000000000,
          avg_esg_score: '7.4',
          total_sustainability_loans_cad: 500000000,
          projected_2030_carbon_cost_millions: '320',
        },
        top_performers: [],
        highest_carbon_exposure: [],
      },
      'overview',
    );

    expect(state.usesSampleTopPerformers).toBe(true);
    expect(state.usesSampleCarbonExposure).toBe(true);
    expect(state.overviewUsesReferenceCharts).toBe(true);
  });

  it('does not mark ESG table views as reference-backed when overview charts are not visible', () => {
    const state = resolveEsgOverviewChartStates(
      {
        summary: {
          total_green_bonds_cad: 1000000000,
          avg_esg_score: '7.4',
          total_sustainability_loans_cad: 500000000,
          projected_2030_carbon_cost_millions: '320',
        },
        top_performers: [],
        highest_carbon_exposure: [],
      },
      'green_bonds',
    );

    expect(state.usesSampleTopPerformers).toBe(false);
    expect(state.usesSampleCarbonExposure).toBe(false);
    expect(state.overviewUsesReferenceCharts).toBe(false);
  });

  it('shows only the award-evidence mock notice when award metrics are illustrative', () => {
    const state = resolveRenewableTruthState({
      usingMockData: true,
      usingMockPerformance: true,
      usingMockAwardMetrics: true,
    });

    expect(state.showGenericMockNotice).toBe(true);
    expect(state.showMockPerformanceNotice).toBe(false);
    expect(state.showMockAwardNotice).toBe(true);
  });

  it('shows the performance mock notice when forecast operations are real but performance history is not', () => {
    const state = resolveRenewableTruthState({
      usingMockData: true,
      usingMockPerformance: true,
      usingMockAwardMetrics: false,
    });

    expect(state.showGenericMockNotice).toBe(true);
    expect(state.showMockPerformanceNotice).toBe(true);
    expect(state.showMockAwardNotice).toBe(false);
  });
});
