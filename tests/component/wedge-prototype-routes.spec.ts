import { expect, test } from '@playwright/test';
import path from 'node:path';

test.describe('CEIP wedge prototype routes', () => {
  test('renders the bounded Ontario GA/ICI 5CP decision-support route', async ({ page }) => {
    await page.goto('/ga-ici-5cp', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('ga-ici-5cp-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ontario GA/ICI 5CP Decision Support' })).toBeVisible();
    await expect(page.getByTestId('ga-ici-watchlist')).toContainText('Curtail if operationally safe');
    await expect(page.getByText('Do-not-claim boundary: Guaranteed GA savings')).toBeVisible();
    await expect(page.getByText('Do-not-claim boundary: Final IESO settlement result')).toBeVisible();
  });

  test('renders the BYO-CSV proof route and blocks identifier-risk samples', async ({ page }) => {
    await page.goto('/byo-csv-proof', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('byo-csv-proof-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'BYO-CSV Privacy Proof Generator' })).toBeVisible();
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Retained raw values\s*No/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Direct identifier findings\s*0/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Formula risk findings\s*0/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Linkage warnings\s*2/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*Yes/);

    await page.getByRole('button', { name: 'Use identifier-risk sample' }).click();

    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Direct identifier findings\s*2/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*No/);
    await expect(page.getByText('Do-not-claim boundary: PII-free certification')).toBeVisible();

    await page.getByRole('button', { name: 'Use formula-risk sample' }).click();

    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Formula risk findings\s*1/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*No/);
    await expect(page.getByTestId('byo-csv-markdown')).toContainText('Spreadsheet Formula Findings');
  });

  test('loads a BYO-CSV local file without raw values in the generated artifact', async ({ page }) => {
    await page.goto('/byo-csv-proof', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('byo-csv-local-file-input').setInputFiles({
      name: 'buyer-redacted-local.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'timestamp,feeder_id,demand_mw,temperature_c',
        '2026-01-01T00:00:00.000Z,FDR-9,18.5,-11',
        '2026-01-01T01:00:00.000Z,FDR-9,19.1,-12',
      ].join('\n')),
    });

    await expect(page.getByTestId('byo-csv-local-file-status')).toContainText('buyer-redacted-local.csv loaded locally');
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Rows\s*2/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Columns\s*4/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*Yes/);
    await expect(page.getByTestId('byo-csv-markdown')).toContainText('- Source label: buyer-redacted-local.csv');
    await expect(page.getByTestId('byo-csv-markdown')).toContainText('- Route: /byo-csv-proof');
    await expect(page.getByTestId('byo-csv-markdown')).not.toContainText('18.5');
    await expect(page.getByTestId('byo-csv-markdown')).not.toContainText('FDR-9');
    await expect(page.getByRole('button', { name: 'Download report' })).toBeVisible();
  });

  test('generates a retained artifact hash reference on the pilot-readiness route', async ({ page }) => {
    await page.goto('/pilot-readiness', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Retained artifact hash helper')).toBeVisible();
    await expect(page.getByText(/does not prove reviewer acceptance/)).toBeVisible();

    await page.getByLabel('Retained artifact filename').fill('folder/redacted utility.md');
    await page.getByLabel('Redacted retained artifact text').fill([
      'record_date: 2026-06-02',
      'source_label: buyer_supplied_anonymized',
      'reviewer_feedback_status: accepted',
    ].join('\n'));
    await page.getByRole('button', { name: /Generate SHA-256 reference/ }).click();

    await expect(page.getByText(/redacted_utility\.md#sha256=[a-f0-9]{64}/)).toBeVisible();
    await expect(page.getByText('Bytes hashed')).toBeVisible();
    await expect(page.getByText('No retained-artifact warnings were detected.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy evidence reference' })).toBeVisible();
  });

  test('previews a local pilot evidence register before the hard 95% gate', async ({ page }) => {
    await page.goto('/pilot-readiness', { waitUntil: 'domcontentloaded' });

    const preview = page.getByTestId('pilot-register-preview');
    await expect(preview.getByText('95% register preview')).toBeVisible();
    await expect(preview.getByText(/not uploaded/)).toBeVisible();

    await page.getByLabel('Local filled register CSV').setInputFiles(
      path.join(process.cwd(), 'tests/fixtures/pilot-evidence/valid-95-evidence-register.csv'),
    );

    await expect(preview.getByText(/valid-95-evidence-register\.csv loaded locally/)).toBeVisible();
    await expect(preview.getByText('Accepted rows')).toBeVisible();
    await expect(preview.getByText('Confidence delta')).toBeVisible();
    await expect(page.getByTestId('pilot-register-preview-gate-utility-forecast-evidence')).toContainText('Pass');
    await expect(page.getByTestId('pilot-register-preview-gate-commercial-signal')).toContainText('Pass');
    await expect(page.getByTestId('pilot-register-preview-gate-retained-artifact-hashes')).toContainText('Pass');
    await expect(preview.getByRole('button', { name: 'Copy 95% gate command' })).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Copy validator command' })).toBeVisible();
  });
});
