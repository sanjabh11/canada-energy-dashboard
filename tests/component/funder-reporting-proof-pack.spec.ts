import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Funder reporting proof pack', () => {
  test('switches from starter projects to an uploaded source mode while keeping the quarterly export pack visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/funder-reporting`);

    await expect(page.getByRole('heading', { name: 'Funder Reporting Dashboard' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Starter project set active')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-funder-quarterly-pdf')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'uploaded-projects.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([
        {
          id: 'uploaded-1',
          name: 'Prairie Solar Storage',
          community: 'Mikisew Cree First Nation',
          territory_name: 'Treaty 8 Territory',
          energy_type: 'solar-storage',
          capacity_kw: 950,
          project_status: 'construction',
          total_budget: 2800000,
          actual_cost: 1750000,
          fpic_status: 'owner_supplied',
          jobs_created: 14,
          emissions_avoided_tonnes_co2: 1200,
          households_served: 210,
          next_quarter_plans: ['Commission storage inverter'],
        },
      ])),
    });

    await expect(page.getByText('Current source mode')).toBeVisible();
    await expect(page.getByText('Uploaded project file with explicit owner-supplied field review before export.')).toBeVisible();
    await expect(page.getByText('Project Import')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-funder-quarterly-pdf')).toBeVisible();
  });

  test('loads the constructed Wah-ila-toos case and exposes the outreach cover note', async ({ page }) => {
    await page.goto(`${BASE_URL}/funder-reporting`);

    await page.getByRole('button', { name: 'Load Wah-ila-toos case' }).click();

    await expect(page.getByText('Constructed commercial scenario active', { exact: true })).toBeVisible();
    await expect(page.getByTestId('proof-artifact-funder-outreach-cover-note')).toContainText('constructed-scenario');
  });
});
