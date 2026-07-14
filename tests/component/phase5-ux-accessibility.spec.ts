import { expect, test, type Page } from '@playwright/test';

type RouteCheck = {
  path: string;
  marker: string;
};

const ROUTE_CHECKS: RouteCheck[] = [
  { path: '/pricing', marker: 'Pricing' },
  { path: '/solutions', marker: 'Product bundles' },
  { path: '/scenario-workbench', marker: 'Exploratory — not policy-grade' },
];

const ROUTE_ERROR_PATTERN = /Something Went Wrong|Page Not Found/i;

async function expectStableRoute(page: Page, routeCheck: RouteCheck) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);

  await page.goto(routeCheck.path, { waitUntil: 'networkidle', timeout: 30_000 });

  await expect(page.locator('body')).not.toContainText(ROUTE_ERROR_PATTERN);
  await expect(page.locator('body')).toContainText(routeCheck.marker, { timeout: 10_000 });

  expect(pageErrors, `Page errors on ${routeCheck.path}`).toEqual([]);
  expect(consoleErrors, `Console errors on ${routeCheck.path}`).toEqual([]);

  page.off('pageerror', onPageError);
  page.off('console', onConsole);
}

test.describe('Phase 5 — UX and accessibility smoke for new routes', () => {
  for (const routeCheck of ROUTE_CHECKS) {
    test(`${routeCheck.path} renders without errors and shows expected content`, async ({ page }) => {
      await expectStableRoute(page, routeCheck);
    });
  }

  test('solutions page has role-based navigation cards', async ({ page }) => {
    await page.goto('/solutions', { waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('text=Utility planner')).toBeVisible();
    await expect(page.locator('text=Industrial compliance / CFO')).toBeVisible();
    await expect(page.locator('text=Regulator / reviewer')).toBeVisible();
    await expect(page.locator('text=Consultant / API user')).toBeVisible();
    await expect(page.locator('text=Municipal / public sector')).toBeVisible();
    await expect(page.locator('text=Indigenous / co-design')).toBeVisible();
  });

  test('solutions page has cross-sell bundle map', async ({ page }) => {
    await page.goto('/solutions', { waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('text=Product bundles')).toBeVisible();
    await expect(page.locator('text=Utility Planning Spine')).toBeVisible();
    await expect(page.locator('text=Industrial Compliance Spine')).toBeVisible();
    await expect(page.locator('text=Municipal Climate Spine')).toBeVisible();
    await expect(page.locator('text=Consultant Evidence Spine')).toBeVisible();
  });

  test('solutions page has Indigenous co-design pathway with boundary', async ({ page }) => {
    await page.goto('/solutions', { waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('text=Indigenous Energy Co-Design Pathway')).toBeVisible();
    await expect(page.locator('text=NOT OCAP-compliant')).toBeVisible();
    await expect(page.locator('text=Seeking community co-design partners')).toBeVisible();
  });

  test('scenario workbench has exploratory label', async ({ page }) => {
    await page.goto('/scenario-workbench', { waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('text=Exploratory — not policy-grade')).toBeVisible();
    await expect(page.locator('text=exploratory scenario analysis')).toBeVisible({ timeout: 10_000 });
  });

  test('skip-to-main link is present on solutions page', async ({ page }) => {
    await page.goto('/solutions', { waitUntil: 'networkidle', timeout: 30_000 });
    const skipLink = page.locator('a[href="#main-content"], button[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });

  test('keyboard navigation: Tab to first focusable element on pricing', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focused);
  });
});
