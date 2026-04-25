import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

const groundsourceLivePayload = {
  source_group: 'utility_public',
  source_count: 4,
  llm_source_count: 4,
  heuristic_source_count: 0,
  extraction_mode: 'llm',
  fallback_reason: null,
  documents: [{ id: 'doc-1' }],
  events: [
    {
      id: 'event-1',
      event_type: 'policy',
      province: 'AB',
      severity: 'medium',
      summary: 'Structured Gemini extraction from allowlisted public sources.',
      source_url: 'https://www.aeso.ca/',
      latitude: 51.0447,
      longitude: -114.0719,
      event_timestamp: '2026-04-24T00:00:00.000Z',
    },
  ],
  event_count: 1,
  provenance_score: 0.91,
  meta: {
    model_version: 'groundsource-miner-v1',
    generated_at: '2026-04-24T00:00:00.000Z',
    valid_at: '2026-04-24T00:00:00.000Z',
    confidence_score: 0.91,
    data_sources: [{ name: 'AESO', url: 'https://www.aeso.ca/' }],
    is_fallback: false,
    staleness_status: 'fresh',
    methodology: 'Allowlisted public-source fetch, content hash deduplication, and structured LLM extraction with heuristic fallback.',
    warnings: [],
    claim_label: 'validated',
  },
};

const groundsourceFallbackPayload = {
  ...groundsourceLivePayload,
  source_count: 2,
  llm_source_count: 1,
  heuristic_source_count: 1,
  extraction_mode: 'mixed',
  fallback_reason: 'llm_parse_failed',
  documents: [],
  events: [],
  event_count: 0,
  provenance_score: 0.62,
  meta: {
    ...groundsourceLivePayload.meta,
    is_fallback: true,
    claim_label: 'advisory',
  },
};

test.describe('Groundsource provenance chip', () => {
  test('renders heuristic fallback provenance on /resilience', async ({ page }) => {
    let ingestRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('groundsource-miner')) {
        ingestRequests += 1;
      }
    });

    await page.route('**/rest/v1/dashboard_summary_snapshots*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary_payload: groundsourceFallbackPayload,
          snapshot_stored_at: '2026-04-24T00:00:00.000Z',
          source_updated_at: '2026-04-24T00:00:00.000Z',
          source_label: 'groundsource-miner',
        }),
      });
    });

    await page.goto(`${BASE_URL}/resilience`);
    await expect(page.getByRole('heading', { name: 'Infrastructure Resilience Map' })).toBeVisible({ timeout: 30000 });

    const provenance = page.getByTestId('groundsource-provenance');

    await expect(provenance).toBeVisible();
    await expect(provenance).toContainText('Groundsource intelligence:');
    await expect(provenance).toContainText('Extraction mode: mixed');
    await expect(provenance).toContainText('LLM sources: 1');
    await expect(provenance).toContainText('Heuristic sources: 1');
    await expect(provenance).toContainText('Source count: 2');
    await expect(provenance).toContainText('Fallback reason: llm_parse_failed');
    await expect(provenance).toContainText('Claim label: advisory');
    expect(ingestRequests).toBe(0);
  });
});
