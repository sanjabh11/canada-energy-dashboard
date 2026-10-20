import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * WCAG 2.2 AA automated audit of the public wedge routes.
 * Reports violations rather than failing hard on the first audit pass —
 * the route must render; the axe report is emitted for manual review.
 * Serious/critical violations fail the test (that is the gate).
 */
const WEDGE_ROUTES = [
  '/ga-ici-5cp',
  '/byo-csv-proof',
  '/pilot-readiness',
  '/roi-calculator',
  '/tier-compliance',
];

const VIEWPORTS = [
  { name: '320px', width: 320, height: 800 },
  { name: '375px', width: 375, height: 800 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1280px', width: 1280, height: 800 },
];

test.describe('WCAG 2.2 AA — axe audit', () => {
  for (const route of WEDGE_ROUTES) {
    test(`${route} — no serious/critical axe violations (desktop)`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      // eslint-disable-next-line no-console
      console.log(
        `[axe ${route}] violations=${results.violations.length} serious+=${serious.length} ` +
          `passes=${results.passes.length} incomplete=${results.incomplete.length}`,
      );
      for (const v of serious) {
        // eslint-disable-next-line no-console
        console.log(`  ${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      }
      expect(serious).toEqual([]);
    });
  }

  for (const vp of VIEWPORTS) {
    test(`mobile reflow — no horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of WEDGE_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
        expect(
          scrollWidth,
          `${route} overflows at ${vp.width}px (scrollWidth=${scrollWidth})`,
        ).toBeLessThanOrEqual(vp.width + 1);
      }
    });
  }
});
