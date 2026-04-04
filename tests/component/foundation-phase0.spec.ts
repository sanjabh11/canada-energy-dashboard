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
    await expect(page.getByText('Tracked monitors')).toBeVisible();
    await expect(page.getByText('Lead Capture API').first()).toBeVisible();
    await expect(page.getByText('Health Endpoint').first()).toBeVisible();
  });

  test('analytics page exposes fallback provenance when data is supplemented', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByText('Analytics & Trends')).toBeVisible();
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
