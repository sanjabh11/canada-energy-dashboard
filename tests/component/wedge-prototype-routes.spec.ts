import { expect, test } from '@playwright/test';

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
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*Yes/);

    await page.getByRole('button', { name: 'Use identifier-risk sample' }).click();

    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Direct identifier findings\s*2/);
    await expect(page.getByTestId('byo-csv-proof-report')).toContainText(/Confidence gate ready\s*No/);
    await expect(page.getByText('Do-not-claim boundary: PII-free certification')).toBeVisible();
  });
});
