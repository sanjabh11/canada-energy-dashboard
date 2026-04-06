import { expect, test } from '@playwright/test';

test.describe('Dashboard provenance slice 1', () => {
  test('analytics page marks supplemented renewable map inputs explicitly', async ({ page }) => {
    await page.goto('/analytics');

    await expect(page.getByText('Analytics & Trends')).toBeVisible();
    await expect(page.getByText('Fallback analytics inputs active')).toBeVisible();
    await expect(page.getByText(/Reference renewable map in use|Supplemented renewable map in use/)).toBeVisible();
    await expect(page.getByText(/Reference|Supplemented/).first()).toBeVisible();
  });

  test('real-time dashboard does not present an unverified state as live', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Energy Operations Dashboard').first()).toBeVisible();
    await expect(page.getByText('⚠ Data refreshing — may be stale')).toBeVisible();
    await expect(page.getByText('Demo Data').first()).toBeVisible();
    await expect(page.getByText('Connected energy datasets')).toHaveCount(0);
  });
});
