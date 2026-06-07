import { expect, test } from '@playwright/test';

test.describe('Phase 0 foundation gating', () => {
  test('gates ask-data for standard users', async ({ page }) => {
    await page.goto('/ask-data');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('ask-data-query-input')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Ask your data')).toBeVisible();
  });

  test('gates copilot execution for standard users', async ({ page }) => {
    await page.goto('/copilot');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('copilot-input')).toHaveCount(0);
    await expect(page.getByTestId('copilot-send')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Energy Copilot')).toBeVisible();
  });

  test('gates agent execution for standard users', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.getByTestId('foundation-repair-gate')).toBeVisible();
    await expect(page.getByTestId('agent-run-workflow')).toHaveCount(0);
    await expect(page.getByText('Foundation repair mode: Agent Runner')).toBeVisible();
  });

  test('status page shows tracked uptime monitors', async ({ page }) => {
    await page.goto('/status');
    const publicReleaseStatus = page.getByTestId('public-release-status-manifest');
    const releaseHealthEvidence = page.getByTestId('release-health-evidence');
    await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
    await expect(publicReleaseStatus).toBeVisible();
    await expect(publicReleaseStatus.getByText('Public release status manifest')).toBeVisible();
    await expect(publicReleaseStatus.getByText('Current source live parity')).toBeVisible();
    await expect(publicReleaseStatus.getByText('Current source does not prove production parity')).toBeVisible();
    await expect(publicReleaseStatus.getByText('Required release refresh sequence')).toBeVisible();
    await expect(publicReleaseStatus.getByText('pnpm run check:launch-evidence-manifest').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('pnpm run check:production-deploy-request').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('pnpm run check:post-deploy-live').first()).toBeVisible();
    await expect(page.getByText('Source provenance and dirty-worktree gate')).toBeVisible();
    await expect(page.getByText('Unmerged branch review queue').first()).toBeVisible();
    await expect(page.getByText('does not create launch evidence').first()).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Launch evidence validation gate' })).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Objective completion audit' })).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Adversarial review ledger' })).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Fix report blocker map' })).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Progress update digest' })).toBeVisible();
    await expect(publicReleaseStatus.getByRole('heading', { name: 'Bottleneck log digest' })).toBeVisible();
    await expect(publicReleaseStatus.getByText('claim-refutation lanes').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('phase progress').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('top unblock options').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('Manifest lineage').first()).toBeVisible();
    await expect(publicReleaseStatus.getByText('source_provenance', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('source_provenance.isolation_ledger', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('source_provenance.resolution_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('source_provenance.owner_decision_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('release_preflight.items', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('release_preflight.remediation_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('release_preflight.operator_handoff_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('release_preflight.clearance_matrix', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('release_preflight.toolchain_probe_ledger', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('buyer_evidence', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('buyer_evidence.hard_gate_deficits', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('buyer_evidence.acquisition_matrix', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('buyer_evidence.minimum_evidence_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('buyer_evidence.hard_gate_deficits.remediation_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('supabase_advisor', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('supabase_advisor.clearance_deficits', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('supabase_advisor.operator_handoff_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('supabase_advisor.clearance_deficits.remediation_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('launch_action_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('launch_action_queue.items[phase=launch_evidence_validation]', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('launch_action_queue.operator_handoff_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('production_approval.prerequisite_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('production_approval.request_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('production_approval.operator_handoff_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('post_deploy_live_proof.gate_queue', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('post_deploy_live_proof.operator_handoff_packet', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('completion_audit', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('adversarial_reviews', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('fix_report', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('progress_updates', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('bottleneck_log', { exact: true })).toBeVisible();
    await expect(publicReleaseStatus.getByText('branch_review.top_review_packet')).toBeVisible();
    await expect(publicReleaseStatus.getByText('read_only_branch_clearance_matrix')).toBeVisible();
    await expect(releaseHealthEvidence).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Launch evidence validation gate' })).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Objective completion audit' })).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Adversarial review ledger' })).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Fix report blocker map' })).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Progress update digest' })).toBeVisible();
    await expect(releaseHealthEvidence.getByRole('heading', { name: 'Bottleneck log digest' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open JSON manifest/ })).toHaveAttribute('href', '/status/release-health.json');
    await expect(page.getByTestId('supabase-advisor-status-card')).toBeVisible();
    await expect(page.getByTestId('supabase-advisor-status-card')).toContainText('does not claim advisor clearance');
    await expect(page.getByTestId('supabase-advisor-check-cli_app_lint')).toContainText('CLI app lint refresh');
    await expect(page.getByTestId('supabase-advisor-check-cli_app_lint')).toContainText('does not substitute for Database Security or Performance Advisors');
    await expect(page.getByTestId('supabase-advisor-check-security_performance_advisors')).toContainText('Security and Performance Advisors');
    await expect(page.getByTestId('supabase-advisor-check-security_performance_advisors')).toContainText('NEEDS REMEDIATION');
    await expect(page.getByText('Pilot Readiness').first()).toBeVisible();
    await expect(page.getByText('Utility Forecast Pack').first()).toBeVisible();
  });

  test('hydrogen standalone route resolves', async ({ page }) => {
    await page.goto('/hydrogen');
    await expect(page.locator('body')).toContainText(/Loading\.{3}|Hydrogen Economy Hub Dashboard/);
  });

  test('analytics page exposes fallback provenance when data is supplemented', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('body')).toContainText(/Loading\.{3}|Analytics & Trends/);
    await expect(page.getByText('Fallback analytics inputs active')).toBeVisible();
    await expect(page.getByText('Mixed analytics fallback inputs')).toBeVisible();
  });

  test('contact form surfaces submission failures visibly', async ({ page }) => {
    await page.route('**/functions/v1/lead-capture', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Forced test failure' }),
    }));

    await page.goto('/contact');
    await page.getByLabel('Full Name *').fill('QA Test User');
    await page.getByLabel('Email Address *').fill('qatest@example.com');
    await page.getByLabel('Subject *').fill('QA Lead Privacy Test');
    await page.getByLabel('Message *').fill('This is a QA test submission.');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByTestId('contact-submit-error')).toBeVisible();
    await expect(page.getByTestId('contact-submit-error')).toContainText('Forced test failure');
  });
});
