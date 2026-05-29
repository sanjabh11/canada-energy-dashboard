import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Credit banking proof pack', () => {
  test('imports holdings and liabilities and keeps the audit pack visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/credit-banking`);

    await expect(page.getByRole('heading', { name: 'Credit Banking Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('credit-banking-source-mode')).toContainText('Starter ledger active');
    await expect(page.getByTestId('proof-artifact-credit-position-memo')).toBeVisible();

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles({
      name: 'holdings.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status',
        'lot-1,EPC,2025,2000,24,2026-01-05,2030,active',
      ].join('\n')),
    });
    await fileInputs.nth(1).setInputFiles({
      name: 'liabilities.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'year,liability',
        '2026,1500',
      ].join('\n')),
    });

    await expect(page.getByTestId('credit-banking-source-mode')).toContainText('Uploaded ledger active');
    await expect(page.getByTestId('proof-artifact-credit-allocation-schedule')).toBeVisible();
    await expect(page.getByText('2026', { exact: true })).toBeVisible();
  });

  test('loads the constructed industrial banking case', async ({ page }) => {
    await page.goto(`${BASE_URL}/credit-banking`);

    await page.getByRole('button', { name: 'Load industrial banking case' }).click();

    await expect(page.getByTestId('credit-banking-source-mode')).toContainText('Constructed industrial ledger active');
    await expect(page.getByText('Constructed commercial scenario active')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-credit-position-memo')).toContainText('constructed-scenario');
  });
});
