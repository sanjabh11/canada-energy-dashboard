import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('UtilityAPI demo lane', () => {
  test('keeps fixture replay public while hiding live controls until an operator session exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/utilityapi-demo`);

    await expect(page.getByRole('heading', { name: 'UtilityAPI Demo Lane' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('UtilityAPI DEMO only', { exact: true })).toBeVisible();
    await expect(page.getByText('Not London Hydro readiness')).toBeVisible();
    await expect(page.getByText('Not Alectra readiness')).toBeVisible();
    await expect(page.getByTestId('utilityapi-demo-operator-panel')).toContainText('Operator Live Access');
    await expect(page.getByRole('button', { name: 'Launch Live Demo' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue with Fixture Replay' })).toBeVisible();

    await page.getByRole('button', { name: 'Continue with Fixture Replay' }).click();

    await expect(page.getByTestId('utilityapi-demo-page').getByText('replayed')).toBeVisible();
    await expect(page.getByTestId('utilityapi-demo-interval-count')).toHaveText('48');
    await expect(page.getByText('Bundled fixture replay loaded without any edge-network request.')).toBeVisible();
    await expect(page.getByText('AI Upsampling Active: 60m → 15m')).toBeVisible();
    await expect(page.getByTestId('utilityapi-demo-forecast').getByText('Expected case preview')).toBeVisible();
  });
});
