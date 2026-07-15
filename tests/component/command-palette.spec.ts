import { expect, test } from '@playwright/test';

test('command palette opens and navigates without a router-context error', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Prediction inside budget-owned energy workflows', { exact: true })).toBeVisible();

  await page.keyboard.press('Control+k');
  const dialog = page.getByLabel('Global Command Menu');
  await expect(dialog).toBeVisible();

  await dialog.getByText('TIER Compliance Landing', { exact: true }).click();
  await expect(page).toHaveURL(/\/tier-compliance$/);
  await expect(page.getByRole('heading', { name: /TIER/i }).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
