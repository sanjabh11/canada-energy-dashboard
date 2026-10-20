import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * WCAG 2.2 AA automated audit of the public buyer-facing routes.
 * Each route must render its own marker BEFORE axe runs — an error page
 * with zero violations is a false pass, not a pass.
 * Serious/critical violations fail the test (that is the gate).
 */
const ROUTES: Array<{ path: string; marker: RegExp }> = [
  { path: '/', marker: /canada|energy|tier/i },
  { path: '/solutions', marker: /Top 10 proof packs/i },
  { path: '/utility-demand-forecast', marker: /Utility Demand Forecast/i },
  { path: '/forecast-benchmarking', marker: /benchmark/i },
  { path: '/regulatory-filing', marker: /filing|regulat/i },
  { path: '/ga-ici-5cp', marker: /GA|ICI|peak/i },
  { path: '/byo-csv-proof', marker: /CSV/i },
  { path: '/credit-banking', marker: /credit/i },
  { path: '/asset-health', marker: /asset|health/i },
  { path: '/shadow-billing', marker: /shadow|billing/i },
  { path: '/utility-security', marker: /security|sovereign/i },
  { path: '/ai-datacentres', marker: /data ?centre|data ?center/i },
  { path: '/api-docs', marker: /api/i },
  { path: '/status', marker: /status/i },
  { path: '/pilot-readiness', marker: /pilot|readiness/i },
  { path: '/roi-calculator', marker: /roi|calculator/i },
  { path: '/tier-compliance', marker: /tier|compliance/i },
];

const VIEWPORTS = [
  { name: '320px', width: 320, height: 800 },
  { name: '375px', width: 375, height: 800 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1280px', width: 1280, height: 800 },
];

test.describe('WCAG 2.2 AA — axe audit', () => {
  // axe-core's analysis is engine-dependent in cost — gecko (Firefox) is
  // roughly 3-4x slower than Blink/WebKit on these pages. This is a
  // tool-runtime budget, not a gate relaxation: violations still fail.
  test.describe.configure({ timeout: 120_000 });

  for (const route of ROUTES) {
    test(`${route.path} — renders + no serious/critical axe violations (desktop)`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Render gate: a fallback/error page with zero axe violations is a
      // false pass. The route must show its own content marker first.
      await expect(page.locator('h1, h2').first()).toBeVisible();
      await expect(page.locator('body')).toContainText(route.marker);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      console.log(
        `[axe ${route.path}] violations=${results.violations.length} serious+=${serious.length} ` +
          `passes=${results.passes.length} incomplete=${results.incomplete.length}`,
      );
      for (const v of serious) {
        console.log(`  ${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      }
      expect(serious).toEqual([]);
    });
  }

  for (const vp of VIEWPORTS) {
    test(`mobile reflow — no horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const failures: string[] = [];
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1, h2').first()).toBeVisible();
        const { scrollWidth, offenders } = await page.evaluate((limit) => {
          const wide = [...document.querySelectorAll('*')]
            .filter((el) => {
              const rect = (el as HTMLElement).getBoundingClientRect();
              return rect.width > limit && !(el as HTMLElement).closest('[data-scroll-ok]');
            })
            .slice(0, 4)
            .map(
              (el) =>
                `${el.tagName.toLowerCase()}.${[...(el as HTMLElement).classList]
                  .slice(0, 3)
                  .join('.')} w=${Math.round((el as HTMLElement).getBoundingClientRect().width)}`,
            );
          return { scrollWidth: document.documentElement.scrollWidth, offenders: wide };
        }, vp.width);
        if (scrollWidth > vp.width + 1) {
          failures.push(
            `${route.path} overflows at ${vp.width}px (scrollWidth=${scrollWidth}) — ` +
              `widest: ${offenders.join(' | ') || 'none found'}`,
          );
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
