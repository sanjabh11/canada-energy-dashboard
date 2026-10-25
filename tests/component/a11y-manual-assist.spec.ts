import { expect, test } from '@playwright/test';

/**
 * WCAG 2.2 AA manual-assist checks — mechanical versions of the checks
 * humans would otherwise run. Each test asserts the route's own h1 first
 * (same marker contract as a11y-wcag22.spec.ts — an error page is not a
 * pass). Supabase traffic is stubbed identically.
 *
 * Covers: keyboard focus order + visible indicator (2.4.7), no keyboard
 * traps (2.1.2), target size ≥24px (2.5.8), reduced motion (2.3.3),
 * form-error semantics (3.3.1/3.3.3) where inputs exist.
 */

const ROUTES: Array<{ path: string; marker: RegExp; name: string }> = [
  { path: '/', marker: /focused TIER scenario workflow/i, name: 'home' },
  { path: '/solutions', marker: /who buys it, why they pay/i, name: 'solutions' },
  { path: '/utility-demand-forecast', marker: /Utility Demand Forecasting Lane/i, name: 'forecast' },
  { path: '/api-docs', marker: /CEIP API Documentation/i, name: 'api-docs' },
];

const SUPABASE_STUB_PATTERN = /supabase\.co\//;

test.beforeEach(async ({ page }) => {
  await page.route(SUPABASE_STUB_PATTERN, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
});

for (const r of ROUTES) {
  test(`keyboard focus walk is ordered and ring-visible — ${r.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(r.path);
    await expect(page.locator('h1').filter({ hasText: r.marker }).first()).toBeVisible();

    const stops: string[] = [];
    const ringlessStops: string[] = [];
    let ringless = 0;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        // Skip elements that are not visible (off-screen skip links, hidden)
        if (r.width <= 1 || r.height <= 1 || el.offsetParent === null) return null;
        const cs = getComputedStyle(el);
        // A ring must be actually visible: non-none outline, box-shadow,
        // or a border/background change against the element's backdrop.
        const hasRing =
          (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== 'none';
        const ident =
          el.tagName +
          '|' +
          (el.id || el.getAttribute('href') || el.getAttribute('aria-label') ||
            (el.textContent || '').trim().slice(0, 24) || el.getAttribute('role') || '');
        return { ident, hasRing };
      });
      if (info) {
        if (!info.hasRing) {
          ringless++;
          ringlessStops.push(info.ident);
        }
        stops.push(info.ident);
      }
      if (stops.length > 30) break;
    }
    // No keyboard trap: fewer than 8 repeats of the same element in a row
    let maxRun = 1, run = 1;
    for (let i = 1; i < stops.length; i++) {
      run = stops[i] === stops[i - 1] ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
    expect(stops.length, 'no focusable elements found').toBeGreaterThan(3);
    expect(maxRun, 'keyboard trap: focus pinned on one element').toBeLessThan(8);
    expect(
      ringless,
      `${ringless} focused elements had no visible indicator: ${ringlessStops.slice(0, 10).join(' | ')}`,
    ).toBe(0);
  });

  test(`interactive targets >= 24px — ${r.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(r.path);
    await expect(page.locator('h1').filter({ hasText: r.marker }).first()).toBeVisible();

    const small = await page.evaluate(() => {
      const els = document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="tab"]',
      );
      const offenders: string[] = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        // hidden OR visually-clipped (<=4px min-dim: sr-only/skip-link pattern —
        // these elements are not presented targets until focused/expanded)
        if (Math.min(r.width, r.height) <= 4 || el.offsetParent === null) continue;
        // WCAG 2.5.8: target is deficient when its smallest dimension < 24px
        if (Math.min(r.width, r.height) < 24) {
          offenders.push(
            `${el.tagName} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
          );
        }
      }
      return offenders.slice(0, 20);
    });
    expect(small, `undersized interactive targets: ${small.join(' | ')}`).toEqual([]);
  });

  test(`reduced-motion yields no running animations — ${r.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(r.path);
    await expect(page.locator('h1').filter({ hasText: r.marker }).first()).toBeVisible();
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    expect(running, `${running} animations still running under prefers-reduced-motion`).toBe(0);
  });
}

test.describe('form-error semantics where inputs exist', () => {
  for (const r of ROUTES) {
    test(`invalid submit produces field-named errors — ${r.name}`, async ({ page }) => {
      await page.goto(r.path);
      await expect(page.locator('h1').filter({ hasText: r.marker }).first()).toBeVisible();
      const inputs = page.locator('input:not([type="hidden"]), textarea, select');
      if ((await inputs.count()) === 0) {
        test.skip(true, 'no inputs on route');
        return;
      }
      const submit = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")');
      if ((await submit.count()) === 0) {
        test.skip(true, 'no submit control on route');
        return;
      }
      await submit.first().click();
      const errorText = await page.evaluate(() => {
        const el = document.querySelector('[role="alert"], [aria-live], .error, [data-error], [class*="invalid"]');
        return el ? (el.textContent || '').trim() : '';
      });
      const invalidAttr = await inputs.first().getAttribute('aria-invalid');
      expect(
        errorText.length > 0 || invalidAttr === 'true',
        'no accessible error surfaced after invalid submit',
      ).toBeTruthy();
    });
  }
});
