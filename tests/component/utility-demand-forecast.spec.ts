import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL
  || `http://127.0.0.1:${process.env.PLAYWRIGHT_PHASE6_PORT || '4175'}`;

test.describe('Utility demand forecasting lane', () => {
  test('renders the utility-specific planning workflow with benchmark and export surfaces', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await expect(page.getByRole('heading', { name: 'Utility Demand Forecasting Lane' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Statistical, upload-first planning workflows for utilities')).toBeVisible();
    await expect(page.getByText('Share eligible load history to request a draft planning pack for review.')).toBeVisible();
    await expect(page.getByTestId('utility-pilot-pack-flow')).toContainText('5. Export planning pack plus security attachment');
    await expect(page.getByTestId('utility-connection-panel')).toBeVisible();
    await expect(page.getByTestId('utility-connection-panel').getByRole('button', { name: 'Load Ontario public sample', exact: true })).toBeVisible();
    await expect(page.getByTestId('constructed-scenario-ontario-ldc-dsp')).toBeVisible();
    await expect(page.getByTestId('constructed-scenario-alberta-municipal-utility')).toBeVisible();
    await expect(page.getByText('Secondary connector, onboarding, and submission readiness')).toBeVisible();
    await expect(page.getByTestId('utility-onboarding-panel')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Planning Pack' })).toBeVisible();
    await expect(page.getByTestId('utility-forecast-export-card')).toContainText('5. Export planning pack');
    await expect(page.getByRole('button', { name: 'Export planning memo PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export board/regulator planning pack' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export benchmark appendix' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download utility security review pack' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Attach utility security review pack' })).toBeVisible();

    await page.getByText('Secondary connector, onboarding, and submission readiness').click();

    await expect(page.getByRole('button', { name: 'Load Ontario Green Button starter' })).toBeVisible();
    await expect(page.getByText('Telemetry gateway').first()).toBeVisible();
    await expect(page.getByTestId('utility-onboarding-panel')).toBeVisible();
    await expect(page.getByTestId('utility-onboarding-panel').getByText('London Hydro', { exact: true })).toBeVisible();
    await expect(page.getByTestId('utility-onboarding-panel').getByText('Alectra Utilities', { exact: true })).toBeVisible();
    await expect(page.getByTestId('utility-onboarding-panel').getByText('UtilityAPI-compatible Ontario utilities remain a fast-follow proof path')).toBeVisible();
    await expect(page.getByTestId('utility-submission-panel')).toBeVisible();
    await expect(page.getByTestId('utility-readiness-tracks').getByText('Staging internet readiness')).toBeVisible();
    await expect(page.getByTestId('utility-readiness-tracks').getByText('Production submission readiness')).toBeVisible();
    await expect(page.getByTestId('utility-submission-warning')).toContainText('Do not submit yet');
    await expect(page.getByTestId('utility-submission-warning')).toContainText('VITE_PUBLIC_APP_URL');
    await expect(page.getByTestId('utility-submission-warning')).toContainText('VITE_UTILITY_CONNECTOR_BASE_URL');
    await expect(page.getByTestId('utility-submission-card-london-hydro').getByText('do not submit yet')).toBeVisible();
    await expect(page.getByTestId('utility-submission-card-alectra-utilities').getByText('do not submit yet')).toBeVisible();
    await expect(page.getByText('Custom frontend host configured and live')).toBeVisible();
    await expect(page.getByText('Custom Green Button bridge host configured and live')).toBeVisible();
    await expect(page.getByText('Current browser origin matches configured app URL')).toBeVisible();
    await expect(page.getByText('Configured hosts are canonical production submission hosts')).toBeVisible();
    await expect(page.getByText('Signer-backed provenance is required for London Hydro bridge mode')).toBeVisible();
    await expect(page.getByText('Burner staging domain registered and routed')).toBeVisible();
    await expect(page.getByText('Public callback reachability evidence exists', { exact: true })).toBeVisible();
    await expect(page.getByText('Private bridge contract evidence exists', { exact: true })).toBeVisible();
    await expect(page.getByText('Utility-facing TLS evidence exists', { exact: true })).toBeVisible();
    await expect(page.getByText('Ontario corporation formed and legal company name locked', { exact: true })).toBeVisible();
    await expect(page.getByText('Parent domain registered to the final name / brand', { exact: true })).toBeVisible();
    await expect(page.getByText('Bridge runtime contract').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Utility security statement' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download demo evidence pack' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download London Hydro draft packet' })).toBeVisible();
    await expect(page.getByText('Download hourly starter CSV')).toBeVisible();
    await expect(page.getByText('Download Ontario public sample CSV')).toBeVisible();
    await expect(page.getByText('Download public sample manifest')).toBeVisible();
    await expect(page.getByText('Live public context')).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toBeVisible();
    await expect(page.getByText('Live surface truth contract')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reliability proxy' })).toBeVisible();
    await expect(page.getByText('Export utility forecast package')).toBeVisible();
  });

  test('loads the Ontario public-system sample with explicit non-customer-history disclosure', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await page.getByTestId('utility-connection-panel').getByRole('button', { name: 'Load Ontario public sample', exact: true }).click();

    await expect(page.getByText('Ontario synthetic system-demand fixture active')).toBeVisible();
    await expect(page.getByText(/not customer LDC history/).first()).toBeVisible();
    await expect(page.getByText(/not IESO measurements/).first()).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('public system sample');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Fallback: yes');
  });

  test('keeps the local Green Button starter explicitly non-connected', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await page.getByText('Secondary connector, onboarding, and submission readiness').click();
    await page.getByRole('button', { name: 'Load Ontario Green Button starter' }).click();

    const connectorCard = page.getByTestId('utility-connection-card-ontario_green_button_cmd');
    await expect(connectorCard.getByText('pending auth')).toBeVisible();
    await expect(connectorCard.getByText('Last sync: none')).toBeVisible();
    await expect(connectorCard.getByRole('button', { name: 'Disconnect Utility' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Connect London Hydro' })).toBeVisible();
  });

  test('loads a constructed Ontario planning case and keeps the disclosure visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await page.getByRole('button', { name: 'Load Ontario DSP case' }).click();

    await expect(page.getByText('Constructed commercial scenario active', { exact: true })).toBeVisible();
    await expect(page.getByTestId('proof-artifact-utility-planning-pack')).toContainText('Constructed Ontario LDC DSP planning case');
    await expect(page.getByTestId('proof-artifact-utility-planning-pack')).toContainText('constructed scenario');
  });

  test('publishes the utility security statement as a public legal route', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-security`);

    await expect(page.getByRole('heading', { name: 'Utility Security & Data-Handling Statement' })).toBeVisible();
    await expect(page.getByText('Security review pack instead of trust-only copy')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
  });

  test('completes a sample journey with honest labels, artifact download, invalid input, and keyboard access', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await page.getByTestId('utility-connection-panel').getByRole('button', { name: 'Load Ontario public sample', exact: true }).click();
    await expect(page.getByText('Ontario synthetic system-demand fixture active')).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Empirical interval coverage');
    await expect(page.getByTestId('utility-time-axis-status')).toContainText('regular hourly');
    await expect(page.getByTestId('utility-interval-evidence-counts')).toContainText('unique calibration timestamps');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Fallback: yes');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('MAE');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export utility forecast package' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('utility_forecast_pack');
    const downloadPath = await download.path();
    const fs = await import('node:fs/promises');
    const csv = await fs.readFile(downloadPath, 'utf-8');
    expect(csv).toContain('# Source Kind: public_system_sample');
    expect(csv).toContain('# Fallback: true');
    expect(csv).toContain('# Source Retrieved At: not recorded');
    expect(csv).toContain('# Synthetic CEIP fixture: formula-generated values');
    expect(csv).toContain('# Related Source Terms (for imported IESO material; not a license determination for this synthetic fixture): https://www.ieso.ca/terms-of-use');
    expect(csv).toContain('interval_method,chronological_tail_calibration');
    expect(csv).toContain('workflow proof only');
    expect(csv).toContain('bundled-synthetic-fixture:ieso-apo-public-system-sample-2026');
    expect(csv).toContain('bundled-synthetic-fixture-v1');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('timestamp,wrong_column\n2025-01-01,abc'),
    });
    await expect(page.getByText('Import warnings')).toBeVisible();

    const validCsv = [
      'timestamp,demand_mw',
      ...Array.from({ length: 48 }, (_, i) =>
        `${new Date(Date.UTC(2025, 0, 1) + i * 3_600_000).toISOString()},${120 + i}`),
    ].join('\n');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'valid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(validCsv),
    });
    await expect(page.getByText('Import warnings')).not.toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Not enough history');

    const timezoneAmbiguousCsv = [
      'timestamp,demand_mw',
      ...Array.from({ length: 48 }, (_, i) =>
        `${new Date(Date.UTC(2025, 0, 1) + i * 3_600_000).toISOString().replace(/Z$/, '')},${120 + i}`),
    ].join('\n');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'timezone-ambiguous.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(timezoneAmbiguousCsv),
    });
    await expect(page.getByTestId('utility-time-axis-status')).toContainText('unsupported');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Time axis unsupported');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.focus();
    await expect(fileInput).toBeFocused();
  });

  test('keeps synthetic disclosure when the bundled fixture is re-uploaded, and labels IESO-format uploads as unverified origin', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);
    const fs = await import('node:fs/promises');

    // B1a: download the bundled synthetic fixture, then re-upload the exact bytes.
    const sampleDownloadPromise = page.waitForEvent('download');
    await page.getByText('Download Ontario public sample CSV').click();
    const sampleCsv = await fs.readFile(await (await sampleDownloadPromise).path());
    await page.locator('input[type="file"]').setInputFiles({
      name: 'reimported-ontario-public-sample.csv',
      mimeType: 'text/csv',
      buffer: sampleCsv,
    });

    await expect(page.getByText('Ontario synthetic system-demand fixture active')).toBeVisible();
    await expect(page.getByText(/not IESO measurements/).first()).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('public system sample');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Fallback: yes');
    await expect(page.getByText('Upload format evidence')).toBeVisible();
    await expect(page.getByText('bundled fixture hash match')).toBeVisible();

    const bundledDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export utility forecast package' }).click();
    const bundledCsv = await fs.readFile(await (await bundledDownloadPromise).path(), 'utf-8');
    expect(bundledCsv).toContain('# Source Kind: public_system_sample');
    expect(bundledCsv).toContain('# Format Evidence: bundled_fixture_hash_match');
    expect(bundledCsv).toContain('synthetic fixture disclosure applies');
    expect(bundledCsv).toContain('# Source Retrieved At: not recorded');
    expect(bundledCsv).toContain('bundled-synthetic-fixture:ieso-apo-public-system-sample-2026');
    expect(bundledCsv).toContain('# Synthetic CEIP fixture: formula-generated values');
    expect(bundledCsv).toContain('workflow proof only');

    // B1b: a raw IESO-shape upload stays uploaded_historical but is labeled with
    // unverified origin plus the IESO terms/attribution caveat.
    const iesoCsv = [
      'Date,Hour,Market Demand,Ontario Demand',
      ...Array.from(
        { length: 72 },
        (_, index) =>
          `2026-01-${String(Math.floor(index / 24) + 5).padStart(2, '0')},${(index % 24) + 1},${19000 + index},${18500 + index}`,
      ),
    ].join('\n');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'ieso-demand-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(iesoCsv),
    });

    await expect(page.getByTestId('utility-upload-format-evidence')).toContainText(
      'IESO format recognized; upload origin unverified',
    );
    await expect(page.getByRole('link', { name: 'IESO Terms of Use' })).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('uploaded historical');
    await expect(page.getByText('ieso format detected')).toBeVisible();

    const iesoDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export utility forecast package' }).click();
    const iesoPackCsv = await fs.readFile(await (await iesoDownloadPromise).path(), 'utf-8');
    expect(iesoPackCsv).toContain('# Source Kind: uploaded_historical');
    expect(iesoPackCsv).toContain('# Format Evidence: ieso_format_detected');
    expect(iesoPackCsv).toContain('upload origin unverified');
    expect(iesoPackCsv).toContain('# Attribution Caveat:');
    expect(iesoPackCsv).toContain('https://www.ieso.ca/terms-of-use');
    expect(iesoPackCsv).toContain('# Source Retrieved At: not recorded');
  });
});
