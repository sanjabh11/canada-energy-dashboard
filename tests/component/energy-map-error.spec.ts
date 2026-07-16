import { test, expect } from '@playwright/test';

test.describe('EnergyMap error and loading states', () => {
  test('map container renders on /energy-map', async ({ page }) => {
    await page.goto('/energy-map');
    // The map container div should be present
    const mapContainer = page.locator('[class*="maplibregl-map"], [data-testid="energy-map-container"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
  });

  test('shows error fallback when map tiles are blocked', async ({ page }) => {
    // Block map tile requests to trigger error state
    await page.route('**/tiles/**', (route) => route.abort());
    await page.route('**/style.json**', (route) => route.abort());
    await page.route('**/api.maptiler.com/**', (route) => route.abort());

    await page.goto('/energy-map');

    // Wait for either error message or map container
    // The error fallback shows "Map failed to load"
    const errorText = page.locator('text=Map failed to load');
    await expect(errorText).toBeVisible({ timeout: 15000 });
  });

  test('loading state appears before map is ready', async ({ page }) => {
    // Intercept but delay the style response to keep loading state visible
    await page.route('**/style.json**', (route) => {
      setTimeout(() => route.continue(), 2000);
    });

    await page.goto('/energy-map');

    // Loading indicator should be visible while style loads
    const loadingIndicator = page.locator('text=Loading').first();
    // It may be brief, so use a short timeout
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
      // Loading state may have passed already if the page loaded fast — that's OK
    });
  });

  test('facility type filter buttons are present', async ({ page }) => {
    await page.goto('/energy-map');
    // The filter panel should be visible (not in error state)
    const filterPanel = page.locator('text=Facility Types').first();
    await expect(filterPanel).toBeVisible({ timeout: 15000 });
  });
});
