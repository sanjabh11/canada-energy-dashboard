import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

// Edge function URL helper - ensures consistent URL construction
const EDGE_BASE = `${BASE_URL}/functions/v1`;

// Helper to create route patterns that match edge function URLs with query params
function edgeRoutePattern(endpoint: string): string {
  // Match any URL containing the endpoint (handles query params automatically)
  return `**/${endpoint}*`;
}

// Minimal valid payloads for mocking live edge responses
const hydrogenLivePayload = {
  facilities: [],
  projects: [],
  infrastructure: [],
  production: [],
  pricing: [],
  demand_forecast: [],
  price_forecasts: [],
  summary: {
    facilities: { total_count: 5, operational_count: 2, total_design_capacity_kg_per_day: 10000, operational_capacity_kg_per_day: 4000, by_type: {}, ccus_integrated_count: 1 },
    projects: { total_count: 3, total_investment_cad: 500000000, federal_funding_cad: 100000000, by_status: {} },
    infrastructure: { refueling_stations: 2, pipelines_km: 50, total_refueling_capacity: 1000 },
    production: { recent_daily_average_kg: 2000, average_carbon_intensity: 2.5, average_efficiency: 0.65 },
    pricing: { current_price_cad_per_kg: 3.5, weekly_change_percentage: 0.5, yearly_average: 3.2 },
  },
  insights: {
    hub_status: { edmonton_hub: { capacity_kg_per_day: 6000, project_count: 2, investment_cad: 300000000 }, calgary_hub: { capacity_kg_per_day: 4000, project_count: 1, investment_cad: 200000000 } },
    color_distribution: { green_percentage: 40, blue_percentage: 35, grey_percentage: 25 },
  },
  metadata: {
    province: 'AB',
    last_updated: new Date().toISOString(),
    data_source: 'Hydrogen hub edge API',
    strategic_context: 'Alberta Hydrogen Roadmap',
  },
};

const mineralsLivePayload = {
  projects: [],
  supply_chain: [],
  battery_facilities: [],
  prices: [],
  trade_flows: [],
  ev_demand_forecast: [],
  stockpile: [],
  summary: {
    projects: { total_count: 12, priority_mineral_count: 6, total_investment_cad: 6400000000, federal_funding_cad: 2000000000, by_province: {}, by_stage: {} },
    supply_chain: { stages: [], gaps: [] },
    battery_facilities: { total_count: 3, total_capacity_gwh: 50, minerals_demand: { lithium_tonnes_per_year: 1000, cobalt_tonnes_per_year: 500, nickel_tonnes_per_year: 2000, graphite_tonnes_per_year: 1500 } },
    pricing: { price_volatility: {} },
    trade: { china_dependency: 45 },
    stockpile: { critical_status_count: 2, low_status_count: 3 },
  },
  insights: {
    strategic_recommendations: [],
    supply_chain_gaps: [{ gap_description: 'Domestic refining capacity limited' }],
    investment_opportunities: [],
  },
  metadata: {
    last_updated: new Date().toISOString(),
    data_source: 'Critical minerals edge API',
    strategic_context: '$6.4B Federal Investment',
    priority_minerals: ['Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Copper', 'Rare Earth Elements'],
  },
};

const aiLivePayload = {
  data_centres: [],
  summary: {
    total_count: 8,
    total_contracted_capacity_mw: 2500,
    operational_capacity_mw: 1200,
    queued_capacity_mw: 1300,
    by_status: { Operational: 4, 'Under Construction': 2, 'Interconnection Queue': 2 },
    by_operator: {},
    average_pue: 1.25,
  },
  grid_impact: {
    current_peak_demand_mw: 12100,
    total_dc_load_mw: 425,
    dc_percentage_of_peak: 3.51,
    total_queue_mw: 8500,
    dc_queue_mw: 3200,
    reliability_rating: 'Adequate',
    phase1_allocated_mw: 800,
    phase1_remaining_mw: 400,
  },
  power_consumption: [],
  metadata: {
    province: 'AB',
    last_updated: new Date().toISOString(),
    data_source: 'AI data centre edge API',
    strategic_context: "Alberta's $100B AI Data Centre Strategy",
  },
};

test.describe('Dashboard Route Accessibility', () => {
  test('Hydrogen routes load successfully', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hydrogenLivePayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    await expect(page.getByText('Hydrogen Economy Hub Dashboard')).toBeVisible();
  });

  test('Hydrogen alias /hydrogen-economy loads successfully', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hydrogenLivePayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen-economy`);
    await expect(page.getByText('Hydrogen Economy Hub Dashboard')).toBeVisible();
  });

  test('Critical Minerals route loads with content', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mineralsLivePayload) });
    });
    await page.goto(`${BASE_URL}/critical-minerals`);
    await expect(page.getByText('Critical Minerals Supply Chain Intelligence')).toBeVisible();
  });

  test('AI Data Centre routes load successfully', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [],
          summary: { total_projects: 0, total_requested_mw: 0, phase1_allocated_mw: 0, phase1_remaining_mw: 1200, by_type: {}, by_phase: {} },
          insights: { data_centre_dominance: { dc_projects: 0, dc_mw: 0, dc_percentage_of_queue: 0 }, phase1_allocation_status: { limit_mw: 1200, allocated_mw: 0, remaining_mw: 1200, utilization_percentage: 0, is_fully_allocated: false }, grid_reliability_concern: { queue_to_peak_ratio: 0, message: '' } },
          metadata: { last_updated: new Date().toISOString(), data_source: 'AESO Queue API' }
        })
      });
    });
    await page.goto(`${BASE_URL}/ai-data-centre`);
    await expect(page.getByText('AI Data Centre Energy Dashboard')).toBeVisible();
  });

  test('AI alias /ai-datacentre loads successfully', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [],
          summary: { total_projects: 0, total_requested_mw: 0, phase1_allocated_mw: 0, phase1_remaining_mw: 1200, by_type: {}, by_phase: {} },
          insights: { data_centre_dominance: { dc_projects: 0, dc_mw: 0, dc_percentage_of_queue: 0 }, phase1_allocation_status: { limit_mw: 1200, allocated_mw: 0, remaining_mw: 1200, utilization_percentage: 0, is_fully_allocated: false }, grid_reliability_concern: { queue_to_peak_ratio: 0, message: '' } },
          metadata: { last_updated: new Date().toISOString(), data_source: 'AESO Queue API' }
        })
      });
    });
    await page.goto(`${BASE_URL}/ai-datacentre`);
    await expect(page.getByText('AI Data Centre Energy Dashboard')).toBeVisible();
  });
});

test.describe('Hydrogen Dashboard Provenance States', () => {
  test('live state: shows source-backed provenance and no fallback banners', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hydrogenLivePayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify dashboard loads with source-backed data indicator
    await expect(page.getByText('Hydrogen Economy Hub Dashboard')).toBeVisible();
    await expect(page.getByText(/Hydrogen hub edge API/)).toBeVisible();
    // Verify no fallback banners appear
    await expect(page.getByText('Persisted backend snapshot in use')).not.toBeVisible();
    await expect(page.getByText('Cached snapshot data in use')).not.toBeVisible();
  });

  test('persisted snapshot state: shows persisted backend snapshot banner', async ({ page }) => {
    const persistedPayload = {
      ...hydrogenLivePayload,
      metadata: {
        ...hydrogenLivePayload.metadata,
        snapshot_type: 'persisted_snapshot',
        is_fallback: true,
        last_updated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    };
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(persistedPayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify persisted backend snapshot banner appears
    await expect(page.getByText('Persisted backend snapshot in use')).toBeVisible();
  });

  test('browser cache state: shows cached snapshot banner when network fails', async ({ page }) => {
    // Pre-seed browser cache with valid snapshot
    await page.addInitScript((payload) => {
      const snapshot = { payload, cachedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      localStorage.setItem('dashboard_snapshot_hydrogen_economy', JSON.stringify(snapshot));
    }, hydrogenLivePayload);
    // Block network requests
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify cached snapshot banner appears
    await expect(page.getByText('Cached snapshot data in use')).toBeVisible();
  });

  test('unavailable state: shows truthful error when no data sources exist', async ({ page }) => {
    // Clear cache and block network
    await page.addInitScript(() => {
      localStorage.removeItem('dashboard_snapshot_hydrogen_economy');
    });
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify truthful error about missing snapshot
    await expect(page.getByText(/no persisted or browser-cached snapshot/i)).toBeVisible();
  });
});

test.describe('Critical Minerals Dashboard Provenance States', () => {
  test('live state: shows source-backed provenance and no fallback banners', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mineralsLivePayload) });
    });
    await page.goto(`${BASE_URL}/critical-minerals`);
    // Verify live state with source-backed data
    await expect(page.getByText('Critical Minerals Supply Chain Intelligence')).toBeVisible();
    await expect(page.getByText(/Critical minerals edge API/)).toBeVisible();
    // Verify no fallback banners
    await expect(page.getByText('Persisted backend snapshot in use')).not.toBeVisible();
    await expect(page.getByText('Cached snapshot data in use')).not.toBeVisible();
  });

  test('persisted snapshot state: shows persisted backend snapshot banner', async ({ page }) => {
    const persistedPayload = {
      ...mineralsLivePayload,
      metadata: {
        ...mineralsLivePayload.metadata,
        snapshot_type: 'persisted_snapshot',
        is_fallback: true,
        last_updated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    };
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(persistedPayload) });
    });
    await page.goto(`${BASE_URL}/critical-minerals`);
    // Verify persisted backend snapshot banner
    await expect(page.getByText('Persisted backend snapshot in use')).toBeVisible();
  });

  test('browser cache state: shows cached snapshot banner when network fails', async ({ page }) => {
    // Pre-seed browser cache
    await page.addInitScript((payload) => {
      const snapshot = { payload, cachedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      localStorage.setItem('dashboard_snapshot_critical_minerals', JSON.stringify(snapshot));
    }, mineralsLivePayload);
    // Block network
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/critical-minerals`);
    // Verify cached snapshot banner
    await expect(page.getByText('Cached snapshot data in use')).toBeVisible();
  });

  test('loading skeleton transitions to content', async ({ page }) => {
    // Delay response to show loading state
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mineralsLivePayload) });
    });
    await page.goto(`${BASE_URL}/critical-minerals`);
    // Should show loading initially then transition to content
    await expect(page.getByText('Loading Critical Minerals Dashboard')).toBeVisible();
    await expect(page.getByText('Critical Minerals Supply Chain Intelligence')).toBeVisible();
  });
});

test.describe('AI Data Centre Dashboard Provenance States', () => {
  test('live state: shows source-backed provenance with metric indicators', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [],
          summary: { total_projects: 0, total_requested_mw: 0, phase1_allocated_mw: 0, phase1_remaining_mw: 1200, by_type: {}, by_phase: {} },
          insights: { data_centre_dominance: { dc_projects: 0, dc_mw: 0, dc_percentage_of_queue: 0 }, phase1_allocation_status: { limit_mw: 1200, allocated_mw: 0, remaining_mw: 1200, utilization_percentage: 0, is_fully_allocated: false }, grid_reliability_concern: { queue_to_peak_ratio: 0, message: '' } },
          metadata: { last_updated: new Date().toISOString(), data_source: 'AESO Queue API' }
        })
      });
    });
    await page.goto(`${BASE_URL}/ai-data-centre`);
    // Verify live state
    await expect(page.getByText('AI Data Centre Energy Dashboard')).toBeVisible();
    await expect(page.getByText(/AI data centre edge API/)).toBeVisible();
    // Verify no fallback banners
    await expect(page.getByText('Persisted backend snapshot in use')).not.toBeVisible();
    await expect(page.getByText('Cached snapshot data in use')).not.toBeVisible();
  });

  test('browser cache state: shows cached snapshot banner when network fails', async ({ page }) => {
    // Pre-seed browser cache with proper structure
    const cachedPayload = {
      dcData: aiLivePayload,
      queueData: {
        queue: [],
        summary: { total_projects: 0, total_requested_mw: 0, phase1_allocated_mw: 0, phase1_remaining_mw: 1200, by_type: {}, by_phase: {} },
        insights: { data_centre_dominance: { dc_projects: 0, dc_mw: 0, dc_percentage_of_queue: 0 }, phase1_allocation_status: { limit_mw: 1200, allocated_mw: 0, remaining_mw: 1200, utilization_percentage: 0, is_fully_allocated: false }, grid_reliability_concern: { queue_to_peak_ratio: 0, message: '' } },
        metadata: { last_updated: new Date().toISOString(), data_source: 'AESO Queue API' },
      },
      queueHistory: null,
    };
    await page.addInitScript((payload) => {
      const snapshot = { payload, cachedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      localStorage.setItem('dashboard_snapshot_ai_data_centre', JSON.stringify(snapshot));
    }, cachedPayload);
    // Block network
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.abort('failed');
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/ai-data-centre`);
    // Verify cached snapshot banner
    await expect(page.getByText('Cached snapshot data in use')).toBeVisible();
  });

  test('unavailable state: truthful source-unavailable without demo data', async ({ page }) => {
    // Clear cache and block network
    await page.addInitScript(() => {
      localStorage.removeItem('dashboard_snapshot_ai_data_centre');
    });
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.abort('failed');
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/ai-data-centre`);
    // Verify unavailable state text
    await expect(page.getByText('AI Data Centre source-backed snapshot unavailable')).toBeVisible();
    // Verify page does not contain misleading demo indicators
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toMatch(/demo data|sample queue|sample facility/i);
  });
});


test.describe('Metric-Level Provenance Indicators', () => {
  test('metric cards show source-backed data in live mode', async ({ page }) => {
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hydrogenLivePayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify dashboard and metric cards load with live data
    await expect(page.getByText('Hydrogen Economy Hub Dashboard')).toBeVisible();
    await expect(page.getByText('Total Facilities')).toBeVisible();
    // Verify no fallback banners
    await expect(page.getByText('Persisted backend snapshot in use')).not.toBeVisible();
  });

  test('metric cards show fallback notice in stale/cached mode', async ({ page }) => {
    const stalePayload = {
      ...hydrogenLivePayload,
      metadata: {
        ...hydrogenLivePayload.metadata,
        snapshot_type: 'persisted_snapshot',
        is_fallback: true,
        last_updated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    };
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stalePayload) });
    });
    await page.goto(`${BASE_URL}/hydrogen`);
    // Verify persisted snapshot banner appears for stale data
    await expect(page.getByText('Persisted backend snapshot in use')).toBeVisible();
  });
});

test.describe('Stakeholder Dashboard Provenance States', () => {
  test('sample/mock state: shows illustrative data notice', async ({ page }) => {
    // Block API to force sample data fallback
    await page.route('/api/stakeholder/**', async (route) => {
      await route.abort('failed');
    });
    // Ensure no cached snapshot exists
    await page.addInitScript(() => {
      localStorage.removeItem('dashboard_snapshot_stakeholder');
    });
    await page.goto(`${BASE_URL}/stakeholder`);
    // Verify sample data notice appears
    await expect(page.getByText('Illustrative stakeholder data in use')).toBeVisible();
    await expect(page.getByText(/Sample stakeholder data/)).toBeVisible();
  });

  test('cached state: shows cached snapshot notice when network fails', async ({ page }) => {
    const cachedPayload = {
      stakeholders: [],
      meetings: [],
      feedback: [],
      messages: [],
      metadata: {
        data_source: 'Stakeholder coordination API',
        last_updated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        snapshot_type: 'live',
      },
    };
    await page.addInitScript((payload) => {
      const snapshot = { payload, cachedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      localStorage.setItem('dashboard_snapshot_stakeholder', JSON.stringify(snapshot));
    }, cachedPayload);
    // Block network
    await page.route('/api/stakeholder/**', async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/stakeholder`);
    // Verify cached snapshot banner
    await expect(page.getByText('Cached stakeholder data in use')).toBeVisible();
  });

  test('route loads with correct title', async ({ page }) => {
    await page.goto(`${BASE_URL}/stakeholder`);
    await expect(page.getByRole('heading', { name: 'Stakeholder Coordination Dashboard' })).toBeVisible();
  });
});

test.describe('Compliance Dashboard Provenance States', () => {
  test('mock state: shows illustrative data notice', async ({ page }) => {
    // Block API to force mock data fallback
    await page.route('/api/compliance/**', async (route) => {
      await route.abort('failed');
    });
    // Ensure no cached snapshot exists
    await page.addInitScript(() => {
      localStorage.removeItem('dashboard_snapshot_compliance');
    });
    await page.goto(`${BASE_URL}/compliance`);
    // Verify mock data notice appears
    await expect(page.getByText('Illustrative compliance data in use')).toBeVisible();
  });

  test('cached state: shows cached snapshot notice when network fails', async ({ page }) => {
    const cachedPayload = {
      projects: [],
      violations: [],
      auditLog: [],
      alerts: [],
      metadata: {
        data_source: 'Environment Canada & Provincial Regulator APIs',
        last_updated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        snapshot_type: 'live',
      },
    };
    await page.addInitScript((payload) => {
      const snapshot = { payload, cachedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };
      localStorage.setItem('dashboard_snapshot_compliance', JSON.stringify(snapshot));
    }, cachedPayload);
    // Block network
    await page.route('/api/compliance/**', async (route) => {
      await route.abort('failed');
    });
    await page.goto(`${BASE_URL}/compliance`);
    // Verify cached snapshot banner
    await expect(page.getByText('Cached compliance data in use')).toBeVisible();
  });

  test('route loads with correct title', async ({ page }) => {
    await page.goto(`${BASE_URL}/compliance`);
    await expect(page.getByText('Regulatory Compliance Monitoring')).toBeVisible();
  });
});
test.describe('No Demo Data Indicators', () => {
  test('no misleading demo indicators when edge functions are mocked', async ({ page }) => {
    // Setup routes with live payloads (no demo/sample data)
    await page.route(edgeRoutePattern('api-v2-hydrogen-hub'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hydrogenLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-minerals-supply-chain'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mineralsLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-ai-datacentres'), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aiLivePayload) });
    });
    await page.route(edgeRoutePattern('api-v2-aeso-queue'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          queue: [],
          summary: { total_projects: 0, total_requested_mw: 0, phase1_allocated_mw: 0, phase1_remaining_mw: 1200, by_type: {}, by_phase: {} },
          insights: { data_centre_dominance: { dc_projects: 0, dc_mw: 0, dc_percentage_of_queue: 0 }, phase1_allocation_status: { limit_mw: 1200, allocated_mw: 0, remaining_mw: 1200, utilization_percentage: 0, is_fully_allocated: false }, grid_reliability_concern: { queue_to_peak_ratio: 0, message: '' } },
          metadata: { last_updated: new Date().toISOString(), data_source: 'AESO Queue API' }
        })
      });
    });

    const dashboards = [
      { route: '/hydrogen', name: 'hydrogen' },
      { route: '/critical-minerals', name: 'minerals' },
      { route: '/ai-data-centre', name: 'ai' },
    ];

    for (const { route, name } of dashboards) {
      await page.goto(`${BASE_URL}${route}`);
      const pageText = await page.locator('body').innerText();
      // Should NOT contain misleading demo/sample language in mocked live mode
      expect(pageText).not.toMatch(/demo data|sample queue|sample facility/i);
      console.log(`${name}: No misleading demo indicators ✓`);
    }
  });
});
