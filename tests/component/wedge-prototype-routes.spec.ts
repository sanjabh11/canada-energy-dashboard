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

    const wizard = page.getByTestId('phase-f-intake-wizard');
    await expect(wizard.getByText('Phase F intake wizard')).toBeVisible();
    await expect(wizard.getByText('Start evidence workspace')).toBeVisible();
    await expect(wizard.getByText('Log real anonymized buyer reply')).toBeVisible();
    await expect(wizard.getByText('Run hard 95% gate')).toBeVisible();
    await expect(wizard.getByText(/does not create buyer evidence/)).toBeVisible();

    await page.getByLabel('Buyer proof-pack route').selectOption('/utility-security');
    await expect(wizard).toContainText('/utility-security');
    await expect(wizard).toContainText('utility_security_procurement_pack');
    await expect(wizard).toContainText('Do not claim SOC certification');

    await expect(page.getByText('Retained artifact hash helper', { exact: true })).toBeVisible();
    await expect(page.getByText(/does not prove reviewer acceptance/)).toBeVisible();

    await page.getByLabel('Retained artifact filename').fill('folder/redacted security.md');
    await page.getByLabel('Redacted retained artifact text').fill([
      'record_date: 2026-06-02',
      'route: /utility-security',
      'proof_pack_id: utility_security_procurement_pack',
      'source_label: buyer_supplied_anonymized',
      'pii_screen_result: redacted',
      'buyer_data_coverage_pct: 85',
      'time_to_artifact_hours: 40',
      'reviewer_role: utility security reviewer',
      'reviewer_acceptance: accepted',
      'reviewer_feedback_status: complete',
      'day_14_decision: proceed',
      'commercial_commitment_status: letter_of_intent',
      'commercial_commitment_evidence: redacted letter of intent signed retained confirmation',
      'claim_boundary: Buyer-supplied security review support only.',
      'do_not_claim: Do not claim SOC certification or procurement approval.',
      '## Diagnostic Summary',
      '- Control matrix maps the questionnaire evidence boundary with SBOM and header notes, plus owner-supplied and deployed hosting subprocessor evidence split.',
    ].join('\n'));
    const manager = page.getByTestId('retained-artifact-manager');
    await expect(manager.getByText('Retained artifact manager')).toBeVisible();
    await expect(manager).toContainText('do not upload files');
    await expect(page.getByTestId('retained-artifact-manager-diagnostic-diagnostic-owner-deployed-split')).toContainText('Pass');
    await expect(page.getByTestId('retained-artifact-manager-check-sha-reference')).toContainText('Review');

    const generateHashButton = page.getByRole('button', { name: /Generate SHA-256 reference/ });
    await generateHashButton.scrollIntoViewIfNeeded();
    await expect(generateHashButton).toBeVisible();
    await generateHashButton.click();

    await expect(page.locator('code').filter({ hasText: /^redacted_security\.md#sha256=[a-f0-9]{64}$/ })).toBeVisible();
    await expect(page.getByText('Bytes hashed')).toBeVisible();
    await expect(page.getByText('No retained-artifact warnings were detected.')).toBeVisible();
    await expect(page.getByTestId('retained-artifact-manager-check-sha-reference')).toContainText('Pass');
    await expect(manager).toContainText(/--evidence-file-reference utility-security\/redacted_security\.md#sha256=[a-f0-9]{64}/);
    await expect(page.getByRole('button', { name: 'Copy evidence reference' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy update command' })).toBeVisible();
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
    await expect(preview.locator('dt').filter({ hasText: /^Accepted rows$/ })).toBeVisible();
    await expect(preview.locator('dt').filter({ hasText: /^Confidence delta$/ })).toBeVisible();
    const dashboard = page.getByTestId('buyer-evidence-readiness-dashboard');
    await expect(dashboard.getByText('Buyer evidence readiness dashboard')).toBeVisible();
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-lane-coverage')).toContainText('3/3 lanes');
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-reviewer-status')).toContainText('3/3 accepted');
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-confidence-delta')).toContainText('0.9');
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-fast-artifact-loop')).toContainText('<=48h present');
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-retained-hashes')).toContainText('3/3');
    await expect(page.getByTestId('buyer-evidence-dashboard-metric-commercial-signal')).toContainText('Present');
    await expect(page.getByTestId('buyer-evidence-dashboard-lane-utility-forecast')).toContainText('Pass');
    await expect(page.getByTestId('buyer-evidence-dashboard-lane-tier-or-credit')).toContainText('Pass');
    await expect(page.getByTestId('buyer-evidence-dashboard-lane-billing-or-security')).toContainText('Pass');
    await expect(dashboard).toContainText('does not create buyer evidence');
    await expect(page.getByTestId('pilot-register-preview-gate-utility-forecast-evidence')).toContainText('Pass');
    await expect(page.getByTestId('pilot-register-preview-gate-commercial-signal')).toContainText('Pass');
    await expect(page.getByTestId('pilot-register-preview-gate-retained-artifact-hashes')).toContainText('Pass');
    await expect(preview.getByRole('button', { name: 'Copy 95% gate command' })).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Copy readiness report command' })).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Copy validator command' })).toBeVisible();
  });

  // ─── /tier-compliance industrial form tests ───

  test('tier-compliance industrial form shows deadline banner with full wording', async ({ page }) => {
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/June 30 of the following year/)).toBeVisible();
  });

  test('tier-compliance industrial form rejects invalid email and shows error', async ({ page }) => {
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').first();
    await form.getByPlaceholder('Work email').fill('not-an-email');
    await form.getByPlaceholder('Your name').fill('Test User');
    await form.getByPlaceholder('Company / facility').fill('Test Co');
    await form.getByRole('button', { name: 'Request Demo' }).click();
    await expect(page.getByText('Enter a valid work email.')).toBeVisible();
  });

  test('tier-compliance industrial form rejects empty name', async ({ page }) => {
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').first();
    await form.getByPlaceholder('Work email').fill('test@company.ca');
    await form.getByPlaceholder('Company / facility').fill('Test Co');
    await form.getByRole('button', { name: 'Request Demo' }).click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
  });

  test('tier-compliance industrial form shows error on API failure and keeps form visible', async ({ page }) => {
    await page.route('**/api/leads/intake', (route) => {
      route.fulfill({ status: 500, json: { error: 'server_error' } });
    });
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').first();
    await form.getByPlaceholder('Work email').fill('test@company.ca');
    await form.getByPlaceholder('Your name').fill('Test User');
    await form.getByPlaceholder('Company / facility').fill('Test Co');
    await form.getByRole('button', { name: 'Request Demo' }).click();
    await expect(page.getByText('We could not save your request.')).toBeVisible();
    await expect(form).toBeVisible();
  });

  test('tier-compliance industrial form succeeds with valid data', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;
    await page.route('**/api/leads/intake', (route) => {
      requestBody = route.request().postDataJSON();
      route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').first();
    await form.getByPlaceholder('Work email').fill('buyer@company.ca');
    await form.getByPlaceholder('Your name').fill('Jane Smith');
    await form.getByPlaceholder('Company / facility').fill('Acme Energy');
    await form.getByRole('button', { name: 'Request Demo' }).click();
    await expect(page.getByText(/we'll be in touch/i)).toBeVisible();
    expect(requestBody).toBeTruthy();
    expect((requestBody as Record<string, unknown>).action).toBe('intake');
    const submission = (requestBody as Record<string, unknown>).submission as Record<string, unknown>;
    expect(submission.contact_name).toBe('Jane Smith');
    expect(submission.email).toBe('buyer@company.ca');
    expect(submission.source_route).toBe('/tier-compliance');
    expect(submission.segment).toBe('Industrial');
    expect(submission.campaign_id).toBe('tier-compliance-landing');
  });

  // ─── /tier-compliance consultant form tests ───

  test('tier-compliance consultant form rejects invalid email', async ({ page }) => {
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').nth(1);
    await form.getByPlaceholder('Consulting firm name').fill('Energy Consulting Inc');
    await form.getByPlaceholder('Work email').fill('@');
    await form.getByRole('button', { name: 'Get Consultant Access' }).click();
    await expect(page.getByText('Enter a valid work email.')).toBeVisible();
  });

  test('tier-compliance consultant form succeeds with valid data', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;
    await page.route('**/api/leads/intake', (route) => {
      requestBody = route.request().postDataJSON();
      route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto('/tier-compliance', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form').nth(1);
    await form.getByPlaceholder('Consulting firm name').fill('Energy Consulting Inc');
    await form.getByPlaceholder('Work email').fill('consultant@firm.ca');
    await form.getByPlaceholder('Number of TIER clients').fill('12');
    await form.getByPlaceholder('Current tool (e.g. Excel)').fill('Excel');
    await form.getByRole('button', { name: 'Get Consultant Access' }).click();
    await expect(page.getByText(/we'll be in touch regarding your consultant/i)).toBeVisible();
    expect(requestBody).toBeTruthy();
    const submission = (requestBody as Record<string, unknown>).submission as Record<string, unknown>;
    expect(submission.segment).toBe('Consultant');
    expect(submission.campaign_id).toBe('tier-consultant-cta-2026w21');
    const metadata = submission.metadata as Record<string, unknown>;
    expect(metadata.client_count).toBe('12');
    expect(metadata.current_tool).toBe('Excel');
  });

  // ─── /roi-calculator form tests ───

  test('roi-calculator shows deadline banner with full wording', async ({ page }) => {
    await page.goto('/roi-calculator', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/June 30 of the following year/)).toBeVisible();
  });

  test('roi-calculator rejects invalid email', async ({ page }) => {
    await page.goto('/roi-calculator', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@company.ca').fill('bad-email');
    await page.getByRole('button', { name: 'Request follow-up' }).click();
    await expect(page.getByText('Enter a valid work email so our team can follow up.')).toBeVisible();
  });

  test('roi-calculator shows error on API failure', async ({ page }) => {
    await page.route('**/api/leads/intake', (route) => {
      route.fulfill({ status: 500, json: { error: 'server_error' } });
    });
    await page.goto('/roi-calculator', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@company.ca').fill('buyer@company.ca');
    await page.getByRole('button', { name: 'Request follow-up' }).click();
    await expect(page.getByText('We could not save your request.')).toBeVisible();
  });

  test('roi-calculator succeeds with valid email and no SLA promise', async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;
    await page.route('**/api/leads/intake', (route) => {
      requestBody = route.request().postDataJSON();
      route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto('/roi-calculator', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@company.ca').fill('buyer@company.ca');
    await page.getByRole('button', { name: 'Request follow-up' }).click();
    await expect(page.getByText(/Request saved/)).toBeVisible();
    await expect(page.getByText(/24 hours/)).not.toBeVisible();
    expect(requestBody).toBeTruthy();
    const submission = (requestBody as Record<string, unknown>).submission as Record<string, unknown>;
    expect(submission.source_route).toBe('/roi-calculator');
    expect(submission.segment).toBe('industrial');
    expect(submission.campaign_id).toBe('roi_calculator_2026q1');
  });
});
