import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Sovereign vault edge-v1 contract', () => {
  test('exports and re-imports an encrypted local vault snapshot', async ({ page }, testInfo) => {
    await page.goto(`${BASE_URL}/sovereign-vault`);

    await expect(page.getByRole('heading', { name: 'Edge Vault V1' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Consent and local custody gate' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Export encrypted snapshot' })).toBeDisabled();
    await expect(page.getByText(/Export remains disabled until you/i)).toContainText('enter the Nation or community name');

    await page.getByLabel('Nation or community name').fill('Siksika Nation');
    await page.getByLabel('Export passphrase').fill('correct horse battery staple');
    await page.getByRole('checkbox', { name: /local-only encrypted vault workflow/i }).check();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export encrypted snapshot' }).click();
    const download = await downloadPromise;
    const downloadPath = testInfo.outputPath('edge-vault-v1.json');
    await download.saveAs(downloadPath);

    await expect(page.getByTestId('vault-fingerprint')).toContainText('-');
    await page.getByTestId('vault-import-file').setInputFiles(downloadPath);
    await page.getByLabel('Import passphrase').fill('correct horse battery staple');
    await page.getByRole('button', { name: 'Import encrypted snapshot' }).click();

    await expect(page.getByTestId('vault-status-panel')).toContainText('Encrypted vault snapshot imported locally.');
    await expect(page.getByTestId('vault-audit-log')).toContainText('export completed');
    await expect(page.getByTestId('vault-audit-log')).toContainText('import succeeded');
  });
});
