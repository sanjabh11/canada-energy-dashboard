import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Pilot readiness page', () => {
  test('shows evidence gates, confidence rules, and stop conditions', async ({ page }) => {
    await page.goto(`${BASE_URL}/pilot-readiness`);

    await expect(page.getByRole('heading', { name: /Buyer evidence is what moves it toward 95%/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Buyer utility load history')).toBeVisible();
    await expect(page.getByText('TIER facility assumptions')).toBeVisible();
    await expect(page.getByText('Invoice comparison sample')).toBeVisible();
    await expect(page.getByText('Pilot outcome scorecard')).toBeVisible();
    await expect(page.getByText('Time to first reviewable artifact')).toBeVisible();
    await expect(page.getByText('Benchmark lift or diagnostic value')).toBeVisible();
    await expect(page.getByText('Public-system or constructed sample only')).toBeVisible();
    await expect(page.getByText(/production utility onboarding/)).toBeVisible();
  });
});
