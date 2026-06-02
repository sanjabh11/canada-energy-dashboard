import { defineConfig, devices } from '@playwright/test';

const defaultPort = process.env.PLAYWRIGHT_PHASE6_PORT || '4175';
const baseUrl = process.env.TEST_BASE_URL || `http://127.0.0.1:${defaultPort}`;
// Local smoke tests build the full proof-pack app before `vite preview`.
// Keep the default above the observed cold-build time while still allowing
// scripts to lower it with PLAYWRIGHT_WEBSERVER_TIMEOUT_MS when needed.
const webServerTimeoutMs = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS || '1200000');
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true';

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

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    ...(
      process.env.CI
        ? []
        : [
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
          ]
    ),
  ],

  // Run local preview server unless a hosted/deployed URL is being tested.
  webServer: skipWebServer ? undefined : {
    command: 'pnpm run test:e2e:preview',
    env: {
      VITE_ENABLE_EDGE_FETCH: process.env.VITE_ENABLE_EDGE_FETCH ?? 'true',
      VITE_ALLOW_LOCAL_EDGE_FETCH: process.env.VITE_ALLOW_LOCAL_EDGE_FETCH ?? 'true',
      VITE_SUPABASE_EDGE_BASE: process.env.VITE_SUPABASE_EDGE_BASE ?? '',
      VITE_TRAINED_DISPATCH_ENABLED: 'true',
      VITE_TRAINED_PV_FAULT_ENABLED: 'true',
      VITE_SUPABASE_URL: baseUrl,
      VITE_SUPABASE_ANON_KEY: 'test-key',
    },
    url: baseUrl,
    reuseExistingServer: false,
    timeout: webServerTimeoutMs,
  },
});
