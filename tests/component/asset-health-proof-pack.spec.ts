import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Asset health proof pack', () => {
  test('promotes the sample fleet into top actions and proof exports', async ({ page }) => {
    await page.goto(`${BASE_URL}/asset-health`);

    await expect(page.getByRole('heading', { name: 'Asset Health Index' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Load Sample Data (10 Assets)' }).click();

    await expect(page.getByText('Asset capex proof pack')).toBeVisible();
    await expect(page.getByText('Executive summary export')).toBeVisible();
    await expect(page.getByText('Prioritized replacement list', { exact: true })).toBeVisible();
    await expect(page.getByText('Top actions for the current fleet')).toBeVisible();
    await expect(page.getByText('Prioritized replacement and inspection candidates with deterministic rationale from the existing scoring model.')).toBeVisible();
  });
});
