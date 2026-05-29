import { expect, test, type Page } from '@playwright/test';

type RouteCheck = {
  path: string;
  marker: string;
};

const ROUTE_CHECKS: RouteCheck[] = [
  { path: '/', marker: 'Prediction inside budget-owned energy workflows' },
  { path: '/utility-demand-forecast', marker: 'Utility Demand Forecasting Lane' },
  { path: '/forecast-benchmarking', marker: 'Forecast Benchmarking' },
  { path: '/regulatory-filing', marker: 'Regulatory Filing Templates' },
  { path: '/roi-calculator', marker: 'What is TIER? Alberta\'s Carbon Compliance System' },
  { path: '/credit-banking', marker: 'Credit Banking Dashboard' },
  { path: '/asset-health', marker: 'Asset Health Index' },
  { path: '/shadow-billing', marker: 'Shadow Billing Module' },
  { path: '/utility-security', marker: 'Utility Security & Data-Handling Statement' },
  { path: '/api-docs', marker: 'CEIP API Documentation' },
  { path: '/ai-datacentres', marker: 'AI Data Centre Energy Dashboard' },
];

const ROUTE_ERROR_PATTERN = /Something Went Wrong|Page Not Found/i;
const EXPECTED_CONSOLE_ERROR_PATTERNS: Record<string, RegExp[]> = {
  // These routes intentionally exercise local Edge fallback under Playwright's mocked Edge env.
  '/forecast-benchmarking': [/Failed to load resource.*404/i],
  '/ai-datacentres': [/Failed to load resource.*404/i],
};

function isAllowedConsoleError(path: string, text: string): boolean {
  return (EXPECTED_CONSOLE_ERROR_PATTERNS[path] ?? []).some((pattern) => pattern.test(text));
}

async function expectStableRoute(page: Page, routeCheck: RouteCheck) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const documentFailures: string[] = [];

  const onPageError = (error: Error) => {
    pageErrors.push(error.message);
  };
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isAllowedConsoleError(routeCheck.path, text)) {
        consoleErrors.push(text);
      }
    }
  };
  const onRequestFailed = (request: { isNavigationRequest(): boolean; resourceType(): string; url(): string; failure(): { errorText?: string } | null }) => {
    if (request.isNavigationRequest() && request.resourceType() === 'document') {
      documentFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'unknown document failure'}`);
    }
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);

  try {
    const response = await page.goto(routeCheck.path, { waitUntil: 'domcontentloaded' });
    expect(response, `missing document response for ${routeCheck.path}`).not.toBeNull();
    expect(response?.ok(), `document response was not OK for ${routeCheck.path}`).toBeTruthy();

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await expect(page.getByText(routeCheck.marker, { exact: true }).first()).toBeVisible({ timeout: 15000 });

    const routeErrorHeading = page.getByRole('heading', { name: ROUTE_ERROR_PATTERN });
    await expect(routeErrorHeading).toHaveCount(0);

    expect(pageErrors, `uncaught page errors on ${routeCheck.path}`).toEqual([]);
    expect(consoleErrors, `console errors on ${routeCheck.path}`).toEqual([]);
    expect(documentFailures, `document request failures on ${routeCheck.path}`).toEqual([]);
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
  }
}

test.describe('Phase 6 browser smoke', () => {
  for (const routeCheck of ROUTE_CHECKS) {
    test(`route ${routeCheck.path} shows "${routeCheck.marker}"`, async ({ page }) => {
      await expectStableRoute(page, routeCheck);
    });
  }
});
