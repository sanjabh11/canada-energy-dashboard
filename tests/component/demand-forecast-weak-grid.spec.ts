import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

test.describe('Demand forecast weak-grid discoverability', () => {
  test('shows the weak-grid fixture catalog card and full provenance when the short-circuit adapter is selected', async ({ page }) => {
    let modelMonitorRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('model-monitor/drift')) {
        modelMonitorRequests += 1;
      }
    });

    await page.goto(`${BASE_URL}/demand-forecast`);

    await expect(page.getByRole('heading', { name: 'Ontario Demand Forecasting' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Weak-grid fixture catalog')).toBeVisible();
    await expect(page.getByText('Switch ML domain to Weak Grid / SCED')).toBeVisible();

    await page.getByRole('button', { name: 'Forecast' }).click();
    await page.locator('select').nth(1).selectOption('short_circuit');

    await expect(page.getByText('Weak Grid / SCED active')).toBeVisible();
    await expect(page.getByText(/Scenario source:/)).toBeVisible();
    expect(modelMonitorRequests).toBe(0);
  });
});
