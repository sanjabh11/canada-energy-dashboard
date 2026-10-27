import { defineConfig, devices } from '@playwright/test';

const defaultPort = process.env.PLAYWRIGHT_PHASE6_PORT || '4175';
const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${defaultPort}`;
// Local smoke tests build the full proof-pack app before `vite preview`.
// Keep the default above the observed cold-build time while still allowing
// scripts to lower it with PLAYWRIGHT_WEBSERVER_TIMEOUT_MS when needed.
const webServerTimeoutMs = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS || '1200000');
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true';
const webServerCommand = process.env.PLAYWRIGHT_WEBSERVER_COMMAND || 'pnpm run test:e2e:preview';

/**
 * Playwright Configuration for Component Tests
 * 
 * Tests critical UI components to prevent QA bug recurrence.
 * Focuses on 4 key scenarios from Cycle 3 QA findings.
 */
export default defineConfig({
  testDir: './tests/component',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || 'playwright-results.json' }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: baseUrl,
    
    // Collect trace on retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on retry
    video: 'on-first-retry',
  },

  // All five projects run in every environment including CI — the audit
  // requires full-matrix evidence, not Chromium-only CI. For a fast local
  // slice use `npx playwright test --project=chromium`.
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
      },
    },
  ],
  // Run local preview server unless a hosted/deployed URL is being tested.
  webServer: skipWebServer ? undefined : {
    command: webServerCommand,
    env: {
      VITE_ENABLE_EDGE_FETCH: process.env.VITE_ENABLE_EDGE_FETCH ?? 'true',
      VITE_ALLOW_LOCAL_EDGE_FETCH: process.env.VITE_ALLOW_LOCAL_EDGE_FETCH ?? 'true',
      VITE_SUPABASE_EDGE_BASE: process.env.VITE_SUPABASE_EDGE_BASE ?? '',
      VITE_TRAINED_DISPATCH_ENABLED: 'true',
      VITE_TRAINED_PV_FAULT_ENABLED: 'true',
      VITE_SUPABASE_URL: baseUrl,
      VITE_SUPABASE_ANON_KEY: 'test-key',
      // Test-only lead-intake disclosure so form journeys exercise the enabled
      // path. These are preview-server values, never real collection settings.
      VITE_ENABLE_LEAD_INTAKE: 'true',
      VITE_PRIVACY_NOTICE_APPROVED: 'true',
      VITE_PRIVACY_CONTACT_NAME: 'CEIP Preview Privacy Contact',
      VITE_PRIVACY_CONTACT_EMAIL: 'privacy-test@example.com',
      VITE_PRIVACY_POLICIES_URL: 'https://example.com/privacy-test',
      VITE_PRIVACY_PROCESSING_LOCATIONS: 'Playwright preview (no real collection)',
      VITE_PRIVACY_RETENTION_SUMMARY: 'Test-only retention disclosure',
    },
    url: baseUrl,
    reuseExistingServer: false,
    timeout: webServerTimeoutMs,
  },
});
