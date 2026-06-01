import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('AICEI proof pack', () => {
  test('switches from starter portfolio to uploaded source mode while keeping quarterly exports visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/aicei`);

    await expect(page.getByRole('heading', { name: 'AICEI Grant Reporting Module' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('aicei-source-mode')).toContainText('Starter AICEI portfolio');
    await expect(page.getByTestId('proof-artifact-aicei-quarterly-pdf')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'aicei-upload.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([
        {
          id: 'upload-1',
          name: 'Community Storage',
          reporting_period: 'Q3 2026',
          community: 'Treaty 8 Territory',
          technology: 'storage',
          generation_kwh: 51000,
          baseline_ghg: 20,
          actual_ghg: 8,
          capacity_building_activities: ['Storage operations training'],
          participants_count: 9,
          participants_hours: 18,
          community_approval_status: 'owner_supplied',
        },
      ])),
    });

    await expect(page.getByTestId('aicei-source-mode')).toContainText('Uploaded AICEI portfolio');
    await expect(page.getByTestId('proof-artifact-aicei-approval-checklist')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-aicei-quarterly-pdf')).toContainText('owner-supplied');
  });

  test('loads the constructed Alberta AICEI case with disclosure intact', async ({ page }) => {
    await page.goto(`${BASE_URL}/aicei`);

    await page.getByRole('button', { name: 'Load AICEI reporting case' }).click();

    await expect(page.getByText('Constructed commercial scenario active')).toBeVisible();
    await expect(page.getByTestId('aicei-source-mode')).toContainText('Constructed AICEI portfolio');
    await expect(page.getByTestId('proof-artifact-aicei-quarterly-pdf')).toContainText('constructed-scenario');
  });
});
