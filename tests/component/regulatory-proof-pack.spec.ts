import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Regulatory proof pack', () => {
  test('switches Alberta and Ontario packs and generates cover memo downloads', async ({ page }) => {
    await page.goto(`${BASE_URL}/regulatory-filing`);

    await expect(page.getByRole('heading', { name: 'Regulatory Filing Templates' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('AUC Rule 005 filing prep pack')).toBeVisible();
    await expect(page.getByText('Alberta cover memo')).toBeVisible();
    await expect(page.getByText('Alberta source currency checklist')).toBeVisible();

    const [albertaDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('proof-download-alberta-cover-memo').click(),
    ]);
    expect(albertaDownload.suggestedFilename()).toContain('alberta_regulatory_cover_memo');

    await page.getByRole('button', { name: 'Ontario pack' }).click();
    await expect(page.getByText('OEB Chapter 5 filing prep pack')).toBeVisible();
    await expect(page.getByText('Ontario cover memo')).toBeVisible();
    await expect(page.getByText('Ontario source currency checklist')).toBeVisible();

    const [ontarioDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('proof-download-ontario-cover-memo').click(),
    ]);
    expect(ontarioDownload.suggestedFilename()).toContain('ontario_regulatory_cover_memo');

    await page.getByRole('button', { name: /Section 5.2 — Asset Condition Assessment/ }).click();
    await expect(page.getByRole('heading', { name: 'Reviewer checklist' })).toBeVisible();
  });
});
