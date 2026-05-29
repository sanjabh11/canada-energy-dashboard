import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

const aiLivePayload = {
  data_centres: [
    {
      id: 'dc-1',
      facility_name: 'Sample Alberta Campus',
      operator: 'CEIP Compute',
      location_city: 'Calgary',
      status: 'Operational',
      contracted_capacity_mw: 95,
      operational_capacity_mw: 95,
      pue: 1.21,
      power_source: 'Grid + Gas',
      renewable_percentage: 22,
      capital_investment_cad: 900000000,
    },
  ],
  summary: {
    total_count: 1,
    total_contracted_capacity_mw: 95,
    operational_capacity_mw: 95,
    by_status: { Operational: 1 },
    by_operator: { 'CEIP Compute': { count: 1, total_capacity_mw: 95 } },
  },
  grid_impact: {
    total_dc_load_mw: 95,
    dc_queue_mw: 500,
    total_queue_mw: 1600,
    current_peak_demand_mw: 12100,
    dc_percentage_of_peak: 0.79,
    reliability_rating: 'Adequate',
  },
  metadata: {
    last_updated: new Date().toISOString(),
    data_source: 'AI data centre edge API',
  },
};

const queuePayload = {
  queue: [],
  summary: {
    total_projects: 8,
    total_requested_mw: 1500,
    phase1_allocated_mw: 1050,
    phase1_remaining_mw: 150,
    by_type: { 'AI data centre': { count: 4, total_mw: 900 } },
    by_phase: {},
  },
  insights: {
    data_centre_dominance: { dc_projects: 4, dc_mw: 900, dc_percentage_of_queue: 60 },
    phase1_allocation_status: { limit_mw: 1200, allocated_mw: 1050, remaining_mw: 150, utilization_percentage: 87.5, is_fully_allocated: false },
    grid_reliability_concern: { queue_to_peak_ratio: 12.4, message: 'Queue pressure remains elevated.' },
  },
  metadata: {
    last_updated: new Date().toISOString(),
    data_source: 'AESO Queue API',
  },
};

const queueHistoryPayload = {
  history: [],
  metadata: { last_updated: new Date().toISOString(), snapshots_available: 0 },
};

function edgeRoutePattern(name: string) {
  return new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

test.describe('AI data centre large-load readiness panel', () => {
  test('renders the Alberta-only readiness overlay with proof exports', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('history=true') ? queueHistoryPayload : queuePayload) });
    });

    await page.goto(`${BASE_URL}/ai-datacentres`);
    await expect(page.getByTestId('large-load-readiness-panel')).toBeVisible();
    await expect(page.getByText('Large-Load Connection Readiness')).toBeVisible();
    await expect(page.getByTestId('large-load-constructed-scenario')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-large-load-readiness-summary')).toBeVisible();
  });
});
