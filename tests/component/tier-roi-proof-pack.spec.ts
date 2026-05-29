import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('TIER ROI proof pack', () => {
  test('loads the sample facility preset and surfaces provenance plus memo-oriented CTAs', async ({ page }) => {
    await page.goto(`${BASE_URL}/roi-calculator`);

    await expect(page.getByRole('heading', { name: 'TIER Compliance Savings Calculator' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TIER CFO memo pack')).toBeVisible();

    await page.getByRole('button', { name: 'Load preset' }).click();

    const inputs = page.locator('input[type="number"]');
    await expect(inputs.nth(0)).toHaveValue('162000');
    await expect(inputs.nth(1)).toHaveValue('24000');
    await expect(inputs.nth(2)).toHaveValue('650000');

    await expect(page.getByText('Fund price provenance')).toBeVisible();
    await expect(page.getByText('Market price provenance')).toBeVisible();
    await expect(page.getByText('CFO memo PDF')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book pilot review with this memo' })).toBeVisible();
  });
});
