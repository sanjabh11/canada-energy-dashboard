import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';

test.describe('Forecast benchmarking trust surfaces', () => {
  test('shows the feature-ranking parity benchmark card', async ({ page }) => {
    await page.goto(`${BASE_URL}/forecast-benchmarking`);

    await expect(page.getByRole('heading', { name: 'Forecast Benchmarking' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('feature-ranking-benchmark-card')).toBeVisible();
    await expect(page.getByText('Feature Ranking / Parity Benchmark')).toBeVisible();
    await expect(page.getByText('Retained set:')).toBeVisible();
    await expect(page.getByText('Parity overlap')).toBeVisible();
  });
});
