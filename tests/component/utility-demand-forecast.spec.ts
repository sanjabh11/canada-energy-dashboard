import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

test.describe('Utility demand forecasting lane', () => {
  test('renders the utility-specific planning workflow with benchmark and export surfaces', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await expect(page.getByRole('heading', { name: 'Utility Demand Forecasting Lane' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Statistical, upload-first planning workflows for utilities')).toBeVisible();
    await expect(page.getByText('Download hourly starter CSV')).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toBeVisible();
    await expect(page.getByTestId('utility-forecast-export-card')).toBeVisible();
    await expect(page.getByText('Export utility forecast package')).toBeVisible();
  });
});
