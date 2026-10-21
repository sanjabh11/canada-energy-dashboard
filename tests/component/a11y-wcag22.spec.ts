import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/**
 * WCAG 2.2 AA automated audit of the public buyer-facing routes.
 * Each route must render its own marker BEFORE axe runs — an error page
 * with zero violations is a false pass, not a pass.
 * Serious/critical violations fail the test (that is the gate).
 *
 * Marker contract (hardened): each marker is copy that exists ONLY in that
 * route's own <h1>, and it is asserted against h1 elements — not the whole
 * body. Body text is too weak: shell chrome (CommandPalette items,
 * RouteErrorFallback "Page Not Found", RouteLoader "Loading...") and
 * cross-route nav-card copy (e.g. an h4 "Forecast Benchmarking" link card on
 * /asset-health, "Credit Banking Audit" CTA on /tier-compliance) can satisfy
 * a generic regex on a page that never rendered the real route. The h1 is
 * the page's own declaration of identity.
 */
const ROUTES: Array<{ path: string; marker: RegExp }> = [
  { path: '/', marker: /focused TIER scenario workflow/i },
  { path: '/solutions', marker: /who buys it, why they pay/i },
  { path: '/utility-demand-forecast', marker: /Utility Demand Forecasting Lane/i },
  { path: '/forecast-benchmarking', marker: /Forecast Benchmarking/i },
  { path: '/regulatory-filing', marker: /Regulatory Filing Templates/i },
  { path: '/ga-ici-5cp', marker: /Ontario GA\/ICI 5CP Decision Support/i },
  { path: '/byo-csv-proof', marker: /BYO-CSV Privacy Proof Generator/i },
  { path: '/credit-banking', marker: /Credit Banking Dashboard/i },
  { path: '/asset-health', marker: /Asset Health Index/i },
  { path: '/shadow-billing', marker: /Shadow Billing Module/i },
  { path: '/utility-security', marker: /Utility Security & Data-Handling Statement/i },
  { path: '/ai-datacentres', marker: /AI Data Centre Energy Dashboard/i },
  { path: '/api-docs', marker: /CEIP API Documentation/i },
  { path: '/status', marker: /System Status/i },
  { path: '/pilot-readiness', marker: /desk-research strategy direction/i },
  { path: '/roi-calculator', marker: /What is TIER/i },
  { path: '/tier-compliance', marker: /3-Pathway TIER Scenario Planning/i },
];

const VIEWPORTS = [
  { name: '320px', width: 320, height: 800 },
  { name: '375px', width: 375, height: 800 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1280px', width: 1280, height: 800 },
];

/**
 * Supabase stub scope: ONLY *.supabase.co traffic is fulfilled (documented
 * empty-data fallback — `[]` for REST, `{}` otherwise) so a paused/unreachable
 * hosted backend cannot masquerade as a page defect. Every stubbed response
 * carries the x-a11y-stub header so the scope-proof test can verify a
 * response came from this interception rather than a real server. Nothing
 * outside this pattern may be fulfilled — that would be able to mask a real
 * defect, and the dedicated scope test below locks that invariant in.
 */
const SUPABASE_STUB_PATTERN = /supabase\.co\//;
const STUB_HEADER = 'x-a11y-stub';
const STUB_HEADER_VALUE = 'supabase-empty-fallback';

test.describe('WCAG 2.2 AA — axe audit', () => {
  // axe-core's analysis is engine-dependent in cost — gecko (Firefox) is
  // roughly 3-4x slower than Blink/WebKit on these pages. This is a
  // tool-runtime budget, not a gate relaxation: violations still fail.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.route(SUPABASE_STUB_PATTERN, async (route) => {
      const url = route.request().url();
      const body = url.includes('/rest/v1/') ? '[]' : '{}';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          // ACAO:* + expose-headers keep the stub body AND the stub marker
          // header readable from cross-origin page-side fetch probes.
          'access-control-allow-origin': '*',
          'access-control-expose-headers': '*',
          [STUB_HEADER]: STUB_HEADER_VALUE,
        },
        body,
      });
    });
  });

  for (const route of ROUTES) {
    test(`${route.path} — renders + no serious/critical axe violations (desktop)`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Render gate: a fallback/error page with zero axe violations is a
      // false pass. The route must show its own content marker first — in
      // its own h1, where shell copy and cross-route link cards cannot
      // impersonate it.
      await expect(page.locator('h1, h2').first()).toBeVisible();
      await expect(page.locator('h1')).toContainText(route.marker);

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

      // Route-completion guard: a silent redirect to a shell page mid-audit
      // would mean the violations above were measured on the wrong document.
      expect(new URL(page.url()).pathname).toBe(route.path);
    });
  }

  test('interception scope — supabase stub never answers other origins', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Positive control: a *.supabase.co REST request IS stubbed. The fetch
    // resolves only because page.route fulfills it — a real request to this
    // nonexistent host would fail. The marker header proves provenance.
    const supabaseProbe = await page.evaluate(async (stubHeader) => {
      const res = await fetch('https://a11y-scope-probe.supabase.co/rest/v1/probe');
      return {
        status: res.status,
        body: await res.text(),
        stubbed: res.headers.get(stubHeader),
      };
    }, STUB_HEADER);
    expect(supabaseProbe.status).toBe(200);
    expect(supabaseProbe.stubbed).toBe(STUB_HEADER_VALUE);
    expect(supabaseProbe.body).toBe('[]');

    // Negative control: a request to a NON-supabase origin (the preview
    // server itself, same-origin) must reach the real server. If the
    // interception ever widened (e.g. '**'), this body would be '{}'/'[]'
    // and carry the stub header — the audit would then be reading a
    // fabricated document, and this test fails.
    const sameOriginProbe = await page.evaluate(async (stubHeader) => {
      const res = await fetch('/a11y-interception-scope-probe');
      return {
        status: res.status,
        body: await res.text(),
        stubbed: res.headers.get(stubHeader),
      };
    }, STUB_HEADER);
    expect(sameOriginProbe.stubbed).toBeNull();
    expect(['[]', '{}']).not.toContain(sameOriginProbe.body);
  });

  for (const vp of VIEWPORTS) {
    test(`mobile reflow — no horizontal scroll at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const failures: string[] = [];
      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        // Hydration on mobile engines can exceed the 5s default — a render
        // gate should wait for the route, not race it. Assertion unchanged.
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });
        // WCAG reflow applies to the settled layout, not a mid-hydration
        // frame — deferred data render can briefly produce a wider
        // scrollWidth during paint. Wait for network + two rAF ticks, then
        // measure. The assertion itself is unchanged.
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        );
        const { scrollWidth, offenders, wideScrollRegions, drivers } = await page.evaluate((limit) => {
          // Elements that actually extend the document: their box crosses the
          // right viewport edge AND no ancestor clips that overflow. Clipped
          // scroll-region content is expected and excluded.
          const isClipped = (el: Element): boolean => {
            let node: Element | null = el.parentElement;
            while (node) {
              const ox = getComputedStyle(node).overflowX;
              if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') {
                return true;
              }
              node = node.parentElement;
            }
            return false;
          };
          const wide = [...document.querySelectorAll('body *')]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.right > limit + 1 && rect.width > 0 && !isClipped(el);
            })
            .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
            .slice(0, 4)
            .map((el) => {
              const rect = el.getBoundingClientRect();
              const cls = [...(el as HTMLElement).classList].slice(0, 3).join('.');
              return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} right=${Math.round(rect.right)}`;
            });
          // Nested-scroll check: a scrollable region whose OWN scrollport is
          // wider than the viewport is a reflow violation even though its
          // overflowing content is clipped inside it (and even when an
          // ancestor clips the container, hiding it from scrollWidth). The
          // element checks above never see it, so measure clientWidth here.
          const scrollRegions = [...document.querySelectorAll('body *')]
            .filter((el) => {
              const ox = getComputedStyle(el).overflowX;
              return (ox === 'auto' || ox === 'scroll') && el.clientWidth > limit + 1;
            })
            .sort((a, b) => b.clientWidth - a.clientWidth)
            .slice(0, 4)
            .map((el) => {
              const cls = [...(el as HTMLElement).classList].slice(0, 3).join('.');
              return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} clientWidth=${el.clientWidth}`;
            });
          // Scroll-width drivers with ancestor chains: an element whose own
          // scrollWidth exceeds the viewport is the overflow driver even when
          // an ancestor clips it visually — the chain exposes which ancestor
          // is missing the clip/shrink guard.
          const drivers = [...document.querySelectorAll('body *')]
            .filter((el) => el.scrollWidth > limit + 1)
            .sort((a, b) => b.scrollWidth - a.scrollWidth)
            .slice(0, 3)
            .map((el) => {
              const chain: string[] = [];
              let node: Element | null = el;
              while (node && node !== document.body && chain.length < 6) {
                const cls = [...(node as HTMLElement).classList].slice(0, 3).join('.');
                const ox = getComputedStyle(node).overflowX;
                chain.push(
                  `${node.tagName.toLowerCase()}${cls ? '.' + cls : ''}${ox !== 'visible' ? `[ox=${ox}]` : ''}`,
                );
                node = node.parentElement;
              }
              return `scrollW=${el.scrollWidth} ${chain.join(' < ')}`;
            });
          return {
            scrollWidth: document.documentElement.scrollWidth,
            offenders: wide,
            wideScrollRegions: scrollRegions,
            drivers,
          };
        }, vp.width);
        if (scrollWidth > vp.width + 1) {
          failures.push(
            `${route.path} overflows at ${vp.width}px (scrollWidth=${scrollWidth}) — ` +
              `widest: ${offenders.join(' | ') || 'none found'} — ` +
              `drivers: ${drivers.join(' | ') || 'none found'}`,
          );
        }
        if (wideScrollRegions.length > 0) {
          failures.push(
            `${route.path} has scroll region(s) wider than ${vp.width}px viewport — ` +
              `widest: ${wideScrollRegions.join(' | ')}`,
          );
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
