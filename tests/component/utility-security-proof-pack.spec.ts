import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Utility security proof pack', () => {
  test('renders a structured control matrix and downloadable review pack', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-security`);

    await expect(page.getByRole('heading', { name: 'Utility Security & Data-Handling Statement' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Constructed forecast-pilot attachment pack')).toBeVisible();
    await expect(page.getByTestId('utility-security-control-matrix')).toBeVisible();
    await expect(page.getByTestId('utility-security-control-matrix').getByText('repo-backed design').first()).toBeVisible();
    await expect(page.getByTestId('utility-security-control-matrix').getByText('deployed evidence required').first()).toBeVisible();
    await expect(page.getByTestId('utility-security-control-matrix').getByText('owner-supplied').first()).toBeVisible();
    await expect(page.getByTestId('proof-artifact-utility-security-review-pack')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-utility-security-questionnaire-template')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-utility-security-evidence-mapping')).toBeVisible();
    await expect(page.getByTestId('proof-artifact-utility-security-pilot-attachment-manifest')).toBeVisible();
    await expect(page.getByText('Pilot attachment manifest')).toBeVisible();
  });
});
