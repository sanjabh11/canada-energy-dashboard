import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';

test.describe('Utility demand forecasting lane', () => {
  test('renders the utility-specific planning workflow with benchmark and export surfaces', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await expect(page.getByRole('heading', { name: 'Utility Demand Forecasting Lane' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Statistical, upload-first planning workflows for utilities')).toBeVisible();
    await expect(page.getByText('Send us two years of load history, and we return a board-ready planning pack.')).toBeVisible();
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

    await expect(page.getByText('Ontario public-system sample active')).toBeVisible();
    await expect(page.getByText('It is not customer LDC history').first()).toBeVisible();
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('public system sample');
    await expect(page.getByTestId('utility-forecast-benchmark-card')).toContainText('Fallback: no');
  });

  test('supports the local disconnect workflow for Ontario Green Button runtime validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/utility-demand-forecast`);

    await page.getByText('Secondary connector, onboarding, and submission readiness').click();
    await page.getByRole('button', { name: 'Load Ontario Green Button starter' }).click();

    const connectorCard = page.getByTestId('utility-connection-card-ontario_green_button_cmd');
    await expect(connectorCard.getByRole('button', { name: 'Disconnect Utility' })).toBeVisible();

    await connectorCard.getByRole('button', { name: 'Disconnect Utility' }).click();
    await expect(connectorCard.getByText('failed')).toBeVisible();
    await expect(connectorCard.getByRole('link', { name: 'Manage connections' })).toBeVisible();
    await expect(connectorCard.getByRole('button', { name: 'Confirm disconnect' })).toBeVisible();

    await connectorCard.getByRole('button', { name: 'Confirm disconnect' }).click();
    await expect(connectorCard.getByText('revoked')).toBeVisible();
    await expect(connectorCard.getByText('Stored token material has been purged.')).toBeVisible();
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
});
