import { expect, test } from '@playwright/test';

test.describe('Phase 0 foundation gating', () => {
  test('gates ask-data for standard users', async ({ page }) => {
    await page.goto('/ask-data');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('ask-data-query-input')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Ask your data')).toBeVisible();
  });

  test('gates copilot execution for standard users', async ({ page }) => {
    await page.goto('/copilot');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('copilot-input')).toHaveCount(0);
    await expect(page.getByTestId('copilot-send')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Energy Copilot')).toBeVisible();
  });

  test('gates agent execution for standard users', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('agent-run-workflow')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Agent Runner')).toBeVisible();
  });

  test('status page shows tracked uptime monitors', async ({ page }) => {
    await page.goto('/status');
    await expect(page.getByText('Tracked monitors')).toBeVisible();
    await expect(page.getByText('Lead Capture API').first()).toBeVisible();
    await expect(page.getByText('Health Endpoint').first()).toBeVisible();
  });
});
