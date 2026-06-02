import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Pilot readiness page', () => {
  test('shows evidence gates, confidence rules, and stop conditions', async ({ page }) => {
    await page.goto(`${BASE_URL}/pilot-readiness`);

    await expect(page.getByRole('heading', { name: /95\/100 desk-research strategy direction/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Buyer utility load history' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TIER facility assumptions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Invoice comparison sample' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What must be measured before CEIP can claim stronger market proof' })).toBeVisible();
    await expect(page.getByText('Time to first reviewable artifact')).toBeVisible();
    await expect(page.getByText('Benchmark lift or diagnostic value')).toBeVisible();
    await expect(page.getByText('Operator runbook')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Utility forecast lane' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TIER or credit lane' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Billing or security lane' })).toBeVisible();
    await expect(page.getByText('Route-aware intake planner')).toBeVisible();
    await expect(page.getByLabel('Buyer proof-pack route')).toBeVisible();
    await expect(page.getByText('utility_forecast_planning_pack').first()).toBeVisible();
    await expect(page.getByText(/--route \/utility-demand-forecast/).first()).toBeVisible();
    await page.getByLabel('Buyer proof-pack route').selectOption('/utility-security');
    await expect(page.getByText('utility_security_procurement_pack').first()).toBeVisible();
    await expect(page.getByText(/--route \/utility-security/).first()).toBeVisible();
    await expect(page.getByText(/Do not claim SOC certification/)).toBeVisible();
    await expect(page.getByText(/pnpm run create:phase-f-evidence-workspace/).first()).toBeVisible();
    await expect(page.getByText(/pnpm run append:outreach-response-log-row/).first()).toBeVisible();
    await expect(page.getByText(/pnpm run update:pilot-evidence-register-row/).first()).toBeVisible();
    await expect(page.getByText('95% market gate')).toBeVisible();
    await expect(page.getByText(/--require-95/).first()).toBeVisible();
    await expect(page.getByText('Accepted utility forecast evidence')).toBeVisible();
    await expect(page.getByText('Three proceeding proof packs')).toBeVisible();
    await expect(page.getByText('Public-system or constructed sample only')).toBeVisible();
    await expect(page.getByText(/production utility onboarding/)).toBeVisible();
  });
});
