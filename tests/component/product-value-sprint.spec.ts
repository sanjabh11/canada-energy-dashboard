import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const ARTIFACT_DIR = '/tmp/ceip-product-value-sprint/535d7e6';

test.describe('CEIP product-value sprint', () => {
  test('runs the browser-local three-step proof and exports review artifacts', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const requestBodies: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      const body = request.postData();
      if (body) requestBodies.push(body);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Turn a messy load CSV into a reviewable forecast proof pack.' })).toBeVisible();
    await expect(page.getByTestId('commercial-step-1')).toBeVisible();
    await expect(page.getByTestId('commercial-step-2')).toBeVisible();
    await expect(page.getByTestId('commercial-step-3')).toBeVisible();

    await page.getByTestId('commercial-load-sample').click();
    await expect(page.getByTestId('commercial-proof-ready')).toContainText('A bounded planning package is ready');
    await expect(page.getByTestId('commercial-proof-checks')).toContainText(/freshness/i);
    await expect(page.getByTestId('commercial-proof-checks')).toContainText('review');
    await expect(page.getByTestId('pilot-options-card')).toContainText('Non-validated planning hypotheses');
    await expect(page.getByTestId('commercial-pilot-cta')).toHaveAttribute('href', /^mailto:/);
    await expect(page.getByTestId('commercial-pilot-cta')).not.toHaveAttribute('href', /demand_mw|timestamp|FDR-/i);

    const jsonDownload = page.waitForEvent('download');
    await page.getByTestId('commercial-export-json').click();
    await (await jsonDownload).path();

    const csvDownload = page.waitForEvent('download');
    await page.getByTestId('commercial-export-csv').click();
    await (await csvDownload).path();

    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const pdfDownload = page.waitForEvent('download');
    await page.getByTestId('commercial-export-pdf').click();
    const pdf = await pdfDownload;
    const pdfPath = `${ARTIFACT_DIR}/forecast-benchmark-appendix.pdf`;
    await pdf.saveAs(pdfPath);
    const pdfBytes = readFileSync(pdfPath);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');

    const popupPromise = page.waitForEvent('popup');
    await page.getByTestId('commercial-print').click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('body')).toContainText('CEIP Forecast + Benchmark Appendix');
    await popup.close();

    expect(requestBodies.some((body) => body.includes('FDR-') || body.includes('demand_mw'))).toBe(false);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renders blocked privacy/schema checks without submitting raw CSV data', async ({ page }) => {
    test.setTimeout(60_000);
    const requestBodies: string[] = [];
    const consoleErrors: string[] = [];
    page.on('request', (request) => {
      const body = request.postData();
      if (body) requestBodies.push(body);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('commercial-csv-input').setInputFiles({
      name: 'invalid-local.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('email,formula\nsentinel@example.com,=SUM(A1)\n'),
    });

    await expect(page.getByTestId('commercial-proof-checks')).toContainText('blocked');
    await expect(page.getByTestId('commercial-privacy-warning')).toBeVisible();
    await expect(page.getByTestId('commercial-proof-ready')).toContainText('Resolve the CSV checks before exporting');
    await expect(page.locator('body')).not.toContainText('sentinel@example.com');
    expect(requestBodies.some((body) => body.includes('sentinel@example.com'))).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
});
