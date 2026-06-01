import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Shadow billing proof pack', () => {
  test('replaces the starter bill set with an uploaded 12-month invoice file', async ({ page }) => {
    await page.goto(`${BASE_URL}/shadow-billing`);

    await expect(page.getByRole('heading', { name: 'Shadow Billing Module' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('shadow-billing-source-mode')).toContainText('Starter bill set active');
    await expect(page.getByTestId('proof-artifact-shadow-billing-memo')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'shadow-bills.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad,fixed_charge_cad,retailer_name,rolr_rate_cents_per_kwh,pool_price_cents_per_kwh',
        '2026-01,1100,15.2,167.20,21.00,Owner supplied retailer,12.0,8.7',
        '2026-02,980,15.2,148.96,21.00,Owner supplied retailer,12.0,8.3',
      ].join('\n')),
    });

    await expect(page.getByTestId('shadow-billing-source-mode')).toContainText('Uploaded 12-month invoice history active');
    await expect(page.getByText('Default comparison scope is energy-supply-only.')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-shadow-billing-delta-csv')).toBeVisible();
  });

  test('loads the constructed municipal scenario for commercial proof use', async ({ page }) => {
    await page.goto(`${BASE_URL}/shadow-billing`);

    await page.getByRole('button', { name: 'Load municipal billing case' }).click();

    await expect(page.getByTestId('shadow-billing-source-mode')).toContainText('Constructed municipal invoice scenario active');
    await expect(page.getByText('Constructed commercial scenario active')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-shadow-billing-memo')).toContainText('constructed-scenario');
  });
});
