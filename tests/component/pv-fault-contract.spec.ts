import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { buildPvFaultNodeFeatureVector, forwardGnn } from '../../src/lib/modelInference';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

const pvWeights = JSON.parse(
  readFileSync(new URL('../../src/lib/modelWeights/pv-gnn-v2.json', import.meta.url), 'utf8'),
);

const previewScenario = {
  nodes: [
    { id: 'pv-a', expectedOutputMw: 2.4, observedOutputMw: 1.2, voltageV: 545, inverterTempC: 61, irradiance: 780 },
    { id: 'pv-b', expectedOutputMw: 2.2, observedOutputMw: 2.1, voltageV: 598, inverterTempC: 44, irradiance: 760 },
    { id: 'pv-c', expectedOutputMw: 2.1, observedOutputMw: 0.2, voltageV: 504, inverterTempC: 79, irradiance: 640, offline: true },
  ],
  edges: [
    { fromNodeId: 'pv-a', toNodeId: 'pv-b', weight: 1 },
    { fromNodeId: 'pv-b', toNodeId: 'pv-c', weight: 1 },
  ],
} as const;

test.describe('PV fault contract chip', () => {
  test('resilience route surfaces the simulator-calibrated PV contract', async ({ page }) => {
    await page.route('**/functions/v1/**', async (route) => {
      await route.abort('failed');
    });

    await page.goto(`${BASE_URL}/resilience`);

    await expect(page.getByRole('heading', { name: 'Infrastructure Resilience Map' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('PV fault contract active')).toBeVisible();
    await expect(page.getByText('Simulator-Calibrated V1')).toBeVisible();
    await expect(page.getByText(/pv-gnn-v2/)).toBeVisible();
    await expect(page.getByText(/Scenario count 20,000/)).toBeVisible();
    await expect(page.getByTestId('pv-contract-suspects')).toBeVisible();

    const expectedOrder = forwardGnn(
      pvWeights as any,
      previewScenario.nodes.map((node) => ({
        id: node.id,
        features: buildPvFaultNodeFeatureVector(node),
      })),
      previewScenario.edges.map((edge) => ({
        from: edge.fromNodeId,
        to: edge.toNodeId,
        weight: edge.weight,
      })),
    ).topSuspects.map((entry) => entry.nodeId);
    const renderedOrder = await page
      .getByTestId('pv-contract-suspects')
      .locator('[data-node-id]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-node-id')));

    expect(renderedOrder).toEqual(expectedOrder);
  });
});
